/**
 * cf-kanban-jxq: Executor Status API
 *
 * Returns current execution status and recent output logs.
 * Used by DebugOutputPanel for real-time visibility.
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { commandExecutor, type JobStatus } from '$lib/server/claude-flow/executor';

// In-memory output buffer (in production, use Redis or similar)
interface OutputBuffer {
	lines: Array<{ timestamp: string; text: string; isError: boolean }>;
	lastReadIndex: Map<string, number>; // clientId -> lastReadIndex
}

const outputBuffer: OutputBuffer = {
	lines: [],
	lastReadIndex: new Map()
};

// Maximum lines to keep in buffer
const MAX_BUFFER_SIZE = 1000;

// Set up executor event listeners (run once)
let listenersSetup = false;

function setupListeners() {
	if (listenersSetup) return;
	listenersSetup = true;

	commandExecutor.on('job:progress', (progress) => {
		if (progress.output) {
			outputBuffer.lines.push({
				timestamp: progress.timestamp,
				text: progress.output,
				isError: progress.isError ?? false
			});

			// Trim buffer if too large
			if (outputBuffer.lines.length > MAX_BUFFER_SIZE) {
				outputBuffer.lines = outputBuffer.lines.slice(-MAX_BUFFER_SIZE);
			}
		}
	});

	commandExecutor.on('job:started', (job) => {
		outputBuffer.lines.push({
			timestamp: new Date().toISOString(),
			text: `[JOB STARTED] ${job.id} - ${job.config.command}`,
			isError: false
		});
	});

	commandExecutor.on('job:completed', (result) => {
		outputBuffer.lines.push({
			timestamp: new Date().toISOString(),
			text: `[JOB COMPLETED] ${result.jobId} - Duration: ${result.duration}ms`,
			isError: false
		});
	});

	commandExecutor.on('job:failed', (result) => {
		outputBuffer.lines.push({
			timestamp: new Date().toISOString(),
			text: `[JOB FAILED] ${result.jobId} - ${result.error}`,
			isError: true
		});
	});
}

export const GET: RequestHandler = async ({ url }) => {
	// Ensure listeners are set up
	setupListeners();

	const ticketId = url.searchParams.get('ticketId');
	const projectId = url.searchParams.get('projectId');
	const clientId = url.searchParams.get('clientId') ?? 'default';

	// Get executor stats
	const stats = commandExecutor.getStats();
	const runningJobs = commandExecutor.getRunningJobs();
	const pendingJobs = commandExecutor.getPendingJobs();

	// Determine overall status
	let status: 'idle' | 'running' | 'completed' | 'failed' = 'idle';
	if (runningJobs.length > 0) {
		status = 'running';
	}

	// Get current job (if any)
	let currentJob: { id: string; command: string; startedAt: string } | null = null;
	if (runningJobs.length > 0) {
		const job = runningJobs[0];
		currentJob = {
			id: job.id,
			command: 'Claude Flow CLI', // Simplified - could get actual command from job
			startedAt: job.startedAt
		};
	}

	// Get new output since last read
	const lastIndex = outputBuffer.lastReadIndex.get(clientId) ?? 0;
	const newOutput = outputBuffer.lines.slice(lastIndex);
	outputBuffer.lastReadIndex.set(clientId, outputBuffer.lines.length);

	return json({
		status,
		currentJob,
		newOutput,
		stats: {
			queued: stats.queued,
			running: stats.running,
			completed: stats.completed,
			maxConcurrent: stats.maxConcurrent
		},
		pendingJobs: pendingJobs.length,
		ticketId,
		projectId
	});
};
