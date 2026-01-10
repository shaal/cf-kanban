/**
 * TASK-047: Complexity Scoring Algorithm
 *
 * Multi-factor complexity model that considers:
 * - Description length and detail
 * - Technical keywords density
 * - Cross-cutting concerns
 * - Security implications
 * - Infrastructure requirements
 * - Historical similar task data
 */

import { prisma } from '../prisma';

/** Factors contributing to complexity score */
export interface ComplexityFactors {
  /** Normalized description length (0-1) */
  descriptionLength: number;
  /** Technical keyword density (0-1) */
  technicalKeywords: number;
  /** Whether task affects multiple areas */
  crossCutting: boolean;
  /** Whether task has security implications */
  hasSecurityImplications: boolean;
  /** Whether new infrastructure is needed */
  requiresNewInfrastructure: boolean;
  /** Estimated number of files affected */
  estimatedFiles: number;
  /** Complexity from similar completed tasks */
  similarTaskComplexity: number | null;
  /** Complexity from high-impact labels */
  labelComplexity: number;
}

/** Breakdown of how each factor contributes to score */
export interface ComplexityBreakdown {
  description: number;
  technical: number;
  crossCutting: number;
  security: number;
  infrastructure: number;
  files: number;
  historical: number;
  labels: number;
}

/** Result of complexity calculation */
export interface ComplexityResult {
  /** Final complexity score (1-10) */
  score: number;
  /** Confidence in the estimate (0-1) */
  confidence: number;
  /** Individual factors analyzed */
  factors: ComplexityFactors;
  /** Score contribution from each factor */
  breakdown: ComplexityBreakdown;
}

/** Technical keywords that increase complexity */
const TECH_KEYWORDS: string[] = [
  'api',
  'database',
  'schema',
  'migration',
  'auth',
  'security',
  'websocket',
  'cache',
  'redis',
  'queue',
  'worker',
  'async',
  'encryption',
  'oauth',
  'jwt',
  'middleware',
  'hook',
  'transaction',
  'concurrency',
  'distributed'
];

/** Patterns indicating cross-cutting concerns */
const CROSS_CUTTING_PATTERNS: string[] = [
  'all',
  'every',
  'across',
  'global',
  'everywhere',
  'system-wide',
  'throughout',
  'entire',
  'whole'
];

/** Patterns indicating security implications */
const SECURITY_PATTERNS: string[] = [
  'security',
  'auth',
  'authentication',
  'authorization',
  'password',
  'encrypt',
  'permission',
  'role',
  'access',
  'token',
  'credential',
  'secret',
  'private',
  'sensitive'
];

/** Patterns indicating infrastructure needs */
const INFRASTRUCTURE_PATTERNS: string[] = [
  'new service',
  'new database',
  'redis',
  'queue',
  'worker',
  'docker',
  'kubernetes',
  'deploy',
  'infrastructure',
  'server',
  'cluster',
  'scale'
];

/** Labels that indicate higher complexity */
const COMPLEX_LABELS: string[] = ['security', 'performance', 'architecture', 'breaking-change'];

/** Factor weights for calculating final score */
const WEIGHTS = {
  description: 1.0,
  technical: 2.0,
  crossCutting: 1.5,
  security: 2.0,
  infrastructure: 2.0,
  files: 2.0,
  historical: 1.5,
  labels: 0.5
};

/**
 * Calculate complexity score for a ticket
 */
export async function calculateComplexity(
  title: string,
  description: string | null,
  labels: string[] = [],
  projectId?: string
): Promise<ComplexityResult> {
  const text = `${title} ${description || ''}`.toLowerCase();

  // Factor 1: Description length (normalized to 0-1, caps at 100 words)
  const wordCount = text.split(/\s+/).filter((w) => w.length > 0).length;
  const descriptionLength = Math.min(wordCount / 100, 1);

  // Factor 2: Technical keywords density (normalized to 0-1, caps at 5 keywords)
  const keywordMatches = TECH_KEYWORDS.filter((k) => {
    const regex = new RegExp(`\\b${k}\\b`, 'i');
    return regex.test(text);
  });
  const technicalKeywords = Math.min(keywordMatches.length / 5, 1);

  // Factor 3: Cross-cutting concerns
  const crossCutting = CROSS_CUTTING_PATTERNS.some((p) => text.includes(p));

  // Factor 4: Security implications
  const hasSecurityImplications = SECURITY_PATTERNS.some((p) => {
    const regex = new RegExp(`\\b${p}\\b`, 'i');
    return regex.test(text);
  });

  // Factor 5: New infrastructure requirements
  const requiresNewInfrastructure = INFRASTRUCTURE_PATTERNS.some((p) => text.includes(p));

  // Factor 6: Estimate file count from patterns
  const estimatedFiles = estimateFileCount(text);

  // Factor 7: Similar task complexity from history
  const similarTaskComplexity = projectId
    ? await getSimilarTaskComplexity(title, projectId)
    : null;

  // Factor 8: Label complexity
  const labelComplexity = labels.filter((l) =>
    COMPLEX_LABELS.includes(l.toLowerCase())
  ).length;

  const factors: ComplexityFactors = {
    descriptionLength,
    technicalKeywords,
    crossCutting,
    hasSecurityImplications,
    requiresNewInfrastructure,
    estimatedFiles,
    similarTaskComplexity,
    labelComplexity
  };

  // Calculate weighted breakdown
  const breakdown: ComplexityBreakdown = {
    description: descriptionLength * WEIGHTS.description,
    technical: technicalKeywords * WEIGHTS.technical,
    crossCutting: crossCutting ? WEIGHTS.crossCutting : 0,
    security: hasSecurityImplications ? WEIGHTS.security : 0,
    infrastructure: requiresNewInfrastructure ? WEIGHTS.infrastructure : 0,
    files: Math.min(estimatedFiles / 10, 1) * WEIGHTS.files,
    historical: similarTaskComplexity !== null ? (similarTaskComplexity / 10) * WEIGHTS.historical : 0,
    labels: labelComplexity * WEIGHTS.labels
  };

  // Calculate raw score (sum of breakdown)
  const rawScore = Object.values(breakdown).reduce((a, b) => a + b, 0);

  // Normalize to 1-10 scale
  // Max possible raw score is ~12.5 (all factors maxed)
  const normalizedScore = Math.min(Math.max(Math.round((rawScore / 12.5) * 10), 1), 10);

  // Calculate confidence based on available data
  let confidence = 0.5; // Base confidence
  if (similarTaskComplexity !== null) confidence += 0.3;
  if (description && description.length > 50) confidence += 0.1;
  if (labels.length > 0) confidence += 0.1;

  return {
    score: normalizedScore,
    confidence: Math.min(confidence, 1),
    factors,
    breakdown
  };
}

/**
 * Estimate number of files that will be affected based on text patterns
 */
function estimateFileCount(text: string): number {
  let estimate = 3; // Base estimate

  // Multiple components/modules mentioned
  const modulePatterns = [
    /components?/i,
    /modules?/i,
    /services?/i,
    /routes?/i,
    /pages?/i,
    /api/i
  ];
  const moduleMatches = modulePatterns.filter((p) => p.test(text)).length;
  estimate += moduleMatches * 2;

  // Frontend + Backend mentioned
  if (/frontend/i.test(text) && /backend/i.test(text)) {
    estimate += 4;
  }

  // Database changes typically affect multiple files
  if (/database|schema|migration/i.test(text)) {
    estimate += 3;
  }

  // Tests mentioned
  if (/test|spec/i.test(text)) {
    estimate += 2;
  }

  // Cross-cutting concerns affect many files
  if (CROSS_CUTTING_PATTERNS.some((p) => text.includes(p))) {
    estimate *= 2;
  }

  return Math.min(estimate, 50); // Cap at 50 files
}

/**
 * Query completed tickets for similar task complexity
 */
async function getSimilarTaskComplexity(
  title: string,
  projectId: string
): Promise<number | null> {
  try {
    // Extract significant words from title (3+ chars, not common words)
    const stopWords = new Set(['the', 'and', 'for', 'with', 'from', 'into', 'that', 'this']);
    const titleWords = title
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length >= 3 && !stopWords.has(w));

    if (titleWords.length === 0) {
      return null;
    }

    // Find similar completed tickets
    const similarTickets = await prisma.ticket.findMany({
      where: {
        projectId,
        status: 'DONE',
        complexity: { not: null },
        OR: titleWords.map((word) => ({
          title: { contains: word, mode: 'insensitive' as const }
        }))
      },
      select: {
        complexity: true
      },
      take: 5
    });

    if (similarTickets.length === 0) {
      return null;
    }

    // Calculate average complexity of similar tickets
    const complexities = similarTickets
      .map((t) => t.complexity)
      .filter((c): c is number => c !== null);

    if (complexities.length === 0) {
      return null;
    }

    return Math.round(complexities.reduce((a, b) => a + b, 0) / complexities.length);
  } catch {
    // If database query fails, return null
    return null;
  }
}

/**
 * Quick complexity estimate without database query
 * Useful for real-time analysis
 */
export function quickComplexityEstimate(
  title: string,
  description: string | null,
  labels: string[] = []
): number {
  const text = `${title} ${description || ''}`.toLowerCase();

  let score = 3; // Base score

  // Technical keywords add complexity
  const keywordCount = TECH_KEYWORDS.filter((k) => text.includes(k)).length;
  score += Math.min(keywordCount, 3);

  // Cross-cutting adds complexity
  if (CROSS_CUTTING_PATTERNS.some((p) => text.includes(p))) {
    score += 2;
  }

  // Security adds complexity
  if (SECURITY_PATTERNS.some((p) => text.includes(p))) {
    score += 2;
  }

  // Complex labels add complexity
  const complexLabelCount = labels.filter((l) =>
    COMPLEX_LABELS.includes(l.toLowerCase())
  ).length;
  score += complexLabelCount;

  return Math.min(Math.max(score, 1), 10);
}

/** Singleton instance for complexity calculations */
export const complexityCalculator = {
  calculate: calculateComplexity,
  quickEstimate: quickComplexityEstimate
};
