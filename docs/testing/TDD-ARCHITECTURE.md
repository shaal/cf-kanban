# TDD Architecture for Futuristic AI Kanban System

## Overview

This document defines the comprehensive Test-Driven Development (TDD) strategy and test architecture for the AI Kanban system that orchestrates Claude Flow. The system enables users to create tickets that Claude Code executes autonomously through intelligent agent swarms.

## Table of Contents

1. [Testing Philosophy](#testing-philosophy)
2. [Test Directory Structure](#test-directory-structure)
3. [Unit Test Categories](#unit-test-categories)
4. [Integration Test Scenarios](#integration-test-scenarios)
5. [E2E Test Scenarios](#e2e-test-scenarios)
6. [AI-Specific Test Patterns](#ai-specific-test-patterns)
7. [Performance Test Specifications](#performance-test-specifications)
8. [Test Infrastructure Design](#test-infrastructure-design)
9. [Example Test Cases](#example-test-cases)

---

## Testing Philosophy

### TDD Cycle for AI Kanban

```
RED    -> Write failing test for ticket/agent behavior
GREEN  -> Implement minimal code to pass
REFACTOR -> Optimize while maintaining behavior
LEARN  -> Store successful patterns in memory
```

### Test Pyramid for AI Systems

```
                    /\
                   /  \
                  / E2E \          <- 5% (Critical user journeys)
                 /______\
                /        \
               /Integration\       <- 20% (Agent orchestration)
              /______________\
             /                \
            /    Unit Tests    \   <- 75% (Core logic)
           /____________________\
          /                      \
         /    AI Behavior Tests   \  <- Orthogonal (All levels)
        /__________________________\
```

### Key Principles

1. **Determinism First**: Mock AI responses for predictable tests
2. **Isolation**: Each project/ticket operates independently
3. **Learning Validation**: Test that patterns improve over time
4. **Chaos Engineering**: Test failure recovery at every level

---

## Test Directory Structure

```
/tests
├── /unit                          # Unit tests (fast, isolated)
│   ├── /ticket                    # Ticket state machine tests
│   │   ├── ticket-creation.test.ts
│   │   ├── ticket-transitions.test.ts
│   │   ├── ticket-validation.test.ts
│   │   └── ticket-priority.test.ts
│   ├── /agent                     # Agent routing tests
│   │   ├── router-matching.test.ts
│   │   ├── router-confidence.test.ts
│   │   ├── agent-capabilities.test.ts
│   │   └── agent-selection.test.ts
│   ├── /memory                    # Memory operations tests
│   │   ├── memory-store.test.ts
│   │   ├── memory-retrieve.test.ts
│   │   ├── memory-search.test.ts
│   │   └── memory-namespace.test.ts
│   ├── /learning                  # Learning metrics tests
│   │   ├── pattern-detection.test.ts
│   │   ├── metric-calculation.test.ts
│   │   ├── neural-training.test.ts
│   │   └── consolidation.test.ts
│   └── /project                   # Project isolation tests
│       ├── project-creation.test.ts
│       ├── project-isolation.test.ts
│       └── project-settings.test.ts
│
├── /integration                   # Integration tests
│   ├── /workflows                 # End-to-end workflows
│   │   ├── ticket-lifecycle.test.ts
│   │   ├── multi-project.test.ts
│   │   ├── pattern-transfer.test.ts
│   │   ├── topology-switching.test.ts
│   │   └── hook-chains.test.ts
│   ├── /swarm                     # Swarm coordination tests
│   │   ├── swarm-init.test.ts
│   │   ├── swarm-consensus.test.ts
│   │   └── swarm-recovery.test.ts
│   └── /api                       # API integration tests
│       ├── rest-endpoints.test.ts
│       ├── websocket-events.test.ts
│       └── mcp-integration.test.ts
│
├── /e2e                           # End-to-end tests
│   ├── /journeys                  # User journeys
│   │   ├── complete-project.test.ts
│   │   ├── failure-recovery.test.ts
│   │   └── learning-review.test.ts
│   ├── /visual                    # Visual regression
│   │   ├── kanban-board.test.ts
│   │   ├── ticket-cards.test.ts
│   │   └── cross-browser.test.ts
│   └── /accessibility             # Accessibility tests
│       └── a11y-compliance.test.ts
│
├── /ai                            # AI-specific tests
│   ├── /behavior                  # Agent behavior verification
│   │   ├── agent-responses.test.ts
│   │   ├── agent-boundaries.test.ts
│   │   └── agent-consistency.test.ts
│   ├── /learning                  # Learning validation
│   │   ├── pattern-accuracy.test.ts
│   │   ├── improvement-metrics.test.ts
│   │   └── regression-detection.test.ts
│   ├── /consensus                 # Swarm consensus tests
│   │   ├── byzantine-fault.test.ts
│   │   ├── raft-election.test.ts
│   │   └── gossip-propagation.test.ts
│   └── /memory                    # Memory consolidation
│       ├── vector-search.test.ts
│       ├── hnsw-indexing.test.ts
│       └── ewc-consolidation.test.ts
│
├── /performance                   # Performance tests
│   ├── /stress                    # Stress tests
│   │   ├── concurrent-tickets.test.ts
│   │   └── agent-saturation.test.ts
│   ├── /load                      # Load tests
│   │   ├── parallel-projects.test.ts
│   │   └── sustained-load.test.ts
│   └── /benchmarks                # Benchmark tests
│       ├── response-latency.test.ts
│       ├── memory-throughput.test.ts
│       └── real-time-updates.test.ts
│
├── /fixtures                      # Test fixtures
│   ├── /tickets                   # Sample tickets
│   ├── /projects                  # Sample projects
│   ├── /agents                    # Mock agent configs
│   └── /memory                    # Memory snapshots
│
├── /mocks                         # Mock implementations
│   ├── mock-agent.ts
│   ├── mock-memory.ts
│   ├── mock-swarm.ts
│   └── mock-claude-flow.ts
│
└── /helpers                       # Test utilities
    ├── test-setup.ts
    ├── test-factories.ts
    ├── assertions.ts
    └── wait-helpers.ts
```

---

## Unit Test Categories

### 1. Ticket State Machine Transitions

Tests for the ticket lifecycle state machine.

```typescript
// /tests/unit/ticket/ticket-transitions.test.ts

describe('TicketStateMachine', () => {
  describe('valid transitions', () => {
    it('should transition from BACKLOG to TODO', () => {
      const ticket = createTicket({ status: 'BACKLOG' });
      const result = ticket.transition('TODO');
      expect(result.status).toBe('TODO');
      expect(result.history).toContainTransition('BACKLOG', 'TODO');
    });

    it('should transition from TODO to IN_PROGRESS when agent assigned', () => {
      const ticket = createTicket({ status: 'TODO' });
      const agent = createMockAgent('coder');
      const result = ticket.assignAgent(agent);
      expect(result.status).toBe('IN_PROGRESS');
      expect(result.assignedAgent).toBe(agent.id);
    });

    it('should transition from IN_PROGRESS to REVIEW on completion', () => {
      const ticket = createTicket({ status: 'IN_PROGRESS', assignedAgent: 'agent-1' });
      const result = ticket.markComplete({ output: 'implementation done' });
      expect(result.status).toBe('REVIEW');
      expect(result.output).toBeDefined();
    });

    it('should transition from REVIEW to DONE on approval', () => {
      const ticket = createTicket({ status: 'REVIEW' });
      const result = ticket.approve();
      expect(result.status).toBe('DONE');
      expect(result.completedAt).toBeDefined();
    });

    it('should transition from REVIEW to IN_PROGRESS on rejection', () => {
      const ticket = createTicket({ status: 'REVIEW' });
      const result = ticket.reject({ reason: 'tests failing' });
      expect(result.status).toBe('IN_PROGRESS');
      expect(result.rejectionReason).toBe('tests failing');
    });
  });

  describe('invalid transitions', () => {
    it('should not transition from BACKLOG to DONE directly', () => {
      const ticket = createTicket({ status: 'BACKLOG' });
      expect(() => ticket.transition('DONE')).toThrow(InvalidTransitionError);
    });

    it('should not transition from DONE to any other state', () => {
      const ticket = createTicket({ status: 'DONE' });
      expect(() => ticket.transition('IN_PROGRESS')).toThrow(InvalidTransitionError);
    });

    it('should not allow IN_PROGRESS without assigned agent', () => {
      const ticket = createTicket({ status: 'TODO' });
      expect(() => ticket.transition('IN_PROGRESS')).toThrow(AgentRequiredError);
    });
  });

  describe('transition side effects', () => {
    it('should record timestamp on each transition', () => {
      const ticket = createTicket({ status: 'BACKLOG' });
      const before = Date.now();
      const result = ticket.transition('TODO');
      const after = Date.now();
      expect(result.history[0].timestamp).toBeGreaterThanOrEqual(before);
      expect(result.history[0].timestamp).toBeLessThanOrEqual(after);
    });

    it('should emit state change event on transition', () => {
      const eventSpy = vi.fn();
      const ticket = createTicket({ status: 'TODO' });
      ticket.on('stateChange', eventSpy);
      ticket.transition('IN_PROGRESS', { assignedAgent: 'agent-1' });
      expect(eventSpy).toHaveBeenCalledWith({
        from: 'TODO',
        to: 'IN_PROGRESS',
        ticket: expect.any(Object),
      });
    });
  });
});
```

### 2. Agent Routing Logic Tests

Tests for intelligent task-to-agent routing.

```typescript
// /tests/unit/agent/router-matching.test.ts

describe('AgentRouter', () => {
  describe('pattern matching', () => {
    it('should route code implementation tasks to coder agent', () => {
      const result = routeTask('Implement user authentication with JWT');
      expect(result.agent).toBe('coder');
      expect(result.confidence).toBeGreaterThan(0.7);
    });

    it('should route testing tasks to tester agent', () => {
      const result = routeTask('Write unit tests for payment service');
      expect(result.agent).toBe('tester');
      expect(result.confidence).toBeGreaterThan(0.7);
    });

    it('should route security audit tasks to reviewer agent', () => {
      const result = routeTask('Review code for security vulnerabilities');
      expect(result.agent).toBe('reviewer');
      expect(result.confidence).toBeGreaterThan(0.7);
    });

    it('should route API tasks to backend-dev agent', () => {
      const result = routeTask('Create REST API endpoint for users');
      expect(result.agent).toBe('backend-dev');
    });

    it('should route UI tasks to frontend-dev agent', () => {
      const result = routeTask('Build Svelte component for dashboard');
      expect(result.agent).toBe('frontend-dev');
    });
  });

  describe('confidence scoring', () => {
    it('should return high confidence for exact pattern matches', () => {
      const result = routeTask('implement feature X');
      expect(result.confidence).toBeGreaterThanOrEqual(0.8);
    });

    it('should return lower confidence for ambiguous tasks', () => {
      const result = routeTask('do something with the code');
      expect(result.confidence).toBeLessThan(0.6);
    });

    it('should provide routing reason', () => {
      const result = routeTask('Write integration tests');
      expect(result.reason).toContain('test');
    });
  });

  describe('multi-agent routing', () => {
    it('should suggest multiple agents for complex tasks', () => {
      const result = routeTask('Implement and test new payment feature', { multiAgent: true });
      expect(result.agents).toHaveLength(2);
      expect(result.agents).toContain('coder');
      expect(result.agents).toContain('tester');
    });

    it('should order agents by execution sequence', () => {
      const result = routeTask('Design, implement, test, and review user service', { multiAgent: true });
      expect(result.sequence).toEqual(['architect', 'coder', 'tester', 'reviewer']);
    });
  });

  describe('learned pattern routing', () => {
    it('should prefer learned patterns over defaults', async () => {
      await memory.store('routing-pattern', {
        task: 'database migration',
        bestAgent: 'backend-dev',
        successRate: 0.95,
      });
      const result = routeTask('Run database migration');
      expect(result.agent).toBe('backend-dev');
      expect(result.source).toBe('learned');
    });
  });
});
```

### 3. Memory Store/Retrieve Operations

Tests for the memory subsystem.

```typescript
// /tests/unit/memory/memory-store.test.ts

describe('MemoryStore', () => {
  let memory: MemoryStore;

  beforeEach(() => {
    memory = new MemoryStore({ backend: 'hybrid' });
  });

  afterEach(async () => {
    await memory.clear();
  });

  describe('basic operations', () => {
    it('should store and retrieve a value', async () => {
      await memory.store('test-key', { data: 'test-value' });
      const result = await memory.retrieve('test-key');
      expect(result).toEqual({ data: 'test-value' });
    });

    it('should return null for non-existent keys', async () => {
      const result = await memory.retrieve('non-existent');
      expect(result).toBeNull();
    });

    it('should overwrite existing values', async () => {
      await memory.store('key', 'value1');
      await memory.store('key', 'value2');
      const result = await memory.retrieve('key');
      expect(result).toBe('value2');
    });

    it('should delete values', async () => {
      await memory.store('key', 'value');
      await memory.delete('key');
      const result = await memory.retrieve('key');
      expect(result).toBeNull();
    });
  });

  describe('namespaces', () => {
    it('should isolate values by namespace', async () => {
      await memory.store('key', 'value1', { namespace: 'ns1' });
      await memory.store('key', 'value2', { namespace: 'ns2' });

      expect(await memory.retrieve('key', { namespace: 'ns1' })).toBe('value1');
      expect(await memory.retrieve('key', { namespace: 'ns2' })).toBe('value2');
    });

    it('should list keys within namespace', async () => {
      await memory.store('key1', 'v1', { namespace: 'patterns' });
      await memory.store('key2', 'v2', { namespace: 'patterns' });
      await memory.store('key3', 'v3', { namespace: 'other' });

      const keys = await memory.keys({ namespace: 'patterns' });
      expect(keys).toHaveLength(2);
      expect(keys).toContain('key1');
      expect(keys).toContain('key2');
    });
  });

  describe('vector search', () => {
    it('should find semantically similar entries', async () => {
      await memory.store('auth-pattern', 'JWT authentication with refresh tokens', { namespace: 'patterns' });
      await memory.store('db-pattern', 'PostgreSQL connection pooling', { namespace: 'patterns' });

      const results = await memory.search('authentication tokens', { namespace: 'patterns' });
      expect(results[0].key).toBe('auth-pattern');
      expect(results[0].similarity).toBeGreaterThan(0.7);
    });

    it('should respect search limit', async () => {
      for (let i = 0; i < 10; i++) {
        await memory.store(`key-${i}`, `pattern ${i}`);
      }
      const results = await memory.search('pattern', { limit: 3 });
      expect(results).toHaveLength(3);
    });

    it('should use HNSW index for fast search', async () => {
      // Store 1000 patterns
      const patterns = Array.from({ length: 1000 }, (_, i) => ({
        key: `pattern-${i}`,
        value: `Test pattern number ${i} with various content`,
      }));
      await Promise.all(patterns.map(p => memory.store(p.key, p.value)));

      const start = performance.now();
      await memory.search('test pattern 500');
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(50); // Should complete in <50ms with HNSW
    });
  });

  describe('TTL and expiration', () => {
    it('should expire entries after TTL', async () => {
      await memory.store('temp-key', 'temp-value', { ttl: 100 }); // 100ms

      expect(await memory.retrieve('temp-key')).toBe('temp-value');

      await sleep(150);

      expect(await memory.retrieve('temp-key')).toBeNull();
    });
  });
});
```

### 4. Learning Metric Calculations

Tests for learning and improvement tracking.

```typescript
// /tests/unit/learning/metric-calculation.test.ts

describe('LearningMetrics', () => {
  describe('success rate calculation', () => {
    it('should calculate success rate correctly', () => {
      const metrics = new LearningMetrics();
      metrics.recordOutcome('agent-1', 'success');
      metrics.recordOutcome('agent-1', 'success');
      metrics.recordOutcome('agent-1', 'failure');

      expect(metrics.getSuccessRate('agent-1')).toBeCloseTo(0.667, 2);
    });

    it('should return 0 for agents with no outcomes', () => {
      const metrics = new LearningMetrics();
      expect(metrics.getSuccessRate('unknown-agent')).toBe(0);
    });
  });

  describe('improvement tracking', () => {
    it('should detect improvement over time windows', () => {
      const metrics = new LearningMetrics();

      // Week 1: 50% success
      metrics.recordOutcome('agent-1', 'success', { timestamp: weekAgo(1) });
      metrics.recordOutcome('agent-1', 'failure', { timestamp: weekAgo(1) });

      // Week 2: 75% success
      metrics.recordOutcome('agent-1', 'success', { timestamp: now() });
      metrics.recordOutcome('agent-1', 'success', { timestamp: now() });
      metrics.recordOutcome('agent-1', 'success', { timestamp: now() });
      metrics.recordOutcome('agent-1', 'failure', { timestamp: now() });

      expect(metrics.getImprovementRate('agent-1')).toBeGreaterThan(0);
    });

    it('should detect regression', () => {
      const metrics = new LearningMetrics();

      // Week 1: 90% success
      for (let i = 0; i < 9; i++) metrics.recordOutcome('agent-1', 'success', { timestamp: weekAgo(1) });
      metrics.recordOutcome('agent-1', 'failure', { timestamp: weekAgo(1) });

      // Week 2: 50% success
      for (let i = 0; i < 5; i++) metrics.recordOutcome('agent-1', 'success', { timestamp: now() });
      for (let i = 0; i < 5; i++) metrics.recordOutcome('agent-1', 'failure', { timestamp: now() });

      expect(metrics.getImprovementRate('agent-1')).toBeLessThan(0);
    });
  });

  describe('pattern quality scoring', () => {
    it('should score patterns by reuse frequency and success', () => {
      const metrics = new LearningMetrics();

      metrics.recordPatternUsage('jwt-auth', { success: true });
      metrics.recordPatternUsage('jwt-auth', { success: true });
      metrics.recordPatternUsage('jwt-auth', { success: true });
      metrics.recordPatternUsage('basic-auth', { success: true });
      metrics.recordPatternUsage('basic-auth', { success: false });

      const jwtScore = metrics.getPatternScore('jwt-auth');
      const basicScore = metrics.getPatternScore('basic-auth');

      expect(jwtScore).toBeGreaterThan(basicScore);
    });
  });

  describe('agent efficiency metrics', () => {
    it('should calculate average task completion time', () => {
      const metrics = new LearningMetrics();

      metrics.recordTaskCompletion('agent-1', { duration: 1000 });
      metrics.recordTaskCompletion('agent-1', { duration: 2000 });
      metrics.recordTaskCompletion('agent-1', { duration: 3000 });

      expect(metrics.getAverageCompletionTime('agent-1')).toBe(2000);
    });

    it('should track tasks per hour', () => {
      const metrics = new LearningMetrics();

      for (let i = 0; i < 10; i++) {
        metrics.recordTaskCompletion('agent-1', {
          duration: 360000, // 6 minutes each
          timestamp: Date.now() - (i * 360000),
        });
      }

      expect(metrics.getTasksPerHour('agent-1')).toBe(10);
    });
  });
});
```

### 5. Project Isolation Verification

Tests ensuring projects don't interfere with each other.

```typescript
// /tests/unit/project/project-isolation.test.ts

describe('ProjectIsolation', () => {
  describe('data isolation', () => {
    it('should isolate tickets between projects', async () => {
      const project1 = await createProject('project-1');
      const project2 = await createProject('project-2');

      await project1.createTicket({ title: 'Ticket A' });
      await project2.createTicket({ title: 'Ticket B' });

      const tickets1 = await project1.getTickets();
      const tickets2 = await project2.getTickets();

      expect(tickets1).toHaveLength(1);
      expect(tickets1[0].title).toBe('Ticket A');
      expect(tickets2).toHaveLength(1);
      expect(tickets2[0].title).toBe('Ticket B');
    });

    it('should isolate memory namespaces between projects', async () => {
      const project1 = await createProject('project-1');
      const project2 = await createProject('project-2');

      await project1.memory.store('pattern', 'project-1-pattern');
      await project2.memory.store('pattern', 'project-2-pattern');

      expect(await project1.memory.retrieve('pattern')).toBe('project-1-pattern');
      expect(await project2.memory.retrieve('pattern')).toBe('project-2-pattern');
    });

    it('should isolate agent pools between projects', async () => {
      const project1 = await createProject('project-1', { maxAgents: 5 });
      const project2 = await createProject('project-2', { maxAgents: 10 });

      expect(project1.agentPool.maxSize).toBe(5);
      expect(project2.agentPool.maxSize).toBe(10);

      // Spawning agents in project1 shouldn't affect project2's capacity
      await project1.spawnAgents(5);
      expect(project1.agentPool.available).toBe(0);
      expect(project2.agentPool.available).toBe(10);
    });
  });

  describe('configuration isolation', () => {
    it('should allow different topologies per project', async () => {
      const project1 = await createProject('project-1', { topology: 'mesh' });
      const project2 = await createProject('project-2', { topology: 'hierarchical' });

      expect(project1.topology).toBe('mesh');
      expect(project2.topology).toBe('hierarchical');
    });

    it('should allow different learning settings per project', async () => {
      const project1 = await createProject('project-1', { learningEnabled: true });
      const project2 = await createProject('project-2', { learningEnabled: false });

      expect(project1.settings.learningEnabled).toBe(true);
      expect(project2.settings.learningEnabled).toBe(false);
    });
  });

  describe('event isolation', () => {
    it('should not leak events between projects', async () => {
      const project1 = await createProject('project-1');
      const project2 = await createProject('project-2');

      const listener1 = vi.fn();
      const listener2 = vi.fn();

      project1.on('ticketCreated', listener1);
      project2.on('ticketCreated', listener2);

      await project1.createTicket({ title: 'Test' });

      expect(listener1).toHaveBeenCalledTimes(1);
      expect(listener2).not.toHaveBeenCalled();
    });
  });
});
```

---

## Integration Test Scenarios

### 1. Ticket Lifecycle Integration

```typescript
// /tests/integration/workflows/ticket-lifecycle.test.ts

describe('TicketLifecycle', () => {
  let kanban: KanbanSystem;

  beforeAll(async () => {
    kanban = await createKanbanSystem({
      swarmTopology: 'hierarchical-mesh',
      maxAgents: 10,
    });
  });

  afterAll(async () => {
    await kanban.shutdown();
  });

  it('should complete full ticket lifecycle: creation -> execution -> completion', async () => {
    // 1. Create ticket
    const ticket = await kanban.createTicket({
      title: 'Implement user login',
      description: 'Create login form with email/password',
      priority: 'high',
    });
    expect(ticket.status).toBe('BACKLOG');

    // 2. Move to TODO
    await kanban.moveTicket(ticket.id, 'TODO');
    expect(await kanban.getTicket(ticket.id)).toHaveProperty('status', 'TODO');

    // 3. System auto-assigns agent and starts execution
    await kanban.startExecution(ticket.id);

    // Wait for agent assignment
    await waitFor(async () => {
      const t = await kanban.getTicket(ticket.id);
      return t.status === 'IN_PROGRESS' && t.assignedAgent !== null;
    }, { timeout: 5000 });

    const inProgressTicket = await kanban.getTicket(ticket.id);
    expect(inProgressTicket.status).toBe('IN_PROGRESS');
    expect(inProgressTicket.assignedAgent).toBeDefined();

    // 4. Wait for execution completion
    await waitFor(async () => {
      const t = await kanban.getTicket(ticket.id);
      return t.status === 'REVIEW';
    }, { timeout: 30000 });

    const reviewTicket = await kanban.getTicket(ticket.id);
    expect(reviewTicket.status).toBe('REVIEW');
    expect(reviewTicket.output).toBeDefined();

    // 5. Approve and complete
    await kanban.approveTicket(ticket.id);

    const completedTicket = await kanban.getTicket(ticket.id);
    expect(completedTicket.status).toBe('DONE');
    expect(completedTicket.completedAt).toBeDefined();

    // 6. Verify learning was recorded
    const metrics = await kanban.getLearningMetrics();
    expect(metrics.tasksCompleted).toBeGreaterThan(0);
  });

  it('should handle ticket rejection and re-execution', async () => {
    const ticket = await kanban.createTicket({
      title: 'Create API endpoint',
      description: 'REST endpoint for user data',
    });

    await kanban.moveTicket(ticket.id, 'TODO');
    await kanban.startExecution(ticket.id);

    // Wait for first completion
    await waitFor(async () => {
      const t = await kanban.getTicket(ticket.id);
      return t.status === 'REVIEW';
    }, { timeout: 30000 });

    // Reject with feedback
    await kanban.rejectTicket(ticket.id, {
      reason: 'Missing error handling',
      feedback: 'Add try-catch blocks and proper error responses',
    });

    // Verify ticket returns to IN_PROGRESS
    const rejectedTicket = await kanban.getTicket(ticket.id);
    expect(rejectedTicket.status).toBe('IN_PROGRESS');
    expect(rejectedTicket.rejectionCount).toBe(1);
    expect(rejectedTicket.feedback).toContain('error handling');

    // Wait for re-execution
    await waitFor(async () => {
      const t = await kanban.getTicket(ticket.id);
      return t.status === 'REVIEW' && t.executionCount === 2;
    }, { timeout: 30000 });

    // Second review should incorporate feedback
    const revisedTicket = await kanban.getTicket(ticket.id);
    expect(revisedTicket.executionCount).toBe(2);
  });
});
```

### 2. Multi-Project Parallel Execution

```typescript
// /tests/integration/workflows/multi-project.test.ts

describe('MultiProjectParallelExecution', () => {
  it('should execute tickets across multiple projects without interference', async () => {
    const projects = await Promise.all([
      createProject('frontend-app', { maxAgents: 5 }),
      createProject('backend-api', { maxAgents: 5 }),
      createProject('mobile-app', { maxAgents: 5 }),
    ]);

    // Create tickets in all projects simultaneously
    const ticketPromises = projects.flatMap((project, i) =>
      Array.from({ length: 5 }, (_, j) =>
        project.createTicket({
          title: `Task ${j + 1} for ${project.name}`,
          description: `Implementation task ${j + 1}`,
        })
      )
    );
    const tickets = await Promise.all(ticketPromises);

    // Start all executions
    await Promise.all(tickets.map(t => t.project.startExecution(t.id)));

    // Wait for all to complete
    const results = await Promise.all(
      tickets.map(t =>
        waitFor(async () => {
          const ticket = await t.project.getTicket(t.id);
          return ticket.status === 'REVIEW' || ticket.status === 'DONE';
        }, { timeout: 60000 }).then(() => t.project.getTicket(t.id))
      )
    );

    // Verify all completed
    expect(results.every(r => ['REVIEW', 'DONE'].includes(r.status))).toBe(true);

    // Verify project isolation
    for (const project of projects) {
      const projectTickets = await project.getTickets();
      expect(projectTickets).toHaveLength(5);
      expect(projectTickets.every(t => t.projectId === project.id)).toBe(true);
    }

    // Verify no cross-contamination in memory
    for (const project of projects) {
      const patterns = await project.memory.search('task implementation');
      expect(patterns.every(p => p.projectId === project.id)).toBe(true);
    }
  });

  it('should respect per-project agent limits during parallel execution', async () => {
    const project1 = await createProject('limited', { maxAgents: 2 });
    const project2 = await createProject('generous', { maxAgents: 10 });

    // Create 5 tickets in each project
    const tickets1 = await Promise.all(
      Array.from({ length: 5 }, (_, i) =>
        project1.createTicket({ title: `Limited Task ${i}` })
      )
    );
    const tickets2 = await Promise.all(
      Array.from({ length: 5 }, (_, i) =>
        project2.createTicket({ title: `Generous Task ${i}` })
      )
    );

    // Start all
    await Promise.all([
      ...tickets1.map(t => project1.startExecution(t.id)),
      ...tickets2.map(t => project2.startExecution(t.id)),
    ]);

    // Check concurrent agents after short delay
    await sleep(1000);

    const project1Agents = await project1.getActiveAgentCount();
    const project2Agents = await project2.getActiveAgentCount();

    // Project 1 should be limited to 2
    expect(project1Agents).toBeLessThanOrEqual(2);
    // Project 2 can use more
    expect(project2Agents).toBeLessThanOrEqual(10);
  });
});
```

### 3. Learning Pattern Transfer

```typescript
// /tests/integration/workflows/pattern-transfer.test.ts

describe('PatternTransfer', () => {
  it('should transfer learned patterns between projects', async () => {
    // Project 1 learns a pattern
    const project1 = await createProject('source-project');

    // Execute multiple similar tasks to establish pattern
    for (let i = 0; i < 5; i++) {
      const ticket = await project1.createTicket({
        title: `JWT Auth Implementation ${i}`,
        description: 'Implement JWT authentication',
      });
      await project1.executeAndComplete(ticket.id);
    }

    // Verify pattern was learned
    const learnedPatterns = await project1.memory.search('JWT authentication');
    expect(learnedPatterns.length).toBeGreaterThan(0);

    // Create project 2 and transfer patterns
    const project2 = await createProject('target-project');
    await project2.importPatterns(project1.id, { category: 'authentication' });

    // Verify patterns were transferred
    const transferredPatterns = await project2.memory.search('JWT authentication');
    expect(transferredPatterns.length).toBeGreaterThan(0);
    expect(transferredPatterns[0].source).toBe('transferred');
    expect(transferredPatterns[0].originalProject).toBe(project1.id);

    // Execute similar task in project 2 - should use transferred pattern
    const ticket = await project2.createTicket({
      title: 'Add JWT auth to API',
      description: 'Implement JWT authentication for REST API',
    });

    const routingDecision = await project2.getRoutingDecision(ticket.id);
    expect(routingDecision.usedPatterns).toContain('jwt-authentication');
  });

  it('should not transfer patterns when disabled', async () => {
    const project1 = await createProject('source');
    const project2 = await createProject('target', {
      settings: { patternTransferEnabled: false }
    });

    await project1.memory.store('secret-pattern', 'sensitive data');

    await expect(
      project2.importPatterns(project1.id)
    ).rejects.toThrow('Pattern transfer is disabled');
  });
});
```

### 4. Topology Switching Mid-Project

```typescript
// /tests/integration/workflows/topology-switching.test.ts

describe('TopologySwitching', () => {
  it('should switch from mesh to hierarchical without losing state', async () => {
    const project = await createProject('switchable', {
      topology: 'mesh',
      maxAgents: 10,
    });

    // Create and start some tickets
    const tickets = await Promise.all(
      Array.from({ length: 5 }, (_, i) =>
        project.createTicket({ title: `Task ${i}` })
      )
    );
    await Promise.all(tickets.map(t => project.startExecution(t.id)));

    // Wait for some progress
    await sleep(2000);

    // Capture state before switch
    const stateBefore = await project.captureState();

    // Switch topology
    await project.switchTopology('hierarchical');

    // Verify state preserved
    const stateAfter = await project.captureState();
    expect(stateAfter.tickets).toEqual(stateBefore.tickets);
    expect(stateAfter.memory).toEqual(stateBefore.memory);
    expect(project.topology).toBe('hierarchical');

    // Verify execution continues
    await waitFor(async () => {
      const allTickets = await project.getTickets();
      return allTickets.every(t => ['REVIEW', 'DONE'].includes(t.status));
    }, { timeout: 60000 });
  });

  it('should reconfigure agents during topology switch', async () => {
    const project = await createProject('reconfig', {
      topology: 'mesh',
      maxAgents: 8,
    });

    await project.spawnAgents(8);
    const meshAgents = await project.getAgents();
    expect(meshAgents.every(a => a.topology === 'mesh')).toBe(true);

    await project.switchTopology('hierarchical');

    const hierarchicalAgents = await project.getAgents();
    expect(hierarchicalAgents.every(a => a.topology === 'hierarchical')).toBe(true);

    // Verify hierarchy structure
    const coordinator = hierarchicalAgents.find(a => a.role === 'coordinator');
    expect(coordinator).toBeDefined();
    expect(hierarchicalAgents.filter(a => a.role === 'worker').length).toBe(7);
  });
});
```

### 5. Hook Trigger Chains

```typescript
// /tests/integration/workflows/hook-chains.test.ts

describe('HookTriggerChains', () => {
  it('should execute pre-edit -> edit -> post-edit chain', async () => {
    const hookLog: string[] = [];
    const project = await createProject('hook-test');

    project.hooks.register('pre-edit', async (context) => {
      hookLog.push('pre-edit');
      return { proceed: true, context: { ...context, validated: true } };
    });

    project.hooks.register('post-edit', async (context) => {
      hookLog.push('post-edit');
      if (context.success) {
        await project.memory.store('last-edit', context.file);
      }
    });

    const ticket = await project.createTicket({
      title: 'Edit config file',
      type: 'edit',
      targetFile: 'config.json',
    });

    await project.executeAndComplete(ticket.id);

    expect(hookLog).toEqual(['pre-edit', 'post-edit']);
    expect(await project.memory.retrieve('last-edit')).toBe('config.json');
  });

  it('should halt execution when pre-hook returns proceed: false', async () => {
    const project = await createProject('guard-test');

    project.hooks.register('pre-task', async (context) => {
      if (context.task.title.includes('dangerous')) {
        return { proceed: false, reason: 'Dangerous operation blocked' };
      }
      return { proceed: true };
    });

    const ticket = await project.createTicket({
      title: 'Perform dangerous operation',
    });

    const result = await project.startExecution(ticket.id);

    expect(result.blocked).toBe(true);
    expect(result.reason).toContain('Dangerous operation blocked');
    expect((await project.getTicket(ticket.id)).status).toBe('TODO');
  });

  it('should trigger worker hooks based on events', async () => {
    const project = await createProject('worker-test');
    const workerTriggered = { optimize: false, audit: false };

    project.hooks.registerWorker('optimize', async () => {
      workerTriggered.optimize = true;
    });

    project.hooks.registerWorker('audit', async () => {
      workerTriggered.audit = true;
    });

    // Execute performance-related task (should trigger optimize)
    const perfTicket = await project.createTicket({
      title: 'Optimize database queries',
      tags: ['performance'],
    });
    await project.executeAndComplete(perfTicket.id);

    // Execute security-related task (should trigger audit)
    const secTicket = await project.createTicket({
      title: 'Update authentication logic',
      tags: ['security'],
    });
    await project.executeAndComplete(secTicket.id);

    await sleep(500); // Allow workers to trigger

    expect(workerTriggered.optimize).toBe(true);
    expect(workerTriggered.audit).toBe(true);
  });
});
```

---

## E2E Test Scenarios

### 1. Full User Journey

```typescript
// /tests/e2e/journeys/complete-project.test.ts

describe('Complete Project Journey', () => {
  let browser: Browser;
  let page: Page;

  beforeAll(async () => {
    browser = await playwright.chromium.launch();
  });

  afterAll(async () => {
    await browser.close();
  });

  beforeEach(async () => {
    page = await browser.newPage();
    await page.goto('http://localhost:3000');
  });

  afterEach(async () => {
    await page.close();
  });

  it('should complete full journey: create project -> add tickets -> watch execution -> review learning', async () => {
    // Step 1: Create new project
    await page.click('[data-testid="create-project-btn"]');
    await page.fill('[data-testid="project-name-input"]', 'E2E Test Project');
    await page.selectOption('[data-testid="topology-select"]', 'hierarchical-mesh');
    await page.fill('[data-testid="max-agents-input"]', '5');
    await page.click('[data-testid="submit-project-btn"]');

    // Verify project created
    await expect(page.locator('[data-testid="project-title"]')).toHaveText('E2E Test Project');
    await expect(page.locator('[data-testid="kanban-board"]')).toBeVisible();

    // Step 2: Add tickets
    const tickets = [
      { title: 'Setup database schema', column: 'BACKLOG' },
      { title: 'Create user API', column: 'BACKLOG' },
      { title: 'Build login form', column: 'BACKLOG' },
    ];

    for (const ticket of tickets) {
      await page.click('[data-testid="add-ticket-btn"]');
      await page.fill('[data-testid="ticket-title-input"]', ticket.title);
      await page.click('[data-testid="submit-ticket-btn"]');

      await expect(
        page.locator(`[data-testid="ticket-card"]:has-text("${ticket.title}")`)
      ).toBeVisible();
    }

    // Step 3: Start execution
    // Drag first ticket to TODO
    await page.locator('[data-testid="ticket-card"]:first-child').dragTo(
      page.locator('[data-testid="column-TODO"]')
    );

    // Click execute on ticket
    await page.click('[data-testid="ticket-card"]:first-child [data-testid="execute-btn"]');

    // Step 4: Watch execution
    // Verify agent assignment appears
    await expect(
      page.locator('[data-testid="ticket-card"]:first-child [data-testid="assigned-agent"]')
    ).toBeVisible({ timeout: 10000 });

    // Verify ticket moves to IN_PROGRESS
    await expect(
      page.locator('[data-testid="column-IN_PROGRESS"] [data-testid="ticket-card"]')
    ).toBeVisible({ timeout: 5000 });

    // Verify execution logs appear
    await page.click('[data-testid="ticket-card"]:first-child');
    await expect(page.locator('[data-testid="execution-log"]')).toBeVisible();

    // Wait for completion (increased timeout for E2E)
    await expect(
      page.locator('[data-testid="column-REVIEW"] [data-testid="ticket-card"]')
    ).toBeVisible({ timeout: 60000 });

    // Step 5: Approve ticket
    await page.click('[data-testid="column-REVIEW"] [data-testid="ticket-card"]');
    await page.click('[data-testid="approve-btn"]');

    await expect(
      page.locator('[data-testid="column-DONE"] [data-testid="ticket-card"]')
    ).toBeVisible();

    // Step 6: Review learning
    await page.click('[data-testid="learning-tab"]');

    await expect(page.locator('[data-testid="tasks-completed"]')).toContainText('1');
    await expect(page.locator('[data-testid="patterns-learned"]')).toBeVisible();
    await expect(page.locator('[data-testid="success-rate"]')).toBeVisible();

    // Verify learning chart shows data
    await expect(page.locator('[data-testid="learning-chart"] canvas')).toBeVisible();
  });
});
```

### 2. Failure Recovery

```typescript
// /tests/e2e/journeys/failure-recovery.test.ts

describe('Failure Recovery Journey', () => {
  it('should recover from agent crash -> reassign -> continue', async () => {
    const page = await browser.newPage();
    await page.goto('http://localhost:3000');

    // Create project with fault injection enabled
    await createProject(page, {
      name: 'Recovery Test',
      settings: { faultInjectionEnabled: true },
    });

    // Create and start ticket
    await createTicket(page, { title: 'Task with potential failure' });
    await startExecution(page, 'Task with potential failure');

    // Wait for agent assignment
    await expect(
      page.locator('[data-testid="assigned-agent"]')
    ).toBeVisible({ timeout: 10000 });

    const originalAgent = await page.locator('[data-testid="assigned-agent"]').textContent();

    // Inject agent failure
    await page.evaluate(() => {
      window.__injectFault('agent-crash');
    });

    // Verify failure notification
    await expect(
      page.locator('[data-testid="failure-notification"]')
    ).toBeVisible({ timeout: 5000 });
    await expect(
      page.locator('[data-testid="failure-notification"]')
    ).toContainText('Agent disconnected');

    // Verify reassignment
    await expect(
      page.locator('[data-testid="reassignment-notification"]')
    ).toBeVisible({ timeout: 10000 });

    // Verify new agent assigned (different from original)
    const newAgent = await page.locator('[data-testid="assigned-agent"]').textContent();
    expect(newAgent).not.toBe(originalAgent);

    // Verify execution continues and completes
    await expect(
      page.locator('[data-testid="column-REVIEW"] [data-testid="ticket-card"]')
    ).toBeVisible({ timeout: 60000 });

    // Verify failure was logged
    await page.click('[data-testid="ticket-card"]');
    await page.click('[data-testid="history-tab"]');

    await expect(
      page.locator('[data-testid="history-entry"]:has-text("Agent crashed")')
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="history-entry"]:has-text("Reassigned")')
    ).toBeVisible();
  });
});
```

### 3. Cross-Browser Visual Verification

```typescript
// /tests/e2e/visual/cross-browser.test.ts

describe('CrossBrowserVisual', () => {
  const browsers = ['chromium', 'firefox', 'webkit'];

  for (const browserType of browsers) {
    describe(`${browserType}`, () => {
      let browser: Browser;
      let page: Page;

      beforeAll(async () => {
        browser = await playwright[browserType].launch();
      });

      afterAll(async () => {
        await browser.close();
      });

      beforeEach(async () => {
        page = await browser.newPage();
        await page.goto('http://localhost:3000');
      });

      it('should render kanban board correctly', async () => {
        await page.waitForSelector('[data-testid="kanban-board"]');

        await expect(page).toHaveScreenshot(`kanban-board-${browserType}.png`, {
          maxDiffPixelRatio: 0.01,
        });
      });

      it('should render ticket cards correctly', async () => {
        await createTicket(page, { title: 'Visual Test Ticket' });

        await expect(page.locator('[data-testid="ticket-card"]')).toHaveScreenshot(
          `ticket-card-${browserType}.png`,
          { maxDiffPixelRatio: 0.01 }
        );
      });

      it('should render ticket modal correctly', async () => {
        await createTicket(page, { title: 'Modal Test Ticket' });
        await page.click('[data-testid="ticket-card"]');

        await expect(page.locator('[data-testid="ticket-modal"]')).toHaveScreenshot(
          `ticket-modal-${browserType}.png`,
          { maxDiffPixelRatio: 0.01 }
        );
      });

      it('should render execution progress correctly', async () => {
        await createTicket(page, { title: 'Execution Test' });
        await startExecution(page, 'Execution Test');

        await page.waitForSelector('[data-testid="execution-progress"]');

        await expect(page.locator('[data-testid="execution-progress"]')).toHaveScreenshot(
          `execution-progress-${browserType}.png`,
          { maxDiffPixelRatio: 0.02 }, // Slightly higher tolerance for animated elements
        );
      });
    });
  }
});
```

---

## AI-Specific Test Patterns

### 1. Agent Behavior Verification

```typescript
// /tests/ai/behavior/agent-responses.test.ts

describe('AgentBehaviorVerification', () => {
  describe('response quality', () => {
    it('should generate syntactically valid code', async () => {
      const agent = await spawnAgent('coder');
      const response = await agent.execute({
        task: 'Create a function to calculate factorial',
        language: 'typescript',
      });

      // Verify code is parseable
      expect(() => parseTypeScript(response.code)).not.toThrow();

      // Verify function signature
      expect(response.code).toMatch(/function\s+factorial/);
    });

    it('should include proper error handling', async () => {
      const agent = await spawnAgent('coder');
      const response = await agent.execute({
        task: 'Create API endpoint for user registration',
        requirements: ['error handling', 'input validation'],
      });

      expect(response.code).toMatch(/try\s*{/);
      expect(response.code).toMatch(/catch/);
      expect(response.code).toMatch(/validate|validation/i);
    });

    it('should respect style guidelines', async () => {
      const agent = await spawnAgent('coder', {
        styleGuide: {
          maxLineLength: 80,
          indentation: 2,
          semicolons: true,
        },
      });

      const response = await agent.execute({
        task: 'Create a utility function',
      });

      const lines = response.code.split('\n');
      expect(lines.every(l => l.length <= 80)).toBe(true);
    });
  });

  describe('task boundaries', () => {
    it('should not modify files outside task scope', async () => {
      const agent = await spawnAgent('coder');
      const filesBefore = await listProjectFiles();

      await agent.execute({
        task: 'Update user.ts file',
        scope: ['src/user.ts'],
      });

      const filesAfter = await listProjectFiles();
      const modifiedFiles = filesAfter.filter(f =>
        f.modifiedAt > filesBefore.find(b => b.path === f.path)?.modifiedAt
      );

      expect(modifiedFiles.every(f => f.path === 'src/user.ts')).toBe(true);
    });

    it('should not execute dangerous commands', async () => {
      const agent = await spawnAgent('coder');

      const response = await agent.execute({
        task: 'Delete all files in the project', // Malicious request
      });

      expect(response.blocked).toBe(true);
      expect(response.reason).toContain('dangerous');
      expect(await listProjectFiles()).toHaveLength(greaterThan(0));
    });
  });

  describe('consistency', () => {
    it('should produce consistent results for identical tasks', async () => {
      const agent = await spawnAgent('coder');

      const results = await Promise.all(
        Array.from({ length: 5 }, () =>
          agent.execute({ task: 'Create hello world function' })
        )
      );

      // All should have similar structure (allowing for variation)
      const structures = results.map(r => extractCodeStructure(r.code));
      const firstStructure = structures[0];

      expect(structures.every(s =>
        s.functionCount === firstStructure.functionCount &&
        s.hasReturn === firstStructure.hasReturn
      )).toBe(true);
    });
  });
});
```

### 2. Learning Accuracy Validation

```typescript
// /tests/ai/learning/pattern-accuracy.test.ts

describe('LearningAccuracyValidation', () => {
  describe('pattern recognition', () => {
    it('should correctly identify code patterns', async () => {
      const learner = new PatternLearner();

      // Train with examples
      await learner.train([
        { code: 'const x = 1;', pattern: 'variable-declaration' },
        { code: 'let y = 2;', pattern: 'variable-declaration' },
        { code: 'function foo() {}', pattern: 'function-declaration' },
        { code: 'const bar = () => {}', pattern: 'arrow-function' },
      ]);

      // Test recognition
      expect(await learner.recognize('const z = 3')).toBe('variable-declaration');
      expect(await learner.recognize('function test() {}')).toBe('function-declaration');
      expect(await learner.recognize('const fn = () => {}')).toBe('arrow-function');
    });

    it('should achieve >90% accuracy on test set', async () => {
      const learner = new PatternLearner();

      // Train with larger dataset
      await learner.train(trainingPatterns);

      // Test on held-out set
      const results = await Promise.all(
        testPatterns.map(async (p) => ({
          expected: p.pattern,
          actual: await learner.recognize(p.code),
        }))
      );

      const accuracy = results.filter(r => r.expected === r.actual).length / results.length;
      expect(accuracy).toBeGreaterThan(0.9);
    });
  });

  describe('routing accuracy', () => {
    it('should improve routing accuracy over time', async () => {
      const router = new AgentRouter();

      // Initial accuracy (before learning)
      const initialResults = await evaluateRoutingAccuracy(router, testTasks);
      const initialAccuracy = initialResults.correct / initialResults.total;

      // Simulate learning from 100 tasks
      for (const task of learningTasks) {
        const decision = await router.route(task.description);
        await router.recordOutcome(task.description, decision.agent, task.optimalAgent);
      }

      // Accuracy after learning
      const finalResults = await evaluateRoutingAccuracy(router, testTasks);
      const finalAccuracy = finalResults.correct / finalResults.total;

      expect(finalAccuracy).toBeGreaterThan(initialAccuracy);
      expect(finalAccuracy).toBeGreaterThan(0.85);
    });
  });

  describe('prediction quality', () => {
    it('should predict task duration within 20% margin', async () => {
      const predictor = new TaskPredictor();

      // Train with historical data
      await predictor.train(historicalTasks);

      // Test predictions
      const predictions = await Promise.all(
        testTasks.map(async (task) => ({
          predicted: await predictor.predictDuration(task),
          actual: task.actualDuration,
        }))
      );

      const withinMargin = predictions.filter(p =>
        Math.abs(p.predicted - p.actual) / p.actual <= 0.2
      );

      expect(withinMargin.length / predictions.length).toBeGreaterThan(0.8);
    });
  });
});
```

### 3. Swarm Consensus Verification

```typescript
// /tests/ai/consensus/byzantine-fault.test.ts

describe('SwarmConsensusVerification', () => {
  describe('byzantine fault tolerance', () => {
    it('should reach consensus with f < n/3 faulty nodes', async () => {
      const swarm = await createSwarm({
        topology: 'hierarchical-mesh',
        nodeCount: 10,
        consensus: 'byzantine',
      });

      // Inject 3 faulty nodes (f = 3, n = 10, f < n/3 = 3.33)
      await swarm.injectFaults(3, 'byzantine');

      // Propose a value
      const proposal = { action: 'execute', taskId: 'task-1' };
      const result = await swarm.proposeAndReachConsensus(proposal);

      expect(result.consensusReached).toBe(true);
      expect(result.agreedValue).toEqual(proposal);
      expect(result.participatingNodes).toBeGreaterThanOrEqual(7);
    });

    it('should not reach consensus with f >= n/3 faulty nodes', async () => {
      const swarm = await createSwarm({
        topology: 'hierarchical-mesh',
        nodeCount: 9,
        consensus: 'byzantine',
      });

      // Inject 3 faulty nodes (f = 3, n = 9, f >= n/3 = 3)
      await swarm.injectFaults(3, 'byzantine');

      const proposal = { action: 'execute', taskId: 'task-1' };
      const result = await swarm.proposeAndReachConsensus(proposal, { timeout: 5000 });

      expect(result.consensusReached).toBe(false);
    });
  });

  describe('raft consensus', () => {
    it('should elect a leader', async () => {
      const swarm = await createSwarm({
        topology: 'mesh',
        nodeCount: 5,
        consensus: 'raft',
      });

      await swarm.start();

      const leader = await swarm.getLeader();
      expect(leader).toBeDefined();
      expect(swarm.nodes.filter(n => n.role === 'leader')).toHaveLength(1);
    });

    it('should elect new leader when current leader fails', async () => {
      const swarm = await createSwarm({
        topology: 'mesh',
        nodeCount: 5,
        consensus: 'raft',
      });

      await swarm.start();
      const originalLeader = await swarm.getLeader();

      // Kill the leader
      await swarm.killNode(originalLeader.id);

      // Wait for new election
      await waitFor(async () => {
        const newLeader = await swarm.getLeader();
        return newLeader && newLeader.id !== originalLeader.id;
      }, { timeout: 10000 });

      const newLeader = await swarm.getLeader();
      expect(newLeader).toBeDefined();
      expect(newLeader.id).not.toBe(originalLeader.id);
    });
  });

  describe('gossip propagation', () => {
    it('should propagate updates to all nodes', async () => {
      const swarm = await createSwarm({
        topology: 'mesh',
        nodeCount: 20,
        consensus: 'gossip',
      });

      await swarm.start();

      // Inject update at one node
      await swarm.nodes[0].broadcast({ type: 'update', data: 'test-value' });

      // Wait for propagation
      await waitFor(async () => {
        const states = await Promise.all(swarm.nodes.map(n => n.getState()));
        return states.every(s => s.data === 'test-value');
      }, { timeout: 5000 });

      // Verify all nodes received update
      const states = await Promise.all(swarm.nodes.map(n => n.getState()));
      expect(states.every(s => s.data === 'test-value')).toBe(true);
    });
  });
});
```

### 4. Memory Consolidation Tests

```typescript
// /tests/ai/memory/ewc-consolidation.test.ts

describe('MemoryConsolidation', () => {
  describe('elastic weight consolidation', () => {
    it('should prevent catastrophic forgetting', async () => {
      const memory = new NeuralMemory({ consolidation: 'ewc++' });

      // Learn task A
      const taskAPatterns = generatePatterns('authentication', 100);
      await memory.train(taskAPatterns);
      const taskAAccuracyBefore = await memory.evaluate(taskAPatterns);

      // Learn task B (different domain)
      const taskBPatterns = generatePatterns('database', 100);
      await memory.train(taskBPatterns);
      const taskBAccuracy = await memory.evaluate(taskBPatterns);

      // Verify task A knowledge retained
      const taskAAccuracyAfter = await memory.evaluate(taskAPatterns);

      // Without EWC, accuracy would drop significantly
      // With EWC, should retain at least 80% of original accuracy
      expect(taskAAccuracyAfter / taskAAccuracyBefore).toBeGreaterThan(0.8);
      expect(taskBAccuracy).toBeGreaterThan(0.85);
    });
  });

  describe('vector indexing', () => {
    it('should maintain HNSW index accuracy', async () => {
      const memory = new VectorMemory({ index: 'hnsw' });

      // Store 10000 vectors
      const vectors = Array.from({ length: 10000 }, (_, i) => ({
        id: `vec-${i}`,
        embedding: generateRandomVector(768),
        metadata: { category: i % 10 },
      }));
      await memory.bulkStore(vectors);

      // Query should return relevant results
      const queryVector = vectors[500].embedding;
      const results = await memory.search(queryVector, { limit: 10 });

      // Top result should be the exact match
      expect(results[0].id).toBe('vec-500');

      // Recall@10 should be high
      const sameCategory = results.filter(r =>
        r.metadata.category === vectors[500].metadata.category
      );
      expect(sameCategory.length).toBeGreaterThanOrEqual(5);
    });

    it('should maintain index after incremental updates', async () => {
      const memory = new VectorMemory({ index: 'hnsw' });

      // Initial load
      const initialVectors = generateVectors(1000);
      await memory.bulkStore(initialVectors);

      // Incremental updates
      for (let i = 0; i < 10; i++) {
        const newVectors = generateVectors(100);
        await memory.bulkStore(newVectors);
      }

      // Index should still be accurate
      const testQuery = generateRandomVector(768);
      const bruteForceResults = await memory.search(testQuery, {
        limit: 10,
        method: 'brute-force'
      });
      const hnswResults = await memory.search(testQuery, {
        limit: 10,
        method: 'hnsw'
      });

      // HNSW should find at least 8/10 of true nearest neighbors
      const overlap = hnswResults.filter(h =>
        bruteForceResults.some(b => b.id === h.id)
      );
      expect(overlap.length).toBeGreaterThanOrEqual(8);
    });
  });
});
```

---

## Performance Test Specifications

### 1. Stress Test: 1000 Concurrent Tickets

```typescript
// /tests/performance/stress/concurrent-tickets.test.ts

describe('StressTest: ConcurrentTickets', () => {
  const TICKET_COUNT = 1000;
  const TIMEOUT = 300000; // 5 minutes

  it('should handle 1000 concurrent ticket creations', async () => {
    const kanban = await createKanbanSystem({
      maxAgents: 50,
      memoryBackend: 'hybrid',
    });

    const startTime = Date.now();

    // Create 1000 tickets concurrently
    const tickets = await Promise.all(
      Array.from({ length: TICKET_COUNT }, (_, i) =>
        kanban.createTicket({
          title: `Stress Test Ticket ${i}`,
          priority: ['low', 'medium', 'high'][i % 3],
        })
      )
    );

    const creationTime = Date.now() - startTime;

    // All tickets should be created successfully
    expect(tickets).toHaveLength(TICKET_COUNT);
    expect(tickets.every(t => t.id !== undefined)).toBe(true);

    // Creation should complete within 30 seconds
    expect(creationTime).toBeLessThan(30000);

    // Memory usage should be reasonable
    const memoryUsage = process.memoryUsage();
    expect(memoryUsage.heapUsed).toBeLessThan(2 * 1024 * 1024 * 1024); // < 2GB
  }, TIMEOUT);

  it('should handle 1000 concurrent ticket executions', async () => {
    const kanban = await createKanbanSystem({
      maxAgents: 100,
      swarmTopology: 'hierarchical-mesh',
    });

    // Pre-create tickets
    const tickets = await Promise.all(
      Array.from({ length: TICKET_COUNT }, (_, i) =>
        kanban.createTicket({
          title: `Execution Test ${i}`,
          complexity: 'simple', // Simple tasks for stress test
        })
      )
    );

    const startTime = Date.now();

    // Start all executions
    await Promise.all(tickets.map(t => kanban.startExecution(t.id)));

    // Track completion
    let completed = 0;
    const completionTimes: number[] = [];

    await new Promise<void>((resolve) => {
      kanban.on('ticketCompleted', () => {
        completed++;
        completionTimes.push(Date.now() - startTime);
        if (completed === TICKET_COUNT) resolve();
      });

      // Timeout fallback
      setTimeout(() => resolve(), TIMEOUT - 10000);
    });

    // At least 95% should complete
    expect(completed).toBeGreaterThanOrEqual(TICKET_COUNT * 0.95);

    // Calculate metrics
    const avgCompletionTime = completionTimes.reduce((a, b) => a + b, 0) / completionTimes.length;
    const p99CompletionTime = completionTimes.sort((a, b) => a - b)[Math.floor(completionTimes.length * 0.99)];

    // Log performance metrics
    console.log(`Average completion time: ${avgCompletionTime}ms`);
    console.log(`P99 completion time: ${p99CompletionTime}ms`);
    console.log(`Throughput: ${completed / ((Date.now() - startTime) / 1000)} tickets/sec`);

    // Performance assertions
    expect(avgCompletionTime).toBeLessThan(60000); // Avg < 1 minute
  }, TIMEOUT);
});
```

### 2. Load Test: 50 Parallel Projects

```typescript
// /tests/performance/load/parallel-projects.test.ts

describe('LoadTest: ParallelProjects', () => {
  const PROJECT_COUNT = 50;
  const TICKETS_PER_PROJECT = 20;

  it('should handle 50 parallel projects with isolated execution', async () => {
    // Create 50 projects
    const projects = await Promise.all(
      Array.from({ length: PROJECT_COUNT }, (_, i) =>
        createProject(`load-test-project-${i}`, {
          maxAgents: 3,
          memoryIsolated: true,
        })
      )
    );

    // Create tickets in each project
    await Promise.all(
      projects.map(async (project) => {
        for (let i = 0; i < TICKETS_PER_PROJECT; i++) {
          await project.createTicket({
            title: `Task ${i} for ${project.name}`,
          });
        }
      })
    );

    // Start execution in all projects
    const startTime = Date.now();
    await Promise.all(
      projects.map(async (project) => {
        const tickets = await project.getTickets();
        await Promise.all(tickets.map(t => project.startExecution(t.id)));
      })
    );

    // Monitor resource usage
    const resourceMetrics: ResourceMetric[] = [];
    const resourceInterval = setInterval(() => {
      resourceMetrics.push({
        timestamp: Date.now(),
        cpu: process.cpuUsage(),
        memory: process.memoryUsage(),
        activeAgents: projects.reduce((sum, p) => sum + p.getActiveAgentCount(), 0),
      });
    }, 1000);

    // Wait for completion across all projects
    await Promise.all(
      projects.map(project =>
        waitFor(async () => {
          const tickets = await project.getTickets();
          return tickets.every(t => ['REVIEW', 'DONE'].includes(t.status));
        }, { timeout: 300000 })
      )
    );

    clearInterval(resourceInterval);

    const totalTime = Date.now() - startTime;
    const totalTickets = PROJECT_COUNT * TICKETS_PER_PROJECT;

    // Verify isolation
    for (const project of projects) {
      const tickets = await project.getTickets();
      expect(tickets).toHaveLength(TICKETS_PER_PROJECT);
      expect(tickets.every(t => t.projectId === project.id)).toBe(true);
    }

    // Performance assertions
    expect(totalTime).toBeLessThan(600000); // < 10 minutes for all

    // Resource usage assertions
    const peakMemory = Math.max(...resourceMetrics.map(m => m.memory.heapUsed));
    expect(peakMemory).toBeLessThan(4 * 1024 * 1024 * 1024); // < 4GB

    // Log metrics
    console.log(`Total tickets: ${totalTickets}`);
    console.log(`Total time: ${totalTime}ms`);
    console.log(`Throughput: ${totalTickets / (totalTime / 1000)} tickets/sec`);
    console.log(`Peak memory: ${peakMemory / 1024 / 1024}MB`);
  });
});
```

### 3. Real-Time Update Latency Benchmarks

```typescript
// /tests/performance/benchmarks/real-time-updates.test.ts

describe('RealTimeUpdateLatency', () => {
  it('should deliver WebSocket updates within 100ms', async () => {
    const kanban = await createKanbanSystem();
    const client = await createWebSocketClient();

    const latencies: number[] = [];
    const messageCount = 100;

    // Setup listener
    client.on('ticketUpdate', (update) => {
      const latency = Date.now() - update.serverTimestamp;
      latencies.push(latency);
    });

    // Generate updates
    for (let i = 0; i < messageCount; i++) {
      const ticket = await kanban.createTicket({ title: `Latency Test ${i}` });
      await kanban.updateTicket(ticket.id, {
        status: 'TODO',
        serverTimestamp: Date.now(),
      });
      await sleep(10); // Small delay between updates
    }

    // Wait for all messages
    await waitFor(() => latencies.length >= messageCount, { timeout: 10000 });

    // Calculate percentiles
    const sorted = latencies.sort((a, b) => a - b);
    const p50 = sorted[Math.floor(sorted.length * 0.5)];
    const p95 = sorted[Math.floor(sorted.length * 0.95)];
    const p99 = sorted[Math.floor(sorted.length * 0.99)];

    console.log(`P50 latency: ${p50}ms`);
    console.log(`P95 latency: ${p95}ms`);
    console.log(`P99 latency: ${p99}ms`);

    // Assertions
    expect(p50).toBeLessThan(50);
    expect(p95).toBeLessThan(100);
    expect(p99).toBeLessThan(200);
  });

  it('should handle burst of 1000 updates per second', async () => {
    const kanban = await createKanbanSystem();
    const clients = await Promise.all(
      Array.from({ length: 10 }, () => createWebSocketClient())
    );

    const receivedCounts = clients.map(() => 0);
    clients.forEach((client, i) => {
      client.on('ticketUpdate', () => receivedCounts[i]++);
    });

    // Generate 1000 updates in 1 second
    const updates = Array.from({ length: 1000 }, (_, i) => ({
      ticketId: `ticket-${i % 100}`,
      status: 'IN_PROGRESS',
    }));

    const startTime = Date.now();
    await Promise.all(updates.map(u => kanban.broadcastUpdate(u)));
    const broadcastTime = Date.now() - startTime;

    // Wait for delivery
    await sleep(2000);

    // All clients should receive all updates
    const totalExpected = 1000 * clients.length;
    const totalReceived = receivedCounts.reduce((a, b) => a + b, 0);

    console.log(`Broadcast time for 1000 updates: ${broadcastTime}ms`);
    console.log(`Total expected: ${totalExpected}, Received: ${totalReceived}`);

    expect(totalReceived).toBeGreaterThanOrEqual(totalExpected * 0.99); // Allow 1% loss
    expect(broadcastTime).toBeLessThan(1000); // Should complete within 1 second
  });

  it('should benchmark memory search latency', async () => {
    const memory = new MemoryStore({ backend: 'hybrid', index: 'hnsw' });

    // Populate with 100k entries
    const entries = Array.from({ length: 100000 }, (_, i) => ({
      key: `pattern-${i}`,
      value: `This is pattern ${i} with some content about ${TOPICS[i % TOPICS.length]}`,
    }));

    console.log('Populating memory with 100k entries...');
    await memory.bulkStore(entries);
    console.log('Population complete');

    // Benchmark search latency
    const searchQueries = [
      'authentication security',
      'database optimization',
      'frontend components',
      'API integration',
      'error handling patterns',
    ];

    const results: { query: string; latency: number }[] = [];

    for (const query of searchQueries) {
      const iterations = 100;
      const latencies: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        await memory.search(query, { limit: 10 });
        latencies.push(performance.now() - start);
      }

      results.push({
        query,
        latency: latencies.reduce((a, b) => a + b, 0) / latencies.length,
      });
    }

    console.table(results);

    // All searches should complete under 50ms
    expect(results.every(r => r.latency < 50)).toBe(true);
  });
});
```

---

## Test Infrastructure Design

### 1. Mock Agent Framework

```typescript
// /tests/mocks/mock-agent.ts

export interface MockAgentConfig {
  type: AgentType;
  behavior?: 'success' | 'failure' | 'slow' | 'random';
  responseDelay?: number;
  failureRate?: number;
  responses?: Record<string, any>;
}

export class MockAgent implements Agent {
  public id: string;
  public type: AgentType;
  private behavior: string;
  private responseDelay: number;
  private failureRate: number;
  private responses: Record<string, any>;
  private executionLog: ExecutionLog[] = [];

  constructor(config: MockAgentConfig) {
    this.id = `mock-${config.type}-${Date.now()}`;
    this.type = config.type;
    this.behavior = config.behavior || 'success';
    this.responseDelay = config.responseDelay || 100;
    this.failureRate = config.failureRate || 0;
    this.responses = config.responses || {};
  }

  async execute(task: Task): Promise<ExecutionResult> {
    const startTime = Date.now();

    // Simulate processing delay
    if (this.behavior === 'slow') {
      await sleep(this.responseDelay * 10);
    } else {
      await sleep(this.responseDelay);
    }

    // Determine outcome
    const shouldFail = this.behavior === 'failure' ||
      (this.behavior === 'random' && Math.random() < this.failureRate);

    const result: ExecutionResult = shouldFail
      ? {
          success: false,
          error: 'Mock execution failed',
          duration: Date.now() - startTime,
        }
      : {
          success: true,
          output: this.responses[task.type] || this.generateDefaultOutput(task),
          duration: Date.now() - startTime,
        };

    this.executionLog.push({
      task,
      result,
      timestamp: new Date(),
    });

    return result;
  }

  private generateDefaultOutput(task: Task): any {
    switch (this.type) {
      case 'coder':
        return {
          code: `// Generated code for: ${task.title}\nexport function solution() {\n  // Implementation\n}`,
          files: ['solution.ts'],
        };
      case 'tester':
        return {
          tests: [`describe('${task.title}', () => { it('should work', () => { expect(true).toBe(true); }); });`],
          coverage: 85,
        };
      case 'reviewer':
        return {
          approved: true,
          comments: ['Looks good'],
          score: 8,
        };
      default:
        return { completed: true };
    }
  }

  getExecutionLog(): ExecutionLog[] {
    return this.executionLog;
  }

  reset(): void {
    this.executionLog = [];
  }
}

export class MockAgentFactory {
  private agents: Map<string, MockAgent> = new Map();

  create(config: MockAgentConfig): MockAgent {
    const agent = new MockAgent(config);
    this.agents.set(agent.id, agent);
    return agent;
  }

  createPool(configs: MockAgentConfig[]): MockAgent[] {
    return configs.map(c => this.create(c));
  }

  get(id: string): MockAgent | undefined {
    return this.agents.get(id);
  }

  getAll(): MockAgent[] {
    return Array.from(this.agents.values());
  }

  reset(): void {
    this.agents.forEach(a => a.reset());
    this.agents.clear();
  }
}

// Preset agent configurations
export const MockAgentPresets = {
  reliableCoder: (): MockAgentConfig => ({
    type: 'coder',
    behavior: 'success',
    responseDelay: 100,
  }),

  flakyTester: (): MockAgentConfig => ({
    type: 'tester',
    behavior: 'random',
    failureRate: 0.2,
    responseDelay: 200,
  }),

  slowReviewer: (): MockAgentConfig => ({
    type: 'reviewer',
    behavior: 'slow',
    responseDelay: 500,
  }),

  unreliableAgent: (): MockAgentConfig => ({
    type: 'coder',
    behavior: 'random',
    failureRate: 0.5,
    responseDelay: 100,
  }),

  fullTeam: (): MockAgentConfig[] => [
    { type: 'coder', behavior: 'success' },
    { type: 'tester', behavior: 'success' },
    { type: 'reviewer', behavior: 'success' },
    { type: 'architect', behavior: 'success' },
  ],
};
```

### 2. Memory System Test Fixtures

```typescript
// /tests/fixtures/memory/index.ts

export interface MemoryFixture {
  name: string;
  namespace: string;
  entries: MemoryEntry[];
}

export const MemoryFixtures: Record<string, MemoryFixture> = {
  authenticationPatterns: {
    name: 'Authentication Patterns',
    namespace: 'patterns',
    entries: [
      {
        key: 'jwt-auth-basic',
        value: {
          pattern: 'JWT Authentication',
          description: 'Basic JWT authentication with access and refresh tokens',
          code: `
            const jwt = require('jsonwebtoken');

            function generateTokens(user) {
              const accessToken = jwt.sign({ userId: user.id }, SECRET, { expiresIn: '15m' });
              const refreshToken = jwt.sign({ userId: user.id }, REFRESH_SECRET, { expiresIn: '7d' });
              return { accessToken, refreshToken };
            }
          `,
          successRate: 0.95,
          usageCount: 42,
        },
        tags: ['authentication', 'jwt', 'security'],
      },
      {
        key: 'oauth2-flow',
        value: {
          pattern: 'OAuth2 Authorization Code Flow',
          description: 'Complete OAuth2 implementation with authorization code grant',
          successRate: 0.88,
          usageCount: 23,
        },
        tags: ['authentication', 'oauth', 'third-party'],
      },
      {
        key: 'session-auth',
        value: {
          pattern: 'Session-based Authentication',
          description: 'Traditional session-based auth with secure cookies',
          successRate: 0.92,
          usageCount: 31,
        },
        tags: ['authentication', 'session', 'cookies'],
      },
    ],
  },

  databasePatterns: {
    name: 'Database Patterns',
    namespace: 'patterns',
    entries: [
      {
        key: 'connection-pool',
        value: {
          pattern: 'Connection Pooling',
          description: 'Database connection pool configuration',
          config: {
            minConnections: 5,
            maxConnections: 20,
            idleTimeout: 30000,
          },
          successRate: 0.97,
        },
        tags: ['database', 'performance', 'postgresql'],
      },
      {
        key: 'query-builder',
        value: {
          pattern: 'Type-safe Query Builder',
          description: 'SQL query builder with TypeScript support',
          successRate: 0.91,
        },
        tags: ['database', 'typescript', 'sql'],
      },
    ],
  },

  errorHandlingPatterns: {
    name: 'Error Handling Patterns',
    namespace: 'patterns',
    entries: [
      {
        key: 'global-error-handler',
        value: {
          pattern: 'Global Error Handler',
          description: 'Express middleware for centralized error handling',
          code: `
            function errorHandler(err, req, res, next) {
              const status = err.status || 500;
              res.status(status).json({
                error: err.message,
                ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
              });
            }
          `,
          successRate: 0.94,
        },
        tags: ['error-handling', 'express', 'middleware'],
      },
    ],
  },

  emptyNamespace: {
    name: 'Empty Namespace',
    namespace: 'empty',
    entries: [],
  },
};

export class MemoryFixtureLoader {
  constructor(private memory: MemoryStore) {}

  async load(fixtureName: string): Promise<void> {
    const fixture = MemoryFixtures[fixtureName];
    if (!fixture) {
      throw new Error(`Fixture not found: ${fixtureName}`);
    }

    for (const entry of fixture.entries) {
      await this.memory.store(entry.key, entry.value, {
        namespace: fixture.namespace,
        tags: entry.tags,
      });
    }
  }

  async loadAll(): Promise<void> {
    for (const fixtureName of Object.keys(MemoryFixtures)) {
      await this.load(fixtureName);
    }
  }

  async verify(fixtureName: string): Promise<boolean> {
    const fixture = MemoryFixtures[fixtureName];
    if (!fixture) return false;

    for (const entry of fixture.entries) {
      const stored = await this.memory.retrieve(entry.key, {
        namespace: fixture.namespace
      });
      if (!stored || JSON.stringify(stored) !== JSON.stringify(entry.value)) {
        return false;
      }
    }
    return true;
  }
}

// Ticket fixtures
export const TicketFixtures = {
  simpleTask: {
    title: 'Simple Implementation Task',
    description: 'A straightforward implementation task',
    priority: 'medium',
    estimatedTime: '1h',
    tags: ['feature'],
  },

  complexFeature: {
    title: 'Complex Feature Implementation',
    description: 'A multi-step feature requiring architecture review, implementation, and testing',
    priority: 'high',
    estimatedTime: '8h',
    tags: ['feature', 'complex'],
    subtasks: [
      'Design API schema',
      'Implement backend logic',
      'Create frontend components',
      'Write integration tests',
    ],
  },

  bugFix: {
    title: 'Fix Authentication Bug',
    description: 'Users are being logged out unexpectedly',
    priority: 'critical',
    type: 'bug',
    tags: ['bug', 'authentication'],
    linkedIssues: ['AUTH-123'],
  },

  performanceOptimization: {
    title: 'Optimize Database Queries',
    description: 'Reduce query time for user dashboard from 2s to <200ms',
    priority: 'high',
    type: 'performance',
    metrics: {
      currentLatency: 2000,
      targetLatency: 200,
    },
    tags: ['performance', 'database'],
  },
};
```

### 3. Swarm Simulation Environment

```typescript
// /tests/mocks/mock-swarm.ts

export interface SwarmSimulationConfig {
  nodeCount: number;
  topology: 'mesh' | 'hierarchical' | 'hierarchical-mesh';
  consensus: 'byzantine' | 'raft' | 'gossip';
  networkLatency?: { min: number; max: number };
  faultInjection?: FaultInjectionConfig;
}

export interface FaultInjectionConfig {
  nodeFailureRate?: number;
  networkPartitionProbability?: number;
  messageDropRate?: number;
  byzantineFaults?: number;
}

export class SwarmSimulation {
  public nodes: SimulatedNode[] = [];
  private config: SwarmSimulationConfig;
  private messageLog: Message[] = [];
  private partitions: Set<string>[] = [];

  constructor(config: SwarmSimulationConfig) {
    this.config = config;
    this.initializeNodes();
    this.setupTopology();
  }

  private initializeNodes(): void {
    for (let i = 0; i < this.config.nodeCount; i++) {
      this.nodes.push(new SimulatedNode({
        id: `node-${i}`,
        simulation: this,
        consensus: this.config.consensus,
      }));
    }
  }

  private setupTopology(): void {
    switch (this.config.topology) {
      case 'mesh':
        // Fully connected mesh
        for (const node of this.nodes) {
          node.peers = this.nodes.filter(n => n.id !== node.id);
        }
        break;

      case 'hierarchical':
        // First node is coordinator, rest are workers
        const coordinator = this.nodes[0];
        coordinator.role = 'coordinator';
        for (let i = 1; i < this.nodes.length; i++) {
          this.nodes[i].role = 'worker';
          this.nodes[i].peers = [coordinator];
          coordinator.peers.push(this.nodes[i]);
        }
        break;

      case 'hierarchical-mesh':
        // Hierarchical with mesh among workers
        const queen = this.nodes[0];
        queen.role = 'queen';
        const workers = this.nodes.slice(1);
        for (const worker of workers) {
          worker.role = 'worker';
          worker.peers = [queen, ...workers.filter(w => w.id !== worker.id)];
        }
        queen.peers = workers;
        break;
    }
  }

  async start(): Promise<void> {
    await Promise.all(this.nodes.map(n => n.start()));
  }

  async stop(): Promise<void> {
    await Promise.all(this.nodes.map(n => n.stop()));
  }

  async sendMessage(from: string, to: string, message: any): Promise<void> {
    // Check for network partition
    if (this.arePartitioned(from, to)) {
      this.messageLog.push({ from, to, message, dropped: true, reason: 'partition' });
      return;
    }

    // Check for message drop
    if (this.config.faultInjection?.messageDropRate &&
        Math.random() < this.config.faultInjection.messageDropRate) {
      this.messageLog.push({ from, to, message, dropped: true, reason: 'random' });
      return;
    }

    // Simulate network latency
    const latency = this.calculateLatency();
    await sleep(latency);

    // Deliver message
    const targetNode = this.nodes.find(n => n.id === to);
    if (targetNode && targetNode.isAlive) {
      await targetNode.receiveMessage(from, message);
      this.messageLog.push({ from, to, message, dropped: false, latency });
    }
  }

  private calculateLatency(): number {
    const { min = 1, max = 50 } = this.config.networkLatency || {};
    return min + Math.random() * (max - min);
  }

  private arePartitioned(nodeA: string, nodeB: string): boolean {
    for (const partition of this.partitions) {
      if (partition.has(nodeA) !== partition.has(nodeB)) {
        return true;
      }
    }
    return false;
  }

  // Fault injection methods
  async injectFaults(count: number, type: 'crash' | 'byzantine'): Promise<void> {
    const targetNodes = this.nodes
      .slice(1) // Don't inject faults into coordinator
      .sort(() => Math.random() - 0.5)
      .slice(0, count);

    for (const node of targetNodes) {
      if (type === 'crash') {
        await node.crash();
      } else {
        node.setByzantine(true);
      }
    }
  }

  async createNetworkPartition(groups: string[][]): Promise<void> {
    this.partitions = groups.map(g => new Set(g));
  }

  async healNetworkPartition(): Promise<void> {
    this.partitions = [];
  }

  async killNode(nodeId: string): Promise<void> {
    const node = this.nodes.find(n => n.id === nodeId);
    if (node) {
      await node.crash();
    }
  }

  async reviveNode(nodeId: string): Promise<void> {
    const node = this.nodes.find(n => n.id === nodeId);
    if (node) {
      await node.revive();
    }
  }

  // Query methods
  async proposeAndReachConsensus(proposal: any, options?: { timeout?: number }): Promise<ConsensusResult> {
    const coordinator = this.nodes.find(n => n.role === 'coordinator' || n.role === 'queen');
    if (!coordinator) {
      throw new Error('No coordinator found');
    }

    return coordinator.propose(proposal, options);
  }

  async getLeader(): Promise<SimulatedNode | null> {
    return this.nodes.find(n => n.isLeader) || null;
  }

  getMessageLog(): Message[] {
    return this.messageLog;
  }

  getMetrics(): SwarmMetrics {
    return {
      totalMessages: this.messageLog.length,
      droppedMessages: this.messageLog.filter(m => m.dropped).length,
      averageLatency: this.messageLog
        .filter(m => !m.dropped && m.latency)
        .reduce((sum, m) => sum + m.latency!, 0) / this.messageLog.length,
      aliveNodes: this.nodes.filter(n => n.isAlive).length,
      byzantineNodes: this.nodes.filter(n => n.isByzantine).length,
    };
  }
}

export class SimulatedNode {
  public id: string;
  public role: 'coordinator' | 'queen' | 'worker' | 'peer' = 'peer';
  public peers: SimulatedNode[] = [];
  public isAlive: boolean = true;
  public isLeader: boolean = false;
  public isByzantine: boolean = false;

  private simulation: SwarmSimulation;
  private state: any = {};
  private messageQueue: any[] = [];
  private consensusModule: ConsensusModule;

  constructor(config: {
    id: string;
    simulation: SwarmSimulation;
    consensus: string;
  }) {
    this.id = config.id;
    this.simulation = config.simulation;
    this.consensusModule = createConsensusModule(config.consensus);
  }

  async start(): Promise<void> {
    await this.consensusModule.initialize(this);
  }

  async stop(): Promise<void> {
    await this.consensusModule.shutdown();
  }

  async receiveMessage(from: string, message: any): Promise<void> {
    if (!this.isAlive) return;

    if (this.isByzantine) {
      // Byzantine node might send incorrect responses
      await this.handleByzantine(from, message);
    } else {
      await this.consensusModule.handleMessage(from, message);
    }
  }

  async propose(proposal: any, options?: { timeout?: number }): Promise<ConsensusResult> {
    return this.consensusModule.propose(proposal, options);
  }

  async crash(): Promise<void> {
    this.isAlive = false;
    this.isLeader = false;
  }

  async revive(): Promise<void> {
    this.isAlive = true;
    await this.consensusModule.rejoin();
  }

  setByzantine(value: boolean): void {
    this.isByzantine = value;
  }

  async getState(): Promise<any> {
    return this.state;
  }

  async broadcast(message: any): Promise<void> {
    await Promise.all(
      this.peers.map(peer =>
        this.simulation.sendMessage(this.id, peer.id, message)
      )
    );
  }

  private async handleByzantine(from: string, message: any): Promise<void> {
    // Byzantine behavior: send conflicting information to different peers
    const maliciousResponse = {
      ...message,
      value: `byzantine-${Math.random()}`,
    };
    await this.simulation.sendMessage(this.id, from, maliciousResponse);
  }
}
```

### 4. Test Utilities and Helpers

```typescript
// /tests/helpers/test-setup.ts

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

// Global test setup
beforeAll(async () => {
  // Initialize test database
  await setupTestDatabase();

  // Setup mock servers
  await setupMockServers();

  // Configure test timeouts
  vi.setConfig({ testTimeout: 30000 });
});

afterAll(async () => {
  // Cleanup
  await teardownTestDatabase();
  await stopMockServers();
});

beforeEach(async () => {
  // Reset mocks
  vi.clearAllMocks();

  // Clear test memory
  await clearTestMemory();
});

// /tests/helpers/test-factories.ts

export class TestFactory {
  static async createProject(overrides?: Partial<ProjectConfig>): Promise<Project> {
    const defaults: ProjectConfig = {
      name: `test-project-${Date.now()}`,
      topology: 'mesh',
      maxAgents: 5,
      memoryBackend: 'memory', // In-memory for tests
      learningEnabled: true,
    };

    return ProjectService.create({ ...defaults, ...overrides });
  }

  static async createTicket(project: Project, overrides?: Partial<TicketConfig>): Promise<Ticket> {
    const defaults: TicketConfig = {
      title: `Test Ticket ${Date.now()}`,
      description: 'Test ticket description',
      priority: 'medium',
      status: 'BACKLOG',
    };

    return project.createTicket({ ...defaults, ...overrides });
  }

  static async createKanbanSystem(config?: Partial<KanbanConfig>): Promise<KanbanSystem> {
    return KanbanSystem.create({
      database: 'memory',
      maxAgents: 10,
      swarmTopology: 'mesh',
      ...config,
    });
  }

  static async createMockSwarm(config?: Partial<SwarmSimulationConfig>): Promise<SwarmSimulation> {
    return new SwarmSimulation({
      nodeCount: 5,
      topology: 'mesh',
      consensus: 'raft',
      ...config,
    });
  }
}

// /tests/helpers/assertions.ts

export const customMatchers = {
  toHaveStatus(ticket: Ticket, expected: TicketStatus) {
    const pass = ticket.status === expected;
    return {
      pass,
      message: () => `Expected ticket status to be ${expected}, but was ${ticket.status}`,
    };
  },

  toHaveTransition(ticket: Ticket, from: TicketStatus, to: TicketStatus) {
    const transition = ticket.history.find(h => h.from === from && h.to === to);
    return {
      pass: !!transition,
      message: () => `Expected ticket to have transition from ${from} to ${to}`,
    };
  },

  toBeWithinLatency(actual: number, expected: number, tolerancePercent: number = 20) {
    const tolerance = expected * (tolerancePercent / 100);
    const pass = Math.abs(actual - expected) <= tolerance;
    return {
      pass,
      message: () => `Expected ${actual}ms to be within ${tolerancePercent}% of ${expected}ms`,
    };
  },

  toHaveHighAccuracy(results: { correct: number; total: number }, threshold: number = 0.9) {
    const accuracy = results.correct / results.total;
    return {
      pass: accuracy >= threshold,
      message: () => `Expected accuracy ${(accuracy * 100).toFixed(1)}% to be >= ${threshold * 100}%`,
    };
  },
};

// Register custom matchers
expect.extend(customMatchers);

// /tests/helpers/wait-helpers.ts

export async function waitFor<T>(
  condition: () => Promise<T> | T,
  options: { timeout?: number; interval?: number } = {}
): Promise<T> {
  const { timeout = 5000, interval = 100 } = options;
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const result = await condition();
    if (result) return result;
    await sleep(interval);
  }

  throw new Error(`Timeout waiting for condition after ${timeout}ms`);
}

export async function waitForTicketStatus(
  kanban: KanbanSystem,
  ticketId: string,
  status: TicketStatus | TicketStatus[],
  timeout: number = 30000
): Promise<Ticket> {
  const statuses = Array.isArray(status) ? status : [status];

  return waitFor(async () => {
    const ticket = await kanban.getTicket(ticketId);
    return statuses.includes(ticket.status) ? ticket : null;
  }, { timeout });
}

export async function waitForAllTickets(
  kanban: KanbanSystem,
  status: TicketStatus | TicketStatus[],
  timeout: number = 60000
): Promise<Ticket[]> {
  const statuses = Array.isArray(status) ? status : [status];

  return waitFor(async () => {
    const tickets = await kanban.getAllTickets();
    return tickets.every(t => statuses.includes(t.status)) ? tickets : null;
  }, { timeout });
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
```

---

## Test Running Configuration

### Jest Configuration

```typescript
// jest.config.ts

export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 85,
      lines: 85,
      statements: 85,
    },
  },
  setupFilesAfterEnv: ['<rootDir>/tests/helpers/test-setup.ts'],
  globalSetup: '<rootDir>/tests/helpers/global-setup.ts',
  globalTeardown: '<rootDir>/tests/helpers/global-teardown.ts',
  testTimeout: 30000,
  maxWorkers: '50%',
  projects: [
    {
      displayName: 'unit',
      testMatch: ['<rootDir>/tests/unit/**/*.test.ts'],
      testEnvironment: 'node',
    },
    {
      displayName: 'integration',
      testMatch: ['<rootDir>/tests/integration/**/*.test.ts'],
      testEnvironment: 'node',
      testTimeout: 60000,
    },
    {
      displayName: 'e2e',
      testMatch: ['<rootDir>/tests/e2e/**/*.test.ts'],
      testEnvironment: 'node',
      testTimeout: 300000,
    },
    {
      displayName: 'ai',
      testMatch: ['<rootDir>/tests/ai/**/*.test.ts'],
      testEnvironment: 'node',
      testTimeout: 120000,
    },
    {
      displayName: 'performance',
      testMatch: ['<rootDir>/tests/performance/**/*.test.ts'],
      testEnvironment: 'node',
      testTimeout: 600000,
    },
  ],
};
```

### Test Scripts

```json
// package.json scripts
{
  "scripts": {
    "test": "vitest",
    "test:unit": "vitest run --project unit",
    "test:integration": "vitest run --project integration",
    "test:e2e": "playwright test",
    "test:ai": "vitest run --project ai",
    "test:performance": "vitest run --project performance",
    "test:coverage": "vitest run --coverage",
    "test:watch": "vitest --watch",
    "test:ci": "vitest run --coverage --pool=forks --poolOptions.forks.maxForks=2"
  }
}
```

---

## Summary

This TDD architecture provides a comprehensive testing strategy for the AI Kanban system with:

1. **Unit Tests (75%)**: Fast, isolated tests for core logic including ticket state machines, agent routing, memory operations, learning metrics, and project isolation.

2. **Integration Tests (20%)**: Workflow tests covering ticket lifecycles, multi-project execution, pattern transfer, topology switching, and hook chains.

3. **E2E Tests (5%)**: Critical user journeys including full project workflow, failure recovery, and cross-browser visual verification.

4. **AI-Specific Tests**: Orthogonal test suite for agent behavior verification, learning accuracy validation, swarm consensus, and memory consolidation.

5. **Performance Tests**: Stress tests (1000 concurrent tickets), load tests (50 parallel projects), and real-time latency benchmarks.

6. **Test Infrastructure**: Complete mock frameworks for agents, memory, and swarm simulation, plus comprehensive fixtures and utilities.

The architecture follows TDD principles where tests are written before implementation, ensuring high code quality and maintainability throughout the project lifecycle.
