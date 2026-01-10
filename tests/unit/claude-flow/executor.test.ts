/**
 * TASK-044: Async Command Execution Tests
 *
 * Unit tests for the CommandExecutor class.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Use vi.hoisted for mock functions
const { mockExecute, mockExecuteJson } = vi.hoisted(() => ({
	mockExecute: vi.fn(),
	mockExecuteJson: vi.fn()
}));

vi.mock('$lib/server/claude-flow/cli', () => ({
	claudeFlowCLI: {
		execute: mockExecute,
		executeJson: mockExecuteJson
	}
}));

import {
	CommandExecutor,
	ExecutorWebSocketBridge,
	type JobConfig,
	type JobResult,
	type JobProgress
} from '$lib/server/claude-flow/executor';

describe('CommandExecutor', () => {
	let executor: CommandExecutor;

	beforeEach(() => {
		vi.clearAllMocks();
		executor = new CommandExecutor({ autoStart: false });
	});

	afterEach(() => {
		executor.stopProcessing();
	});

	describe('submit', () => {
		it('should submit a job and return ID', () => {
			const jobId = executor.submit({ command: 'test' });

			expect(jobId).toBeTruthy();
			expect(executor.getJobStatus(jobId)).toBe('pending');
		});

		it('should use provided job ID', () => {
			const jobId = executor.submit({ id: 'custom-id', command: 'test' });

			expect(jobId).toBe('custom-id');
		});

		it('should emit job:queued event', () => {
			const listener = vi.fn();
			executor.on('job:queued', listener);

			executor.submit({ command: 'test' });

			expect(listener).toHaveBeenCalled();
		});

		it('should include metadata in job', () => {
			const listener = vi.fn();
			executor.on('job:queued', listener);

			executor.submit({
				command: 'test',
				projectId: 'proj-123',
				ticketId: 'ticket-456',
				metadata: { custom: 'data' }
			});

			expect(listener).toHaveBeenCalledWith(
				expect.objectContaining({
					config: expect.objectContaining({
						projectId: 'proj-123',
						ticketId: 'ticket-456',
						metadata: { custom: 'data' }
					})
				})
			);
		});
	});

	describe('job execution', () => {
		it('should execute pending jobs when processing starts', async () => {
			mockExecute.mockResolvedValue({ exitCode: 0, stdout: 'success' });

			const jobId = executor.submit({ command: 'agent', args: ['list'] });
			executor.startProcessing();

			await vi.waitFor(() => {
				expect(executor.getJobStatus(jobId)).toBe('completed');
			});
		});

		it('should emit job:started when job begins', async () => {
			mockExecute.mockResolvedValue({ exitCode: 0 });
			const listener = vi.fn();
			executor.on('job:started', listener);

			executor.submit({ command: 'test' });
			executor.startProcessing();

			await vi.waitFor(() => {
				expect(listener).toHaveBeenCalled();
			});
		});

		it('should emit job:completed on success', async () => {
			mockExecute.mockResolvedValue({ exitCode: 0, stdout: 'done' });
			const listener = vi.fn();
			executor.on('job:completed', listener);

			executor.submit({ command: 'test' });
			executor.startProcessing();

			await vi.waitFor(() => {
				expect(listener).toHaveBeenCalled();
			});

			expect(listener).toHaveBeenCalledWith(
				expect.objectContaining({
					status: 'completed'
				})
			);
		});

		it('should emit job:failed on non-zero exit code', async () => {
			mockExecute.mockResolvedValue({ exitCode: 1, stderr: 'error' });
			const listener = vi.fn();
			executor.on('job:failed', listener);

			executor.submit({ command: 'test' });
			executor.startProcessing();

			await vi.waitFor(() => {
				expect(listener).toHaveBeenCalled();
			});
		});

		it('should emit job:failed on exception', async () => {
			mockExecute.mockRejectedValue(new Error('CLI error'));
			const listener = vi.fn();
			executor.on('job:failed', listener);

			executor.submit({ command: 'test' });
			executor.startProcessing();

			await vi.waitFor(() => {
				expect(listener).toHaveBeenCalled();
			});

			expect(listener).toHaveBeenCalledWith(
				expect.objectContaining({
					error: 'CLI error'
				})
			);
		});

		it('should pass onOutput callback for progress streaming', async () => {
			mockExecute.mockImplementation(async (cmd, args, options) => {
				// Simulate output
				options?.onOutput?.('line 1', false);
				options?.onOutput?.('error line', true);
				return { exitCode: 0 };
			});

			const progressListener = vi.fn();
			executor.on('job:progress', progressListener);

			executor.submit({ command: 'test' });
			executor.startProcessing();

			await vi.waitFor(() => {
				expect(progressListener).toHaveBeenCalledTimes(2);
			});

			expect(progressListener).toHaveBeenCalledWith(
				expect.objectContaining({
					output: 'line 1',
					isError: false
				})
			);
			expect(progressListener).toHaveBeenCalledWith(
				expect.objectContaining({
					output: 'error line',
					isError: true
				})
			);
		});
	});

	describe('priority queue', () => {
		it('should process higher priority jobs first', async () => {
			const executionOrder: string[] = [];

			mockExecute.mockImplementation(async () => {
				return { exitCode: 0 };
			});

			executor.on('job:started', (job) => {
				executionOrder.push(job.id);
			});

			// Submit in reverse priority order
			executor.submit({ id: 'low', command: 'test', priority: 'low' });
			executor.submit({ id: 'normal', command: 'test', priority: 'normal' });
			executor.submit({ id: 'high', command: 'test', priority: 'high' });
			executor.submit({ id: 'critical', command: 'test', priority: 'critical' });

			executor.startProcessing();

			await vi.waitFor(() => {
				expect(executionOrder.length).toBe(4);
			});

			expect(executionOrder[0]).toBe('critical');
			expect(executionOrder[1]).toBe('high');
			expect(executionOrder[2]).toBe('normal');
			expect(executionOrder[3]).toBe('low');
		});

		it('should maintain FIFO order for same priority', async () => {
			const executionOrder: string[] = [];

			mockExecute.mockResolvedValue({ exitCode: 0 });

			executor.on('job:started', (job) => {
				executionOrder.push(job.id);
			});

			executor.submit({ id: 'first', command: 'test', priority: 'normal' });
			executor.submit({ id: 'second', command: 'test', priority: 'normal' });
			executor.submit({ id: 'third', command: 'test', priority: 'normal' });

			executor.startProcessing();

			await vi.waitFor(() => {
				expect(executionOrder.length).toBe(3);
			});

			expect(executionOrder).toEqual(['first', 'second', 'third']);
		});
	});

	describe('concurrency limits', () => {
		it('should respect maxConcurrent setting', async () => {
			const exec = new CommandExecutor({ maxConcurrent: 2, autoStart: false });
			let runningCount = 0;
			let maxRunning = 0;

			mockExecute.mockImplementation(async () => {
				runningCount++;
				maxRunning = Math.max(maxRunning, runningCount);
				await new Promise(r => setTimeout(r, 50));
				runningCount--;
				return { exitCode: 0 };
			});

			exec.submit({ command: 'test' });
			exec.submit({ command: 'test' });
			exec.submit({ command: 'test' });
			exec.submit({ command: 'test' });

			exec.startProcessing();

			await vi.waitFor(() => {
				expect(exec.getStats().queued).toBe(0);
				expect(exec.getStats().running).toBe(0);
			});

			expect(maxRunning).toBeLessThanOrEqual(2);
			exec.stopProcessing();
		});

		it('should allow updating maxConcurrent', () => {
			executor.setMaxConcurrent(5);

			expect(executor.getStats().maxConcurrent).toBe(5);
		});
	});

	describe('cancel', () => {
		it('should cancel pending job', () => {
			const jobId = executor.submit({ command: 'test' });

			const result = executor.cancel(jobId);

			expect(result).toBe(true);
			expect(executor.getJobStatus(jobId)).toBeNull();
		});

		it('should emit job:cancelled event', () => {
			const listener = vi.fn();
			executor.on('job:cancelled', listener);

			const jobId = executor.submit({ command: 'test' });
			executor.cancel(jobId);

			expect(listener).toHaveBeenCalledWith(jobId);
		});

		it('should return false for non-existent job', () => {
			const result = executor.cancel('nonexistent');

			expect(result).toBe(false);
		});
	});

	describe('waitForJob', () => {
		it('should resolve when job completes', async () => {
			mockExecute.mockResolvedValue({ exitCode: 0 });

			const jobId = executor.submit({ command: 'test' });
			executor.startProcessing();

			const result = await executor.waitForJob(jobId, 5000);

			expect(result.status).toBe('completed');
		});

		it('should resolve immediately for already completed job', async () => {
			mockExecute.mockResolvedValue({ exitCode: 0 });

			const jobId = executor.submit({ command: 'test' });
			executor.startProcessing();

			await vi.waitFor(() => {
				expect(executor.getJobStatus(jobId)).toBe('completed');
			});

			const result = await executor.waitForJob(jobId, 1000);

			expect(result.status).toBe('completed');
		});

		it('should reject on timeout', async () => {
			mockExecute.mockImplementation(() => new Promise(() => {})); // Never resolves

			const jobId = executor.submit({ command: 'test' });
			executor.startProcessing();

			await expect(executor.waitForJob(jobId, 100)).rejects.toThrow('Timeout');

			executor.stopProcessing();
		});

		it('should reject on cancellation', async () => {
			const jobId = executor.submit({ command: 'test' });

			const waitPromise = executor.waitForJob(jobId, 5000);
			executor.cancel(jobId);

			await expect(waitPromise).rejects.toThrow('cancelled');
		});
	});

	describe('getStats', () => {
		it('should return correct queue statistics', () => {
			executor.submit({ command: 'test' });
			executor.submit({ command: 'test' });

			const stats = executor.getStats();

			expect(stats.queued).toBe(2);
			expect(stats.running).toBe(0);
			expect(stats.completed).toBe(0);
		});
	});

	describe('getPendingJobs', () => {
		it('should return pending jobs info', () => {
			executor.submit({ id: 'job-1', command: 'test', priority: 'high' });
			executor.submit({ id: 'job-2', command: 'test', priority: 'low' });

			const pending = executor.getPendingJobs();

			expect(pending).toHaveLength(2);
			expect(pending[0].id).toBe('job-1');
			expect(pending[0].priority).toBe('high');
		});
	});

	describe('getRunningJobs', () => {
		it('should return running jobs info', async () => {
			mockExecute.mockImplementation(() => new Promise(() => {}));

			executor.submit({ id: 'job-1', command: 'test' });
			executor.startProcessing();

			await vi.waitFor(() => {
				expect(executor.getRunningJobs().length).toBe(1);
			});

			const running = executor.getRunningJobs();

			expect(running[0].id).toBe('job-1');
			expect(running[0].startedAt).toBeTruthy();

			executor.stopProcessing();
		});
	});

	describe('clearCompleted', () => {
		it('should clear completed jobs from history', async () => {
			mockExecute.mockResolvedValue({ exitCode: 0 });

			const jobId = executor.submit({ command: 'test' });
			executor.startProcessing();

			await vi.waitFor(() => {
				expect(executor.getJobStatus(jobId)).toBe('completed');
			});

			expect(executor.getStats().completed).toBe(1);

			executor.clearCompleted();

			expect(executor.getStats().completed).toBe(0);
		});
	});

	describe('queue:empty event', () => {
		it('should emit when all jobs complete', async () => {
			mockExecute.mockResolvedValue({ exitCode: 0 });
			const listener = vi.fn();
			executor.on('queue:empty', listener);

			executor.submit({ command: 'test' });
			executor.startProcessing();

			await vi.waitFor(() => {
				expect(listener).toHaveBeenCalled();
			});
		});
	});
});

describe('ExecutorWebSocketBridge', () => {
	it('should forward events to emit function', async () => {
		const { mockExecute } = vi.hoisted(() => ({ mockExecute: vi.fn() }));

		const executor = new CommandExecutor({ autoStart: false });
		const emitFn = vi.fn();
		new ExecutorWebSocketBridge(executor, emitFn);

		mockExecute.mockResolvedValue({ exitCode: 0 });

		executor.submit({ command: 'test', projectId: 'proj-1' });

		expect(emitFn).toHaveBeenCalledWith(
			'job:queued',
			expect.objectContaining({
				projectId: 'proj-1'
			})
		);

		executor.stopProcessing();
	});
});
