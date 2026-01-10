# CF-KANBAN: AI-Orchestrated Kanban System - Implementation Session

## Quick Start

**Read this file, then execute the tasks in `PHASE1-TASKS.md`**

```bash
# First, retrieve stored patterns from PRD research
npx @claude-flow/cli@latest memory search --query "kanban prd" --namespace kanban-prd-research
```

---

## Context

A PRD research swarm has already completed comprehensive planning for a futuristic AI Kanban system. All research and specifications are ready:

| Document | Path | Contents |
|----------|------|----------|
| **Main PRD** | `/docs/PRD-AI-KANBAN-2045.md` | Full product requirements, vision |
| **SPARC Spec** | `/docs/sparc/SPECIFICATION.md` | User stories, APIs, data models |
| **TDD Architecture** | `/docs/testing/TDD-ARCHITECTURE.md` | 100+ test cases, test structure |
| **UX Vision** | `/docs/ux/AI-KANBAN-UX-VISION-2045.md` | Components, design tokens |
| **Phase 1 Tasks** | `/docs/implementation/PHASE1-TASKS.md` | Detailed implementation tickets |

---

## Core Concept

A web-based Kanban where users create tickets and Claude Code executes them autonomously.

**The Key Insight**: Users NEVER touch the terminal - the Kanban IS the entire interface.

### Swim-Lane State Machine

```
┌────────────┬────────────┬───────────────┬──────────────┬──────────┬─────────┐
│  BACKLOG   │   TO_DO    │   IN_WORK     │   NEEDS      │  READY   │  DONE   │
│   (User)   │   (User)   │   (Claude)    │  FEEDBACK    │   TO     │(Claude) │
│            │            │               │   (User)     │ RESUME   │         │
│            │            │               │              │  (User)  │         │
└────────────┴────────────┴───────────────┴──────────────┴──────────┴─────────┘
     │            │              │               │             │          │
     │   User     │   Auto-      │   Claude      │   User      │  Claude  │
     │   drags    │   assigns    │   needs       │   answered  │  done    │
     │   ticket   │   agents     │   input       │   questions │          │
```

---

## Stored Patterns (From PRD Research)

The research swarm stored these patterns in Claude Flow memory:

| Key | Description |
|-----|-------------|
| `kanban-paradigm-shift` | Human-AI handoff vision |
| `prd-swim-lane-architecture` | State machine design |
| `prd-tech-stack-2045` | Full technology stack |
| `prd-agent-routing-matrix` | Complexity → topology mapping |
| `prd-feature-discovery-pattern` | Progressive disclosure + AI chat |

Retrieve with:
```bash
npx @claude-flow/cli@latest memory retrieve --key "prd-swim-lane-architecture" --namespace kanban-prd-research
```

---

## Technology Stack

### Frontend
- **Framework**: Next.js 14+ (App Router)
- **State**: Zustand + React Query
- **Real-time**: Socket.IO Client
- **UI**: Radix UI + Tailwind CSS
- **Drag & Drop**: dnd-kit
- **Visualizations**: D3.js (later phases)

### Backend
- **API**: Node.js + Express or Next.js API Routes
- **Database**: PostgreSQL + Prisma
- **Real-time**: Socket.IO v4
- **Cache**: Redis (later phases)
- **Auth**: Clerk or Auth.js

### Testing
- **Unit/Integration**: Vitest
- **E2E**: Playwright
- **Coverage Target**: 80%+

---

## Implementation Phases Overview

| Phase | Weeks | Focus |
|-------|-------|-------|
| **Phase 1** | 1-4 | Foundation (Next.js, Prisma, basic Kanban) |
| Phase 2 | 5-8 | Real-time (WebSocket, Redis) |
| Phase 3 | 9-12 | Claude Flow Integration |
| Phase 4 | 13-16 | Learning Visualization |
| Phase 5 | 17-20 | Polish & Scale |

**This session focuses on Phase 1.**

---

## Execution Strategy

### Option A: Swarm Approach (Recommended for Complex Work)

```bash
# 1. Initialize swarm
npx @claude-flow/cli@latest swarm init --topology hierarchical --max-agents 10

# 2. Spawn agents in parallel using Task tool:
# - Researcher: Read all docs, extract implementation requirements
# - Architect: Set up project structure, configure tools
# - Coder: Implement features following TDD
# - Tester: Write tests, ensure coverage
```

### Option B: Sequential Approach (For Focused Work)

Work through `PHASE1-TASKS.md` one ticket at a time:
1. Read the task requirements
2. Write failing test
3. Implement minimal code to pass
4. Refactor if needed
5. Mark task complete, move to next

---

## Success Criteria for Phase 1

- [ ] Next.js 14 project running at `localhost:3000`
- [ ] Prisma schema with Project, Ticket, Agent, Pattern models
- [ ] Ticket state machine with full test coverage
- [ ] Basic Kanban board with drag-drop between columns
- [ ] REST API for CRUD operations on projects/tickets
- [ ] Basic auth scaffolding (can be mocked initially)

---

## Important Guidelines

### TDD Is Required
```
RED    → Write failing test for behavior
GREEN  → Implement minimal code to pass
REFACTOR → Clean up while tests pass
```

### File Organization
```
/src
├── /app                 # Next.js App Router pages
├── /components          # React components
│   ├── /kanban          # Kanban-specific components
│   └── /ui              # Generic UI components
├── /lib                 # Utilities and helpers
│   ├── /db              # Prisma client
│   └── /state-machine   # Ticket state machine
├── /hooks               # Custom React hooks
└── /types               # TypeScript types

/tests
├── /unit                # Unit tests
├── /integration         # Integration tests
└── /e2e                 # End-to-end tests

/prisma
└── schema.prisma        # Database schema
```

### Store Learnings
After completing significant features:
```bash
npx @claude-flow/cli@latest memory store \
  --key "impl-[feature-name]" \
  --value "[what worked, patterns discovered]" \
  --namespace cf-kanban-impl
```

---

## Start Here

1. **Read** `/docs/PRD-AI-KANBAN-2045.md` (5 min overview)
2. **Read** `/docs/implementation/PHASE1-TASKS.md` (task list)
3. **Initialize** project or spawn swarm
4. **Execute** tasks in order
5. **Store** learnings after each major milestone

---

## Commands Reference

```bash
# Retrieve PRD patterns
npx @claude-flow/cli@latest memory search --query "kanban" --namespace kanban-prd-research

# Initialize swarm for parallel work
npx @claude-flow/cli@latest swarm init --topology hierarchical --max-agents 10

# Check swarm status
npx @claude-flow/cli@latest swarm status

# Store implementation pattern
npx @claude-flow/cli@latest memory store --key "impl-pattern" --value "description" --namespace cf-kanban-impl

# Run tests
npm test

# Start dev server
npm run dev
```

---

**Now proceed to `/docs/implementation/PHASE1-TASKS.md` for detailed tasks.**
