<script lang="ts">
  /**
   * GAP-3.1.1: Template Selector Component
   *
   * Displays available project templates grouped by category
   * and allows users to select one during project creation.
   */
  import {
    Globe,
    Shield,
    BookOpen,
    Server,
    Brain,
    RefreshCw,
    Bug,
    Zap,
    Layers,
    Settings,
    Bot,
    Check
  } from 'lucide-svelte';

  interface SwarmConfig {
    agents: Array<{ type: string; role: string; priority: number }>;
    topology: string;
    maxAgents: number;
    hiveMind: boolean;
    options?: Record<string, unknown>;
  }

  interface Template {
    id: string;
    slug: string;
    name: string;
    description: string;
    category: string;
    icon: string;
    swarmConfig: unknown; // Accept any JSON value from Prisma
  }

  interface Props {
    templates: Template[];
    templatesByCategory: Record<string, Template[]>;
    selectedTemplateId?: string | null;
    onSelect?: (templateId: string | null) => void;
  }

  // Type guard to safely cast swarmConfig
  function asSwarmConfig(config: unknown): SwarmConfig {
    const c = config as SwarmConfig;
    return {
      agents: c?.agents ?? [],
      topology: c?.topology ?? 'mesh',
      maxAgents: c?.maxAgents ?? 5,
      hiveMind: c?.hiveMind ?? false,
      options: c?.options
    };
  }

  let {
    templates,
    templatesByCategory,
    selectedTemplateId = $bindable(null),
    onSelect
  }: Props = $props();

  // Icon mapping
  const iconMap: Record<string, typeof Globe> = {
    globe: Globe,
    shield: Shield,
    'book-open': BookOpen,
    server: Server,
    brain: Brain,
    'refresh-cw': RefreshCw,
    bug: Bug,
    zap: Zap,
    layers: Layers,
    settings: Settings,
    bot: Bot
  };

  // Category display names
  const categoryNames: Record<string, string> = {
    development: 'Development',
    security: 'Security',
    documentation: 'Documentation',
    maintenance: 'Maintenance',
    other: 'Other'
  };

  // Category order for display
  const categoryOrder = ['development', 'security', 'documentation', 'maintenance', 'other'];

  function selectTemplate(templateId: string | null) {
    selectedTemplateId = templateId;
    onSelect?.(templateId);
  }

  function getIcon(iconName: string) {
    return iconMap[iconName] || Bot;
  }

  function formatAgentList(config: unknown): string {
    const c = asSwarmConfig(config);
    if (!c.agents || c.agents.length === 0) {
      return 'No agents pre-configured';
    }
    return c.agents.map(a => a.type).join(', ');
  }

  // Sort categories
  $effect(() => {
    // Ensure categories are sorted
  });
</script>

<div class="space-y-4">
  <div class="flex items-center justify-between">
    <h3 class="text-sm font-medium text-gray-700">Project Template</h3>
    {#if selectedTemplateId}
      <button
        type="button"
        onclick={() => selectTemplate(null)}
        class="text-xs text-blue-600 hover:text-blue-700"
      >
        Clear selection
      </button>
    {/if}
  </div>

  <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
    {#each categoryOrder as category}
      {#if templatesByCategory[category]}
        {#each templatesByCategory[category] as template}
          {@const Icon = getIcon(template.icon)}
          {@const isSelected = selectedTemplateId === template.id}
          {@const config = asSwarmConfig(template.swarmConfig)}

          <button
            type="button"
            onclick={() => selectTemplate(template.id)}
            class="relative flex flex-col items-start p-4 rounded-lg border-2 text-left transition-all duration-200
                   {isSelected
                     ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                     : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'}"
          >
            <!-- Selected indicator -->
            {#if isSelected}
              <div class="absolute top-2 right-2 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                <Check class="w-3 h-3 text-white" />
              </div>
            {/if}

            <!-- Icon and title -->
            <div class="flex items-center gap-2 mb-2">
              <div class="p-1.5 rounded-md {isSelected ? 'bg-blue-100' : 'bg-gray-100'}">
                <Icon class="w-4 h-4 {isSelected ? 'text-blue-600' : 'text-gray-600'}" />
              </div>
              <span class="font-medium text-gray-900 text-sm">{template.name}</span>
            </div>

            <!-- Description -->
            <p class="text-xs text-gray-500 line-clamp-2 mb-3">
              {template.description}
            </p>

            <!-- Agent preview -->
            <div class="mt-auto w-full">
              <div class="flex flex-wrap gap-1">
                {#if config.agents && config.agents.length > 0}
                  {#each config.agents.slice(0, 3) as agent}
                    <span class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium
                                 {isSelected ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}">
                      {agent.type}
                    </span>
                  {/each}
                  {#if config.agents.length > 3}
                    <span class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium
                                 {isSelected ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}">
                      +{config.agents.length - 3}
                    </span>
                  {/if}
                {:else}
                  <span class="text-[10px] text-gray-400 italic">Custom setup</span>
                {/if}
              </div>

              <!-- Topology indicator -->
              <div class="flex items-center gap-2 mt-2 text-[10px] text-gray-400">
                <span class="capitalize">{config.topology}</span>
                {#if config.hiveMind}
                  <span class="flex items-center gap-0.5">
                    <Brain class="w-3 h-3" />
                    Hive-Mind
                  </span>
                {/if}
              </div>
            </div>
          </button>
        {/each}
      {/if}
    {/each}
  </div>

  <!-- Hidden input for form submission -->
  <input type="hidden" name="templateId" value={selectedTemplateId ?? ''} />

  <!-- Selected template details -->
  {#if selectedTemplateId}
    {@const selected = templates.find(t => t.id === selectedTemplateId)}
    {#if selected}
      {@const config = asSwarmConfig(selected.swarmConfig)}
      <div class="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <h4 class="text-sm font-medium text-blue-900 mb-2">
          Selected: {selected.name}
        </h4>
        <div class="text-xs text-blue-700 space-y-1">
          <p><strong>Topology:</strong> {config.topology}</p>
          <p><strong>Max Agents:</strong> {config.maxAgents}</p>
          {#if config.agents && config.agents.length > 0}
            <p><strong>Agents:</strong> {formatAgentList(config)}</p>
          {/if}
          {#if config.hiveMind}
            <p class="flex items-center gap-1">
              <Brain class="w-3 h-3" />
              <strong>Hive-Mind:</strong> Enabled (consensus-based coordination)
            </p>
          {/if}
        </div>
      </div>
    {/if}
  {/if}
</div>

<style>
  .line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
</style>
