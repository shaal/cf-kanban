/**
 * TASK-071: Pattern Explorer Page Server
 *
 * Server-side data loading for the Pattern Explorer page.
 * Fetches patterns from Claude Flow memory via the pattern service.
 */

import type { PageServerLoad } from './$types';
import { patternService } from '$lib/server/patterns/pattern-service';
import type { Pattern, PatternDomain, DOMAIN_CONFIGS } from '$lib/types/patterns';

export interface PatternExplorerData {
  patterns: Pattern[];
  domains: { domain: PatternDomain; count: number; color: string }[];
  totalPatterns: number;
  averageSuccessRate: number;
  topPatterns: Pattern[];
}

export const load: PageServerLoad = async (): Promise<PatternExplorerData> => {
  // Fetch patterns from Claude Flow memory
  const patterns = await patternService.fetchPatterns('patterns');

  // Group patterns by domain
  const domainCounts = new Map<PatternDomain, number>();
  patterns.forEach(pattern => {
    const count = domainCounts.get(pattern.domain) || 0;
    domainCounts.set(pattern.domain, count + 1);
  });

  // Domain colors
  const domainColors: Record<PatternDomain, string> = {
    auth: '#4f46e5',
    api: '#0891b2',
    testing: '#059669',
    database: '#d97706',
    ui: '#dc2626',
    performance: '#7c3aed',
    security: '#be185d',
    devops: '#2563eb',
    architecture: '#16a34a',
    general: '#6b7280'
  };

  const domains = Array.from(domainCounts.entries())
    .map(([domain, count]) => ({
      domain,
      count,
      color: domainColors[domain] || domainColors.general
    }))
    .sort((a, b) => b.count - a.count);

  // Calculate statistics
  const totalPatterns = patterns.length;
  const averageSuccessRate = totalPatterns > 0
    ? patterns.reduce((sum, p) => sum + p.successRate, 0) / totalPatterns
    : 0;

  // Get top patterns by success rate
  const topPatterns = [...patterns]
    .sort((a, b) => b.successRate - a.successRate)
    .slice(0, 5);

  return {
    patterns,
    domains,
    totalPatterns,
    averageSuccessRate,
    topPatterns
  };
};
