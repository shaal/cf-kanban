/**
 * Resource Management Module
 *
 * Provides resource limits, usage tracking, and rate limiting
 * for multi-tenant production use.
 *
 * GAP-3.1.2: Added resource allocation service for enforcing limits
 */

export * from './limits';
export * from './usage';
export * from './rate-limit';
export * from './allocation';
