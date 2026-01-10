/**
 * GAP-UX.2: TimeTravelViewer Types
 *
 * Type definitions for the time travel decision replay feature.
 * Allows users to navigate through ticket history, view snapshots,
 * and replay the decision-making process.
 */

import type { TicketStatus, Priority } from './index';
import type { AuditAction } from '@prisma/client';

/**
 * Represents a single point in time in the ticket's history
 */
export interface TimelineEvent {
  /** Unique identifier for the event */
  id: string;
  /** Timestamp when the event occurred */
  timestamp: Date;
  /** Type of event (status change, agent action, user input, etc.) */
  eventType: TimelineEventType;
  /** Human-readable description of the event */
  description: string;
  /** Who/what triggered this event */
  triggeredBy: string;
  /** Additional metadata about the event */
  metadata: TimelineEventMetadata;
  /** Ticket state snapshot at this point in time */
  snapshot?: TicketSnapshot;
}

/**
 * Types of events that can appear on the timeline
 */
export type TimelineEventType =
  | 'status_change'
  | 'agent_assignment'
  | 'agent_recommendation'
  | 'user_feedback'
  | 'question_asked'
  | 'question_answered'
  | 'swarm_initialized'
  | 'swarm_terminated'
  | 'checkpoint_created'
  | 'pattern_stored'
  | 'decision_made'
  | 'ticket_created'
  | 'ticket_updated';

/**
 * Metadata associated with timeline events
 */
export interface TimelineEventMetadata {
  /** For status changes */
  fromStatus?: TicketStatus;
  toStatus?: TicketStatus;
  reason?: string;

  /** For agent actions */
  agentId?: string;
  agentType?: string;
  agentName?: string;

  /** For swarm operations */
  swarmId?: string;
  topology?: string;
  agentCount?: number;

  /** For questions/feedback */
  questionId?: string;
  questionText?: string;
  answerText?: string;

  /** For pattern storage */
  patternId?: string;
  patternType?: string;
  confidence?: number;

  /** For decisions */
  decisionType?: string;
  alternatives?: DecisionAlternative[];
  selectedIndex?: number;

  /** For recommendations */
  recommendedAgents?: string[];
  recommendedTopology?: string;
  reasoning?: string[];

  /** Generic metadata */
  [key: string]: unknown;
}

/**
 * An alternative option considered during a decision
 */
export interface DecisionAlternative {
  /** Description of this alternative */
  description: string;
  /** Score or weight assigned to this alternative */
  score: number;
  /** Whether this was the selected option */
  selected: boolean;
  /** Reasoning for/against this option */
  reasoning?: string;
}

/**
 * Complete snapshot of a ticket at a point in time
 */
export interface TicketSnapshot {
  /** Ticket ID */
  ticketId: string;
  /** Snapshot timestamp */
  timestamp: Date;
  /** Ticket title at this point */
  title: string;
  /** Description at this point */
  description: string | null;
  /** Status at this point */
  status: TicketStatus;
  /** Priority at this point */
  priority: Priority;
  /** Labels at this point */
  labels: string[];
  /** Complexity score at this point */
  complexity: number | null;
  /** Assigned agents at this point */
  assignedAgents: AssignedAgentSnapshot[];
  /** Active swarm info at this point */
  activeSwarm: SwarmSnapshot | null;
  /** Pending questions at this point */
  pendingQuestions: QuestionSnapshot[];
  /** Accumulated execution time in hours */
  executionTime: number;
}

/**
 * Snapshot of an assigned agent
 */
export interface AssignedAgentSnapshot {
  agentId: string;
  agentType: string;
  agentName: string;
  role: string;
  status: 'active' | 'idle' | 'completed' | 'failed';
}

/**
 * Snapshot of swarm state
 */
export interface SwarmSnapshot {
  swarmId: string;
  topology: string;
  agentCount: number;
  status: 'initializing' | 'active' | 'paused' | 'completed' | 'terminated';
  startedAt: Date;
}

/**
 * Snapshot of a question
 */
export interface QuestionSnapshot {
  questionId: string;
  question: string;
  agentId: string;
  answered: boolean;
  answer?: string;
}

/**
 * Time travel session state
 */
export interface TimeTravelState {
  /** The ticket being viewed */
  ticketId: string;
  /** All events in the timeline */
  events: TimelineEvent[];
  /** Currently selected event index */
  currentIndex: number;
  /** Current snapshot being displayed */
  currentSnapshot: TicketSnapshot | null;
  /** Playback state */
  playbackState: PlaybackState;
  /** Filter settings */
  filters: TimeTravelFilters;
  /** Loading states */
  loading: boolean;
  error: string | null;
}

/**
 * Playback control state
 */
export interface PlaybackState {
  /** Whether auto-play is active */
  isPlaying: boolean;
  /** Playback speed (1x, 2x, 0.5x, etc.) */
  speed: number;
  /** Playback direction */
  direction: 'forward' | 'backward';
  /** Auto-pause on certain event types */
  pauseOnTypes: TimelineEventType[];
}

/**
 * Filter options for the timeline
 */
export interface TimeTravelFilters {
  /** Event types to show */
  eventTypes: TimelineEventType[];
  /** Date range filter */
  dateRange: {
    start: Date | null;
    end: Date | null;
  };
  /** Show only events triggered by specific actors */
  triggeredBy: string[];
  /** Search query for event descriptions */
  searchQuery: string;
}

/**
 * Agent recommendation for display in decision replay
 */
export interface AgentRecommendation {
  /** Recommended agent types */
  agents: {
    type: string;
    name: string;
    role: string;
    confidence: number;
  }[];
  /** Reasoning behind the recommendation */
  reasoning: string[];
  /** Alternative configurations considered */
  alternatives: {
    agents: string[];
    score: number;
    reasoning: string;
  }[];
  /** When this recommendation was made */
  timestamp: Date;
}

/**
 * Decision annotation for display
 */
export interface DecisionAnnotation {
  /** Decision ID */
  id: string;
  /** Type of decision */
  type: 'agent_selection' | 'topology_selection' | 'status_transition' | 'pattern_application' | 'user_response';
  /** When the decision was made */
  timestamp: Date;
  /** Human-readable description */
  description: string;
  /** The selected option */
  selectedOption: string;
  /** All options that were considered */
  options: {
    label: string;
    value: string;
    score: number;
    selected: boolean;
  }[];
  /** Factors that influenced the decision */
  factors: {
    name: string;
    weight: number;
    value: string;
  }[];
  /** Outcome of this decision (if known) */
  outcome?: {
    success: boolean;
    impact: string;
    learnings: string[];
  };
}

/**
 * API response for time travel data
 */
export interface TimeTravelResponse {
  ticketId: string;
  ticketTitle: string;
  projectId: string;
  projectName: string;
  events: TimelineEvent[];
  totalEvents: number;
  firstEventAt: Date;
  lastEventAt: Date;
  currentSnapshot: TicketSnapshot;
}

/**
 * Default playback state
 */
export const DEFAULT_PLAYBACK_STATE: PlaybackState = {
  isPlaying: false,
  speed: 1,
  direction: 'forward',
  pauseOnTypes: ['decision_made', 'agent_recommendation', 'user_feedback']
};

/**
 * Default filter state
 */
export const DEFAULT_FILTERS: TimeTravelFilters = {
  eventTypes: [],
  dateRange: { start: null, end: null },
  triggeredBy: [],
  searchQuery: ''
};

/**
 * Event type display configuration
 */
export const EVENT_TYPE_CONFIG: Record<TimelineEventType, { label: string; color: string; icon: string }> = {
  status_change: { label: 'Status Change', color: 'blue', icon: 'ArrowRight' },
  agent_assignment: { label: 'Agent Assigned', color: 'purple', icon: 'Bot' },
  agent_recommendation: { label: 'Agent Recommendation', color: 'indigo', icon: 'Sparkles' },
  user_feedback: { label: 'User Feedback', color: 'green', icon: 'MessageSquare' },
  question_asked: { label: 'Question Asked', color: 'amber', icon: 'HelpCircle' },
  question_answered: { label: 'Question Answered', color: 'emerald', icon: 'CheckCircle' },
  swarm_initialized: { label: 'Swarm Started', color: 'cyan', icon: 'Play' },
  swarm_terminated: { label: 'Swarm Ended', color: 'slate', icon: 'Square' },
  checkpoint_created: { label: 'Checkpoint', color: 'orange', icon: 'Save' },
  pattern_stored: { label: 'Pattern Stored', color: 'pink', icon: 'GitBranch' },
  decision_made: { label: 'Decision Made', color: 'violet', icon: 'GitCommit' },
  ticket_created: { label: 'Ticket Created', color: 'teal', icon: 'Plus' },
  ticket_updated: { label: 'Ticket Updated', color: 'sky', icon: 'Edit' }
};

/**
 * Helper function to format duration between two dates
 */
export function formatDuration(start: Date, end: Date): string {
  const diff = end.getTime() - start.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

/**
 * Helper function to get relative time description
 */
export function getRelativeTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'Just now';
}
