/**
 * Feedback Request API Endpoint
 *
 * TASK-054: Implement "Needs Feedback" Transition
 *
 * Endpoint:
 * - POST /api/tickets/:id/feedback - Request feedback from user (agent API)
 * - GET /api/tickets/:id/feedback - Get feedback status for a ticket
 *
 * This is the entry point for agents to request user input.
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/prisma';
import {
  requestFeedback,
  generateQuestionId,
  type Question,
  type QuestionType
} from '$lib/server/workflow/feedback-handler';

/**
 * POST /api/tickets/:id/feedback
 *
 * Request feedback from the user. This is called by agents when they need input.
 *
 * Body:
 * {
 *   agentId: string (required)
 *   questions: Array<{
 *     text: string (required)
 *     type?: 'TEXT' | 'CHOICE' | 'MULTISELECT' | 'CONFIRM' | 'CODE'
 *     options?: string[] (required for CHOICE/MULTISELECT)
 *     required?: boolean (default: true)
 *     context?: string
 *     codeLanguage?: string
 *     defaultValue?: string
 *   }>
 *   context?: string (general context for all questions)
 *   blocking?: boolean (default: true - whether to pause execution)
 * }
 */
export const POST: RequestHandler = async ({ params, request }) => {
  const { id } = params;

  try {
    const body = await request.json();

    // Validate required fields
    if (!body.agentId) {
      throw error(400, 'agentId is required');
    }

    if (!Array.isArray(body.questions) || body.questions.length === 0) {
      throw error(400, 'At least one question is required');
    }

    // Validate each question
    const validTypes: QuestionType[] = ['TEXT', 'CHOICE', 'MULTISELECT', 'CONFIRM', 'CODE'];

    for (let i = 0; i < body.questions.length; i++) {
      const q = body.questions[i];

      if (!q.text || typeof q.text !== 'string') {
        throw error(400, `Question ${i + 1}: text is required`);
      }

      const type = q.type || 'TEXT';
      if (!validTypes.includes(type)) {
        throw error(400, `Question ${i + 1}: invalid type "${type}". Must be one of: ${validTypes.join(', ')}`);
      }

      if (['CHOICE', 'MULTISELECT'].includes(type)) {
        if (!Array.isArray(q.options) || q.options.length === 0) {
          throw error(400, `Question ${i + 1}: options array required for ${type} type`);
        }
      }
    }

    // Build questions array with IDs
    const questions: Question[] = body.questions.map((q: {
      text: string;
      type?: QuestionType;
      options?: string[];
      required?: boolean;
      context?: string;
      codeLanguage?: string;
      defaultValue?: string;
    }) => ({
      id: generateQuestionId(),
      text: q.text,
      type: (q.type || 'TEXT') as QuestionType,
      options: q.options,
      required: q.required ?? true,
      context: q.context,
      codeLanguage: q.codeLanguage,
      defaultValue: q.defaultValue
    }));

    // Request feedback using the handler
    const result = await requestFeedback({
      ticketId: id,
      agentId: body.agentId,
      questions,
      context: body.context || '',
      blocking: body.blocking ?? true
    });

    if (!result.success) {
      throw error(400, result.error || 'Failed to request feedback');
    }

    return json({
      success: true,
      questionIds: result.questionIds,
      ticketTransitioned: result.ticketTransitioned,
      message: result.ticketTransitioned
        ? 'Ticket moved to NEEDS_FEEDBACK status'
        : 'Questions added (ticket status unchanged)'
    });
  } catch (err) {
    if (err && typeof err === 'object' && 'status' in err) {
      throw err;
    }
    console.error('Error requesting feedback:', err);
    throw error(500, 'Failed to request feedback');
  }
};

/**
 * GET /api/tickets/:id/feedback
 *
 * Get the current feedback status for a ticket.
 */
export const GET: RequestHandler = async ({ params }) => {
  const { id } = params;

  try {
    const ticket = await prisma.ticket.findUnique({
      where: { id },
      include: {
        questions: {
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    if (!ticket) {
      throw error(404, 'Ticket not found');
    }

    const pending = ticket.questions.filter(q => !q.answered);
    const answered = ticket.questions.filter(q => q.answered);
    const requiredPending = pending.filter(q => q.required);

    return json({
      ticketId: id,
      status: ticket.status,
      isWaitingForFeedback: ticket.status === 'NEEDS_FEEDBACK',
      questions: {
        total: ticket.questions.length,
        pending: pending.length,
        answered: answered.length,
        requiredPending: requiredPending.length
      },
      canResume: ticket.status === 'NEEDS_FEEDBACK' && requiredPending.length === 0,
      pendingQuestions: pending.map(q => ({
        id: q.id,
        question: q.question,
        type: q.type,
        required: q.required,
        agentId: q.agentId
      })),
      answeredQuestions: answered.map(q => ({
        id: q.id,
        question: q.question,
        answer: q.answer,
        agentId: q.agentId
      }))
    });
  } catch (err) {
    if (err && typeof err === 'object' && 'status' in err) {
      throw err;
    }
    console.error('Error getting feedback status:', err);
    throw error(500, 'Failed to get feedback status');
  }
};
