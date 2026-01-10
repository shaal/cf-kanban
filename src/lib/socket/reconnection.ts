/**
 * Socket.IO Reconnection with Exponential Backoff
 *
 * TASK-033: Implement reconnection with exponential backoff
 *
 * This module provides:
 * - Exponential backoff for reconnection attempts
 * - Connection status store for UI
 * - Automatic project room rejoin on reconnect
 * - Configurable retry options
 */

import { writable, get } from 'svelte/store';
import { getSocket } from './index';

/**
 * Connection status types
 */
export type ConnectionStatusType = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error';

/**
 * Reconnection state for UI
 */
export interface ReconnectionState {
  attempts: number;
  isReconnecting: boolean;
  nextRetryIn: number; // milliseconds until next retry
  lastError?: string;
}

/**
 * Reconnection configuration options
 */
export interface ReconnectionOptions {
  /** Maximum number of reconnection attempts (default: Infinity) */
  maxAttempts?: number;
  /** Base delay in milliseconds (default: 1000) */
  baseDelay?: number;
  /** Maximum delay in milliseconds (default: 30000) */
  maxDelay?: number;
  /** Jitter factor (0-1) to randomize delays (default: 0.1) */
  jitterFactor?: number;
  /** Callback when reconnection succeeds */
  onReconnect?: () => void;
  /** Callback when disconnection happens */
  onDisconnect?: (reason: string) => void;
  /** Callback for each reconnection attempt */
  onAttempt?: (attempt: number) => void;
  /** Current project ID to rejoin on reconnect */
  currentProjectId?: string;
}

/**
 * Connection status store
 */
export const connectionStatus = writable<ConnectionStatusType>('disconnected');

/**
 * Reconnection state store
 */
export const reconnectionState = writable<ReconnectionState>({
  attempts: 0,
  isReconnecting: false,
  nextRetryIn: 0,
});

// Module-level configuration
let options: Required<ReconnectionOptions> = {
  maxAttempts: Infinity,
  baseDelay: 1000,
  maxDelay: 30000,
  jitterFactor: 0.1,
  onReconnect: () => {},
  onDisconnect: () => {},
  onAttempt: () => {},
  currentProjectId: '',
};

// Module-level state
let reconnectionTimer: ReturnType<typeof setTimeout> | null = null;
let countdownTimer: ReturnType<typeof setInterval> | null = null;
let isInitialized = false;

/**
 * Calculate reconnection delay with exponential backoff and jitter
 *
 * @param attempt - Current attempt number (0-indexed)
 * @returns Delay in milliseconds
 */
export function getReconnectionDelay(attempt: number): number {
  // Calculate base exponential delay: baseDelay * 2^attempt
  const exponentialDelay = options.baseDelay * Math.pow(2, attempt);

  // Cap at maximum delay
  const cappedDelay = Math.min(exponentialDelay, options.maxDelay);

  // Add jitter: delay * (1 +/- jitterFactor * random)
  const jitter = (Math.random() * 2 - 1) * options.jitterFactor;
  const delayWithJitter = cappedDelay * (1 + jitter);

  return Math.round(delayWithJitter);
}

/**
 * Initialize reconnection with options
 *
 * @param userOptions - Configuration options
 */
export function initReconnection(userOptions: ReconnectionOptions = {}): void {
  options = {
    maxAttempts: userOptions.maxAttempts ?? Infinity,
    baseDelay: userOptions.baseDelay ?? 1000,
    maxDelay: userOptions.maxDelay ?? 30000,
    jitterFactor: userOptions.jitterFactor ?? 0.1,
    onReconnect: userOptions.onReconnect ?? (() => {}),
    onDisconnect: userOptions.onDisconnect ?? (() => {}),
    onAttempt: userOptions.onAttempt ?? (() => {}),
    currentProjectId: userOptions.currentProjectId ?? '',
  };
  isInitialized = true;
}

/**
 * Handle successful connection
 */
export function handleConnect(): void {
  connectionStatus.set('connected');

  // Reset reconnection state
  reconnectionState.set({
    attempts: 0,
    isReconnecting: false,
    nextRetryIn: 0,
  });

  // Stop any pending reconnection
  stopReconnection();

  // Call reconnect callback
  if (isInitialized) {
    options.onReconnect();
  }
}

/**
 * Handle disconnection
 *
 * @param reason - Disconnect reason from Socket.IO
 */
export function handleDisconnect(reason: string): void {
  connectionStatus.set('disconnected');

  // Call disconnect callback
  if (isInitialized) {
    options.onDisconnect(reason);
  }

  // Only auto-reconnect if not a server-initiated disconnect
  if (reason !== 'io server disconnect' && reason !== 'io client disconnect') {
    startReconnection();
  }
}

/**
 * Start reconnection process
 */
export function startReconnection(): void {
  const currentState = get(reconnectionState);

  // Check if we've exceeded max attempts
  if (currentState.attempts >= options.maxAttempts) {
    connectionStatus.set('error');
    reconnectionState.update((state) => ({
      ...state,
      isReconnecting: false,
      lastError: 'Maximum reconnection attempts exceeded',
    }));
    return;
  }

  connectionStatus.set('reconnecting');
  reconnectionState.update((state) => ({
    ...state,
    isReconnecting: true,
  }));

  const delay = getReconnectionDelay(currentState.attempts);

  // Update countdown timer
  reconnectionState.update((state) => ({
    ...state,
    nextRetryIn: delay,
  }));

  // Start countdown interval
  startCountdown(delay);

  // Schedule reconnection attempt
  reconnectionTimer = setTimeout(() => {
    attemptReconnection();
  }, delay);
}

/**
 * Attempt to reconnect
 */
function attemptReconnection(): void {
  reconnectionState.update((state) => ({
    ...state,
    attempts: state.attempts + 1,
    nextRetryIn: 0,
  }));

  // Call attempt callback
  const currentState = get(reconnectionState);
  options.onAttempt(currentState.attempts);

  // Try to connect
  const socket = getSocket();
  if (socket && !socket.connected) {
    socket.connect();
  }

  // If still not connected, schedule another attempt
  setTimeout(() => {
    const state = get(reconnectionState);
    if (state.isReconnecting && !get(connectionStatus).includes('connected')) {
      startReconnection();
    }
  }, 100);
}

/**
 * Start countdown timer for UI
 */
function startCountdown(totalMs: number): void {
  // Clear any existing countdown
  if (countdownTimer) {
    clearInterval(countdownTimer);
  }

  const startTime = Date.now();
  countdownTimer = setInterval(() => {
    const elapsed = Date.now() - startTime;
    const remaining = Math.max(0, totalMs - elapsed);

    reconnectionState.update((state) => ({
      ...state,
      nextRetryIn: remaining,
    }));

    if (remaining <= 0) {
      clearInterval(countdownTimer!);
      countdownTimer = null;
    }
  }, 100);
}

/**
 * Stop reconnection attempts
 */
export function stopReconnection(): void {
  if (reconnectionTimer) {
    clearTimeout(reconnectionTimer);
    reconnectionTimer = null;
  }

  if (countdownTimer) {
    clearInterval(countdownTimer);
    countdownTimer = null;
  }

  reconnectionState.update((state) => ({
    ...state,
    isReconnecting: false,
    nextRetryIn: 0,
  }));
}

/**
 * Reset reconnection state (for testing)
 */
export function resetReconnectionState(): void {
  stopReconnection();
  connectionStatus.set('disconnected');
  reconnectionState.set({
    attempts: 0,
    isReconnecting: false,
    nextRetryIn: 0,
  });
  isInitialized = false;
  options = {
    maxAttempts: Infinity,
    baseDelay: 1000,
    maxDelay: 30000,
    jitterFactor: 0.1,
    onReconnect: () => {},
    onDisconnect: () => {},
    onAttempt: () => {},
    currentProjectId: '',
  };
}

/**
 * Set current project ID for rejoin on reconnect
 *
 * @param projectId - The project ID to rejoin
 */
export function setCurrentProjectForReconnect(projectId: string): void {
  options.currentProjectId = projectId;
}

/**
 * Get current project ID
 */
export function getCurrentProjectForReconnect(): string {
  return options.currentProjectId;
}
