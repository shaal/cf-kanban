/**
 * TASK-113: Prometheus Metrics Endpoint
 *
 * Exposes application metrics in Prometheus format.
 * Scraped by Prometheus for monitoring and alerting.
 */

import type { RequestHandler } from './$types';
import { getMetricsOutput } from '$lib/server/monitoring/metrics';

export const GET: RequestHandler = async () => {
  const metrics = getMetricsOutput();

  return new Response(metrics, {
    headers: {
      'Content-Type': 'text/plain; version=0.0.4; charset=utf-8'
    }
  });
};
