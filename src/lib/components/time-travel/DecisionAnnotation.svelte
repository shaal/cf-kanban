<script lang="ts">
  /**
   * GAP-UX.2: Decision Annotation Component
   *
   * Displays detailed information about a decision made during ticket execution.
   * Shows the options considered, factors involved, and the outcome.
   */
  import {
    GitCommit,
    CheckCircle2,
    XCircle,
    Lightbulb,
    Scale,
    TrendingUp,
    ChevronDown,
    ChevronUp
  } from 'lucide-svelte';
  import { cn } from '$lib/utils';
  import type { DecisionAnnotation as DecisionAnnotationType } from '$lib/types/time-travel';

  interface Props {
    decision: DecisionAnnotationType;
    expanded?: boolean;
    class?: string;
  }

  let { decision, expanded = false, class: className = '' }: Props = $props();

  let isExpanded = $state(expanded);

  // Decision type colors and labels
  const decisionTypeConfig: Record<
    DecisionAnnotationType['type'],
    { color: string; bgColor: string; label: string }
  > = {
    agent_selection: {
      color: 'text-purple-700',
      bgColor: 'bg-purple-50 border-purple-200',
      label: 'Agent Selection'
    },
    topology_selection: {
      color: 'text-cyan-700',
      bgColor: 'bg-cyan-50 border-cyan-200',
      label: 'Topology Selection'
    },
    status_transition: {
      color: 'text-blue-700',
      bgColor: 'bg-blue-50 border-blue-200',
      label: 'Status Transition'
    },
    pattern_application: {
      color: 'text-pink-700',
      bgColor: 'bg-pink-50 border-pink-200',
      label: 'Pattern Applied'
    },
    user_response: {
      color: 'text-green-700',
      bgColor: 'bg-green-50 border-green-200',
      label: 'User Response'
    }
  };

  function formatTimestamp(date: Date): string {
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function getScoreColor(score: number): string {
    if (score >= 0.8) return 'text-green-600';
    if (score >= 0.5) return 'text-yellow-600';
    return 'text-red-600';
  }

  function getScoreBarColor(score: number): string {
    if (score >= 0.8) return 'bg-green-500';
    if (score >= 0.5) return 'bg-yellow-500';
    return 'bg-red-500';
  }

  function toggleExpanded() {
    isExpanded = !isExpanded;
  }

  const config = $derived(decisionTypeConfig[decision.type]);
</script>

<div class={cn('decision-annotation rounded-lg border', config.bgColor, className)}>
  <!-- Header -->
  <button
    type="button"
    class="w-full px-4 py-3 flex items-start gap-3 text-left"
    onclick={toggleExpanded}
  >
    <div class={cn('p-1.5 rounded-lg', config.bgColor)}>
      <GitCommit class={cn('w-4 h-4', config.color)} />
    </div>

    <div class="flex-1 min-w-0">
      <div class="flex items-center gap-2 flex-wrap">
        <span class={cn('text-xs font-medium', config.color)}>
          {config.label}
        </span>
        <span class="text-xs text-gray-400">
          {formatTimestamp(decision.timestamp)}
        </span>
      </div>
      <p class="text-sm font-medium text-gray-900 mt-1">
        {decision.description}
      </p>
      <div class="flex items-center gap-2 mt-2">
        <CheckCircle2 class="w-3.5 h-3.5 text-green-500" />
        <span class="text-xs text-gray-600">
          Selected: <span class="font-medium">{decision.selectedOption}</span>
        </span>
      </div>
    </div>

    <div class="flex-shrink-0">
      {#if isExpanded}
        <ChevronUp class="w-5 h-5 text-gray-400" />
      {:else}
        <ChevronDown class="w-5 h-5 text-gray-400" />
      {/if}
    </div>
  </button>

  <!-- Expanded Content -->
  {#if isExpanded}
    <div class="px-4 pb-4 space-y-4 border-t border-gray-100 pt-4">
      <!-- Options Considered -->
      {#if decision.options.length > 0}
        <div>
          <div class="flex items-center gap-2 mb-2">
            <Scale class="w-4 h-4 text-gray-400" />
            <span class="text-sm font-medium text-gray-700">Options Considered</span>
          </div>
          <div class="space-y-2">
            {#each decision.options as option}
              <div
                class={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg',
                  option.selected ? 'bg-green-50 border border-green-200' : 'bg-white border border-gray-100'
                )}
              >
                <div class="flex-shrink-0">
                  {#if option.selected}
                    <CheckCircle2 class="w-4 h-4 text-green-500" />
                  {:else}
                    <div class="w-4 h-4 rounded-full border-2 border-gray-300"></div>
                  {/if}
                </div>
                <div class="flex-1 min-w-0">
                  <p class={cn('text-sm', option.selected ? 'font-medium text-green-800' : 'text-gray-700')}>
                    {option.label}
                  </p>
                </div>
                <div class="flex items-center gap-2">
                  <div class="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      class={cn('h-full rounded-full', getScoreBarColor(option.score))}
                      style="width: {option.score * 100}%"
                    ></div>
                  </div>
                  <span class={cn('text-xs font-medium', getScoreColor(option.score))}>
                    {(option.score * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            {/each}
          </div>
        </div>
      {/if}

      <!-- Decision Factors -->
      {#if decision.factors.length > 0}
        <div>
          <div class="flex items-center gap-2 mb-2">
            <Lightbulb class="w-4 h-4 text-gray-400" />
            <span class="text-sm font-medium text-gray-700">Decision Factors</span>
          </div>
          <div class="space-y-2">
            {#each decision.factors as factor}
              <div class="flex items-start gap-2 text-sm">
                <div class="w-1.5 h-1.5 rounded-full bg-gray-400 mt-2 flex-shrink-0"></div>
                <div class="flex-1">
                  <span class="text-gray-500">{factor.name}:</span>{' '}
                  <span class="text-gray-700">{factor.value}</span>
                </div>
              </div>
            {/each}
          </div>
        </div>
      {/if}

      <!-- Outcome -->
      {#if decision.outcome}
        <div
          class={cn(
            'rounded-lg p-3',
            decision.outcome.success
              ? 'bg-green-50 border border-green-100'
              : 'bg-red-50 border border-red-100'
          )}
        >
          <div class="flex items-center gap-2 mb-2">
            {#if decision.outcome.success}
              <TrendingUp class="w-4 h-4 text-green-600" />
              <span class="text-sm font-medium text-green-700">Successful Outcome</span>
            {:else}
              <XCircle class="w-4 h-4 text-red-600" />
              <span class="text-sm font-medium text-red-700">Unsuccessful Outcome</span>
            {/if}
          </div>
          <p class="text-sm text-gray-600">{decision.outcome.impact}</p>
          {#if decision.outcome.learnings.length > 0}
            <div class="mt-2 pt-2 border-t border-gray-200">
              <p class="text-xs font-medium text-gray-500 mb-1">Learnings:</p>
              <ul class="space-y-1">
                {#each decision.outcome.learnings as learning}
                  <li class="text-xs text-gray-600 flex items-start gap-1">
                    <span class="text-gray-400">-</span>
                    {learning}
                  </li>
                {/each}
              </ul>
            </div>
          {/if}
        </div>
      {/if}
    </div>
  {/if}
</div>
