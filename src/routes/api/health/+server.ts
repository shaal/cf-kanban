/**
 * TASK-113: Health Check API Endpoint
 *
 * Full health check endpoint that verifies all components.
 * Used by monitoring systems and load balancers.
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { generateHealthResponse } from '$lib/server/monitoring/health';

export const GET: RequestHandler = async () => {
  const { statusCode, body } = await generateHealthResponse();

  return json(body, { status: statusCode });
};
