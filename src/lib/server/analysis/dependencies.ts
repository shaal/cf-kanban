/**
 * TASK-049: Dependency Detection
 *
 * Detect dependencies between tickets:
 * - Explicit references (after #123, depends on #456)
 * - Implicit dependencies (schema changes, API changes)
 * - Bidirectional relationship tracking
 */

import { prisma } from '../prisma';

/** Types of dependencies between tickets */
export type DependencyType = 'explicit' | 'implicit' | 'suggested';

/** A single dependency relationship */
export interface Dependency {
  /** ID of the ticket this depends on (null if external/unknown) */
  ticketId: string | null;
  /** Ticket number reference (e.g., "123" from "#123") */
  ticketNumber: string | null;
  /** Type of dependency */
  type: DependencyType;
  /** Human-readable reason for the dependency */
  reason: string;
  /** Whether this is a blocking dependency */
  blocking: boolean;
  /** Confidence level for implicit/suggested dependencies (0-1) */
  confidence: number;
}

/** Result of dependency detection */
export interface DependencyResult {
  /** All detected dependencies */
  dependencies: Dependency[];
  /** IDs of tickets that block this one */
  blockedBy: string[];
  /** IDs of tickets that this one blocks */
  blocks: string[];
  /** Tags that might indicate dependencies */
  dependencyTags: string[];
}

/** Patterns for explicit dependency references */
const EXPLICIT_PATTERNS = [
  // "after #123" or "after ticket #123"
  /(?:after|following|subsequent\s+to)\s*(?:ticket\s*)?#(\d+)/gi,
  // "depends on #123" or "dependent on #123"
  /(?:depends?\s+on|dependent\s+on|requires?)\s*(?:ticket\s*)?#(\d+)/gi,
  // "blocked by #123"
  /(?:blocked?\s+by|waiting\s+(?:on|for))\s*(?:ticket\s*)?#(\d+)/gi,
  // "needs #123 first" or "need #123 completed"
  /(?:needs?|requires?)\s*(?:ticket\s*)?#(\d+)\s*(?:first|completed?|done|finished)/gi,
  // "prerequisite: #123"
  /(?:prerequisite|prereq|pre-req)\s*:?\s*(?:ticket\s*)?#(\d+)/gi
];

/** Keywords indicating schema/database dependencies */
const SCHEMA_KEYWORDS = [
  'schema',
  'migration',
  'database',
  'table',
  'column',
  'model',
  'entity',
  'prisma'
];

/** Keywords indicating API dependencies */
const API_KEYWORDS = ['api', 'endpoint', 'route', 'request', 'response', 'rest', 'graphql'];

/** Keywords indicating shared component dependencies */
const COMPONENT_KEYWORDS = ['component', 'shared', 'common', 'util', 'helper', 'lib', 'service'];

/**
 * Detect dependencies for a ticket
 */
export async function detectDependencies(
  ticketId: string,
  title: string,
  description: string | null,
  projectId: string
): Promise<DependencyResult> {
  const text = `${title} ${description || ''}`.toLowerCase();
  const dependencies: Dependency[] = [];
  const dependencyTags: string[] = [];

  // 1. Extract explicit references
  const explicitRefs = extractExplicitReferences(text);
  for (const ref of explicitRefs) {
    dependencies.push({
      ticketId: null, // Will be resolved if ticket exists in project
      ticketNumber: ref.number,
      type: 'explicit',
      reason: `Explicitly referenced: "${ref.match}"`,
      blocking: ref.blocking,
      confidence: 1.0
    });
    dependencyTags.push('has-dependencies');
  }

  // 2. Detect implicit dependencies based on keywords
  const implicitDeps = await detectImplicitDependencies(text, projectId, ticketId);
  dependencies.push(...implicitDeps);
  if (implicitDeps.length > 0) {
    dependencyTags.push('potential-dependencies');
  }

  // 3. Add domain-specific dependency tags
  if (SCHEMA_KEYWORDS.some((k) => text.includes(k))) {
    dependencyTags.push('database-related');
  }
  if (API_KEYWORDS.some((k) => text.includes(k))) {
    dependencyTags.push('api-related');
  }

  // 4. Find tickets that this one blocks
  const blocksTickets = await findBlockedTickets(ticketId, title, projectId);

  // 5. Resolve explicit references to actual ticket IDs
  const resolvedDependencies = await resolveDependencyIds(dependencies, projectId);

  return {
    dependencies: resolvedDependencies,
    blockedBy: resolvedDependencies.filter((d) => d.blocking && d.ticketId).map((d) => d.ticketId!),
    blocks: blocksTickets,
    dependencyTags
  };
}

/**
 * Extract explicit ticket references from text
 */
function extractExplicitReferences(
  text: string
): Array<{ number: string; match: string; blocking: boolean }> {
  const refs: Array<{ number: string; match: string; blocking: boolean }> = [];
  const seen = new Set<string>();

  for (const pattern of EXPLICIT_PATTERNS) {
    // Reset lastIndex for global patterns
    pattern.lastIndex = 0;

    let match;
    while ((match = pattern.exec(text)) !== null) {
      const ticketNumber = match[1];
      if (!seen.has(ticketNumber)) {
        seen.add(ticketNumber);
        refs.push({
          number: ticketNumber,
          match: match[0].trim(),
          blocking: determineIfBlocking(match[0])
        });
      }
    }
  }

  return refs;
}

/**
 * Determine if a reference indicates a blocking dependency
 */
function determineIfBlocking(matchText: string): boolean {
  const lowerMatch = matchText.toLowerCase();
  const blockingTerms = ['blocked', 'waiting', 'after', 'needs', 'requires', 'prerequisite'];
  return blockingTerms.some((term) => lowerMatch.includes(term));
}

/**
 * Detect implicit dependencies based on content analysis
 */
async function detectImplicitDependencies(
  text: string,
  projectId: string,
  currentTicketId: string
): Promise<Dependency[]> {
  const dependencies: Dependency[] = [];

  // Check for schema/database dependencies
  if (text.includes('use') && SCHEMA_KEYWORDS.some((k) => text.includes(k))) {
    // Find in-progress schema/migration tickets
    const schemaTickets = await findRelatedTickets(projectId, currentTicketId, SCHEMA_KEYWORDS, [
      'IN_PROGRESS',
      'TODO'
    ]);

    for (const ticket of schemaTickets) {
      dependencies.push({
        ticketId: ticket.id,
        ticketNumber: null,
        type: 'implicit',
        reason: `May depend on schema/database changes in "${ticket.title}"`,
        blocking: false,
        confidence: 0.6
      });
    }
  }

  // Check for API dependencies
  if (API_KEYWORDS.some((k) => text.includes(k))) {
    // Check if consuming an API that's being modified
    const apiTickets = await findRelatedTickets(projectId, currentTicketId, API_KEYWORDS, [
      'IN_PROGRESS'
    ]);

    for (const ticket of apiTickets) {
      dependencies.push({
        ticketId: ticket.id,
        ticketNumber: null,
        type: 'suggested',
        reason: `May be related to API changes in "${ticket.title}"`,
        blocking: false,
        confidence: 0.4
      });
    }
  }

  // Check for shared component dependencies
  if (COMPONENT_KEYWORDS.some((k) => text.includes(k))) {
    const componentTickets = await findRelatedTickets(
      projectId,
      currentTicketId,
      COMPONENT_KEYWORDS,
      ['IN_PROGRESS']
    );

    for (const ticket of componentTickets) {
      dependencies.push({
        ticketId: ticket.id,
        ticketNumber: null,
        type: 'suggested',
        reason: `May share components with "${ticket.title}"`,
        blocking: false,
        confidence: 0.3
      });
    }
  }

  return dependencies;
}

/**
 * Find tickets related to specific keywords
 */
async function findRelatedTickets(
  projectId: string,
  excludeTicketId: string,
  keywords: string[],
  statuses: string[]
): Promise<Array<{ id: string; title: string }>> {
  try {
    const tickets = await prisma.ticket.findMany({
      where: {
        projectId,
        id: { not: excludeTicketId },
        status: { in: statuses as any },
        OR: keywords.map((keyword) => ({
          OR: [
            { title: { contains: keyword, mode: 'insensitive' as const } },
            { description: { contains: keyword, mode: 'insensitive' as const } },
            { labels: { has: keyword } }
          ]
        }))
      },
      select: {
        id: true,
        title: true
      },
      take: 5
    });

    return tickets;
  } catch {
    return [];
  }
}

/**
 * Find tickets that reference this ticket (i.e., this ticket blocks them)
 */
async function findBlockedTickets(
  ticketId: string,
  title: string,
  projectId: string
): Promise<string[]> {
  try {
    // Find tickets that explicitly reference this one
    const potentiallyBlocked = await prisma.ticket.findMany({
      where: {
        projectId,
        id: { not: ticketId },
        status: { in: ['BACKLOG', 'TODO'] },
        OR: [
          // Reference by ticket ID
          { description: { contains: `#${ticketId}`, mode: 'insensitive' } },
          // Reference by title keywords (less reliable)
          ...title
            .split(' ')
            .filter((word) => word.length > 4)
            .slice(0, 3)
            .map((word) => ({
              description: { contains: word, mode: 'insensitive' as const }
            }))
        ]
      },
      select: { id: true }
    });

    return potentiallyBlocked.map((t) => t.id);
  } catch {
    return [];
  }
}

/**
 * Resolve ticket numbers to actual ticket IDs
 */
async function resolveDependencyIds(
  dependencies: Dependency[],
  projectId: string
): Promise<Dependency[]> {
  const resolved: Dependency[] = [];

  for (const dep of dependencies) {
    if (dep.ticketId) {
      // Already resolved
      resolved.push(dep);
    } else if (dep.ticketNumber) {
      // Try to find ticket by number reference
      // Note: This assumes ticket numbers are part of the ID or stored separately
      // For now, we'll leave it unresolved but keep the reference
      resolved.push(dep);
    } else {
      resolved.push(dep);
    }
  }

  return resolved;
}

/**
 * Check if a ticket has blocking dependencies
 */
export async function hasBlockingDependencies(
  ticketId: string,
  projectId: string
): Promise<{ blocked: boolean; blockedBy: Dependency[] }> {
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    select: { title: true, description: true }
  });

  if (!ticket) {
    return { blocked: false, blockedBy: [] };
  }

  const result = await detectDependencies(ticketId, ticket.title, ticket.description, projectId);

  const blockingDeps = result.dependencies.filter((d) => d.blocking);

  return {
    blocked: blockingDeps.length > 0,
    blockedBy: blockingDeps
  };
}

/**
 * Get dependency summary for display
 */
export function getDependencySummary(result: DependencyResult): string {
  const parts: string[] = [];

  const explicit = result.dependencies.filter((d) => d.type === 'explicit');
  const implicit = result.dependencies.filter((d) => d.type === 'implicit');
  const suggested = result.dependencies.filter((d) => d.type === 'suggested');

  if (explicit.length > 0) {
    parts.push(`${explicit.length} explicit`);
  }
  if (implicit.length > 0) {
    parts.push(`${implicit.length} implicit`);
  }
  if (suggested.length > 0) {
    parts.push(`${suggested.length} suggested`);
  }

  if (parts.length === 0) {
    return 'No dependencies detected';
  }

  return `Dependencies: ${parts.join(', ')}`;
}

/** Singleton for dependency detection */
export const dependencyDetector = {
  detect: detectDependencies,
  hasBlocking: hasBlockingDependencies,
  getSummary: getDependencySummary
};
