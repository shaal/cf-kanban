import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
	type ProjectResourceLimits,
	type ProjectResourceUsage,
	DEFAULT_PROJECT_RESOURCE_LIMITS,
	MAX_RESOURCE_LIMITS,
	MIN_RESOURCE_LIMITS,
	validateResourceLimits,
	getResourceHealthStatus,
	calculateOverallStatus,
	formatMemory
} from '$lib/types/resources';

/**
 * GAP-3.1.2: Resource Allocation Tests
 *
 * Tests for resource limit validation and health status calculations.
 */

describe('GAP-3.1.2: Resource Allocation', () => {
	describe('validateResourceLimits', () => {
		it('should validate valid limits', () => {
			const result = validateResourceLimits({
				maxCpu: 4,
				maxMemory: 4096,
				maxAgents: 10
			});

			expect(result.valid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});

		it('should reject CPU below minimum', () => {
			const result = validateResourceLimits({
				maxCpu: 0
			});

			expect(result.valid).toBe(false);
			expect(result.errors).toContain(`CPU limit must be at least ${MIN_RESOURCE_LIMITS.maxCpu}`);
		});

		it('should reject CPU above maximum', () => {
			const result = validateResourceLimits({
				maxCpu: 100
			});

			expect(result.valid).toBe(false);
			expect(result.errors).toContain(`CPU limit cannot exceed ${MAX_RESOURCE_LIMITS.maxCpu}`);
		});

		it('should reject memory below minimum', () => {
			const result = validateResourceLimits({
				maxMemory: 256
			});

			expect(result.valid).toBe(false);
			expect(result.errors).toContain(`Memory limit must be at least ${MIN_RESOURCE_LIMITS.maxMemory}MB`);
		});

		it('should reject agents above maximum', () => {
			const result = validateResourceLimits({
				maxAgents: 500
			});

			expect(result.valid).toBe(false);
			expect(result.errors).toContain(`Agent limit cannot exceed ${MAX_RESOURCE_LIMITS.maxAgents}`);
		});

		it('should warn for high agent counts', () => {
			const result = validateResourceLimits({
				maxAgents: 75
			});

			expect(result.valid).toBe(true);
			expect(result.warnings).toContain('High agent counts may impact performance');
		});
	});

	describe('getResourceHealthStatus', () => {
		it('should return healthy for low usage', () => {
			expect(getResourceHealthStatus(50)).toBe('healthy');
			expect(getResourceHealthStatus(69)).toBe('healthy');
		});

		it('should return warning for moderate usage', () => {
			expect(getResourceHealthStatus(70)).toBe('warning');
			expect(getResourceHealthStatus(89)).toBe('warning');
		});

		it('should return critical for high usage', () => {
			expect(getResourceHealthStatus(90)).toBe('critical');
			expect(getResourceHealthStatus(100)).toBe('critical');
		});
	});

	describe('calculateOverallStatus', () => {
		it('should return critical if any resource is critical', () => {
			const status = calculateOverallStatus({
				cpu: 50,
				memory: 95, // Critical
				agents: 60,
				swarms: 30,
				apiCalls: 40
			});

			expect(status).toBe('critical');
		});

		it('should return warning if highest is warning level', () => {
			const status = calculateOverallStatus({
				cpu: 50,
				memory: 75, // Warning
				agents: 60,
				swarms: 30,
				apiCalls: 40
			});

			expect(status).toBe('warning');
		});

		it('should return healthy if all are healthy', () => {
			const status = calculateOverallStatus({
				cpu: 50,
				memory: 60,
				agents: 40,
				swarms: 30,
				apiCalls: 20
			});

			expect(status).toBe('healthy');
		});
	});

	describe('formatMemory', () => {
		it('should format MB values', () => {
			expect(formatMemory(512)).toBe('512MB');
			expect(formatMemory(900)).toBe('900MB');
		});

		it('should format GB values', () => {
			expect(formatMemory(1024)).toBe('1.0GB');
			expect(formatMemory(2048)).toBe('2.0GB');
			expect(formatMemory(4096)).toBe('4.0GB');
		});

		it('should format fractional GB values', () => {
			expect(formatMemory(1536)).toBe('1.5GB');
			expect(formatMemory(3072)).toBe('3.0GB');
		});
	});

	describe('DEFAULT_PROJECT_RESOURCE_LIMITS', () => {
		it('should have reasonable default values', () => {
			expect(DEFAULT_PROJECT_RESOURCE_LIMITS.maxCpu).toBeGreaterThan(0);
			expect(DEFAULT_PROJECT_RESOURCE_LIMITS.maxMemory).toBeGreaterThan(0);
			expect(DEFAULT_PROJECT_RESOURCE_LIMITS.maxAgents).toBeGreaterThan(0);
			expect(DEFAULT_PROJECT_RESOURCE_LIMITS.maxSwarms).toBeGreaterThan(0);
			expect(DEFAULT_PROJECT_RESOURCE_LIMITS.apiRateLimit).toBeGreaterThan(0);
		});

		it('should have defaults within min/max bounds', () => {
			expect(DEFAULT_PROJECT_RESOURCE_LIMITS.maxCpu).toBeGreaterThanOrEqual(MIN_RESOURCE_LIMITS.maxCpu);
			expect(DEFAULT_PROJECT_RESOURCE_LIMITS.maxCpu).toBeLessThanOrEqual(MAX_RESOURCE_LIMITS.maxCpu);

			expect(DEFAULT_PROJECT_RESOURCE_LIMITS.maxMemory).toBeGreaterThanOrEqual(MIN_RESOURCE_LIMITS.maxMemory);
			expect(DEFAULT_PROJECT_RESOURCE_LIMITS.maxMemory).toBeLessThanOrEqual(MAX_RESOURCE_LIMITS.maxMemory);

			expect(DEFAULT_PROJECT_RESOURCE_LIMITS.maxAgents).toBeGreaterThanOrEqual(MIN_RESOURCE_LIMITS.maxAgents);
			expect(DEFAULT_PROJECT_RESOURCE_LIMITS.maxAgents).toBeLessThanOrEqual(MAX_RESOURCE_LIMITS.maxAgents);
		});
	});
});
