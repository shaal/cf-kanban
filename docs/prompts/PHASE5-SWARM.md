# Phase 5 Swarm Implementation Prompt

Copy and paste this prompt to start **parallel swarm implementation** of CF-Kanban Phase 5.

**Focus**: Polish & Scale - Performance optimization, admin panel, and production deployment.

---

## The Prompt

```
Implement Phase 5 of CF-Kanban using swarm orchestration.

Read /docs/implementation/IMPLEMENTATION-PROMPT.md and /docs/implementation/PHASE5-TASKS.md.

## Execution Strategy

Spawn a swarm with these agents working in parallel:
- **Performance Agent**: TASK-091 to TASK-095 (optimization, caching, lazy loading)
- **Auth Agent**: TASK-096 to TASK-099 (Clerk/Auth.js, RBAC, sessions)
- **Admin Agent**: TASK-100 to TASK-104 (admin panel, user management, settings)
- **Resource Agent**: TASK-105 to TASK-108 (resource allocation, limits, quotas)
- **Deploy Agent**: TASK-109 to TASK-113 (Docker, CI/CD, production config)
- **QA Agent**: TASK-114 to TASK-118 (E2E tests, load tests, security audit)

## Git Workflow (IMPORTANT)

After each agent completes its task group:
1. Stage all changes: `git add -A`
2. Create a commit for each completed task:
   ```bash
   git commit -m "feat(phase5): TASK-XXX - [description]"
   ```
3. Push after each agent completes its batch

Follow TDD. Run all agents in background. Synthesize results and push after each sprint.

Start now.
```

---

## When to Use

- Phase 4 is complete (visualizations working)
- You're ready for production deployment
- Authentication and admin features needed

## How It Works

```
┌─────────────────────────────────────────────────────────────────┐
│                     PHASE 5 SWARM ORCHESTRATION                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐                   │
│  │Performance│  │   Auth    │  │   Admin   │                   │
│  │   Agent   │  │   Agent   │  │   Agent   │                   │
│  │           │  │           │  │           │                   │
│  │ TASK-091  │  │ TASK-096  │  │ TASK-100  │                   │
│  │ TASK-092  │  │ TASK-097  │  │ TASK-101  │                   │
│  │ TASK-093  │  │ TASK-098  │  │ TASK-102  │                   │
│  │ TASK-094  │  │ TASK-099  │  │ TASK-103  │                   │
│  │ TASK-095  │  │           │  │ TASK-104  │                   │
│  └─────┬─────┘  └─────┬─────┘  └─────┬─────┘                   │
│        │              │              │                          │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐                   │
│  │ Resource  │  │  Deploy   │  │    QA     │                   │
│  │   Agent   │  │   Agent   │  │   Agent   │                   │
│  │           │  │           │  │           │                   │
│  │ TASK-105  │  │ TASK-109  │  │ TASK-114  │                   │
│  │ TASK-106  │  │ TASK-110  │  │ TASK-115  │                   │
│  │ TASK-107  │  │ TASK-111  │  │ TASK-116  │                   │
│  │ TASK-108  │  │ TASK-112  │  │ TASK-117  │                   │
│  │           │  │ TASK-113  │  │ TASK-118  │                   │
│  └───────────┘  └───────────┘  └───────────┘                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Performance Targets

| Metric | Target |
|--------|--------|
| Page Load (TTI) | <2s |
| Real-time Latency | <100ms |
| API Response (P95) | <200ms |
| WebSocket Reconnect | <5s |
| Memory (per project) | <500MB |
| Concurrent Users | 100+ |

## Authentication Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    AUTHENTICATION FLOW                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌──────────┐     ┌──────────┐     ┌──────────┐              │
│   │  Login   │────▶│  Clerk/  │────▶│ Session  │              │
│   │   Page   │     │  Auth.js │     │ Created  │              │
│   └──────────┘     └──────────┘     └──────────┘              │
│                                            │                    │
│                                            ▼                    │
│   ┌──────────────────────────────────────────────────────┐     │
│   │                    RBAC CHECK                         │     │
│   │                                                       │     │
│   │   Owner: Full access to project                       │     │
│   │   Admin: Manage users, view all tickets               │     │
│   │   Member: Create/edit own tickets                     │     │
│   │   Viewer: Read-only access                            │     │
│   └──────────────────────────────────────────────────────┘     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Admin Panel Features

```
┌─────────────────────────────────────────────────────────────────┐
│                      ADMIN PANEL                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│   │    Users    │  │  Projects   │  │   System    │            │
│   │             │  │             │  │             │            │
│   │ • List      │  │ • Overview  │  │ • Health    │            │
│   │ • Invite    │  │ • Resource  │  │ • Logs      │            │
│   │ • Roles     │  │   Usage     │  │ • Config    │            │
│   │ • Activity  │  │ • Limits    │  │ • Backup    │            │
│   └─────────────┘  └─────────────┘  └─────────────┘            │
│                                                                 │
│   ┌─────────────────────────────────────────────────────┐      │
│   │                 RESOURCE DASHBOARD                   │      │
│   │                                                       │      │
│   │   CPU Usage:      ████████░░░░ 65%                   │      │
│   │   Memory:         ██████░░░░░░ 48%                   │      │
│   │   Active Agents:  23 / 50                            │      │
│   │   Active Swarms:  8 / 15                             │      │
│   │   WebSocket:      142 connections                    │      │
│   └─────────────────────────────────────────────────────┘      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Deployment Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                  PRODUCTION ARCHITECTURE                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌──────────────────────────────────────────────┐             │
│   │                 CLOUDFLARE                    │             │
│   │              (CDN + DDoS + WAF)               │             │
│   └────────────────────┬─────────────────────────┘             │
│                        │                                        │
│   ┌────────────────────┼─────────────────────────┐             │
│   │                    ▼                          │             │
│   │   ┌─────────────────────────────────────┐    │             │
│   │   │     VERCEL / CLOUDFLARE PAGES       │    │             │
│   │   │         (SvelteKit SSR)             │    │             │
│   │   └─────────────────────────────────────┘    │             │
│   │                    │                          │             │
│   │   ┌────────────────┼────────────────┐        │             │
│   │   │                ▼                │        │             │
│   │   │   ┌─────────────────────────┐  │        │  RAILWAY /  │
│   │   │   │   SOCKET.IO SERVER      │  │        │  FLY.IO     │
│   │   │   │   (Node.js + Express)   │  │        │             │
│   │   │   └─────────────────────────┘  │        │             │
│   │   │                │                │        │             │
│   │   │   ┌────────────┴───────────┐   │        │             │
│   │   │   ▼                        ▼   │        │             │
│   │   │ ┌──────────┐         ┌───────┐│        │             │
│   │   │ │PostgreSQL│         │ Redis ││        │             │
│   │   │ │(Managed) │         │(Cache)││        │             │
│   │   │ └──────────┘         └───────┘│        │             │
│   │   └─────────────────────────────────        │             │
│   └─────────────────────────────────────────────┘             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Agent Dependencies

| Agent | Can Start | Depends On |
|-------|-----------|------------|
| Performance Agent | Immediately | None |
| Auth Agent | Immediately | None |
| Admin Agent | After TASK-099 | Auth complete |
| Resource Agent | After TASK-091 | Performance basics |
| Deploy Agent | After TASK-095 | Performance complete |
| QA Agent | After all others | Full implementation |

## Prerequisites

Before running this prompt:
1. Phase 4 complete (visualizations)
2. Clerk or Auth.js account configured
3. Cloud provider accounts (Vercel, Railway)
4. Domain name configured

## Expected Duration

With parallel execution:
- **Performance + Auth**: ~3 hours (parallel)
- **Admin + Resource**: ~4 hours (parallel)
- **Deploy**: ~3 hours
- **QA**: ~3 hours

**Total: ~8 hours** (vs ~20 hours sequential)

## Success Criteria

- [ ] Page load <2s
- [ ] Authentication working with RBAC
- [ ] Admin panel functional
- [ ] Resource limits enforced
- [ ] Production deployment on cloud
- [ ] CI/CD pipeline configured
- [ ] Load tests passing (100+ concurrent)
- [ ] Security audit complete
- [ ] Monitoring and alerting active
- [ ] Documentation complete

---

## Final Checklist

After Phase 5, the complete CF-Kanban system should have:

### Core Features
- [x] Kanban board with drag-and-drop
- [x] Ticket state machine (8 states)
- [x] Real-time WebSocket updates
- [x] Claude Flow integration
- [x] Swim-lane feedback loop
- [x] Learning visualizations
- [x] Authentication and RBAC
- [x] Admin panel

### Technical Requirements
- [x] SvelteKit SSR
- [x] PostgreSQL + Prisma
- [x] Redis caching
- [x] Socket.IO real-time
- [x] D3.js visualizations
- [x] 80%+ test coverage
- [x] <2s page load
- [x] <100ms real-time latency

### Deployment
- [x] Docker containerization
- [x] CI/CD with GitHub Actions
- [x] Cloud deployment
- [x] Monitoring + logging
- [x] Backup strategy

---

## Store Final Pattern

```bash
npx @claude-flow/cli@latest memory store \
  --key "impl-phase5-complete" \
  --value "CF-Kanban complete. Full AI Kanban with Claude Flow. Stack: SvelteKit, Prisma, Redis, Socket.IO, D3.js. Key innovation: swim-lane feedback loop. Production-ready with auth, admin, monitoring." \
  --namespace cf-kanban-impl
```
