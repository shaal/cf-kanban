/**
 * TASK-053: Ticket Workflow - Swarm Initialization on Ticket Move
 *
 * Handles ticket status transitions and triggers swarm operations.
 * When a ticket moves from TODO to IN_PROGRESS:
 * 1. Analyze the ticket
 * 2. Assign optimal agents
 * 3. Select topology
 * 4. Initialize swarm
 * 5. Start progress tracking
 */

import { prisma } from '../prisma';
import {
	ticketAnalyzer,
	type AnalysisResult,
	type TicketInput
} from '../analysis/ticket-analyzer';
import { agentRouter, type AgentAssignment } from '../assignment/agent-router';
import { topologySelector, type TopologyDecision } from '../assignment/topology-selector';
import { swarmService, type SwarmStatus } from '../claude-flow/swarm';
import { agentService, type Agent } from '../claude-flow/agents';
import { publishTicketEvent, type TicketEvent } from '../redis/pubsub';
import type { Ticket, Project, TicketStatus } from '@prisma/client';

/**
 * Result of a workflow operation
 */
export interface WorkflowResult {
	/** Whether the operation succeeded */
	success: boolean;
	/** Swarm ID if spawned */
	swarmId?: string;
	/** Agent IDs if spawned */
	agents?: string[];
	/** Analysis result if performed */
	analysis?: AnalysisResult;
	/** Error message if failed */
	error?: string;
	/** Additional details about the operation */
	details?: Record<string, unknown>;
}

/**
 * Extended ticket with project relation
 */
type TicketWithProject = Ticket & { project: Project };

/**
 * Context passed to the swarm for ticket execution
 */
export interface TicketContext {
	ticketId: string;
	projectId: string;
	title: string;
	description: string | null;
	priority: string;
	labels: string[];
	complexity: number | null;
	projectName: string;
}

/**
 * Handle ticket status transition and trigger appropriate workflows
 *
 * @param ticketId - ID of the ticket being transitioned
 * @param fromStatus - Previous status
 * @param toStatus - New status
 * @param triggeredBy - Who/what triggered the transition
 * @returns Workflow result
 */
export async function handleTicketTransition(
	ticketId: string,
	fromStatus: TicketStatus,
	toStatus: TicketStatus,
	triggeredBy: string = 'system'
): Promise<WorkflowResult> {
	// Fetch ticket with project
	const ticket = await prisma.ticket.findUnique({
		where: { id: ticketId },
		include: { project: true }
	});

	if (!ticket) {
		return { success: false, error: 'Ticket not found' };
	}

	// Handle different transitions
	switch (true) {
		// Start execution when moving to IN_PROGRESS from TODO
		case fromStatus === 'TODO' && toStatus === 'IN_PROGRESS':
			return await startTicketExecution(ticket);

		// Resume execution when ready after feedback
		case fromStatus === 'NEEDS_FEEDBACK' && toStatus === 'READY_TO_RESUME':
			return await resumeTicketExecution(ticket);

		// Auto-resume after READY_TO_RESUME (if configured)
		case fromStatus === 'READY_TO_RESUME' && toStatus === 'IN_PROGRESS':
			return await continueTicketExecution(ticket);

		// Complete execution when done
		case toStatus === 'DONE':
			return await completeTicketExecution(ticket, fromStatus);

		// Cancel execution
		case toStatus === 'CANCELLED':
			return await cancelTicketExecution(ticket, fromStatus);

		default:
			// No workflow action needed
			return { success: true };
	}
}

/**
 * Start ticket execution by spawning a swarm
 */
async function startTicketExecution(ticket: TicketWithProject): Promise<WorkflowResult> {
	try {
		// Step 1: Analyze ticket
		const ticketInput: TicketInput = {
			title: ticket.title,
			description: ticket.description,
			priority: ticket.priority,
			labels: ticket.labels
		};
		const analysis = ticketAnalyzer.analyze(ticketInput);

		// Step 2: Update ticket with analysis results
		await prisma.ticket.update({
			where: { id: ticket.id },
			data: {
				complexity: Math.round(analysis.confidence * 10), // Convert to 1-10 scale
				labels: [...new Set([...ticket.labels, ...analysis.suggestedLabels])]
			}
		});

		// Step 3: Assign agents based on analysis
		const assignment = await agentRouter.assignAgents(analysis);

		// Step 4: Select topology
		const topologyDecision = topologySelector.selectTopology({
			complexity: Math.round(analysis.confidence * 10),
			agentCount: assignment.agents.length,
			hasDependencies: false, // TODO: Check for dependencies
			isSecurityRelated: analysis.keywords.some((k) =>
				['security', 'auth', 'authentication'].includes(k)
			),
			requiresConsensus: false,
			expectedDuration: estimateHours(Math.round(analysis.confidence * 10)),
			keywords: analysis.keywords
		});

		// Step 5: Initialize swarm
		const swarm = await swarmService.init({
			topology: topologyDecision.topology,
			maxAgents: topologyDecision.maxAgents,
			project: ticket.project.name
		});

		// Step 6: Spawn agents
		const agentIds: string[] = [];
		for (const agentConfig of assignment.agents) {
			const prompt = buildAgentPrompt(ticket, agentConfig);
			const agent = await agentService.spawn({
				type: agentConfig.type,
				name: `${ticket.id.slice(0, 8)}-${agentConfig.type}`,
				prompt
			});
			agentIds.push(agent.id);

			// Add agent to swarm
			await swarmService.addAgent(agent.id);
		}

		// Step 7: Record history
		await prisma.ticketHistory.create({
			data: {
				ticketId: ticket.id,
				fromStatus: 'TODO',
				toStatus: 'IN_PROGRESS',
				reason: `Swarm initialized with ${agentIds.length} agents using ${topologyDecision.topology} topology`,
				triggeredBy: 'workflow'
			}
		});

		// Step 8: Publish event
		await publishEvent(ticket, 'ticket:transitioned', {
			swarmId: swarm.id,
			agents: agentIds,
			topology: topologyDecision.topology,
			analysis: {
				ticketType: analysis.ticketType,
				keywords: analysis.keywords,
				complexity: analysis.confidence
			}
		});

		return {
			success: true,
			swarmId: swarm.id,
			agents: agentIds,
			analysis,
			details: {
				topology: topologyDecision.topology,
				reasoning: [...assignment.reasoning, ...topologyDecision.reasoning]
			}
		};
	} catch (error) {
		// Rollback: move ticket back to TODO on failure
		await prisma.ticket.update({
			where: { id: ticket.id },
			data: { status: 'TODO' }
		});

		await prisma.ticketHistory.create({
			data: {
				ticketId: ticket.id,
				fromStatus: 'IN_PROGRESS',
				toStatus: 'TODO',
				reason: `Swarm initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
				triggeredBy: 'workflow-error'
			}
		});

		return {
			success: false,
			error: error instanceof Error ? error.message : 'Unknown error during swarm initialization'
		};
	}
}

/**
 * Resume ticket execution after user provides feedback
 */
async function resumeTicketExecution(ticket: TicketWithProject): Promise<WorkflowResult> {
	try {
		// Get answered questions
		const questions = await prisma.ticketQuestion.findMany({
			where: {
				ticketId: ticket.id,
				answered: true
			},
			orderBy: { answeredAt: 'desc' }
		});

		// Format answers for the swarm
		const answers = questions.map((q) => ({
			questionId: q.id,
			question: q.question,
			answer: q.answer,
			agentId: q.agentId
		}));

		// Record history
		await prisma.ticketHistory.create({
			data: {
				ticketId: ticket.id,
				fromStatus: 'NEEDS_FEEDBACK',
				toStatus: 'READY_TO_RESUME',
				reason: `User provided ${answers.length} answer(s)`,
				triggeredBy: 'user'
			}
		});

		// Publish resume event
		await publishEvent(ticket, 'ticket:transitioned', {
			action: 'resume',
			answers,
			resumedAt: new Date().toISOString()
		});

		return {
			success: true,
			details: { answersProvided: answers.length }
		};
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error.message : 'Failed to resume execution'
		};
	}
}

/**
 * Continue ticket execution after ready to resume
 */
async function continueTicketExecution(ticket: TicketWithProject): Promise<WorkflowResult> {
	// Resume swarm execution
	try {
		await swarmService.resume();

		await prisma.ticketHistory.create({
			data: {
				ticketId: ticket.id,
				fromStatus: 'READY_TO_RESUME',
				toStatus: 'IN_PROGRESS',
				reason: 'Execution continued after feedback',
				triggeredBy: 'workflow'
			}
		});

		await publishEvent(ticket, 'ticket:transitioned', {
			action: 'continued',
			continueAt: new Date().toISOString()
		});

		return { success: true };
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error.message : 'Failed to continue execution'
		};
	}
}

/**
 * Complete ticket execution and store learned patterns
 */
async function completeTicketExecution(
	ticket: TicketWithProject,
	fromStatus: TicketStatus
): Promise<WorkflowResult> {
	try {
		// Terminate swarm if still active
		try {
			await swarmService.terminate(undefined, true);
		} catch {
			// Swarm may already be terminated
		}

		// Calculate success metrics
		const historyRecords = await prisma.ticketHistory.findMany({
			where: { ticketId: ticket.id },
			orderBy: { createdAt: 'asc' }
		});

		// Find start and end times
		const startRecord = historyRecords.find((h) => h.toStatus === 'IN_PROGRESS');
		const endTime = new Date();
		const startTime = startRecord?.createdAt || endTime;

		// Calculate duration and success rate
		const durationHours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
		const feedbackLoops = historyRecords.filter((h) => h.toStatus === 'NEEDS_FEEDBACK').length;

		// Analyze for pattern storage
		const ticketInput: TicketInput = {
			title: ticket.title,
			description: ticket.description,
			priority: ticket.priority,
			labels: ticket.labels
		};
		const analysis = ticketAnalyzer.analyze(ticketInput);
		const assignment = await agentRouter.assignAgents(analysis);

		// Calculate success rate (fewer feedback loops = higher success)
		const successRate = Math.max(0.5, 1 - feedbackLoops * 0.1);

		// Store successful pattern
		await agentRouter.storeSuccessfulAssignment(analysis, assignment, successRate);

		// Record completion
		await prisma.ticketHistory.create({
			data: {
				ticketId: ticket.id,
				fromStatus,
				toStatus: 'DONE',
				reason: `Completed in ${durationHours.toFixed(1)} hours with ${feedbackLoops} feedback loop(s)`,
				triggeredBy: 'workflow'
			}
		});

		// Publish completion event
		await publishEvent(ticket, 'ticket:transitioned', {
			action: 'completed',
			duration: durationHours,
			feedbackLoops,
			successRate
		});

		return {
			success: true,
			details: {
				duration: durationHours,
				feedbackLoops,
				successRate,
				patternStored: true
			}
		};
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error.message : 'Failed to complete execution'
		};
	}
}

/**
 * Cancel ticket execution and clean up
 */
async function cancelTicketExecution(
	ticket: TicketWithProject,
	fromStatus: TicketStatus
): Promise<WorkflowResult> {
	try {
		// Terminate swarm if running
		try {
			await swarmService.terminate(undefined, false);
		} catch {
			// Swarm may not exist
		}

		// Record cancellation
		await prisma.ticketHistory.create({
			data: {
				ticketId: ticket.id,
				fromStatus,
				toStatus: 'CANCELLED',
				reason: 'Execution cancelled by user',
				triggeredBy: 'user'
			}
		});

		// Publish cancellation event
		await publishEvent(ticket, 'ticket:transitioned', {
			action: 'cancelled',
			fromStatus,
			cancelledAt: new Date().toISOString()
		});

		return { success: true };
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error.message : 'Failed to cancel execution'
		};
	}
}

/**
 * Build a prompt for an agent based on ticket context
 */
function buildAgentPrompt(
	ticket: TicketWithProject,
	agentConfig: { type: string; role: string }
): string {
	return `
You are working on ticket: "${ticket.title}"

Description: ${ticket.description || 'No description provided'}

Priority: ${ticket.priority}
Labels: ${ticket.labels.join(', ') || 'None'}

Your role: ${agentConfig.role}
Your agent type: ${agentConfig.type}

Project: ${ticket.project.name}
${ticket.project.description ? `Project description: ${ticket.project.description}` : ''}

Instructions:
1. Execute this task following TDD methodology
2. If you need user input or have questions, emit a "needs_feedback" event
3. Coordinate with other agents in the swarm as needed
4. Report progress regularly
5. Ensure code quality and test coverage
`.trim();
}

/**
 * Estimate hours based on complexity
 */
function estimateHours(complexity: number): number {
	const baseHours: Record<number, number> = {
		1: 0.5,
		2: 1,
		3: 2,
		4: 3,
		5: 5,
		6: 8,
		7: 13,
		8: 21,
		9: 34,
		10: 55
	};
	return baseHours[complexity] || 8;
}

/**
 * Publish a ticket event to Redis
 */
async function publishEvent(
	ticket: TicketWithProject,
	type: TicketEvent['type'],
	data?: Record<string, unknown>
): Promise<void> {
	try {
		await publishTicketEvent({
			type,
			ticketId: ticket.id,
			projectId: ticket.projectId,
			data
		});
	} catch {
		// Log but don't fail on event publish errors
		console.error(`Failed to publish event ${type} for ticket ${ticket.id}`);
	}
}

/**
 * Get ticket context for swarm execution
 */
export function buildTicketContext(ticket: TicketWithProject): TicketContext {
	return {
		ticketId: ticket.id,
		projectId: ticket.projectId,
		title: ticket.title,
		description: ticket.description,
		priority: ticket.priority,
		labels: ticket.labels,
		complexity: ticket.complexity,
		projectName: ticket.project.name
	};
}

/**
 * Check if a ticket can be started (moved to IN_PROGRESS)
 */
export async function canStartTicket(ticketId: string): Promise<{
	canStart: boolean;
	reason?: string;
}> {
	const ticket = await prisma.ticket.findUnique({
		where: { id: ticketId }
	});

	if (!ticket) {
		return { canStart: false, reason: 'Ticket not found' };
	}

	if (ticket.status !== 'TODO') {
		return {
			canStart: false,
			reason: `Ticket must be in TODO status to start (current: ${ticket.status})`
		};
	}

	// Check if swarm is available
	const swarmActive = await swarmService.isActive();
	if (swarmActive) {
		return {
			canStart: false,
			reason: 'Another swarm is already active. Complete or cancel the current task first.'
		};
	}

	return { canStart: true };
}
