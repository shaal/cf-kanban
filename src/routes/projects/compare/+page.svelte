<script lang="ts">
  /**
   * GAP-UX.3: Project Comparison Page
   *
   * Multi-project parallel comparison view allowing users to
   * compare metrics, patterns, and timelines across projects.
   */
  import type { PageData } from './$types';
  import { ProjectParallelView } from '$lib/components/comparison';
  import type { ProjectComparisonData, PatternSimilarityResult } from '$lib/types/project-comparison';
  import { invalidateAll } from '$app/navigation';

  let { data }: { data: PageData } = $props();

  // State for selected projects and similarities
  let selectedProjects = $state<ProjectComparisonData[]>([]);
  let similarities = $state<PatternSimilarityResult[]>([]);
  let loading = $state(false);

  // Initialize selected projects from URL params
  $effect(() => {
    if (data.selectedIds && data.selectedIds.length > 0) {
      selectedProjects = data.projects.filter(p =>
        data.selectedIds.includes(p.id)
      );
    }
  });

  // Fetch comparison data when projects are selected
  async function fetchComparisonData(projectIds: string[]) {
    if (projectIds.length < 2) {
      similarities = [];
      return;
    }

    loading = true;
    try {
      const response = await fetch(`/api/projects/compare?ids=${projectIds.join(',')}`);
      if (response.ok) {
        const result = await response.json();
        similarities = result.patternSimilarities || [];
      }
    } catch (error) {
      console.error('Failed to fetch comparison data:', error);
    } finally {
      loading = false;
    }
  }

  // Refresh all data
  async function handleRefresh() {
    loading = true;
    try {
      await invalidateAll();
    } finally {
      loading = false;
    }
  }
</script>

<svelte:head>
  <title>Project Comparison | CF-Kanban</title>
  <meta name="description" content="Compare multiple projects side-by-side with metrics, patterns, and timeline analysis." />
</svelte:head>

<div class="container mx-auto px-4 py-6 max-w-7xl">
  <ProjectParallelView
    projects={data.projects}
    {similarities}
    onRefresh={handleRefresh}
    {loading}
    maxSelections={4}
  />
</div>
