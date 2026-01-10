# Phase 3 Swarm Implementation Prompt

Copy and paste this prompt to start **parallel swarm implementation** of CF-Kanban Phase 3.

**This is the CORE PHASE** - implementing the Claude Flow integration and swim-lane feedback loop.

---

## The Prompt

```
Implement Phase 3 of CF-Kanban using swarm orchestration.

Read /docs/implementation/IMPLEMENTATION-PROMPT.md and /docs/implementation/PHASE3-TASKS.md.

## Execution Strategy

Spawn a swarm with these agents working in parallel:
- **CLI Wrapper Agent**: TASK-041 to TASK-045 (Claude Flow CLI integration)
- **Analysis Agent**: TASK-046 to TASK-049 (ticket analysis, complexity scoring)
- **Assignment Agent**: TASK-050 to TASK-053 (agent routing, swarm topology)
- **Feedback Agent**: TASK-054 to TASK-058 (swim-lane feedback loop - THE CORE FEATURE)
- **Progress Agent**: TASK-059 to TASK-062 (execution tracking, checkpoints)
- **Testing Agent**: TASK-063 to TASK-065 (integration tests, E2E tests)

## Git Workflow (IMPORTANT)

After each agent completes its task group:
1. Stage all changes: `git add -A`
2. Create a commit for each completed task:
   ```bash
   git commit -m "feat(phase3): TASK-XXX - [description]"
   ```
3. Push after each agent completes its batch:
   ```bash
   git push origin main
   ```

## Commit Message Format

Use conventional commits:
- `feat(phase3): TASK-XXX - Add new feature`
- `test(phase3): TASK-XXX - Add unit tests`
- `fix(phase3): TASK-XXX - Fix bug`

Follow TDD. Run all agents in background. Synthesize results and push after each sprint.

Start now.
```

---

## When to Use

- Phase 2 is complete (real-time WebSocket working)
- Claude Flow CLI is available (`npx @claude-flow/cli@latest --version`)
- You want the AI-powered ticket execution feature

## How It Works

```
┌─────────────────────────────────────────────────────────────────┐
│                     PHASE 3 SWARM ORCHESTRATION                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│  │   CLI    │  │ Analysis │  │Assignment│  │ Feedback │        │
│  │ Wrapper  │  │  Agent   │  │  Agent   │  │  Agent   │        │
│  │  Agent   │  │          │  │          │  │  (CORE)  │        │
│  │          │  │          │  │          │  │          │        │
│  │ TASK-041 │  │ TASK-046 │  │ TASK-050 │  │ TASK-054 │        │
│  │ TASK-042 │  │ TASK-047 │  │ TASK-051 │  │ TASK-055 │        │
│  │ TASK-043 │  │ TASK-048 │  │ TASK-052 │  │ TASK-056 │        │
│  │ TASK-044 │  │ TASK-049 │  │ TASK-053 │  │ TASK-057 │        │
│  │ TASK-045 │  │          │  │          │  │ TASK-058 │        │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘        │
│       │             │             │             │               │
│       └─────────────┴─────────────┴─────────────┘               │
│                           │                                     │
│            ┌──────────────┼──────────────┐                     │
│            ▼              ▼              ▼                     │
│  ┌──────────────┐  ┌──────────────┐                            │
│  │   Progress   │  │   Testing    │                            │
│  │    Agent     │  │    Agent     │                            │
│  │              │  │              │                            │
│  │  TASK-059    │  │  TASK-063    │                            │
│  │  TASK-060    │  │  TASK-064    │                            │
│  │  TASK-061    │  │  TASK-065    │                            │
│  │  TASK-062    │  │              │                            │
│  └──────┬───────┘  └──────┬───────┘                            │
│         │                 │                                     │
│         └─────────────────┘                                     │
│                  │                                              │
│           git push origin main                                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## The Core Innovation: Swim-Lane Feedback Loop

This phase implements the **fundamental differentiator** of CF-Kanban:

```
┌────────────┬────────────┬───────────────┬──────────────┬──────────┐
│  TO DO     │  IN WORK   │    NEEDS      │   READY TO   │   DONE   │
│  (User)    │  (Claude)  │   FEEDBACK    │    RESUME    │ (Claude) │
│            │            │    (User)     │    (User)    │          │
├────────────┼────────────┼───────────────┼──────────────┼──────────┤
│ User moves │ Claude     │ Claude hit    │ User moved   │ Complete │
│ ticket     │ works      │ a decision    │ ticket here  │ with     │
│ here       │ autonomously│ point        │ after        │ learning │
│            │            │               │ answering    │ artifacts│
└────────────┴────────────┴───────────────┴──────────────┴──────────┘
      │            │              │               │             │
      │            │              │               │             │
      ▼            ▼              ▼               ▼             ▼
  Swarm       Agent          Questions       Resume         Store
  spawns      executes       displayed       signal         patterns
```

## Expected Git History

```
* test(phase3): TASK-065 - Add E2E tests for full ticket lifecycle
* test(phase3): TASK-064 - Add integration tests for Claude Flow
* test(phase3): TASK-063 - Add unit tests for analysis and assignment
   ← Push 6
* feat(phase3): TASK-062 - Add checkpoint and restore system
* feat(phase3): TASK-061 - Implement execution timeline UI
* feat(phase3): TASK-060 - Add progress streaming to UI
* feat(phase3): TASK-059 - Create progress tracking service
   ← Push 5
* feat(phase3): TASK-058 - Implement "Ready to Resume" workflow
* feat(phase3): TASK-057 - Create question/answer UI on ticket cards
* feat(phase3): TASK-056 - Implement user response handling
* feat(phase3): TASK-055 - Create question persistence model
* feat(phase3): TASK-054 - Implement "Needs Feedback" transition
   ← Push 4
* feat(phase3): TASK-053 - Implement swarm initialization on ticket move
* feat(phase3): TASK-052 - Create topology selection algorithm
* feat(phase3): TASK-051 - Implement agent-task matching with patterns
* feat(phase3): TASK-050 - Create agent assignment service
   ← Push 3
* feat(phase3): TASK-049 - Implement dependency detection
* feat(phase3): TASK-048 - Add estimated completion time
* feat(phase3): TASK-047 - Implement complexity scoring algorithm
* feat(phase3): TASK-046 - Create ticket analysis service
   ← Push 2
* feat(phase3): TASK-045 - Add error handling and retries
* feat(phase3): TASK-044 - Implement async command execution
* feat(phase3): TASK-043 - Create swarm command wrappers
* feat(phase3): TASK-042 - Create agent command wrappers
* feat(phase3): TASK-041 - Create Claude Flow CLI service
   ← Push 1
```

## Agent Dependencies

| Agent | Can Start | Depends On |
|-------|-----------|------------|
| CLI Wrapper Agent | Immediately | Claude Flow CLI installed |
| Analysis Agent | Immediately | None |
| Assignment Agent | After TASK-046 | Analysis service |
| Feedback Agent | After TASK-041 | CLI wrapper |
| Progress Agent | After TASK-045 | CLI wrapper complete |
| Testing Agent | After all others | Full implementation |

## Prerequisites

Before running this prompt:
1. Phase 2 complete (WebSocket + Redis)
2. Claude Flow CLI available: `npx @claude-flow/cli@latest --version`
3. Docker running with PostgreSQL and Redis
4. Environment variables set

## Expected Duration

With parallel execution:
- **CLI + Analysis + Assignment + Feedback**: ~4 hours (parallel)
- **Progress Agent**: ~2 hours (can start mid-way)
- **Testing**: ~2 hours (sequential)

**Total: ~6 hours** (vs ~14 hours sequential)

## Success Criteria

- [ ] Claude Flow CLI commands execute from web app
- [ ] Ticket complexity scored automatically
- [ ] Agent assignment based on learned patterns
- [ ] Swarm spawns when ticket moves to "In Work"
- [ ] Questions appear on card when Claude needs input
- [ ] User answers persist and trigger "Ready to Resume"
- [ ] Execution progress visible in real-time
- [ ] All tests passing
