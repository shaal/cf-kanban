<script lang="ts">
  /**
   * GAP-UX.2: Time Travel History Page
   *
   * Page for viewing ticket history with time travel capabilities.
   * Allows users to navigate through decisions and see ticket state at any point.
   */
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { ArrowLeft, Home, ChevronRight } from 'lucide-svelte';
  import { Button } from '$lib/components/ui';
  import { TimeTravelViewer } from '$lib/components/time-travel';
  import type { PageData } from './$types';
  import type {
    TimelineEvent,
    TicketSnapshot,
    DecisionAnnotation
  } from '$lib/types/time-travel';

  let { data }: { data: PageData } = $props();

  // Convert serialized dates back to Date objects
  let events: TimelineEvent[] = $derived(
    data.events.map(e => ({
      ...e,
      timestamp: new Date(e.timestamp),
      snapshot: e.snapshot ? {
        ...e.snapshot,
        timestamp: new Date(e.snapshot.timestamp),
        activeSwarm: e.snapshot.activeSwarm ? {
          ...e.snapshot.activeSwarm,
          startedAt: new Date(e.snapshot.activeSwarm.startedAt)
        } : null
      } : undefined
    })) as TimelineEvent[]
  );

  let currentSnapshot: TicketSnapshot | null = $derived(
    data.currentSnapshot ? {
      ...data.currentSnapshot,
      timestamp: new Date(data.currentSnapshot.timestamp),
      activeSwarm: data.currentSnapshot.activeSwarm ? {
        ...data.currentSnapshot.activeSwarm,
        startedAt: new Date(data.currentSnapshot.activeSwarm.startedAt)
      } : null
    } as TicketSnapshot : null
  );

  let decisions: DecisionAnnotation[] = $derived(
    data.decisions.map(d => ({
      ...d,
      timestamp: new Date(d.timestamp)
    })) as DecisionAnnotation[]
  );

  function goBack() {
    goto(`/projects/${data.project.id}`);
  }
</script>

<svelte:head>
  <title>History: {data.ticketTitle} | {data.project.name}</title>
</svelte:head>

<div class="time-travel-page flex flex-col h-screen bg-gray-100">
  <!-- Top navigation bar -->
  <header class="bg-white border-b border-gray-200 px-4 py-2 flex-shrink-0">
    <div class="flex items-center justify-between">
      <!-- Breadcrumb -->
      <nav class="flex items-center gap-2 text-sm">
        <a
          href="/"
          class="text-gray-500 hover:text-gray-700 transition-colors flex items-center gap-1"
        >
          <Home class="w-4 h-4" />
          <span class="hidden sm:inline">Home</span>
        </a>
        <ChevronRight class="w-4 h-4 text-gray-400" />
        <a
          href={`/projects/${data.project.id}`}
          class="text-gray-500 hover:text-gray-700 transition-colors"
        >
          {data.project.name}
        </a>
        <ChevronRight class="w-4 h-4 text-gray-400" />
        <span class="text-gray-900 font-medium truncate max-w-[200px]">
          History: {data.ticketTitle}
        </span>
      </nav>

      <!-- Actions -->
      <div class="flex items-center gap-2">
        <Button variant="ghost" size="sm" onclick={goBack}>
          <ArrowLeft class="w-4 h-4 mr-1" />
          Back to Board
        </Button>
      </div>
    </div>
  </header>

  <!-- Main content -->
  <main class="flex-1 overflow-hidden">
    <TimeTravelViewer
      ticketId={data.ticketId}
      ticketTitle={data.ticketTitle}
      projectName={data.projectName}
      {events}
      {currentSnapshot}
      {decisions}
      class="h-full"
    />
  </main>
</div>

<style>
  .time-travel-page {
    min-height: 100vh;
  }
</style>
