# Phase 1: Foundation - Implementation Tasks

## Overview

**Duration**: Weeks 1-4
**Goal**: Working SvelteKit app with basic Kanban board and ticket state machine

**Prerequisites**: Read `/docs/implementation/IMPLEMENTATION-PROMPT.md` first

---

## Task Tracking

Use this checklist to track progress. Mark `[x]` when complete.

---

## Sprint 1: Project Setup (Week 1)

### TASK-001: Initialize SvelteKit Project
**Priority**: Critical
**Estimated**: 30 min

- [ ] Create SvelteKit project with TypeScript
- [ ] Configure TypeScript strict mode
- [ ] Set up Tailwind CSS
- [ ] Configure path aliases in svelte.config.js

```bash
# Option 1: Using sv (recommended)
npx sv create . --template minimal --types ts

# Option 2: Using create-svelte
npm create svelte@latest .

# Add Tailwind CSS
npx svelte-add@latest tailwindcss
```

**Configure path aliases** in `svelte.config.js`:
```javascript
import adapter from '@sveltejs/adapter-auto';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter(),
    alias: {
      '$lib': './src/lib',
      '$lib/*': './src/lib/*',
      '$components': './src/lib/components',
      '$components/*': './src/lib/components/*'
    }
  }
};

export default config;
```

**Acceptance Criteria**:
- `npm run dev` starts server at localhost:5173
- TypeScript compiles without errors
- Tailwind classes work in components

---

### TASK-002: Configure Testing Infrastructure
**Priority**: Critical
**Estimated**: 45 min

- [ ] Install Vitest and testing utilities
- [ ] Configure vitest.config.ts
- [ ] Set up test directory structure (from TDD-ARCHITECTURE.md)
- [ ] Install Playwright for E2E testing
- [ ] Create first passing test

```bash
npm install -D vitest @testing-library/svelte @testing-library/jest-dom jsdom
npm install -D @sveltejs/vite-plugin-svelte
npm install -D @playwright/test
npx playwright install
```

**Vitest Configuration** (`vitest.config.ts`):
```typescript
import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  plugins: [svelte({ hot: !process.env.VITEST })],
  test: {
    include: ['tests/**/*.{test,spec}.{js,ts}'],
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts']
  }
});
```

**Test Setup** (`tests/setup.ts`):
```typescript
import '@testing-library/jest-dom';
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
- Playwright E2E tests run

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
- TypeScript types exported from `$lib/types`

---

### TASK-005: Create Prisma Client Singleton
**Priority**: High
**Estimated**: 20 min

- [ ] Create `/src/lib/server/prisma.ts`
- [ ] Implement singleton pattern for dev/prod
- [ ] Export typed client

```typescript
// src/lib/server/prisma.ts
import { PrismaClient } from '@prisma/client';
import { building } from '$app/environment';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (!building) {
  globalForPrisma.prisma = prisma;
}
```

**Acceptance Criteria**:
- Prisma client importable from `$lib/server/prisma`
- No multiple client warnings in dev mode
- Works correctly during build

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
import { describe, it, expect } from 'vitest';

describe('TicketStateMachine', () => {
  describe('valid transitions', () => {
    it('should transition BACKLOG → TODO');
    it('should transition TODO → IN_PROGRESS');
    it('should transition IN_PROGRESS → NEEDS_FEEDBACK');
    it('should transition NEEDS_FEEDBACK → READY_TO_RESUME');
    it('should transition READY_TO_RESUME → IN_PROGRESS');
    it('should transition IN_PROGRESS → REVIEW');
    it('should transition REVIEW → DONE');
    it('should transition REVIEW → IN_PROGRESS (rejection)');
  });

  describe('invalid transitions', () => {
    it('should reject BACKLOG → DONE (skip states)');
    it('should reject DONE → any state (terminal)');
    it('should reject IN_PROGRESS without agent (future)');
  });

  describe('side effects', () => {
    it('should record transition in history');
    it('should include timestamp');
    it('should include triggeredBy');
  });
});
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
import type { TicketState } from './types';
import { VALID_TRANSITIONS } from './types';
import type { Ticket } from '@prisma/client';

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

// Export as singleton for use in Svelte stores
export const ticketStateMachine = new TicketStateMachine();
```

**Acceptance Criteria**:
- All tests from TASK-007 pass
- State machine handles edge cases
- History recorded for every transition

---

### TASK-009: Add State Machine API Endpoint
**Priority**: High
**Estimated**: 45 min

- [ ] Create `/src/routes/api/tickets/[id]/transition/+server.ts`
- [ ] Implement POST handler for state transitions
- [ ] Add validation and error handling
- [ ] Write integration test

**SvelteKit API Route**:
```typescript
// src/routes/api/tickets/[id]/transition/+server.ts
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/prisma';
import { ticketStateMachine } from '$lib/state-machine/ticket-state-machine';

export const POST: RequestHandler = async ({ params, request }) => {
  const { id } = params;
  const body = await request.json();
  const { toState, triggeredBy, reason } = body;

  const ticket = await prisma.ticket.findUnique({ where: { id } });

  if (!ticket) {
    throw error(404, 'Ticket not found');
  }

  if (!ticketStateMachine.canTransition(ticket.status, toState)) {
    throw error(400, `Invalid transition from ${ticket.status} to ${toState}`);
  }

  const updatedTicket = await ticketStateMachine.transition(id, toState, {
    triggeredBy,
    reason
  });

  return json({
    ticket: updatedTicket,
    transition: { from: ticket.status, to: toState }
  });
};
```

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

- [ ] Install bits-ui for headless accessible components
- [ ] Install svelte-dnd-action for drag and drop
- [ ] Install lucide-svelte for icons
- [ ] Install utility libraries

```bash
npm install bits-ui
npm install svelte-dnd-action
npm install lucide-svelte
npm install clsx tailwind-merge
```

**Create utility function** (`src/lib/utils.ts`):
```typescript
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

**Acceptance Criteria**:
- All packages installed
- No dependency conflicts

---

### TASK-011: Create Base UI Components
**Priority**: High
**Estimated**: 1 hour

Reference: `/docs/ux/AI-KANBAN-UX-VISION-2045.md` - Design Tokens

- [ ] Create `/src/lib/components/ui/Button.svelte`
- [ ] Create `/src/lib/components/ui/Card.svelte`
- [ ] Create `/src/lib/components/ui/Badge.svelte`
- [ ] Create `/src/lib/components/ui/Input.svelte`
- [ ] Set up design tokens in Tailwind config

**Button Component Example**:
```svelte
<!-- src/lib/components/ui/Button.svelte -->
<script lang="ts">
  import { cn } from '$lib/utils';

  type Variant = 'default' | 'destructive' | 'outline' | 'ghost';
  type Size = 'default' | 'sm' | 'lg' | 'icon';

  export let variant: Variant = 'default';
  export let size: Size = 'default';
  export let disabled = false;

  const variants = {
    default: 'bg-primary text-primary-foreground hover:bg-primary/90',
    destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
    outline: 'border border-input bg-background hover:bg-accent',
    ghost: 'hover:bg-accent hover:text-accent-foreground'
  };

  const sizes = {
    default: 'h-10 px-4 py-2',
    sm: 'h-9 rounded-md px-3',
    lg: 'h-11 rounded-md px-8',
    icon: 'h-10 w-10'
  };
</script>

<button
  class={cn(
    'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
    'disabled:pointer-events-none disabled:opacity-50',
    variants[variant],
    sizes[size],
    $$props.class
  )}
  {disabled}
  on:click
  {...$$restProps}
>
  <slot />
</button>
```

**Acceptance Criteria**:
- Components styled with Tailwind
- Components are accessible (keyboard nav, ARIA)
- Consistent design token usage

---

### TASK-012: Create KanbanColumn Component
**Priority**: Critical
**Estimated**: 1 hour

- [ ] Create `/src/lib/components/kanban/KanbanColumn.svelte`
- [ ] Implement droppable area with svelte-dnd-action
- [ ] Display column header with ticket count
- [ ] Style for different states (color-coded)

```svelte
<!-- src/lib/components/kanban/KanbanColumn.svelte -->
<script lang="ts">
  import { dndzone, type DndEvent } from 'svelte-dnd-action';
  import { flip } from 'svelte/animate';
  import type { TicketStatus, Ticket } from '$lib/types';
  import KanbanCard from './KanbanCard.svelte';

  export let status: TicketStatus;
  export let tickets: Ticket[] = [];
  export let onTicketDrop: (ticketId: string, newStatus: TicketStatus) => void;

  const flipDurationMs = 200;

  function handleDndConsider(e: CustomEvent<DndEvent<Ticket>>) {
    tickets = e.detail.items;
  }

  function handleDndFinalize(e: CustomEvent<DndEvent<Ticket>>) {
    tickets = e.detail.items;
    // Notify parent of dropped ticket
    const droppedTicket = e.detail.items.find(t => t.status !== status);
    if (droppedTicket) {
      onTicketDrop(droppedTicket.id, status);
    }
  }

  const statusColors: Record<TicketStatus, string> = {
    BACKLOG: 'bg-gray-100',
    TODO: 'bg-blue-100',
    IN_PROGRESS: 'bg-yellow-100',
    NEEDS_FEEDBACK: 'bg-orange-100',
    READY_TO_RESUME: 'bg-teal-100',
    REVIEW: 'bg-purple-100',
    DONE: 'bg-green-100',
    CANCELLED: 'bg-red-100'
  };
</script>

<div class="flex flex-col w-72 min-h-[500px] rounded-lg {statusColors[status]} p-4">
  <header class="flex items-center justify-between mb-4">
    <h3 class="font-semibold text-sm uppercase tracking-wide">
      {status.replace('_', ' ')}
    </h3>
    <span class="bg-white px-2 py-1 rounded text-xs font-medium">
      {tickets.length}
    </span>
  </header>

  <div
    class="flex-1 space-y-2"
    use:dndzone={{ items: tickets, flipDurationMs }}
    on:consider={handleDndConsider}
    on:finalize={handleDndFinalize}
  >
    {#each tickets as ticket (ticket.id)}
      <div animate:flip={{ duration: flipDurationMs }}>
        <KanbanCard {ticket} />
      </div>
    {/each}
  </div>
</div>
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

- [ ] Create `/src/lib/components/kanban/KanbanCard.svelte`
- [ ] Implement draggable card (handled by parent dndzone)
- [ ] Display title, priority badge, labels
- [ ] Add visual states (normal, dragging, disabled)

```svelte
<!-- src/lib/components/kanban/KanbanCard.svelte -->
<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { Ticket } from '$lib/types';
  import Badge from '$lib/components/ui/Badge.svelte';
  import { GripVertical } from 'lucide-svelte';

  export let ticket: Ticket;
  export let isDragging = false;

  const dispatch = createEventDispatcher();

  const priorityColors = {
    LOW: 'bg-gray-200 text-gray-700',
    MEDIUM: 'bg-blue-200 text-blue-700',
    HIGH: 'bg-orange-200 text-orange-700',
    CRITICAL: 'bg-red-200 text-red-700'
  };
</script>

<button
  class="w-full text-left bg-white rounded-lg shadow-sm p-3 cursor-grab active:cursor-grabbing
         hover:shadow-md transition-shadow duration-200
         {isDragging ? 'opacity-50 shadow-lg' : ''}"
  on:click={() => dispatch('click', ticket)}
>
  <div class="flex items-start gap-2">
    <GripVertical class="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />

    <div class="flex-1 min-w-0">
      <h4 class="font-medium text-sm text-gray-900 truncate">
        {ticket.title}
      </h4>

      {#if ticket.description}
        <p class="text-xs text-gray-500 mt-1 line-clamp-2">
          {ticket.description}
        </p>
      {/if}

      <div class="flex items-center gap-2 mt-2 flex-wrap">
        <span class="text-xs px-2 py-0.5 rounded-full {priorityColors[ticket.priority]}">
          {ticket.priority}
        </span>

        {#each ticket.labels as label}
          <Badge variant="outline" class="text-xs">{label}</Badge>
        {/each}
      </div>
    </div>
  </div>
</button>
```

**Acceptance Criteria**:
- Card is draggable
- Shows ticket info clearly
- Visual feedback while dragging

---

### TASK-014: Create KanbanBoard Component
**Priority**: Critical
**Estimated**: 1 hour

- [ ] Create `/src/lib/components/kanban/KanbanBoard.svelte`
- [ ] Compose columns for all visible states
- [ ] Implement drag-and-drop coordination
- [ ] Handle drop events (call transition API)

```svelte
<!-- src/lib/components/kanban/KanbanBoard.svelte -->
<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { Ticket, TicketStatus } from '$lib/types';
  import KanbanColumn from './KanbanColumn.svelte';

  export let projectId: string;
  export let tickets: Ticket[] = [];

  const dispatch = createEventDispatcher();

  // Columns to display (in order)
  const columns: TicketStatus[] = [
    'BACKLOG',
    'TODO',
    'IN_PROGRESS',
    'NEEDS_FEEDBACK',
    'REVIEW',
    'DONE'
  ];

  function getTicketsForStatus(status: TicketStatus): Ticket[] {
    return tickets.filter(t => t.status === status);
  }

  async function handleTicketDrop(ticketId: string, newStatus: TicketStatus) {
    dispatch('ticketMove', { ticketId, newStatus });
  }
</script>

<div class="flex gap-4 overflow-x-auto p-4 min-h-screen bg-gray-50">
  {#each columns as status}
    <KanbanColumn
      {status}
      tickets={getTicketsForStatus(status)}
      onTicketDrop={handleTicketDrop}
    />
  {/each}
</div>
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

- [ ] Create `/src/routes/projects/[projectId]/+page.svelte`
- [ ] Create `/src/routes/projects/[projectId]/+page.server.ts` for data loading
- [ ] Render KanbanBoard
- [ ] Handle loading and error states

**Server Load Function**:
```typescript
// src/routes/projects/[projectId]/+page.server.ts
import type { PageServerLoad } from './$types';
import { prisma } from '$lib/server/prisma';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params }) => {
  const { projectId } = params;

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      tickets: {
        orderBy: { position: 'asc' }
      }
    }
  });

  if (!project) {
    throw error(404, 'Project not found');
  }

  return {
    project,
    tickets: project.tickets
  };
};
```

**Page Component**:
```svelte
<!-- src/routes/projects/[projectId]/+page.svelte -->
<script lang="ts">
  import type { PageData } from './$types';
  import KanbanBoard from '$lib/components/kanban/KanbanBoard.svelte';
  import { invalidateAll } from '$app/navigation';

  export let data: PageData;

  async function handleTicketMove(event: CustomEvent<{ ticketId: string; newStatus: string }>) {
    const { ticketId, newStatus } = event.detail;

    const response = await fetch(`/api/tickets/${ticketId}/transition`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        toState: newStatus,
        triggeredBy: 'user'
      })
    });

    if (response.ok) {
      await invalidateAll();
    }
  }
</script>

<svelte:head>
  <title>{data.project.name} | CF Kanban</title>
</svelte:head>

<main class="min-h-screen">
  <header class="bg-white border-b px-6 py-4">
    <h1 class="text-2xl font-bold">{data.project.name}</h1>
    {#if data.project.description}
      <p class="text-gray-600 mt-1">{data.project.description}</p>
    {/if}
  </header>

  <KanbanBoard
    projectId={data.project.id}
    tickets={data.tickets}
    on:ticketMove={handleTicketMove}
  />
</main>
```

**Acceptance Criteria**:
- Page loads project data
- Kanban board renders with tickets
- URL-based project selection works

---

## Sprint 4: API & Polish (Week 4)

### TASK-016: Create Project CRUD API
**Priority**: High
**Estimated**: 1 hour

- [ ] Create `/src/routes/api/projects/+server.ts` (GET, POST)
- [ ] Create `/src/routes/api/projects/[id]/+server.ts` (GET, PUT, DELETE)
- [ ] Add input validation
- [ ] Write integration tests

**Projects API**:
```typescript
// src/routes/api/projects/+server.ts
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/prisma';

export const GET: RequestHandler = async () => {
  const projects = await prisma.project.findMany({
    orderBy: { updatedAt: 'desc' }
  });
  return json(projects);
};

export const POST: RequestHandler = async ({ request }) => {
  const body = await request.json();
  const { name, description } = body;

  const project = await prisma.project.create({
    data: { name, description }
  });

  return json(project, { status: 201 });
};
```

```typescript
// src/routes/api/projects/[id]/+server.ts
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/prisma';

export const GET: RequestHandler = async ({ params }) => {
  const project = await prisma.project.findUnique({
    where: { id: params.id },
    include: { tickets: true }
  });

  if (!project) {
    throw error(404, 'Project not found');
  }

  return json(project);
};

export const PUT: RequestHandler = async ({ params, request }) => {
  const body = await request.json();

  const project = await prisma.project.update({
    where: { id: params.id },
    data: body
  });

  return json(project);
};

export const DELETE: RequestHandler = async ({ params }) => {
  await prisma.project.delete({
    where: { id: params.id }
  });

  return new Response(null, { status: 204 });
};
```

**Acceptance Criteria**:
- All CRUD operations work
- Validation errors return 400
- Tests pass

---

### TASK-017: Create Ticket CRUD API
**Priority**: High
**Estimated**: 1 hour

- [ ] Create `/src/routes/api/projects/[projectId]/tickets/+server.ts`
- [ ] Create `/src/routes/api/tickets/[id]/+server.ts`
- [ ] Add input validation
- [ ] Write integration tests

```typescript
// src/routes/api/projects/[projectId]/tickets/+server.ts
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/prisma';

export const GET: RequestHandler = async ({ params }) => {
  const tickets = await prisma.ticket.findMany({
    where: { projectId: params.projectId },
    orderBy: { position: 'asc' }
  });
  return json(tickets);
};

export const POST: RequestHandler = async ({ params, request }) => {
  const body = await request.json();
  const { title, description, priority, labels } = body;

  const ticket = await prisma.ticket.create({
    data: {
      title,
      description,
      priority,
      labels: labels || [],
      projectId: params.projectId
    }
  });

  return json(ticket, { status: 201 });
};
```

```typescript
// src/routes/api/tickets/[id]/+server.ts
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/prisma';

export const GET: RequestHandler = async ({ params }) => {
  const ticket = await prisma.ticket.findUnique({
    where: { id: params.id },
    include: { history: true }
  });

  if (!ticket) {
    throw error(404, 'Ticket not found');
  }

  return json(ticket);
};

export const PUT: RequestHandler = async ({ params, request }) => {
  const body = await request.json();

  const ticket = await prisma.ticket.update({
    where: { id: params.id },
    data: body
  });

  return json(ticket);
};

export const DELETE: RequestHandler = async ({ params }) => {
  await prisma.ticket.delete({
    where: { id: params.id }
  });

  return new Response(null, { status: 204 });
};
```

**Acceptance Criteria**:
- All CRUD operations work
- Tickets scoped to projects
- Tests pass

---

### TASK-018: Add Ticket Creation Modal
**Priority**: High
**Estimated**: 1 hour

- [ ] Create `/src/lib/components/kanban/CreateTicketModal.svelte`
- [ ] Form with title, description, priority, labels
- [ ] Integrate with API
- [ ] Add to Kanban page

```svelte
<!-- src/lib/components/kanban/CreateTicketModal.svelte -->
<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { fly, fade } from 'svelte/transition';
  import Button from '$lib/components/ui/Button.svelte';
  import Input from '$lib/components/ui/Input.svelte';
  import { X } from 'lucide-svelte';

  export let open = false;
  export let projectId: string;

  const dispatch = createEventDispatcher();

  let title = '';
  let description = '';
  let priority = 'MEDIUM';
  let labelsInput = '';
  let loading = false;

  async function handleSubmit() {
    loading = true;

    const response = await fetch(`/api/projects/${projectId}/tickets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        description,
        priority,
        labels: labelsInput.split(',').map(l => l.trim()).filter(Boolean)
      })
    });

    if (response.ok) {
      const ticket = await response.json();
      dispatch('created', ticket);
      resetForm();
      open = false;
    }

    loading = false;
  }

  function resetForm() {
    title = '';
    description = '';
    priority = 'MEDIUM';
    labelsInput = '';
  }

  function handleClose() {
    open = false;
    dispatch('close');
  }
</script>

{#if open}
  <div
    class="fixed inset-0 z-50 flex items-center justify-center"
    transition:fade={{ duration: 150 }}
  >
    <button
      class="absolute inset-0 bg-black/50"
      on:click={handleClose}
      aria-label="Close modal"
    />

    <div
      class="relative bg-white rounded-lg shadow-xl w-full max-w-md p-6"
      transition:fly={{ y: 20, duration: 200 }}
    >
      <header class="flex items-center justify-between mb-4">
        <h2 class="text-lg font-semibold">Create Ticket</h2>
        <button on:click={handleClose} class="p-1 hover:bg-gray-100 rounded">
          <X class="w-5 h-5" />
        </button>
      </header>

      <form on:submit|preventDefault={handleSubmit} class="space-y-4">
        <div>
          <label for="title" class="block text-sm font-medium mb-1">Title</label>
          <Input id="title" bind:value={title} required />
        </div>

        <div>
          <label for="description" class="block text-sm font-medium mb-1">Description</label>
          <textarea
            id="description"
            bind:value={description}
            class="w-full px-3 py-2 border rounded-md resize-none"
            rows="3"
          />
        </div>

        <div>
          <label for="priority" class="block text-sm font-medium mb-1">Priority</label>
          <select
            id="priority"
            bind:value={priority}
            class="w-full px-3 py-2 border rounded-md"
          >
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="CRITICAL">Critical</option>
          </select>
        </div>

        <div>
          <label for="labels" class="block text-sm font-medium mb-1">
            Labels (comma-separated)
          </label>
          <Input id="labels" bind:value={labelsInput} placeholder="bug, frontend, urgent" />
        </div>

        <div class="flex justify-end gap-2 pt-4">
          <Button type="button" variant="ghost" on:click={handleClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading || !title}>
            {loading ? 'Creating...' : 'Create Ticket'}
          </Button>
        </div>
      </form>
    </div>
  </div>
{/if}
```

**Acceptance Criteria**:
- Modal opens/closes properly
- Form validates input
- New ticket appears in BACKLOG column

---

### TASK-019: Add Project Selector/Dashboard
**Priority**: Medium
**Estimated**: 1 hour

- [ ] Create `/src/routes/+page.svelte` as dashboard
- [ ] Create `/src/routes/+page.server.ts` for data loading
- [ ] List all projects
- [ ] Create new project button
- [ ] Navigate to project Kanban

```typescript
// src/routes/+page.server.ts
import type { PageServerLoad, Actions } from './$types';
import { prisma } from '$lib/server/prisma';
import { redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async () => {
  const projects = await prisma.project.findMany({
    include: {
      _count: { select: { tickets: true } }
    },
    orderBy: { updatedAt: 'desc' }
  });

  return { projects };
};

export const actions: Actions = {
  createProject: async ({ request }) => {
    const formData = await request.formData();
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;

    const project = await prisma.project.create({
      data: { name, description }
    });

    throw redirect(303, `/projects/${project.id}`);
  }
};
```

```svelte
<!-- src/routes/+page.svelte -->
<script lang="ts">
  import type { PageData } from './$types';
  import { enhance } from '$app/forms';
  import Button from '$lib/components/ui/Button.svelte';
  import { Plus, FolderKanban } from 'lucide-svelte';

  export let data: PageData;

  let showCreateForm = false;
</script>

<svelte:head>
  <title>Projects | CF Kanban</title>
</svelte:head>

<main class="min-h-screen bg-gray-50 p-8">
  <header class="max-w-4xl mx-auto mb-8">
    <div class="flex items-center justify-between">
      <h1 class="text-3xl font-bold">Projects</h1>
      <Button on:click={() => showCreateForm = true}>
        <Plus class="w-4 h-4 mr-2" />
        New Project
      </Button>
    </div>
  </header>

  {#if showCreateForm}
    <div class="max-w-4xl mx-auto mb-8 bg-white rounded-lg shadow p-6">
      <h2 class="text-lg font-semibold mb-4">Create New Project</h2>
      <form method="POST" action="?/createProject" use:enhance class="space-y-4">
        <div>
          <label for="name" class="block text-sm font-medium mb-1">Name</label>
          <input
            type="text"
            id="name"
            name="name"
            required
            class="w-full px-3 py-2 border rounded-md"
          />
        </div>
        <div>
          <label for="description" class="block text-sm font-medium mb-1">
            Description (optional)
          </label>
          <textarea
            id="description"
            name="description"
            class="w-full px-3 py-2 border rounded-md"
            rows="2"
          />
        </div>
        <div class="flex gap-2">
          <Button type="submit">Create</Button>
          <Button type="button" variant="ghost" on:click={() => showCreateForm = false}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  {/if}

  <div class="max-w-4xl mx-auto grid gap-4 md:grid-cols-2 lg:grid-cols-3">
    {#each data.projects as project}
      <a
        href="/projects/{project.id}"
        class="bg-white rounded-lg shadow hover:shadow-md transition-shadow p-6"
      >
        <div class="flex items-start gap-3">
          <FolderKanban class="w-6 h-6 text-blue-500" />
          <div class="flex-1 min-w-0">
            <h3 class="font-semibold truncate">{project.name}</h3>
            {#if project.description}
              <p class="text-sm text-gray-500 mt-1 line-clamp-2">
                {project.description}
              </p>
            {/if}
            <p class="text-xs text-gray-400 mt-2">
              {project._count.tickets} tickets
            </p>
          </div>
        </div>
      </a>
    {:else}
      <div class="col-span-full text-center py-12 text-gray-500">
        No projects yet. Create your first one!
      </div>
    {/each}
  </div>
</main>
```

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

**Loading Skeleton Component**:
```svelte
<!-- src/lib/components/ui/Skeleton.svelte -->
<script lang="ts">
  export let className = '';
</script>

<div class="animate-pulse bg-gray-200 rounded {className}" />
```

**Error Handling** (`src/routes/+error.svelte`):
```svelte
<script lang="ts">
  import { page } from '$app/stores';
</script>

<div class="min-h-screen flex items-center justify-center bg-gray-50">
  <div class="text-center">
    <h1 class="text-6xl font-bold text-gray-200">{$page.status}</h1>
    <p class="text-xl text-gray-600 mt-4">{$page.error?.message || 'Something went wrong'}</p>
    <a href="/" class="mt-6 inline-block text-blue-500 hover:underline">
      Go back home
    </a>
  </div>
</div>
```

**Store implementation patterns**:
```bash
# Store what worked
npx @claude-flow/cli@latest memory store \
  --key "impl-phase1-complete" \
  --value "Phase 1 complete. Stack: SvelteKit, Prisma, svelte-dnd-action, bits-ui. State machine pattern with history tracking. TDD approach worked well. Svelte stores for reactive state." \
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
- Socket.IO or SSE integration
- Live ticket updates across clients
- Redis for pub/sub (or SvelteKit's built-in event streaming)
- Optimistic UI updates with Svelte stores

Start Phase 2 by reading `/docs/PRD-AI-KANBAN-2045.md` - Part 4: System Architecture, WebSocket section.
