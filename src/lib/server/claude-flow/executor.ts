/**
 * TASK-044: Async Command Execution
 *
 * Provides background job queue, progress streaming via WebSocket,
 * and concurrent execution limits for CLI commands.
 */

import { EventEmitter } from 'events';
import { claudeFlowCLI, type CommandOptions, type CommandResult } from './cli';

/**
 * Status of a job
 */
export type JobStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

/**
 * Priority levels for jobs
 */
export type JobPriority = 'low' | 'normal' | 'high' | 'critical';

/**
 * Job configuration
 */
export interface JobConfig {
	/** Unique job ID (auto-generated if not provided) */
	id?: string;
	/** Command to execute */
	command: string;
	/** Command arguments */
	args?: string[];
	/** Command options */
	options?: CommandOptions;
	/** Job priority */
	priority?: JobPriority;
	/** Associated project ID */
	projectId?: string;
	/** Associated ticket ID */
	ticketId?: string;
	/** Custom metadata */
	metadata?: Record<string, unknown>;
}

/**
 * Job progress update
 */
export interface JobProgress {
	/** Job ID */
	jobId: string;
	/** Current status */
	status: JobStatus;
	/** Progress percentage (0-100) */
	progress?: number;
	/** Current output line */
	output?: string;
	/** Whether output is stderr */
	isError?: boolean;
	/** Timestamp of update */
	timestamp: string;
}

/**
 * Job result
 */
export interface JobResult {
	/** Job ID */
	jobId: string;
	/** Final status */
	status: JobStatus;
	/** Command result (if completed) */
	result?: CommandResult;
	/** Error message (if failed) */
	error?: string;
	/** When the job started */
	startedAt?: string;
	/** When the job completed */
	completedAt?: string;
	/** Duration in milliseconds */
	duration?: number;
}

/**
 * Job stored in the queue
 */
interface QueuedJob {
	id: string;
	config: Required<Pick<JobConfig, 'command' | 'args' | 'options' | 'priority'>> & Omit<JobConfig, 'command' | 'args' | 'options' | 'priority'>;
	status: JobStatus;
	createdAt: string;
	startedAt?: string;
	completedAt?: string;
	result?: CommandResult;
	error?: string;
}

/**
 * Executor configuration
 */
export interface ExecutorConfig {
	/** Maximum concurrent jobs */
	maxConcurrent?: number;
	/** Default timeout for jobs in ms */
	defaultTimeout?: number;
	/** Whether to start processing automatically */
	autoStart?: boolean;
}

/**
 * Events emitted by the executor
 */
export interface ExecutorEvents {
	'job:queued': (job: QueuedJob) => void;
	'job:started': (job: QueuedJob) => void;
	'job:progress': (progress: JobProgress) => void;
	'job:completed': (result: JobResult) => void;
	'job:failed': (result: JobResult) => void;
	'job:cancelled': (jobId: string) => void;
	'queue:empty': () => void;
	'queue:full': () => void;
}

/**
 * Priority weight map for sorting
 */
const PRIORITY_WEIGHTS: Record<JobPriority, number> = {
	critical: 4,
	high: 3,
	normal: 2,
	low: 1
};

/**
 * CommandExecutor class - manages async command execution with job queue
 */
export class CommandExecutor extends EventEmitter {
	private queue: QueuedJob[] = [];
	private running: Map<string, QueuedJob> = new Map();
	private completed: Map<string, JobResult> = new Map();
	private maxConcurrent: number;
	private defaultTimeout: number;
	private isProcessing: boolean = false;
	private jobCounter: number = 0;

	constructor(config: ExecutorConfig = {}) {
		super();
		this.maxConcurrent = config.maxConcurrent ?? 3;
		this.defaultTimeout = config.defaultTimeout ?? 300000; // 5 minutes

		if (config.autoStart !== false) {
			this.startProcessing();
		}
	}

	/**
	 * Submit a new job to the queue
	 *
	 * @param config - Job configuration
	 * @returns Job ID
	 */
	submit(config: JobConfig): string {
		const id = config.id ?? this.generateJobId();

		const job: QueuedJob = {
			id,
			config: {
				command: config.command,
				args: config.args ?? [],
				options: config.options ?? {},
				priority: config.priority ?? 'normal',
				projectId: config.projectId,
				ticketId: config.ticketId,
				metadata: config.metadata
			},
			status: 'pending',
			createdAt: new Date().toISOString()
		};

		this.queue.push(job);
		this.sortQueue();

		this.emit('job:queued', job);

		// Trigger processing
		this.processNext();

		return id;
	}

	/**
	 * Get the status of a job
	 *
	 * @param jobId - Job ID
	 * @returns Job status or null if not found
	 */
	getJobStatus(jobId: string): JobStatus | null {
		const queuedJob = this.queue.find(j => j.id === jobId);
		if (queuedJob) return queuedJob.status;

		const runningJob = this.running.get(jobId);
		if (runningJob) return runningJob.status;

		const completedJob = this.completed.get(jobId);
		if (completedJob) return completedJob.status;

		return null;
	}

	/**
	 * Get the result of a completed job
	 *
	 * @param jobId - Job ID
	 * @returns Job result or null if not found/completed
	 */
	getJobResult(jobId: string): JobResult | null {
		return this.completed.get(jobId) ?? null;
	}

	/**
	 * Cancel a pending job
	 *
	 * @param jobId - Job ID
	 * @returns Whether the job was cancelled
	 */
	cancel(jobId: string): boolean {
		const index = this.queue.findIndex(j => j.id === jobId);
		if (index !== -1) {
			const job = this.queue.splice(index, 1)[0];
			job.status = 'cancelled';
			this.emit('job:cancelled', jobId);
			return true;
		}
		return false;
	}

	/**
	 * Wait for a job to complete
	 *
	 * @param jobId - Job ID
	 * @param timeout - Maximum wait time in ms
	 * @returns Job result
	 */
	async waitForJob(jobId: string, timeout = 300000): Promise<JobResult> {
		return new Promise((resolve, reject) => {
			// Check if already completed
			const existing = this.completed.get(jobId);
			if (existing) {
				resolve(existing);
				return;
			}

			const timeoutId = setTimeout(() => {
				cleanup();
				reject(new Error(`Timeout waiting for job ${jobId}`));
			}, timeout);

			const onCompleted = (result: JobResult) => {
				if (result.jobId === jobId) {
					cleanup();
					resolve(result);
				}
			};

			const onFailed = (result: JobResult) => {
				if (result.jobId === jobId) {
					cleanup();
					resolve(result);
				}
			};

			const onCancelled = (cancelledId: string) => {
				if (cancelledId === jobId) {
					cleanup();
					reject(new Error(`Job ${jobId} was cancelled`));
				}
			};

			const cleanup = () => {
				clearTimeout(timeoutId);
				this.off('job:completed', onCompleted);
				this.off('job:failed', onFailed);
				this.off('job:cancelled', onCancelled);
			};

			this.on('job:completed', onCompleted);
			this.on('job:failed', onFailed);
			this.on('job:cancelled', onCancelled);
		});
	}

	/**
	 * Get queue statistics
	 */
	getStats(): {
		queued: number;
		running: number;
		completed: number;
		maxConcurrent: number;
	} {
		return {
			queued: this.queue.length,
			running: this.running.size,
			completed: this.completed.size,
			maxConcurrent: this.maxConcurrent
		};
	}

	/**
	 * Get all pending jobs
	 */
	getPendingJobs(): Array<{ id: string; priority: JobPriority; createdAt: string }> {
		return this.queue.map(j => ({
			id: j.id,
			priority: j.config.priority,
			createdAt: j.createdAt
		}));
	}

	/**
	 * Get all running jobs
	 */
	getRunningJobs(): Array<{ id: string; startedAt: string }> {
		return Array.from(this.running.values()).map(j => ({
			id: j.id,
			startedAt: j.startedAt!
		}));
	}

	/**
	 * Clear completed jobs from history
	 */
	clearCompleted(): void {
		this.completed.clear();
	}

	/**
	 * Update max concurrent limit
	 */
	setMaxConcurrent(max: number): void {
		this.maxConcurrent = max;
		this.processNext();
	}

	/**
	 * Start processing the queue
	 */
	startProcessing(): void {
		this.isProcessing = true;
		this.processNext();
	}

	/**
	 * Stop processing (running jobs will complete)
	 */
	stopProcessing(): void {
		this.isProcessing = false;
	}

	/**
	 * Process the next job in the queue
	 */
	private processNext(): void {
		if (!this.isProcessing) return;
		if (this.running.size >= this.maxConcurrent) return;
		if (this.queue.length === 0) {
			if (this.running.size === 0) {
				this.emit('queue:empty');
			}
			return;
		}

		const job = this.queue.shift()!;
		this.executeJob(job);

		// Process more if possible
		this.processNext();
	}

	/**
	 * Execute a single job
	 */
	private async executeJob(job: QueuedJob): Promise<void> {
		job.status = 'running';
		job.startedAt = new Date().toISOString();
		this.running.set(job.id, job);

		this.emit('job:started', job);

		const startTime = Date.now();

		try {
			const options: CommandOptions = {
				...job.config.options,
				timeout: job.config.options.timeout ?? this.defaultTimeout,
				onOutput: (line, isStderr) => {
					const progress: JobProgress = {
						jobId: job.id,
						status: 'running',
						output: line,
						isError: isStderr,
						timestamp: new Date().toISOString()
					};
					this.emit('job:progress', progress);
				}
			};

			const result = await claudeFlowCLI.execute(job.config.command, job.config.args, options);

			job.status = result.exitCode === 0 ? 'completed' : 'failed';
			job.completedAt = new Date().toISOString();
			job.result = result;

			const jobResult: JobResult = {
				jobId: job.id,
				status: job.status,
				result,
				startedAt: job.startedAt,
				completedAt: job.completedAt,
				duration: Date.now() - startTime
			};

			this.running.delete(job.id);
			this.completed.set(job.id, jobResult);

			if (job.status === 'completed') {
				this.emit('job:completed', jobResult);
			} else {
				jobResult.error = result.stderr || 'Command failed';
				this.emit('job:failed', jobResult);
			}
		} catch (error) {
			job.status = 'failed';
			job.completedAt = new Date().toISOString();
			job.error = error instanceof Error ? error.message : String(error);

			const jobResult: JobResult = {
				jobId: job.id,
				status: 'failed',
				error: job.error,
				startedAt: job.startedAt,
				completedAt: job.completedAt,
				duration: Date.now() - startTime
			};

			this.running.delete(job.id);
			this.completed.set(job.id, jobResult);

			this.emit('job:failed', jobResult);
		}

		// Process next job
		this.processNext();
	}

	/**
	 * Sort queue by priority
	 */
	private sortQueue(): void {
		this.queue.sort((a, b) => {
			const priorityDiff = PRIORITY_WEIGHTS[b.config.priority] - PRIORITY_WEIGHTS[a.config.priority];
			if (priorityDiff !== 0) return priorityDiff;
			// Same priority: FIFO
			return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
		});
	}

	/**
	 * Generate a unique job ID
	 */
	private generateJobId(): string {
		this.jobCounter++;
		return `job-${Date.now()}-${this.jobCounter}`;
	}
}

/**
 * WebSocket progress bridge
 *
 * Connects the executor to a WebSocket server for real-time progress updates.
 */
export class ExecutorWebSocketBridge {
	private executor: CommandExecutor;
	private emit: (event: string, data: unknown) => void;

	constructor(
		executor: CommandExecutor,
		emitFn: (event: string, data: unknown) => void
	) {
		this.executor = executor;
		this.emit = emitFn;

		this.setupListeners();
	}

	private setupListeners(): void {
		this.executor.on('job:queued', (job) => {
			this.emit('job:queued', {
				jobId: job.id,
				priority: job.config.priority,
				command: job.config.command,
				projectId: job.config.projectId,
				ticketId: job.config.ticketId
			});
		});

		this.executor.on('job:started', (job) => {
			this.emit('job:started', {
				jobId: job.id,
				startedAt: job.startedAt
			});
		});

		this.executor.on('job:progress', (progress) => {
			this.emit('job:progress', progress);
		});

		this.executor.on('job:completed', (result) => {
			this.emit('job:completed', {
				jobId: result.jobId,
				duration: result.duration,
				exitCode: result.result?.exitCode
			});
		});

		this.executor.on('job:failed', (result) => {
			this.emit('job:failed', {
				jobId: result.jobId,
				error: result.error,
				duration: result.duration
			});
		});

		this.executor.on('job:cancelled', (jobId) => {
			this.emit('job:cancelled', { jobId });
		});
	}
}

// Default singleton instance
export const commandExecutor = new CommandExecutor();
