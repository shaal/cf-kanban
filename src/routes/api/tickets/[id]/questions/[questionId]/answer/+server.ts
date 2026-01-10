/**
 * Answer Submission API Endpoint
 *
 * TASK-056: Implement User Response Handling
 *
 * Endpoint:
 * - POST /api/tickets/:id/questions/:questionId/answer - Submit an answer
 *
 * This is a critical part of the feedback loop:
 * 1. Validates the answer against question requirements
 * 2. Stores the answer in the database
 * 3. Emits an event to notify the swarm that an answer is available
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/prisma';

/**
 * Event data for answer submission
 */
interface AnswerSubmittedEvent {
  type: 'question-answered';
  ticketId: string;
  projectId: string;
  questionId: string;
  answer: string;
  agentId: string;
  allAnswered: boolean;
  timestamp: number;
}

/**
 * Event listeners for answer events
 */
type AnswerEventListener = (event: AnswerSubmittedEvent) => void;
const answerListeners: Set<AnswerEventListener> = new Set();

/**
 * Subscribe to answer events
 * Prefixed with _ to avoid SvelteKit export validation
 */
export function _subscribeAnswerEvents(listener: AnswerEventListener): () => void {
  answerListeners.add(listener);
  return () => answerListeners.delete(listener);
}

/**
 * Emit an answer event
 */
function emitAnswerEvent(event: AnswerSubmittedEvent): void {
  answerListeners.forEach((listener) => {
    try {
      listener(event);
    } catch (error) {
      console.error('[AnswerHandler] Listener error:', error);
    }
  });
}

/**
 * POST /api/tickets/:id/questions/:questionId/answer
 *
 * Submit an answer to a question.
 *
 * Body:
 * {
 *   answer: string | string[] (required for required questions)
 * }
 *
 * Response:
 * {
 *   question: TicketQuestion (updated)
 *   allAnswered: boolean (whether all required questions are now answered)
 * }
 */
export const POST: RequestHandler = async ({ params, request }) => {
  const { id: ticketId, questionId } = params;

  try {
    const body = await request.json();

    // Get the question with ticket info
    const question = await prisma.ticketQuestion.findUnique({
      where: { id: questionId },
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

    if (question.ticketId !== ticketId) {
      throw error(400, 'Question does not belong to this ticket');
    }

    // Check if already answered
    if (question.answered) {
      throw error(400, 'Question has already been answered');
    }

    // Get and validate the answer
    let answer = body.answer;

    // Handle array answers for MULTISELECT
    if (Array.isArray(answer)) {
      answer = answer.join(',');
    }

    // Validate required
    if (question.required && (!answer || answer.trim() === '')) {
      throw error(400, 'Answer is required for this question');
    }

    // Validate answer based on question type
    if (answer && question.type === 'CHOICE') {
      if (!question.options.includes(answer)) {
        throw error(400, `Invalid choice. Must be one of: ${question.options.join(', ')}`);
      }
    }

    if (answer && question.type === 'MULTISELECT') {
      const selectedOptions = answer.split(',');
      for (const option of selectedOptions) {
        if (!question.options.includes(option)) {
          throw error(400, `Invalid option "${option}". Must be one of: ${question.options.join(', ')}`);
        }
      }
    }

    if (answer && question.type === 'CONFIRM') {
      const normalizedAnswer = answer.toLowerCase().trim();
      if (!['yes', 'no', 'true', 'false', '1', '0'].includes(normalizedAnswer)) {
        throw error(400, 'Confirmation must be "Yes" or "No"');
      }
      // Normalize to Yes/No
      answer = ['yes', 'true', '1'].includes(normalizedAnswer) ? 'Yes' : 'No';
    }

    // Update the question with the answer
    const updatedQuestion = await prisma.ticketQuestion.update({
      where: { id: questionId },
      data: {
        answer: answer || null,
        answered: true,
        answeredAt: new Date()
      }
    });

    // Check if all required questions are now answered
    const unansweredCount = await prisma.ticketQuestion.count({
      where: {
        ticketId,
        required: true,
        answered: false
      }
    });

    const allAnswered = unansweredCount === 0;

    // Emit event for the swarm/WebSocket
    const event: AnswerSubmittedEvent = {
      type: 'question-answered',
      ticketId,
      projectId: question.ticket.projectId,
      questionId,
      answer: answer || '',
      agentId: question.agentId,
      allAnswered,
      timestamp: Date.now()
    };

    emitAnswerEvent(event);

    return json({
      question: updatedQuestion,
      allAnswered,
      remainingRequired: unansweredCount
    });
  } catch (err) {
    if (err && typeof err === 'object' && 'status' in err) {
      throw err;
    }
    console.error('Error submitting answer:', err);
    throw error(500, 'Failed to submit answer');
  }
};

/**
 * GET /api/tickets/:id/questions/:questionId/answer
 *
 * Get the current answer for a question.
 */
export const GET: RequestHandler = async ({ params }) => {
  const { id: ticketId, questionId } = params;

  try {
    const question = await prisma.ticketQuestion.findUnique({
      where: { id: questionId },
      select: {
        id: true,
        ticketId: true,
        question: true,
        type: true,
        answer: true,
        answered: true,
        answeredAt: true
      }
    });

    if (!question) {
      throw error(404, 'Question not found');
    }

    if (question.ticketId !== ticketId) {
      throw error(400, 'Question does not belong to this ticket');
    }

    return json({
      questionId: question.id,
      question: question.question,
      type: question.type,
      answer: question.answer,
      answered: question.answered,
      answeredAt: question.answeredAt
    });
  } catch (err) {
    if (err && typeof err === 'object' && 'status' in err) {
      throw err;
    }
    console.error('Error fetching answer:', err);
    throw error(500, 'Failed to fetch answer');
  }
};

/**
 * DELETE /api/tickets/:id/questions/:questionId/answer
 *
 * Clear an answer (allow re-answering).
 * This is useful if the user made a mistake.
 */
export const DELETE: RequestHandler = async ({ params }) => {
  const { id: ticketId, questionId } = params;

  try {
    const question = await prisma.ticketQuestion.findUnique({
      where: { id: questionId }
    });

    if (!question) {
      throw error(404, 'Question not found');
    }

    if (question.ticketId !== ticketId) {
      throw error(400, 'Question does not belong to this ticket');
    }

    if (!question.answered) {
      throw error(400, 'Question has not been answered yet');
    }

    // Clear the answer
    const updated = await prisma.ticketQuestion.update({
      where: { id: questionId },
      data: {
        answer: null,
        answered: false,
        answeredAt: null
      }
    });

    return json({
      question: updated,
      cleared: true
    });
  } catch (err) {
    if (err && typeof err === 'object' && 'status' in err) {
      throw err;
    }
    console.error('Error clearing answer:', err);
    throw error(500, 'Failed to clear answer');
  }
};
