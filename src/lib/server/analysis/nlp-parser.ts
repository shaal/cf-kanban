/**
 * GAP-3.2.7: Natural Language Task Parsing
 *
 * LLM-powered NLP parsing service that:
 * - Analyzes ticket descriptions using Claude
 * - Auto-suggests labels based on content
 * - Extracts technical requirements
 * - Identifies routing hints for agent assignment
 */

import Anthropic from '@anthropic-ai/sdk';
import { env } from '$env/dynamic/private';
import type { TicketType, AgentType, Topology } from './ticket-analyzer';

/**
 * Parsed NLP result from ticket description
 */
export interface NLPParseResult {
	/** Inferred ticket type */
	ticketType: TicketType;
	/** Confidence score 0-1 */
	confidence: number;
	/** Suggested labels based on content */
	suggestedLabels: string[];
	/** Technical requirements extracted from description */
	technicalRequirements: TechnicalRequirement[];
	/** Routing hints for agent assignment */
	routingHints: RoutingHint[];
	/** Key entities mentioned (files, components, APIs) */
	entities: Entity[];
	/** Summary of the task in one sentence */
	summary: string;
	/** Estimated complexity (1-10) */
	estimatedComplexity: number;
	/** Suggested agents based on NLP analysis */
	suggestedAgents: AgentType[];
	/** Suggested topology based on complexity */
	suggestedTopology: Topology;
}

/**
 * Technical requirement extracted from description
 */
export interface TechnicalRequirement {
	/** Requirement description */
	description: string;
	/** Category: functional, non-functional, constraint */
	category: 'functional' | 'non-functional' | 'constraint';
	/** Priority: must-have, should-have, nice-to-have */
	priority: 'must-have' | 'should-have' | 'nice-to-have';
	/** Related technologies or components */
	relatedTo: string[];
}

/**
 * Routing hint for agent assignment
 */
export interface RoutingHint {
	/** Hint type */
	type: 'skill-required' | 'domain-expertise' | 'tool-usage' | 'security-concern' | 'performance-concern';
	/** Description of the hint */
	description: string;
	/** Suggested agent types */
	suggestedAgents: string[];
	/** Confidence in this hint */
	confidence: number;
}

/**
 * Entity mentioned in the description
 */
export interface Entity {
	/** Entity name */
	name: string;
	/** Entity type */
	type: 'file' | 'component' | 'api' | 'database' | 'service' | 'technology' | 'concept';
	/** Context where it was mentioned */
	context: string;
}

/**
 * Cache for NLP results to avoid redundant API calls
 */
const nlpCache = new Map<string, { result: NLPParseResult; timestamp: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * NLP Parser Service using Claude for natural language understanding
 */
export class NLPParserService {
	private client: Anthropic | null = null;
	private isConfigured = false;

	constructor() {
		this.initialize();
	}

	/**
	 * Initialize the Anthropic client
	 */
	private initialize(): void {
		const apiKey = env.ANTHROPIC_API_KEY;
		if (apiKey) {
			try {
				this.client = new Anthropic({ apiKey });
				this.isConfigured = true;
			} catch (error) {
				console.warn('Failed to initialize Anthropic client:', error);
				this.isConfigured = false;
			}
		} else {
			console.warn('ANTHROPIC_API_KEY not configured - NLP parsing will use fallback mode');
			this.isConfigured = false;
		}
	}

	/**
	 * Check if NLP parsing is available
	 */
	isAvailable(): boolean {
		return this.isConfigured && this.client !== null;
	}

	/**
	 * Parse ticket content using NLP
	 */
	async parse(title: string, description: string | null): Promise<NLPParseResult> {
		// Generate cache key
		const cacheKey = this.generateCacheKey(title, description);

		// Check cache
		const cached = nlpCache.get(cacheKey);
		if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
			return cached.result;
		}

		// If not configured, return fallback result
		if (!this.isAvailable()) {
			return this.generateFallbackResult(title, description);
		}

		try {
			const result = await this.callClaudeAPI(title, description);

			// Cache the result
			nlpCache.set(cacheKey, { result, timestamp: Date.now() });

			return result;
		} catch (error) {
			console.error('NLP parsing error:', error);
			return this.generateFallbackResult(title, description);
		}
	}

	/**
	 * Call Claude API for NLP analysis
	 */
	private async callClaudeAPI(title: string, description: string | null): Promise<NLPParseResult> {
		if (!this.client) {
			throw new Error('Anthropic client not initialized');
		}

		const prompt = this.buildPrompt(title, description);

		const response = await this.client.messages.create({
			model: 'claude-sonnet-4-20250514',
			max_tokens: 2048,
			messages: [
				{
					role: 'user',
					content: prompt
				}
			]
		});

		// Extract text content from response
		const textContent = response.content.find((c) => c.type === 'text');
		if (!textContent || textContent.type !== 'text') {
			throw new Error('No text response from Claude');
		}

		// Parse the JSON response
		return this.parseClaudeResponse(textContent.text);
	}

	/**
	 * Build the prompt for Claude
	 */
	private buildPrompt(title: string, description: string | null): string {
		const fullContent = description ? `${title}\n\n${description}` : title;

		return `You are an expert task analyzer for a software development kanban board. Analyze the following ticket and extract structured information.

TICKET:
"""
${fullContent}
"""

Analyze this ticket and provide a JSON response with the following structure:
{
  "ticketType": "<feature|bug|refactor|docs|test|chore>",
  "confidence": <0.0-1.0>,
  "suggestedLabels": ["<label1>", "<label2>", ...],
  "technicalRequirements": [
    {
      "description": "<requirement description>",
      "category": "<functional|non-functional|constraint>",
      "priority": "<must-have|should-have|nice-to-have>",
      "relatedTo": ["<tech/component>", ...]
    }
  ],
  "routingHints": [
    {
      "type": "<skill-required|domain-expertise|tool-usage|security-concern|performance-concern>",
      "description": "<what expertise is needed>",
      "suggestedAgents": ["<agent-type>", ...],
      "confidence": <0.0-1.0>
    }
  ],
  "entities": [
    {
      "name": "<entity name>",
      "type": "<file|component|api|database|service|technology|concept>",
      "context": "<how it's mentioned>"
    }
  ],
  "summary": "<one sentence summary>",
  "estimatedComplexity": <1-10>,
  "suggestedAgents": ["<agent1>", "<agent2>", ...],
  "suggestedTopology": "<single|mesh|hierarchical>"
}

Available agent types: planner, coder, tester, reviewer, researcher, architect, api-docs, security-auditor, coordinator, performance-engineer, memory-specialist

Label suggestions should include:
- Technical domain: frontend, backend, api, database, security, performance, infrastructure
- Task type: feature, bug, refactor, docs, test, chore
- Component-specific labels if identifiable

For routing hints, identify:
- Required skills (e.g., "React expertise needed", "Database migration experience")
- Security concerns (authentication, authorization, data protection)
- Performance concerns (optimization, caching, load handling)
- Domain expertise (specific business logic or technology stack)

Respond ONLY with valid JSON, no additional text.`;
	}

	/**
	 * Parse Claude's JSON response
	 */
	private parseClaudeResponse(responseText: string): NLPParseResult {
		// Extract JSON from response (handle potential markdown code blocks)
		let jsonStr = responseText.trim();

		// Remove markdown code block if present
		if (jsonStr.startsWith('```json')) {
			jsonStr = jsonStr.slice(7);
		} else if (jsonStr.startsWith('```')) {
			jsonStr = jsonStr.slice(3);
		}
		if (jsonStr.endsWith('```')) {
			jsonStr = jsonStr.slice(0, -3);
		}

		try {
			const parsed = JSON.parse(jsonStr.trim());

			// Validate and normalize the response
			return {
				ticketType: this.validateTicketType(parsed.ticketType),
				confidence: this.clamp(parsed.confidence || 0.5, 0, 1),
				suggestedLabels: Array.isArray(parsed.suggestedLabels) ? parsed.suggestedLabels : [],
				technicalRequirements: this.validateRequirements(parsed.technicalRequirements),
				routingHints: this.validateRoutingHints(parsed.routingHints),
				entities: this.validateEntities(parsed.entities),
				summary: parsed.summary || 'Task analysis',
				estimatedComplexity: this.clamp(parsed.estimatedComplexity || 5, 1, 10),
				suggestedAgents: this.validateAgents(parsed.suggestedAgents),
				suggestedTopology: this.validateTopology(parsed.suggestedTopology)
			};
		} catch (error) {
			console.error('Failed to parse Claude response:', error);
			throw new Error('Invalid JSON response from Claude');
		}
	}

	/**
	 * Generate fallback result when NLP is unavailable
	 */
	private generateFallbackResult(title: string, description: string | null): NLPParseResult {
		const text = `${title} ${description || ''}`.toLowerCase();

		// Basic keyword-based fallback
		let ticketType: TicketType = 'feature';
		if (text.includes('fix') || text.includes('bug') || text.includes('error')) {
			ticketType = 'bug';
		} else if (text.includes('refactor') || text.includes('improve')) {
			ticketType = 'refactor';
		} else if (text.includes('test') || text.includes('spec')) {
			ticketType = 'test';
		} else if (text.includes('doc') || text.includes('readme')) {
			ticketType = 'docs';
		}

		const suggestedLabels: string[] = [ticketType];

		// Basic entity extraction
		const entities: Entity[] = [];
		if (text.includes('api')) {
			suggestedLabels.push('api');
			entities.push({ name: 'API', type: 'technology', context: 'API-related task' });
		}
		if (text.includes('database') || text.includes('db') || text.includes('sql')) {
			suggestedLabels.push('database');
			entities.push({ name: 'Database', type: 'database', context: 'Database-related task' });
		}
		if (text.includes('frontend') || text.includes('ui') || text.includes('component')) {
			suggestedLabels.push('frontend');
		}
		if (text.includes('backend') || text.includes('server')) {
			suggestedLabels.push('backend');
		}
		if (text.includes('security') || text.includes('auth')) {
			suggestedLabels.push('security');
		}
		if (text.includes('performance') || text.includes('optimize')) {
			suggestedLabels.push('performance');
		}

		// Basic agent suggestion
		const suggestedAgents: AgentType[] = ['coder'];
		if (ticketType === 'bug') {
			suggestedAgents.unshift('researcher');
			suggestedAgents.push('tester');
		} else if (ticketType === 'feature') {
			suggestedAgents.unshift('planner');
			suggestedAgents.push('tester', 'reviewer');
		} else if (ticketType === 'refactor') {
			suggestedAgents.unshift('architect');
			suggestedAgents.push('reviewer');
		}

		return {
			ticketType,
			confidence: 0.5, // Low confidence for fallback
			suggestedLabels: [...new Set(suggestedLabels)],
			technicalRequirements: [],
			routingHints: [],
			entities,
			summary: title,
			estimatedComplexity: 5,
			suggestedAgents: [...new Set(suggestedAgents)],
			suggestedTopology: suggestedAgents.length > 2 ? 'mesh' : 'single'
		};
	}

	/**
	 * Generate cache key for NLP results
	 */
	private generateCacheKey(title: string, description: string | null): string {
		const content = `${title}|${description || ''}`;
		// Simple hash function
		let hash = 0;
		for (let i = 0; i < content.length; i++) {
			const char = content.charCodeAt(i);
			hash = ((hash << 5) - hash) + char;
			hash = hash & hash;
		}
		return `nlp-${hash}`;
	}

	/**
	 * Validate and normalize ticket type
	 */
	private validateTicketType(type: string): TicketType {
		const validTypes: TicketType[] = ['feature', 'bug', 'refactor', 'docs', 'test', 'chore'];
		return validTypes.includes(type as TicketType) ? (type as TicketType) : 'feature';
	}

	/**
	 * Validate and normalize topology
	 */
	private validateTopology(topology: string): Topology {
		const validTopologies: Topology[] = ['single', 'mesh', 'hierarchical'];
		return validTopologies.includes(topology as Topology) ? (topology as Topology) : 'mesh';
	}

	/**
	 * Validate and normalize agent types
	 */
	private validateAgents(agents: unknown): AgentType[] {
		const validAgents: AgentType[] = [
			'planner', 'coder', 'tester', 'reviewer', 'researcher',
			'architect', 'api-docs', 'security-auditor', 'coordinator'
		];

		if (!Array.isArray(agents)) return ['coder'];

		return agents.filter((a) => validAgents.includes(a as AgentType)) as AgentType[];
	}

	/**
	 * Validate technical requirements
	 */
	private validateRequirements(reqs: unknown): TechnicalRequirement[] {
		if (!Array.isArray(reqs)) return [];

		return reqs
			.filter((r) => r && typeof r === 'object' && r.description)
			.map((r) => ({
				description: String(r.description),
				category: this.validateCategory(r.category),
				priority: this.validatePriority(r.priority),
				relatedTo: Array.isArray(r.relatedTo) ? r.relatedTo.map(String) : []
			}));
	}

	/**
	 * Validate routing hints
	 */
	private validateRoutingHints(hints: unknown): RoutingHint[] {
		if (!Array.isArray(hints)) return [];

		return hints
			.filter((h) => h && typeof h === 'object' && h.description)
			.map((h) => ({
				type: this.validateHintType(h.type),
				description: String(h.description),
				suggestedAgents: Array.isArray(h.suggestedAgents) ? h.suggestedAgents.map(String) : [],
				confidence: this.clamp(h.confidence || 0.5, 0, 1)
			}));
	}

	/**
	 * Validate entities
	 */
	private validateEntities(entities: unknown): Entity[] {
		if (!Array.isArray(entities)) return [];

		return entities
			.filter((e) => e && typeof e === 'object' && e.name)
			.map((e) => ({
				name: String(e.name),
				type: this.validateEntityType(e.type),
				context: String(e.context || '')
			}));
	}

	/**
	 * Validate requirement category
	 */
	private validateCategory(cat: string): 'functional' | 'non-functional' | 'constraint' {
		const valid = ['functional', 'non-functional', 'constraint'];
		return valid.includes(cat) ? (cat as 'functional' | 'non-functional' | 'constraint') : 'functional';
	}

	/**
	 * Validate requirement priority
	 */
	private validatePriority(pri: string): 'must-have' | 'should-have' | 'nice-to-have' {
		const valid = ['must-have', 'should-have', 'nice-to-have'];
		return valid.includes(pri) ? (pri as 'must-have' | 'should-have' | 'nice-to-have') : 'should-have';
	}

	/**
	 * Validate routing hint type
	 */
	private validateHintType(type: string): RoutingHint['type'] {
		const valid: RoutingHint['type'][] = [
			'skill-required', 'domain-expertise', 'tool-usage', 'security-concern', 'performance-concern'
		];
		return valid.includes(type as RoutingHint['type']) ? (type as RoutingHint['type']) : 'skill-required';
	}

	/**
	 * Validate entity type
	 */
	private validateEntityType(type: string): Entity['type'] {
		const valid: Entity['type'][] = [
			'file', 'component', 'api', 'database', 'service', 'technology', 'concept'
		];
		return valid.includes(type as Entity['type']) ? (type as Entity['type']) : 'concept';
	}

	/**
	 * Clamp a number between min and max
	 */
	private clamp(value: number, min: number, max: number): number {
		return Math.max(min, Math.min(max, value));
	}

	/**
	 * Clear the NLP cache
	 */
	clearCache(): void {
		nlpCache.clear();
	}
}

/**
 * Singleton instance of NLP Parser Service
 */
export const nlpParser = new NLPParserService();
