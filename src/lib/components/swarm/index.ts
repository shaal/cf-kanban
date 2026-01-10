/**
 * Swarm Visualization Components
 * GAP-3.3.2: Swarm Visualization
 * GAP-3.1.5: Swarm Topology Configuration UI
 */

export { default as SwarmVisualization } from './SwarmVisualization.svelte';
export { default as SwarmLegend } from './SwarmLegend.svelte';
export { default as SwarmTooltip } from './SwarmTooltip.svelte';
export { default as SwarmTopologyConfig } from './SwarmTopologyConfig.svelte';

// Types
export type {
	SwarmNode,
	SwarmLink,
	SwarmGraphData,
	FlowAnimation,
	AgentStatus,
	AgentRole,
	SwarmTopology,
	SwarmStatus,
	ConsensusState,
	CommunicationType,
	SimulationConfig
} from './types';

export {
	STATUS_COLORS,
	ROLE_COLORS,
	DEFAULT_SIMULATION_CONFIG,
	createMockSwarm
} from './types';
