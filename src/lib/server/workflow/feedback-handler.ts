/**
 * Feedback Handler for Agent-User Interaction
 *
 * TASK-054: Implement "Needs Feedback" Transition
 *
 * This module handles the core feedback loop between Claude agents and users.
 * When an agent needs user input, it can request feedback which:
 * 1. Stores the questions in the database
 * 2. Transitions the ticket to NEEDS_FEEDBACK status
 * 3. Pauses swarm execution
 * 4. Notifies the user via WebSocket
 *
 * This is THE CORE FEATURE of CF-Kanban - the swim-lane feedback loop.
 */

import { prisma } from '$lib/server/prisma';
import { ticketStateMachine } from '$lib/state-machine/ticket-state-machine';
import type { TicketState } from '$lib/state-machine/types';

/**
 * Question types supported by the feedback system
 */
export type QuestionType = 'TEXT' | 'CHOICE' | 'MULTISELECT' | 'CONFIRM' | 'CODE';

/**
 * A question that an agent asks the user
 */
export interface Question {
  id: string;
  text: string;
  type: QuestionType;
  options?: string[];
  required: boolean;
  context?: string;
  codeLanguage?: string; // For CODE type questions
  defaultValue?: string;
}

/**
 * Request to pause execution and ask user for feedback
 */
export interface FeedbackRequest {
  ticketId: string;
  agentId: string;
  questions: Question[];
  context: string;
  blocking: boolean;
}

/**
 * Result of a feedback request
 */
export interface FeedbackRequestResult {
  success: boolean;
  questionIds: string[];
  ticketTransitioned: boolean;
  error?: string;
}

/**
 * Event data published when feedback is requested
 */
export interface FeedbackRequestedEvent {
  type: 'feedback-requested';
  ticketId: string;
  projectId: string;
  agentId: string;
  questions: Question[];
  context: string;
  blocking: boolean;
  timestamp: number;
}

/**
 * Event listeners for feedback events (in-memory for now, will bridge to WebSocket)
 */
type FeedbackEventListener = (event: FeedbackRequestedEvent) => void;
const feedbackListeners: Set<FeedbackEventListener> = new Set();

/**
 * Subscribe to feedback events
 *
 * @param listener - Function to call when feedback is requested
 * @returns Unsubscribe function
 */
export function subscribeFeedbackEvents(listener: FeedbackEventListener): () => void {
  feedbackListeners.add(listener);
  return () => feedbackListeners.delete(listener);
}

/**
 * Emit a feedback event to all listeners
 */
function emitFeedbackEvent(event: FeedbackRequestedEvent): void {
  feedbackListeners.forEach((listener) => {
    try {
      listener(event);
    } catch (error) {
      console.error('[FeedbackHandler] Listener error:', error);
    }
  });
}

/**
 * Request feedback from the user
 *
 * This is the main entry point for agents to request user input.
 * It stores the questions, transitions the ticket if blocking,
 * and notifies listeners (which will bridge to WebSocket).
 *
 * @param request - The feedback request details
 * @returns Result of the feedback request
 */
export async function requestFeedback(
  request: FeedbackRequest
): Promise<FeedbackRequestResult> {
  const questionIds: string[] = [];
  let ticketTransitioned = false;

  try {
    // Validate ticket exists
    const ticket = await prisma.ticket.findUnique({
      where: { id: request.ticketId },
      include: { project: true }
    });

    if (!ticket) {
      return {
        success: false,
        questionIds: [],
        ticketTransitioned: false,
        error: 'Ticket not found'
      };
    }

    // Validate questions
    if (!request.questions || request.questions.length === 0) {
      return {
        success: false,
        questionIds: [],
        ticketTransitioned: false,
        error: 'At least one question is required'
      };
    }

    // Validate question types and options
    for (const question of request.questions) {
      if (['CHOICE', 'MULTISELECT'].includes(question.type)) {
        if (!question.options || question.options.length === 0) {
          return {
            success: false,
            questionIds: [],
            ticketTransitioned: false,
            error: `Question "${question.text}" requires options for type ${question.type}`
          };
        }
      }
    }

    // Use transaction to ensure atomicity
    const result = await prisma.$transaction(async (tx) => {
      // Store each question
      for (const question of request.questions) {
        const createdQuestion = await tx.ticketQuestion.create({
          data: {
            id: question.id,
            ticketId: request.ticketId,
            agentId: request.agentId,
            question: question.text,
            type: question.type,
            options: question.options || [],
            required: question.required,
            context: question.context || request.context,
            codeLanguage: question.codeLanguage,
            defaultValue: question.defaultValue,
            answered: false
          }
        });
        questionIds.push(createdQuestion.id);
      }

      // Transition ticket to NEEDS_FEEDBACK if blocking
      if (request.blocking && ticket.status !== 'NEEDS_FEEDBACK') {
        const currentState = ticket.status as TicketState;

        // Check if transition is valid
        if (ticketStateMachine.canTransition(currentState, 'NEEDS_FEEDBACK')) {
          await tx.ticketHistory.create({
            data: {
              ticketId: request.ticketId,
              fromStatus: currentState,
              toStatus: 'NEEDS_FEEDBACK',
              reason: `Agent ${request.agentId} needs feedback: ${request.questions.length} question(s)`,
              triggeredBy: 'agent'
            }
          });

          await tx.ticket.update({
            where: { id: request.ticketId },
            data: { status: 'NEEDS_FEEDBACK' }
          });

          ticketTransitioned = true;
        }
      }

      return { questionIds, ticketTransitioned };
    });

    // Emit event for WebSocket bridge
    const event: FeedbackRequestedEvent = {
      type: 'feedback-requested',
      ticketId: request.ticketId,
      projectId: ticket.projectId,
      agentId: request.agentId,
      questions: request.questions,
      context: request.context,
      blocking: request.blocking,
      timestamp: Date.now()
    };

    emitFeedbackEvent(event);

    return {
      success: true,
      questionIds: result.questionIds,
      ticketTransitioned: result.ticketTransitioned
    };
  } catch (error) {
    console.error('[FeedbackHandler] Error requesting feedback:', error);
    return {
      success: false,
      questionIds,
      ticketTransitioned,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Get all pending questions for a ticket
 *
 * @param ticketId - The ticket ID
 * @returns Array of unanswered questions
 */
export async function getPendingQuestions(ticketId: string) {
  return prisma.ticketQuestion.findMany({
    where: {
      ticketId,
      answered: false
    },
    orderBy: { createdAt: 'asc' }
  });
}

/**
 * Get all questions for a ticket (answered and unanswered)
 *
 * @param ticketId - The ticket ID
 * @returns Array of all questions
 */
export async function getAllQuestions(ticketId: string) {
  return prisma.ticketQuestion.findMany({
    where: { ticketId },
    orderBy: { createdAt: 'asc' }
  });
}

/**
 * Check if all required questions have been answered
 *
 * @param ticketId - The ticket ID
 * @returns True if all required questions are answered
 */
export async function allRequiredQuestionsAnswered(ticketId: string): Promise<boolean> {
  const unanswered = await prisma.ticketQuestion.count({
    where: {
      ticketId,
      required: true,
      answered: false
    }
  });
  return unanswered === 0;
}

/**
 * Generate a unique question ID
 *
 * @returns A unique question ID
 */
export function generateQuestionId(): string {
  return `q_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Create a helper function to build questions easily
 */
export const QuestionBuilder = {
  text(
    text: string,
    options: Partial<Omit<Question, 'text' | 'type'>> = {}
  ): Question {
    return {
      id: generateQuestionId(),
      text,
      type: 'TEXT',
      required: true,
      ...options
    };
  },

  choice(
    text: string,
    choices: string[],
    options: Partial<Omit<Question, 'text' | 'type' | 'options'>> = {}
  ): Question {
    return {
      id: generateQuestionId(),
      text,
      type: 'CHOICE',
      options: choices,
      required: true,
      ...options
    };
  },

  multiselect(
    text: string,
    choices: string[],
    options: Partial<Omit<Question, 'text' | 'type' | 'options'>> = {}
  ): Question {
    return {
      id: generateQuestionId(),
      text,
      type: 'MULTISELECT',
      options: choices,
      required: true,
      ...options
    };
  },

  confirm(
    text: string,
    options: Partial<Omit<Question, 'text' | 'type'>> = {}
  ): Question {
    return {
      id: generateQuestionId(),
      text,
      type: 'CONFIRM',
      required: true,
      ...options
    };
  },

  code(
    text: string,
    language: string,
    options: Partial<Omit<Question, 'text' | 'type' | 'codeLanguage'>> = {}
  ): Question {
    return {
      id: generateQuestionId(),
      text,
      type: 'CODE',
      codeLanguage: language,
      required: true,
      ...options
    };
  }
};
