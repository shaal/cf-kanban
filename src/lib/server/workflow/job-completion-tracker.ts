/**
 * Job Completion Tracker
 *
 * Tracks job completion for tickets and auto-transitions based on results:
 * - All jobs successful → Move to REVIEW
 * - Any job failed/needs input → Move to NEEDS_FEEDBACK
 */

import { commandExecutor, type JobResult } from '../claude-flow/executor';
import { prisma } from '../prisma';
import { ticketStateMachine } from '$lib/state-machine/ticket-state-machine';
import { publishTicketMoved } from '../events';

/**
 * Tracks pending jobs for each ticket
 */
interface TicketJobTracker {
	ticketId: string;
	projectId: string;
	totalJobs: number;
	completedJobs: number;
	failedJobs: number;
	jobResults: Map<string, { success: boolean; error?: string }>;
	startedAt: Date;
}

// Active trackers by ticket ID
const activeTrackers = new Map<string, TicketJobTracker>();

// Job ID to ticket ID mapping
const jobToTicket = new Map<string, string>();

/**
 * Start tracking jobs for a ticket
 */
export function startTracking(
	ticketId: string,
	projectId: string,
	jobIds: string[]
): void {
	const tracker: TicketJobTracker = {
		ticketId,
		projectId,
		totalJobs: jobIds.length,
		completedJobs: 0,
		failedJobs: 0,
		jobResults: new Map(),
		startedAt: new Date()
	};

	activeTrackers.set(ticketId, tracker);

	// Map each job to this ticket
	for (const jobId of jobIds) {
		jobToTicket.set(jobId, ticketId);
	}

	console.log(`[JobTracker] Started tracking ${jobIds.length} jobs for ticket ${ticketId}`);
}

/**
 * Handle job completion event
 */
async function handleJobCompleted(result: JobResult): Promise<void> {
	const ticketId = jobToTicket.get(result.jobId);
	if (!ticketId) return;

	const tracker = activeTrackers.get(ticketId);
	if (!tracker) return;

	tracker.completedJobs++;
	tracker.jobResults.set(result.jobId, { success: true });

	console.log(`[JobTracker] Job ${result.jobId} completed for ticket ${ticketId} (${tracker.completedJobs}/${tracker.totalJobs})`);

	await checkTicketCompletion(tracker);
}

/**
 * Handle job failure event
 */
async function handleJobFailed(result: JobResult): Promise<void> {
	const ticketId = jobToTicket.get(result.jobId);
	if (!ticketId) return;

	const tracker = activeTrackers.get(ticketId);
	if (!tracker) return;

	tracker.completedJobs++;
	tracker.failedJobs++;
	tracker.jobResults.set(result.jobId, { success: false, error: result.error });

	console.log(`[JobTracker] Job ${result.jobId} FAILED for ticket ${ticketId}: ${result.error}`);

	await checkTicketCompletion(tracker);
}

/**
 * Check if all jobs are done and transition ticket accordingly
 */
async function checkTicketCompletion(tracker: TicketJobTracker): Promise<void> {
	// Not all jobs done yet
	if (tracker.completedJobs < tracker.totalJobs) {
		return;
	}

	const ticketId = tracker.ticketId;
	console.log(`[JobTracker] All ${tracker.totalJobs} jobs complete for ticket ${ticketId}`);

	// Get current ticket state
	const ticket = await prisma.ticket.findUnique({
		where: { id: ticketId }
	});

	if (!ticket || ticket.status !== 'IN_PROGRESS') {
		console.log(`[JobTracker] Ticket ${ticketId} not in IN_PROGRESS, skipping auto-transition`);
		cleanup(ticketId);
		return;
	}

	// Determine next state based on results
	const allSuccessful = tracker.failedJobs === 0;
	const nextState = allSuccessful ? 'REVIEW' : 'NEEDS_FEEDBACK';
	const reason = allSuccessful
		? `All ${tracker.totalJobs} jobs completed successfully. Ready for review.`
		: `${tracker.failedJobs} of ${tracker.totalJobs} jobs failed. User input may be needed.`;

	console.log(`[JobTracker] Auto-transitioning ticket ${ticketId} to ${nextState}`);

	try {
		// Transition the ticket
		await ticketStateMachine.transition(ticketId, nextState, {
			triggeredBy: 'agent',
			reason
		});

		// Record in history
		await prisma.ticketHistory.create({
			data: {
				ticketId,
				fromStatus: 'IN_PROGRESS',
				toStatus: nextState,
				reason,
				triggeredBy: 'workflow-auto'
			}
		});

		// Publish event for real-time UI update
		await publishTicketMoved(
			tracker.projectId,
			ticketId,
			'IN_PROGRESS',
			nextState,
			ticket.position
		);

		// If needs feedback, create a question for the user
		if (!allSuccessful) {
			const errors = Array.from(tracker.jobResults.entries())
				.filter(([_, r]) => !r.success)
				.map(([jobId, r]) => `Job ${jobId}: ${r.error}`)
				.join('\n');

			await prisma.ticketQuestion.create({
				data: {
					ticketId,
					agentId: 'workflow-system',
					question: `Some execution jobs encountered issues:\n\n${errors}\n\nPlease review and provide guidance on how to proceed.`,
					questionType: 'TEXT',
					required: true,
					answered: false
				}
			});
		}

		console.log(`[JobTracker] Successfully transitioned ticket ${ticketId} to ${nextState}`);
	} catch (error) {
		console.error(`[JobTracker] Failed to transition ticket ${ticketId}:`, error);
	}

	// Cleanup tracking
	cleanup(ticketId);
}

/**
 * Clean up tracking data for a ticket
 */
function cleanup(ticketId: string): void {
	const tracker = activeTrackers.get(ticketId);
	if (tracker) {
		// Remove job mappings
		for (const [jobId, tId] of jobToTicket.entries()) {
			if (tId === ticketId) {
				jobToTicket.delete(jobId);
			}
		}
		activeTrackers.delete(ticketId);
	}
}

/**
 * Get tracking status for a ticket
 */
export function getTrackingStatus(ticketId: string): TicketJobTracker | null {
	return activeTrackers.get(ticketId) ?? null;
}

/**
 * Initialize the job completion tracker
 * Sets up event listeners on the command executor
 */
export function initJobCompletionTracker(): void {
	commandExecutor.on('job:completed', handleJobCompleted);
	commandExecutor.on('job:failed', handleJobFailed);
	console.log('[JobTracker] Initialized job completion tracker');
}

// Auto-initialize when module is imported
initJobCompletionTracker();
