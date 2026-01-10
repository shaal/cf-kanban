# Phase 1 Swarm Implementation Prompt

Copy and paste this prompt to start **parallel swarm implementation** of CF-Kanban Phase 1.

---

## The Prompt

```
Implement Phase 1 of CF-Kanban using swarm orchestration.

Read /docs/implementation/IMPLEMENTATION-PROMPT.md and /docs/implementation/PHASE1-TASKS.md.

## Execution Strategy

Spawn a swarm with these agents working in parallel:
- **Setup Agent**: TASK-001 to TASK-005 (project, testing, Prisma, models)
- **State Machine Agent**: TASK-006 to TASK-009 (ticket state machine + tests)
- **UI Agent**: TASK-010 to TASK-014 (components, Kanban board)
- **API Agent**: TASK-015 to TASK-017 (routes, endpoints)
- **Polish Agent**: TASK-018 to TASK-020 (integration, a11y, final tests)

## Git Workflow (IMPORTANT)

After each agent completes its task group:
1. Stage all changes: `git add -A`
2. Create a commit for each completed task:
   ```bash
   git commit -m "feat(phase1): TASK-XXX - [description]"
   ```
3. Push after each agent completes its batch:
   ```bash
   git push origin main
   ```

When synthesizing agent results:
- Review all changes for conflicts
- Create individual commits per task (not one big commit)
- Push to origin after resolving any conflicts

## Commit Message Format

Use conventional commits:
- `feat(phase1): TASK-XXX - Add new feature`
- `test(phase1): TASK-XXX - Add unit tests`
- `fix(phase1): TASK-XXX - Fix bug`
- `refactor(phase1): TASK-XXX - Refactor code`
- `chore(phase1): TASK-XXX - Update config`

Follow TDD. Run all agents in background. Synthesize results, commit each task separately, and push after each sprint.

Start now.
```

---

## When to Use

- You want **maximum speed** through parallel execution
- Your machine has good CPU/memory for concurrent agents
- You're comfortable with Claude managing multiple work streams

## How It Works

```
┌─────────────────────────────────────────────────────────────────┐
│                     SWARM ORCHESTRATION                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│  │  Setup   │  │  State   │  │    UI    │  │   API    │        │
│  │  Agent   │  │ Machine  │  │  Agent   │  │  Agent   │        │
│  │          │  │  Agent   │  │          │  │          │        │
│  │ TASK-001 │  │ TASK-006 │  │ TASK-010 │  │ TASK-015 │        │
│  │ TASK-002 │  │ TASK-007 │  │ TASK-011 │  │ TASK-016 │        │
│  │ TASK-003 │  │ TASK-008 │  │ TASK-012 │  │ TASK-017 │        │
│  │ TASK-004 │  │ TASK-009 │  │ TASK-013 │  │          │        │
│  │ TASK-005 │  │          │  │ TASK-014 │  │          │        │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘        │
│       │             │             │             │               │
│       │         git commit + push after each agent              │
│       │             │             │             │               │
│       └─────────────┴─────────────┴─────────────┘               │
│                           │                                     │
│                    ┌──────┴──────┐                              │
│                    │   Polish    │                              │
│                    │   Agent     │                              │
│                    │  TASK-018   │                              │
│                    │  TASK-019   │                              │
│                    │  TASK-020   │                              │
│                    └──────┬──────┘                              │
│                           │                                     │
│                    git push origin main                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Expected Git History

```
* feat(phase1): TASK-020 - Final polish and documentation
* feat(phase1): TASK-019 - Add accessibility features
* feat(phase1): TASK-018 - Add integration tests
   ← Push 4
* feat(phase1): TASK-017 - Implement tickets API routes
* feat(phase1): TASK-016 - Implement projects API routes
* feat(phase1): TASK-015 - Create main Kanban page
   ← Push 3
* feat(phase1): TASK-014 - Add drag-and-drop functionality
* feat(phase1): TASK-013 - Create KanbanBoard component
* feat(phase1): TASK-012 - Create KanbanCard component
* feat(phase1): TASK-011 - Create KanbanColumn component
* feat(phase1): TASK-010 - Install UI dependencies
   ← Push 2
* feat(phase1): TASK-009 - Add state machine edge cases
* feat(phase1): TASK-008 - Implement ticket state machine
* test(phase1): TASK-007 - Write state machine unit tests
* feat(phase1): TASK-006 - Define ticket status enum and types
* feat(phase1): TASK-005 - Create Prisma client singleton
* feat(phase1): TASK-004 - Define core data models
* feat(phase1): TASK-003 - Set up Prisma with PostgreSQL
* feat(phase1): TASK-002 - Configure testing infrastructure
* feat(phase1): TASK-001 - Initialize SvelteKit project
   ← Push 1
```

## Agent Dependencies

| Agent | Can Start | Depends On |
|-------|-----------|------------|
| Setup Agent | Immediately | None |
| State Machine Agent | After TASK-004 | Prisma models |
| UI Agent | After TASK-002 | Testing setup |
| API Agent | After TASK-004 | Prisma models |
| Polish Agent | After all others | Full codebase |

## Prerequisites

Before running this prompt:
1. Ensure Docker is available (for PostgreSQL)
2. Have Node.js 20+ installed
3. Be in the `/home/shaal/code/utilities/cf-kanban` directory
4. Start Claude Flow daemon: `npx @claude-flow/cli@latest daemon start`
5. Ensure git remote is configured: `git remote -v`

## Expected Duration

With parallel execution:
- **Setup + State Machine + UI + API**: ~4 hours (parallel)
- **Polish**: ~2 hours (sequential, after others)

**Total: ~6 hours** (vs ~12 hours sequential)

## Tradeoffs

| Sequential (PHASE1-AUTONOMOUS.md) | Swarm (This file) |
|-----------------------------------|-------------------|
| Easier to debug | Faster overall |
| Clear linear progress | Multiple work streams |
| Lower resource usage | Higher CPU/memory |
| Better for learning | Better for shipping |
| Simple git history | May need conflict resolution |
