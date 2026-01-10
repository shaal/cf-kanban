/**
 * TASK-046: Ticket Analysis Service
 *
 * Analyzes ticket content to determine:
 * - Ticket type (feature, bug, refactor, docs, test, chore)
 * - Keywords and technical terms
 * - Suggested labels
 * - Agent recommendations based on type
 */

/** Supported ticket types for classification */
export type TicketType = 'feature' | 'bug' | 'refactor' | 'docs' | 'test' | 'chore';

/** Agent types that can be assigned to tickets */
export type AgentType =
  | 'planner'
  | 'coder'
  | 'tester'
  | 'reviewer'
  | 'researcher'
  | 'architect'
  | 'api-docs'
  | 'security-auditor'
  | 'coordinator';

/** Suggested swarm topology based on complexity */
export type Topology = 'single' | 'mesh' | 'hierarchical';

/** Input for ticket analysis */
export interface TicketInput {
  title: string;
  description: string | null;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  labels?: string[];
}

/** Result of ticket analysis */
export interface AnalysisResult {
  ticketType: TicketType;
  keywords: string[];
  suggestedLabels: string[];
  suggestedAgents: AgentType[];
  suggestedTopology: Topology;
  intent: string;
  confidence: number;
}

/** Keyword patterns for ticket type classification */
const TYPE_PATTERNS: Record<TicketType, string[]> = {
  feature: ['add', 'implement', 'create', 'build', 'new', 'introduce', 'develop', 'enable'],
  bug: ['fix', 'bug', 'error', 'issue', 'broken', 'crash', 'fail', 'incorrect', 'wrong', 'defect'],
  refactor: [
    'refactor',
    'improve',
    'optimize',
    'clean',
    'restructure',
    'reorganize',
    'simplify',
    'enhance'
  ],
  docs: ['document', 'readme', 'docs', 'comment', 'explain', 'describe', 'update docs', 'jsdoc'],
  test: ['test', 'coverage', 'spec', 'unit', 'e2e', 'integration', 'playwright', 'vitest'],
  chore: [
    'update',
    'upgrade',
    'config',
    'setup',
    'install',
    'dependency',
    'deps',
    'bump',
    'maintenance'
  ]
};

/** Technical keywords to extract from ticket content */
const TECH_KEYWORDS: string[] = [
  'api',
  'database',
  'db',
  'auth',
  'authentication',
  'authorization',
  'ui',
  'frontend',
  'backend',
  'security',
  'performance',
  'cache',
  'redis',
  'websocket',
  'socket',
  'rest',
  'graphql',
  'prisma',
  'svelte',
  'typescript',
  'css',
  'tailwind',
  'component',
  'endpoint',
  'migration',
  'schema',
  'query',
  'mutation',
  'hook',
  'store',
  'state',
  'async',
  'worker',
  'queue',
  'real-time',
  'realtime',
  'ssr',
  'sveltekit',
  'routing'
];

/** Agent recommendations by ticket type */
const AGENTS_BY_TYPE: Record<TicketType, AgentType[]> = {
  feature: ['planner', 'coder', 'tester', 'reviewer'],
  bug: ['researcher', 'coder', 'tester'],
  refactor: ['architect', 'coder', 'reviewer'],
  docs: ['researcher', 'api-docs'],
  test: ['tester', 'reviewer'],
  chore: ['coder']
};

/**
 * TicketAnalyzer class - Analyzes ticket content for routing and assignment
 */
export class TicketAnalyzer {
  /**
   * Analyze a ticket and return classification and recommendations
   */
  analyze(ticket: TicketInput): AnalysisResult {
    const text = this.normalizeText(ticket.title, ticket.description);

    // Classify ticket type
    const { type: ticketType, confidence: typeConfidence } = this.classifyType(text);

    // Extract keywords
    const keywords = this.extractKeywords(text);

    // Generate suggested labels
    const suggestedLabels = this.generateLabels(ticketType, keywords, ticket.labels || []);

    // Get suggested agents
    const suggestedAgents = this.suggestAgents(ticketType, keywords);

    // Determine topology based on agent count and complexity indicators
    const suggestedTopology = this.suggestTopology(suggestedAgents.length, text);

    // Extract intent from title
    const intent = this.extractIntent(ticket.title);

    return {
      ticketType,
      keywords,
      suggestedLabels,
      suggestedAgents,
      suggestedTopology,
      intent,
      confidence: typeConfidence
    };
  }

  /**
   * Normalize and combine title and description into searchable text
   */
  private normalizeText(title: string, description: string | null): string {
    const combined = `${title} ${description || ''}`;
    return combined.toLowerCase().trim();
  }

  /**
   * Classify ticket type based on keyword patterns
   */
  classifyType(text: string): { type: TicketType; confidence: number } {
    const scores: Record<TicketType, number> = {
      feature: 0,
      bug: 0,
      refactor: 0,
      docs: 0,
      test: 0,
      chore: 0
    };

    // Score each type based on keyword matches
    for (const [type, patterns] of Object.entries(TYPE_PATTERNS)) {
      for (const pattern of patterns) {
        // Check for word boundaries to avoid partial matches
        const regex = new RegExp(`\\b${pattern}\\b`, 'i');
        if (regex.test(text)) {
          scores[type as TicketType]++;
        }
      }
    }

    // Find the type with highest score
    let maxScore = 0;
    let matchedType: TicketType = 'feature'; // Default

    for (const [type, score] of Object.entries(scores)) {
      if (score > maxScore) {
        maxScore = score;
        matchedType = type as TicketType;
      }
    }

    // Calculate confidence (0 to 1)
    // Max confidence if 3+ matches, lower for fewer matches
    const confidence = maxScore === 0 ? 0.3 : Math.min(maxScore / 3, 1);

    return { type: matchedType, confidence };
  }

  /**
   * Extract technical keywords from text
   */
  extractKeywords(text: string): string[] {
    const found: string[] = [];

    for (const keyword of TECH_KEYWORDS) {
      const regex = new RegExp(`\\b${keyword}\\b`, 'i');
      if (regex.test(text)) {
        found.push(keyword);
      }
    }

    return [...new Set(found)]; // Remove duplicates
  }

  /**
   * Generate suggested labels based on type and keywords
   */
  private generateLabels(
    ticketType: TicketType,
    keywords: string[],
    existingLabels: string[]
  ): string[] {
    const labels = new Set<string>(existingLabels);

    // Add type as a label
    labels.add(ticketType);

    // Add relevant keyword-based labels
    const labelMappings: Record<string, string> = {
      api: 'api',
      database: 'database',
      db: 'database',
      auth: 'security',
      authentication: 'security',
      authorization: 'security',
      security: 'security',
      performance: 'performance',
      cache: 'performance',
      redis: 'infrastructure',
      websocket: 'realtime',
      socket: 'realtime',
      frontend: 'frontend',
      ui: 'frontend',
      backend: 'backend',
      migration: 'database',
      schema: 'database'
    };

    for (const keyword of keywords) {
      const label = labelMappings[keyword];
      if (label) {
        labels.add(label);
      }
    }

    return Array.from(labels);
  }

  /**
   * Suggest agents based on ticket type and keywords
   */
  suggestAgents(ticketType: TicketType, keywords: string[]): AgentType[] {
    const agents = new Set<AgentType>(AGENTS_BY_TYPE[ticketType]);

    // Add security agent if security-related keywords present
    const securityKeywords = ['auth', 'authentication', 'authorization', 'security'];
    if (keywords.some((k) => securityKeywords.includes(k))) {
      agents.add('security-auditor');
    }

    // Add architect for database/schema work
    const architectKeywords = ['database', 'schema', 'migration', 'architecture'];
    if (keywords.some((k) => architectKeywords.includes(k))) {
      agents.add('architect');
    }

    return Array.from(agents);
  }

  /**
   * Suggest topology based on agent count and complexity indicators
   */
  private suggestTopology(agentCount: number, text: string): Topology {
    // Single agent for simple tasks
    if (agentCount === 1) {
      return 'single';
    }

    // Check for complexity indicators
    const complexityIndicators = [
      'multiple',
      'several',
      'complex',
      'integration',
      'cross-cutting',
      'across',
      'all',
      'every',
      'system-wide',
      'global'
    ];

    const hasComplexityIndicators = complexityIndicators.some((indicator) =>
      text.includes(indicator)
    );

    // Hierarchical for complex multi-agent tasks
    if (agentCount > 3 || hasComplexityIndicators) {
      return 'hierarchical';
    }

    // Mesh for collaborative work
    return 'mesh';
  }

  /**
   * Extract primary intent from title
   */
  private extractIntent(title: string): string {
    const lowerTitle = title.toLowerCase();

    // Map common starting verbs to intents
    const intentMappings: Record<string, string> = {
      add: 'addition',
      implement: 'implementation',
      create: 'creation',
      build: 'construction',
      fix: 'correction',
      update: 'update',
      remove: 'removal',
      delete: 'deletion',
      refactor: 'refactoring',
      optimize: 'optimization',
      test: 'testing',
      document: 'documentation'
    };

    for (const [verb, intent] of Object.entries(intentMappings)) {
      if (lowerTitle.startsWith(verb)) {
        return intent;
      }
    }

    // Default intent based on first word
    const firstWord = lowerTitle.split(' ')[0];
    return firstWord || 'task';
  }
}

/** Singleton instance of TicketAnalyzer */
export const ticketAnalyzer = new TicketAnalyzer();
