/**
 * TASK-042: Agent Command Wrappers Tests
 *
 * Unit tests for the AgentService class.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AgentService, type Agent, type AgentConfig } from '$lib/server/claude-flow/agents';
import { CLIError } from '$lib/server/claude-flow/cli';

// Mock the CLI module
const mockExecute = vi.fn();
const mockExecuteJson = vi.fn();

vi.mock('$lib/server/claude-flow/cli', () => ({
	claudeFlowCLI: {
		execute: mockExecute,
		executeJson: mockExecuteJson
	},
	CLIError: class CLIError extends Error {
		constructor(
			message: string,
			public exitCode: number,
			public stderr: string,
			public timedOut = false
		) {
			super(message);
			this.name = 'CLIError';
		}
	}
}));

describe('AgentService', () => {
	let service: AgentService;

	beforeEach(() => {
		service = new AgentService();
		vi.clearAllMocks();
	});

	describe('spawn', () => {
		it('should spawn an agent with required config', async () => {
			const mockAgent: Agent = {
				id: 'agent-123',
				type: 'coder',
				name: 'test-coder',
				status: 'idle',
				createdAt: '2024-01-01T00:00:00Z'
			};
			mockExecuteJson.mockResolvedValue(mockAgent);

			const config: AgentConfig = {
				type: 'coder',
				name: 'test-coder'
			};

			const result = await service.spawn(config);

			expect(result).toEqual(mockAgent);
			expect(mockExecuteJson).toHaveBeenCalledWith(
				'agent',
				['spawn', '-t', 'coder', '--name', 'test-coder'],
				expect.any(Object)
			);
		});

		it('should include optional prompt in args', async () => {
			mockExecuteJson.mockResolvedValue({ id: 'agent-1', status: 'idle' });

			await service.spawn({
				type: 'coder',
				name: 'test',
				prompt: 'Work on the task'
			});

			expect(mockExecuteJson).toHaveBeenCalledWith(
				'agent',
				expect.arrayContaining(['--prompt', 'Work on the task']),
				expect.any(Object)
			);
		});

		it('should include optional model in args', async () => {
			mockExecuteJson.mockResolvedValue({ id: 'agent-1', status: 'idle' });

			await service.spawn({
				type: 'reviewer',
				name: 'test',
				model: 'claude-3-opus'
			});

			expect(mockExecuteJson).toHaveBeenCalledWith(
				'agent',
				expect.arrayContaining(['--model', 'claude-3-opus']),
				expect.any(Object)
			);
		});

		it('should use config cwd if provided', async () => {
			mockExecuteJson.mockResolvedValue({ id: 'agent-1', status: 'idle' });

			await service.spawn({
				type: 'coder',
				name: 'test',
				cwd: '/custom/path'
			});

			expect(mockExecuteJson).toHaveBeenCalledWith(
				'agent',
				expect.any(Array),
				expect.objectContaining({ cwd: '/custom/path' })
			);
		});

		it('should set default status if not returned', async () => {
			mockExecuteJson.mockResolvedValue({ id: 'agent-1' });

			const result = await service.spawn({ type: 'coder', name: 'test' });

			expect(result.status).toBe('initializing');
		});
	});

	describe('list', () => {
		it('should list all agents', async () => {
			const mockAgents: Agent[] = [
				{ id: 'agent-1', type: 'coder', name: 'coder-1', status: 'idle', createdAt: '' },
				{ id: 'agent-2', type: 'tester', name: 'tester-1', status: 'working', createdAt: '' }
			];
			mockExecuteJson.mockResolvedValue(mockAgents);

			const result = await service.list();

			expect(result).toEqual(mockAgents);
			expect(mockExecuteJson).toHaveBeenCalledWith('agent', ['list'], expect.any(Object));
		});

		it('should filter by status', async () => {
			mockExecuteJson.mockResolvedValue([]);

			await service.list({ status: 'working' });

			expect(mockExecuteJson).toHaveBeenCalledWith(
				'agent',
				['list', '--status', 'working'],
				expect.any(Object)
			);
		});

		it('should filter by type', async () => {
			mockExecuteJson.mockResolvedValue([]);

			await service.list({ type: 'coder' });

			expect(mockExecuteJson).toHaveBeenCalledWith(
				'agent',
				['list', '--type', 'coder'],
				expect.any(Object)
			);
		});

		it('should include terminated if requested', async () => {
			mockExecuteJson.mockResolvedValue([]);

			await service.list({ includeTerminated: true });

			expect(mockExecuteJson).toHaveBeenCalledWith(
				'agent',
				['list', '--include-terminated'],
				expect.any(Object)
			);
		});

		it('should return empty array on error', async () => {
			mockExecuteJson.mockRejectedValue(new Error('CLI unavailable'));

			const result = await service.list();

			expect(result).toEqual([]);
		});
	});

	describe('getStatus', () => {
		it('should get agent status', async () => {
			const mockAgent: Agent = {
				id: 'agent-123',
				type: 'coder',
				name: 'test',
				status: 'working',
				createdAt: '',
				currentTask: 'task-456'
			};
			mockExecuteJson.mockResolvedValue(mockAgent);

			const result = await service.getStatus('agent-123');

			expect(result).toEqual(mockAgent);
			expect(mockExecuteJson).toHaveBeenCalledWith(
				'agent',
				['status', 'agent-123'],
				expect.any(Object)
			);
		});

		it('should throw CLIError on failure', async () => {
			const error = new CLIError('Not found', 1, 'Agent not found');
			mockExecuteJson.mockRejectedValue(error);

			await expect(service.getStatus('nonexistent')).rejects.toThrow(CLIError);
		});
	});

	describe('stop', () => {
		it('should stop agent with graceful shutdown by default', async () => {
			mockExecute.mockResolvedValue({ exitCode: 0 });

			const result = await service.stop('agent-123');

			expect(result).toBe(true);
			expect(mockExecute).toHaveBeenCalledWith(
				'agent',
				['stop', 'agent-123', '--graceful'],
				expect.any(Object)
			);
		});

		it('should support force stop', async () => {
			mockExecute.mockResolvedValue({ exitCode: 0 });

			await service.stop('agent-123', { force: true });

			expect(mockExecute).toHaveBeenCalledWith(
				'agent',
				expect.arrayContaining(['--force']),
				expect.any(Object)
			);
		});

		it('should support custom timeout', async () => {
			mockExecute.mockResolvedValue({ exitCode: 0 });

			await service.stop('agent-123', { timeout: 5000 });

			expect(mockExecute).toHaveBeenCalledWith(
				'agent',
				expect.arrayContaining(['--timeout', '5000']),
				expect.any(Object)
			);
		});

		it('should return false on failure', async () => {
			mockExecute.mockResolvedValue({ exitCode: 1 });

			const result = await service.stop('agent-123');

			expect(result).toBe(false);
		});
	});

	describe('getMetrics', () => {
		it('should get agent metrics', async () => {
			const mockMetrics = {
				tasksCompleted: 10,
				tasksFailed: 2,
				avgTaskDuration: 5000,
				memoryUsage: 1024
			};
			mockExecuteJson.mockResolvedValue(mockMetrics);

			const result = await service.getMetrics('agent-123');

			expect(result).toEqual(mockMetrics);
		});

		it('should return default metrics on error', async () => {
			mockExecuteJson.mockRejectedValue(new Error('Failed'));

			const result = await service.getMetrics('agent-123');

			expect(result).toEqual({
				tasksCompleted: 0,
				tasksFailed: 0,
				avgTaskDuration: 0
			});
		});
	});

	describe('checkHealth', () => {
		it('should check agent health', async () => {
			const mockHealth = {
				healthy: true,
				score: 0.95,
				issues: [],
				checkedAt: '2024-01-01T00:00:00Z'
			};
			mockExecuteJson.mockResolvedValue(mockHealth);

			const result = await service.checkHealth('agent-123');

			expect(result).toEqual(mockHealth);
		});

		it('should return unhealthy on error', async () => {
			mockExecuteJson.mockRejectedValue(new Error('Failed'));

			const result = await service.checkHealth('agent-123');

			expect(result.healthy).toBe(false);
			expect(result.score).toBe(0);
			expect(result.issues).toContain('Unable to check agent health');
		});
	});

	describe('sendMessage', () => {
		it('should send message to agent', async () => {
			mockExecute.mockResolvedValue({ exitCode: 0 });

			const result = await service.sendMessage('agent-123', 'Hello agent');

			expect(result).toBe(true);
			expect(mockExecute).toHaveBeenCalledWith(
				'agent',
				['message', 'agent-123', '--content', 'Hello agent'],
				expect.any(Object)
			);
		});

		it('should return false on failure', async () => {
			mockExecute.mockRejectedValue(new Error('Failed'));

			const result = await service.sendMessage('agent-123', 'Hello');

			expect(result).toBe(false);
		});
	});

	describe('isActive', () => {
		it('should return true for idle agent', async () => {
			mockExecuteJson.mockResolvedValue({ status: 'idle' });

			const result = await service.isActive('agent-123');

			expect(result).toBe(true);
		});

		it('should return true for working agent', async () => {
			mockExecuteJson.mockResolvedValue({ status: 'working' });

			const result = await service.isActive('agent-123');

			expect(result).toBe(true);
		});

		it('should return false for stopped agent', async () => {
			mockExecuteJson.mockResolvedValue({ status: 'stopped' });

			const result = await service.isActive('agent-123');

			expect(result).toBe(false);
		});

		it('should return false on error', async () => {
			mockExecuteJson.mockRejectedValue(new Error('Failed'));

			const result = await service.isActive('agent-123');

			expect(result).toBe(false);
		});
	});

	describe('waitForStatus', () => {
		it('should return immediately if status matches', async () => {
			const mockAgent: Agent = {
				id: 'agent-123',
				type: 'coder',
				name: 'test',
				status: 'idle',
				createdAt: ''
			};
			mockExecuteJson.mockResolvedValue(mockAgent);

			const result = await service.waitForStatus('agent-123', 'idle', 1000, 100);

			expect(result).toEqual(mockAgent);
		});

		it('should accept array of statuses', async () => {
			const mockAgent: Agent = {
				id: 'agent-123',
				type: 'coder',
				name: 'test',
				status: 'working',
				createdAt: ''
			};
			mockExecuteJson.mockResolvedValue(mockAgent);

			const result = await service.waitForStatus('agent-123', ['idle', 'working'], 1000, 100);

			expect(result.status).toBe('working');
		});

		it('should throw on error status if not expected', async () => {
			mockExecuteJson.mockResolvedValue({ status: 'error' });

			await expect(
				service.waitForStatus('agent-123', 'idle', 1000, 100)
			).rejects.toThrow('entered error state');
		});

		it('should throw on timeout', async () => {
			mockExecuteJson.mockResolvedValue({ status: 'initializing' });

			await expect(
				service.waitForStatus('agent-123', 'idle', 200, 50)
			).rejects.toThrow('Timeout waiting');
		});
	});
});
