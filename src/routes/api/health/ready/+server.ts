/**
 * TASK-113: Readiness Probe Endpoint
 *
 * Checks if the service is ready to accept traffic.
 * Used by Kubernetes readiness probes and load balancers.
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { checkReadiness } from '$lib/server/monitoring/health';

export const GET: RequestHandler = async () => {
  const result = await checkReadiness();

  if (result.status === 'ready') {
    return json(result);
  }

  return json(result, { status: 503 });
};
