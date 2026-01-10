/**
 * TASK-076/077/078/079: Neural Training Types
 *
 * Type definitions for neural training components, metrics, and patterns.
 */

/**
 * Training metrics for a single epoch
 */
export interface TrainingMetrics {
	epoch: number;
	loss: number;
	accuracy: number;
	timestamp: number;
	validationLoss?: number;
	validationAccuracy?: number;
}

/**
 * Expert statistics for MoE (Mixture of Experts)
 */
export interface ExpertStats {
	expertId: string;
	name: string;
	utilization: number; // 0-1 percentage
	taskCount: number;
	avgLatency?: number;
	specialization?: string;
}

/**
 * EWC (Elastic Weight Consolidation) metrics
 */
export interface EWCMetrics {
	fisherImportance: number;
	consolidationStrength: number; // 0-1 percentage
	forgettingRate: number; // 0-1 percentage (lower is better)
	lastConsolidation: number; // timestamp
	totalConsolidations: number;
	protectedPatterns: number;
}

/**
 * SONA (Self-Optimizing Neural Architecture) metrics
 */
export interface SONAMetrics {
	adaptationSpeed: number; // in milliseconds (target <0.05ms)
	adaptationCount: number;
	lastAdaptation: number;
	efficiency: number; // 0-1
}

/**
 * Training configuration
 */
export interface TrainingConfig {
	epochs: number;
	learningRate: number;
	batchSize: number;
	modelType: 'moe' | 'sona' | 'hybrid';
	patternType: 'coordination' | 'routing' | 'memory' | 'all';
	optimizerType: 'adam' | 'sgd' | 'adamw';
	warmupSteps?: number;
	weightDecay?: number;
}

/**
 * Training history entry
 */
export interface TrainingHistory {
	id: string;
	startTime: number;
	endTime?: number;
	epochs: number;
	finalLoss?: number;
	finalAccuracy?: number;
	status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
	config?: TrainingConfig;
	error?: string;
}

/**
 * Neural pattern definition
 */
export interface NeuralPattern {
	id: string;
	name: string;
	type: 'security' | 'performance' | 'resilience' | 'coordination' | 'routing' | 'memory';
	confidence: number; // 0-1
	embedding: number[]; // 2D or higher dimensional embedding
	usageCount: number;
	createdAt: number;
	lastUsed?: number;
	description?: string;
	relatedPatterns?: string[];
}

/**
 * Pattern prediction result
 */
export interface PatternPrediction {
	pattern: NeuralPattern;
	confidence: number;
	alternatives: NeuralPattern[];
	reasoning?: string;
}

/**
 * Neural training dashboard data
 */
export interface NeuralDashboardData {
	sonaMetrics: SONAMetrics;
	ewcMetrics: EWCMetrics;
	expertStats: ExpertStats[];
	trainingMetrics: TrainingMetrics[];
	currentConfig: TrainingConfig;
	trainingHistory: TrainingHistory[];
	patterns: NeuralPattern[];
	isTraining: boolean;
	lastUpdate: number;
}

/**
 * Neural training status
 */
export interface NeuralTrainingStatus {
	isTraining: boolean;
	currentEpoch?: number;
	totalEpochs?: number;
	progress?: number; // 0-100
	estimatedTimeRemaining?: number; // milliseconds
	currentLoss?: number;
	currentAccuracy?: number;
}

/**
 * Intelligence system status
 */
export interface IntelligenceStatus {
	sonaEnabled: boolean;
	moeEnabled: boolean;
	hnswEnabled: boolean;
	ewcEnabled: boolean;
	totalPatterns: number;
	indexedPatterns: number;
	avgQueryTime: number; // milliseconds
}
