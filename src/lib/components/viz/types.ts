/**
 * D3 Visualization Types
 *
 * TASK-066: Set Up D3.js in SvelteKit
 * TASK-067: Create Base Chart Components
 * TASK-068: Implement Force-Directed Graph
 *
 * Type definitions for D3 visualization components.
 */

/**
 * Container configuration for D3 charts
 */
export interface D3ContainerConfig {
	width: number;
	height: number;
	marginTop: number;
	marginRight: number;
	marginBottom: number;
	marginLeft: number;
}

/**
 * Inner dimensions after accounting for margins
 */
export interface InnerDimensions {
	width: number;
	height: number;
	innerWidth: number;
	innerHeight: number;
}

/**
 * Data point for line/area charts
 */
export interface ChartDataPoint {
	x: number | Date;
	y: number;
	label?: string;
}

/**
 * Data series for multi-line charts
 */
export interface ChartSeries {
	id: string;
	name: string;
	color?: string;
	data: ChartDataPoint[];
}

/**
 * Bar chart data item
 */
export interface BarDataItem {
	label: string;
	value: number;
	color?: string;
}

/**
 * Force graph node
 */
export interface ForceNode {
	id: string;
	label?: string;
	group?: string;
	x?: number;
	y?: number;
	fx?: number | null;
	fy?: number | null;
	radius?: number;
	color?: string;
	data?: Record<string, unknown>;
}

/**
 * Force graph link
 */
export interface ForceLink {
	source: string | ForceNode;
	target: string | ForceNode;
	value?: number;
	label?: string;
	color?: string;
}

/**
 * Force graph data
 */
export interface ForceGraphData {
	nodes: ForceNode[];
	links: ForceLink[];
}

/**
 * Animation configuration
 */
export interface AnimationConfig {
	duration: number;
	delay?: number;
	easing?: string;
}

/**
 * Legend item
 */
export interface LegendItem {
	id: string;
	label: string;
	color: string;
	visible?: boolean;
}

/**
 * Graph filter options
 */
export interface GraphFilter {
	groups?: string[];
	searchQuery?: string;
	minConnections?: number;
}

/**
 * Tooltip data
 */
export interface TooltipData {
	visible: boolean;
	x: number;
	y: number;
	content: string | null;
}

/**
 * Default container configuration
 */
export function createDefaultConfig(): D3ContainerConfig {
	return {
		width: 600,
		height: 400,
		marginTop: 20,
		marginRight: 20,
		marginBottom: 30,
		marginLeft: 40
	};
}

/**
 * Calculate inner dimensions from config
 */
export function calculateInnerDimensions(config: D3ContainerConfig): { innerWidth: number; innerHeight: number } {
	return {
		innerWidth: config.width - config.marginLeft - config.marginRight,
		innerHeight: config.height - config.marginTop - config.marginBottom
	};
}

/**
 * Color scale for groups
 */
export const DEFAULT_COLORS = [
	'#3b82f6', // blue
	'#10b981', // green
	'#f59e0b', // amber
	'#ef4444', // red
	'#8b5cf6', // violet
	'#ec4899', // pink
	'#06b6d4', // cyan
	'#84cc16', // lime
	'#f97316', // orange
	'#6366f1'  // indigo
];
