<script lang="ts">
  /**
   * GAP-UX.2: Snapshot Viewer Component
   *
   * Displays a detailed view of the ticket state at a specific point in time.
   * Shows ticket details, assigned agents, swarm status, and pending questions.
   */
  import {
    Clock,
    Bot,
    Network,
    HelpCircle,
    Tag,
    AlertCircle,
    CheckCircle2,
    Layers
  } from 'lucide-svelte';
  import { Badge } from '$lib/components/ui';
  import { cn } from '$lib/utils';
  import type { TicketSnapshot, TicketStatus, Priority } from '$lib/types/time-travel';

  interface Props {
    snapshot: TicketSnapshot | null;
    class?: string;
  }

  let { snapshot, class: className = '' }: Props = $props();

  // Status color mapping
  const statusColors: Record<TicketStatus, string> = {
    BACKLOG: 'bg-gray-100 text-gray-700 border-gray-200',
    TODO: 'bg-blue-100 text-blue-700 border-blue-200',
    IN_PROGRESS: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    NEEDS_FEEDBACK: 'bg-amber-100 text-amber-700 border-amber-200',
    READY_TO_RESUME: 'bg-cyan-100 text-cyan-700 border-cyan-200',
    REVIEW: 'bg-purple-100 text-purple-700 border-purple-200',
    DONE: 'bg-green-100 text-green-700 border-green-200',
    CANCELLED: 'bg-red-100 text-red-700 border-red-200'
  };

  // Priority color mapping
  const priorityColors: Record<Priority, string> = {
    LOW: 'bg-gray-200 text-gray-700',
    MEDIUM: 'bg-blue-200 text-blue-700',
    HIGH: 'bg-orange-200 text-orange-700',
    CRITICAL: 'bg-red-200 text-red-700'
  };

  // Agent status colors
  const agentStatusColors: Record<string, string> = {
    active: 'bg-green-100 text-green-700',
    idle: 'bg-gray-100 text-gray-600',
    completed: 'bg-blue-100 text-blue-700',
    failed: 'bg-red-100 text-red-700'
  };

  // Swarm status colors
  const swarmStatusColors: Record<string, string> = {
    initializing: 'bg-yellow-100 text-yellow-700',
    active: 'bg-green-100 text-green-700',
    paused: 'bg-orange-100 text-orange-700',
    completed: 'bg-blue-100 text-blue-700',
    terminated: 'bg-gray-100 text-gray-600'
  };

  function formatTimestamp(date: Date): string {
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function formatExecutionTime(hours: number): string {
    if (hours < 1) {
      return `${Math.round(hours * 60)}m`;
    }
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }
</script>

<div class={cn('snapshot-viewer bg-white rounded-lg border border-gray-200', className)}>
  {#if !snapshot}
    <div class="flex items-center justify-center h-64 text-gray-500">
      <div class="text-center">
        <Clock class="w-12 h-12 mx-auto mb-3 text-gray-300" />
        <p>Select an event to view the snapshot</p>
      </div>
    </div>
  {:else}
    <!-- Header with timestamp -->
    <div class="px-4 py-3 border-b border-gray-100 bg-gray-50 rounded-t-lg">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2 text-sm text-gray-600">
          <Clock class="w-4 h-4" />
          <span>Snapshot at {formatTimestamp(snapshot.timestamp)}</span>
        </div>
        {#if snapshot.executionTime > 0}
          <span class="text-xs text-gray-500">
            Execution time: {formatExecutionTime(snapshot.executionTime)}
          </span>
        {/if}
      </div>
    </div>

    <!-- Content -->
    <div class="p-4 space-y-4">
      <!-- Ticket Title and Status -->
      <div>
        <h3 class="text-lg font-semibold text-gray-900 mb-2">
          {snapshot.title}
        </h3>
        <div class="flex items-center gap-2 flex-wrap">
          <!-- Status badge -->
          <span
            class={cn(
              'px-2.5 py-1 rounded-full text-xs font-medium border',
              statusColors[snapshot.status]
            )}
          >
            {snapshot.status.replace(/_/g, ' ')}
          </span>

          <!-- Priority badge -->
          <span class={cn('px-2 py-0.5 rounded text-xs font-medium', priorityColors[snapshot.priority])}>
            {snapshot.priority}
          </span>

          <!-- Complexity if present -->
          {#if snapshot.complexity !== null}
            <span class="flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs">
              <Layers class="w-3 h-3" />
              {snapshot.complexity}/10
            </span>
          {/if}
        </div>
      </div>

      <!-- Description -->
      {#if snapshot.description}
        <div class="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
          {snapshot.description}
        </div>
      {/if}

      <!-- Labels -->
      {#if snapshot.labels.length > 0}
        <div class="flex items-center gap-2 flex-wrap">
          <Tag class="w-4 h-4 text-gray-400" />
          {#each snapshot.labels as label}
            <Badge variant="outline" class="text-xs">{label}</Badge>
          {/each}
        </div>
      {/if}

      <!-- Active Swarm -->
      {#if snapshot.activeSwarm}
        <div class="bg-cyan-50 rounded-lg p-3 border border-cyan-100">
          <div class="flex items-center gap-2 mb-2">
            <Network class="w-4 h-4 text-cyan-600" />
            <span class="font-medium text-cyan-900">Active Swarm</span>
            <span
              class={cn(
                'ml-auto px-2 py-0.5 rounded-full text-xs font-medium',
                swarmStatusColors[snapshot.activeSwarm.status]
              )}
            >
              {snapshot.activeSwarm.status}
            </span>
          </div>
          <div class="grid grid-cols-2 gap-2 text-sm">
            <div class="text-cyan-700">
              <span class="text-cyan-500">Topology:</span>{' '}
              {snapshot.activeSwarm.topology}
            </div>
            <div class="text-cyan-700">
              <span class="text-cyan-500">Agents:</span>{' '}
              {snapshot.activeSwarm.agentCount}
            </div>
          </div>
        </div>
      {/if}

      <!-- Assigned Agents -->
      {#if snapshot.assignedAgents.length > 0}
        <div>
          <div class="flex items-center gap-2 mb-2">
            <Bot class="w-4 h-4 text-gray-400" />
            <span class="text-sm font-medium text-gray-700">
              Assigned Agents ({snapshot.assignedAgents.length})
            </span>
          </div>
          <div class="space-y-2">
            {#each snapshot.assignedAgents as agent}
              <div
                class="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2"
              >
                <div class="flex items-center gap-2">
                  <div
                    class="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-indigo-500 flex items-center justify-center"
                  >
                    <Bot class="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p class="text-sm font-medium text-gray-900">{agent.agentName}</p>
                    <p class="text-xs text-gray-500">{agent.agentType} - {agent.role}</p>
                  </div>
                </div>
                <span
                  class={cn(
                    'px-2 py-0.5 rounded text-xs font-medium',
                    agentStatusColors[agent.status]
                  )}
                >
                  {agent.status}
                </span>
              </div>
            {/each}
          </div>
        </div>
      {/if}

      <!-- Pending Questions -->
      {#if snapshot.pendingQuestions.length > 0}
        <div>
          <div class="flex items-center gap-2 mb-2">
            <HelpCircle class="w-4 h-4 text-amber-500" />
            <span class="text-sm font-medium text-gray-700">
              Pending Questions ({snapshot.pendingQuestions.length})
            </span>
          </div>
          <div class="space-y-2">
            {#each snapshot.pendingQuestions as question}
              <div
                class={cn(
                  'rounded-lg px-3 py-2 border',
                  question.answered
                    ? 'bg-green-50 border-green-200'
                    : 'bg-amber-50 border-amber-200'
                )}
              >
                <div class="flex items-start gap-2">
                  {#if question.answered}
                    <CheckCircle2 class="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                  {:else}
                    <AlertCircle class="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                  {/if}
                  <div class="flex-1 min-w-0">
                    <p class="text-sm text-gray-700">{question.question}</p>
                    {#if question.answer}
                      <p class="text-xs text-green-600 mt-1 italic">
                        Answer: {question.answer}
                      </p>
                    {/if}
                    <p class="text-xs text-gray-400 mt-1">
                      Asked by {question.agentId}
                    </p>
                  </div>
                </div>
              </div>
            {/each}
          </div>
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .snapshot-viewer {
    max-height: 100%;
    overflow-y: auto;
  }

  .snapshot-viewer::-webkit-scrollbar {
    width: 6px;
  }

  .snapshot-viewer::-webkit-scrollbar-track {
    background: transparent;
  }

  .snapshot-viewer::-webkit-scrollbar-thumb {
    background-color: #d1d5db;
    border-radius: 3px;
  }
</style>
