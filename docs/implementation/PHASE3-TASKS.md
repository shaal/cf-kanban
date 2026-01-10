# Phase 3: Claude Flow Integration - Implementation Tasks

## Overview

**Duration**: Weeks 9-12
**Goal**: Full Claude Flow integration with swim-lane feedback loop
**Prerequisites**: Phase 2 complete, Claude Flow CLI available

**This is the CORE phase** - implementing the fundamental innovation of CF-Kanban.

---

## Sprint 1: CLI Wrapper Service (Week 9)

### TASK-041: Create Claude Flow CLI Service
**Priority**: Critical
**Estimated**: 1.5 hours

- [ ] Create `/src/lib/server/claude-flow/cli.ts`
- [ ] Implement command execution wrapper
- [ ] Handle stdout/stderr capture
- [ ] Add timeout handling

```typescript
// src/lib/server/claude-flow/cli.ts
import { spawn, type ChildProcess } from 'child_process';

interface CommandResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  timedOut: boolean;
}

interface CommandOptions {
  timeout?: number;
  cwd?: string;
  env?: Record<string, string>;
}

export class ClaudeFlowCLI {
  private readonly defaultTimeout = 300000; // 5 minutes

  async execute(
    command: string,
    args: string[],
    options: CommandOptions = {}
  ): Promise<CommandResult> {
    return new Promise((resolve, reject) => {
      const timeout = options.timeout ?? this.defaultTimeout;
      let timedOut = false;

      const proc = spawn('npx', ['@claude-flow/cli@latest', command, ...args], {
        cwd: options.cwd ?? process.cwd(),
        env: { ...process.env, ...options.env },
        shell: true
      });

      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      proc.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      const timer = setTimeout(() => {
        timedOut = true;
        proc.kill('SIGTERM');
      }, timeout);

      proc.on('close', (code) => {
        clearTimeout(timer);
        resolve({
          stdout,
          stderr,
          exitCode: code ?? 0,
          timedOut
        });
      });

      proc.on('error', (error) => {
        clearTimeout(timer);
        reject(error);
      });
    });
  }

  // Convenience method for JSON output commands
  async executeJson<T>(
    command: string,
    args: string[],
    options: CommandOptions = {}
  ): Promise<T> {
    const result = await this.execute(command, [...args, '--format', 'json'], options);

    if (result.exitCode !== 0) {
      throw new Error(`Command failed: ${result.stderr}`);
    }

    try {
      return JSON.parse(result.stdout);
    } catch {
      throw new Error(`Failed to parse JSON output: ${result.stdout}`);
    }
  }
}

export const claudeFlowCLI = new ClaudeFlowCLI();
```

**Acceptance Criteria**:
- Commands execute successfully
- Output captured correctly
- Timeout handling works
- JSON parsing for structured output

---

### TASK-042: Create Agent Command Wrappers
**Priority**: Critical
**Estimated**: 1 hour

- [ ] Implement `spawnAgent(type, name, options)`
- [ ] Implement `listAgents()`
- [ ] Implement `getAgentStatus(id)`
- [ ] Implement `stopAgent(id)`

```typescript
// src/lib/server/claude-flow/agents.ts
import { claudeFlowCLI } from './cli';

interface AgentConfig {
  type: string;
  name: string;
  prompt?: string;
  model?: string;
}

interface Agent {
  id: string;
  type: string;
  name: string;
  status: 'idle' | 'working' | 'blocked' | 'stopped';
  createdAt: string;
}

export class AgentService {
  async spawn(config: AgentConfig): Promise<Agent> {
    const args = [
      '-t', config.type,
      '--name', config.name
    ];

    if (config.prompt) {
      args.push('--prompt', config.prompt);
    }
    if (config.model) {
      args.push('--model', config.model);
    }

    const result = await claudeFlowCLI.executeJson<Agent>(
      'agent',
      ['spawn', ...args]
    );

    return result;
  }

  async list(): Promise<Agent[]> {
    return claudeFlowCLI.executeJson<Agent[]>('agent', ['list']);
  }

  async getStatus(agentId: string): Promise<Agent> {
    return claudeFlowCLI.executeJson<Agent>('agent', ['status', agentId]);
  }

  async stop(agentId: string, graceful = true): Promise<void> {
    const args = ['stop', agentId];
    if (graceful) args.push('--graceful');

    await claudeFlowCLI.execute('agent', args);
  }

  async getMetrics(agentId: string): Promise<Record<string, unknown>> {
    return claudeFlowCLI.executeJson('agent', ['metrics', agentId]);
  }
}

export const agentService = new AgentService();
```

**Acceptance Criteria**:
- All agent operations wrapped
- Type-safe interfaces
- Error handling for failed commands

---

### TASK-043: Create Swarm Command Wrappers
**Priority**: Critical
**Estimated**: 1 hour

- [ ] Implement `initSwarm(topology, options)`
- [ ] Implement `getSwarmStatus()`
- [ ] Implement `terminateSwarm()`
- [ ] Implement `addAgentToSwarm(agentId)`

```typescript
// src/lib/server/claude-flow/swarm.ts
import { claudeFlowCLI } from './cli';

type Topology = 'hierarchical' | 'mesh' | 'hybrid' | 'ring' | 'star';

interface SwarmConfig {
  topology: Topology;
  maxAgents?: number;
  project?: string;
}

interface SwarmStatus {
  id: string;
  topology: Topology;
  agents: Array<{
    id: string;
    type: string;
    status: string;
  }>;
  createdAt: string;
  status: 'initializing' | 'active' | 'paused' | 'terminated';
}

export class SwarmService {
  async init(config: SwarmConfig): Promise<SwarmStatus> {
    const args = [
      'init',
      '--topology', config.topology
    ];

    if (config.maxAgents) {
      args.push('--max-agents', config.maxAgents.toString());
    }

    return claudeFlowCLI.executeJson<SwarmStatus>('swarm', args);
  }

  async getStatus(): Promise<SwarmStatus> {
    return claudeFlowCLI.executeJson<SwarmStatus>('swarm', ['status']);
  }

  async terminate(): Promise<void> {
    await claudeFlowCLI.execute('swarm', ['terminate']);
  }

  async addAgent(agentId: string): Promise<void> {
    await claudeFlowCLI.execute('swarm', ['add-agent', agentId]);
  }

  async removeAgent(agentId: string): Promise<void> {
    await claudeFlowCLI.execute('swarm', ['remove-agent', agentId]);
  }
}

export const swarmService = new SwarmService();
```

**Acceptance Criteria**:
- Swarm init/terminate works
- Status monitoring functional
- Agent management within swarm

---

### TASK-044: Implement Async Command Execution
**Priority**: High
**Estimated**: 1.5 hours

- [ ] Create background execution manager
- [ ] Implement job queue for long-running commands
- [ ] Add progress streaming via WebSocket
- [ ] Handle concurrent execution limits

```typescript
// src/lib/server/claude-flow/executor.ts
import { spawn, type ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import type { Server } from 'socket.io';

interface ExecutionJob {
  id: string;
  command: string;
  args: string[];
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  startedAt?: Date;
  completedAt?: Date;
  output: string[];
  error?: string;
  process?: ChildProcess;
  ticketId?: string;
  projectId?: string;
}

class ExecutionManager extends EventEmitter {
  private jobs = new Map<string, ExecutionJob>();
  private maxConcurrent = 5;
  private running = 0;
  private io: Server | null = null;

  setSocketServer(io: Server) {
    this.io = io;
  }

  async submit(
    command: string,
    args: string[],
    metadata?: { ticketId?: string; projectId?: string }
  ): Promise<string> {
    const jobId = crypto.randomUUID();

    const job: ExecutionJob = {
      id: jobId,
      command,
      args,
      status: 'pending',
      output: [],
      ticketId: metadata?.ticketId,
      projectId: metadata?.projectId
    };

    this.jobs.set(jobId, job);
    this.processQueue();

    return jobId;
  }

  private async processQueue() {
    if (this.running >= this.maxConcurrent) return;

    const pendingJob = Array.from(this.jobs.values())
      .find(j => j.status === 'pending');

    if (!pendingJob) return;

    this.running++;
    pendingJob.status = 'running';
    pendingJob.startedAt = new Date();

    const proc = spawn('npx', [
      '@claude-flow/cli@latest',
      pendingJob.command,
      ...pendingJob.args
    ], { shell: true });

    pendingJob.process = proc;

    proc.stdout.on('data', (data) => {
      const line = data.toString();
      pendingJob.output.push(line);
      this.emitProgress(pendingJob, line);
    });

    proc.stderr.on('data', (data) => {
      const line = data.toString();
      pendingJob.output.push(`[stderr] ${line}`);
      this.emitProgress(pendingJob, line, true);
    });

    proc.on('close', (code) => {
      this.running--;
      pendingJob.completedAt = new Date();
      pendingJob.status = code === 0 ? 'completed' : 'failed';

      this.emit('job:complete', pendingJob);
      this.emitCompletion(pendingJob);

      // Process next in queue
      this.processQueue();
    });
  }

  private emitProgress(job: ExecutionJob, line: string, isError = false) {
    if (this.io && job.projectId) {
      this.io.to(`project:${job.projectId}`).emit('execution:progress', {
        jobId: job.id,
        ticketId: job.ticketId,
        line,
        isError
      });
    }
  }

  private emitCompletion(job: ExecutionJob) {
    if (this.io && job.projectId) {
      this.io.to(`project:${job.projectId}`).emit('execution:complete', {
        jobId: job.id,
        ticketId: job.ticketId,
        status: job.status,
        duration: job.completedAt!.getTime() - job.startedAt!.getTime()
      });
    }
  }

  getJob(jobId: string): ExecutionJob | undefined {
    return this.jobs.get(jobId);
  }

  cancel(jobId: string): boolean {
    const job = this.jobs.get(jobId);
    if (job && job.process && job.status === 'running') {
      job.process.kill('SIGTERM');
      job.status = 'cancelled';
      return true;
    }
    return false;
  }
}

export const executionManager = new ExecutionManager();
```

**Acceptance Criteria**:
- Jobs queued and executed
- Progress streamed to WebSocket
- Concurrent execution limited
- Cancellation works

---

### TASK-045: Add Error Handling and Retries
**Priority**: High
**Estimated**: 1 hour

- [ ] Implement retry logic with exponential backoff
- [ ] Add circuit breaker for failing commands
- [ ] Create error classification
- [ ] Add alerting for critical failures

```typescript
// src/lib/server/claude-flow/resilience.ts
import { claudeFlowCLI } from './cli';

interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  retryableErrors: string[];
}

const defaultRetryConfig: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 30000,
  retryableErrors: ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND']
};

export async function withRetry<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  const { maxRetries, baseDelay, maxDelay, retryableErrors } = {
    ...defaultRetryConfig,
    ...config
  };

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      const isRetryable = retryableErrors.some(e =>
        lastError!.message.includes(e)
      );

      if (!isRetryable || attempt === maxRetries) {
        throw lastError;
      }

      const delay = Math.min(
        baseDelay * Math.pow(2, attempt),
        maxDelay
      );

      console.log(`Retry attempt ${attempt + 1} after ${delay}ms`);
      await new Promise(r => setTimeout(r, delay));
    }
  }

  throw lastError;
}

// Circuit breaker for persistent failures
class CircuitBreaker {
  private failures = 0;
  private lastFailure: Date | null = null;
  private state: 'closed' | 'open' | 'half-open' = 'closed';

  constructor(
    private threshold = 5,
    private resetTimeout = 60000
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailure!.getTime() > this.resetTimeout) {
        this.state = 'half-open';
      } else {
        throw new Error('Circuit breaker is open');
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess() {
    this.failures = 0;
    this.state = 'closed';
  }

  private onFailure() {
    this.failures++;
    this.lastFailure = new Date();

    if (this.failures >= this.threshold) {
      this.state = 'open';
      console.error('Circuit breaker opened due to repeated failures');
    }
  }

  getState() {
    return this.state;
  }
}

export const cliCircuitBreaker = new CircuitBreaker();

// Error classification
export function classifyError(error: Error): {
  type: 'transient' | 'permanent' | 'configuration';
  retryable: boolean;
  userMessage: string;
} {
  const message = error.message.toLowerCase();

  if (message.includes('timeout') || message.includes('econnreset')) {
    return {
      type: 'transient',
      retryable: true,
      userMessage: 'Temporary connection issue. Retrying...'
    };
  }

  if (message.includes('not found') || message.includes('enoent')) {
    return {
      type: 'configuration',
      retryable: false,
      userMessage: 'Claude Flow CLI not found. Please check installation.'
    };
  }

  if (message.includes('permission') || message.includes('eacces')) {
    return {
      type: 'permanent',
      retryable: false,
      userMessage: 'Permission denied. Check file permissions.'
    };
  }

  return {
    type: 'permanent',
    retryable: false,
    userMessage: 'An unexpected error occurred.'
  };
}
```

**Acceptance Criteria**:
- Transient errors retried automatically
- Circuit breaker prevents cascade failures
- Errors classified with user-friendly messages

---

## Sprint 2: Ticket Analysis (Week 10)

### TASK-046: Create Ticket Analysis Service
**Priority**: Critical
**Estimated**: 1.5 hours

- [ ] Create `/src/lib/server/analysis/ticket-analyzer.ts`
- [ ] Parse ticket title and description
- [ ] Extract keywords and intent
- [ ] Identify ticket type (feature, bug, refactor, etc.)

```typescript
// src/lib/server/analysis/ticket-analyzer.ts
import type { Ticket } from '@prisma/client';
import { claudeFlowCLI } from '../claude-flow/cli';

interface AnalysisResult {
  ticketType: 'feature' | 'bug' | 'refactor' | 'docs' | 'test' | 'chore';
  keywords: string[];
  suggestedLabels: string[];
  complexity: number; // 1-10
  estimatedHours: number;
  suggestedAgents: string[];
  suggestedTopology: 'single' | 'mesh' | 'hierarchical';
  dependencies: string[];
  risks: string[];
}

export class TicketAnalyzer {
  // Keyword patterns for classification
  private patterns = {
    feature: ['add', 'implement', 'create', 'build', 'new'],
    bug: ['fix', 'bug', 'error', 'issue', 'broken', 'crash'],
    refactor: ['refactor', 'improve', 'optimize', 'clean', 'restructure'],
    docs: ['document', 'readme', 'docs', 'comment', 'explain'],
    test: ['test', 'coverage', 'spec', 'unit', 'e2e'],
    chore: ['update', 'upgrade', 'config', 'setup', 'install']
  };

  // Agent recommendations by ticket type
  private agentsByType: Record<string, string[]> = {
    feature: ['planner', 'coder', 'tester', 'reviewer'],
    bug: ['researcher', 'coder', 'tester'],
    refactor: ['architect', 'coder', 'reviewer'],
    docs: ['researcher', 'api-docs'],
    test: ['tester', 'reviewer'],
    chore: ['coder']
  };

  async analyze(ticket: Ticket): Promise<AnalysisResult> {
    const text = `${ticket.title} ${ticket.description || ''}`.toLowerCase();

    // Determine ticket type
    const ticketType = this.classifyType(text);

    // Extract keywords
    const keywords = this.extractKeywords(text);

    // Calculate complexity
    const complexity = await this.calculateComplexity(ticket);

    // Estimate hours based on complexity
    const estimatedHours = this.estimateHours(complexity);

    // Get suggested agents
    const suggestedAgents = this.suggestAgents(ticketType, complexity);

    // Determine topology
    const suggestedTopology = this.suggestTopology(complexity, suggestedAgents.length);

    // Detect potential dependencies
    const dependencies = this.detectDependencies(text);

    // Identify risks
    const risks = this.identifyRisks(text, complexity);

    return {
      ticketType,
      keywords,
      suggestedLabels: [...keywords, ticketType],
      complexity,
      estimatedHours,
      suggestedAgents,
      suggestedTopology,
      dependencies,
      risks
    };
  }

  private classifyType(text: string): AnalysisResult['ticketType'] {
    for (const [type, patterns] of Object.entries(this.patterns)) {
      if (patterns.some(p => text.includes(p))) {
        return type as AnalysisResult['ticketType'];
      }
    }
    return 'feature'; // Default
  }

  private extractKeywords(text: string): string[] {
    // Common tech keywords
    const techKeywords = [
      'api', 'database', 'auth', 'ui', 'frontend', 'backend',
      'security', 'performance', 'cache', 'websocket', 'rest',
      'graphql', 'prisma', 'svelte', 'typescript', 'css'
    ];

    return techKeywords.filter(k => text.includes(k));
  }

  private async calculateComplexity(ticket: Ticket): Promise<number> {
    let score = 1;

    const text = `${ticket.title} ${ticket.description || ''}`;
    const wordCount = text.split(/\s+/).length;

    // More words = more complex
    score += Math.min(wordCount / 50, 3);

    // High priority = more complex
    if (ticket.priority === 'HIGH') score += 1;
    if (ticket.priority === 'CRITICAL') score += 2;

    // Labels indicate complexity
    if (ticket.labels.includes('security')) score += 2;
    if (ticket.labels.includes('performance')) score += 1;
    if (ticket.labels.includes('architecture')) score += 2;

    // Try to get file count estimate from Claude Flow memory
    try {
      const result = await claudeFlowCLI.execute('memory', [
        'search',
        '--query', ticket.title,
        '--namespace', 'patterns',
        '--limit', '1'
      ]);

      if (result.stdout.includes('files:')) {
        const match = result.stdout.match(/files:\s*(\d+)/);
        if (match) {
          score += Math.min(parseInt(match[1]) / 5, 3);
        }
      }
    } catch {
      // Ignore memory search failures
    }

    return Math.min(Math.round(score), 10);
  }

  private estimateHours(complexity: number): number {
    const baseHours = [0.5, 1, 2, 3, 4, 6, 8, 12, 16, 24];
    return baseHours[complexity - 1] || 8;
  }

  private suggestAgents(type: string, complexity: number): string[] {
    const agents = [...(this.agentsByType[type] || ['coder'])];

    // Add coordinator for complex tasks
    if (complexity >= 6) {
      agents.unshift('coordinator');
    }

    // Add security agent for security-related
    if (type === 'feature' && complexity >= 5) {
      agents.push('security-auditor');
    }

    return agents;
  }

  private suggestTopology(
    complexity: number,
    agentCount: number
  ): 'single' | 'mesh' | 'hierarchical' {
    if (agentCount === 1) return 'single';
    if (complexity <= 3) return 'mesh';
    return 'hierarchical';
  }

  private detectDependencies(text: string): string[] {
    const deps: string[] = [];

    if (text.includes('after') || text.includes('depends on')) {
      // Would need more sophisticated NLP here
      deps.push('Potential dependency detected - review manually');
    }

    if (text.includes('database') || text.includes('schema')) {
      deps.push('May require database migration');
    }

    if (text.includes('api') && text.includes('frontend')) {
      deps.push('API changes may affect frontend');
    }

    return deps;
  }

  private identifyRisks(text: string, complexity: number): string[] {
    const risks: string[] = [];

    if (complexity >= 8) {
      risks.push('High complexity - consider breaking into smaller tasks');
    }

    if (text.includes('security') || text.includes('auth')) {
      risks.push('Security-sensitive - requires thorough review');
    }

    if (text.includes('production') || text.includes('deploy')) {
      risks.push('Deployment risk - test thoroughly');
    }

    if (text.includes('migration') || text.includes('database')) {
      risks.push('Data migration risk - backup before proceeding');
    }

    return risks;
  }
}

export const ticketAnalyzer = new TicketAnalyzer();
```

**Acceptance Criteria**:
- Tickets classified by type
- Keywords extracted
- Initial complexity estimate

---

### TASK-047: Implement Complexity Scoring Algorithm
**Priority**: Critical
**Estimated**: 1.5 hours

- [ ] Create multi-factor complexity model
- [ ] Weight factors based on historical data
- [ ] Query Claude Flow memory for similar tasks
- [ ] Return confidence score

```typescript
// src/lib/server/analysis/complexity.ts
import { claudeFlowCLI } from '../claude-flow/cli';
import { prisma } from '../prisma';

interface ComplexityFactors {
  descriptionLength: number;
  technicalKeywords: number;
  crossCutting: boolean;
  hasSecurityImplications: boolean;
  requiresNewInfrastructure: boolean;
  estimatedFiles: number;
  similarTaskComplexity: number | null;
  labelComplexity: number;
}

interface ComplexityResult {
  score: number;
  confidence: number;
  factors: ComplexityFactors;
  breakdown: Record<string, number>;
}

export async function calculateComplexity(
  title: string,
  description: string,
  labels: string[]
): Promise<ComplexityResult> {
  const text = `${title} ${description}`.toLowerCase();

  // Factor 1: Description length
  const wordCount = text.split(/\s+/).length;
  const descriptionLength = Math.min(wordCount / 100, 1); // 0-1

  // Factor 2: Technical keywords density
  const techKeywords = [
    'api', 'database', 'schema', 'migration', 'auth', 'security',
    'websocket', 'cache', 'redis', 'queue', 'worker', 'async',
    'encryption', 'oauth', 'jwt', 'middleware', 'hook'
  ];
  const keywordCount = techKeywords.filter(k => text.includes(k)).length;
  const technicalKeywords = Math.min(keywordCount / 5, 1); // 0-1

  // Factor 3: Cross-cutting concerns
  const crossCuttingPatterns = ['all', 'every', 'across', 'global', 'everywhere'];
  const crossCutting = crossCuttingPatterns.some(p => text.includes(p));

  // Factor 4: Security implications
  const securityPatterns = ['security', 'auth', 'password', 'encrypt', 'permission', 'role'];
  const hasSecurityImplications = securityPatterns.some(p => text.includes(p));

  // Factor 5: New infrastructure
  const infraPatterns = ['new service', 'new database', 'redis', 'queue', 'worker'];
  const requiresNewInfrastructure = infraPatterns.some(p => text.includes(p));

  // Factor 6: Estimated files (from patterns)
  const estimatedFiles = await estimateFileCount(title);

  // Factor 7: Similar task complexity from history
  const similarTaskComplexity = await getSimilarTaskComplexity(title);

  // Factor 8: Label complexity
  const complexLabels = ['security', 'performance', 'architecture', 'breaking-change'];
  const labelComplexity = labels.filter(l => complexLabels.includes(l)).length;

  const factors: ComplexityFactors = {
    descriptionLength,
    technicalKeywords,
    crossCutting,
    hasSecurityImplications,
    requiresNewInfrastructure,
    estimatedFiles,
    similarTaskComplexity,
    labelComplexity
  };

  // Calculate weighted score
  const breakdown: Record<string, number> = {
    description: descriptionLength * 1.0,
    technical: technicalKeywords * 2.0,
    crossCutting: crossCutting ? 1.5 : 0,
    security: hasSecurityImplications ? 2.0 : 0,
    infrastructure: requiresNewInfrastructure ? 2.0 : 0,
    files: Math.min(estimatedFiles / 10, 2.0),
    historical: similarTaskComplexity ? (similarTaskComplexity / 10) * 1.5 : 0,
    labels: labelComplexity * 0.5
  };

  const rawScore = Object.values(breakdown).reduce((a, b) => a + b, 0);
  const score = Math.min(Math.max(Math.round(rawScore), 1), 10);

  // Confidence based on how much data we have
  let confidence = 0.5;
  if (similarTaskComplexity !== null) confidence += 0.3;
  if (description.length > 100) confidence += 0.1;
  if (labels.length > 0) confidence += 0.1;

  return { score, confidence, factors, breakdown };
}

async function estimateFileCount(title: string): Promise<number> {
  try {
    const result = await claudeFlowCLI.execute('memory', [
      'search',
      '--query', title,
      '--namespace', 'patterns',
      '--limit', '3'
    ]);

    // Parse file count from memory patterns
    const matches = result.stdout.match(/files?:\s*(\d+)/gi);
    if (matches && matches.length > 0) {
      const counts = matches.map(m => parseInt(m.replace(/\D/g, '')));
      return Math.round(counts.reduce((a, b) => a + b, 0) / counts.length);
    }
  } catch {
    // Ignore errors
  }

  return 5; // Default estimate
}

async function getSimilarTaskComplexity(title: string): Promise<number | null> {
  try {
    // Find similar completed tickets
    const similar = await prisma.ticket.findMany({
      where: {
        status: 'DONE',
        OR: [
          { title: { contains: title.split(' ')[0], mode: 'insensitive' } }
        ]
      },
      take: 3
    });

    if (similar.length > 0 && similar[0].complexity) {
      return Math.round(
        similar.reduce((sum, t) => sum + (t.complexity || 5), 0) / similar.length
      );
    }
  } catch {
    // Ignore errors
  }

  return null;
}
```

**Acceptance Criteria**:
- Multi-factor complexity model
- Historical data integration
- Confidence score provided

---

### TASK-048: Add Estimated Completion Time
**Priority**: High
**Estimated**: 45 min

- [ ] Create time estimation model
- [ ] Learn from completed tickets
- [ ] Factor in agent efficiency patterns
- [ ] Display estimate on ticket cards

```typescript
// src/lib/server/analysis/time-estimation.ts
import { prisma } from '../prisma';

interface TimeEstimate {
  hours: number;
  confidence: number;
  range: { min: number; max: number };
  basedOn: 'complexity' | 'historical' | 'hybrid';
}

// Base hours by complexity
const COMPLEXITY_HOURS: Record<number, number> = {
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

export async function estimateCompletionTime(
  complexity: number,
  ticketType: string,
  labels: string[]
): Promise<TimeEstimate> {
  // Get historical data for similar tickets
  const historicalAvg = await getHistoricalAverage(ticketType, labels);

  if (historicalAvg) {
    // Use hybrid of complexity-based and historical
    const complexityHours = COMPLEXITY_HOURS[complexity] || 8;
    const hybridHours = (complexityHours + historicalAvg.hours) / 2;

    return {
      hours: Math.round(hybridHours * 10) / 10,
      confidence: 0.8,
      range: {
        min: Math.round(hybridHours * 0.5 * 10) / 10,
        max: Math.round(hybridHours * 1.5 * 10) / 10
      },
      basedOn: 'hybrid'
    };
  }

  // Fallback to complexity-based
  const hours = COMPLEXITY_HOURS[complexity] || 8;

  return {
    hours,
    confidence: 0.5,
    range: {
      min: Math.round(hours * 0.5 * 10) / 10,
      max: Math.round(hours * 2 * 10) / 10
    },
    basedOn: 'complexity'
  };
}

async function getHistoricalAverage(
  ticketType: string,
  labels: string[]
): Promise<{ hours: number; count: number } | null> {
  try {
    // Find completed tickets with time data
    const completed = await prisma.ticket.findMany({
      where: {
        status: 'DONE',
        labels: { hasSome: labels }
      },
      include: {
        history: {
          where: {
            OR: [
              { fromStatus: 'TODO', toStatus: 'IN_PROGRESS' },
              { fromStatus: 'IN_PROGRESS', toStatus: 'DONE' }
            ]
          }
        }
      },
      take: 20
    });

    if (completed.length < 3) return null;

    // Calculate actual hours from history
    const durations: number[] = [];

    for (const ticket of completed) {
      const startHistory = ticket.history.find(h => h.toStatus === 'IN_PROGRESS');
      const endHistory = ticket.history.find(h => h.toStatus === 'DONE');

      if (startHistory && endHistory) {
        const hours =
          (endHistory.createdAt.getTime() - startHistory.createdAt.getTime()) /
          (1000 * 60 * 60);
        durations.push(hours);
      }
    }

    if (durations.length === 0) return null;

    const avgHours = durations.reduce((a, b) => a + b, 0) / durations.length;

    return {
      hours: Math.round(avgHours * 10) / 10,
      count: durations.length
    };
  } catch {
    return null;
  }
}
```

**Acceptance Criteria**:
- Time estimates based on complexity
- Historical learning improves estimates
- Confidence and range provided

---

### TASK-049: Implement Dependency Detection
**Priority**: High
**Estimated**: 1 hour

- [ ] Analyze ticket text for dependencies
- [ ] Check for ticket references (e.g., "after #123")
- [ ] Detect implicit dependencies (schema changes, API changes)
- [ ] Display dependency graph

```typescript
// src/lib/server/analysis/dependencies.ts
import { prisma } from '../prisma';

interface Dependency {
  ticketId: string | null;
  type: 'explicit' | 'implicit' | 'suggested';
  reason: string;
  blocking: boolean;
}

interface DependencyResult {
  dependencies: Dependency[];
  blockedBy: string[];
  blocks: string[];
}

export async function detectDependencies(
  ticketId: string,
  title: string,
  description: string,
  projectId: string
): Promise<DependencyResult> {
  const text = `${title} ${description}`.toLowerCase();
  const dependencies: Dependency[] = [];

  // 1. Explicit references (e.g., "after #123", "depends on TICKET-456")
  const explicitRefs = extractExplicitReferences(text);
  for (const ref of explicitRefs) {
    dependencies.push({
      ticketId: ref,
      type: 'explicit',
      reason: `Explicitly mentioned in description`,
      blocking: true
    });
  }

  // 2. Implicit dependencies based on keywords
  const implicitDeps = await detectImplicitDependencies(text, projectId);
  dependencies.push(...implicitDeps);

  // 3. Find what this ticket blocks
  const blocking = await findBlockedTickets(ticketId, projectId);

  return {
    dependencies,
    blockedBy: dependencies
      .filter(d => d.blocking && d.ticketId)
      .map(d => d.ticketId!),
    blocks: blocking
  };
}

function extractExplicitReferences(text: string): string[] {
  const refs: string[] = [];

  // Pattern: after #123, depends on #456, blocked by #789
  const patterns = [
    /after\s*#(\d+)/gi,
    /depends?\s*on\s*#(\d+)/gi,
    /blocked?\s*by\s*#(\d+)/gi,
    /requires?\s*#(\d+)/gi
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      refs.push(match[1]);
    }
  }

  return [...new Set(refs)];
}

async function detectImplicitDependencies(
  text: string,
  projectId: string
): Promise<Dependency[]> {
  const dependencies: Dependency[] = [];

  // Database/schema dependencies
  if (text.includes('use') && (text.includes('table') || text.includes('model'))) {
    // Find any in-progress schema/migration tickets
    const schemaTickets = await prisma.ticket.findMany({
      where: {
        projectId,
        status: 'IN_PROGRESS',
        OR: [
          { title: { contains: 'schema', mode: 'insensitive' } },
          { title: { contains: 'migration', mode: 'insensitive' } },
          { labels: { has: 'database' } }
        ]
      }
    });

    for (const ticket of schemaTickets) {
      dependencies.push({
        ticketId: ticket.id,
        type: 'implicit',
        reason: 'May depend on schema changes',
        blocking: false
      });
    }
  }

  // API dependencies
  if (text.includes('api') && text.includes('endpoint')) {
    const apiTickets = await prisma.ticket.findMany({
      where: {
        projectId,
        status: { in: ['IN_PROGRESS', 'TODO'] },
        labels: { has: 'api' }
      }
    });

    for (const ticket of apiTickets) {
      dependencies.push({
        ticketId: ticket.id,
        type: 'suggested',
        reason: 'May be related to API changes',
        blocking: false
      });
    }
  }

  return dependencies;
}

async function findBlockedTickets(
  ticketId: string,
  projectId: string
): Promise<string[]> {
  // Find tickets that reference this one
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId }
  });

  if (!ticket) return [];

  const potential = await prisma.ticket.findMany({
    where: {
      projectId,
      id: { not: ticketId },
      status: { in: ['BACKLOG', 'TODO'] },
      OR: [
        { description: { contains: `#${ticketId}` } },
        { description: { contains: ticket.title, mode: 'insensitive' } }
      ]
    }
  });

  return potential.map(t => t.id);
}
```

**Acceptance Criteria**:
- Explicit references detected
- Implicit dependencies suggested
- Bi-directional relationships tracked

---

## Sprint 3: Agent Assignment & Feedback Loop (Week 11)

### TASK-050: Create Agent Assignment Service
**Priority**: Critical
**Estimated**: 1.5 hours

- [ ] Create `/src/lib/server/assignment/agent-router.ts`
- [ ] Implement routing algorithm based on analysis
- [ ] Query learned patterns for optimal assignment
- [ ] Support manual override

```typescript
// src/lib/server/assignment/agent-router.ts
import { claudeFlowCLI } from '../claude-flow/cli';
import type { AnalysisResult } from '../analysis/ticket-analyzer';

interface AgentAssignment {
  agents: AgentConfig[];
  topology: 'single' | 'mesh' | 'hierarchical';
  confidence: number;
  reasoning: string[];
}

interface AgentConfig {
  type: string;
  role: 'coordinator' | 'worker';
  priority: number;
  prompt?: string;
}

// Agent capabilities by type
const AGENT_CAPABILITIES: Record<string, string[]> = {
  coder: ['implementation', 'coding', 'feature', 'bug-fix'],
  tester: ['testing', 'test', 'coverage', 'qa'],
  reviewer: ['review', 'quality', 'security'],
  researcher: ['research', 'analysis', 'documentation'],
  architect: ['architecture', 'design', 'refactor'],
  'security-architect': ['security', 'auth', 'encryption'],
  'security-auditor': ['security-audit', 'vulnerability'],
  planner: ['planning', 'breakdown', 'estimation'],
  coordinator: ['coordination', 'complex', 'multi-agent'],
  'api-docs': ['documentation', 'api', 'openapi']
};

export async function assignAgents(
  analysis: AnalysisResult
): Promise<AgentAssignment> {
  const reasoning: string[] = [];
  const agents: AgentConfig[] = [];

  // 1. Check learned patterns first
  const learnedAssignment = await queryLearnedPatterns(analysis);
  if (learnedAssignment) {
    reasoning.push(`Using learned pattern with ${learnedAssignment.confidence * 100}% success rate`);
    return {
      ...learnedAssignment,
      reasoning
    };
  }

  // 2. Use suggested agents from analysis
  reasoning.push(`Ticket type: ${analysis.ticketType}, complexity: ${analysis.complexity}`);

  for (let i = 0; i < analysis.suggestedAgents.length; i++) {
    const agentType = analysis.suggestedAgents[i];
    agents.push({
      type: agentType,
      role: i === 0 && analysis.complexity >= 5 ? 'coordinator' : 'worker',
      priority: analysis.suggestedAgents.length - i
    });
    reasoning.push(`Added ${agentType} agent`);
  }

  // 3. Determine topology
  let topology = analysis.suggestedTopology;
  if (agents.length > 4 && topology !== 'hierarchical') {
    topology = 'hierarchical';
    reasoning.push('Upgraded to hierarchical topology for 4+ agents');
  }

  // 4. Add coordinator if hierarchical and not present
  if (topology === 'hierarchical' && !agents.find(a => a.role === 'coordinator')) {
    agents.unshift({
      type: 'coordinator',
      role: 'coordinator',
      priority: 100
    });
    reasoning.push('Added coordinator for hierarchical topology');
  }

  return {
    agents,
    topology,
    confidence: learnedAssignment ? 0.8 : 0.6,
    reasoning
  };
}

async function queryLearnedPatterns(
  analysis: AnalysisResult
): Promise<Omit<AgentAssignment, 'reasoning'> | null> {
  try {
    // Query Claude Flow memory for similar successful assignments
    const result = await claudeFlowCLI.execute('memory', [
      'search',
      '--query', `${analysis.ticketType} ${analysis.keywords.join(' ')} success`,
      '--namespace', 'agent-assignments',
      '--limit', '1'
    ]);

    if (result.stdout.includes('agents:')) {
      // Parse learned pattern
      const agentMatch = result.stdout.match(/agents:\s*\[(.*?)\]/);
      const topologyMatch = result.stdout.match(/topology:\s*(\w+)/);
      const successMatch = result.stdout.match(/success:\s*([\d.]+)/);

      if (agentMatch && topologyMatch) {
        const agentTypes = agentMatch[1].split(',').map(s => s.trim());
        const successRate = successMatch ? parseFloat(successMatch[1]) : 0.5;

        if (successRate >= 0.7) {
          return {
            agents: agentTypes.map((type, i) => ({
              type,
              role: i === 0 ? 'coordinator' : 'worker',
              priority: agentTypes.length - i
            })),
            topology: topologyMatch[1] as any,
            confidence: successRate
          };
        }
      }
    }
  } catch {
    // Pattern not found
  }

  return null;
}

// Store successful assignment pattern
export async function storeSuccessfulAssignment(
  analysis: AnalysisResult,
  assignment: AgentAssignment,
  successRate: number
) {
  const pattern = {
    ticketType: analysis.ticketType,
    keywords: analysis.keywords,
    complexity: analysis.complexity,
    agents: assignment.agents.map(a => a.type),
    topology: assignment.topology,
    success: successRate
  };

  await claudeFlowCLI.execute('memory', [
    'store',
    '--key', `assignment-${Date.now()}`,
    '--value', JSON.stringify(pattern),
    '--namespace', 'agent-assignments'
  ]);
}
```

**Acceptance Criteria**:
- Agents assigned based on analysis
- Learned patterns used when available
- Successful patterns stored for future

---

### TASK-051: Implement Agent-Task Matching with Patterns
**Priority**: Critical
**Estimated**: 1.5 hours

- [ ] Query Claude Flow memory for relevant patterns
- [ ] Score patterns by similarity
- [ ] Apply matched patterns to routing
- [ ] Track pattern performance

```typescript
// src/lib/server/assignment/pattern-matcher.ts
import { claudeFlowCLI } from '../claude-flow/cli';

interface Pattern {
  id: string;
  keywords: string[];
  agentConfig: string[];
  successRate: number;
  usageCount: number;
  lastUsed: string;
}

interface MatchResult {
  patterns: Array<Pattern & { similarity: number }>;
  bestMatch: Pattern | null;
  recommendation: string;
}

export async function findMatchingPatterns(
  keywords: string[],
  ticketType: string
): Promise<MatchResult> {
  const patterns: Array<Pattern & { similarity: number }> = [];

  try {
    // Search for patterns with similar keywords
    for (const keyword of keywords) {
      const result = await claudeFlowCLI.execute('memory', [
        'search',
        '--query', `${keyword} ${ticketType}`,
        '--namespace', 'patterns',
        '--limit', '5'
      ]);

      // Parse patterns from result
      const parsed = parsePatternResults(result.stdout);
      for (const pattern of parsed) {
        const similarity = calculateSimilarity(keywords, pattern.keywords);
        patterns.push({ ...pattern, similarity });
      }
    }

    // Deduplicate and sort by similarity
    const unique = deduplicatePatterns(patterns);
    unique.sort((a, b) => b.similarity - a.similarity);

    // Get best match (similarity > 0.6 and success > 0.7)
    const bestMatch = unique.find(p =>
      p.similarity > 0.6 && p.successRate > 0.7
    ) || null;

    return {
      patterns: unique.slice(0, 5),
      bestMatch,
      recommendation: bestMatch
        ? `Use pattern "${bestMatch.id}" (${Math.round(bestMatch.similarity * 100)}% match, ${Math.round(bestMatch.successRate * 100)}% success)`
        : 'No strong pattern match - using default routing'
    };
  } catch {
    return {
      patterns: [],
      bestMatch: null,
      recommendation: 'Pattern search unavailable - using default routing'
    };
  }
}

function parsePatternResults(output: string): Pattern[] {
  const patterns: Pattern[] = [];

  // Parse JSON or structured output from memory search
  try {
    const lines = output.split('\n').filter(l => l.trim());
    for (const line of lines) {
      if (line.startsWith('{')) {
        patterns.push(JSON.parse(line));
      }
    }
  } catch {
    // Try alternative parsing
    const matches = output.matchAll(
      /pattern:\s*(\w+).*?keywords:\s*\[(.*?)\].*?agents:\s*\[(.*?)\].*?success:\s*([\d.]+)/gi
    );

    for (const match of matches) {
      patterns.push({
        id: match[1],
        keywords: match[2].split(',').map(s => s.trim()),
        agentConfig: match[3].split(',').map(s => s.trim()),
        successRate: parseFloat(match[4]),
        usageCount: 0,
        lastUsed: new Date().toISOString()
      });
    }
  }

  return patterns;
}

function calculateSimilarity(keywords1: string[], keywords2: string[]): number {
  const set1 = new Set(keywords1.map(k => k.toLowerCase()));
  const set2 = new Set(keywords2.map(k => k.toLowerCase()));

  const intersection = [...set1].filter(k => set2.has(k)).length;
  const union = new Set([...set1, ...set2]).size;

  return union > 0 ? intersection / union : 0;
}

function deduplicatePatterns(
  patterns: Array<Pattern & { similarity: number }>
): Array<Pattern & { similarity: number }> {
  const seen = new Map<string, Pattern & { similarity: number }>();

  for (const pattern of patterns) {
    const existing = seen.get(pattern.id);
    if (!existing || pattern.similarity > existing.similarity) {
      seen.set(pattern.id, pattern);
    }
  }

  return Array.from(seen.values());
}
```

**Acceptance Criteria**:
- Patterns retrieved from memory
- Similarity scoring works
- Best match selected with confidence

---

### TASK-052: Create Topology Selection Algorithm
**Priority**: High
**Estimated**: 1 hour

- [ ] Implement topology decision tree
- [ ] Factor in agent count, complexity, dependencies
- [ ] Support dynamic topology switching
- [ ] Document topology recommendations

```typescript
// src/lib/server/assignment/topology-selector.ts

type Topology = 'single' | 'mesh' | 'hierarchical' | 'hybrid';

interface TopologyDecision {
  topology: Topology;
  maxAgents: number;
  coordinatorRequired: boolean;
  reasoning: string[];
}

interface TopologyFactors {
  complexity: number;
  agentCount: number;
  hasDependencies: boolean;
  isSecurityRelated: boolean;
  requiresConsensus: boolean;
  expectedDuration: number; // hours
}

export function selectTopology(factors: TopologyFactors): TopologyDecision {
  const reasoning: string[] = [];

  // Single agent for simple tasks
  if (factors.complexity <= 2 && factors.agentCount === 1) {
    reasoning.push('Simple task with single agent');
    return {
      topology: 'single',
      maxAgents: 1,
      coordinatorRequired: false,
      reasoning
    };
  }

  // Mesh for collaborative, equal-priority tasks
  if (
    factors.complexity <= 4 &&
    factors.agentCount <= 3 &&
    !factors.hasDependencies &&
    factors.requiresConsensus
  ) {
    reasoning.push('Collaborative task suited for mesh topology');
    reasoning.push('All agents can communicate directly');
    return {
      topology: 'mesh',
      maxAgents: 5,
      coordinatorRequired: false,
      reasoning
    };
  }

  // Hierarchical for complex, coordinated work
  if (
    factors.complexity >= 5 ||
    factors.agentCount > 3 ||
    factors.hasDependencies
  ) {
    reasoning.push('Complex task requires hierarchical coordination');

    if (factors.hasDependencies) {
      reasoning.push('Dependencies require ordered execution');
    }

    if (factors.agentCount > 3) {
      reasoning.push('Multiple agents need central coordination');
    }

    return {
      topology: 'hierarchical',
      maxAgents: 10,
      coordinatorRequired: true,
      reasoning
    };
  }

  // Hybrid for security-sensitive or long-running tasks
  if (factors.isSecurityRelated || factors.expectedDuration > 4) {
    reasoning.push('Security/long-running task benefits from hybrid topology');
    reasoning.push('Combines coordination with peer review');
    return {
      topology: 'hybrid',
      maxAgents: 8,
      coordinatorRequired: true,
      reasoning
    };
  }

  // Default to mesh for moderate tasks
  reasoning.push('Default to mesh for moderate complexity');
  return {
    topology: 'mesh',
    maxAgents: 5,
    coordinatorRequired: false,
    reasoning
  };
}

// Topology characteristics for UI display
export const TOPOLOGY_INFO: Record<Topology, {
  name: string;
  description: string;
  bestFor: string[];
  agentLimit: number;
}> = {
  single: {
    name: 'Single Agent',
    description: 'One agent works independently',
    bestFor: ['Simple tasks', 'Quick fixes', 'Documentation'],
    agentLimit: 1
  },
  mesh: {
    name: 'Mesh Network',
    description: 'All agents communicate directly with each other',
    bestFor: ['Collaboration', 'Code review', 'Brainstorming'],
    agentLimit: 5
  },
  hierarchical: {
    name: 'Hierarchical',
    description: 'Coordinator agent leads worker agents',
    bestFor: ['Complex features', 'Multi-step tasks', 'Dependencies'],
    agentLimit: 10
  },
  hybrid: {
    name: 'Hierarchical Mesh',
    description: 'Coordinator with peer-to-peer worker communication',
    bestFor: ['Security tasks', 'Long-running work', 'Quality-critical'],
    agentLimit: 8
  }
};
```

**Acceptance Criteria**:
- Topology selected based on factors
- Clear reasoning provided
- Topology info available for UI

---

### TASK-053: Implement Swarm Initialization on Ticket Move
**Priority**: Critical
**Estimated**: 2 hours

- [ ] Trigger swarm on "TODO" → "IN_PROGRESS" transition
- [ ] Pass ticket context to swarm
- [ ] Start progress tracking
- [ ] Handle initialization failures

```typescript
// src/lib/server/workflow/ticket-workflow.ts
import { prisma } from '../prisma';
import { ticketAnalyzer } from '../analysis/ticket-analyzer';
import { assignAgents, storeSuccessfulAssignment } from '../assignment/agent-router';
import { selectTopology } from '../assignment/topology-selector';
import { swarmService } from '../claude-flow/swarm';
import { agentService } from '../claude-flow/agents';
import { executionManager } from '../claude-flow/executor';
import { publishTicketEvent } from '../redis/pubsub';

interface WorkflowResult {
  success: boolean;
  swarmId?: string;
  agents?: string[];
  error?: string;
}

export async function handleTicketTransition(
  ticketId: string,
  fromStatus: string,
  toStatus: string,
  triggeredBy: string
): Promise<WorkflowResult> {
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: { project: true }
  });

  if (!ticket) {
    return { success: false, error: 'Ticket not found' };
  }

  // Handle "In Progress" - spawn swarm
  if (toStatus === 'IN_PROGRESS' && fromStatus === 'TODO') {
    return await startTicketExecution(ticket);
  }

  // Handle "Ready to Resume" - continue execution
  if (toStatus === 'READY_TO_RESUME' && fromStatus === 'NEEDS_FEEDBACK') {
    return await resumeTicketExecution(ticket);
  }

  // Handle completion
  if (toStatus === 'DONE') {
    return await completeTicketExecution(ticket);
  }

  return { success: true };
}

async function startTicketExecution(ticket: any): Promise<WorkflowResult> {
  try {
    // 1. Analyze ticket
    const analysis = await ticketAnalyzer.analyze(ticket);

    // 2. Update ticket with analysis
    await prisma.ticket.update({
      where: { id: ticket.id },
      data: {
        complexity: analysis.complexity,
        labels: [...new Set([...ticket.labels, ...analysis.suggestedLabels])]
      }
    });

    // 3. Assign agents
    const assignment = await assignAgents(analysis);

    // 4. Select topology
    const topologyDecision = selectTopology({
      complexity: analysis.complexity,
      agentCount: assignment.agents.length,
      hasDependencies: analysis.dependencies.length > 0,
      isSecurityRelated: analysis.keywords.includes('security'),
      requiresConsensus: false,
      expectedDuration: analysis.estimatedHours
    });

    // 5. Initialize swarm
    const swarm = await swarmService.init({
      topology: topologyDecision.topology,
      maxAgents: topologyDecision.maxAgents
    });

    // 6. Spawn agents
    const agentIds: string[] = [];
    for (const agentConfig of assignment.agents) {
      const agent = await agentService.spawn({
        type: agentConfig.type,
        name: `${ticket.id}-${agentConfig.type}`,
        prompt: buildAgentPrompt(ticket, agentConfig)
      });
      agentIds.push(agent.id);
      await swarmService.addAgent(agent.id);
    }

    // 7. Start execution tracking
    const jobId = await executionManager.submit(
      'task',
      ['execute', '--ticket', ticket.id],
      { ticketId: ticket.id, projectId: ticket.projectId }
    );

    // 8. Broadcast event
    await publishTicketEvent('execution-started', {
      ticketId: ticket.id,
      projectId: ticket.projectId,
      swarmId: swarm.id,
      agents: agentIds,
      analysis,
      assignment
    });

    return {
      success: true,
      swarmId: swarm.id,
      agents: agentIds
    };
  } catch (error) {
    console.error('Failed to start ticket execution:', error);

    // Move ticket back to TODO on failure
    await prisma.ticket.update({
      where: { id: ticket.id },
      data: { status: 'TODO' }
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

function buildAgentPrompt(ticket: any, agentConfig: any): string {
  return `
You are working on ticket: "${ticket.title}"

Description: ${ticket.description || 'No description provided'}

Priority: ${ticket.priority}
Labels: ${ticket.labels.join(', ')}

Your role: ${agentConfig.role}
Your agent type: ${agentConfig.type}

Execute this task following TDD methodology. If you need user input or have questions, emit a "needs_feedback" event with your questions.

Project context: ${ticket.project.name}
  `.trim();
}

async function resumeTicketExecution(ticket: any): Promise<WorkflowResult> {
  // Resume paused execution with user's answers
  const questions = await prisma.ticketQuestion.findMany({
    where: { ticketId: ticket.id, answered: true },
    orderBy: { createdAt: 'desc' }
  });

  // Emit resume event to swarm
  await publishTicketEvent('execution-resumed', {
    ticketId: ticket.id,
    projectId: ticket.projectId,
    answers: questions.map(q => ({
      question: q.question,
      answer: q.answer
    }))
  });

  return { success: true };
}

async function completeTicketExecution(ticket: any): Promise<WorkflowResult> {
  // Record completion and store patterns
  const analysis = await ticketAnalyzer.analyze(ticket);
  const assignment = await assignAgents(analysis);

  // Calculate success rate based on time and iterations
  const successRate = 0.9; // Would calculate from actual metrics

  await storeSuccessfulAssignment(analysis, assignment, successRate);

  return { success: true };
}
```

**Acceptance Criteria**:
- Swarm spawns on ticket move to IN_PROGRESS
- Agents receive ticket context
- Failure handling moves ticket back to TODO

---

### TASK-054: Implement "Needs Feedback" Transition
**Priority**: Critical (CORE FEATURE)
**Estimated**: 2 hours

- [ ] Create mechanism for agents to request feedback
- [ ] Auto-transition ticket to NEEDS_FEEDBACK
- [ ] Pause swarm execution
- [ ] Notify user via WebSocket

```typescript
// src/lib/server/workflow/feedback-handler.ts
import { prisma } from '../prisma';
import { publishTicketEvent } from '../redis/pubsub';

interface FeedbackRequest {
  ticketId: string;
  agentId: string;
  questions: Question[];
  context: string;
  blocking: boolean;
}

interface Question {
  id: string;
  text: string;
  type: 'text' | 'choice' | 'multiselect' | 'confirm';
  options?: string[];
  required: boolean;
}

// Called by agent when it needs user input
export async function requestFeedback(request: FeedbackRequest): Promise<void> {
  const ticket = await prisma.ticket.findUnique({
    where: { id: request.ticketId }
  });

  if (!ticket) {
    throw new Error('Ticket not found');
  }

  // Store questions
  for (const question of request.questions) {
    await prisma.ticketQuestion.create({
      data: {
        id: question.id,
        ticketId: request.ticketId,
        agentId: request.agentId,
        question: question.text,
        type: question.type,
        options: question.options || [],
        required: question.required,
        context: request.context,
        answered: false
      }
    });
  }

  // Transition ticket to NEEDS_FEEDBACK
  if (request.blocking) {
    await prisma.ticket.update({
      where: { id: request.ticketId },
      data: { status: 'NEEDS_FEEDBACK' }
    });

    // Record in history
    await prisma.ticketHistory.create({
      data: {
        ticketId: request.ticketId,
        fromStatus: ticket.status,
        toStatus: 'NEEDS_FEEDBACK',
        reason: `Agent ${request.agentId} needs feedback`,
        triggeredBy: 'agent'
      }
    });
  }

  // Notify via WebSocket
  await publishTicketEvent('feedback-requested', {
    ticketId: request.ticketId,
    projectId: ticket.projectId,
    agentId: request.agentId,
    questions: request.questions,
    context: request.context,
    blocking: request.blocking
  });
}

// API endpoint for agents to call
// POST /api/tickets/:id/feedback/request
export async function handleFeedbackRequestAPI(
  ticketId: string,
  body: Omit<FeedbackRequest, 'ticketId'>
) {
  await requestFeedback({ ticketId, ...body });
  return { success: true };
}
```

```typescript
// Add Prisma model for questions
// prisma/schema.prisma (addition)
/*
model TicketQuestion {
  id        String   @id @default(cuid())
  ticketId  String
  ticket    Ticket   @relation(fields: [ticketId], references: [id], onDelete: Cascade)
  agentId   String
  question  String
  type      String   @default("text")
  options   String[]
  required  Boolean  @default(true)
  context   String?
  answer    String?
  answered  Boolean  @default(false)
  createdAt DateTime @default(now())
  answeredAt DateTime?
}
*/
```

**Acceptance Criteria**:
- Agents can request feedback via API
- Ticket moves to NEEDS_FEEDBACK
- Questions stored in database
- User notified in real-time

---

### TASK-055: Create Question Persistence Model
**Priority**: Critical
**Estimated**: 1 hour

- [ ] Add TicketQuestion model to Prisma
- [ ] Create migration
- [ ] Add question CRUD endpoints
- [ ] Support question types (text, choice, confirm)

```prisma
// Add to prisma/schema.prisma

model TicketQuestion {
  id         String   @id @default(cuid())
  ticketId   String
  ticket     Ticket   @relation(fields: [ticketId], references: [id], onDelete: Cascade)
  agentId    String
  question   String
  type       QuestionType @default(TEXT)
  options    String[]
  required   Boolean  @default(true)
  context    String?
  answer     String?
  answered   Boolean  @default(false)
  createdAt  DateTime @default(now())
  answeredAt DateTime?
}

enum QuestionType {
  TEXT
  CHOICE
  MULTISELECT
  CONFIRM
  CODE
}
```

```typescript
// src/routes/api/tickets/[id]/questions/+server.ts
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/prisma';

export const GET: RequestHandler = async ({ params }) => {
  const questions = await prisma.ticketQuestion.findMany({
    where: { ticketId: params.id },
    orderBy: { createdAt: 'desc' }
  });

  return json(questions);
};

export const POST: RequestHandler = async ({ params, request }) => {
  const body = await request.json();

  const question = await prisma.ticketQuestion.create({
    data: {
      ticketId: params.id,
      agentId: body.agentId,
      question: body.question,
      type: body.type || 'TEXT',
      options: body.options || [],
      required: body.required ?? true,
      context: body.context
    }
  });

  return json(question, { status: 201 });
};
```

**Acceptance Criteria**:
- TicketQuestion model in Prisma
- Migration applied
- CRUD endpoints working
- Multiple question types supported

---

### TASK-056: Implement User Response Handling
**Priority**: Critical
**Estimated**: 1.5 hours

- [ ] Create answer submission endpoint
- [ ] Validate answers against question requirements
- [ ] Store answers in database
- [ ] Emit answer event to swarm

```typescript
// src/routes/api/tickets/[id]/questions/[questionId]/answer/+server.ts
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/prisma';
import { publishTicketEvent } from '$lib/server/redis/pubsub';

export const POST: RequestHandler = async ({ params, request }) => {
  const { id: ticketId, questionId } = params;
  const body = await request.json();
  const { answer } = body;

  // Get question
  const question = await prisma.ticketQuestion.findUnique({
    where: { id: questionId },
    include: { ticket: true }
  });

  if (!question) {
    throw error(404, 'Question not found');
  }

  if (question.ticketId !== ticketId) {
    throw error(400, 'Question does not belong to this ticket');
  }

  // Validate answer
  if (question.required && !answer) {
    throw error(400, 'Answer is required');
  }

  if (question.type === 'CHOICE' && question.options.length > 0) {
    if (!question.options.includes(answer)) {
      throw error(400, 'Invalid choice');
    }
  }

  // Store answer
  const updated = await prisma.ticketQuestion.update({
    where: { id: questionId },
    data: {
      answer,
      answered: true,
      answeredAt: new Date()
    }
  });

  // Check if all required questions are answered
  const unanswered = await prisma.ticketQuestion.count({
    where: {
      ticketId,
      required: true,
      answered: false
    }
  });

  // Emit answer event
  await publishTicketEvent('question-answered', {
    ticketId,
    projectId: question.ticket.projectId,
    questionId,
    answer,
    agentId: question.agentId,
    allAnswered: unanswered === 0
  });

  return json({
    question: updated,
    allAnswered: unanswered === 0
  });
};
```

**Acceptance Criteria**:
- Answers submitted via API
- Validation for required/choice questions
- Event emitted to swarm

---

### TASK-057: Create Question/Answer UI on Ticket Cards
**Priority**: Critical
**Estimated**: 2 hours

- [ ] Display questions on NEEDS_FEEDBACK cards
- [ ] Create answer input components for each type
- [ ] Submit answers and show success
- [ ] Show "Ready to Resume" button when all answered

```svelte
<!-- src/lib/components/kanban/TicketQuestions.svelte -->
<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Input from '$lib/components/ui/Input.svelte';
  import { Check, MessageCircleQuestion } from 'lucide-svelte';

  interface Question {
    id: string;
    question: string;
    type: 'TEXT' | 'CHOICE' | 'MULTISELECT' | 'CONFIRM';
    options: string[];
    required: boolean;
    answer: string | null;
    answered: boolean;
    context: string | null;
  }

  export let ticketId: string;
  export let questions: Question[] = [];

  const dispatch = createEventDispatcher();

  let answers: Record<string, string> = {};
  let submitting: Record<string, boolean> = {};

  $: unansweredCount = questions.filter(q => !q.answered && q.required).length;
  $: allAnswered = unansweredCount === 0;

  async function submitAnswer(question: Question) {
    const answer = answers[question.id];
    if (question.required && !answer) return;

    submitting[question.id] = true;

    try {
      const response = await fetch(
        `/api/tickets/${ticketId}/questions/${question.id}/answer`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ answer })
        }
      );

      if (response.ok) {
        const result = await response.json();
        dispatch('answered', { questionId: question.id, allAnswered: result.allAnswered });

        // Update local state
        const idx = questions.findIndex(q => q.id === question.id);
        if (idx >= 0) {
          questions[idx] = { ...questions[idx], answered: true, answer };
          questions = [...questions];
        }
      }
    } finally {
      submitting[question.id] = false;
    }
  }

  function handleReadyToResume() {
    dispatch('readyToResume');
  }
</script>

<div class="space-y-4 p-4 bg-orange-50 rounded-lg border border-orange-200">
  <div class="flex items-center gap-2 text-orange-700">
    <MessageCircleQuestion class="w-5 h-5" />
    <span class="font-medium">Claude needs your input</span>
    {#if unansweredCount > 0}
      <span class="text-sm">({unansweredCount} question{unansweredCount > 1 ? 's' : ''} remaining)</span>
    {/if}
  </div>

  {#each questions as question (question.id)}
    <div class="bg-white rounded-md p-3 shadow-sm">
      <p class="font-medium text-sm mb-2">{question.question}</p>

      {#if question.context}
        <p class="text-xs text-gray-500 mb-2">{question.context}</p>
      {/if}

      {#if question.answered}
        <div class="flex items-center gap-2 text-green-600">
          <Check class="w-4 h-4" />
          <span class="text-sm">{question.answer}</span>
        </div>
      {:else if question.type === 'TEXT'}
        <div class="flex gap-2">
          <Input
            bind:value={answers[question.id]}
            placeholder="Type your answer..."
            class="flex-1"
          />
          <Button
            size="sm"
            on:click={() => submitAnswer(question)}
            disabled={submitting[question.id] || (question.required && !answers[question.id])}
          >
            {submitting[question.id] ? '...' : 'Submit'}
          </Button>
        </div>

      {:else if question.type === 'CHOICE'}
        <div class="flex flex-wrap gap-2">
          {#each question.options as option}
            <button
              class="px-3 py-1 text-sm rounded-full border transition-colors
                     {answers[question.id] === option
                       ? 'bg-blue-500 text-white border-blue-500'
                       : 'bg-white hover:bg-gray-50 border-gray-300'}"
              on:click={() => {
                answers[question.id] = option;
                submitAnswer(question);
              }}
              disabled={submitting[question.id]}
            >
              {option}
            </button>
          {/each}
        </div>

      {:else if question.type === 'CONFIRM'}
        <div class="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            on:click={() => { answers[question.id] = 'No'; submitAnswer(question); }}
            disabled={submitting[question.id]}
          >
            No
          </Button>
          <Button
            size="sm"
            on:click={() => { answers[question.id] = 'Yes'; submitAnswer(question); }}
            disabled={submitting[question.id]}
          >
            Yes
          </Button>
        </div>
      {/if}
    </div>
  {/each}

  {#if allAnswered}
    <Button
      class="w-full"
      on:click={handleReadyToResume}
    >
      Ready to Resume - Let Claude Continue
    </Button>
  {/if}
</div>
```

**Acceptance Criteria**:
- Questions displayed on ticket cards
- Different input types work (text, choice, confirm)
- "Ready to Resume" button appears when all answered

---

### TASK-058: Implement "Ready to Resume" Workflow
**Priority**: Critical
**Estimated**: 1.5 hours

- [ ] Create endpoint for resume action
- [ ] Transition ticket to READY_TO_RESUME then IN_PROGRESS
- [ ] Send answers to swarm
- [ ] Resume agent execution

```typescript
// src/routes/api/tickets/[id]/resume/+server.ts
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/prisma';
import { ticketStateMachine } from '$lib/state-machine/ticket-state-machine';
import { publishTicketEvent } from '$lib/server/redis/pubsub';

export const POST: RequestHandler = async ({ params }) => {
  const { id } = params;

  const ticket = await prisma.ticket.findUnique({
    where: { id },
    include: {
      questions: {
        where: { answered: true },
        orderBy: { answeredAt: 'desc' }
      }
    }
  });

  if (!ticket) {
    throw error(404, 'Ticket not found');
  }

  if (ticket.status !== 'NEEDS_FEEDBACK') {
    throw error(400, 'Ticket is not awaiting feedback');
  }

  // Check all required questions answered
  const unanswered = await prisma.ticketQuestion.count({
    where: {
      ticketId: id,
      required: true,
      answered: false
    }
  });

  if (unanswered > 0) {
    throw error(400, `${unanswered} required question(s) still unanswered`);
  }

  // Transition to READY_TO_RESUME
  await ticketStateMachine.transition(id, 'READY_TO_RESUME', {
    triggeredBy: 'user',
    reason: 'User provided feedback'
  });

  // Immediately transition to IN_PROGRESS (auto-resume)
  const updatedTicket = await ticketStateMachine.transition(id, 'IN_PROGRESS', {
    triggeredBy: 'system',
    reason: 'Resuming with user feedback'
  });

  // Collect answers for the swarm
  const answers = ticket.questions.map(q => ({
    questionId: q.id,
    question: q.question,
    answer: q.answer,
    agentId: q.agentId
  }));

  // Notify swarm to resume with answers
  await publishTicketEvent('execution-resumed', {
    ticketId: id,
    projectId: ticket.projectId,
    answers,
    resumedAt: new Date().toISOString()
  });

  return json({
    ticket: updatedTicket,
    answers
  });
};
```

**Acceptance Criteria**:
- Resume endpoint validates all required answered
- Ticket transitions through READY_TO_RESUME to IN_PROGRESS
- Answers sent to swarm
- Execution continues

---

## Sprint 4: Progress & Testing (Week 12)

### TASK-059: Create Progress Tracking Service
**Priority**: High
**Estimated**: 1.5 hours

- [ ] Track execution stages (analyzing, spawning, executing, etc.)
- [ ] Store progress checkpoints
- [ ] Calculate completion percentage
- [ ] Emit progress events

```typescript
// src/lib/server/progress/tracker.ts
import { prisma } from '../prisma';
import { publishTicketEvent } from '../redis/pubsub';

interface ProgressStage {
  id: string;
  name: string;
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
  startedAt?: Date;
  completedAt?: Date;
  output?: string;
}

interface TicketProgress {
  ticketId: string;
  stages: ProgressStage[];
  currentStage: string;
  percentComplete: number;
  estimatedRemaining: number | null; // minutes
  logs: string[];
}

const DEFAULT_STAGES: Omit<ProgressStage, 'id'>[] = [
  { name: 'Analyzing', status: 'pending' },
  { name: 'Assigning Agents', status: 'pending' },
  { name: 'Initializing Swarm', status: 'pending' },
  { name: 'Executing', status: 'pending' },
  { name: 'Testing', status: 'pending' },
  { name: 'Reviewing', status: 'pending' },
  { name: 'Completing', status: 'pending' }
];

class ProgressTracker {
  private progress = new Map<string, TicketProgress>();

  initialize(ticketId: string, projectId: string): TicketProgress {
    const stages = DEFAULT_STAGES.map((s, i) => ({
      ...s,
      id: `${ticketId}-stage-${i}`
    }));

    const progress: TicketProgress = {
      ticketId,
      stages,
      currentStage: stages[0].name,
      percentComplete: 0,
      estimatedRemaining: null,
      logs: []
    };

    this.progress.set(ticketId, progress);

    publishTicketEvent('progress-updated', {
      ticketId,
      projectId,
      progress
    });

    return progress;
  }

  async advanceStage(
    ticketId: string,
    projectId: string,
    stageName: string,
    status: 'in-progress' | 'completed' | 'failed',
    output?: string
  ) {
    const progress = this.progress.get(ticketId);
    if (!progress) return;

    const stageIndex = progress.stages.findIndex(s => s.name === stageName);
    if (stageIndex === -1) return;

    const stage = progress.stages[stageIndex];

    if (status === 'in-progress') {
      stage.status = 'in-progress';
      stage.startedAt = new Date();
      progress.currentStage = stageName;
    } else if (status === 'completed') {
      stage.status = 'completed';
      stage.completedAt = new Date();
      stage.output = output;
    } else {
      stage.status = 'failed';
      stage.output = output;
    }

    // Calculate percent complete
    const completed = progress.stages.filter(s => s.status === 'completed').length;
    progress.percentComplete = Math.round((completed / progress.stages.length) * 100);

    // Estimate remaining time based on completed stage times
    progress.estimatedRemaining = this.estimateRemaining(progress);

    await publishTicketEvent('progress-updated', {
      ticketId,
      projectId,
      progress
    });
  }

  addLog(ticketId: string, projectId: string, message: string) {
    const progress = this.progress.get(ticketId);
    if (!progress) return;

    const timestamp = new Date().toISOString();
    progress.logs.push(`[${timestamp}] ${message}`);

    // Keep last 100 logs
    if (progress.logs.length > 100) {
      progress.logs = progress.logs.slice(-100);
    }

    publishTicketEvent('progress-log', {
      ticketId,
      projectId,
      message,
      timestamp
    });
  }

  private estimateRemaining(progress: TicketProgress): number | null {
    const completedStages = progress.stages.filter(
      s => s.status === 'completed' && s.startedAt && s.completedAt
    );

    if (completedStages.length === 0) return null;

    // Calculate average stage duration
    const totalDuration = completedStages.reduce((sum, s) => {
      return sum + (s.completedAt!.getTime() - s.startedAt!.getTime());
    }, 0);
    const avgDuration = totalDuration / completedStages.length;

    // Estimate remaining stages
    const remainingStages = progress.stages.filter(
      s => s.status === 'pending' || s.status === 'in-progress'
    ).length;

    return Math.round((avgDuration * remainingStages) / 60000); // minutes
  }

  getProgress(ticketId: string): TicketProgress | undefined {
    return this.progress.get(ticketId);
  }

  cleanup(ticketId: string) {
    this.progress.delete(ticketId);
  }
}

export const progressTracker = new ProgressTracker();
```

**Acceptance Criteria**:
- Progress tracked through stages
- Percentage calculated
- Time remaining estimated
- Events emitted on updates

---

### TASK-060 to TASK-065: Progress UI, Checkpoints, Timeline, and Tests

*(Due to length, I'll summarize the remaining tasks)*

**TASK-060**: Add Progress Streaming to UI
- WebSocket listeners for progress events
- Progress bar component
- Real-time log viewer

**TASK-061**: Implement Execution Timeline UI
- Visual timeline of stages
- Duration for each stage
- Click to view stage output

**TASK-062**: Add Checkpoint and Restore System
- Save execution state periodically
- Restore from last checkpoint on failure
- Manual checkpoint creation

**TASK-063**: Add Unit Tests for Analysis and Assignment
- Test ticket analyzer
- Test complexity scoring
- Test agent assignment

**TASK-064**: Add Integration Tests for Claude Flow
- Test CLI wrapper
- Test swarm lifecycle
- Test feedback loop

**TASK-065**: Add E2E Tests for Full Ticket Lifecycle
- Create ticket → IN_PROGRESS → NEEDS_FEEDBACK → READY_TO_RESUME → DONE
- Playwright tests for UI workflow

---

## Phase 3 Completion Checklist

- [ ] All 25 tasks completed (TASK-041 to TASK-065)
- [ ] `npm test` passes
- [ ] E2E tests for full workflow pass
- [ ] Tickets can be executed by Claude Flow
- [ ] Feedback loop works end-to-end
- [ ] Progress visible in real-time
- [ ] Store implementation pattern:

```bash
npx @claude-flow/cli@latest memory store \
  --key "impl-phase3-complete" \
  --value "Phase 3 complete. Claude Flow integration with swim-lane feedback. Ticket analysis, agent assignment, progress tracking. Core workflow: TODO -> IN_PROGRESS -> NEEDS_FEEDBACK -> READY_TO_RESUME -> DONE" \
  --namespace cf-kanban-impl
```

---

## Next Phase Preview

**Phase 4: Learning Visualization (Weeks 13-16)**
- Pattern Explorer with D3.js
- Neural training dashboard
- Memory browser UI
- Cross-project transfer view
