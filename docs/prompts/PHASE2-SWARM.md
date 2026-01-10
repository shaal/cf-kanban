# Phase 2 Swarm Implementation Prompt

Copy and paste this prompt to start **parallel swarm implementation** of CF-Kanban Phase 2.

---

## The Prompt

```
Implement Phase 2 of CF-Kanban using swarm orchestration.

Read /docs/implementation/IMPLEMENTATION-PROMPT.md and /docs/implementation/PHASE2-TASKS.md.

## Execution Strategy

Spawn a swarm with these agents working in parallel:
- **WebSocket Agent**: TASK-021 to TASK-025 (Socket.IO server, events, rooms)
- **Redis Agent**: TASK-026 to TASK-029 (Redis setup, pub/sub, caching)
- **Client Agent**: TASK-030 to TASK-033 (Socket.IO client, stores, reconnection)
- **Integration Agent**: TASK-034 to TASK-037 (real-time updates, optimistic UI)
- **Testing Agent**: TASK-038 to TASK-040 (WebSocket tests, load testing)

## Git Workflow (IMPORTANT)

After each agent completes its task group:
1. Stage all changes: `git add -A`
2. Create a commit for each completed task:
   ```bash
   git commit -m "feat(phase2): TASK-XXX - [description]"
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
- `feat(phase2): TASK-XXX - Add new feature`
- `test(phase2): TASK-XXX - Add unit tests`
- `fix(phase2): TASK-XXX - Fix bug`
- `refactor(phase2): TASK-XXX - Refactor code`
- `chore(phase2): TASK-XXX - Update config`

Follow TDD. Run all agents in background. Synthesize results, commit each task separately, and push after each sprint.

Start now.
```

---

## When to Use

- Phase 1 is complete and tested
- You want real-time WebSocket updates
- Redis is available (Docker or hosted)

## How It Works

```
┌─────────────────────────────────────────────────────────────────┐
│                     PHASE 2 SWARM ORCHESTRATION                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│  │WebSocket │  │  Redis   │  │  Client  │  │Integration│       │
│  │  Agent   │  │  Agent   │  │  Agent   │  │  Agent   │        │
│  │          │  │          │  │          │  │          │        │
│  │ TASK-021 │  │ TASK-026 │  │ TASK-030 │  │ TASK-034 │        │
│  │ TASK-022 │  │ TASK-027 │  │ TASK-031 │  │ TASK-035 │        │
│  │ TASK-023 │  │ TASK-028 │  │ TASK-032 │  │ TASK-036 │        │
│  │ TASK-024 │  │ TASK-029 │  │ TASK-033 │  │ TASK-037 │        │
│  │ TASK-025 │  │          │  │          │  │          │        │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘        │
│       │             │             │             │               │
│       │         git commit + push after each agent              │
│       │             │             │             │               │
│       └─────────────┴─────────────┴─────────────┘               │
│                           │                                     │
│                    ┌──────┴──────┐                              │
│                    │   Testing   │                              │
│                    │    Agent    │                              │
│                    │  TASK-038   │                              │
│                    │  TASK-039   │                              │
│                    │  TASK-040   │                              │
│                    └──────┬──────┘                              │
│                           │                                     │
│                    git push origin main                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Expected Git History

```
* feat(phase2): TASK-040 - Add load testing for WebSocket connections
* test(phase2): TASK-039 - Add integration tests for real-time updates
* test(phase2): TASK-038 - Add WebSocket event tests
   ← Push 5
* feat(phase2): TASK-037 - Implement optimistic UI updates
* feat(phase2): TASK-036 - Add real-time ticket position sync
* feat(phase2): TASK-035 - Implement live ticket status updates
* feat(phase2): TASK-034 - Connect Kanban board to WebSocket
   ← Push 4
* feat(phase2): TASK-033 - Implement reconnection with exponential backoff
* feat(phase2): TASK-032 - Create real-time Svelte stores
* feat(phase2): TASK-031 - Add Socket.IO event handlers (client)
* feat(phase2): TASK-030 - Set up Socket.IO client in SvelteKit
   ← Push 3
* feat(phase2): TASK-029 - Implement Redis caching layer
* feat(phase2): TASK-028 - Add Redis pub/sub for events
* feat(phase2): TASK-027 - Create Redis connection singleton
* feat(phase2): TASK-026 - Set up Redis with Docker
   ← Push 2
* feat(phase2): TASK-025 - Add authentication to WebSocket
* feat(phase2): TASK-024 - Create room management for projects
* feat(phase2): TASK-023 - Define WebSocket event types
* feat(phase2): TASK-022 - Add Socket.IO event handlers (server)
* feat(phase2): TASK-021 - Set up Socket.IO server in SvelteKit
   ← Push 1
```

## Agent Dependencies

| Agent | Can Start | Depends On |
|-------|-----------|------------|
| WebSocket Agent | Immediately | Phase 1 complete |
| Redis Agent | Immediately | Docker available |
| Client Agent | After TASK-023 | Event types defined |
| Integration Agent | After TASK-030 | Client setup complete |
| Testing Agent | After all others | Full implementation |

## Prerequisites

Before running this prompt:
1. Phase 1 must be complete (`npm test` passes)
2. Redis available (add to docker-compose.yml)
3. Docker running: `docker compose up -d`
4. Database synced: `npx prisma db push`

## Expected Duration

With parallel execution:
- **WebSocket + Redis + Client + Integration**: ~3 hours (parallel)
- **Testing**: ~1 hour (sequential, after others)

**Total: ~4 hours** (vs ~8 hours sequential)

## Success Criteria

- [ ] WebSocket server running alongside SvelteKit
- [ ] Redis connected and caching active
- [ ] Real-time ticket updates across browser tabs
- [ ] Optimistic UI with rollback on failure
- [ ] <100ms latency for real-time updates
- [ ] Reconnection with exponential backoff
- [ ] All tests passing
