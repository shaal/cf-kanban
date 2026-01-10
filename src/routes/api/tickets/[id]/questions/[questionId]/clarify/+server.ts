/**
 * Question Clarification API Endpoint
 *
 * GAP-3.2.6: Feedback Interaction UI Enhancement
 *
 * Endpoint:
 * - POST /api/tickets/:id/questions/:questionId/clarify - Request clarification on a question
 *
 * This endpoint allows users to request that Claude provide additional
 * context or clarification for a question that is unclear.
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/prisma';

/**
 * Event data for clarification request
 */
interface ClarificationRequestEvent {
  type: 'clarification-requested';
  ticketId: string;
  projectId: string;
  questionId: string;
  originalQuestion: string;
  context: string | null;
  agentId: string;
  timestamp: number;
}

/**
 * Event listeners for clarification events
 */
type ClarificationEventListener = (event: ClarificationRequestEvent) => void;
const clarificationListeners: Set<ClarificationEventListener> = new Set();

/**
 * Subscribe to clarification events
 */
export function subscribeClarificationEvents(listener: ClarificationEventListener): () => void {
  clarificationListeners.add(listener);
  return () => clarificationListeners.delete(listener);
}

/**
 * Emit a clarification event
 */
function emitClarificationEvent(event: ClarificationRequestEvent): void {
  clarificationListeners.forEach((listener) => {
    try {
      listener(event);
    } catch (error) {
      console.error('[ClarificationHandler] Listener error:', error);
    }
  });
}

/**
 * POST /api/tickets/:id/questions/:questionId/clarify
 *
 * Request clarification on a question from Claude.
 *
 * Body:
 * {
 *   questionId: string,
 *   originalQuestion: string,
 *   context?: string
 * }
 *
 * Response:
 * {
 *   success: boolean,
 *   message: string,
 *   clarificationId: string
 * }
 */
export const POST: RequestHandler = async ({ params, request }) => {
  const { id: ticketId, questionId } = params;

  try {
    const body = await request.json();

    // Verify the question exists and belongs to this ticket
    const question = await prisma.ticketQuestion.findFirst({
      where: {
        id: questionId,
        ticketId
      },
      include: {
        ticket: {
          select: {
            id: true,
            projectId: true,
            status: true
          }
        }
      }
    });

    if (!question) {
      throw error(404, 'Question not found');
    }

    // Cannot request clarification on already answered questions
    if (question.answered) {
      throw error(400, 'Cannot request clarification on an answered question');
    }

    // Verify ticket is in NEEDS_FEEDBACK status
    if (question.ticket.status !== 'NEEDS_FEEDBACK') {
      throw error(400, 'Ticket must be in NEEDS_FEEDBACK status to request clarification');
    }

    // Create a clarification request record
    // For now, we'll update the question's context with a note that clarification was requested
    // In a full implementation, this would trigger an agent to provide additional context
    const clarificationNote = `[Clarification requested at ${new Date().toISOString()}]`;
    const updatedContext = question.context
      ? `${question.context}\n\n${clarificationNote}`
      : clarificationNote;

    await prisma.ticketQuestion.update({
      where: { id: questionId },
      data: {
        context: updatedContext
      }
    });

    // Emit clarification event for agents to handle
    emitClarificationEvent({
      type: 'clarification-requested',
      ticketId,
      projectId: question.ticket.projectId,
      questionId,
      originalQuestion: question.question,
      context: question.context,
      agentId: question.agentId,
      timestamp: Date.now()
    });

    // Log the clarification request
    console.log(`[ClarificationHandler] Clarification requested for question ${questionId} on ticket ${ticketId}`);

    return json({
      success: true,
      message: 'Clarification request sent to Claude. The question context will be updated shortly.',
      clarificationId: `clarify-${questionId}-${Date.now()}`
    });
  } catch (err) {
    if (err && typeof err === 'object' && 'status' in err) {
      throw err;
    }
    console.error('[ClarificationHandler] Error:', err);
    throw error(500, 'Failed to request clarification');
  }
};
