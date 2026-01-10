/**
 * Claude Flow CLI Wrapper Module
 *
 * Provides a complete TypeScript interface for interacting with the
 * Claude Flow CLI, including agent and swarm management, async execution,
 * and resilience patterns.
 */

// Core CLI interface
export {
	ClaudeFlowCLI,
	claudeFlowCLI,
	CLIError,
	type CommandResult,
	type CommandOptions
} from './cli';

// Agent management
export {
	AgentService,
	agentService,
	type AgentType,
	type AgentConfig,
	type Agent,
	type AgentStatus,
	type AgentMetrics,
	type AgentHealth,
	type ListAgentsOptions,
	type StopAgentOptions
} from './agents';

// Swarm management
export {
	SwarmService,
	swarmService,
	type SwarmTopology,
	type SwarmStatusValue,
	type SwarmConfig,
	type SwarmAgent,
	type SwarmStatus,
	type SwarmHealth,
	type TerminateOptions,
	type AddAgentOptions,
	type BroadcastMessage
} from './swarm';

// Async command execution
export {
	CommandExecutor,
	commandExecutor,
	ExecutorWebSocketBridge,
	type JobStatus,
	type JobPriority,
	type JobConfig,
	type JobProgress,
	type JobResult,
	type ExecutorConfig
} from './executor';

// Error handling and resilience
export {
	classifyError,
	calculateBackoff,
	withRetry,
	withResilience,
	CircuitBreaker,
	CircuitBreakerError,
	RetryPolicies,
	type ErrorCategory,
	type ClassifiedError,
	type RetryConfig,
	type CircuitBreakerConfig,
	type CircuitState
} from './resilience';
