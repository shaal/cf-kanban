/**
 * GAP-3.4.1: Neural Patterns API
 *
 * GET /api/neural/patterns
 * Returns a summary of learned patterns from the neural training system.
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { neuralTrainingService } from '$lib/server/neural/training-service';

/**
 * Pattern summary with usage statistics
 */
interface PatternSummary {
	id: string;
	name: string;
	type: string;
	confidence: number;
	usageCount: number;
	createdAt: number;
	lastUsed?: number;
	description?: string;
	embedding?: number[];
}

/**
 * Pattern type statistics
 */
interface PatternTypeStats {
	type: string;
	count: number;
	avgConfidence: number;
	totalUsage: number;
}

/**
 * Response structure for patterns endpoint
 */
interface NeuralPatternsResponse {
	/** Total number of patterns */
	totalPatterns: number;
	/** Indexed patterns (in HNSW) */
	indexedPatterns: number;
	/** Pattern list */
	patterns: PatternSummary[];
	/** Statistics by pattern type */
	byType: PatternTypeStats[];
	/** Top patterns by usage */
	topPatterns: PatternSummary[];
	/** Recently learned patterns */
	recentPatterns: PatternSummary[];
	/** Pattern prediction accuracy */
	predictionStats: {
		totalPredictions: number;
		correctPredictions: number;
		accuracy: number;
		avgConfidence: number;
	};
	/** Embedding space info */
	embeddingInfo: {
		dimensions: number;
		totalVectors: number;
		indexType: string;
		queryLatency: number;
	};
	/** Timestamp */
	timestamp: string;
}

/**
 * GET /api/neural/patterns
 * Get learned patterns summary
 */
export const GET: RequestHandler = async ({ url }) => {
	const type = url.searchParams.get('type');
	const limit = parseInt(url.searchParams.get('limit') || '50', 10);
	const sortBy = url.searchParams.get('sortBy') || 'usageCount';
	const includeEmbeddings = url.searchParams.get('includeEmbeddings') === 'true';

	try {
		// Get patterns from neural service
		const patterns = await neuralTrainingService.getPatterns();

		// Get intelligence status for embedding info
		const intelligenceStatus = await neuralTrainingService.getIntelligenceStatus();

		// Filter by type if specified
		let filteredPatterns = patterns;
		if (type) {
			filteredPatterns = patterns.filter((p) => p.type === type);
		}

		// Sort patterns
		const sortedPatterns = [...filteredPatterns].sort((a, b) => {
			switch (sortBy) {
				case 'confidence':
					return b.confidence - a.confidence;
				case 'createdAt':
					return b.createdAt - a.createdAt;
				case 'name':
					return a.name.localeCompare(b.name);
				case 'usageCount':
				default:
					return b.usageCount - a.usageCount;
			}
		});

		// Build pattern summaries
		const patternSummaries: PatternSummary[] = sortedPatterns.slice(0, limit).map((p) => {
			const summary: PatternSummary = {
				id: p.id,
				name: p.name,
				type: p.type,
				confidence: p.confidence,
				usageCount: p.usageCount,
				createdAt: p.createdAt,
				lastUsed: p.lastUsed,
				description: p.description
			};

			if (includeEmbeddings && p.embedding) {
				summary.embedding = p.embedding;
			}

			return summary;
		});

		// Calculate statistics by type
		const typeStats = new Map<
			string,
			{ count: number; totalConfidence: number; totalUsage: number }
		>();

		for (const pattern of patterns) {
			const stats = typeStats.get(pattern.type) || {
				count: 0,
				totalConfidence: 0,
				totalUsage: 0
			};
			stats.count++;
			stats.totalConfidence += pattern.confidence;
			stats.totalUsage += pattern.usageCount;
			typeStats.set(pattern.type, stats);
		}

		const byType: PatternTypeStats[] = Array.from(typeStats.entries()).map(
			([type, stats]) => ({
				type,
				count: stats.count,
				avgConfidence: Math.round((stats.totalConfidence / stats.count) * 100) / 100,
				totalUsage: stats.totalUsage
			})
		);

		// Top patterns by usage
		const topPatterns = [...patterns]
			.sort((a, b) => b.usageCount - a.usageCount)
			.slice(0, 10)
			.map((p) => ({
				id: p.id,
				name: p.name,
				type: p.type,
				confidence: p.confidence,
				usageCount: p.usageCount,
				createdAt: p.createdAt,
				lastUsed: p.lastUsed
			}));

		// Recent patterns (by creation time)
		const recentPatterns = [...patterns]
			.sort((a, b) => b.createdAt - a.createdAt)
			.slice(0, 10)
			.map((p) => ({
				id: p.id,
				name: p.name,
				type: p.type,
				confidence: p.confidence,
				usageCount: p.usageCount,
				createdAt: p.createdAt,
				lastUsed: p.lastUsed
			}));

		// Mock prediction stats (would come from actual prediction tracking)
		const predictionStats = {
			totalPredictions: patterns.reduce((sum, p) => sum + p.usageCount, 0),
			correctPredictions: Math.floor(
				patterns.reduce((sum, p) => sum + p.usageCount * p.confidence, 0)
			),
			accuracy:
				Math.round(
					(patterns.reduce((sum, p) => sum + p.confidence, 0) / Math.max(1, patterns.length)) * 100
				) / 100,
			avgConfidence:
				Math.round(
					(patterns.reduce((sum, p) => sum + p.confidence, 0) / Math.max(1, patterns.length)) * 100
				) / 100
		};

		// Embedding space info
		const embeddingInfo = {
			dimensions: patterns.length > 0 && patterns[0].embedding ? patterns[0].embedding.length : 2,
			totalVectors: intelligenceStatus.indexedPatterns,
			indexType: intelligenceStatus.hnswEnabled ? 'HNSW' : 'linear',
			queryLatency: intelligenceStatus.avgQueryTime
		};

		const response: NeuralPatternsResponse = {
			totalPatterns: patterns.length,
			indexedPatterns: intelligenceStatus.indexedPatterns,
			patterns: patternSummaries,
			byType,
			topPatterns,
			recentPatterns,
			predictionStats,
			embeddingInfo,
			timestamp: new Date().toISOString()
		};

		return json(response);
	} catch (err) {
		console.error('Error getting neural patterns:', err);
		return json({ error: 'Failed to get neural patterns' }, { status: 500 });
	}
};
