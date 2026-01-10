/**
 * GAP-3.5.2: System Status Page Server
 *
 * Server load function for the status page.
 * Fetches comprehensive system health information.
 */
import type { PageServerLoad } from './$types';
import { checkHealth, getSystemMetrics, type HealthCheckResult } from '$lib/server/monitoring/health';

export interface PageData {
  health: HealthCheckResult | null;
  metrics: {
    uptime: number;
    memory: {
      used: number;
      total: number;
      percentage: number;
    };
    cpu?: {
      usage: number;
    };
  } | null;
  error?: string;
}

/**
 * Load system health status
 */
export const load: PageServerLoad = async (): Promise<PageData> => {
  try {
    const [health, metrics] = await Promise.all([
      checkHealth(),
      Promise.resolve(getSystemMetrics())
    ]);

    return {
      health,
      metrics
    };
  } catch (error) {
    console.error('Failed to load system health:', error);
    return {
      health: null,
      metrics: null,
      error: error instanceof Error ? error.message : 'Failed to load system health'
    };
  }
};
