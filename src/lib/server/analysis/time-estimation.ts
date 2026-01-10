/**
 * TASK-048: Estimated Completion Time
 *
 * Time estimation based on:
 * - Complexity score
 * - Historical data from completed tickets
 * - Agent efficiency patterns
 * - Confidence scoring
 */

import { prisma } from '../prisma';

/** Time estimate result */
export interface TimeEstimate {
  /** Estimated hours to complete */
  hours: number;
  /** Confidence in the estimate (0-1) */
  confidence: number;
  /** Min/max range for estimate */
  range: { min: number; max: number };
  /** Basis for the estimate */
  basedOn: 'complexity' | 'historical' | 'hybrid';
  /** Additional context about the estimate */
  notes: string[];
}

/** Historical timing data from similar tickets */
interface HistoricalData {
  averageHours: number;
  sampleCount: number;
  minHours: number;
  maxHours: number;
}

/** Fibonacci-like base hours mapping for complexity scores */
const COMPLEXITY_HOURS: Record<number, number> = {
  1: 0.5,
  2: 1,
  3: 2,
  4: 3,
  5: 5,
  6: 8,
  7: 13,
  8: 21,
  9: 34,
  10: 55
};

/** Multipliers for ticket types */
const TYPE_MULTIPLIERS: Record<string, number> = {
  feature: 1.2,
  bug: 0.8,
  refactor: 1.0,
  docs: 0.5,
  test: 0.7,
  chore: 0.6
};

/** Labels that tend to increase time */
const SLOW_LABELS = ['security', 'performance', 'architecture', 'breaking-change'];

/**
 * Estimate completion time for a ticket
 */
export async function estimateCompletionTime(
  complexity: number,
  ticketType: string = 'feature',
  labels: string[] = [],
  projectId?: string
): Promise<TimeEstimate> {
  const notes: string[] = [];

  // Get base hours from complexity
  const baseHours = getBaseHours(complexity);
  notes.push(`Base estimate from complexity ${complexity}: ${baseHours}h`);

  // Apply type multiplier
  const typeMultiplier = TYPE_MULTIPLIERS[ticketType] ?? 1.0;
  let adjustedHours = baseHours * typeMultiplier;
  if (typeMultiplier !== 1.0) {
    notes.push(`Type multiplier (${ticketType}): x${typeMultiplier}`);
  }

  // Apply label adjustments
  const slowLabelCount = labels.filter((l) => SLOW_LABELS.includes(l.toLowerCase())).length;
  if (slowLabelCount > 0) {
    const labelMultiplier = 1 + slowLabelCount * 0.15;
    adjustedHours *= labelMultiplier;
    notes.push(`Label adjustment (+${slowLabelCount} complex labels): x${labelMultiplier.toFixed(2)}`);
  }

  // Try to get historical data
  const historicalData = projectId
    ? await getHistoricalAverage(ticketType, labels, projectId)
    : null;

  if (historicalData && historicalData.sampleCount >= 3) {
    // Use hybrid approach: weighted average of complexity-based and historical
    const weight = Math.min(historicalData.sampleCount / 10, 0.7); // Max 70% weight to historical
    const hybridHours = adjustedHours * (1 - weight) + historicalData.averageHours * weight;

    notes.push(
      `Historical data: ${historicalData.averageHours.toFixed(1)}h avg from ${historicalData.sampleCount} similar tickets`
    );
    notes.push(`Hybrid estimate (${(weight * 100).toFixed(0)}% historical): ${hybridHours.toFixed(1)}h`);

    return {
      hours: roundToQuarter(hybridHours),
      confidence: calculateConfidence(historicalData.sampleCount, complexity),
      range: {
        min: roundToQuarter(Math.min(hybridHours * 0.5, historicalData.minHours)),
        max: roundToQuarter(Math.max(hybridHours * 1.5, historicalData.maxHours))
      },
      basedOn: 'hybrid',
      notes
    };
  }

  // Fallback to complexity-based estimate
  return {
    hours: roundToQuarter(adjustedHours),
    confidence: 0.4 + complexity * 0.02, // Lower confidence without historical data
    range: {
      min: roundToQuarter(adjustedHours * 0.5),
      max: roundToQuarter(adjustedHours * 2)
    },
    basedOn: 'complexity',
    notes
  };
}

/**
 * Get base hours from complexity score
 */
function getBaseHours(complexity: number): number {
  // Clamp to valid range
  const clampedComplexity = Math.min(Math.max(Math.round(complexity), 1), 10);
  return COMPLEXITY_HOURS[clampedComplexity] ?? 8;
}

/**
 * Round hours to nearest quarter for readability
 */
function roundToQuarter(hours: number): number {
  return Math.round(hours * 4) / 4;
}

/**
 * Calculate confidence based on available data
 */
function calculateConfidence(sampleCount: number, complexity: number): number {
  // Base confidence
  let confidence = 0.5;

  // More samples = higher confidence
  confidence += Math.min(sampleCount / 20, 0.3);

  // Extreme complexity is harder to estimate
  if (complexity >= 8 || complexity <= 2) {
    confidence -= 0.1;
  }

  return Math.min(Math.max(confidence, 0.2), 0.95);
}

/**
 * Get historical timing data from completed tickets
 */
async function getHistoricalAverage(
  ticketType: string,
  labels: string[],
  projectId: string
): Promise<HistoricalData | null> {
  try {
    // Find completed tickets with time tracking data
    const completedTickets = await prisma.ticket.findMany({
      where: {
        projectId,
        status: 'DONE',
        // Match by labels if available
        ...(labels.length > 0
          ? { labels: { hasSome: labels } }
          : {})
      },
      include: {
        history: {
          where: {
            OR: [
              { toStatus: 'IN_PROGRESS' },
              { toStatus: 'DONE' }
            ]
          },
          orderBy: { createdAt: 'asc' }
        }
      },
      take: 20,
      orderBy: { updatedAt: 'desc' }
    });

    if (completedTickets.length < 3) {
      return null;
    }

    // Calculate actual duration from history
    const durations: number[] = [];

    for (const ticket of completedTickets) {
      const startEvent = ticket.history.find((h) => h.toStatus === 'IN_PROGRESS');
      const endEvent = ticket.history.find((h) => h.toStatus === 'DONE');

      if (startEvent && endEvent) {
        const durationMs = endEvent.createdAt.getTime() - startEvent.createdAt.getTime();
        const durationHours = durationMs / (1000 * 60 * 60);

        // Filter out unrealistic durations (< 5 min or > 2 weeks)
        if (durationHours >= 0.083 && durationHours <= 336) {
          durations.push(durationHours);
        }
      }
    }

    if (durations.length === 0) {
      return null;
    }

    // Calculate statistics
    const sum = durations.reduce((a, b) => a + b, 0);
    const avg = sum / durations.length;
    const min = Math.min(...durations);
    const max = Math.max(...durations);

    return {
      averageHours: avg,
      sampleCount: durations.length,
      minHours: min,
      maxHours: max
    };
  } catch {
    return null;
  }
}

/**
 * Format hours into human-readable string
 */
export function formatDuration(hours: number): string {
  if (hours < 1) {
    const minutes = Math.round(hours * 60);
    return `${minutes} min`;
  }

  if (hours < 8) {
    return `${hours.toFixed(1)} hrs`;
  }

  const days = hours / 8; // 8-hour workday
  if (days < 5) {
    return `${days.toFixed(1)} days`;
  }

  const weeks = days / 5; // 5-day workweek
  return `${weeks.toFixed(1)} weeks`;
}

/**
 * Format time range for display
 */
export function formatRange(range: { min: number; max: number }): string {
  return `${formatDuration(range.min)} - ${formatDuration(range.max)}`;
}

/**
 * Quick estimation without database access
 */
export function quickTimeEstimate(complexity: number, ticketType: string = 'feature'): number {
  const baseHours = getBaseHours(complexity);
  const typeMultiplier = TYPE_MULTIPLIERS[ticketType] ?? 1.0;
  return roundToQuarter(baseHours * typeMultiplier);
}

/** Singleton for time estimation */
export const timeEstimator = {
  estimate: estimateCompletionTime,
  quick: quickTimeEstimate,
  formatDuration,
  formatRange
};
