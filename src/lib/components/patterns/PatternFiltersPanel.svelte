<script lang="ts">
  /**
   * TASK-073: Pattern Filters Panel
   *
   * Provides search and filter controls for patterns with debounced search
   * and range sliders for success rate and usage count.
   */
  import type { PatternFilters, PatternDomain } from '$lib/types/patterns';
  import { DOMAIN_CONFIGS } from '$lib/types/patterns';
  import { Search, X, Calendar } from 'lucide-svelte';

  interface DomainInfo {
    domain: PatternDomain;
    count: number;
    color: string;
  }

  interface Props {
    filters: PatternFilters;
    domains: DomainInfo[];
    onFilterChange: (filters: PatternFilters) => void;
  }

  let { filters, domains, onFilterChange }: Props = $props();

  // Local state for controlled inputs
  let searchQuery = $state(filters.searchQuery);
  let minSuccessRate = $state(filters.minSuccessRate);
  let maxSuccessRate = $state(filters.maxSuccessRate);
  let minUsageCount = $state(filters.minUsageCount);
  let maxUsageCount = $state(filters.maxUsageCount === Infinity ? 1000 : filters.maxUsageCount);
  let selectedDomains: PatternDomain[] = $state([...filters.domains]);
  let startDate = $state(filters.startDate ? formatDate(filters.startDate) : '');
  let endDate = $state(filters.endDate ? formatDate(filters.endDate) : '');

  // Debounce timer
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  function formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  function parseDate(dateStr: string): Date | null {
    return dateStr ? new Date(dateStr) : null;
  }

  /**
   * Emit filter changes with 300ms debounce for search
   */
  function emitFilterChange(immediate = false) {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    const emit = () => {
      onFilterChange({
        searchQuery,
        minSuccessRate,
        maxSuccessRate,
        minUsageCount,
        maxUsageCount: maxUsageCount >= 1000 ? Infinity : maxUsageCount,
        startDate: parseDate(startDate),
        endDate: parseDate(endDate),
        domains: selectedDomains,
        tags: filters.tags
      });
    };

    if (immediate) {
      emit();
    } else {
      debounceTimer = setTimeout(emit, 300);
    }
  }

  function handleSearchInput(event: Event) {
    searchQuery = (event.target as HTMLInputElement).value;
    emitFilterChange();
  }

  function handleSuccessRateChange() {
    emitFilterChange(true);
  }

  function handleUsageCountChange() {
    emitFilterChange(true);
  }

  function toggleDomain(domain: PatternDomain) {
    const index = selectedDomains.indexOf(domain);
    if (index >= 0) {
      selectedDomains = selectedDomains.filter(d => d !== domain);
    } else {
      selectedDomains = [...selectedDomains, domain];
    }
    emitFilterChange(true);
  }

  function handleDateChange() {
    emitFilterChange(true);
  }

  function clearSearch() {
    searchQuery = '';
    emitFilterChange(true);
  }

  function resetFilters() {
    searchQuery = '';
    minSuccessRate = 0;
    maxSuccessRate = 100;
    minUsageCount = 0;
    maxUsageCount = 1000;
    selectedDomains = [];
    startDate = '';
    endDate = '';
    emitFilterChange(true);
  }

  $effect(() => {
    return () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
    };
  });
</script>

<div class="pattern-filters flex flex-wrap items-center gap-4">
  <!-- Search -->
  <div class="relative flex-1 min-w-64">
    <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
    <input
      type="text"
      value={searchQuery}
      oninput={handleSearchInput}
      placeholder="Search patterns..."
      class="w-full pl-10 pr-8 py-2 text-sm border border-gray-300 rounded-lg
             focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
    />
    {#if searchQuery}
      <button
        class="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
        onclick={clearSearch}
        aria-label="Clear search"
      >
        <X class="w-4 h-4" />
      </button>
    {/if}
  </div>

  <!-- Success Rate Range -->
  <div class="flex items-center gap-2">
    <label class="text-xs font-medium text-gray-600 whitespace-nowrap">Success Rate:</label>
    <div class="flex items-center gap-1">
      <input
        type="range"
        bind:value={minSuccessRate}
        onchange={handleSuccessRateChange}
        min="0"
        max="100"
        class="w-20 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
      />
      <span class="text-xs text-gray-500 w-8">{minSuccessRate}%</span>
      <span class="text-xs text-gray-400">-</span>
      <input
        type="range"
        bind:value={maxSuccessRate}
        onchange={handleSuccessRateChange}
        min="0"
        max="100"
        class="w-20 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
      />
      <span class="text-xs text-gray-500 w-8">{maxSuccessRate}%</span>
    </div>
  </div>

  <!-- Usage Count Range -->
  <div class="flex items-center gap-2">
    <label class="text-xs font-medium text-gray-600 whitespace-nowrap">Usage:</label>
    <input
      type="number"
      bind:value={minUsageCount}
      onchange={handleUsageCountChange}
      min="0"
      max="1000"
      class="w-16 px-2 py-1 text-xs border border-gray-300 rounded"
      placeholder="Min"
    />
    <span class="text-xs text-gray-400">-</span>
    <input
      type="number"
      bind:value={maxUsageCount}
      onchange={handleUsageCountChange}
      min="0"
      max="1000"
      class="w-16 px-2 py-1 text-xs border border-gray-300 rounded"
      placeholder="Max"
    />
  </div>

  <!-- Date Range -->
  <div class="flex items-center gap-2">
    <Calendar class="w-4 h-4 text-gray-400" />
    <input
      type="date"
      bind:value={startDate}
      onchange={handleDateChange}
      class="px-2 py-1 text-xs border border-gray-300 rounded"
    />
    <span class="text-xs text-gray-400">to</span>
    <input
      type="date"
      bind:value={endDate}
      onchange={handleDateChange}
      class="px-2 py-1 text-xs border border-gray-300 rounded"
    />
  </div>

  <!-- Reset -->
  <button
    class="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
    onclick={resetFilters}
  >
    Reset
  </button>
</div>

<!-- Domain Filter Pills -->
<div class="mt-3 flex flex-wrap gap-2">
  {#each domains as { domain, count, color }}
    <button
      class="px-3 py-1 text-xs rounded-full border transition-colors flex items-center gap-1.5"
      class:bg-gray-100={!selectedDomains.includes(domain)}
      class:border-gray-300={!selectedDomains.includes(domain)}
      class:text-gray-700={!selectedDomains.includes(domain)}
      class:text-white={selectedDomains.includes(domain)}
      style={selectedDomains.includes(domain) ? `background-color: ${color}; border-color: ${color}` : ''}
      onclick={() => toggleDomain(domain)}
    >
      <span
        class="w-2 h-2 rounded-full"
        style="background-color: {selectedDomains.includes(domain) ? 'white' : color}"
      ></span>
      {DOMAIN_CONFIGS[domain]?.label || domain}
      <span class="opacity-75">({count})</span>
    </button>
  {/each}
</div>

<style>
  input[type="range"] {
    -webkit-appearance: none;
  }

  input[type="range"]::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 14px;
    height: 14px;
    background: #4f46e5;
    border-radius: 50%;
    cursor: pointer;
  }

  input[type="range"]::-moz-range-thumb {
    width: 14px;
    height: 14px;
    background: #4f46e5;
    border-radius: 50%;
    cursor: pointer;
    border: none;
  }
</style>
