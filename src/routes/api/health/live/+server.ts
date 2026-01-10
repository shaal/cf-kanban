/**
 * TASK-113: Liveness Probe Endpoint
 *
 * Simple endpoint that returns OK if the process is alive.
 * Used by Kubernetes liveness probes.
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { checkLiveness } from '$lib/server/monitoring/health';

export const GET: RequestHandler = async () => {
  return json(checkLiveness());
};
