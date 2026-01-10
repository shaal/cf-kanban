/**
 * Ready to Resume API Endpoint
 *
 * TASK-058: Implement "Ready to Resume" Workflow
 *
 * Endpoint:
 * - POST /api/tickets/:id/resume - Resume ticket execution after feedback
 *
 * This completes the feedback loop:
 * 1. Validates all required questions are answered
 * 2. Transitions ticket: NEEDS_FEEDBACK -> READY_TO_RESUME -> IN_PROGRESS
 * 3. Collects all answers for the swarm
 * 4. Emits event to resume agent execution
 *
 * This is the final step in the swim-lane feedback loop.
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/prisma';
import { ticketStateMachine } from '$lib/state-machine/ticket-state-machine';
import { handleTicketTransition } from '$lib/server/workflow/ticket-workflow';
import type { TicketState } from '$lib/state-machine/types';

/**
 * Event data for execution resumed
 */
interface ExecutionResumedEvent {
  type: 'execution-resumed';
  ticketId: string;
  projectId: string;
  answers: Array<{
    questionId: string;
    question: string;
    answer: string | null;
    agentId: string;
    type: string;
  }>;
  resumedAt: string;
  timestamp: number;
}

/**
 * Event listeners for resume events
 */
type ResumeEventListener = (event: ExecutionResumedEvent) => void;
const resumeListeners: Set<ResumeEventListener> = new Set();

/**
 * Subscribe to resume events
 * Prefixed with _ to avoid SvelteKit export validation
 */
export function _subscribeResumeEvents(listener: ResumeEventListener): () => void {
  resumeListeners.add(listener);
  return () => resumeListeners.delete(listener);
}

/**
 * Emit a resume event
 */
function emitResumeEvent(event: ExecutionResumedEvent): void {
  resumeListeners.forEach((listener) => {
    try {
      listener(event);
    } catch (error) {
      console.error('[ResumeHandler] Listener error:', error);
    }
  });
}

/**
 * POST /api/tickets/:id/resume
 *
 * Resume ticket execution after all feedback has been provided.
 *
 * Response:
 * {
 *   ticket: Ticket (updated with IN_PROGRESS status)
 *   answers: Array of question/answer pairs
 *   transitions: Array of state transitions performed
 * }
 */
export const POST: RequestHandler = async ({ params }) => {
  const { id } = params;

  try {
    // Get ticket with questions
    const ticket = await prisma.ticket.findUnique({
      where: { id },
      include: {
        questions: {
          orderBy: { createdAt: 'asc' }
        },
        project: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    if (!ticket) {
      throw error(404, 'Ticket not found');
    }

    // Validate current status - allow resume from NEEDS_FEEDBACK or REVIEW
    const validResumeStatuses = ['NEEDS_FEEDBACK', 'REVIEW'];
    if (!validResumeStatuses.includes(ticket.status)) {
      throw error(400, `Cannot resume ticket in ${ticket.status} status. Expected one of: ${validResumeStatuses.join(', ')}`);
    }

    // Check all required questions are answered
    const unansweredRequired = ticket.questions.filter(q => q.required && !q.answered);

    if (unansweredRequired.length > 0) {
      throw error(400, {
        message: `${unansweredRequired.length} required question(s) still need answers`,
        unanswered: unansweredRequired.map(q => ({
          id: q.id,
          question: q.question
        }))
      } as unknown as string);
    }

    // Collect answered questions
    const answeredQuestions = ticket.questions.filter(q => q.answered);
    const answers = answeredQuestions.map(q => ({
      questionId: q.id,
      question: q.question,
      answer: q.answer,
      agentId: q.agentId,
      type: q.type
    }));

    // Track transitions
    const transitions: Array<{ from: string; to: string; timestamp: string }> = [];

    // Use transaction for atomic state transitions
    const result = await prisma.$transaction(async (tx) => {
      const currentStatus = ticket.status as TicketState;

      // Handle different source statuses
      if (currentStatus === 'REVIEW') {
        // REVIEW -> IN_PROGRESS (direct transition for "continue working")
        if (!ticketStateMachine.canTransition(currentStatus, 'IN_PROGRESS')) {
          throw new Error(`Invalid transition from ${currentStatus} to IN_PROGRESS`);
        }

        await tx.ticketHistory.create({
          data: {
            ticketId: id,
            fromStatus: currentStatus,
            toStatus: 'IN_PROGRESS',
            reason: 'User requested Claude to continue working on the ticket',
            triggeredBy: 'user'
          }
        });

        const updatedTicket = await tx.ticket.update({
          where: { id },
          data: { status: 'IN_PROGRESS' }
        });

        transitions.push({
          from: currentStatus,
          to: 'IN_PROGRESS',
          timestamp: new Date().toISOString()
        });

        return updatedTicket;
      } else {
        // NEEDS_FEEDBACK -> READY_TO_RESUME -> IN_PROGRESS
        if (!ticketStateMachine.canTransition(currentStatus, 'READY_TO_RESUME')) {
          throw new Error(`Invalid transition from ${currentStatus} to READY_TO_RESUME`);
        }

        await tx.ticketHistory.create({
          data: {
            ticketId: id,
            fromStatus: currentStatus,
            toStatus: 'READY_TO_RESUME',
            reason: 'User provided all required feedback',
            triggeredBy: 'user'
          }
        });

        await tx.ticket.update({
          where: { id },
          data: { status: 'READY_TO_RESUME' }
        });

        transitions.push({
          from: currentStatus,
          to: 'READY_TO_RESUME',
          timestamp: new Date().toISOString()
        });

        // Transition 2: READY_TO_RESUME -> IN_PROGRESS (automatic)
        if (ticketStateMachine.canTransition('READY_TO_RESUME', 'IN_PROGRESS')) {
          await tx.ticketHistory.create({
            data: {
              ticketId: id,
              fromStatus: 'READY_TO_RESUME',
              toStatus: 'IN_PROGRESS',
              reason: 'Resuming execution with user feedback',
              triggeredBy: 'system'
            }
          });

          const updatedTicket = await tx.ticket.update({
            where: { id },
            data: { status: 'IN_PROGRESS' }
          });

          transitions.push({
            from: 'READY_TO_RESUME',
            to: 'IN_PROGRESS',
            timestamp: new Date().toISOString()
          });

          return updatedTicket;
        }

        // If auto-transition didn't happen, return with READY_TO_RESUME status
        return tx.ticket.findUnique({ where: { id } });
      }
    });

    // Emit resume event for the swarm
    const event: ExecutionResumedEvent = {
      type: 'execution-resumed',
      ticketId: id,
      projectId: ticket.projectId,
      answers,
      resumedAt: new Date().toISOString(),
      timestamp: Date.now()
    };

    emitResumeEvent(event);

    // Trigger workflow execution to start Claude working again
    // This spawns new jobs which will appear in the Debug Output panel
    let workflowResult = null;
    try {
      // Use the original status (before transition) as fromStatus
      const originalStatus = ticket.status as TicketState;
      // For REVIEW, treat like TODO → IN_PROGRESS to spawn fresh execution
      // For NEEDS_FEEDBACK, the workflow handles READY_TO_RESUME → IN_PROGRESS
      const effectiveFromStatus = originalStatus === 'REVIEW' ? 'TODO' : 'READY_TO_RESUME';
      workflowResult = await handleTicketTransition(
        id,
        effectiveFromStatus,
        'IN_PROGRESS',
        'user'
      );
    } catch (workflowError) {
      console.error('[Resume] Workflow error (non-blocking):', workflowError);
    }

    return json({
      ticket: result,
      answers,
      transitions,
      workflow: workflowResult,
      message: 'Ticket execution resumed successfully'
    });
  } catch (err) {
    if (err && typeof err === 'object' && 'status' in err) {
      throw err;
    }
    console.error('Error resuming ticket:', err);
    throw error(500, 'Failed to resume ticket execution');
  }
};

/**
 * GET /api/tickets/:id/resume
 *
 * Check if a ticket is ready to resume (all required questions answered).
 */
export const GET: RequestHandler = async ({ params }) => {
  const { id } = params;

  try {
    const ticket = await prisma.ticket.findUnique({
      where: { id },
      include: {
        questions: {
          select: {
            id: true,
            question: true,
            required: true,
            answered: true
          }
        }
      }
    });

    if (!ticket) {
      throw error(404, 'Ticket not found');
    }

    const unansweredRequired = ticket.questions.filter(q => q.required && !q.answered);
    const validResumeStatuses = ['NEEDS_FEEDBACK', 'REVIEW'];
    const canResume = validResumeStatuses.includes(ticket.status) && unansweredRequired.length === 0;

    return json({
      ticketId: id,
      status: ticket.status,
      canResume,
      questions: {
        total: ticket.questions.length,
        answered: ticket.questions.filter(q => q.answered).length,
        requiredPending: unansweredRequired.length
      },
      unanswered: unansweredRequired.map(q => ({
        id: q.id,
        question: q.question
      }))
    });
  } catch (err) {
    if (err && typeof err === 'object' && 'status' in err) {
      throw err;
    }
    console.error('Error checking resume status:', err);
    throw error(500, 'Failed to check resume status');
  }
};
