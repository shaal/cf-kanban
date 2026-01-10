<script lang="ts">
  /**
   * GAP-UX.3: Pattern Similarity Indicator Component
   *
   * Displays pattern similarity between two or more projects,
   * showing shared and unique pattern domains.
   */
  import Card from '$lib/components/ui/Card.svelte';
  import Badge from '$lib/components/ui/Badge.svelte';
  import type { PatternSimilarityResult, ProjectComparisonData } from '$lib/types/project-comparison';
  import { getProjectColor } from '$lib/types/project-comparison';
  import { DOMAIN_CONFIGS, type PatternDomain } from '$lib/types/patterns';
  import { GitCompare, Circle, CheckCircle2 } from 'lucide-svelte';

  interface Props {
    projects: ProjectComparisonData[];
    similarities?: PatternSimilarityResult[];
    class?: string;
  }

  let {
    projects,
    similarities = [],
    class: className = ''
  }: Props = $props();

  // Calculate aggregate similarity when comparing more than 2 projects
  let aggregateSimilarity = $derived(() => {
    if (similarities.length === 0) return 0;
    const avg = similarities.reduce((sum, s) => sum + s.similarity, 0) / similarities.length;
    return Math.round(avg);
  });

  // Get all unique pattern domains across all projects
  let allDomains = $derived(() => {
    const domains = new Set<PatternDomain>();
    projects.forEach(p => {
      p.patternDomains?.forEach(pd => domains.add(pd.domain));
    });
    return Array.from(domains);
  });

  // Check if a domain is present in a project
  function projectHasDomain(project: ProjectComparisonData, domain: PatternDomain): boolean {
    return project.patternDomains?.some(pd => pd.domain === domain) ?? false;
  }

  // Get the count for a domain in a project
  function getDomainCount(project: ProjectComparisonData, domain: PatternDomain): number {
    return project.patternDomains?.find(pd => pd.domain === domain)?.count ?? 0;
  }

  // Get shared domains (present in all projects)
  let sharedDomains = $derived(() => {
    return allDomains().filter(domain =>
      projects.every(p => projectHasDomain(p, domain))
    );
  });

  // Get similarity color based on percentage
  function getSimilarityColor(similarity: number): string {
    if (similarity >= 70) return 'text-green-600';
    if (similarity >= 40) return 'text-yellow-600';
    return 'text-red-600';
  }

  function getSimilarityBgColor(similarity: number): string {
    if (similarity >= 70) return 'bg-green-500';
    if (similarity >= 40) return 'bg-yellow-500';
    return 'bg-red-500';
  }
</script>

<Card class="overflow-hidden {className}">
  <div class="p-4 border-b border-gray-100">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <GitCompare class="w-4 h-4 text-indigo-600" />
        <h3 class="font-semibold text-gray-900 text-sm">Pattern Similarity</h3>
      </div>
      {#if projects.length >= 2}
        <div class="flex items-center gap-2">
          <span class="text-2xl font-bold {getSimilarityColor(aggregateSimilarity())}">
            {aggregateSimilarity()}%
          </span>
        </div>
      {/if}
    </div>
  </div>

  <div class="p-4">
    {#if projects.length < 2}
      <div class="text-center py-8 text-gray-500 text-sm">
        Select at least 2 projects to compare patterns
      </div>
    {:else}
      <!-- Similarity Progress Bar -->
      <div class="mb-4">
        <div class="flex items-center justify-between text-xs mb-1">
          <span class="text-gray-500">Overall Similarity</span>
          <span class="font-medium {getSimilarityColor(aggregateSimilarity())}">
            {aggregateSimilarity()}%
          </span>
        </div>
        <div class="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
          <div
            class="h-full rounded-full transition-all duration-500 {getSimilarityBgColor(aggregateSimilarity())}"
            style="width: {aggregateSimilarity()}%"
          ></div>
        </div>
      </div>

      <!-- Shared Domains -->
      {#if sharedDomains().length > 0}
        <div class="mb-4">
          <p class="text-xs text-gray-500 mb-2">Shared Pattern Domains</p>
          <div class="flex flex-wrap gap-1">
            {#each sharedDomains() as domain}
              <Badge
                class="text-xs"
                style="background-color: {DOMAIN_CONFIGS[domain]?.color}20; color: {DOMAIN_CONFIGS[domain]?.color};"
              >
                {DOMAIN_CONFIGS[domain]?.label || domain}
              </Badge>
            {/each}
          </div>
        </div>
      {/if}

      <!-- Domain Matrix -->
      {#if allDomains().length > 0}
        <div>
          <p class="text-xs text-gray-500 mb-2">Pattern Domain Coverage</p>
          <div class="overflow-x-auto">
            <table class="w-full text-xs">
              <thead>
                <tr class="border-b border-gray-100">
                  <th class="text-left py-2 pr-2 font-medium text-gray-600">Domain</th>
                  {#each projects as project, i}
                    <th class="text-center py-2 px-1">
                      <div
                        class="w-3 h-3 rounded-full mx-auto"
                        style="background-color: {getProjectColor(i)}"
                        title={project.name}
                      ></div>
                    </th>
                  {/each}
                </tr>
              </thead>
              <tbody>
                {#each allDomains() as domain}
                  {@const isShared = projects.every(p => projectHasDomain(p, domain))}
                  <tr class="border-b border-gray-50" class:bg-green-50={isShared}>
                    <td class="py-1.5 pr-2 text-gray-700">
                      <span
                        class="inline-block w-2 h-2 rounded-full mr-1"
                        style="background-color: {DOMAIN_CONFIGS[domain]?.color}"
                      ></span>
                      {DOMAIN_CONFIGS[domain]?.label || domain}
                    </td>
                    {#each projects as project}
                      {@const hasIt = projectHasDomain(project, domain)}
                      {@const count = getDomainCount(project, domain)}
                      <td class="text-center py-1.5 px-1">
                        {#if hasIt}
                          <div class="flex items-center justify-center gap-0.5">
                            <CheckCircle2 class="w-3.5 h-3.5 text-green-500" />
                            {#if count > 0}
                              <span class="text-gray-500">{count}</span>
                            {/if}
                          </div>
                        {:else}
                          <Circle class="w-3.5 h-3.5 text-gray-300 mx-auto" />
                        {/if}
                      </td>
                    {/each}
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        </div>
      {:else}
        <div class="text-center py-4 text-gray-500 text-sm">
          No patterns available for comparison
        </div>
      {/if}

      <!-- Project Legend -->
      <div class="mt-4 pt-4 border-t border-gray-100">
        <div class="flex flex-wrap gap-3">
          {#each projects as project, i}
            <div class="flex items-center gap-1.5 text-xs text-gray-600">
              <div
                class="w-3 h-3 rounded-full"
                style="background-color: {getProjectColor(i)}"
              ></div>
              <span class="truncate max-w-[100px]" title={project.name}>
                {project.name}
              </span>
            </div>
          {/each}
        </div>
      </div>
    {/if}
  </div>
</Card>
