/**
 * TASK-042: Agent Command Wrappers
 *
 * Provides high-level interface to Claude Flow agent operations.
 * Wraps CLI commands for spawning, managing, and monitoring agents.
 */

import { claudeFlowCLI, CLIError, type CommandOptions } from './cli';

/**
 * Valid agent types supported by Claude Flow
 */
export type AgentType =
	| 'coder'
	| 'tester'
	| 'reviewer'
	| 'researcher'
	| 'planner'
	| 'architect'
	| 'coordinator'
	| 'security-architect'
	| 'security-auditor'
	| 'api-docs'
	| 'performance-engineer'
	| 'memory-specialist';

/**
 * Configuration for spawning an agent
 */
export interface AgentConfig {
	/** Type of agent to spawn */
	type: AgentType | string;
	/** Unique name for this agent */
	name: string;
	/** Optional prompt/instructions for the agent */
	prompt?: string;
	/** Optional model to use */
	model?: string;
	/** Optional working directory */
	cwd?: string;
	/** Optional environment variables */
	env?: Record<string, string>;
}

/**
 * Represents a running agent
 */
export interface Agent {
	/** Unique agent identifier */
	id: string;
	/** Agent type */
	type: string;
	/** Agent name */
	name: string;
	/** Current status */
	status: AgentStatus;
	/** When the agent was created */
	createdAt: string;
	/** Current task (if any) */
	currentTask?: string;
	/** Associated project ID (if any) */
	projectId?: string;
	/** Associated ticket ID (if any) */
	ticketId?: string;
}

/**
 * Possible agent statuses
 */
export type AgentStatus = 'idle' | 'working' | 'blocked' | 'stopped' | 'error' | 'initializing';

/**
 * Agent metrics for monitoring
 */
export interface AgentMetrics {
	/** Total tasks completed */
	tasksCompleted: number;
	/** Total tasks failed */
	tasksFailed: number;
	/** Average task duration in ms */
	avgTaskDuration: number;
	/** Current memory usage in bytes */
	memoryUsage?: number;
	/** Uptime in seconds */
	uptime?: number;
	/** Last activity timestamp */
	lastActivity?: string;
}

/**
 * Health status for an agent
 */
export interface AgentHealth {
	/** Whether the agent is healthy */
	healthy: boolean;
	/** Health score from 0 to 1 */
	score: number;
	/** Any issues detected */
	issues: string[];
	/** Last checked timestamp */
	checkedAt: string;
}

/**
 * Options for listing agents
 */
export interface ListAgentsOptions extends CommandOptions {
	/** Filter by status */
	status?: AgentStatus;
	/** Filter by type */
	type?: AgentType | string;
	/** Include terminated agents */
	includeTerminated?: boolean;
}

/**
 * Options for stopping an agent
 */
export interface StopAgentOptions extends CommandOptions {
	/** Allow graceful shutdown */
	graceful?: boolean;
	/** Force immediate termination */
	force?: boolean;
	/** Timeout for graceful shutdown in ms */
	timeout?: number;
}

/**
 * AgentService class - manages Claude Flow agent operations
 */
export class AgentService {
	/**
	 * Spawn a new agent
	 *
	 * @param config - Agent configuration
	 * @param options - Command options
	 * @returns The spawned agent
	 * @throws CLIError if spawn fails
	 */
	async spawn(config: AgentConfig, options: CommandOptions = {}): Promise<Agent> {
		const args = this.buildSpawnArgs(config);

		const commandOptions: CommandOptions = {
			...options,
			cwd: config.cwd ?? options.cwd,
			env: { ...options.env, ...config.env }
		};

		try {
			const agent = await claudeFlowCLI.executeJson<Agent>(
				'agent',
				['spawn', ...args],
				commandOptions
			);

			return {
				...agent,
				status: agent.status || 'initializing'
			};
		} catch (error) {
			// If CLI not available, return mock agent for development
			if (error instanceof CLIError && error.stderr.includes('not found')) {
				return this.createMockAgent(config);
			}
			throw error;
		}
	}

	/**
	 * List all agents
	 *
	 * @param options - List options
	 * @returns List of agents
	 */
	async list(options: ListAgentsOptions = {}): Promise<Agent[]> {
		const args: string[] = [];

		if (options.status) {
			args.push('--status', options.status);
		}
		if (options.type) {
			args.push('--type', options.type);
		}
		if (options.includeTerminated) {
			args.push('--include-terminated');
		}

		try {
			return await claudeFlowCLI.executeJson<Agent[]>('agent', ['list', ...args], options);
		} catch {
			// Return empty list if CLI not available
			return [];
		}
	}

	/**
	 * Get status of a specific agent
	 *
	 * @param agentId - Agent ID
	 * @param options - Command options
	 * @returns Agent status
	 * @throws CLIError if agent not found
	 */
	async getStatus(agentId: string, options: CommandOptions = {}): Promise<Agent> {
		try {
			return await claudeFlowCLI.executeJson<Agent>('agent', ['status', agentId], options);
		} catch (error) {
			if (error instanceof CLIError) {
				// Re-throw with more context
				throw new CLIError(
					`Failed to get status for agent ${agentId}: ${error.message}`,
					error.exitCode,
					error.stderr
				);
			}
			throw error;
		}
	}

	/**
	 * Stop an agent
	 *
	 * @param agentId - Agent ID
	 * @param options - Stop options
	 * @returns Whether stop was successful
	 */
	async stop(agentId: string, options: StopAgentOptions = {}): Promise<boolean> {
		const args = ['stop', agentId];

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
			const result = await claudeFlowCLI.execute('agent', args, options);
			return result.exitCode === 0;
		} catch {
			return false;
		}
	}

	/**
	 * Get metrics for an agent
	 *
	 * @param agentId - Agent ID
	 * @param options - Command options
	 * @returns Agent metrics
	 */
	async getMetrics(agentId: string, options: CommandOptions = {}): Promise<AgentMetrics> {
		try {
			return await claudeFlowCLI.executeJson<AgentMetrics>(
				'agent',
				['metrics', agentId],
				options
			);
		} catch {
			// Return default metrics if unavailable
			return {
				tasksCompleted: 0,
				tasksFailed: 0,
				avgTaskDuration: 0
			};
		}
	}

	/**
	 * Check health of an agent
	 *
	 * @param agentId - Agent ID
	 * @param options - Command options
	 * @returns Agent health status
	 */
	async checkHealth(agentId: string, options: CommandOptions = {}): Promise<AgentHealth> {
		try {
			return await claudeFlowCLI.executeJson<AgentHealth>(
				'agent',
				['health', agentId],
				options
			);
		} catch {
			return {
				healthy: false,
				score: 0,
				issues: ['Unable to check agent health'],
				checkedAt: new Date().toISOString()
			};
		}
	}

	/**
	 * Send a message to an agent
	 *
	 * @param agentId - Agent ID
	 * @param message - Message to send
	 * @param options - Command options
	 * @returns Whether message was sent
	 */
	async sendMessage(
		agentId: string,
		message: string,
		options: CommandOptions = {}
	): Promise<boolean> {
		try {
			const result = await claudeFlowCLI.execute(
				'agent',
				['message', agentId, '--content', message],
				options
			);
			return result.exitCode === 0;
		} catch {
			return false;
		}
	}

	/**
	 * Check if an agent is active (idle or working)
	 *
	 * @param agentId - Agent ID
	 * @returns Whether agent is active
	 */
	async isActive(agentId: string): Promise<boolean> {
		try {
			const agent = await this.getStatus(agentId);
			return agent.status === 'idle' || agent.status === 'working';
		} catch {
			return false;
		}
	}

	/**
	 * Wait for an agent to reach a specific status
	 *
	 * @param agentId - Agent ID
	 * @param targetStatus - Status to wait for
	 * @param timeout - Maximum wait time in ms
	 * @param pollInterval - How often to check in ms
	 * @returns The agent when target status is reached
	 * @throws Error if timeout is reached
	 */
	async waitForStatus(
		agentId: string,
		targetStatus: AgentStatus | AgentStatus[],
		timeout = 60000,
		pollInterval = 1000
	): Promise<Agent> {
		const statusArray = Array.isArray(targetStatus) ? targetStatus : [targetStatus];
		const startTime = Date.now();

		while (Date.now() - startTime < timeout) {
			const agent = await this.getStatus(agentId);
			if (statusArray.includes(agent.status)) {
				return agent;
			}

			// If agent is in error state, throw immediately
			if (agent.status === 'error' && !statusArray.includes('error')) {
				throw new Error(`Agent ${agentId} entered error state`);
			}

			await new Promise(resolve => setTimeout(resolve, pollInterval));
		}

		throw new Error(`Timeout waiting for agent ${agentId} to reach status ${statusArray.join(' or ')}`);
	}

	/**
	 * Build spawn command arguments from config
	 */
	private buildSpawnArgs(config: AgentConfig): string[] {
		const args = ['-t', config.type, '--name', config.name];

		if (config.prompt) {
			args.push('--prompt', config.prompt);
		}

		if (config.model) {
			args.push('--model', config.model);
		}

		return args;
	}

	/**
	 * Create a mock agent for development/testing when CLI unavailable
	 */
	private createMockAgent(config: AgentConfig): Agent {
		return {
			id: `mock-${config.type}-${Date.now()}`,
			type: config.type,
			name: config.name,
			status: 'idle',
			createdAt: new Date().toISOString()
		};
	}
}

// Singleton instance
export const agentService = new AgentService();

/**
 * GAP-3.3.5: Convert CustomAgentConfig to AgentConfig
 *
 * Converts a custom agent configuration preset to the format
 * expected by the AgentService for spawning.
 */
export function customConfigToAgentConfig(
	customConfig: {
		agentTypeId: string;
		name?: string;
		prompt?: string;
		model?: string;
		env?: Record<string, string>;
	},
	overrides?: Partial<AgentConfig>
): AgentConfig {
	return {
		type: customConfig.agentTypeId,
		name: overrides?.name ?? customConfig.name ?? `${customConfig.agentTypeId}-${Date.now()}`,
		prompt: overrides?.prompt ?? customConfig.prompt,
		model: overrides?.model ?? customConfig.model,
		env: { ...customConfig.env, ...overrides?.env },
		cwd: overrides?.cwd
	};
}
