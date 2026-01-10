/**
 * GAP-UX.2: Time Travel Service
 *
 * Service for fetching and processing ticket history data for the
 * time travel decision replay feature.
 */

import { prisma } from '$lib/server/prisma';
import type {
  TimelineEvent,
  TimelineEventType,
  TimelineEventMetadata,
  TicketSnapshot,
  AssignedAgentSnapshot,
  SwarmSnapshot,
  QuestionSnapshot,
  TimeTravelResponse,
  AgentRecommendation,
  DecisionAnnotation
} from '$lib/types/time-travel';
import type { TicketStatus, Priority } from '$lib/types';

/**
 * Time Travel Service - Provides methods to fetch and process
 * ticket history for the decision replay viewer.
 */
export class TimeTravelService {
  /**
   * Get complete time travel data for a ticket
   */
  async getTimeTravelData(ticketId: string): Promise<TimeTravelResponse | null> {
    // Fetch ticket with all relations
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        project: true,
        history: {
          orderBy: { createdAt: 'asc' }
        },
        questions: {
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    if (!ticket) {
      return null;
    }

    // Fetch checkpoints for additional context
    const checkpoints = await prisma.executionCheckpoint.findMany({
      where: { ticketId },
      orderBy: { createdAt: 'asc' }
    });

    // Build timeline events
    const events = await this.buildTimelineEvents(ticket, checkpoints);

    // Get current snapshot
    const currentSnapshot = await this.buildCurrentSnapshot(ticket);

    return {
      ticketId: ticket.id,
      ticketTitle: ticket.title,
      projectId: ticket.projectId,
      projectName: ticket.project.name,
      events,
      totalEvents: events.length,
      firstEventAt: events.length > 0 ? events[0].timestamp : ticket.createdAt,
      lastEventAt: events.length > 0 ? events[events.length - 1].timestamp : ticket.updatedAt,
      currentSnapshot
    };
  }

  /**
   * Build timeline events from ticket history, questions, and checkpoints
   */
  private async buildTimelineEvents(
    ticket: {
      id: string;
      title: string;
      description: string | null;
      status: string;
      priority: string;
      labels: string[];
      complexity: number | null;
      createdAt: Date;
      updatedAt: Date;
      history: Array<{
        id: string;
        fromStatus: string;
        toStatus: string;
        reason: string | null;
        triggeredBy: string;
        createdAt: Date;
      }>;
      questions: Array<{
        id: string;
        question: string;
        agentId: string;
        answer: string | null;
        answered: boolean;
        createdAt: Date;
        answeredAt: Date | null;
      }>;
    },
    checkpoints: Array<{
      id: string;
      type: string;
      version: number;
      data: unknown;
      createdAt: Date;
    }>
  ): Promise<TimelineEvent[]> {
    const events: TimelineEvent[] = [];

    // Add ticket creation event
    events.push({
      id: `create-${ticket.id}`,
      timestamp: ticket.createdAt,
      eventType: 'ticket_created',
      description: `Ticket "${ticket.title}" was created`,
      triggeredBy: 'user',
      metadata: {
        title: ticket.title,
        priority: ticket.priority,
        labels: ticket.labels
      },
      snapshot: this.buildSnapshotFromTicketState(ticket, ticket.createdAt, 'BACKLOG')
    });

    // Add history events (status changes)
    for (const history of ticket.history) {
      const eventType = this.getEventTypeFromStatusChange(
        history.fromStatus as TicketStatus,
        history.toStatus as TicketStatus
      );

      const metadata: TimelineEventMetadata = {
        fromStatus: history.fromStatus as TicketStatus,
        toStatus: history.toStatus as TicketStatus,
        reason: history.reason || undefined
      };

      // Extract agent/swarm info from reason if present
      if (history.reason) {
        const agentMatch = history.reason.match(/(\d+)\s*agents?/i);
        if (agentMatch) {
          metadata.agentCount = parseInt(agentMatch[1], 10);
        }

        const topologyMatch = history.reason.match(/(mesh|hierarchical|hierarchical-mesh)\s*topology/i);
        if (topologyMatch) {
          metadata.topology = topologyMatch[1].toLowerCase();
        }
      }

      events.push({
        id: history.id,
        timestamp: history.createdAt,
        eventType,
        description: this.buildStatusChangeDescription(
          history.fromStatus as TicketStatus,
          history.toStatus as TicketStatus,
          history.reason
        ),
        triggeredBy: history.triggeredBy,
        metadata,
        snapshot: this.buildSnapshotFromTicketState(
          ticket,
          history.createdAt,
          history.toStatus as TicketStatus
        )
      });
    }

    // Add question events
    for (const question of ticket.questions) {
      // Question asked event
      events.push({
        id: `q-asked-${question.id}`,
        timestamp: question.createdAt,
        eventType: 'question_asked',
        description: `Agent asked: "${question.question.substring(0, 100)}${question.question.length > 100 ? '...' : ''}"`,
        triggeredBy: question.agentId,
        metadata: {
          questionId: question.id,
          questionText: question.question,
          agentId: question.agentId
        }
      });

      // Question answered event (if answered)
      if (question.answered && question.answeredAt) {
        events.push({
          id: `q-answered-${question.id}`,
          timestamp: question.answeredAt,
          eventType: 'question_answered',
          description: `User answered: "${(question.answer || '').substring(0, 100)}${(question.answer || '').length > 100 ? '...' : ''}"`,
          triggeredBy: 'user',
          metadata: {
            questionId: question.id,
            questionText: question.question,
            answerText: question.answer || undefined,
            agentId: question.agentId
          }
        });
      }
    }

    // Add checkpoint events
    for (const checkpoint of checkpoints) {
      events.push({
        id: checkpoint.id,
        timestamp: checkpoint.createdAt,
        eventType: 'checkpoint_created',
        description: `${checkpoint.type === 'auto' ? 'Automatic' : 'Manual'} checkpoint created (v${checkpoint.version})`,
        triggeredBy: 'system',
        metadata: {
          checkpointType: checkpoint.type,
          version: checkpoint.version
        }
      });
    }

    // Sort events by timestamp
    events.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    return events;
  }

  /**
   * Determine event type from status change
   */
  private getEventTypeFromStatusChange(
    fromStatus: TicketStatus,
    toStatus: TicketStatus
  ): TimelineEventType {
    if (toStatus === 'IN_PROGRESS' && fromStatus === 'TODO') {
      return 'swarm_initialized';
    }
    if (toStatus === 'DONE' || toStatus === 'CANCELLED') {
      return 'swarm_terminated';
    }
    if (toStatus === 'NEEDS_FEEDBACK') {
      return 'question_asked';
    }
    return 'status_change';
  }

  /**
   * Build description for status change
   */
  private buildStatusChangeDescription(
    fromStatus: TicketStatus,
    toStatus: TicketStatus,
    reason: string | null
  ): string {
    const baseDescription = `Status changed from ${fromStatus} to ${toStatus}`;
    if (reason) {
      return `${baseDescription}: ${reason}`;
    }
    return baseDescription;
  }

  /**
   * Build a snapshot from ticket state at a given time
   */
  private buildSnapshotFromTicketState(
    ticket: {
      id: string;
      title: string;
      description: string | null;
      priority: string;
      labels: string[];
      complexity: number | null;
    },
    timestamp: Date,
    status: TicketStatus
  ): TicketSnapshot {
    return {
      ticketId: ticket.id,
      timestamp,
      title: ticket.title,
      description: ticket.description,
      status,
      priority: ticket.priority as Priority,
      labels: ticket.labels,
      complexity: ticket.complexity,
      assignedAgents: [],
      activeSwarm: null,
      pendingQuestions: [],
      executionTime: 0
    };
  }

  /**
   * Build current snapshot of the ticket
   */
  private async buildCurrentSnapshot(ticket: {
    id: string;
    title: string;
    description: string | null;
    status: string;
    priority: string;
    labels: string[];
    complexity: number | null;
    createdAt: Date;
    updatedAt: Date;
    questions: Array<{
      id: string;
      question: string;
      agentId: string;
      answered: boolean;
      answer: string | null;
    }>;
    history: Array<{
      createdAt: Date;
      toStatus: string;
    }>;
  }): Promise<TicketSnapshot> {
    // Calculate execution time from history
    let executionTime = 0;
    const inProgressRecords = ticket.history.filter(h => h.toStatus === 'IN_PROGRESS');
    const endRecords = ticket.history.filter(h =>
      h.toStatus === 'DONE' ||
      h.toStatus === 'CANCELLED' ||
      h.toStatus === 'NEEDS_FEEDBACK'
    );

    if (inProgressRecords.length > 0) {
      const startTime = inProgressRecords[0].createdAt;
      const endTime = endRecords.length > 0
        ? endRecords[endRecords.length - 1].createdAt
        : new Date();
      executionTime = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
    }

    // Get pending questions
    const pendingQuestions: QuestionSnapshot[] = ticket.questions
      .filter(q => !q.answered)
      .map(q => ({
        questionId: q.id,
        question: q.question,
        agentId: q.agentId,
        answered: q.answered,
        answer: q.answer || undefined
      }));

    return {
      ticketId: ticket.id,
      timestamp: ticket.updatedAt,
      title: ticket.title,
      description: ticket.description,
      status: ticket.status as TicketStatus,
      priority: ticket.priority as Priority,
      labels: ticket.labels,
      complexity: ticket.complexity,
      assignedAgents: [],
      activeSwarm: null,
      pendingQuestions,
      executionTime
    };
  }

  /**
   * Get snapshot at a specific event index
   */
  async getSnapshotAtEvent(ticketId: string, eventIndex: number): Promise<TicketSnapshot | null> {
    const data = await this.getTimeTravelData(ticketId);
    if (!data || eventIndex < 0 || eventIndex >= data.events.length) {
      return null;
    }

    const event = data.events[eventIndex];
    if (event.snapshot) {
      return event.snapshot;
    }

    // Build snapshot from events up to this point
    return this.buildSnapshotFromEvents(data.events.slice(0, eventIndex + 1), data.currentSnapshot);
  }

  /**
   * Build a snapshot by replaying events up to a point
   */
  private buildSnapshotFromEvents(
    events: TimelineEvent[],
    currentSnapshot: TicketSnapshot
  ): TicketSnapshot {
    // Start with a base snapshot
    const snapshot: TicketSnapshot = {
      ticketId: currentSnapshot.ticketId,
      timestamp: events.length > 0 ? events[events.length - 1].timestamp : new Date(),
      title: currentSnapshot.title,
      description: currentSnapshot.description,
      status: 'BACKLOG',
      priority: currentSnapshot.priority,
      labels: [],
      complexity: null,
      assignedAgents: [],
      activeSwarm: null,
      pendingQuestions: [],
      executionTime: 0
    };

    // Replay events to build state
    for (const event of events) {
      if (event.eventType === 'status_change' || event.eventType === 'swarm_initialized' || event.eventType === 'swarm_terminated') {
        if (event.metadata.toStatus) {
          snapshot.status = event.metadata.toStatus;
        }
      }

      if (event.eventType === 'ticket_created' || event.eventType === 'ticket_updated') {
        if (event.metadata.labels) {
          snapshot.labels = event.metadata.labels as string[];
        }
      }

      if (event.eventType === 'swarm_initialized' && event.metadata.topology) {
        snapshot.activeSwarm = {
          swarmId: event.metadata.swarmId || 'unknown',
          topology: event.metadata.topology,
          agentCount: event.metadata.agentCount || 0,
          status: 'active',
          startedAt: event.timestamp
        };
      }

      if (event.eventType === 'swarm_terminated') {
        snapshot.activeSwarm = null;
      }

      if (event.eventType === 'question_asked') {
        snapshot.pendingQuestions.push({
          questionId: event.metadata.questionId || event.id,
          question: event.metadata.questionText || '',
          agentId: event.metadata.agentId || 'unknown',
          answered: false
        });
      }

      if (event.eventType === 'question_answered') {
        const qIndex = snapshot.pendingQuestions.findIndex(
          q => q.questionId === event.metadata.questionId
        );
        if (qIndex >= 0) {
          snapshot.pendingQuestions[qIndex].answered = true;
          snapshot.pendingQuestions[qIndex].answer = event.metadata.answerText;
        }
      }

      snapshot.timestamp = event.timestamp;
    }

    return snapshot;
  }

  /**
   * Generate decision annotations from events
   */
  extractDecisionAnnotations(events: TimelineEvent[]): DecisionAnnotation[] {
    const decisions: DecisionAnnotation[] = [];

    for (const event of events) {
      if (event.eventType === 'agent_recommendation' || event.eventType === 'decision_made') {
        const alternatives = event.metadata.alternatives || [];
        decisions.push({
          id: `decision-${event.id}`,
          type: event.metadata.decisionType as DecisionAnnotation['type'] || 'agent_selection',
          timestamp: event.timestamp,
          description: event.description,
          selectedOption: alternatives.find((a: { selected: boolean }) => a.selected)?.description || 'Unknown',
          options: alternatives.map((alt: { description: string; score: number; selected: boolean }) => ({
            label: alt.description,
            value: alt.description,
            score: alt.score,
            selected: alt.selected
          })),
          factors: event.metadata.reasoning
            ? (event.metadata.reasoning as string[]).map((r, i) => ({
                name: `Factor ${i + 1}`,
                weight: 1,
                value: r
              }))
            : []
        });
      }

      // Extract implicit decisions from status changes
      if (event.eventType === 'swarm_initialized') {
        decisions.push({
          id: `decision-swarm-${event.id}`,
          type: 'topology_selection',
          timestamp: event.timestamp,
          description: `Selected ${event.metadata.topology} topology with ${event.metadata.agentCount} agents`,
          selectedOption: event.metadata.topology || 'unknown',
          options: [
            { label: 'Mesh', value: 'mesh', score: event.metadata.topology === 'mesh' ? 1 : 0.5, selected: event.metadata.topology === 'mesh' },
            { label: 'Hierarchical', value: 'hierarchical', score: event.metadata.topology === 'hierarchical' ? 1 : 0.5, selected: event.metadata.topology === 'hierarchical' },
            { label: 'Hierarchical-Mesh', value: 'hierarchical-mesh', score: event.metadata.topology === 'hierarchical-mesh' ? 1 : 0.5, selected: event.metadata.topology === 'hierarchical-mesh' }
          ],
          factors: event.metadata.reasoning
            ? (event.metadata.reasoning as string[]).map((r, i) => ({
                name: `Reasoning ${i + 1}`,
                weight: 1,
                value: r
              }))
            : []
        });
      }
    }

    return decisions;
  }

  /**
   * Get agent recommendations from events
   */
  extractAgentRecommendations(events: TimelineEvent[]): AgentRecommendation[] {
    const recommendations: AgentRecommendation[] = [];

    for (const event of events) {
      if (event.eventType === 'agent_recommendation' || event.eventType === 'swarm_initialized') {
        if (event.metadata.recommendedAgents) {
          recommendations.push({
            agents: (event.metadata.recommendedAgents as string[]).map(type => ({
              type,
              name: type,
              role: 'Agent',
              confidence: event.metadata.confidence || 0.8
            })),
            reasoning: event.metadata.reasoning as string[] || [],
            alternatives: [],
            timestamp: event.timestamp
          });
        }
      }
    }

    return recommendations;
  }
}

export const timeTravelService = new TimeTravelService();
