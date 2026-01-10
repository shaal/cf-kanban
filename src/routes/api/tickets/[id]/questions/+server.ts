/**
 * Question CRUD API Endpoints
 *
 * TASK-055: Create Question Persistence Model
 *
 * Endpoints:
 * - GET /api/tickets/:id/questions - Get all questions for a ticket
 * - POST /api/tickets/:id/questions - Create a new question (agent request)
 *
 * These endpoints support the feedback loop between agents and users.
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/prisma';
import type { QuestionType } from '@prisma/client';

/**
 * GET /api/tickets/:id/questions
 *
 * Get all questions for a ticket, optionally filtered by answered status.
 *
 * Query parameters:
 * - answered: 'true' | 'false' | undefined - Filter by answered status
 * - agentId: string - Filter by agent ID
 */
export const GET: RequestHandler = async ({ params, url }) => {
  const { id } = params;
  const answeredParam = url.searchParams.get('answered');
  const agentId = url.searchParams.get('agentId');

  try {
    // Build where clause
    const where: {
      ticketId: string;
      answered?: boolean;
      agentId?: string;
    } = { ticketId: id };

    if (answeredParam !== null) {
      where.answered = answeredParam === 'true';
    }

    if (agentId) {
      where.agentId = agentId;
    }

    const questions = await prisma.ticketQuestion.findMany({
      where,
      orderBy: { createdAt: 'asc' }
    });

    // Calculate summary stats
    const stats = {
      total: questions.length,
      answered: questions.filter(q => q.answered).length,
      pending: questions.filter(q => !q.answered).length,
      requiredPending: questions.filter(q => q.required && !q.answered).length
    };

    return json({
      questions,
      stats
    });
  } catch (err) {
    console.error('Error fetching questions:', err);
    throw error(500, 'Failed to fetch questions');
  }
};

/**
 * POST /api/tickets/:id/questions
 *
 * Create a new question for a ticket (typically called by an agent).
 *
 * Body:
 * {
 *   agentId: string (required)
 *   question: string (required)
 *   type: 'TEXT' | 'CHOICE' | 'MULTISELECT' | 'CONFIRM' | 'CODE'
 *   options?: string[] (required for CHOICE/MULTISELECT)
 *   required?: boolean (default: true)
 *   context?: string
 *   codeLanguage?: string (for CODE type)
 *   defaultValue?: string
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

    if (!body.question || typeof body.question !== 'string') {
      throw error(400, 'question is required and must be a string');
    }

    // Validate question type
    const validTypes: QuestionType[] = ['TEXT', 'CHOICE', 'MULTISELECT', 'CONFIRM', 'CODE'];
    const type: QuestionType = body.type || 'TEXT';

    if (!validTypes.includes(type)) {
      throw error(400, `Invalid question type. Must be one of: ${validTypes.join(', ')}`);
    }

    // Validate options for CHOICE/MULTISELECT
    if (['CHOICE', 'MULTISELECT'].includes(type)) {
      if (!Array.isArray(body.options) || body.options.length === 0) {
        throw error(400, `options array is required for ${type} questions`);
      }
    }

    // Check ticket exists
    const ticket = await prisma.ticket.findUnique({
      where: { id }
    });

    if (!ticket) {
      throw error(404, 'Ticket not found');
    }

    // Create the question
    const question = await prisma.ticketQuestion.create({
      data: {
        ticketId: id,
        agentId: body.agentId,
        question: body.question,
        type,
        options: body.options || [],
        required: body.required ?? true,
        context: body.context || null,
        codeLanguage: body.codeLanguage || null,
        defaultValue: body.defaultValue || null,
        answered: false
      }
    });

    return json(question, { status: 201 });
  } catch (err) {
    if (err && typeof err === 'object' && 'status' in err) {
      throw err;
    }
    console.error('Error creating question:', err);
    throw error(500, 'Failed to create question');
  }
};

/**
 * DELETE /api/tickets/:id/questions
 *
 * Delete all questions for a ticket (admin operation).
 * Useful for cleanup after ticket completion.
 */
export const DELETE: RequestHandler = async ({ params, url }) => {
  const { id } = params;
  const agentId = url.searchParams.get('agentId');

  try {
    // Check ticket exists
    const ticket = await prisma.ticket.findUnique({
      where: { id }
    });

    if (!ticket) {
      throw error(404, 'Ticket not found');
    }

    // Build where clause
    const where: { ticketId: string; agentId?: string } = { ticketId: id };
    if (agentId) {
      where.agentId = agentId;
    }

    // Delete questions
    const result = await prisma.ticketQuestion.deleteMany({
      where
    });

    return json({
      deleted: result.count,
      message: `Deleted ${result.count} question(s)`
    });
  } catch (err) {
    if (err && typeof err === 'object' && 'status' in err) {
      throw err;
    }
    console.error('Error deleting questions:', err);
    throw error(500, 'Failed to delete questions');
  }
};
