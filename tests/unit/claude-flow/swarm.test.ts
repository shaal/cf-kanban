/**
 * TASK-043: Swarm Command Wrappers Tests
 *
 * Unit tests for the SwarmService class.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Use vi.hoisted for mock functions and CLIError class
const { mockExecute, mockExecuteJson, MockCLIError } = vi.hoisted(() => {
	class CLIError extends Error {
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

	return {
		mockExecute: vi.fn(),
		mockExecuteJson: vi.fn(),
		MockCLIError: CLIError
	};
});

vi.mock('$lib/server/claude-flow/cli', () => ({
	claudeFlowCLI: {
		execute: mockExecute,
		executeJson: mockExecuteJson
	},
	CLIError: MockCLIError
}));

import { SwarmService, type SwarmConfig, type SwarmStatus } from '$lib/server/claude-flow/swarm';

describe('SwarmService', () => {
	let service: SwarmService;

	beforeEach(() => {
		service = new SwarmService();
		vi.clearAllMocks();
	});

	describe('init', () => {
		it('should initialize a swarm with required config', async () => {
			const mockSwarm: SwarmStatus = {
				id: 'swarm-123',
				topology: 'mesh',
				agents: [],
				createdAt: '2024-01-01T00:00:00Z',
				status: 'initializing'
			};
			mockExecuteJson.mockResolvedValue(mockSwarm);

			const config: SwarmConfig = { topology: 'mesh' };
			const result = await service.init(config);

			expect(result).toEqual(mockSwarm);
			expect(mockExecuteJson).toHaveBeenCalledWith(
				'swarm',
				['init', '--topology', 'mesh'],
				expect.any(Object)
			);
		});

		it('should include maxAgents in args', async () => {
			mockExecuteJson.mockResolvedValue({ id: 'swarm-1', status: 'initializing' });

			await service.init({ topology: 'hierarchical', maxAgents: 10 });

			expect(mockExecuteJson).toHaveBeenCalledWith(
				'swarm',
				expect.arrayContaining(['--max-agents', '10']),
				expect.any(Object)
			);
		});

		it('should include project in args', async () => {
			mockExecuteJson.mockResolvedValue({ id: 'swarm-1', status: 'initializing' });

			await service.init({ topology: 'mesh', project: 'project-123' });

			expect(mockExecuteJson).toHaveBeenCalledWith(
				'swarm',
				expect.arrayContaining(['--project', 'project-123']),
				expect.any(Object)
			);
		});

		it('should include v3Mode flag', async () => {
			mockExecuteJson.mockResolvedValue({ id: 'swarm-1', status: 'initializing' });

			await service.init({ topology: 'hierarchical-mesh', v3Mode: true });

			expect(mockExecuteJson).toHaveBeenCalledWith(
				'swarm',
				expect.arrayContaining(['--v3-mode']),
				expect.any(Object)
			);
		});

		it('should include hiveMind flag', async () => {
			mockExecuteJson.mockResolvedValue({ id: 'swarm-1', status: 'initializing' });

			await service.init({ topology: 'mesh', hiveMind: true });

			expect(mockExecuteJson).toHaveBeenCalledWith(
				'swarm',
				expect.arrayContaining(['--hive-mind']),
				expect.any(Object)
			);
		});

		it('should set active swarm ID after init', async () => {
			mockExecuteJson.mockResolvedValue({ id: 'swarm-123', status: 'initializing' });

			await service.init({ topology: 'mesh' });

			expect(service.getActiveSwarmId()).toBe('swarm-123');
		});
	});

	describe('getStatus', () => {
		it('should get swarm status with ID', async () => {
			const mockSwarm: SwarmStatus = {
				id: 'swarm-123',
				topology: 'mesh',
				agents: [{ id: 'agent-1', type: 'coder', name: 'coder-1', status: 'working' }],
				createdAt: '',
				status: 'active'
			};
			mockExecuteJson.mockResolvedValue(mockSwarm);

			const result = await service.getStatus('swarm-123');

			expect(result).toEqual(mockSwarm);
			expect(mockExecuteJson).toHaveBeenCalledWith(
				'swarm',
				['status', 'swarm-123'],
				expect.any(Object)
			);
		});

		it('should use active swarm ID if none provided', async () => {
			mockExecuteJson.mockResolvedValue({ id: 'swarm-active', status: 'active' });
			service.setActiveSwarmId('swarm-active');

			await service.getStatus();

			expect(mockExecuteJson).toHaveBeenCalledWith(
				'swarm',
				['status', 'swarm-active'],
				expect.any(Object)
			);
		});

		it('should throw on error', async () => {
			const error = new MockCLIError('Not found', 1, 'Swarm not found');
			mockExecuteJson.mockRejectedValue(error);

			await expect(service.getStatus('nonexistent')).rejects.toThrow();
		});
	});

	describe('terminate', () => {
		it('should terminate swarm with graceful by default', async () => {
			mockExecute.mockResolvedValue({ exitCode: 0 });

			const result = await service.terminate('swarm-123');

			expect(result).toBe(true);
			expect(mockExecute).toHaveBeenCalledWith(
				'swarm',
				['terminate', 'swarm-123', '--graceful'],
				expect.any(Object)
			);
		});

		it('should use active swarm ID if none provided', async () => {
			mockExecute.mockResolvedValue({ exitCode: 0 });
			service.setActiveSwarmId('swarm-active');

			await service.terminate();

			expect(mockExecute).toHaveBeenCalledWith(
				'swarm',
				['terminate', 'swarm-active', '--graceful'],
				expect.any(Object)
			);
		});

		it('should support force termination', async () => {
			mockExecute.mockResolvedValue({ exitCode: 0 });

			await service.terminate('swarm-123', { force: true });

			expect(mockExecute).toHaveBeenCalledWith(
				'swarm',
				expect.arrayContaining(['--force']),
				expect.any(Object)
			);
		});

		it('should clear active swarm ID after termination', async () => {
			mockExecute.mockResolvedValue({ exitCode: 0 });
			service.setActiveSwarmId('swarm-123');

			await service.terminate('swarm-123');

			expect(service.getActiveSwarmId()).toBeNull();
		});

		it('should return false on failure', async () => {
			mockExecute.mockResolvedValue({ exitCode: 1 });

			const result = await service.terminate('swarm-123');

			expect(result).toBe(false);
		});
	});

	describe('addAgent', () => {
		it('should add agent to swarm', async () => {
			mockExecute.mockResolvedValue({ exitCode: 0 });

			const result = await service.addAgent('agent-123');

			expect(result).toBe(true);
			expect(mockExecute).toHaveBeenCalledWith(
				'swarm',
				['add-agent', 'agent-123'],
				expect.any(Object)
			);
		});

		it('should include role option', async () => {
			mockExecute.mockResolvedValue({ exitCode: 0 });

			await service.addAgent('agent-123', { role: 'coordinator' });

			expect(mockExecute).toHaveBeenCalledWith(
				'swarm',
				expect.arrayContaining(['--role', 'coordinator']),
				expect.any(Object)
			);
		});

		it('should include connectTo option', async () => {
			mockExecute.mockResolvedValue({ exitCode: 0 });

			await service.addAgent('agent-123', { connectTo: ['agent-1', 'agent-2'] });

			expect(mockExecute).toHaveBeenCalledWith(
				'swarm',
				expect.arrayContaining(['--connect-to', 'agent-1,agent-2']),
				expect.any(Object)
			);
		});

		it('should return false on failure', async () => {
			mockExecute.mockRejectedValue(new Error('Failed'));

			const result = await service.addAgent('agent-123');

			expect(result).toBe(false);
		});
	});

	describe('removeAgent', () => {
		it('should remove agent from swarm', async () => {
			mockExecute.mockResolvedValue({ exitCode: 0 });

			const result = await service.removeAgent('agent-123');

			expect(result).toBe(true);
			expect(mockExecute).toHaveBeenCalledWith(
				'swarm',
				['remove-agent', 'agent-123'],
				expect.any(Object)
			);
		});

		it('should return false on failure', async () => {
			mockExecute.mockResolvedValue({ exitCode: 1 });

			const result = await service.removeAgent('agent-123');

			expect(result).toBe(false);
		});
	});

	describe('pause', () => {
		it('should pause swarm', async () => {
			mockExecute.mockResolvedValue({ exitCode: 0 });

			const result = await service.pause('swarm-123');

			expect(result).toBe(true);
			expect(mockExecute).toHaveBeenCalledWith(
				'swarm',
				['pause', 'swarm-123'],
				expect.any(Object)
			);
		});

		it('should return false on failure', async () => {
			mockExecute.mockRejectedValue(new Error('Failed'));

			const result = await service.pause('swarm-123');

			expect(result).toBe(false);
		});
	});

	describe('resume', () => {
		it('should resume swarm', async () => {
			mockExecute.mockResolvedValue({ exitCode: 0 });

			const result = await service.resume('swarm-123');

			expect(result).toBe(true);
			expect(mockExecute).toHaveBeenCalledWith(
				'swarm',
				['resume', 'swarm-123'],
				expect.any(Object)
			);
		});

		it('should return false on failure', async () => {
			mockExecute.mockRejectedValue(new Error('Failed'));

			const result = await service.resume('swarm-123');

			expect(result).toBe(false);
		});
	});

	describe('checkHealth', () => {
		it('should check swarm health', async () => {
			const mockHealth = {
				healthy: true,
				score: 0.9,
				healthyAgents: 5,
				totalAgents: 5,
				issues: [],
				checkedAt: '2024-01-01T00:00:00Z'
			};
			mockExecuteJson.mockResolvedValue(mockHealth);

			const result = await service.checkHealth('swarm-123');

			expect(result).toEqual(mockHealth);
		});

		it('should return unhealthy on error', async () => {
			mockExecuteJson.mockRejectedValue(new Error('Failed'));

			const result = await service.checkHealth('swarm-123');

			expect(result.healthy).toBe(false);
			expect(result.score).toBe(0);
			expect(result.issues).toContain('Unable to check swarm health');
		});
	});

	describe('broadcast', () => {
		it('should broadcast message to swarm', async () => {
			mockExecute.mockResolvedValue({ exitCode: 0 });

			const result = await service.broadcast({ content: 'Hello agents' }, 'swarm-123');

			expect(result).toBe(true);
			expect(mockExecute).toHaveBeenCalledWith(
				'swarm',
				expect.arrayContaining(['broadcast', 'swarm-123', '--message', 'Hello agents']),
				expect.any(Object)
			);
		});

		it('should include priority', async () => {
			mockExecute.mockResolvedValue({ exitCode: 0 });

			await service.broadcast({ content: 'Urgent', priority: 'critical' }, 'swarm-123');

			expect(mockExecute).toHaveBeenCalledWith(
				'swarm',
				expect.arrayContaining(['--priority', 'critical']),
				expect.any(Object)
			);
		});

		it('should include target type filter', async () => {
			mockExecute.mockResolvedValue({ exitCode: 0 });

			await service.broadcast({ content: 'Test', targetType: 'coder' }, 'swarm-123');

			expect(mockExecute).toHaveBeenCalledWith(
				'swarm',
				expect.arrayContaining(['--target-type', 'coder']),
				expect.any(Object)
			);
		});

		it('should return false on failure', async () => {
			mockExecute.mockRejectedValue(new Error('Failed'));

			const result = await service.broadcast({ content: 'Test' }, 'swarm-123');

			expect(result).toBe(false);
		});
	});

	describe('isActive', () => {
		it('should return true for active swarm', async () => {
			mockExecuteJson.mockResolvedValue({ status: 'active' });

			const result = await service.isActive('swarm-123');

			expect(result).toBe(true);
		});

		it('should return false for inactive swarm', async () => {
			mockExecuteJson.mockResolvedValue({ status: 'paused' });

			const result = await service.isActive('swarm-123');

			expect(result).toBe(false);
		});

		it('should return false on error', async () => {
			mockExecuteJson.mockRejectedValue(new Error('Failed'));

			const result = await service.isActive('swarm-123');

			expect(result).toBe(false);
		});
	});

	describe('listAgents', () => {
		it('should return agents from swarm status', async () => {
			const mockAgents = [
				{ id: 'agent-1', type: 'coder', name: 'coder-1', status: 'working' },
				{ id: 'agent-2', type: 'tester', name: 'tester-1', status: 'idle' }
			];
			mockExecuteJson.mockResolvedValue({ agents: mockAgents });

			const result = await service.listAgents('swarm-123');

			expect(result).toEqual(mockAgents);
		});

		it('should return empty array on error', async () => {
			mockExecuteJson.mockRejectedValue(new Error('Failed'));

			const result = await service.listAgents('swarm-123');

			expect(result).toEqual([]);
		});
	});

	describe('waitForStatus', () => {
		it('should return immediately if status matches', async () => {
			const mockSwarm: SwarmStatus = {
				id: 'swarm-123',
				topology: 'mesh',
				agents: [],
				createdAt: '',
				status: 'active'
			};
			mockExecuteJson.mockResolvedValue(mockSwarm);

			const result = await service.waitForStatus('active', 'swarm-123', 1000, 100);

			expect(result.status).toBe('active');
		});

		it('should accept array of statuses', async () => {
			mockExecuteJson.mockResolvedValue({ status: 'paused' });

			const result = await service.waitForStatus(['active', 'paused'], 'swarm-123', 1000, 100);

			expect(result.status).toBe('paused');
		});

		it('should throw on error status if not expected', async () => {
			mockExecuteJson.mockResolvedValue({ id: 'swarm-123', status: 'error' });

			await expect(
				service.waitForStatus('active', 'swarm-123', 1000, 100)
			).rejects.toThrow('entered error state');
		});

		it('should throw on timeout', async () => {
			mockExecuteJson.mockResolvedValue({ status: 'initializing' });

			await expect(
				service.waitForStatus('active', 'swarm-123', 200, 50)
			).rejects.toThrow('Timeout waiting');
		});
	});

	describe('active swarm management', () => {
		it('should get active swarm ID', () => {
			expect(service.getActiveSwarmId()).toBeNull();

			service.setActiveSwarmId('swarm-123');

			expect(service.getActiveSwarmId()).toBe('swarm-123');
		});

		it('should set active swarm ID to null', () => {
			service.setActiveSwarmId('swarm-123');
			service.setActiveSwarmId(null);

			expect(service.getActiveSwarmId()).toBeNull();
		});
	});
});
