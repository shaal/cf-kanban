<script lang="ts">
	/**
	 * Neural Training Progress Dashboard
	 * GAP-3.4.1: Neural Training Progress Dashboard Data
	 *
	 * Displays training progress indicators, loss/accuracy metrics visualization,
	 * training history charts, and pattern recognition statistics.
	 */
	import { cn } from '$lib/utils';
	import Card from '$lib/components/ui/Card.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import {
		Brain,
		Activity,
		TrendingDown,
		TrendingUp,
		Clock,
		CheckCircle2,
		XCircle,
		Loader2,
		Pause,
		Play,
		RefreshCw,
		Layers,
		Zap,
		Target,
		BarChart3
	} from 'lucide-svelte';
	import type {
		NeuralTrainingStatus,
		TrainingMetrics,
		TrainingHistory,
		SONAMetrics,
		EWCMetrics,
		ExpertStats,
		IntelligenceStatus
	} from '$lib/types/neural';

	interface Props {
		trainingStatus: NeuralTrainingStatus;
		currentMetrics: TrainingMetrics[];
		trainingHistory: TrainingHistory[];
		sonaMetrics?: SONAMetrics;
		ewcMetrics?: EWCMetrics;
		expertStats?: ExpertStats[];
		intelligenceStatus?: IntelligenceStatus;
		onPause?: () => void;
		onResume?: () => void;
		onRefresh?: () => void;
		class?: string;
	}

	let {
		trainingStatus,
		currentMetrics,
		trainingHistory,
		sonaMetrics,
		ewcMetrics,
		expertStats = [],
		intelligenceStatus,
		onPause,
		onResume,
		onRefresh,
		class: className = ''
	}: Props = $props();

	// Chart dimensions
	const chartWidth = 400;
	const chartHeight = 200;
	const padding = { top: 20, right: 50, bottom: 30, left: 50 };
	const innerWidth = chartWidth - padding.left - padding.right;
	const innerHeight = chartHeight - padding.top - padding.bottom;

	// Latest metrics
	const latestMetrics = $derived(
		currentMetrics.length > 0 ? currentMetrics[currentMetrics.length - 1] : null
	);
	const previousMetrics = $derived(
		currentMetrics.length > 1 ? currentMetrics[currentMetrics.length - 2] : null
	);

	// Progress calculations
	const progressPercentage = $derived(
		trainingStatus.totalEpochs && trainingStatus.currentEpoch
			? Math.round((trainingStatus.currentEpoch / trainingStatus.totalEpochs) * 100)
			: 0
	);

	// Loss trend
	const lossImproving = $derived(
		latestMetrics && previousMetrics ? latestMetrics.loss < previousMetrics.loss : false
	);
	const accuracyImproving = $derived(
		latestMetrics && previousMetrics ? latestMetrics.accuracy > previousMetrics.accuracy : false
	);

	// Scale functions for chart
	function scaleX(epoch: number): number {
		if (currentMetrics.length <= 1) return padding.left;
		const maxEpoch = Math.max(...currentMetrics.map(m => m.epoch));
		return padding.left + (epoch / maxEpoch) * innerWidth;
	}

	function scaleLossY(loss: number): number {
		const maxLoss = Math.max(...currentMetrics.map(m => m.loss), 1);
		return padding.top + innerHeight - (loss / maxLoss) * innerHeight;
	}

	function scaleAccY(acc: number): number {
		return padding.top + innerHeight - acc * innerHeight;
	}

	// Generate path data
	const lossPath = $derived(() => {
		if (currentMetrics.length === 0) return '';
		const maxLoss = Math.max(...currentMetrics.map(m => m.loss), 1);
		return currentMetrics
			.map((m, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(m.epoch)} ${scaleLossY(m.loss)}`)
			.join(' ');
	});

	const accuracyPath = $derived(() => {
		if (currentMetrics.length === 0) return '';
		return currentMetrics
			.map((m, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(m.epoch)} ${scaleAccY(m.accuracy)}`)
			.join(' ');
	});

	// Format helpers
	function formatDuration(ms: number): string {
		const seconds = Math.floor(ms / 1000);
		if (seconds < 60) return `${seconds}s`;
		const minutes = Math.floor(seconds / 60);
		if (minutes < 60) return `${minutes}m ${seconds % 60}s`;
		const hours = Math.floor(minutes / 60);
		return `${hours}h ${minutes % 60}m`;
	}

	function formatTimestamp(ts: number): string {
		return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
	}

	// History stats
	const completedTrainings = $derived(
		trainingHistory.filter(h => h.status === 'completed').length
	);
	const avgFinalLoss = $derived(() => {
		const completed = trainingHistory.filter(h => h.status === 'completed' && h.finalLoss !== undefined);
		if (completed.length === 0) return 0;
		return completed.reduce((sum, h) => sum + (h.finalLoss || 0), 0) / completed.length;
	});
</script>

<div class={cn('neural-training-dashboard', className)}>
	<!-- Header with Status -->
	<Card class="p-4 mb-4">
		<div class="flex items-center justify-between">
			<div class="flex items-center gap-3">
				<div class={cn(
					'p-2 rounded-lg',
					trainingStatus.isTraining ? 'bg-blue-100' : 'bg-gray-100'
				)}>
					<Brain class={cn(
						'w-5 h-5',
						trainingStatus.isTraining ? 'text-blue-600 animate-pulse' : 'text-gray-500'
					)} />
				</div>
				<div>
					<h2 class="text-lg font-semibold text-gray-900">Neural Training Dashboard</h2>
					<p class="text-sm text-gray-500">
						{trainingStatus.isTraining
							? `Training epoch ${trainingStatus.currentEpoch || 0} of ${trainingStatus.totalEpochs || 0}`
							: 'No active training session'}
					</p>
				</div>
			</div>
			<div class="flex items-center gap-2">
				{#if trainingStatus.isTraining}
					<Badge variant="default" class="animate-pulse">
						<Activity class="w-3 h-3 mr-1" />
						Training
					</Badge>
					<Button variant="outline" size="sm" onclick={onPause}>
						<Pause class="w-4 h-4" />
					</Button>
				{:else}
					<Badge variant="secondary">Idle</Badge>
					{#if onResume}
						<Button variant="outline" size="sm" onclick={onResume}>
							<Play class="w-4 h-4" />
						</Button>
					{/if}
				{/if}
				<Button variant="ghost" size="icon" onclick={onRefresh}>
					<RefreshCw class="w-4 h-4" />
				</Button>
			</div>
		</div>

		<!-- Progress Bar -->
		{#if trainingStatus.isTraining}
			<div class="mt-4">
				<div class="flex items-center justify-between text-sm mb-1">
					<span class="text-gray-600">Progress</span>
					<span class="font-medium text-gray-900">{progressPercentage}%</span>
				</div>
				<div class="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
					<div
						class="h-full bg-blue-600 rounded-full transition-all duration-300"
						style="width: {progressPercentage}%"
					></div>
				</div>
				{#if trainingStatus.estimatedTimeRemaining}
					<p class="text-xs text-gray-500 mt-1">
						Estimated time remaining: {formatDuration(trainingStatus.estimatedTimeRemaining)}
					</p>
				{/if}
			</div>
		{/if}
	</Card>

	<!-- Main Grid -->
	<div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
		<!-- Training Metrics Chart -->
		<Card class="p-4">
			<div class="flex items-center justify-between mb-4">
				<h3 class="font-semibold text-gray-900">Training Metrics</h3>
				{#if latestMetrics}
					<div class="flex items-center gap-4 text-sm">
						<div class="flex items-center gap-1">
							{#if lossImproving}
								<TrendingDown class="w-4 h-4 text-green-500" />
							{:else}
								<TrendingUp class="w-4 h-4 text-red-500" />
							{/if}
							<span class="text-gray-600">Loss:</span>
							<span class="font-medium text-rose-600">{latestMetrics.loss.toFixed(4)}</span>
						</div>
						<div class="flex items-center gap-1">
							{#if accuracyImproving}
								<TrendingUp class="w-4 h-4 text-green-500" />
							{:else}
								<TrendingDown class="w-4 h-4 text-red-500" />
							{/if}
							<span class="text-gray-600">Accuracy:</span>
							<span class="font-medium text-blue-600">{(latestMetrics.accuracy * 100).toFixed(1)}%</span>
						</div>
					</div>
				{/if}
			</div>

			{#if currentMetrics.length === 0}
				<div class="flex items-center justify-center h-48 bg-gray-50 rounded-lg border border-dashed border-gray-300">
					<div class="text-center">
						<BarChart3 class="w-8 h-8 text-gray-300 mx-auto mb-2" />
						<p class="text-gray-500 text-sm">No training data available</p>
					</div>
				</div>
			{:else}
				<svg viewBox="0 0 {chartWidth} {chartHeight}" class="w-full" style="max-height: 200px">
					<!-- Grid lines -->
					{#each [0, 0.25, 0.5, 0.75, 1] as tick}
						<line
							x1={padding.left}
							y1={padding.top + tick * innerHeight}
							x2={padding.left + innerWidth}
							y2={padding.top + tick * innerHeight}
							stroke="#e5e7eb"
							stroke-dasharray="4,4"
						/>
					{/each}

					<!-- Loss line -->
					<path
						d={lossPath()}
						fill="none"
						stroke="#f43f5e"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					/>

					<!-- Accuracy line -->
					<path
						d={accuracyPath()}
						fill="none"
						stroke="#3b82f6"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					/>

					<!-- Data points -->
					{#each currentMetrics as m}
						<circle
							cx={scaleX(m.epoch)}
							cy={scaleLossY(m.loss)}
							r="3"
							fill="#f43f5e"
						/>
						<circle
							cx={scaleX(m.epoch)}
							cy={scaleAccY(m.accuracy)}
							r="3"
							fill="#3b82f6"
						/>
					{/each}

					<!-- Axis labels -->
					<text
						x={padding.left + innerWidth / 2}
						y={chartHeight - 5}
						text-anchor="middle"
						class="text-xs fill-gray-600"
					>
						Epoch
					</text>
				</svg>

				<!-- Legend -->
				<div class="flex items-center justify-center gap-6 mt-2">
					<div class="flex items-center gap-2">
						<div class="w-3 h-0.5 bg-rose-500 rounded"></div>
						<span class="text-xs text-gray-600">Loss</span>
					</div>
					<div class="flex items-center gap-2">
						<div class="w-3 h-0.5 bg-blue-500 rounded"></div>
						<span class="text-xs text-gray-600">Accuracy</span>
					</div>
				</div>
			{/if}
		</Card>

		<!-- Intelligence Status -->
		<Card class="p-4">
			<h3 class="font-semibold text-gray-900 mb-4">Intelligence System Status</h3>

			{#if intelligenceStatus}
				<div class="grid grid-cols-2 gap-4">
					<div class="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
						<div class={cn(
							'p-2 rounded-lg',
							intelligenceStatus.sonaEnabled ? 'bg-green-100' : 'bg-gray-100'
						)}>
							<Zap class={cn(
								'w-4 h-4',
								intelligenceStatus.sonaEnabled ? 'text-green-600' : 'text-gray-400'
							)} />
						</div>
						<div>
							<p class="text-sm font-medium text-gray-900">SONA</p>
							<p class="text-xs text-gray-500">
								{intelligenceStatus.sonaEnabled ? 'Active' : 'Disabled'}
							</p>
						</div>
					</div>

					<div class="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
						<div class={cn(
							'p-2 rounded-lg',
							intelligenceStatus.moeEnabled ? 'bg-purple-100' : 'bg-gray-100'
						)}>
							<Layers class={cn(
								'w-4 h-4',
								intelligenceStatus.moeEnabled ? 'text-purple-600' : 'text-gray-400'
							)} />
						</div>
						<div>
							<p class="text-sm font-medium text-gray-900">MoE</p>
							<p class="text-xs text-gray-500">
								{intelligenceStatus.moeEnabled ? 'Active' : 'Disabled'}
							</p>
						</div>
					</div>

					<div class="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
						<div class={cn(
							'p-2 rounded-lg',
							intelligenceStatus.hnswEnabled ? 'bg-cyan-100' : 'bg-gray-100'
						)}>
							<Target class={cn(
								'w-4 h-4',
								intelligenceStatus.hnswEnabled ? 'text-cyan-600' : 'text-gray-400'
							)} />
						</div>
						<div>
							<p class="text-sm font-medium text-gray-900">HNSW</p>
							<p class="text-xs text-gray-500">
								{intelligenceStatus.hnswEnabled ? `${intelligenceStatus.avgQueryTime.toFixed(2)}ms avg` : 'Disabled'}
							</p>
						</div>
					</div>

					<div class="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
						<div class={cn(
							'p-2 rounded-lg',
							intelligenceStatus.ewcEnabled ? 'bg-amber-100' : 'bg-gray-100'
						)}>
							<Brain class={cn(
								'w-4 h-4',
								intelligenceStatus.ewcEnabled ? 'text-amber-600' : 'text-gray-400'
							)} />
						</div>
						<div>
							<p class="text-sm font-medium text-gray-900">EWC++</p>
							<p class="text-xs text-gray-500">
								{intelligenceStatus.ewcEnabled ? 'Active' : 'Disabled'}
							</p>
						</div>
					</div>
				</div>

				<div class="mt-4 p-3 bg-blue-50 rounded-lg">
					<div class="flex items-center justify-between">
						<span class="text-sm text-blue-800">Patterns Indexed</span>
						<span class="font-semibold text-blue-900">
							{intelligenceStatus.indexedPatterns} / {intelligenceStatus.totalPatterns}
						</span>
					</div>
					<div class="mt-2 w-full h-2 bg-blue-200 rounded-full overflow-hidden">
						<div
							class="h-full bg-blue-600 rounded-full"
							style="width: {(intelligenceStatus.indexedPatterns / Math.max(intelligenceStatus.totalPatterns, 1)) * 100}%"
						></div>
					</div>
				</div>
			{:else}
				<div class="flex items-center justify-center h-40 bg-gray-50 rounded-lg border border-dashed border-gray-300">
					<p class="text-gray-500 text-sm">Intelligence status not available</p>
				</div>
			{/if}
		</Card>

		<!-- SONA Metrics -->
		{#if sonaMetrics}
			<Card class="p-4">
				<h3 class="font-semibold text-gray-900 mb-4">SONA Performance</h3>
				<div class="space-y-4">
					<div>
						<div class="flex items-center justify-between text-sm mb-1">
							<span class="text-gray-600">Adaptation Speed</span>
							<span class={cn(
								'font-medium',
								sonaMetrics.adaptationSpeed < 0.05 ? 'text-green-600' : 'text-amber-600'
							)}>
								{sonaMetrics.adaptationSpeed.toFixed(3)}ms
							</span>
						</div>
						<div class="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
							<div
								class={cn(
									'h-full rounded-full',
									sonaMetrics.adaptationSpeed < 0.05 ? 'bg-green-500' : 'bg-amber-500'
								)}
								style="width: {Math.min((0.1 - sonaMetrics.adaptationSpeed) / 0.1 * 100, 100)}%"
							></div>
						</div>
						<p class="text-xs text-gray-500 mt-1">Target: &lt; 0.05ms</p>
					</div>

					<div class="grid grid-cols-2 gap-4">
						<div class="p-3 bg-gray-50 rounded-lg">
							<p class="text-xs text-gray-500">Adaptations</p>
							<p class="text-lg font-semibold text-gray-900">{sonaMetrics.adaptationCount}</p>
						</div>
						<div class="p-3 bg-gray-50 rounded-lg">
							<p class="text-xs text-gray-500">Efficiency</p>
							<p class="text-lg font-semibold text-gray-900">{(sonaMetrics.efficiency * 100).toFixed(1)}%</p>
						</div>
					</div>

					{#if sonaMetrics.lastAdaptation}
						<p class="text-xs text-gray-500">
							Last adaptation: {formatTimestamp(sonaMetrics.lastAdaptation)}
						</p>
					{/if}
				</div>
			</Card>
		{/if}

		<!-- EWC Metrics -->
		{#if ewcMetrics}
			<Card class="p-4">
				<h3 class="font-semibold text-gray-900 mb-4">EWC++ Consolidation</h3>
				<div class="space-y-4">
					<div>
						<div class="flex items-center justify-between text-sm mb-1">
							<span class="text-gray-600">Consolidation Strength</span>
							<span class="font-medium text-gray-900">
								{(ewcMetrics.consolidationStrength * 100).toFixed(0)}%
							</span>
						</div>
						<div class="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
							<div
								class="h-full bg-blue-500 rounded-full"
								style="width: {ewcMetrics.consolidationStrength * 100}%"
							></div>
						</div>
					</div>

					<div>
						<div class="flex items-center justify-between text-sm mb-1">
							<span class="text-gray-600">Forgetting Rate</span>
							<span class={cn(
								'font-medium',
								ewcMetrics.forgettingRate < 0.1 ? 'text-green-600' : 'text-red-600'
							)}>
								{(ewcMetrics.forgettingRate * 100).toFixed(1)}%
							</span>
						</div>
						<div class="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
							<div
								class={cn(
									'h-full rounded-full',
									ewcMetrics.forgettingRate < 0.1 ? 'bg-green-500' : 'bg-red-500'
								)}
								style="width: {ewcMetrics.forgettingRate * 100}%"
							></div>
						</div>
					</div>

					<div class="grid grid-cols-2 gap-4">
						<div class="p-3 bg-gray-50 rounded-lg">
							<p class="text-xs text-gray-500">Protected Patterns</p>
							<p class="text-lg font-semibold text-gray-900">{ewcMetrics.protectedPatterns}</p>
						</div>
						<div class="p-3 bg-gray-50 rounded-lg">
							<p class="text-xs text-gray-500">Consolidations</p>
							<p class="text-lg font-semibold text-gray-900">{ewcMetrics.totalConsolidations}</p>
						</div>
					</div>
				</div>
			</Card>
		{/if}

		<!-- Expert Utilization -->
		{#if expertStats.length > 0}
			<Card class="p-4">
				<h3 class="font-semibold text-gray-900 mb-4">Expert Utilization (MoE)</h3>
				<div class="space-y-3">
					{#each expertStats as expert}
						<div>
							<div class="flex items-center justify-between text-sm mb-1">
								<span class="text-gray-700">{expert.name}</span>
								<span class="text-gray-500">{(expert.utilization * 100).toFixed(0)}%</span>
							</div>
							<div class="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
								<div
									class="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full transition-all duration-300"
									style="width: {expert.utilization * 100}%"
								></div>
							</div>
							<div class="flex items-center justify-between text-xs text-gray-500 mt-0.5">
								<span>{expert.taskCount} tasks</span>
								{#if expert.avgLatency}
									<span>{expert.avgLatency.toFixed(2)}ms avg</span>
								{/if}
							</div>
						</div>
					{/each}
				</div>
			</Card>
		{/if}

		<!-- Training History -->
		<Card class="p-4 lg:col-span-2">
			<div class="flex items-center justify-between mb-4">
				<h3 class="font-semibold text-gray-900">Training History</h3>
				<div class="flex items-center gap-4 text-sm text-gray-500">
					<span>{completedTrainings} completed</span>
					<span>Avg loss: {avgFinalLoss().toFixed(4)}</span>
				</div>
			</div>

			{#if trainingHistory.length === 0}
				<div class="flex items-center justify-center h-24 bg-gray-50 rounded-lg border border-dashed border-gray-300">
					<p class="text-gray-500 text-sm">No training history yet</p>
				</div>
			{:else}
				<div class="overflow-x-auto">
					<table class="w-full text-sm">
						<thead>
							<tr class="border-b text-left">
								<th class="pb-2 font-medium text-gray-600">Session</th>
								<th class="pb-2 font-medium text-gray-600">Status</th>
								<th class="pb-2 font-medium text-gray-600">Epochs</th>
								<th class="pb-2 font-medium text-gray-600">Final Loss</th>
								<th class="pb-2 font-medium text-gray-600">Accuracy</th>
								<th class="pb-2 font-medium text-gray-600">Duration</th>
								<th class="pb-2 font-medium text-gray-600">Started</th>
							</tr>
						</thead>
						<tbody>
							{#each trainingHistory.slice(0, 10) as entry}
								<tr class="border-b border-gray-100">
									<td class="py-2 font-mono text-xs text-gray-700">{entry.id.slice(0, 8)}</td>
									<td class="py-2">
										<div class="flex items-center gap-1.5">
											{#if entry.status === 'completed'}
												<CheckCircle2 class="w-4 h-4 text-green-500" />
												<span class="text-green-700">Completed</span>
											{:else if entry.status === 'failed'}
												<XCircle class="w-4 h-4 text-red-500" />
												<span class="text-red-700">Failed</span>
											{:else if entry.status === 'running'}
												<Loader2 class="w-4 h-4 text-blue-500 animate-spin" />
												<span class="text-blue-700">Running</span>
											{:else}
												<Clock class="w-4 h-4 text-gray-400" />
												<span class="text-gray-500">{entry.status}</span>
											{/if}
										</div>
									</td>
									<td class="py-2 text-gray-700">{entry.epochs}</td>
									<td class="py-2 text-gray-700">
										{entry.finalLoss !== undefined ? entry.finalLoss.toFixed(4) : '-'}
									</td>
									<td class="py-2 text-gray-700">
										{entry.finalAccuracy !== undefined ? `${(entry.finalAccuracy * 100).toFixed(1)}%` : '-'}
									</td>
									<td class="py-2 text-gray-500">
										{entry.endTime ? formatDuration(entry.endTime - entry.startTime) : '-'}
									</td>
									<td class="py-2 text-gray-500">{formatTimestamp(entry.startTime)}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}
		</Card>
	</div>
</div>
