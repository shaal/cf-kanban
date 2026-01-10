/**
 * GAP-3.5.2: Health Status Store
 *
 * Manages system health state for real-time monitoring:
 * - Periodic health checks against /api/health
 * - Health status tracking (healthy, degraded, unhealthy)
 * - Alert management for health issues
 */

import { writable, derived, get } from 'svelte/store';

/** Health status levels */
export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy' | 'unknown';

/** Individual component health */
export interface ComponentHealth {
  name: string;
  status: 'healthy' | 'unhealthy';
  latencyMs?: number;
  message?: string;
  details?: Record<string, unknown>;
}

/** Full health check result */
export interface HealthCheckResult {
  status: HealthStatus;
  checks: ComponentHealth[];
  timestamp: string;
  version?: string;
  uptime: number;
}

/** Health alert for toasts */
export interface HealthAlert {
  id: string;
  type: 'warning' | 'error' | 'info';
  title: string;
  message: string;
  component?: string;
  timestamp: Date;
  dismissed: boolean;
}

/** Store state */
interface HealthState {
  status: HealthStatus;
  lastCheck: HealthCheckResult | null;
  lastCheckTime: Date | null;
  isChecking: boolean;
  error: string | null;
  alerts: HealthAlert[];
}

const initialState: HealthState = {
  status: 'unknown',
  lastCheck: null,
  lastCheckTime: null,
  isChecking: false,
  error: null,
  alerts: []
};

/** Main health store */
export const healthStore = writable<HealthState>(initialState);

/** Derived store for current status */
export const healthStatus = derived(healthStore, ($store) => $store.status);

/** Derived store for active alerts (not dismissed) */
export const activeAlerts = derived(healthStore, ($store) =>
  $store.alerts.filter((a) => !a.dismissed)
);

/** Derived store for checking state */
export const isHealthChecking = derived(healthStore, ($store) => $store.isChecking);

/** Polling interval ID */
let pollingInterval: ReturnType<typeof setInterval> | null = null;

/** Default polling interval (30 seconds) */
const DEFAULT_POLL_INTERVAL = 30000;

/**
 * Generate a unique alert ID
 */
function generateAlertId(): string {
  return `alert-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Create health alerts from check result
 */
function createAlertsFromCheck(result: HealthCheckResult, previousStatus: HealthStatus): HealthAlert[] {
  const alerts: HealthAlert[] = [];

  // Check for overall status changes
  if (result.status !== previousStatus && previousStatus !== 'unknown') {
    if (result.status === 'degraded') {
      alerts.push({
        id: generateAlertId(),
        type: 'warning',
        title: 'System Degraded',
        message: 'Some system components are experiencing issues.',
        timestamp: new Date(),
        dismissed: false
      });
    } else if (result.status === 'unhealthy') {
      alerts.push({
        id: generateAlertId(),
        type: 'error',
        title: 'System Unhealthy',
        message: 'Critical system components are unavailable.',
        timestamp: new Date(),
        dismissed: false
      });
    } else if (result.status === 'healthy' && previousStatus !== 'healthy') {
      alerts.push({
        id: generateAlertId(),
        type: 'info',
        title: 'System Recovered',
        message: 'All system components are now operational.',
        timestamp: new Date(),
        dismissed: false
      });
    }
  }

  // Check for individual component issues
  result.checks.forEach((check) => {
    if (check.status === 'unhealthy') {
      alerts.push({
        id: generateAlertId(),
        type: 'error',
        title: `${capitalizeFirst(check.name)} Error`,
        message: check.message || `${capitalizeFirst(check.name)} is unavailable.`,
        component: check.name,
        timestamp: new Date(),
        dismissed: false
      });
    }
  });

  return alerts;
}

/**
 * Capitalize first letter
 */
function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Perform a health check
 */
export async function checkHealth(): Promise<HealthCheckResult | null> {
  const currentState = get(healthStore);

  healthStore.update((state) => ({ ...state, isChecking: true, error: null }));

  try {
    const response = await fetch('/api/health');

    if (!response.ok) {
      throw new Error(`Health check failed: ${response.status}`);
    }

    const result: HealthCheckResult = await response.json();
    const previousStatus = currentState.status;

    // Create alerts for status changes
    const newAlerts = createAlertsFromCheck(result, previousStatus);

    healthStore.update((state) => ({
      ...state,
      status: result.status as HealthStatus,
      lastCheck: result,
      lastCheckTime: new Date(),
      isChecking: false,
      error: null,
      alerts: [...state.alerts, ...newAlerts].slice(-50) // Keep last 50 alerts
    }));

    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    const failedAlert: HealthAlert = {
      id: generateAlertId(),
      type: 'error',
      title: 'Health Check Failed',
      message: errorMessage,
      timestamp: new Date(),
      dismissed: false
    };

    healthStore.update((state) => ({
      ...state,
      status: 'unknown',
      isChecking: false,
      error: errorMessage,
      alerts: [...state.alerts, failedAlert].slice(-50)
    }));

    return null;
  }
}

/**
 * Start polling for health status
 */
export function startHealthPolling(interval: number = DEFAULT_POLL_INTERVAL): void {
  // Stop any existing polling
  stopHealthPolling();

  // Perform initial check
  checkHealth();

  // Start polling
  pollingInterval = setInterval(checkHealth, interval);
}

/**
 * Stop health polling
 */
export function stopHealthPolling(): void {
  if (pollingInterval) {
    clearInterval(pollingInterval);
    pollingInterval = null;
  }
}

/**
 * Dismiss an alert
 */
export function dismissAlert(alertId: string): void {
  healthStore.update((state) => ({
    ...state,
    alerts: state.alerts.map((a) =>
      a.id === alertId ? { ...a, dismissed: true } : a
    )
  }));
}

/**
 * Dismiss all alerts
 */
export function dismissAllAlerts(): void {
  healthStore.update((state) => ({
    ...state,
    alerts: state.alerts.map((a) => ({ ...a, dismissed: true }))
  }));
}

/**
 * Clear all alerts
 */
export function clearAlerts(): void {
  healthStore.update((state) => ({
    ...state,
    alerts: []
  }));
}

/**
 * Reset health store to initial state
 */
export function resetHealthStore(): void {
  stopHealthPolling();
  healthStore.set(initialState);
}

/**
 * Get status color for UI
 */
export function getStatusColor(status: HealthStatus): string {
  switch (status) {
    case 'healthy':
      return 'green';
    case 'degraded':
      return 'yellow';
    case 'unhealthy':
      return 'red';
    default:
      return 'gray';
  }
}

/**
 * Get status label for UI
 */
export function getStatusLabel(status: HealthStatus): string {
  switch (status) {
    case 'healthy':
      return 'All Systems Operational';
    case 'degraded':
      return 'Partial Outage';
    case 'unhealthy':
      return 'Major Outage';
    default:
      return 'Unknown';
  }
}
