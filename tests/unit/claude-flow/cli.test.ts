/**
 * TASK-041: Claude Flow CLI Service Tests
 *
 * Unit tests for the Claude Flow CLI wrapper.
 * Note: Process spawning is tested via integration tests.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CLIError } from '$lib/server/claude-flow/cli';

describe('CLIError', () => {
	it('should have correct name', () => {
		const error = new CLIError('Test error', 1, 'stderr output');
		expect(error.name).toBe('CLIError');
	});

	it('should have correct message', () => {
		const error = new CLIError('Test error message', 1, '');
		expect(error.message).toBe('Test error message');
	});

	it('should have correct exitCode', () => {
		const error = new CLIError('Error', 127, '');
		expect(error.exitCode).toBe(127);
	});

	it('should have correct stderr', () => {
		const error = new CLIError('Error', 1, 'stderr content');
		expect(error.stderr).toBe('stderr content');
	});

	it('should default timedOut to false', () => {
		const error = new CLIError('Error', 1, '');
		expect(error.timedOut).toBe(false);
	});

	it('should set timedOut when provided', () => {
		const error = new CLIError('Error', -1, '', true);
		expect(error.timedOut).toBe(true);
	});

	it('should be an instance of Error', () => {
		const error = new CLIError('Test', 1, '');
		expect(error instanceof Error).toBe(true);
	});

	it('should have all properties accessible', () => {
		const error = new CLIError('Message', 42, 'stderr', true);

		expect(error).toEqual(expect.objectContaining({
			name: 'CLIError',
			message: 'Message',
			exitCode: 42,
			stderr: 'stderr',
			timedOut: true
		}));
	});
});

// Integration-style tests for ClaudeFlowCLI would go in tests/integration/claude-flow/
// Those would actually spawn processes and test real CLI behavior
