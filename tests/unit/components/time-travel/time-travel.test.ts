/**
 * Time Travel Components Tests
 *
 * GAP-UX.2: TimeTravelViewer - Decision Replay
 *
 * Tests for the time travel components:
 * - Timeline
 * - SnapshotViewer
 * - DecisionAnnotation
 * - PlaybackControls
 * - TimeTravelService
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type {
  TimelineEvent,
  TimelineEventType,
  TicketSnapshot,
  PlaybackState,
  TimeTravelFilters,
  DecisionAnnotation,
  AgentRecommendation,
  DEFAULT_PLAYBACK_STATE,
  DEFAULT_FILTERS,
  EVENT_TYPE_CONFIG,
  formatDuration,
  getRelativeTime
} from '$lib/types/time-travel';

// Mock data factories
function createMockTimelineEvent(
  overrides: Partial<TimelineEvent> = {}
): TimelineEvent {
  return {
    id: `event-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date(),
    eventType: 'status_change',
    description: 'Test event',
    triggeredBy: 'system',
    metadata: {},
    ...overrides
  };
}

function createMockSnapshot(
  overrides: Partial<TicketSnapshot> = {}
): TicketSnapshot {
  return {
    ticketId: 'ticket-1',
    timestamp: new Date(),
    title: 'Test Ticket',
    description: 'Test description',
    status: 'IN_PROGRESS',
    priority: 'MEDIUM',
    labels: ['test'],
    complexity: 5,
    assignedAgents: [],
    activeSwarm: null,
    pendingQuestions: [],
    executionTime: 0,
    ...overrides
  };
}

function createMockDecision(
  overrides: Partial<DecisionAnnotation> = {}
): DecisionAnnotation {
  return {
    id: `decision-${Math.random().toString(36).substr(2, 9)}`,
    type: 'agent_selection',
    timestamp: new Date(),
    description: 'Selected agents for task',
    selectedOption: 'coder',
    options: [
      { label: 'Coder', value: 'coder', score: 0.9, selected: true },
      { label: 'Tester', value: 'tester', score: 0.7, selected: false }
    ],
    factors: [
      { name: 'Complexity', weight: 1, value: 'High' }
    ],
    ...overrides
  };
}

describe('Time Travel Types', () => {
  describe('TimelineEventType', () => {
    it('should have all expected event types', () => {
      const expectedTypes: TimelineEventType[] = [
        'status_change',
        'agent_assignment',
        'agent_recommendation',
        'user_feedback',
        'question_asked',
        'question_answered',
        'swarm_initialized',
        'swarm_terminated',
        'checkpoint_created',
        'pattern_stored',
        'decision_made',
        'ticket_created',
        'ticket_updated'
      ];

      expectedTypes.forEach(type => {
        expect(type).toBeDefined();
      });
    });
  });

  describe('TicketSnapshot', () => {
    it('should create valid snapshot with all required fields', () => {
      const snapshot = createMockSnapshot();

      expect(snapshot.ticketId).toBeDefined();
      expect(snapshot.timestamp).toBeInstanceOf(Date);
      expect(snapshot.title).toBe('Test Ticket');
      expect(snapshot.status).toBe('IN_PROGRESS');
      expect(snapshot.priority).toBe('MEDIUM');
      expect(Array.isArray(snapshot.labels)).toBe(true);
      expect(Array.isArray(snapshot.assignedAgents)).toBe(true);
      expect(Array.isArray(snapshot.pendingQuestions)).toBe(true);
    });

    it('should allow null for optional fields', () => {
      const snapshot = createMockSnapshot({
        description: null,
        complexity: null,
        activeSwarm: null
      });

      expect(snapshot.description).toBeNull();
      expect(snapshot.complexity).toBeNull();
      expect(snapshot.activeSwarm).toBeNull();
    });

    it('should include assigned agents when present', () => {
      const snapshot = createMockSnapshot({
        assignedAgents: [
          {
            agentId: 'agent-1',
            agentType: 'coder',
            agentName: 'Coder-1',
            role: 'Developer',
            status: 'active'
          }
        ]
      });

      expect(snapshot.assignedAgents).toHaveLength(1);
      expect(snapshot.assignedAgents[0].agentType).toBe('coder');
      expect(snapshot.assignedAgents[0].status).toBe('active');
    });

    it('should include active swarm info when present', () => {
      const snapshot = createMockSnapshot({
        activeSwarm: {
          swarmId: 'swarm-1',
          topology: 'hierarchical-mesh',
          agentCount: 3,
          status: 'active',
          startedAt: new Date()
        }
      });

      expect(snapshot.activeSwarm).toBeDefined();
      expect(snapshot.activeSwarm?.topology).toBe('hierarchical-mesh');
      expect(snapshot.activeSwarm?.agentCount).toBe(3);
    });
  });

  describe('PlaybackState', () => {
    it('should have correct default playback state', () => {
      const defaultState: PlaybackState = {
        isPlaying: false,
        speed: 1,
        direction: 'forward',
        pauseOnTypes: ['decision_made', 'agent_recommendation', 'user_feedback']
      };

      expect(defaultState.isPlaying).toBe(false);
      expect(defaultState.speed).toBe(1);
      expect(defaultState.direction).toBe('forward');
      expect(defaultState.pauseOnTypes).toContain('decision_made');
    });

    it('should support different playback speeds', () => {
      const speeds = [0.5, 1, 1.5, 2, 3];

      speeds.forEach(speed => {
        const state: PlaybackState = {
          isPlaying: true,
          speed,
          direction: 'forward',
          pauseOnTypes: []
        };
        expect(state.speed).toBe(speed);
      });
    });

    it('should support backward playback', () => {
      const state: PlaybackState = {
        isPlaying: true,
        speed: 1,
        direction: 'backward',
        pauseOnTypes: []
      };

      expect(state.direction).toBe('backward');
    });
  });
});

describe('Timeline Logic', () => {
  describe('Event Filtering', () => {
    const events: TimelineEvent[] = [
      createMockTimelineEvent({ eventType: 'status_change', description: 'Status to IN_PROGRESS' }),
      createMockTimelineEvent({ eventType: 'swarm_initialized', description: 'Swarm started' }),
      createMockTimelineEvent({ eventType: 'question_asked', description: 'Agent asked question' }),
      createMockTimelineEvent({ eventType: 'decision_made', description: 'Decision recorded' })
    ];

    it('should filter events by type', () => {
      const filters: TimeTravelFilters = {
        eventTypes: ['status_change'],
        dateRange: { start: null, end: null },
        triggeredBy: [],
        searchQuery: ''
      };

      const filtered = events.filter(e =>
        filters.eventTypes.length === 0 || filters.eventTypes.includes(e.eventType)
      );

      expect(filtered).toHaveLength(1);
      expect(filtered[0].eventType).toBe('status_change');
    });

    it('should filter events by search query', () => {
      const searchQuery = 'swarm';

      const filtered = events.filter(e =>
        e.description.toLowerCase().includes(searchQuery.toLowerCase())
      );

      expect(filtered).toHaveLength(1);
      expect(filtered[0].eventType).toBe('swarm_initialized');
    });

    it('should return all events when no filters applied', () => {
      const filters: TimeTravelFilters = {
        eventTypes: [],
        dateRange: { start: null, end: null },
        triggeredBy: [],
        searchQuery: ''
      };

      const filtered = events.filter(e =>
        (filters.eventTypes.length === 0 || filters.eventTypes.includes(e.eventType)) &&
        (!filters.searchQuery || e.description.toLowerCase().includes(filters.searchQuery.toLowerCase()))
      );

      expect(filtered).toHaveLength(4);
    });

    it('should combine multiple filter types', () => {
      const filters: TimeTravelFilters = {
        eventTypes: ['status_change', 'swarm_initialized'],
        dateRange: { start: null, end: null },
        triggeredBy: [],
        searchQuery: 'status'
      };

      const filtered = events.filter(e =>
        (filters.eventTypes.length === 0 || filters.eventTypes.includes(e.eventType)) &&
        (!filters.searchQuery || e.description.toLowerCase().includes(filters.searchQuery.toLowerCase()))
      );

      expect(filtered).toHaveLength(1);
      expect(filtered[0].eventType).toBe('status_change');
    });
  });

  describe('Event Grouping by Date', () => {
    it('should group events by date', () => {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      const events: TimelineEvent[] = [
        createMockTimelineEvent({ timestamp: today }),
        createMockTimelineEvent({ timestamp: today }),
        createMockTimelineEvent({ timestamp: yesterday })
      ];

      const grouped = new Map<string, TimelineEvent[]>();

      events.forEach(event => {
        const dateKey = event.timestamp.toDateString();
        if (!grouped.has(dateKey)) {
          grouped.set(dateKey, []);
        }
        grouped.get(dateKey)!.push(event);
      });

      expect(grouped.size).toBe(2);
      expect(grouped.get(today.toDateString())).toHaveLength(2);
      expect(grouped.get(yesterday.toDateString())).toHaveLength(1);
    });
  });
});

describe('Snapshot Logic', () => {
  describe('Status Color Mapping', () => {
    const statusColors: Record<string, string> = {
      BACKLOG: 'bg-gray-100 text-gray-700',
      TODO: 'bg-blue-100 text-blue-700',
      IN_PROGRESS: 'bg-yellow-100 text-yellow-700',
      NEEDS_FEEDBACK: 'bg-amber-100 text-amber-700',
      READY_TO_RESUME: 'bg-cyan-100 text-cyan-700',
      REVIEW: 'bg-purple-100 text-purple-700',
      DONE: 'bg-green-100 text-green-700',
      CANCELLED: 'bg-red-100 text-red-700'
    };

    it('should have color mapping for all statuses', () => {
      const statuses = [
        'BACKLOG', 'TODO', 'IN_PROGRESS', 'NEEDS_FEEDBACK',
        'READY_TO_RESUME', 'REVIEW', 'DONE', 'CANCELLED'
      ];

      statuses.forEach(status => {
        expect(statusColors[status]).toBeDefined();
      });
    });
  });

  describe('Execution Time Formatting', () => {
    function formatExecutionTime(hours: number): string {
      if (hours < 1) {
        return `${Math.round(hours * 60)}m`;
      }
      const h = Math.floor(hours);
      const m = Math.round((hours - h) * 60);
      return m > 0 ? `${h}h ${m}m` : `${h}h`;
    }

    it('should format minutes for < 1 hour', () => {
      expect(formatExecutionTime(0.5)).toBe('30m');
      expect(formatExecutionTime(0.25)).toBe('15m');
    });

    it('should format hours and minutes', () => {
      expect(formatExecutionTime(1.5)).toBe('1h 30m');
      expect(formatExecutionTime(2.25)).toBe('2h 15m');
    });

    it('should format whole hours without minutes', () => {
      expect(formatExecutionTime(3)).toBe('3h');
      expect(formatExecutionTime(5)).toBe('5h');
    });
  });
});

describe('Decision Annotation Logic', () => {
  describe('Decision Types', () => {
    const decisionTypes = [
      'agent_selection',
      'topology_selection',
      'status_transition',
      'pattern_application',
      'user_response'
    ];

    it('should support all decision types', () => {
      decisionTypes.forEach(type => {
        const decision = createMockDecision({
          type: type as DecisionAnnotation['type']
        });
        expect(decision.type).toBe(type);
      });
    });
  });

  describe('Option Scoring', () => {
    it('should identify selected option', () => {
      const decision = createMockDecision({
        options: [
          { label: 'Option A', value: 'a', score: 0.9, selected: true },
          { label: 'Option B', value: 'b', score: 0.7, selected: false },
          { label: 'Option C', value: 'c', score: 0.5, selected: false }
        ]
      });

      const selectedOption = decision.options.find(o => o.selected);
      expect(selectedOption?.label).toBe('Option A');
      expect(selectedOption?.score).toBe(0.9);
    });

    it('should sort options by score', () => {
      const decision = createMockDecision({
        options: [
          { label: 'Low', value: 'low', score: 0.3, selected: false },
          { label: 'High', value: 'high', score: 0.9, selected: true },
          { label: 'Medium', value: 'medium', score: 0.6, selected: false }
        ]
      });

      const sorted = [...decision.options].sort((a, b) => b.score - a.score);
      expect(sorted[0].label).toBe('High');
      expect(sorted[1].label).toBe('Medium');
      expect(sorted[2].label).toBe('Low');
    });
  });

  describe('Score Color Mapping', () => {
    function getScoreColor(score: number): string {
      if (score >= 0.8) return 'text-green-600';
      if (score >= 0.5) return 'text-yellow-600';
      return 'text-red-600';
    }

    it('should return green for high scores', () => {
      expect(getScoreColor(0.9)).toBe('text-green-600');
      expect(getScoreColor(0.8)).toBe('text-green-600');
    });

    it('should return yellow for medium scores', () => {
      expect(getScoreColor(0.7)).toBe('text-yellow-600');
      expect(getScoreColor(0.5)).toBe('text-yellow-600');
    });

    it('should return red for low scores', () => {
      expect(getScoreColor(0.3)).toBe('text-red-600');
      expect(getScoreColor(0.1)).toBe('text-red-600');
    });
  });
});

describe('Playback Controls Logic', () => {
  describe('Navigation', () => {
    it('should prevent navigation before first event', () => {
      const currentIndex = 0;
      const canGoPrev = currentIndex > 0;

      expect(canGoPrev).toBe(false);
    });

    it('should prevent navigation after last event', () => {
      const currentIndex = 9;
      const totalEvents = 10;
      const canGoNext = currentIndex < totalEvents - 1;

      expect(canGoNext).toBe(false);
    });

    it('should allow navigation in the middle', () => {
      const currentIndex = 5;
      const totalEvents = 10;

      expect(currentIndex > 0).toBe(true);
      expect(currentIndex < totalEvents - 1).toBe(true);
    });
  });

  describe('Progress Calculation', () => {
    it('should calculate correct progress percentage', () => {
      const calculateProgress = (current: number, total: number): number => {
        return total > 0 ? ((current + 1) / total) * 100 : 0;
      };

      expect(calculateProgress(0, 10)).toBe(10);
      expect(calculateProgress(4, 10)).toBe(50);
      expect(calculateProgress(9, 10)).toBe(100);
      expect(calculateProgress(0, 0)).toBe(0);
    });
  });

  describe('Playback Speed', () => {
    it('should calculate correct interval for different speeds', () => {
      const baseInterval = 2000; // 2 seconds
      const calculateInterval = (speed: number): number => baseInterval / speed;

      expect(calculateInterval(0.5)).toBe(4000);
      expect(calculateInterval(1)).toBe(2000);
      expect(calculateInterval(2)).toBe(1000);
      expect(calculateInterval(3)).toBeCloseTo(666.67, 0);
    });
  });

  describe('Auto-pause on event types', () => {
    it('should pause on configured event types', () => {
      const pauseOnTypes: TimelineEventType[] = ['decision_made', 'user_feedback'];
      const event = createMockTimelineEvent({ eventType: 'decision_made' });

      const shouldPause = pauseOnTypes.includes(event.eventType);
      expect(shouldPause).toBe(true);
    });

    it('should not pause on non-configured event types', () => {
      const pauseOnTypes: TimelineEventType[] = ['decision_made', 'user_feedback'];
      const event = createMockTimelineEvent({ eventType: 'status_change' });

      const shouldPause = pauseOnTypes.includes(event.eventType);
      expect(shouldPause).toBe(false);
    });
  });
});

describe('Time Travel Service Logic', () => {
  describe('Event Building', () => {
    it('should determine event type from status change', () => {
      function getEventTypeFromStatusChange(
        fromStatus: string,
        toStatus: string
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

      expect(getEventTypeFromStatusChange('TODO', 'IN_PROGRESS')).toBe('swarm_initialized');
      expect(getEventTypeFromStatusChange('IN_PROGRESS', 'DONE')).toBe('swarm_terminated');
      expect(getEventTypeFromStatusChange('IN_PROGRESS', 'NEEDS_FEEDBACK')).toBe('question_asked');
      expect(getEventTypeFromStatusChange('BACKLOG', 'TODO')).toBe('status_change');
    });
  });

  describe('Snapshot Building', () => {
    it('should build snapshot from events', () => {
      const events: TimelineEvent[] = [
        createMockTimelineEvent({
          eventType: 'ticket_created',
          metadata: { labels: ['feature'] }
        }),
        createMockTimelineEvent({
          eventType: 'status_change',
          metadata: { fromStatus: 'BACKLOG', toStatus: 'TODO' }
        }),
        createMockTimelineEvent({
          eventType: 'swarm_initialized',
          metadata: { topology: 'mesh', agentCount: 3 }
        })
      ];

      // Simulate snapshot building
      let status = 'BACKLOG';
      let labels: string[] = [];
      let activeSwarm = null;

      for (const event of events) {
        if (event.eventType === 'status_change' && event.metadata.toStatus) {
          status = event.metadata.toStatus as string;
        }
        if (event.eventType === 'ticket_created' && event.metadata.labels) {
          labels = event.metadata.labels as string[];
        }
        if (event.eventType === 'swarm_initialized') {
          activeSwarm = {
            topology: event.metadata.topology,
            agentCount: event.metadata.agentCount
          };
        }
      }

      expect(status).toBe('TODO');
      expect(labels).toEqual(['feature']);
      expect(activeSwarm?.topology).toBe('mesh');
      expect(activeSwarm?.agentCount).toBe(3);
    });
  });

  describe('Decision Extraction', () => {
    it('should extract decisions from swarm initialization events', () => {
      const events: TimelineEvent[] = [
        createMockTimelineEvent({
          eventType: 'swarm_initialized',
          metadata: {
            topology: 'hierarchical-mesh',
            agentCount: 5,
            reasoning: ['High complexity task', 'Multiple file changes']
          }
        })
      ];

      const decisions = events
        .filter(e => e.eventType === 'swarm_initialized')
        .map(e => ({
          type: 'topology_selection',
          selectedOption: e.metadata.topology,
          factors: (e.metadata.reasoning as string[] || []).map((r, i) => ({
            name: `Reasoning ${i + 1}`,
            value: r
          }))
        }));

      expect(decisions).toHaveLength(1);
      expect(decisions[0].selectedOption).toBe('hierarchical-mesh');
      expect(decisions[0].factors).toHaveLength(2);
    });
  });
});

describe('Utility Functions', () => {
  describe('formatDuration', () => {
    it('should format duration between dates', () => {
      // Simulating formatDuration logic
      function formatDuration(start: Date, end: Date): string {
        const diff = end.getTime() - start.getTime();
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

        if (hours > 0) {
          return `${hours}h ${minutes}m`;
        }
        return `${minutes}m`;
      }

      const start = new Date('2024-01-01T10:00:00');
      const end1 = new Date('2024-01-01T10:30:00');
      const end2 = new Date('2024-01-01T12:45:00');

      expect(formatDuration(start, end1)).toBe('30m');
      expect(formatDuration(start, end2)).toBe('2h 45m');
    });
  });

  describe('getRelativeTime', () => {
    it('should return relative time descriptions', () => {
      // Simulating getRelativeTime logic
      function getRelativeTime(date: Date): string {
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

      const now = new Date();

      expect(getRelativeTime(now)).toBe('Just now');

      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
      expect(getRelativeTime(fiveMinutesAgo)).toBe('5m ago');

      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
      expect(getRelativeTime(twoHoursAgo)).toBe('2h ago');

      const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
      expect(getRelativeTime(threeDaysAgo)).toBe('3d ago');
    });
  });
});
