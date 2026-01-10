<script lang="ts">
	/**
	 * GAP-8.5: Contextual Suggestions on Ticket Creation
	 * GAP-3.2.7: Natural Language Task Parsing
	 *
	 * Displays contextual suggestions when creating tickets:
	 * - NLP-powered label suggestions (GAP-3.2.7)
	 * - Technical requirements extraction (GAP-3.2.7)
	 * - Routing hints identification (GAP-3.2.7)
	 * - Suggested agents based on ticket content
	 * - Topology recommendation with explanation
	 * - Similar past tickets with success rates
	 * - Pattern matches from learning system
	 */
	import { onMount, onDestroy, createEventDispatcher } from 'svelte';
	import { fade, slide } from 'svelte/transition';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Tooltip from '$lib/components/ui/Tooltip.svelte';
	import Skeleton from '$lib/components/ui/Skeleton.svelte';
	import {
		Bot,
		Network,
		History,
		TrendingUp,
		ChevronDown,
		ChevronUp,
		Users,
		GitBranch,
		Share2,
		User,
		Code,
		TestTube,
		Eye,
		Search,
		Building,
		Shield,
		Calendar,
		BookOpen,
		Sparkles,
		CheckCircle,
		AlertCircle,
		Brain,
		Target,
		FileText,
		Lightbulb,
		Tag,
		Zap,
		Plus
	} from 'lucide-svelte';

	// Props
	interface Props {
		title: string;
		description: string;
		priority?: string;
		labels?: string[];
		projectId?: string;
		debounceMs?: number;
		onLabelSuggestion?: (label: string) => void;
	}

	let {
		title = '',
		description = '',
		priority = 'MEDIUM',
		labels = [],
		projectId = '',
		debounceMs = 300,
		onLabelSuggestion
	}: Props = $props();

	const dispatch = createEventDispatcher<{
		labelSuggestion: { label: string };
	}>();

	// State
	let loading = $state(false);
	let nlpLoading = $state(false);
	let suggestions = $state<Suggestions | null>(null);
	let nlpResult = $state<NLPParseResult | null>(null);
	let error = $state<string | null>(null);
	let nlpError = $state<string | null>(null);
	let expanded = $state({
		nlp: true,
		requirements: true,
		routingHints: false,
		entities: false,
		agents: true,
		topology: true,
		similar: false,
		patterns: false
	});

	// GAP-3.2.7: NLP Parse Result Types
	interface TechnicalRequirement {
		description: string;
		category: 'functional' | 'non-functional' | 'constraint';
		priority: 'must-have' | 'should-have' | 'nice-to-have';
		relatedTo: string[];
	}

	interface RoutingHint {
		type: 'skill-required' | 'domain-expertise' | 'tool-usage' | 'security-concern' | 'performance-concern';
		description: string;
		suggestedAgents: string[];
		confidence: number;
	}

	interface Entity {
		name: string;
		type: 'file' | 'component' | 'api' | 'database' | 'service' | 'technology' | 'concept';
		context: string;
	}

	interface NLPParseResult {
		ticketType: string;
		confidence: number;
		suggestedLabels: string[];
		technicalRequirements: TechnicalRequirement[];
		routingHints: RoutingHint[];
		entities: Entity[];
		summary: string;
		estimatedComplexity: number;
		suggestedAgents: string[];
		suggestedTopology: string;
		nlpAvailable: boolean;
		processingTimeMs: number;
	}

	// Debounce timer
	let debounceTimer: ReturnType<typeof setTimeout> | null = null;

	// Types
	interface AgentSuggestion {
		id: string;
		name: string;
		role: 'coordinator' | 'worker';
		matchScore: number;
		capabilities: string[];
		icon: string;
		description: string;
	}

	interface TopologyRecommendation {
		topology: string;
		name: string;
		description: string;
		bestFor: string[];
		icon: string;
		confidence: number;
		reasoning: string[];
		alternatives: {
			topology: string;
			name: string;
			description: string;
		}[];
	}

	interface SimilarTicket {
		id: string;
		title: string;
		status: string;
		ticketType: string;
		similarity: number;
		successRate: number;
		completedAt?: string;
		agentsUsed: string[];
		topology?: string;
	}

	interface PatternMatch {
		id: string;
		keywords: string[];
		agents: string[];
		successRate: number;
		usageCount: number;
		topology?: string;
	}

	interface Suggestions {
		agents: AgentSuggestion[];
		topology: TopologyRecommendation | null;
		similarTickets: SimilarTicket[];
		patterns: PatternMatch[];
		ticketType: string;
		keywords: string[];
		confidence: number;
		suggestedLabels: string[];
	}

	// Icon components by name
	const iconComponents: Record<string, typeof Bot> = {
		code: Code,
		'test-tube': TestTube,
		eye: Eye,
		search: Search,
		building: Building,
		shield: Shield,
		calendar: Calendar,
		users: Users,
		book: BookOpen,
		bot: Bot,
		network: Network,
		'git-branch': GitBranch,
		'share-2': Share2,
		user: User
	};

	/**
	 * Fetch suggestions from API
	 */
	async function fetchSuggestions() {
		// Don't fetch if title is too short
		if (!title || title.trim().length < 3) {
			suggestions = null;
			return;
		}

		loading = true;
		error = null;

		try {
			const response = await fetch('/api/tickets/suggestions', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					title: title.trim(),
					description: description?.trim() || undefined,
					priority,
					labels,
					projectId: projectId || undefined
				})
			});

			if (!response.ok) {
				throw new Error('Failed to get suggestions');
			}

			const data = await response.json();
			suggestions = data;
		} catch (err) {
			console.error('Error fetching suggestions:', err);
			error = 'Unable to load suggestions';
		} finally {
			loading = false;
		}
	}

	/**
	 * GAP-3.2.7: Fetch NLP parsing results
	 */
	async function fetchNLPParse() {
		// Don't fetch if title is too short
		if (!title || title.trim().length < 3) {
			nlpResult = null;
			return;
		}

		nlpLoading = true;
		nlpError = null;

		try {
			const response = await fetch('/api/tickets/nlp-parse', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					title: title.trim(),
					description: description?.trim() || undefined
				})
			});

			if (!response.ok) {
				throw new Error('Failed to get NLP analysis');
			}

			const data = await response.json();
			nlpResult = data;
		} catch (err) {
			console.error('Error fetching NLP parse:', err);
			nlpError = 'Unable to analyze content';
		} finally {
			nlpLoading = false;
		}
	}

	/**
	 * Handle adding a suggested label
	 */
	function handleAddLabel(label: string) {
		if (onLabelSuggestion) {
			onLabelSuggestion(label);
		}
		dispatch('labelSuggestion', { label });
	}

	/**
	 * Get priority badge color
	 */
	function getPriorityColor(priority: string): string {
		switch (priority) {
			case 'must-have':
				return 'bg-red-100 text-red-700';
			case 'should-have':
				return 'bg-yellow-100 text-yellow-700';
			case 'nice-to-have':
				return 'bg-green-100 text-green-700';
			default:
				return 'bg-gray-100 text-gray-700';
		}
	}

	/**
	 * Get routing hint type color
	 */
	function getHintTypeColor(type: RoutingHint['type']): string {
		switch (type) {
			case 'security-concern':
				return 'bg-red-100 text-red-700';
			case 'performance-concern':
				return 'bg-orange-100 text-orange-700';
			case 'skill-required':
				return 'bg-blue-100 text-blue-700';
			case 'domain-expertise':
				return 'bg-purple-100 text-purple-700';
			case 'tool-usage':
				return 'bg-green-100 text-green-700';
			default:
				return 'bg-gray-100 text-gray-700';
		}
	}

	/**
	 * Get entity type icon
	 */
	function getEntityIcon(type: Entity['type']) {
		switch (type) {
			case 'file':
				return FileText;
			case 'component':
				return Code;
			case 'api':
				return Network;
			case 'database':
				return Building;
			case 'service':
				return Users;
			case 'technology':
				return Zap;
			default:
				return Lightbulb;
		}
	}

	/**
	 * Format hint type for display
	 */
	function formatHintType(type: RoutingHint['type']): string {
		return type.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
	}

	/**
	 * Debounced fetch on input changes
	 */
	function debouncedFetch() {
		if (debounceTimer) {
			clearTimeout(debounceTimer);
		}

		debounceTimer = setTimeout(() => {
			// Fetch both suggestions and NLP analysis in parallel
			fetchSuggestions();
			fetchNLPParse();
		}, debounceMs);
	}

	// Watch for input changes
	$effect(() => {
		// Trigger on title or description changes
		title;
		description;
		debouncedFetch();
	});

	// Cleanup on destroy
	onDestroy(() => {
		if (debounceTimer) {
			clearTimeout(debounceTimer);
		}
	});

	/**
	 * Toggle section expansion
	 */
	function toggleSection(section: keyof typeof expanded) {
		expanded[section] = !expanded[section];
	}

	/**
	 * Format percentage for display
	 */
	function formatPercent(value: number): string {
		return `${Math.round(value * 100)}%`;
	}

	/**
	 * Get color class for success rate
	 */
	function getSuccessColor(rate: number): string {
		if (rate >= 0.8) return 'text-green-600';
		if (rate >= 0.6) return 'text-yellow-600';
		return 'text-red-600';
	}

	/**
	 * Get background color for match score
	 */
	function getMatchBackground(score: number): string {
		if (score >= 0.7) return 'bg-green-100';
		if (score >= 0.4) return 'bg-yellow-100';
		return 'bg-gray-100';
	}

	/**
	 * Get icon component for agent or topology
	 */
	function getIconComponent(iconName: string) {
		return iconComponents[iconName] || Bot;
	}
</script>

<!-- Suggestions Panel -->
{#if title.trim().length >= 3}
	<div class="mt-4 border-t pt-4" transition:fade={{ duration: 150 }}>
		<div class="flex items-center gap-2 mb-3">
			<Sparkles class="w-4 h-4 text-purple-500" />
			<h3 class="text-sm font-medium text-gray-700">AI Suggestions</h3>
			{#if loading || nlpLoading}
				<div class="ml-2">
					<div class="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
				</div>
			{/if}
		</div>

		{#if error && nlpError}
			<div class="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-2 rounded">
				<AlertCircle class="w-4 h-4" />
				{error}
			</div>
		{:else if (loading && !suggestions) && (nlpLoading && !nlpResult)}
			<!-- Loading skeleton -->
			<div class="space-y-3">
				<Skeleton className="h-16 w-full" />
				<Skeleton className="h-12 w-full" />
			</div>
		{:else}
			<div class="space-y-3">
				<!-- GAP-3.2.7: NLP Analysis Section -->
				{#if nlpResult}
					<!-- NLP Summary and Labels -->
					<div class="bg-indigo-50 rounded-lg overflow-hidden">
						<button
							type="button"
							class="w-full flex items-center justify-between p-3 hover:bg-indigo-100 transition-colors"
							onclick={() => toggleSection('nlp')}
						>
							<div class="flex items-center gap-2">
								<Brain class="w-4 h-4 text-indigo-600" />
								<span class="text-sm font-medium text-indigo-800">NLP Analysis</span>
								{#if nlpResult.nlpAvailable}
									<Badge variant="default" class="text-xs bg-indigo-100 text-indigo-700">
										{formatPercent(nlpResult.confidence)} confidence
									</Badge>
								{:else}
									<Badge variant="secondary" class="text-xs">
										Fallback Mode
									</Badge>
								{/if}
							</div>
							{#if expanded.nlp}
								<ChevronUp class="w-4 h-4 text-indigo-600" />
							{:else}
								<ChevronDown class="w-4 h-4 text-indigo-600" />
							{/if}
						</button>

						{#if expanded.nlp}
							<div class="px-3 pb-3 space-y-3" transition:slide={{ duration: 150 }}>
								<!-- Summary -->
								<div class="p-2 bg-white rounded border border-indigo-200">
									<div class="flex items-center gap-2 mb-1">
										<Target class="w-4 h-4 text-indigo-600" />
										<span class="text-sm font-medium text-gray-900">Summary</span>
									</div>
									<p class="text-sm text-gray-600">{nlpResult.summary}</p>
									<div class="flex items-center gap-2 mt-2">
										<Badge variant="secondary" class="text-xs">
											{nlpResult.ticketType}
										</Badge>
										<span class="text-xs text-gray-500">
											Complexity: {nlpResult.estimatedComplexity}/10
										</span>
										{#if nlpResult.processingTimeMs}
											<span class="text-xs text-gray-400 ml-auto">
												{nlpResult.processingTimeMs}ms
											</span>
										{/if}
									</div>
								</div>

								<!-- Suggested Labels -->
								{#if nlpResult.suggestedLabels.length > 0}
									<div class="p-2 bg-white rounded border border-indigo-200">
										<div class="flex items-center gap-2 mb-2">
											<Tag class="w-4 h-4 text-indigo-600" />
											<span class="text-sm font-medium text-gray-900">Suggested Labels</span>
										</div>
										<div class="flex flex-wrap gap-1">
											{#each nlpResult.suggestedLabels as label}
												{@const isAlreadyAdded = labels.includes(label)}
												<button
													type="button"
													class="inline-flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors
														{isAlreadyAdded
															? 'bg-indigo-200 text-indigo-800 cursor-default'
															: 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200 cursor-pointer'}"
													onclick={() => !isAlreadyAdded && handleAddLabel(label)}
													disabled={isAlreadyAdded}
												>
													{label}
													{#if !isAlreadyAdded}
														<Plus class="w-3 h-3" />
													{:else}
														<CheckCircle class="w-3 h-3" />
													{/if}
												</button>
											{/each}
										</div>
									</div>
								{/if}
							</div>
						{/if}
					</div>

					<!-- Technical Requirements Section -->
					{#if nlpResult.technicalRequirements.length > 0}
						<div class="bg-teal-50 rounded-lg overflow-hidden">
							<button
								type="button"
								class="w-full flex items-center justify-between p-3 hover:bg-teal-100 transition-colors"
								onclick={() => toggleSection('requirements')}
							>
								<div class="flex items-center gap-2">
									<FileText class="w-4 h-4 text-teal-600" />
									<span class="text-sm font-medium text-teal-800">Technical Requirements</span>
									<Badge variant="default" class="text-xs bg-teal-100 text-teal-700">
										{nlpResult.technicalRequirements.length}
									</Badge>
								</div>
								{#if expanded.requirements}
									<ChevronUp class="w-4 h-4 text-teal-600" />
								{:else}
									<ChevronDown class="w-4 h-4 text-teal-600" />
								{/if}
							</button>

							{#if expanded.requirements}
								<div class="px-3 pb-3 space-y-2" transition:slide={{ duration: 150 }}>
									{#each nlpResult.technicalRequirements as req, i}
										<div class="p-2 bg-white rounded border border-teal-200">
											<div class="flex items-start justify-between gap-2">
												<p class="text-sm text-gray-700 flex-1">{req.description}</p>
												<Badge variant="secondary" class="text-xs flex-shrink-0 {getPriorityColor(req.priority)}">
													{req.priority}
												</Badge>
											</div>
											<div class="flex items-center gap-2 mt-2">
												<span class="text-xs text-gray-500 capitalize">{req.category}</span>
												{#if req.relatedTo.length > 0}
													<span class="text-xs text-gray-400">|</span>
													{#each req.relatedTo.slice(0, 3) as tech}
														<span class="text-xs bg-teal-100 text-teal-700 px-1.5 py-0.5 rounded">
															{tech}
														</span>
													{/each}
												{/if}
											</div>
										</div>
									{/each}
								</div>
							{/if}
						</div>
					{/if}

					<!-- Routing Hints Section -->
					{#if nlpResult.routingHints.length > 0}
						<div class="bg-rose-50 rounded-lg overflow-hidden">
							<button
								type="button"
								class="w-full flex items-center justify-between p-3 hover:bg-rose-100 transition-colors"
								onclick={() => toggleSection('routingHints')}
							>
								<div class="flex items-center gap-2">
									<Lightbulb class="w-4 h-4 text-rose-600" />
									<span class="text-sm font-medium text-rose-800">Routing Hints</span>
									<Badge variant="default" class="text-xs bg-rose-100 text-rose-700">
										{nlpResult.routingHints.length}
									</Badge>
								</div>
								{#if expanded.routingHints}
									<ChevronUp class="w-4 h-4 text-rose-600" />
								{:else}
									<ChevronDown class="w-4 h-4 text-rose-600" />
								{/if}
							</button>

							{#if expanded.routingHints}
								<div class="px-3 pb-3 space-y-2" transition:slide={{ duration: 150 }}>
									{#each nlpResult.routingHints as hint}
										<div class="p-2 bg-white rounded border border-rose-200">
											<div class="flex items-center gap-2 mb-1">
												<Badge variant="secondary" class="text-xs {getHintTypeColor(hint.type)}">
													{formatHintType(hint.type)}
												</Badge>
												<span class="text-xs {getSuccessColor(hint.confidence)}">
													{formatPercent(hint.confidence)} confidence
												</span>
											</div>
											<p class="text-sm text-gray-700">{hint.description}</p>
											{#if hint.suggestedAgents.length > 0}
												<div class="flex items-center gap-1 mt-2">
													<Bot class="w-3 h-3 text-gray-500" />
													<span class="text-xs text-gray-500">
														{hint.suggestedAgents.join(', ')}
													</span>
												</div>
											{/if}
										</div>
									{/each}
								</div>
							{/if}
						</div>
					{/if}

					<!-- Entities Section -->
					{#if nlpResult.entities.length > 0}
						<div class="bg-cyan-50 rounded-lg overflow-hidden">
							<button
								type="button"
								class="w-full flex items-center justify-between p-3 hover:bg-cyan-100 transition-colors"
								onclick={() => toggleSection('entities')}
							>
								<div class="flex items-center gap-2">
									<Zap class="w-4 h-4 text-cyan-600" />
									<span class="text-sm font-medium text-cyan-800">Detected Entities</span>
									<Badge variant="default" class="text-xs bg-cyan-100 text-cyan-700">
										{nlpResult.entities.length}
									</Badge>
								</div>
								{#if expanded.entities}
									<ChevronUp class="w-4 h-4 text-cyan-600" />
								{:else}
									<ChevronDown class="w-4 h-4 text-cyan-600" />
								{/if}
							</button>

							{#if expanded.entities}
								<div class="px-3 pb-3 space-y-2" transition:slide={{ duration: 150 }}>
									{#each nlpResult.entities as entity}
										<div class="flex items-start gap-2 p-2 bg-white rounded border border-cyan-200">
											<div class="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded bg-cyan-100">
												<svelte:component
													this={getEntityIcon(entity.type)}
													class="w-3 h-3 text-cyan-700"
												/>
											</div>
											<div class="flex-1 min-w-0">
												<div class="flex items-center gap-2">
													<span class="text-sm font-medium text-gray-900">{entity.name}</span>
													<Badge variant="secondary" class="text-xs capitalize">
														{entity.type}
													</Badge>
												</div>
												{#if entity.context}
													<p class="text-xs text-gray-500 truncate">{entity.context}</p>
												{/if}
											</div>
										</div>
									{/each}
								</div>
							{/if}
						</div>
					{/if}
				{:else if nlpLoading}
					<!-- NLP Loading -->
					<div class="bg-indigo-50 rounded-lg p-3">
						<div class="flex items-center gap-2">
							<Brain class="w-4 h-4 text-indigo-600" />
							<span class="text-sm text-indigo-700">Analyzing with NLP...</span>
							<div class="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
						</div>
					</div>
				{:else if nlpError}
					<div class="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 p-2 rounded">
						<AlertCircle class="w-4 h-4" />
						{nlpError}
					</div>
				{/if}
			{#if suggestions}
				<!-- Suggested Agents Section -->
				{#if suggestions.agents.length > 0}
					<div class="bg-blue-50 rounded-lg overflow-hidden">
						<button
							type="button"
							class="w-full flex items-center justify-between p-3 hover:bg-blue-100 transition-colors"
							onclick={() => toggleSection('agents')}
						>
							<div class="flex items-center gap-2">
								<Bot class="w-4 h-4 text-blue-600" />
								<span class="text-sm font-medium text-blue-800">Suggested Agents</span>
								<Badge variant="default" class="text-xs">
									{suggestions.agents.length}
								</Badge>
							</div>
							{#if expanded.agents}
								<ChevronUp class="w-4 h-4 text-blue-600" />
							{:else}
								<ChevronDown class="w-4 h-4 text-blue-600" />
							{/if}
						</button>

						{#if expanded.agents}
							<div class="px-3 pb-3 space-y-2" transition:slide={{ duration: 150 }}>
								{#each suggestions.agents as agent (agent.id)}
									<div class="flex items-start gap-2 p-2 bg-white rounded border border-blue-200">
										<div class="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full {getMatchBackground(agent.matchScore)}">
											<svelte:component
												this={getIconComponent(agent.icon)}
												class="w-4 h-4 text-gray-700"
											/>
										</div>
										<div class="flex-1 min-w-0">
											<div class="flex items-center gap-2">
												<span class="text-sm font-medium text-gray-900">{agent.name}</span>
												{#if agent.role === 'coordinator'}
													<Badge variant="warning" class="text-xs">Coordinator</Badge>
												{/if}
												<span class="text-xs {getSuccessColor(agent.matchScore)}">
													{formatPercent(agent.matchScore)} match
												</span>
											</div>
											<p class="text-xs text-gray-600 truncate">{agent.description}</p>
											{#if agent.capabilities.length > 0}
												<div class="flex flex-wrap gap-1 mt-1">
													{#each agent.capabilities.slice(0, 3) as cap}
														<span class="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
															{cap}
														</span>
													{/each}
												</div>
											{/if}
										</div>
									</div>
								{/each}
							</div>
						{/if}
					</div>
				{/if}

				<!-- Topology Recommendation Section -->
				{#if suggestions.topology}
					<div class="bg-purple-50 rounded-lg overflow-hidden">
						<button
							type="button"
							class="w-full flex items-center justify-between p-3 hover:bg-purple-100 transition-colors"
							onclick={() => toggleSection('topology')}
						>
							<div class="flex items-center gap-2">
								<Network class="w-4 h-4 text-purple-600" />
								<span class="text-sm font-medium text-purple-800">Recommended Topology</span>
								<Badge variant="secondary" class="text-xs">
									{suggestions.topology.name}
								</Badge>
							</div>
							{#if expanded.topology}
								<ChevronUp class="w-4 h-4 text-purple-600" />
							{:else}
								<ChevronDown class="w-4 h-4 text-purple-600" />
							{/if}
						</button>

						{#if expanded.topology}
							<div class="px-3 pb-3" transition:slide={{ duration: 150 }}>
								<div class="p-2 bg-white rounded border border-purple-200">
									<div class="flex items-center gap-2 mb-2">
										<svelte:component
											this={getIconComponent(suggestions.topology.icon)}
											class="w-5 h-5 text-purple-600"
										/>
										<span class="font-medium text-gray-900">{suggestions.topology.name}</span>
										<span class="text-xs text-purple-600">
											{formatPercent(suggestions.topology.confidence)} confidence
										</span>
									</div>
									<p class="text-sm text-gray-600 mb-2">{suggestions.topology.description}</p>

									<!-- Best For -->
									<div class="mb-2">
										<span class="text-xs font-medium text-gray-500">Best for:</span>
										<div class="flex flex-wrap gap-1 mt-1">
											{#each suggestions.topology.bestFor.slice(0, 3) as use}
												<span class="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">
													{use}
												</span>
											{/each}
										</div>
									</div>

									<!-- Reasoning -->
									{#if suggestions.topology.reasoning.length > 0}
										<div class="text-xs text-gray-500 mt-2 pt-2 border-t">
											<span class="font-medium">Why: </span>
											{suggestions.topology.reasoning[0]}
										</div>
									{/if}

									<!-- Alternatives -->
									{#if suggestions.topology.alternatives.length > 0}
										<div class="mt-2 pt-2 border-t">
											<span class="text-xs font-medium text-gray-500">Alternatives:</span>
											<div class="flex gap-2 mt-1">
												{#each suggestions.topology.alternatives as alt}
													<Tooltip content={alt.description} position="top">
														<span class="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded cursor-help">
															{alt.name}
														</span>
													</Tooltip>
												{/each}
											</div>
										</div>
									{/if}
								</div>
							</div>
						{/if}
					</div>
				{/if}

				<!-- Similar Past Tickets Section -->
				{#if suggestions.similarTickets.length > 0}
					<div class="bg-green-50 rounded-lg overflow-hidden">
						<button
							type="button"
							class="w-full flex items-center justify-between p-3 hover:bg-green-100 transition-colors"
							onclick={() => toggleSection('similar')}
						>
							<div class="flex items-center gap-2">
								<History class="w-4 h-4 text-green-600" />
								<span class="text-sm font-medium text-green-800">Similar Past Tickets</span>
								<Badge variant="default" class="text-xs bg-green-100 text-green-800 border-green-200">
									{suggestions.similarTickets.length}
								</Badge>
							</div>
							{#if expanded.similar}
								<ChevronUp class="w-4 h-4 text-green-600" />
							{:else}
								<ChevronDown class="w-4 h-4 text-green-600" />
							{/if}
						</button>

						{#if expanded.similar}
							<div class="px-3 pb-3 space-y-2" transition:slide={{ duration: 150 }}>
								{#each suggestions.similarTickets as ticket (ticket.id)}
									<div class="p-2 bg-white rounded border border-green-200">
										<div class="flex items-start justify-between gap-2">
											<div class="flex-1 min-w-0">
												<div class="flex items-center gap-2">
													<CheckCircle class="w-3 h-3 text-green-500 flex-shrink-0" />
													<span class="text-sm font-medium text-gray-900 truncate">
														{ticket.title}
													</span>
												</div>
												<div class="flex items-center gap-2 mt-1">
													<span class="text-xs text-gray-500">
														{formatPercent(ticket.similarity)} similar
													</span>
													<span class="text-xs {getSuccessColor(ticket.successRate)}">
														{formatPercent(ticket.successRate)} success
													</span>
													{#if ticket.topology}
														<span class="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
															{ticket.topology}
														</span>
													{/if}
												</div>
											</div>
											<Badge variant="secondary" class="text-xs flex-shrink-0">
												{ticket.ticketType}
											</Badge>
										</div>
										{#if ticket.agentsUsed.length > 0}
											<div class="flex flex-wrap gap-1 mt-2">
												{#each ticket.agentsUsed.slice(0, 3) as agent}
													<span class="text-xs bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">
														{agent}
													</span>
												{/each}
												{#if ticket.agentsUsed.length > 3}
													<span class="text-xs text-gray-500">
														+{ticket.agentsUsed.length - 3} more
													</span>
												{/if}
											</div>
										{/if}
									</div>
								{/each}
							</div>
						{/if}
					</div>
				{/if}

				<!-- Pattern Matches Section -->
				{#if suggestions.patterns.length > 0}
					<div class="bg-orange-50 rounded-lg overflow-hidden">
						<button
							type="button"
							class="w-full flex items-center justify-between p-3 hover:bg-orange-100 transition-colors"
							onclick={() => toggleSection('patterns')}
						>
							<div class="flex items-center gap-2">
								<TrendingUp class="w-4 h-4 text-orange-600" />
								<span class="text-sm font-medium text-orange-800">Learned Patterns</span>
								<Badge variant="warning" class="text-xs">
									{suggestions.patterns.length}
								</Badge>
							</div>
							{#if expanded.patterns}
								<ChevronUp class="w-4 h-4 text-orange-600" />
							{:else}
								<ChevronDown class="w-4 h-4 text-orange-600" />
							{/if}
						</button>

						{#if expanded.patterns}
							<div class="px-3 pb-3 space-y-2" transition:slide={{ duration: 150 }}>
								{#each suggestions.patterns as pattern (pattern.id)}
									<div class="p-2 bg-white rounded border border-orange-200">
										<div class="flex items-center justify-between mb-1">
											<span class="text-sm font-medium text-gray-900 truncate">
												{pattern.id}
											</span>
											<div class="flex items-center gap-2">
												<span class="text-xs {getSuccessColor(pattern.successRate)}">
													{formatPercent(pattern.successRate)} success
												</span>
												<span class="text-xs text-gray-500">
													{pattern.usageCount} uses
												</span>
											</div>
										</div>
										<div class="flex flex-wrap gap-1 mt-1">
											{#each pattern.keywords.slice(0, 4) as keyword}
												<span class="text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded">
													{keyword}
												</span>
											{/each}
										</div>
										{#if pattern.agents.length > 0}
											<div class="flex items-center gap-1 mt-2 text-xs text-gray-600">
												<Bot class="w-3 h-3" />
												<span>{pattern.agents.join(', ')}</span>
											</div>
										{/if}
									</div>
								{/each}
							</div>
						{/if}
					</div>
				{/if}

				<!-- Keywords and Labels -->
				{#if suggestions.keywords.length > 0 || suggestions.suggestedLabels.length > 0}
					<div class="flex flex-wrap gap-2 pt-2 border-t">
						{#if suggestions.keywords.length > 0}
							<div class="flex items-center gap-1">
								<span class="text-xs text-gray-500">Keywords:</span>
								{#each suggestions.keywords.slice(0, 4) as keyword}
									<span class="text-xs bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded">
										{keyword}
									</span>
								{/each}
							</div>
						{/if}
						{#if suggestions.suggestedLabels.length > 0}
							<div class="flex items-center gap-1 ml-auto">
								<span class="text-xs text-gray-500">Suggested:</span>
								{#each suggestions.suggestedLabels.slice(0, 3) as label}
									<Badge variant="outline" class="text-xs">{label}</Badge>
								{/each}
							</div>
						{/if}
					</div>
				{/if}
			{/if}
			</div>
		{/if}
	</div>
{/if}
