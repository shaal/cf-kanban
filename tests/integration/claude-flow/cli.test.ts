/**
 * TASK-064: Integration Tests for Claude Flow CLI
 *
 * Tests for the Claude Flow CLI wrapper service, including command execution,
 * swarm lifecycle, and feedback loop handling.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { spawn, type ChildProcess } from 'child_process';
import { EventEmitter } from 'events';

// Mock child_process
const mockSpawn = vi.fn();
vi.mock('child_process', () => ({
  spawn: mockSpawn
}));

// Import after mocks
import { ClaudeFlowCLI, claudeFlowCLI } from '$lib/server/claude-flow/cli';
import { SwarmService, swarmService } from '$lib/server/claude-flow/swarm';
import { AgentService, agentService } from '$lib/server/claude-flow/agents';
import { ExecutionManager, executionManager } from '$lib/server/claude-flow/executor';

// Helper to create mock child process
function createMockProcess(stdout: string = '', stderr: string = '', exitCode: number = 0) {
  const mockProc = new EventEmitter() as ChildProcess & {
    stdout: EventEmitter;
    stderr: EventEmitter;
  };
  mockProc.stdout = new EventEmitter();
  mockProc.stderr = new EventEmitter();
  mockProc.kill = vi.fn();

  // Simulate async data and close
  setTimeout(() => {
    if (stdout) mockProc.stdout.emit('data', Buffer.from(stdout));
    if (stderr) mockProc.stderr.emit('data', Buffer.from(stderr));
    mockProc.emit('close', exitCode);
  }, 10);

  return mockProc;
}

describe('Claude Flow CLI Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.resetAllMocks();
  });

  describe('ClaudeFlowCLI', () => {
    describe('execute', () => {
      it('should execute command and capture stdout', async () => {
        const mockProc = createMockProcess('command output', '', 0);
        mockSpawn.mockReturnValue(mockProc);

        const cli = new ClaudeFlowCLI();
        const resultPromise = cli.execute('status', []);

        vi.advanceTimersByTime(20);
        const result = await resultPromise;

        expect(result.stdout).toBe('command output');
        expect(result.exitCode).toBe(0);
        expect(result.timedOut).toBe(false);
      });

      it('should execute command and capture stderr', async () => {
        const mockProc = createMockProcess('', 'error message', 1);
        mockSpawn.mockReturnValue(mockProc);

        const cli = new ClaudeFlowCLI();
        const resultPromise = cli.execute('invalid', []);

        vi.advanceTimersByTime(20);
        const result = await resultPromise;

        expect(result.stderr).toBe('error message');
        expect(result.exitCode).toBe(1);
      });

      it('should spawn npx with correct arguments', async () => {
        const mockProc = createMockProcess('ok', '', 0);
        mockSpawn.mockReturnValue(mockProc);

        const cli = new ClaudeFlowCLI();
        const resultPromise = cli.execute('agent', ['spawn', '-t', 'coder']);

        vi.advanceTimersByTime(20);
        await resultPromise;

        expect(mockSpawn).toHaveBeenCalledWith(
          'npx',
          ['@claude-flow/cli@latest', 'agent', 'spawn', '-t', 'coder'],
          expect.objectContaining({ shell: true })
        );
      });

      it('should pass custom cwd option', async () => {
        const mockProc = createMockProcess('ok', '', 0);
        mockSpawn.mockReturnValue(mockProc);

        const cli = new ClaudeFlowCLI();
        const resultPromise = cli.execute('status', [], { cwd: '/custom/path' });

        vi.advanceTimersByTime(20);
        await resultPromise;

        expect(mockSpawn).toHaveBeenCalledWith(
          'npx',
          expect.any(Array),
          expect.objectContaining({ cwd: '/custom/path' })
        );
      });

      it('should pass custom env variables', async () => {
        const mockProc = createMockProcess('ok', '', 0);
        mockSpawn.mockReturnValue(mockProc);

        const cli = new ClaudeFlowCLI();
        const resultPromise = cli.execute('status', [], {
          env: { CUSTOM_VAR: 'value' }
        });

        vi.advanceTimersByTime(20);
        await resultPromise;

        expect(mockSpawn).toHaveBeenCalledWith(
          'npx',
          expect.any(Array),
          expect.objectContaining({
            env: expect.objectContaining({ CUSTOM_VAR: 'value' })
          })
        );
      });

      it('should handle timeout', async () => {
        const mockProc = new EventEmitter() as ChildProcess & {
          stdout: EventEmitter;
          stderr: EventEmitter;
        };
        mockProc.stdout = new EventEmitter();
        mockProc.stderr = new EventEmitter();
        mockProc.kill = vi.fn().mockImplementation(() => {
          mockProc.emit('close', null);
        });

        mockSpawn.mockReturnValue(mockProc);

        const cli = new ClaudeFlowCLI();
        const resultPromise = cli.execute('long-running', [], { timeout: 1000 });

        vi.advanceTimersByTime(1100);
        const result = await resultPromise;

        expect(result.timedOut).toBe(true);
        expect(mockProc.kill).toHaveBeenCalledWith('SIGTERM');
      });

      it('should reject on spawn error', async () => {
        const mockProc = new EventEmitter() as ChildProcess & {
          stdout: EventEmitter;
          stderr: EventEmitter;
        };
        mockProc.stdout = new EventEmitter();
        mockProc.stderr = new EventEmitter();

        setTimeout(() => {
          mockProc.emit('error', new Error('Spawn failed'));
        }, 10);

        mockSpawn.mockReturnValue(mockProc);

        const cli = new ClaudeFlowCLI();
        const resultPromise = cli.execute('command', []);

        vi.advanceTimersByTime(20);

        await expect(resultPromise).rejects.toThrow('Spawn failed');
      });
    });

    describe('executeJson', () => {
      it('should parse JSON output', async () => {
        const jsonOutput = JSON.stringify({ id: 'agent-123', status: 'active' });
        const mockProc = createMockProcess(jsonOutput, '', 0);
        mockSpawn.mockReturnValue(mockProc);

        const cli = new ClaudeFlowCLI();
        const resultPromise = cli.executeJson<{ id: string; status: string }>(
          'agent',
          ['status', 'agent-123']
        );

        vi.advanceTimersByTime(20);
        const result = await resultPromise;

        expect(result.id).toBe('agent-123');
        expect(result.status).toBe('active');
      });

      it('should add --format json flag', async () => {
        const mockProc = createMockProcess('{}', '', 0);
        mockSpawn.mockReturnValue(mockProc);

        const cli = new ClaudeFlowCLI();
        const resultPromise = cli.executeJson('status', []);

        vi.advanceTimersByTime(20);
        await resultPromise;

        expect(mockSpawn).toHaveBeenCalledWith(
          'npx',
          expect.arrayContaining(['--format', 'json']),
          expect.any(Object)
        );
      });

      it('should throw on non-zero exit code', async () => {
        const mockProc = createMockProcess('', 'Command failed', 1);
        mockSpawn.mockReturnValue(mockProc);

        const cli = new ClaudeFlowCLI();
        const resultPromise = cli.executeJson('invalid', []);

        vi.advanceTimersByTime(20);

        await expect(resultPromise).rejects.toThrow('Command failed');
      });

      it('should throw on invalid JSON', async () => {
        const mockProc = createMockProcess('not json', '', 0);
        mockSpawn.mockReturnValue(mockProc);

        const cli = new ClaudeFlowCLI();
        const resultPromise = cli.executeJson('command', []);

        vi.advanceTimersByTime(20);

        await expect(resultPromise).rejects.toThrow('Failed to parse JSON');
      });
    });

    describe('singleton instance', () => {
      it('should export a singleton', () => {
        expect(claudeFlowCLI).toBeInstanceOf(ClaudeFlowCLI);
      });
    });
  });

  describe('SwarmService', () => {
    describe('init', () => {
      it('should initialize swarm with topology', async () => {
        const swarmData = { id: 'swarm-123', topology: 'hierarchical', status: 'active', agents: [], createdAt: new Date().toISOString() };
        const mockProc = createMockProcess(JSON.stringify(swarmData), '', 0);
        mockSpawn.mockReturnValue(mockProc);

        const service = new SwarmService();
        const resultPromise = service.init({ topology: 'hierarchical' });

        vi.advanceTimersByTime(20);
        const result = await resultPromise;

        expect(result.topology).toBe('hierarchical');
        expect(mockSpawn).toHaveBeenCalledWith(
          'npx',
          expect.arrayContaining(['swarm', 'init', '--topology', 'hierarchical']),
          expect.any(Object)
        );
      });

      it('should pass maxAgents option', async () => {
        const swarmData = { id: 'swarm-123', topology: 'mesh', status: 'active', agents: [], createdAt: new Date().toISOString() };
        const mockProc = createMockProcess(JSON.stringify(swarmData), '', 0);
        mockSpawn.mockReturnValue(mockProc);

        const service = new SwarmService();
        const resultPromise = service.init({ topology: 'mesh', maxAgents: 10 });

        vi.advanceTimersByTime(20);
        await resultPromise;

        expect(mockSpawn).toHaveBeenCalledWith(
          'npx',
          expect.arrayContaining(['--max-agents', '10']),
          expect.any(Object)
        );
      });
    });

    describe('getStatus', () => {
      it('should get swarm status', async () => {
        const statusData = {
          id: 'swarm-123',
          topology: 'hierarchical',
          status: 'active',
          agents: [{ id: 'agent-1', type: 'coder', status: 'working' }],
          createdAt: new Date().toISOString()
        };
        const mockProc = createMockProcess(JSON.stringify(statusData), '', 0);
        mockSpawn.mockReturnValue(mockProc);

        const service = new SwarmService();
        const resultPromise = service.getStatus();

        vi.advanceTimersByTime(20);
        const result = await resultPromise;

        expect(result.agents).toHaveLength(1);
        expect(result.status).toBe('active');
      });
    });

    describe('terminate', () => {
      it('should terminate swarm', async () => {
        const mockProc = createMockProcess('', '', 0);
        mockSpawn.mockReturnValue(mockProc);

        const service = new SwarmService();
        const resultPromise = service.terminate();

        vi.advanceTimersByTime(20);
        await resultPromise;

        expect(mockSpawn).toHaveBeenCalledWith(
          'npx',
          expect.arrayContaining(['swarm', 'terminate']),
          expect.any(Object)
        );
      });
    });

    describe('addAgent', () => {
      it('should add agent to swarm', async () => {
        const mockProc = createMockProcess('', '', 0);
        mockSpawn.mockReturnValue(mockProc);

        const service = new SwarmService();
        const resultPromise = service.addAgent('agent-123');

        vi.advanceTimersByTime(20);
        await resultPromise;

        expect(mockSpawn).toHaveBeenCalledWith(
          'npx',
          expect.arrayContaining(['swarm', 'add-agent', 'agent-123']),
          expect.any(Object)
        );
      });
    });

    describe('removeAgent', () => {
      it('should remove agent from swarm', async () => {
        const mockProc = createMockProcess('', '', 0);
        mockSpawn.mockReturnValue(mockProc);

        const service = new SwarmService();
        const resultPromise = service.removeAgent('agent-123');

        vi.advanceTimersByTime(20);
        await resultPromise;

        expect(mockSpawn).toHaveBeenCalledWith(
          'npx',
          expect.arrayContaining(['swarm', 'remove-agent', 'agent-123']),
          expect.any(Object)
        );
      });
    });

    describe('singleton instance', () => {
      it('should export a singleton', () => {
        expect(swarmService).toBeInstanceOf(SwarmService);
      });
    });
  });

  describe('AgentService', () => {
    describe('spawn', () => {
      it('should spawn agent with type and name', async () => {
        const agentData = {
          id: 'agent-123',
          type: 'coder',
          name: 'my-coder',
          status: 'idle',
          createdAt: new Date().toISOString()
        };
        const mockProc = createMockProcess(JSON.stringify(agentData), '', 0);
        mockSpawn.mockReturnValue(mockProc);

        const service = new AgentService();
        const resultPromise = service.spawn({ type: 'coder', name: 'my-coder' });

        vi.advanceTimersByTime(20);
        const result = await resultPromise;

        expect(result.type).toBe('coder');
        expect(result.name).toBe('my-coder');
        expect(mockSpawn).toHaveBeenCalledWith(
          'npx',
          expect.arrayContaining(['-t', 'coder', '--name', 'my-coder']),
          expect.any(Object)
        );
      });

      it('should pass prompt option', async () => {
        const agentData = { id: 'agent-123', type: 'coder', name: 'coder', status: 'idle', createdAt: new Date().toISOString() };
        const mockProc = createMockProcess(JSON.stringify(agentData), '', 0);
        mockSpawn.mockReturnValue(mockProc);

        const service = new AgentService();
        const resultPromise = service.spawn({
          type: 'coder',
          name: 'coder',
          prompt: 'Write code for feature X'
        });

        vi.advanceTimersByTime(20);
        await resultPromise;

        expect(mockSpawn).toHaveBeenCalledWith(
          'npx',
          expect.arrayContaining(['--prompt', 'Write code for feature X']),
          expect.any(Object)
        );
      });

      it('should pass model option', async () => {
        const agentData = { id: 'agent-123', type: 'coder', name: 'coder', status: 'idle', createdAt: new Date().toISOString() };
        const mockProc = createMockProcess(JSON.stringify(agentData), '', 0);
        mockSpawn.mockReturnValue(mockProc);

        const service = new AgentService();
        const resultPromise = service.spawn({
          type: 'coder',
          name: 'coder',
          model: 'claude-3-opus'
        });

        vi.advanceTimersByTime(20);
        await resultPromise;

        expect(mockSpawn).toHaveBeenCalledWith(
          'npx',
          expect.arrayContaining(['--model', 'claude-3-opus']),
          expect.any(Object)
        );
      });
    });

    describe('list', () => {
      it('should list all agents', async () => {
        const agents = [
          { id: 'agent-1', type: 'coder', name: 'coder-1', status: 'working', createdAt: new Date().toISOString() },
          { id: 'agent-2', type: 'tester', name: 'tester-1', status: 'idle', createdAt: new Date().toISOString() }
        ];
        const mockProc = createMockProcess(JSON.stringify(agents), '', 0);
        mockSpawn.mockReturnValue(mockProc);

        const service = new AgentService();
        const resultPromise = service.list();

        vi.advanceTimersByTime(20);
        const result = await resultPromise;

        expect(result).toHaveLength(2);
      });
    });

    describe('getStatus', () => {
      it('should get agent status', async () => {
        const agentData = { id: 'agent-123', type: 'coder', name: 'coder', status: 'working', createdAt: new Date().toISOString() };
        const mockProc = createMockProcess(JSON.stringify(agentData), '', 0);
        mockSpawn.mockReturnValue(mockProc);

        const service = new AgentService();
        const resultPromise = service.getStatus('agent-123');

        vi.advanceTimersByTime(20);
        const result = await resultPromise;

        expect(result.id).toBe('agent-123');
        expect(result.status).toBe('working');
      });
    });

    describe('stop', () => {
      it('should stop agent gracefully by default', async () => {
        const mockProc = createMockProcess('', '', 0);
        mockSpawn.mockReturnValue(mockProc);

        const service = new AgentService();
        const resultPromise = service.stop('agent-123');

        vi.advanceTimersByTime(20);
        await resultPromise;

        expect(mockSpawn).toHaveBeenCalledWith(
          'npx',
          expect.arrayContaining(['stop', 'agent-123', '--graceful']),
          expect.any(Object)
        );
      });

      it('should stop agent forcefully when specified', async () => {
        const mockProc = createMockProcess('', '', 0);
        mockSpawn.mockReturnValue(mockProc);

        const service = new AgentService();
        const resultPromise = service.stop('agent-123', false);

        vi.advanceTimersByTime(20);
        await resultPromise;

        expect(mockSpawn).toHaveBeenCalledWith(
          'npx',
          expect.not.arrayContaining(['--graceful']),
          expect.any(Object)
        );
      });
    });

    describe('getMetrics', () => {
      it('should get agent metrics', async () => {
        const metrics = { tasksCompleted: 5, avgTime: 120, successRate: 0.9 };
        const mockProc = createMockProcess(JSON.stringify(metrics), '', 0);
        mockSpawn.mockReturnValue(mockProc);

        const service = new AgentService();
        const resultPromise = service.getMetrics('agent-123');

        vi.advanceTimersByTime(20);
        const result = await resultPromise;

        expect(result.tasksCompleted).toBe(5);
        expect(result.successRate).toBe(0.9);
      });
    });

    describe('singleton instance', () => {
      it('should export a singleton', () => {
        expect(agentService).toBeInstanceOf(AgentService);
      });
    });
  });

  describe('ExecutionManager', () => {
    let manager: ExecutionManager;

    beforeEach(() => {
      manager = new ExecutionManager();
    });

    describe('submit', () => {
      it('should submit job and return job ID', async () => {
        const mockProc = createMockProcess('output', '', 0);
        mockSpawn.mockReturnValue(mockProc);

        const jobId = await manager.submit('task', ['execute']);

        expect(jobId).toBeDefined();
        expect(typeof jobId).toBe('string');
      });

      it('should store job with metadata', async () => {
        const mockProc = createMockProcess('output', '', 0);
        mockSpawn.mockReturnValue(mockProc);

        const jobId = await manager.submit('task', ['execute'], {
          ticketId: 'ticket-123',
          projectId: 'project-456'
        });

        const job = manager.getJob(jobId);
        expect(job?.ticketId).toBe('ticket-123');
        expect(job?.projectId).toBe('project-456');
      });

      it('should set job status to pending initially', async () => {
        // Don't emit close immediately
        const mockProc = new EventEmitter() as ChildProcess & {
          stdout: EventEmitter;
          stderr: EventEmitter;
        };
        mockProc.stdout = new EventEmitter();
        mockProc.stderr = new EventEmitter();
        mockSpawn.mockReturnValue(mockProc);

        const jobId = await manager.submit('task', ['execute']);
        const job = manager.getJob(jobId);

        expect(job?.status).toMatch(/pending|running/);
      });
    });

    describe('getJob', () => {
      it('should return job by ID', async () => {
        const mockProc = createMockProcess('output', '', 0);
        mockSpawn.mockReturnValue(mockProc);

        const jobId = await manager.submit('task', ['execute']);
        const job = manager.getJob(jobId);

        expect(job).toBeDefined();
        expect(job?.id).toBe(jobId);
      });

      it('should return undefined for unknown job', () => {
        const job = manager.getJob('unknown-job');
        expect(job).toBeUndefined();
      });
    });

    describe('cancel', () => {
      it('should cancel running job', async () => {
        const mockProc = new EventEmitter() as ChildProcess & {
          stdout: EventEmitter;
          stderr: EventEmitter;
        };
        mockProc.stdout = new EventEmitter();
        mockProc.stderr = new EventEmitter();
        mockProc.kill = vi.fn().mockImplementation(() => {
          mockProc.emit('close', null);
        });
        mockSpawn.mockReturnValue(mockProc);

        const jobId = await manager.submit('task', ['execute']);

        // Wait for job to start
        vi.advanceTimersByTime(10);

        const cancelled = manager.cancel(jobId);

        expect(cancelled).toBe(true);
        expect(mockProc.kill).toHaveBeenCalledWith('SIGTERM');
      });

      it('should return false for unknown job', () => {
        const cancelled = manager.cancel('unknown-job');
        expect(cancelled).toBe(false);
      });

      it('should return false for completed job', async () => {
        const mockProc = createMockProcess('output', '', 0);
        mockSpawn.mockReturnValue(mockProc);

        const jobId = await manager.submit('task', ['execute']);

        // Wait for completion
        vi.advanceTimersByTime(20);

        const cancelled = manager.cancel(jobId);
        expect(cancelled).toBe(false);
      });
    });

    describe('concurrent execution limits', () => {
      it('should limit concurrent executions', async () => {
        const procs: (ChildProcess & { stdout: EventEmitter; stderr: EventEmitter })[] = [];

        // Create mock processes that don't complete immediately
        for (let i = 0; i < 10; i++) {
          const mockProc = new EventEmitter() as ChildProcess & {
            stdout: EventEmitter;
            stderr: EventEmitter;
          };
          mockProc.stdout = new EventEmitter();
          mockProc.stderr = new EventEmitter();
          procs.push(mockProc);
        }

        let procIndex = 0;
        mockSpawn.mockImplementation(() => procs[procIndex++]);

        // Submit 10 jobs
        const jobIds: string[] = [];
        for (let i = 0; i < 10; i++) {
          jobIds.push(await manager.submit('task', ['execute']));
        }

        vi.advanceTimersByTime(10);

        // Only maxConcurrent (default 5) should be running
        const runningJobs = jobIds
          .map(id => manager.getJob(id))
          .filter(job => job?.status === 'running');

        expect(runningJobs.length).toBeLessThanOrEqual(5);
      });
    });

    describe('singleton instance', () => {
      it('should export a singleton', () => {
        expect(executionManager).toBeInstanceOf(ExecutionManager);
      });
    });
  });

  describe('Feedback Loop Integration', () => {
    it('should handle feedback request from agent', async () => {
      // This tests the conceptual flow:
      // 1. Agent executes task
      // 2. Agent needs feedback -> emits event
      // 3. System pauses execution
      // 4. User provides answer
      // 5. System resumes execution

      // Mock initial task execution
      const taskProc = createMockProcess(
        JSON.stringify({ status: 'needs_feedback', questions: ['What color?'] }),
        '',
        0
      );
      mockSpawn.mockReturnValueOnce(taskProc);

      const manager = new ExecutionManager();
      const jobId = await manager.submit('task', ['execute'], {
        ticketId: 'ticket-123',
        projectId: 'project-456'
      });

      vi.advanceTimersByTime(20);

      const job = manager.getJob(jobId);
      expect(job).toBeDefined();
    });

    it('should resume execution after feedback provided', async () => {
      // Mock resume command
      const resumeProc = createMockProcess(
        JSON.stringify({ status: 'completed', result: 'success' }),
        '',
        0
      );
      mockSpawn.mockReturnValue(resumeProc);

      const cli = new ClaudeFlowCLI();
      const resultPromise = cli.executeJson('task', ['resume', '--ticket', 'ticket-123', '--answer', 'blue']);

      vi.advanceTimersByTime(20);
      const result = await resultPromise;

      expect(result.status).toBe('completed');
    });
  });
});
