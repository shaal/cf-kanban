/**
 * TASK-043: Swarm Command Wrappers
 *
 * Provides high-level interface to Claude Flow swarm operations.
 * Wraps CLI commands for initializing, managing, and monitoring swarms.
 */

import { claudeFlowCLI, CLIError, type CommandOptions } from './cli';
import type { Agent, AgentType } from './agents';

/**
 * Available swarm topologies
 */
export type SwarmTopology =
	| 'hierarchical'
	| 'mesh'
	| 'hierarchical-mesh'
	| 'hybrid'
	| 'ring'
	| 'star'
	| 'single'
	| 'adaptive';

/**
 * Swarm status values
 */
export type SwarmStatusValue = 'initializing' | 'active' | 'paused' | 'terminated' | 'error' | 'degraded';

/**
 * Configuration for swarm initialization
 */
export interface SwarmConfig {
	/** Swarm topology type */
	topology: SwarmTopology;
	/** Maximum number of agents */
	maxAgents?: number;
	/** Project context */
	project?: string;
	/** Ticket context */
	ticket?: string;
	/** V3 mode for enhanced features */
	v3Mode?: boolean;
	/** Enable hive-mind consensus */
	hiveMind?: boolean;
	/** Additional options */
	options?: Record<string, unknown>;
}

/**
 * Agent in a swarm with swarm-specific properties
 */
export interface SwarmAgent {
	/** Agent ID */
	id: string;
	/** Agent type */
	type: string;
	/** Agent name */
	name: string;
	/** Current status */
	status: 'idle' | 'working' | 'blocked' | 'error';
	/** Role in the swarm */
	role?: 'coordinator' | 'worker' | 'specialist' | 'scout';
	/** Connected agents in the topology */
	connectedTo?: string[];
}

/**
 * Status of a swarm
 */
export interface SwarmStatus {
	/** Unique swarm identifier */
	id: string;
	/** Current topology */
	topology: SwarmTopology;
	/** List of agents in the swarm */
	agents: SwarmAgent[];
	/** When the swarm was created */
	createdAt: string;
	/** Current swarm status */
	status: SwarmStatusValue;
	/** Associated project ID */
	projectId?: string;
	/** Associated ticket ID */
	ticketId?: string;
	/** Health score (0-1) */
	health?: number;
	/** Active task count */
	activeTasks?: number;
	/** Completed task count */
	completedTasks?: number;
}

/**
 * Swarm health information
 */
export interface SwarmHealth {
	/** Overall healthy status */
	healthy: boolean;
	/** Health score (0-1) */
	score: number;
	/** Number of healthy agents */
	healthyAgents: number;
	/** Total agents */
	totalAgents: number;
	/** Issues detected */
	issues: string[];
	/** Last check timestamp */
	checkedAt: string;
}

/**
 * Options for terminating a swarm
 */
export interface TerminateOptions extends CommandOptions {
	/** Allow graceful shutdown */
	graceful?: boolean;
	/** Force immediate termination */
	force?: boolean;
	/** Timeout for graceful shutdown in ms */
	timeout?: number;
}

/**
 * Options for adding an agent to swarm
 */
export interface AddAgentOptions extends CommandOptions {
	/** Role for the agent */
	role?: 'coordinator' | 'worker' | 'specialist' | 'scout';
	/** Agents to connect to in topology */
	connectTo?: string[];
}

/**
 * Swarm broadcast message
 */
export interface BroadcastMessage {
	/** Message content */
	content: string;
	/** Priority level */
	priority?: 'low' | 'normal' | 'high' | 'critical';
	/** Target agent type filter */
	targetType?: AgentType | string;
}

/**
 * SwarmService class - manages Claude Flow swarm operations
 */
export class SwarmService {
	private activeSwarmId: string | null = null;

	/**
	 * Initialize a new swarm
	 *
	 * @param config - Swarm configuration
	 * @param options - Command options
	 * @returns Swarm status after initialization
	 */
	async init(config: SwarmConfig, options: CommandOptions = {}): Promise<SwarmStatus> {
		const args = this.buildInitArgs(config);

		try {
			const result = await claudeFlowCLI.executeJson<SwarmStatus>('swarm', args, options);
			this.activeSwarmId = result.id;
			return result;
		} catch (error) {
			// Return a placeholder status if CLI fails (for development/testing)
			if (error instanceof CLIError && error.stderr.includes('not found')) {
				const mockSwarm = this.createMockSwarm(config);
				this.activeSwarmId = mockSwarm.id;
				return mockSwarm;
			}
			throw error;
		}
	}

	/**
	 * Get current swarm status
	 *
	 * @param swarmId - Optional specific swarm ID (uses active swarm if not provided)
	 * @param options - Command options
	 * @returns Current swarm status
	 */
	async getStatus(swarmId?: string, options: CommandOptions = {}): Promise<SwarmStatus> {
		const targetId = swarmId ?? this.activeSwarmId;
		const args = targetId ? ['status', targetId] : ['status'];

		try {
			return await claudeFlowCLI.executeJson<SwarmStatus>('swarm', args, options);
		} catch (error) {
			if (error instanceof CLIError) {
				throw new CLIError(
					`Failed to get swarm status: ${error.message}`,
					error.exitCode,
					error.stderr
				);
			}
			throw error;
		}
	}

	/**
	 * Terminate a swarm
	 *
	 * @param swarmId - Optional specific swarm ID (uses active swarm if not provided)
	 * @param options - Termination options
	 * @returns Whether termination was successful
	 */
	async terminate(swarmId?: string, options: TerminateOptions = {}): Promise<boolean> {
		const targetId = swarmId ?? this.activeSwarmId;
		const args = targetId ? ['terminate', targetId] : ['terminate'];

		if (options.graceful !== false) {
			args.push('--graceful');
		}
		if (options.force) {
			args.push('--force');
		}
		if (options.timeout) {
			args.push('--timeout', options.timeout.toString());
		}

		try {
			const result = await claudeFlowCLI.execute('swarm', args, options);
			if (result.exitCode === 0) {
				if (targetId === this.activeSwarmId) {
					this.activeSwarmId = null;
				}
				return true;
			}
			return false;
		} catch {
			return false;
		}
	}

	/**
	 * Add an agent to the swarm
	 *
	 * @param agentId - ID of agent to add
	 * @param options - Add agent options
	 * @returns Whether agent was added successfully
	 */
	async addAgent(agentId: string, options: AddAgentOptions = {}): Promise<boolean> {
		const args = ['add-agent', agentId];

		if (options.role) {
			args.push('--role', options.role);
		}
		if (options.connectTo?.length) {
			args.push('--connect-to', options.connectTo.join(','));
		}

		try {
			const result = await claudeFlowCLI.execute('swarm', args, options);
			return result.exitCode === 0;
		} catch {
			return false;
		}
	}

	/**
	 * Remove an agent from the swarm
	 *
	 * @param agentId - ID of agent to remove
	 * @param options - Command options
	 * @returns Whether agent was removed successfully
	 */
	async removeAgent(agentId: string, options: CommandOptions = {}): Promise<boolean> {
		try {
			const result = await claudeFlowCLI.execute('swarm', ['remove-agent', agentId], options);
			return result.exitCode === 0;
		} catch {
			return false;
		}
	}

	/**
	 * Pause swarm execution
	 *
	 * @param swarmId - Optional specific swarm ID
	 * @param options - Command options
	 * @returns Whether pause was successful
	 */
	async pause(swarmId?: string, options: CommandOptions = {}): Promise<boolean> {
		const targetId = swarmId ?? this.activeSwarmId;
		const args = targetId ? ['pause', targetId] : ['pause'];

		try {
			const result = await claudeFlowCLI.execute('swarm', args, options);
			return result.exitCode === 0;
		} catch {
			return false;
		}
	}

	/**
	 * Resume swarm execution
	 *
	 * @param swarmId - Optional specific swarm ID
	 * @param options - Command options
	 * @returns Whether resume was successful
	 */
	async resume(swarmId?: string, options: CommandOptions = {}): Promise<boolean> {
		const targetId = swarmId ?? this.activeSwarmId;
		const args = targetId ? ['resume', targetId] : ['resume'];

		try {
			const result = await claudeFlowCLI.execute('swarm', args, options);
			return result.exitCode === 0;
		} catch {
			return false;
		}
	}

	/**
	 * Check swarm health
	 *
	 * @param swarmId - Optional specific swarm ID
	 * @param options - Command options
	 * @returns Swarm health information
	 */
	async checkHealth(swarmId?: string, options: CommandOptions = {}): Promise<SwarmHealth> {
		const targetId = swarmId ?? this.activeSwarmId;
		const args = targetId ? ['health', targetId] : ['health'];

		try {
			return await claudeFlowCLI.executeJson<SwarmHealth>('swarm', args, options);
		} catch {
			return {
				healthy: false,
				score: 0,
				healthyAgents: 0,
				totalAgents: 0,
				issues: ['Unable to check swarm health'],
				checkedAt: new Date().toISOString()
			};
		}
	}

	/**
	 * Broadcast a message to all agents in the swarm
	 *
	 * @param message - Message to broadcast
	 * @param swarmId - Optional specific swarm ID
	 * @param options - Command options
	 * @returns Whether broadcast was successful
	 */
	async broadcast(
		message: BroadcastMessage,
		swarmId?: string,
		options: CommandOptions = {}
	): Promise<boolean> {
		const targetId = swarmId ?? this.activeSwarmId;
		const args = targetId
			? ['broadcast', targetId, '--message', message.content]
			: ['broadcast', '--message', message.content];

		if (message.priority) {
			args.push('--priority', message.priority);
		}
		if (message.targetType) {
			args.push('--target-type', message.targetType);
		}

		try {
			const result = await claudeFlowCLI.execute('swarm', args, options);
			return result.exitCode === 0;
		} catch {
			return false;
		}
	}

	/**
	 * Check if swarm is active
	 *
	 * @param swarmId - Optional specific swarm ID
	 * @returns Whether swarm is active
	 */
	async isActive(swarmId?: string): Promise<boolean> {
		try {
			const status = await this.getStatus(swarmId);
			return status.status === 'active';
		} catch {
			return false;
		}
	}

	/**
	 * List all agents in the swarm
	 *
	 * @param swarmId - Optional specific swarm ID
	 * @param options - Command options
	 * @returns List of agents in the swarm
	 */
	async listAgents(swarmId?: string, options: CommandOptions = {}): Promise<SwarmAgent[]> {
		try {
			const status = await this.getStatus(swarmId, options);
			return status.agents;
		} catch {
			return [];
		}
	}

	/**
	 * Get the active swarm ID
	 *
	 * @returns The active swarm ID or null
	 */
	getActiveSwarmId(): string | null {
		return this.activeSwarmId;
	}

	/**
	 * Set the active swarm ID manually
	 *
	 * @param swarmId - The swarm ID to set as active
	 */
	setActiveSwarmId(swarmId: string | null): void {
		this.activeSwarmId = swarmId;
	}

	/**
	 * Wait for swarm to reach a specific status
	 *
	 * @param targetStatus - Status to wait for
	 * @param swarmId - Optional specific swarm ID
	 * @param timeout - Maximum wait time in ms
	 * @param pollInterval - How often to check in ms
	 * @returns The swarm when target status is reached
	 */
	async waitForStatus(
		targetStatus: SwarmStatusValue | SwarmStatusValue[],
		swarmId?: string,
		timeout = 60000,
		pollInterval = 1000
	): Promise<SwarmStatus> {
		const statusArray = Array.isArray(targetStatus) ? targetStatus : [targetStatus];
		const startTime = Date.now();

		while (Date.now() - startTime < timeout) {
			const status = await this.getStatus(swarmId);
			if (statusArray.includes(status.status)) {
				return status;
			}

			// If swarm is in error state, throw immediately
			if (status.status === 'error' && !statusArray.includes('error')) {
				throw new Error(`Swarm ${status.id} entered error state`);
			}

			await new Promise(resolve => setTimeout(resolve, pollInterval));
		}

		throw new Error(`Timeout waiting for swarm to reach status ${statusArray.join(' or ')}`);
	}

	/**
	 * Build init command arguments from config
	 */
	private buildInitArgs(config: SwarmConfig): string[] {
		const args = ['init', '--topology', config.topology];

		if (config.maxAgents) {
			args.push('--max-agents', config.maxAgents.toString());
		}
		if (config.project) {
			args.push('--project', config.project);
		}
		if (config.ticket) {
			args.push('--ticket', config.ticket);
		}
		if (config.v3Mode) {
			args.push('--v3-mode');
		}
		if (config.hiveMind) {
			args.push('--hive-mind');
		}

		return args;
	}

	/**
	 * Create a mock swarm for development/testing
	 */
	private createMockSwarm(config: SwarmConfig): SwarmStatus {
		return {
			id: `mock-swarm-${Date.now()}`,
			topology: config.topology,
			agents: [],
			createdAt: new Date().toISOString(),
			status: 'initializing',
			projectId: config.project,
			ticketId: config.ticket
		};
	}
}

// Singleton instance
export const swarmService = new SwarmService();
