/**
 * Individual Question API Endpoints
 *
 * TASK-055: Create Question Persistence Model
 *
 * Endpoints:
 * - GET /api/tickets/:id/questions/:questionId - Get a specific question
 * - PATCH /api/tickets/:id/questions/:questionId - Update a question
 * - DELETE /api/tickets/:id/questions/:questionId - Delete a question
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/prisma';

/**
 * GET /api/tickets/:id/questions/:questionId
 *
 * Get a specific question by ID.
 */
export const GET: RequestHandler = async ({ params }) => {
  const { id, questionId } = params;

  try {
    const question = await prisma.ticketQuestion.findUnique({
      where: { id: questionId },
      include: {
        ticket: {
          select: {
            id: true,
            title: true,
            status: true,
            projectId: true
          }
        }
      }
    });

    if (!question) {
      throw error(404, 'Question not found');
    }

    if (question.ticketId !== id) {
      throw error(400, 'Question does not belong to this ticket');
    }

    return json(question);
  } catch (err) {
    if (err && typeof err === 'object' && 'status' in err) {
      throw err;
    }
    console.error('Error fetching question:', err);
    throw error(500, 'Failed to fetch question');
  }
};

/**
 * PATCH /api/tickets/:id/questions/:questionId
 *
 * Update a question (e.g., modify options, context).
 * Cannot change the question text or type after creation.
 *
 * Body:
 * {
 *   options?: string[]
 *   required?: boolean
 *   context?: string
 *   defaultValue?: string
 * }
 */
export const PATCH: RequestHandler = async ({ params, request }) => {
  const { id, questionId } = params;

  try {
    const body = await request.json();

    // Find the question
    const question = await prisma.ticketQuestion.findUnique({
      where: { id: questionId }
    });

    if (!question) {
      throw error(404, 'Question not found');
    }

    if (question.ticketId !== id) {
      throw error(400, 'Question does not belong to this ticket');
    }

    // Cannot modify answered questions
    if (question.answered) {
      throw error(400, 'Cannot modify an answered question');
    }

    // Build update data (only allow certain fields)
    const updateData: {
      options?: string[];
      required?: boolean;
      context?: string | null;
      defaultValue?: string | null;
    } = {};

    if (Array.isArray(body.options)) {
      updateData.options = body.options;
    }

    if (typeof body.required === 'boolean') {
      updateData.required = body.required;
    }

    if (body.context !== undefined) {
      updateData.context = body.context || null;
    }

    if (body.defaultValue !== undefined) {
      updateData.defaultValue = body.defaultValue || null;
    }

    // Update the question
    const updated = await prisma.ticketQuestion.update({
      where: { id: questionId },
      data: updateData
    });

    return json(updated);
  } catch (err) {
    if (err && typeof err === 'object' && 'status' in err) {
      throw err;
    }
    console.error('Error updating question:', err);
    throw error(500, 'Failed to update question');
  }
};

/**
 * DELETE /api/tickets/:id/questions/:questionId
 *
 * Delete a specific question.
 * Cannot delete answered questions (to preserve history).
 */
export const DELETE: RequestHandler = async ({ params }) => {
  const { id, questionId } = params;

  try {
    // Find the question
    const question = await prisma.ticketQuestion.findUnique({
      where: { id: questionId }
    });

    if (!question) {
      throw error(404, 'Question not found');
    }

    if (question.ticketId !== id) {
      throw error(400, 'Question does not belong to this ticket');
    }

    // Prevent deleting answered questions
    if (question.answered) {
      throw error(400, 'Cannot delete an answered question. Use archive instead.');
    }

    // Delete the question
    await prisma.ticketQuestion.delete({
      where: { id: questionId }
    });

    return json({
      deleted: true,
      questionId
    });
  } catch (err) {
    if (err && typeof err === 'object' && 'status' in err) {
      throw err;
    }
    console.error('Error deleting question:', err);
    throw error(500, 'Failed to delete question');
  }
};
