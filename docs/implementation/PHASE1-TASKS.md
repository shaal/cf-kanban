# Phase 1: Foundation - Implementation Tasks

## Overview

**Duration**: Weeks 1-4
**Goal**: Working Next.js app with basic Kanban board and ticket state machine

**Prerequisites**: Read `/docs/implementation/IMPLEMENTATION-PROMPT.md` first

---

## Task Tracking

Use this checklist to track progress. Mark `[x]` when complete.

---

## Sprint 1: Project Setup (Week 1)

### TASK-001: Initialize Next.js Project
**Priority**: Critical
**Estimated**: 30 min

- [ ] Create Next.js 14 project with App Router
- [ ] Configure TypeScript strict mode
- [ ] Set up Tailwind CSS
- [ ] Configure path aliases (`@/`)

```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
```

**Acceptance Criteria**:
- `npm run dev` starts server at localhost:3000
- TypeScript compiles without errors
- Tailwind classes work in components

---

### TASK-002: Configure Testing Infrastructure
**Priority**: Critical
**Estimated**: 45 min

- [ ] Install Vitest and testing utilities
- [ ] Configure vitest.config.ts
- [ ] Set up test directory structure (from TDD-ARCHITECTURE.md)
- [ ] Create first passing test

```bash
npm install -D vitest @vitejs/plugin-react @testing-library/react @testing-library/jest-dom jsdom
```

**Test Structure** (from `/docs/testing/TDD-ARCHITECTURE.md`):
```
/tests
├── /unit
│   ├── /ticket
│   ├── /agent
│   └── /memory
├── /integration
└── /e2e
```

**Acceptance Criteria**:
- `npm test` runs without errors
- Sample test passes
- Coverage reporting works

---

### TASK-003: Set Up Prisma with PostgreSQL
**Priority**: Critical
**Estimated**: 1 hour

- [ ] Install Prisma
- [ ] Initialize Prisma with PostgreSQL
- [ ] Create initial schema (see TASK-004)
- [ ] Set up database (local Docker or hosted)

```bash
npm install prisma @prisma/client
npx prisma init --datasource-provider postgresql
```

**Docker for local PostgreSQL**:
```yaml
# docker-compose.yml
services:
  db:
    image: postgres:16
    environment:
      POSTGRES_USER: cfkanban
      POSTGRES_PASSWORD: cfkanban
      POSTGRES_DB: cfkanban
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
```

**Acceptance Criteria**:
- Prisma connects to PostgreSQL
- `npx prisma db push` works
- Prisma Studio opens with `npx prisma studio`

---

### TASK-004: Define Core Data Models
**Priority**: Critical
**Estimated**: 1.5 hours

Reference: `/docs/sparc/SPECIFICATION.md` - Data Models section

- [ ] Define Project model
- [ ] Define Ticket model with all states
- [ ] Define TicketHistory for state transitions
- [ ] Define Agent model (for future use)
- [ ] Define Pattern model (for future use)
- [ ] Create TypeScript types matching Prisma models

**Prisma Schema**:
```prisma
// prisma/schema.prisma

model Project {
  id          String   @id @default(cuid())
  name        String
  description String?
  settings    Json     @default("{}")
  tickets     Ticket[]
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model Ticket {
  id          String         @id @default(cuid())
  title       String
  description String?
  status      TicketStatus   @default(BACKLOG)
  priority    Priority       @default(MEDIUM)
  labels      String[]
  complexity  Int?
  position    Int            @default(0)

  projectId   String
  project     Project        @relation(fields: [projectId], references: [id])

  history     TicketHistory[]

  createdAt   DateTime       @default(now())
  updatedAt   DateTime       @updatedAt
}

model TicketHistory {
  id         String       @id @default(cuid())
  ticketId   String
  ticket     Ticket       @relation(fields: [ticketId], references: [id])
  fromStatus TicketStatus
  toStatus   TicketStatus
  reason     String?
  triggeredBy String      @default("system") // "user" | "agent" | "system"
  createdAt  DateTime     @default(now())
}

enum TicketStatus {
  BACKLOG
  TODO
  IN_PROGRESS
  NEEDS_FEEDBACK
  READY_TO_RESUME
  REVIEW
  DONE
  CANCELLED
}

enum Priority {
  LOW
  MEDIUM
  HIGH
  CRITICAL
}
```

**Acceptance Criteria**:
- All models defined in schema
- `npx prisma generate` succeeds
- TypeScript types exported from `@/types`

---

### TASK-005: Create Prisma Client Singleton
**Priority**: High
**Estimated**: 20 min

- [ ] Create `/src/lib/db/prisma.ts`
- [ ] Implement singleton pattern for dev/prod
- [ ] Export typed client

```typescript
// src/lib/db/prisma.ts
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

**Acceptance Criteria**:
- Prisma client importable from `@/lib/db/prisma`
- No multiple client warnings in dev mode

---

## Sprint 2: Ticket State Machine (Week 2)

### TASK-006: Define State Machine Types
**Priority**: Critical
**Estimated**: 30 min

- [ ] Create `/src/lib/state-machine/types.ts`
- [ ] Define all states and transitions
- [ ] Define transition validation rules

```typescript
// src/lib/state-machine/types.ts

export const TICKET_STATES = [
  'BACKLOG',
  'TODO',
  'IN_PROGRESS',
  'NEEDS_FEEDBACK',
  'READY_TO_RESUME',
  'REVIEW',
  'DONE',
  'CANCELLED'
] as const;

export type TicketState = typeof TICKET_STATES[number];

export const VALID_TRANSITIONS: Record<TicketState, TicketState[]> = {
  BACKLOG: ['TODO', 'CANCELLED'],
  TODO: ['IN_PROGRESS', 'BACKLOG', 'CANCELLED'],
  IN_PROGRESS: ['NEEDS_FEEDBACK', 'REVIEW', 'TODO', 'CANCELLED'],
  NEEDS_FEEDBACK: ['READY_TO_RESUME', 'CANCELLED'],
  READY_TO_RESUME: ['IN_PROGRESS'],
  REVIEW: ['DONE', 'IN_PROGRESS', 'CANCELLED'],
  DONE: [], // Terminal state
  CANCELLED: ['BACKLOG'] // Can be reopened
};
```

**Acceptance Criteria**:
- Types exported and usable
- All 8 states defined
- Transition rules match PRD swim-lane design

---

### TASK-007: Write State Machine Tests (TDD - RED Phase)
**Priority**: Critical
**Estimated**: 1 hour

Reference: `/docs/testing/TDD-ARCHITECTURE.md` - Unit Test Categories

- [ ] Create `/tests/unit/ticket/ticket-transitions.test.ts`
- [ ] Write tests for ALL valid transitions
- [ ] Write tests for invalid transition rejections
- [ ] Write tests for transition side effects (history recording)

**Test Cases Required**:
```typescript
describe('TicketStateMachine', () => {
  describe('valid transitions', () => {
    it('should transition BACKLOG → TODO')
    it('should transition TODO → IN_PROGRESS')
    it('should transition IN_PROGRESS → NEEDS_FEEDBACK')
    it('should transition NEEDS_FEEDBACK → READY_TO_RESUME')
    it('should transition READY_TO_RESUME → IN_PROGRESS')
    it('should transition IN_PROGRESS → REVIEW')
    it('should transition REVIEW → DONE')
    it('should transition REVIEW → IN_PROGRESS (rejection)')
  })

  describe('invalid transitions', () => {
    it('should reject BACKLOG → DONE (skip states)')
    it('should reject DONE → any state (terminal)')
    it('should reject IN_PROGRESS without agent (future)')
  })

  describe('side effects', () => {
    it('should record transition in history')
    it('should include timestamp')
    it('should include triggeredBy')
  })
})
```

**Acceptance Criteria**:
- All tests written
- Tests currently FAIL (no implementation yet)
- Test coverage goal: 100% for state machine

---

### TASK-008: Implement State Machine (TDD - GREEN Phase)
**Priority**: Critical
**Estimated**: 1.5 hours

- [ ] Create `/src/lib/state-machine/ticket-state-machine.ts`
- [ ] Implement `canTransition(from, to)` function
- [ ] Implement `transition(ticket, newState, metadata)` function
- [ ] Integrate with Prisma for persistence

```typescript
// src/lib/state-machine/ticket-state-machine.ts

export class TicketStateMachine {
  canTransition(from: TicketState, to: TicketState): boolean {
    return VALID_TRANSITIONS[from].includes(to);
  }

  async transition(
    ticketId: string,
    newState: TicketState,
    metadata: { triggeredBy: string; reason?: string }
  ): Promise<Ticket> {
    // Implementation
  }
}
```

**Acceptance Criteria**:
- All tests from TASK-007 pass
- State machine handles edge cases
- History recorded for every transition

---

### TASK-009: Add State Machine API Endpoint
**Priority**: High
**Estimated**: 45 min

- [ ] Create `/src/app/api/tickets/[id]/transition/route.ts`
- [ ] Implement POST handler for state transitions
- [ ] Add validation and error handling
- [ ] Write integration test

**API Contract**:
```typescript
// POST /api/tickets/:id/transition
// Request:
{
  "toState": "IN_PROGRESS",
  "triggeredBy": "user",
  "reason": "Starting work"
}

// Response (200):
{
  "ticket": { /* updated ticket */ },
  "transition": { /* history entry */ }
}

// Response (400):
{
  "error": "Invalid transition from BACKLOG to DONE"
}
```

**Acceptance Criteria**:
- Endpoint works via REST
- Invalid transitions return 400
- Successful transitions return updated ticket

---

## Sprint 3: Basic Kanban UI (Week 3)

### TASK-010: Install UI Dependencies
**Priority**: High
**Estimated**: 20 min

- [ ] Install Radix UI primitives
- [ ] Install dnd-kit for drag and drop
- [ ] Install lucide-react for icons
- [ ] Configure component aliases

```bash
npm install @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-slot
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
npm install lucide-react
npm install class-variance-authority clsx tailwind-merge
```

**Acceptance Criteria**:
- All packages installed
- No dependency conflicts

---

### TASK-011: Create Base UI Components
**Priority**: High
**Estimated**: 1 hour

Reference: `/docs/ux/AI-KANBAN-UX-VISION-2045.md` - Design Tokens

- [ ] Create `/src/components/ui/button.tsx`
- [ ] Create `/src/components/ui/card.tsx`
- [ ] Create `/src/components/ui/badge.tsx`
- [ ] Create `/src/components/ui/input.tsx`
- [ ] Set up design tokens in Tailwind config

**Acceptance Criteria**:
- Components styled with Tailwind
- Components are accessible (keyboard nav, ARIA)
- Consistent design token usage

---

### TASK-012: Create KanbanColumn Component
**Priority**: Critical
**Estimated**: 1 hour

- [ ] Create `/src/components/kanban/KanbanColumn.tsx`
- [ ] Implement droppable area with dnd-kit
- [ ] Display column header with ticket count
- [ ] Style for different states (color-coded)

```typescript
interface KanbanColumnProps {
  status: TicketStatus;
  tickets: Ticket[];
  onTicketDrop: (ticketId: string, newStatus: TicketStatus) => void;
}
```

**Acceptance Criteria**:
- Column renders with header and count
- Accepts dropped tickets
- Visual feedback on drag over

---

### TASK-013: Create KanbanCard Component
**Priority**: Critical
**Estimated**: 1.5 hours

Reference: `/docs/ux/AI-KANBAN-UX-VISION-2045.md` - KanbanCard specification

- [ ] Create `/src/components/kanban/KanbanCard.tsx`
- [ ] Implement draggable card with dnd-kit
- [ ] Display title, priority badge, labels
- [ ] Add visual states (normal, dragging, disabled)

```typescript
interface KanbanCardProps {
  ticket: Ticket;
  isDragging?: boolean;
  onClick?: () => void;
}
```

**Acceptance Criteria**:
- Card is draggable
- Shows ticket info clearly
- Visual feedback while dragging

---

### TASK-014: Create KanbanBoard Component
**Priority**: Critical
**Estimated**: 1 hour

- [ ] Create `/src/components/kanban/KanbanBoard.tsx`
- [ ] Compose columns for all visible states
- [ ] Implement drag-and-drop context
- [ ] Handle drop events (call transition API)

```typescript
interface KanbanBoardProps {
  projectId: string;
  tickets: Ticket[];
  onTicketMove: (ticketId: string, newStatus: TicketStatus) => Promise<void>;
}
```

**States to Display as Columns**:
- BACKLOG
- TODO
- IN_PROGRESS (shows "In Work" label)
- NEEDS_FEEDBACK
- REVIEW
- DONE

**Acceptance Criteria**:
- All columns render
- Drag and drop works between columns
- Invalid drops are prevented or show error

---

### TASK-015: Create Main Kanban Page
**Priority**: High
**Estimated**: 45 min

- [ ] Create `/src/app/projects/[projectId]/page.tsx`
- [ ] Fetch project and tickets
- [ ] Render KanbanBoard
- [ ] Handle loading and error states

**Acceptance Criteria**:
- Page loads project data
- Kanban board renders with tickets
- URL-based project selection works

---

## Sprint 4: API & Polish (Week 4)

### TASK-016: Create Project CRUD API
**Priority**: High
**Estimated**: 1 hour

- [ ] Create `/src/app/api/projects/route.ts` (GET, POST)
- [ ] Create `/src/app/api/projects/[id]/route.ts` (GET, PUT, DELETE)
- [ ] Add input validation
- [ ] Write integration tests

**Acceptance Criteria**:
- All CRUD operations work
- Validation errors return 400
- Tests pass

---

### TASK-017: Create Ticket CRUD API
**Priority**: High
**Estimated**: 1 hour

- [ ] Create `/src/app/api/projects/[projectId]/tickets/route.ts`
- [ ] Create `/src/app/api/tickets/[id]/route.ts`
- [ ] Add input validation
- [ ] Write integration tests

**Acceptance Criteria**:
- All CRUD operations work
- Tickets scoped to projects
- Tests pass

---

### TASK-018: Add Ticket Creation Modal
**Priority**: High
**Estimated**: 1 hour

- [ ] Create `/src/components/kanban/CreateTicketModal.tsx`
- [ ] Form with title, description, priority, labels
- [ ] Integrate with API
- [ ] Add to Kanban page

**Acceptance Criteria**:
- Modal opens/closes properly
- Form validates input
- New ticket appears in BACKLOG column

---

### TASK-019: Add Project Selector/Dashboard
**Priority**: Medium
**Estimated**: 1 hour

- [ ] Create `/src/app/page.tsx` as dashboard
- [ ] List all projects
- [ ] Create new project button
- [ ] Navigate to project Kanban

**Acceptance Criteria**:
- Dashboard shows project list
- Can create new project
- Click navigates to Kanban

---

### TASK-020: Polish and Documentation
**Priority**: Medium
**Estimated**: 2 hours

- [ ] Add loading skeletons
- [ ] Add error boundaries
- [ ] Responsive design check
- [ ] Update README with setup instructions
- [ ] Store implementation patterns in memory

```bash
# Store what worked
npx @claude-flow/cli@latest memory store \
  --key "impl-phase1-complete" \
  --value "Phase 1 complete. Stack: Next.js 14, Prisma, dnd-kit. State machine pattern with history tracking. TDD approach worked well." \
  --namespace cf-kanban-impl
```

**Acceptance Criteria**:
- No console errors
- Works on mobile viewports
- README has clear setup steps

---

## Phase 1 Completion Checklist

Before moving to Phase 2, verify:

- [ ] All 20 tasks completed
- [ ] `npm test` passes with 80%+ coverage
- [ ] `npm run build` succeeds without errors
- [ ] App runs locally with `npm run dev`
- [ ] Can create project, add tickets, drag between columns
- [ ] State transitions follow swim-lane rules
- [ ] Implementation patterns stored in memory

---

## Next Phase Preview

**Phase 2: Real-time Layer (Weeks 5-8)**
- Socket.IO integration
- Live ticket updates across clients
- Redis for pub/sub
- Optimistic UI updates

Start Phase 2 by reading `/docs/PRD-AI-KANBAN-2045.md` - Part 4: System Architecture, WebSocket section.
