# Phase 2: Real-time Layer - Implementation Tasks

## Overview

**Duration**: Weeks 5-8
**Goal**: Live WebSocket updates, Redis caching, optimistic UI
**Prerequisites**: Phase 1 complete, Docker running

---

## Sprint 1: WebSocket Server (Week 5)

### TASK-021: Set Up Socket.IO Server in SvelteKit
**Priority**: Critical
**Estimated**: 1 hour

- [ ] Install Socket.IO server
- [ ] Create custom SvelteKit server with Socket.IO
- [ ] Configure CORS for development
- [ ] Test basic connection

```bash
npm install socket.io
```

**Custom Server** (`server.js`):
```javascript
import { createServer } from 'http';
import { Server } from 'socket.io';
import { handler } from './build/handler.js';
import express from 'express';

const app = express();
const server = createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.ORIGIN || 'http://localhost:5173',
    methods: ['GET', 'POST']
  }
});

// Socket.IO event handlers
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// SvelteKit handler
app.use(handler);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export { io };
```

**Acceptance Criteria**:
- Server starts with `node server.js`
- WebSocket connections accepted
- SvelteKit routes still work

---

### TASK-022: Add Socket.IO Event Handlers (Server)
**Priority**: Critical
**Estimated**: 1.5 hours

- [ ] Create `/src/lib/server/socket/handlers.ts`
- [ ] Implement ticket event handlers
- [ ] Implement project event handlers
- [ ] Add error handling

```typescript
// src/lib/server/socket/handlers.ts
import type { Server, Socket } from 'socket.io';
import { prisma } from '$lib/server/prisma';

export function registerHandlers(io: Server, socket: Socket) {
  // Join project room
  socket.on('project:join', async (projectId: string) => {
    socket.join(`project:${projectId}`);
    console.log(`Socket ${socket.id} joined project:${projectId}`);
  });

  // Leave project room
  socket.on('project:leave', (projectId: string) => {
    socket.leave(`project:${projectId}`);
  });

  // Ticket moved
  socket.on('ticket:move', async (data: {
    ticketId: string;
    fromStatus: string;
    toStatus: string;
    projectId: string;
  }) => {
    // Broadcast to all clients in the project room except sender
    socket.to(`project:${data.projectId}`).emit('ticket:moved', data);
  });

  // Ticket created
  socket.on('ticket:create', async (data: {
    ticket: any;
    projectId: string;
  }) => {
    socket.to(`project:${data.projectId}`).emit('ticket:created', data.ticket);
  });

  // Ticket updated
  socket.on('ticket:update', async (data: {
    ticket: any;
    projectId: string;
  }) => {
    socket.to(`project:${data.projectId}`).emit('ticket:updated', data.ticket);
  });

  // Ticket deleted
  socket.on('ticket:delete', async (data: {
    ticketId: string;
    projectId: string;
  }) => {
    socket.to(`project:${data.projectId}`).emit('ticket:deleted', data.ticketId);
  });
}
```

**Acceptance Criteria**:
- All event handlers registered
- Room-based broadcasting works
- Error handling for invalid data

---

### TASK-023: Define WebSocket Event Types
**Priority**: Critical
**Estimated**: 30 min

- [ ] Create `/src/lib/types/socket-events.ts`
- [ ] Define all client-to-server events
- [ ] Define all server-to-client events
- [ ] Export typed event maps

```typescript
// src/lib/types/socket-events.ts
import type { Ticket, Project } from '@prisma/client';

// Client → Server events
export interface ClientToServerEvents {
  'project:join': (projectId: string) => void;
  'project:leave': (projectId: string) => void;
  'ticket:move': (data: TicketMovePayload) => void;
  'ticket:create': (data: TicketCreatePayload) => void;
  'ticket:update': (data: TicketUpdatePayload) => void;
  'ticket:delete': (data: TicketDeletePayload) => void;
}

// Server → Client events
export interface ServerToClientEvents {
  'ticket:moved': (data: TicketMovePayload) => void;
  'ticket:created': (ticket: Ticket) => void;
  'ticket:updated': (ticket: Ticket) => void;
  'ticket:deleted': (ticketId: string) => void;
  'project:updated': (project: Project) => void;
  'error': (message: string) => void;
}

// Payload types
export interface TicketMovePayload {
  ticketId: string;
  fromStatus: string;
  toStatus: string;
  projectId: string;
  position?: number;
}

export interface TicketCreatePayload {
  ticket: Ticket;
  projectId: string;
}

export interface TicketUpdatePayload {
  ticket: Ticket;
  projectId: string;
}

export interface TicketDeletePayload {
  ticketId: string;
  projectId: string;
}
```

**Acceptance Criteria**:
- All events have TypeScript types
- Payload structures defined
- Types exported for client and server

---

### TASK-024: Create Room Management for Projects
**Priority**: High
**Estimated**: 45 min

- [ ] Implement room joining/leaving logic
- [ ] Track connected users per project
- [ ] Add presence indicators
- [ ] Handle cleanup on disconnect

```typescript
// src/lib/server/socket/rooms.ts
import type { Server, Socket } from 'socket.io';

interface RoomState {
  users: Map<string, { socketId: string; joinedAt: Date }>;
}

const rooms = new Map<string, RoomState>();

export function joinProjectRoom(socket: Socket, projectId: string) {
  const roomKey = `project:${projectId}`;

  if (!rooms.has(roomKey)) {
    rooms.set(roomKey, { users: new Map() });
  }

  const room = rooms.get(roomKey)!;
  room.users.set(socket.id, { socketId: socket.id, joinedAt: new Date() });

  socket.join(roomKey);

  // Broadcast user count to room
  socket.to(roomKey).emit('room:userJoined', {
    projectId,
    userCount: room.users.size
  });

  return room.users.size;
}

export function leaveProjectRoom(socket: Socket, projectId: string) {
  const roomKey = `project:${projectId}`;
  const room = rooms.get(roomKey);

  if (room) {
    room.users.delete(socket.id);
    socket.leave(roomKey);

    socket.to(roomKey).emit('room:userLeft', {
      projectId,
      userCount: room.users.size
    });

    // Cleanup empty rooms
    if (room.users.size === 0) {
      rooms.delete(roomKey);
    }
  }
}

export function handleDisconnect(socket: Socket) {
  // Leave all rooms on disconnect
  for (const [roomKey, room] of rooms.entries()) {
    if (room.users.has(socket.id)) {
      room.users.delete(socket.id);

      const projectId = roomKey.replace('project:', '');
      socket.to(roomKey).emit('room:userLeft', {
        projectId,
        userCount: room.users.size
      });

      if (room.users.size === 0) {
        rooms.delete(roomKey);
      }
    }
  }
}

export function getRoomUserCount(projectId: string): number {
  const room = rooms.get(`project:${projectId}`);
  return room?.users.size ?? 0;
}
```

**Acceptance Criteria**:
- Users join/leave project rooms
- User count tracked per room
- Cleanup on disconnect

---

### TASK-025: Add Authentication to WebSocket
**Priority**: High
**Estimated**: 1 hour

- [ ] Implement connection authentication middleware
- [ ] Validate session/token on connect
- [ ] Attach user info to socket
- [ ] Handle unauthorized connections

```typescript
// src/lib/server/socket/auth.ts
import type { Socket } from 'socket.io';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  sessionId?: string;
}

export async function authenticateSocket(
  socket: AuthenticatedSocket,
  next: (err?: Error) => void
) {
  try {
    const token = socket.handshake.auth.token;
    const sessionId = socket.handshake.auth.sessionId;

    if (!token && !sessionId) {
      // Allow anonymous connections for now (Phase 1 has no auth)
      // In production, this would reject
      socket.userId = 'anonymous';
      return next();
    }

    // TODO: Validate token with Clerk/Auth.js when auth is added
    // const session = await validateSession(sessionId);
    // socket.userId = session.userId;

    socket.userId = 'authenticated-user';
    socket.sessionId = sessionId;

    next();
  } catch (error) {
    next(new Error('Authentication failed'));
  }
}

export function requireAuth(socket: AuthenticatedSocket): boolean {
  return socket.userId !== undefined;
}
```

**Acceptance Criteria**:
- Middleware validates connections
- User info attached to socket
- Graceful handling of anonymous users (for now)

---

## Sprint 2: Redis Integration (Week 6)

### TASK-026: Set Up Redis with Docker
**Priority**: Critical
**Estimated**: 30 min

- [ ] Add Redis to docker-compose.yml
- [ ] Configure persistence
- [ ] Add health check
- [ ] Document connection settings

**Update docker-compose.yml**:
```yaml
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

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redisdata:/data
    command: redis-server --appendonly yes
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  pgdata:
  redisdata:
```

**Update .env**:
```
REDIS_URL=redis://localhost:6379
```

**Acceptance Criteria**:
- Redis container running
- Data persisted across restarts
- Health check passes

---

### TASK-027: Create Redis Connection Singleton
**Priority**: Critical
**Estimated**: 30 min

- [ ] Install ioredis
- [ ] Create `/src/lib/server/redis.ts`
- [ ] Implement singleton pattern
- [ ] Add connection error handling

```bash
npm install ioredis
npm install -D @types/ioredis
```

```typescript
// src/lib/server/redis.ts
import Redis from 'ioredis';
import { building } from '$app/environment';

const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined;
  redisSub: Redis | undefined;
};

function createRedisClient(): Redis {
  const client = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
      const delay = Math.min(times * 50, 2000);
      return delay;
    }
  });

  client.on('error', (err) => {
    console.error('Redis Client Error:', err);
  });

  client.on('connect', () => {
    console.log('Redis connected');
  });

  return client;
}

// Main client for get/set operations
export const redis = globalForRedis.redis ?? createRedisClient();

// Separate client for pub/sub (required by Redis)
export const redisSub = globalForRedis.redisSub ?? createRedisClient();

if (!building) {
  globalForRedis.redis = redis;
  globalForRedis.redisSub = redisSub;
}
```

**Acceptance Criteria**:
- Redis client connects successfully
- Singleton prevents multiple connections
- Error handling for connection failures

---

### TASK-028: Add Redis Pub/Sub for Events
**Priority**: Critical
**Estimated**: 1 hour

- [ ] Create `/src/lib/server/redis/pubsub.ts`
- [ ] Implement publish function
- [ ] Implement subscribe function
- [ ] Bridge to Socket.IO

```typescript
// src/lib/server/redis/pubsub.ts
import { redis, redisSub } from '$lib/server/redis';
import type { Server } from 'socket.io';

type EventPayload = Record<string, unknown>;

// Channel names
export const CHANNELS = {
  TICKET_EVENTS: 'cf-kanban:tickets',
  PROJECT_EVENTS: 'cf-kanban:projects',
  SYSTEM_EVENTS: 'cf-kanban:system'
} as const;

// Publish event to Redis
export async function publishEvent(
  channel: string,
  event: string,
  payload: EventPayload
) {
  const message = JSON.stringify({ event, payload, timestamp: Date.now() });
  await redis.publish(channel, message);
}

// Subscribe to Redis and bridge to Socket.IO
export function bridgeRedisToSocketIO(io: Server) {
  // Subscribe to all channels
  redisSub.subscribe(
    CHANNELS.TICKET_EVENTS,
    CHANNELS.PROJECT_EVENTS,
    CHANNELS.SYSTEM_EVENTS
  );

  redisSub.on('message', (channel, message) => {
    try {
      const { event, payload } = JSON.parse(message);

      // Route to appropriate room based on payload
      if (payload.projectId) {
        io.to(`project:${payload.projectId}`).emit(event, payload);
      } else {
        // Broadcast to all connected clients
        io.emit(event, payload);
      }
    } catch (error) {
      console.error('Failed to parse Redis message:', error);
    }
  });
}

// Publish ticket events
export async function publishTicketEvent(
  event: 'created' | 'updated' | 'deleted' | 'moved',
  payload: EventPayload
) {
  await publishEvent(CHANNELS.TICKET_EVENTS, `ticket:${event}`, payload);
}

// Publish project events
export async function publishProjectEvent(
  event: 'created' | 'updated' | 'deleted',
  payload: EventPayload
) {
  await publishEvent(CHANNELS.PROJECT_EVENTS, `project:${event}`, payload);
}
```

**Acceptance Criteria**:
- Events published to Redis channels
- Socket.IO receives bridged events
- Multi-instance support (horizontal scaling)

---

### TASK-029: Implement Redis Caching Layer
**Priority**: High
**Estimated**: 1 hour

- [ ] Create `/src/lib/server/redis/cache.ts`
- [ ] Implement project caching
- [ ] Implement ticket caching
- [ ] Add cache invalidation

```typescript
// src/lib/server/redis/cache.ts
import { redis } from '$lib/server/redis';
import type { Project, Ticket } from '@prisma/client';

const CACHE_TTL = 300; // 5 minutes

// Cache keys
const keys = {
  project: (id: string) => `cache:project:${id}`,
  projectTickets: (id: string) => `cache:project:${id}:tickets`,
  ticket: (id: string) => `cache:ticket:${id}`,
  allProjects: () => 'cache:projects:all'
};

// Project caching
export async function cacheProject(project: Project) {
  await redis.setex(
    keys.project(project.id),
    CACHE_TTL,
    JSON.stringify(project)
  );
}

export async function getCachedProject(id: string): Promise<Project | null> {
  const cached = await redis.get(keys.project(id));
  return cached ? JSON.parse(cached) : null;
}

export async function invalidateProject(id: string) {
  await redis.del(keys.project(id), keys.projectTickets(id));
}

// Ticket caching
export async function cacheTicket(ticket: Ticket) {
  await redis.setex(
    keys.ticket(ticket.id),
    CACHE_TTL,
    JSON.stringify(ticket)
  );
}

export async function getCachedTicket(id: string): Promise<Ticket | null> {
  const cached = await redis.get(keys.ticket(id));
  return cached ? JSON.parse(cached) : null;
}

export async function invalidateTicket(ticket: Ticket) {
  await redis.del(
    keys.ticket(ticket.id),
    keys.projectTickets(ticket.projectId)
  );
}

// Batch operations
export async function cacheProjectWithTickets(
  project: Project,
  tickets: Ticket[]
) {
  const pipeline = redis.pipeline();

  pipeline.setex(keys.project(project.id), CACHE_TTL, JSON.stringify(project));
  pipeline.setex(
    keys.projectTickets(project.id),
    CACHE_TTL,
    JSON.stringify(tickets)
  );

  await pipeline.exec();
}

export async function getCachedProjectWithTickets(
  id: string
): Promise<{ project: Project; tickets: Ticket[] } | null> {
  const [projectData, ticketsData] = await redis.mget(
    keys.project(id),
    keys.projectTickets(id)
  );

  if (!projectData || !ticketsData) return null;

  return {
    project: JSON.parse(projectData),
    tickets: JSON.parse(ticketsData)
  };
}
```

**Acceptance Criteria**:
- Projects and tickets cached
- TTL-based expiration
- Cache invalidation on updates

---

## Sprint 3: Client Integration (Week 7)

### TASK-030: Set Up Socket.IO Client in SvelteKit
**Priority**: Critical
**Estimated**: 45 min

- [ ] Install socket.io-client
- [ ] Create `/src/lib/socket.ts`
- [ ] Handle SSR (client-only)
- [ ] Export typed socket instance

```bash
npm install socket.io-client
```

```typescript
// src/lib/socket.ts
import { browser } from '$app/environment';
import { io, Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents } from '$lib/types/socket-events';

type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let socket: TypedSocket | null = null;

export function getSocket(): TypedSocket | null {
  if (!browser) return null;

  if (!socket) {
    socket = io(getSocketUrl(), {
      autoConnect: false,
      auth: {
        // Add auth token when available
        token: getAuthToken()
      }
    });
  }

  return socket;
}

function getSocketUrl(): string {
  // In production, use the same origin
  // In development, use the custom server port
  if (typeof window !== 'undefined') {
    const isDev = window.location.hostname === 'localhost';
    return isDev ? 'http://localhost:3000' : window.location.origin;
  }
  return 'http://localhost:3000';
}

function getAuthToken(): string | undefined {
  // TODO: Get from auth provider when implemented
  return undefined;
}

export function connectSocket(): TypedSocket | null {
  const s = getSocket();
  if (s && !s.connected) {
    s.connect();
  }
  return s;
}

export function disconnectSocket() {
  if (socket?.connected) {
    socket.disconnect();
  }
}
```

**Acceptance Criteria**:
- Socket client works in browser only
- No SSR errors
- Typed socket instance

---

### TASK-031: Add Socket.IO Event Handlers (Client)
**Priority**: Critical
**Estimated**: 1 hour

- [ ] Create `/src/lib/socket/handlers.ts`
- [ ] Implement ticket event listeners
- [ ] Implement project event listeners
- [ ] Handle connection events

```typescript
// src/lib/socket/handlers.ts
import { getSocket } from '$lib/socket';
import { ticketStore, projectStore } from '$lib/stores';
import type { Ticket } from '@prisma/client';

export function setupSocketHandlers() {
  const socket = getSocket();
  if (!socket) return;

  // Connection events
  socket.on('connect', () => {
    console.log('Socket connected:', socket.id);
  });

  socket.on('disconnect', (reason) => {
    console.log('Socket disconnected:', reason);
  });

  socket.on('connect_error', (error) => {
    console.error('Socket connection error:', error);
  });

  // Ticket events
  socket.on('ticket:created', (ticket: Ticket) => {
    ticketStore.addTicket(ticket);
  });

  socket.on('ticket:updated', (ticket: Ticket) => {
    ticketStore.updateTicket(ticket);
  });

  socket.on('ticket:deleted', (ticketId: string) => {
    ticketStore.removeTicket(ticketId);
  });

  socket.on('ticket:moved', (data) => {
    ticketStore.moveTicket(data.ticketId, data.toStatus, data.position);
  });

  // Room events
  socket.on('room:userJoined', (data) => {
    projectStore.updateUserCount(data.projectId, data.userCount);
  });

  socket.on('room:userLeft', (data) => {
    projectStore.updateUserCount(data.projectId, data.userCount);
  });

  // Error handling
  socket.on('error', (message: string) => {
    console.error('Socket error:', message);
    // TODO: Show toast notification
  });
}

export function joinProject(projectId: string) {
  const socket = getSocket();
  socket?.emit('project:join', projectId);
}

export function leaveProject(projectId: string) {
  const socket = getSocket();
  socket?.emit('project:leave', projectId);
}

export function emitTicketMove(
  ticketId: string,
  fromStatus: string,
  toStatus: string,
  projectId: string
) {
  const socket = getSocket();
  socket?.emit('ticket:move', { ticketId, fromStatus, toStatus, projectId });
}
```

**Acceptance Criteria**:
- All events handled
- Stores updated on events
- Connection state managed

---

### TASK-032: Create Real-time Svelte Stores
**Priority**: Critical
**Estimated**: 1.5 hours

- [ ] Create `/src/lib/stores/tickets.ts`
- [ ] Create `/src/lib/stores/projects.ts`
- [ ] Implement reactive updates
- [ ] Add optimistic update support

```typescript
// src/lib/stores/tickets.ts
import { writable, derived } from 'svelte/store';
import type { Ticket, TicketStatus } from '@prisma/client';

interface TicketState {
  tickets: Map<string, Ticket>;
  loading: boolean;
  error: string | null;
}

function createTicketStore() {
  const { subscribe, set, update } = writable<TicketState>({
    tickets: new Map(),
    loading: false,
    error: null
  });

  return {
    subscribe,

    // Initialize with tickets from server
    init(tickets: Ticket[]) {
      const map = new Map(tickets.map(t => [t.id, t]));
      set({ tickets: map, loading: false, error: null });
    },

    // Add a new ticket
    addTicket(ticket: Ticket) {
      update(state => {
        state.tickets.set(ticket.id, ticket);
        return { ...state, tickets: new Map(state.tickets) };
      });
    },

    // Update an existing ticket
    updateTicket(ticket: Ticket) {
      update(state => {
        if (state.tickets.has(ticket.id)) {
          state.tickets.set(ticket.id, ticket);
          return { ...state, tickets: new Map(state.tickets) };
        }
        return state;
      });
    },

    // Remove a ticket
    removeTicket(ticketId: string) {
      update(state => {
        state.tickets.delete(ticketId);
        return { ...state, tickets: new Map(state.tickets) };
      });
    },

    // Move ticket to new status (optimistic)
    moveTicket(ticketId: string, newStatus: TicketStatus, position?: number) {
      update(state => {
        const ticket = state.tickets.get(ticketId);
        if (ticket) {
          const updated = { ...ticket, status: newStatus };
          if (position !== undefined) updated.position = position;
          state.tickets.set(ticketId, updated);
          return { ...state, tickets: new Map(state.tickets) };
        }
        return state;
      });
    },

    // Rollback optimistic update
    rollback(ticketId: string, originalTicket: Ticket) {
      update(state => {
        state.tickets.set(ticketId, originalTicket);
        return { ...state, tickets: new Map(state.tickets) };
      });
    },

    // Set loading state
    setLoading(loading: boolean) {
      update(state => ({ ...state, loading }));
    },

    // Set error
    setError(error: string | null) {
      update(state => ({ ...state, error }));
    }
  };
}

export const ticketStore = createTicketStore();

// Derived store: tickets grouped by status
export const ticketsByStatus = derived(ticketStore, $store => {
  const grouped = new Map<TicketStatus, Ticket[]>();

  for (const ticket of $store.tickets.values()) {
    const existing = grouped.get(ticket.status) || [];
    existing.push(ticket);
    grouped.set(ticket.status, existing);
  }

  // Sort by position within each status
  for (const tickets of grouped.values()) {
    tickets.sort((a, b) => a.position - b.position);
  }

  return grouped;
});
```

```typescript
// src/lib/stores/projects.ts
import { writable } from 'svelte/store';
import type { Project } from '@prisma/client';

interface ProjectState {
  projects: Map<string, Project>;
  currentProjectId: string | null;
  userCounts: Map<string, number>;
}

function createProjectStore() {
  const { subscribe, set, update } = writable<ProjectState>({
    projects: new Map(),
    currentProjectId: null,
    userCounts: new Map()
  });

  return {
    subscribe,

    init(projects: Project[]) {
      const map = new Map(projects.map(p => [p.id, p]));
      update(state => ({ ...state, projects: map }));
    },

    setCurrentProject(projectId: string | null) {
      update(state => ({ ...state, currentProjectId: projectId }));
    },

    updateUserCount(projectId: string, count: number) {
      update(state => {
        state.userCounts.set(projectId, count);
        return { ...state, userCounts: new Map(state.userCounts) };
      });
    },

    addProject(project: Project) {
      update(state => {
        state.projects.set(project.id, project);
        return { ...state, projects: new Map(state.projects) };
      });
    },

    updateProject(project: Project) {
      update(state => {
        state.projects.set(project.id, project);
        return { ...state, projects: new Map(state.projects) };
      });
    },

    removeProject(projectId: string) {
      update(state => {
        state.projects.delete(projectId);
        state.userCounts.delete(projectId);
        return {
          ...state,
          projects: new Map(state.projects),
          userCounts: new Map(state.userCounts)
        };
      });
    }
  };
}

export const projectStore = createProjectStore();
```

**Acceptance Criteria**:
- Stores update reactively
- Derived stores for grouped data
- Optimistic update support with rollback

---

### TASK-033: Implement Reconnection with Exponential Backoff
**Priority**: High
**Estimated**: 45 min

- [ ] Configure Socket.IO reconnection
- [ ] Implement exponential backoff
- [ ] Add connection status indicator
- [ ] Handle reconnection sync

```typescript
// src/lib/socket/reconnection.ts
import { getSocket } from '$lib/socket';
import { writable } from 'svelte/store';
import { joinProject } from '$lib/socket/handlers';

export type ConnectionStatus = 'connected' | 'connecting' | 'disconnected' | 'error';

export const connectionStatus = writable<ConnectionStatus>('disconnected');

let currentProjectId: string | null = null;

export function initReconnection() {
  const socket = getSocket();
  if (!socket) return;

  // Configure reconnection
  socket.io.opts.reconnection = true;
  socket.io.opts.reconnectionAttempts = 10;
  socket.io.opts.reconnectionDelay = 1000;
  socket.io.opts.reconnectionDelayMax = 30000;
  socket.io.opts.randomizationFactor = 0.5;

  socket.on('connect', () => {
    connectionStatus.set('connected');

    // Rejoin project room on reconnection
    if (currentProjectId) {
      joinProject(currentProjectId);
      // Trigger data refresh
      refreshProjectData(currentProjectId);
    }
  });

  socket.on('connecting', () => {
    connectionStatus.set('connecting');
  });

  socket.on('disconnect', () => {
    connectionStatus.set('disconnected');
  });

  socket.on('connect_error', () => {
    connectionStatus.set('error');
  });

  socket.io.on('reconnect_attempt', (attempt) => {
    console.log(`Reconnection attempt ${attempt}`);
    connectionStatus.set('connecting');
  });

  socket.io.on('reconnect_failed', () => {
    connectionStatus.set('error');
    console.error('Failed to reconnect after maximum attempts');
  });
}

export function setCurrentProject(projectId: string | null) {
  currentProjectId = projectId;
}

async function refreshProjectData(projectId: string) {
  try {
    const response = await fetch(`/api/projects/${projectId}`);
    if (response.ok) {
      const data = await response.json();
      // Update stores with fresh data
      // ticketStore.init(data.tickets);
    }
  } catch (error) {
    console.error('Failed to refresh project data:', error);
  }
}
```

**Acceptance Criteria**:
- Automatic reconnection with backoff
- Connection status exposed as store
- Data synced on reconnection

---

## Sprint 4: Integration & Testing (Week 8)

### TASK-034: Connect Kanban Board to WebSocket
**Priority**: Critical
**Estimated**: 1.5 hours

- [ ] Update KanbanBoard to use stores
- [ ] Emit events on drag-and-drop
- [ ] Handle incoming events
- [ ] Add connection status indicator

```svelte
<!-- Updated src/routes/projects/[projectId]/+page.svelte -->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import type { PageData } from './$types';
  import KanbanBoard from '$lib/components/kanban/KanbanBoard.svelte';
  import ConnectionIndicator from '$lib/components/ui/ConnectionIndicator.svelte';
  import { ticketStore, ticketsByStatus } from '$lib/stores/tickets';
  import { projectStore } from '$lib/stores/projects';
  import { connectSocket, disconnectSocket } from '$lib/socket';
  import {
    setupSocketHandlers,
    joinProject,
    leaveProject,
    emitTicketMove
  } from '$lib/socket/handlers';
  import { setCurrentProject, connectionStatus } from '$lib/socket/reconnection';

  export let data: PageData;

  onMount(() => {
    // Initialize stores with server data
    ticketStore.init(data.tickets);
    projectStore.setCurrentProject(data.project.id);
    setCurrentProject(data.project.id);

    // Connect socket and join project room
    connectSocket();
    setupSocketHandlers();
    joinProject(data.project.id);
  });

  onDestroy(() => {
    leaveProject(data.project.id);
    setCurrentProject(null);
  });

  async function handleTicketMove(event: CustomEvent<{
    ticketId: string;
    newStatus: string;
    oldStatus: string;
  }>) {
    const { ticketId, newStatus, oldStatus } = event.detail;

    // Get original ticket for rollback
    const originalTicket = $ticketStore.tickets.get(ticketId);
    if (!originalTicket) return;

    // Optimistic update
    ticketStore.moveTicket(ticketId, newStatus as any);

    // Emit to other clients
    emitTicketMove(ticketId, oldStatus, newStatus, data.project.id);

    // Call API
    try {
      const response = await fetch(`/api/tickets/${ticketId}/transition`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toState: newStatus,
          triggeredBy: 'user'
        })
      });

      if (!response.ok) {
        // Rollback on failure
        ticketStore.rollback(ticketId, originalTicket);
        throw new Error('Failed to update ticket');
      }
    } catch (error) {
      ticketStore.rollback(ticketId, originalTicket);
      console.error('Failed to move ticket:', error);
    }
  }
</script>

<svelte:head>
  <title>{data.project.name} | CF Kanban</title>
</svelte:head>

<main class="min-h-screen">
  <header class="bg-white border-b px-6 py-4 flex items-center justify-between">
    <div>
      <h1 class="text-2xl font-bold">{data.project.name}</h1>
      {#if data.project.description}
        <p class="text-gray-600 mt-1">{data.project.description}</p>
      {/if}
    </div>
    <ConnectionIndicator status={$connectionStatus} />
  </header>

  <KanbanBoard
    projectId={data.project.id}
    ticketsByStatus={$ticketsByStatus}
    on:ticketMove={handleTicketMove}
  />
</main>
```

**Acceptance Criteria**:
- Board uses Svelte stores
- Events emitted on ticket move
- Optimistic UI with rollback
- Connection status visible

---

### TASK-035: Implement Live Ticket Status Updates
**Priority**: Critical
**Estimated**: 1 hour

- [ ] Update API routes to publish events
- [ ] Handle ticket created events
- [ ] Handle ticket updated events
- [ ] Handle ticket deleted events

```typescript
// Updated src/routes/api/tickets/[id]/transition/+server.ts
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/prisma';
import { ticketStateMachine } from '$lib/state-machine/ticket-state-machine';
import { publishTicketEvent } from '$lib/server/redis/pubsub';
import { invalidateTicket } from '$lib/server/redis/cache';

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

  // Invalidate cache
  await invalidateTicket(updatedTicket);

  // Publish real-time event
  await publishTicketEvent('moved', {
    ticketId: id,
    fromStatus: ticket.status,
    toStatus: toState,
    projectId: ticket.projectId,
    ticket: updatedTicket
  });

  return json({
    ticket: updatedTicket,
    transition: { from: ticket.status, to: toState }
  });
};
```

**Acceptance Criteria**:
- API publishes events to Redis
- Other clients receive updates in real-time
- Cache invalidated on changes

---

### TASK-036: Add Real-time Ticket Position Sync
**Priority**: High
**Estimated**: 1 hour

- [ ] Track ticket positions within columns
- [ ] Sync position changes in real-time
- [ ] Handle concurrent position updates
- [ ] Add position conflict resolution

```typescript
// src/lib/stores/position.ts
import { writable } from 'svelte/store';
import type { TicketStatus } from '@prisma/client';

interface PositionState {
  // Map: status -> ticket IDs in order
  positions: Map<TicketStatus, string[]>;
  version: number;
}

function createPositionStore() {
  const { subscribe, set, update } = writable<PositionState>({
    positions: new Map(),
    version: 0
  });

  return {
    subscribe,

    initPositions(ticketsByStatus: Map<TicketStatus, { id: string; position: number }[]>) {
      const positions = new Map<TicketStatus, string[]>();

      for (const [status, tickets] of ticketsByStatus) {
        const sorted = [...tickets].sort((a, b) => a.position - b.position);
        positions.set(status, sorted.map(t => t.id));
      }

      set({ positions, version: 0 });
    },

    moveTicket(
      ticketId: string,
      fromStatus: TicketStatus,
      toStatus: TicketStatus,
      newIndex: number
    ) {
      update(state => {
        // Remove from old position
        const fromList = state.positions.get(fromStatus) || [];
        const filteredFrom = fromList.filter(id => id !== ticketId);
        state.positions.set(fromStatus, filteredFrom);

        // Add to new position
        const toList = state.positions.get(toStatus) || [];
        toList.splice(newIndex, 0, ticketId);
        state.positions.set(toStatus, toList);

        return {
          positions: new Map(state.positions),
          version: state.version + 1
        };
      });
    },

    // Apply remote position update with conflict resolution
    applyRemoteUpdate(
      ticketId: string,
      toStatus: TicketStatus,
      newIndex: number,
      remoteVersion: number
    ) {
      update(state => {
        // If remote version is older, ignore
        if (remoteVersion < state.version) {
          console.log('Ignoring stale position update');
          return state;
        }

        // Find and remove ticket from current position
        for (const [status, ids] of state.positions) {
          const idx = ids.indexOf(ticketId);
          if (idx !== -1) {
            ids.splice(idx, 1);
            state.positions.set(status, [...ids]);
            break;
          }
        }

        // Add to new position
        const toList = state.positions.get(toStatus) || [];
        toList.splice(newIndex, 0, ticketId);
        state.positions.set(toStatus, [...toList]);

        return {
          positions: new Map(state.positions),
          version: remoteVersion
        };
      });
    }
  };
}

export const positionStore = createPositionStore();
```

**Acceptance Criteria**:
- Positions synced across clients
- Reordering within columns works
- Conflict resolution for concurrent updates

---

### TASK-037: Implement Optimistic UI Updates
**Priority**: High
**Estimated**: 1 hour

- [ ] Create optimistic update manager
- [ ] Track pending operations
- [ ] Implement rollback on failure
- [ ] Add visual feedback for pending state

```typescript
// src/lib/stores/optimistic.ts
import { writable, get } from 'svelte/store';
import type { Ticket } from '@prisma/client';

interface PendingOperation {
  id: string;
  type: 'create' | 'update' | 'delete' | 'move';
  ticketId: string;
  originalState: Ticket;
  optimisticState: Partial<Ticket>;
  timestamp: number;
}

function createOptimisticStore() {
  const pending = writable<Map<string, PendingOperation>>(new Map());

  return {
    subscribe: pending.subscribe,

    // Start an optimistic operation
    startOperation(
      type: PendingOperation['type'],
      ticketId: string,
      originalState: Ticket,
      optimisticState: Partial<Ticket>
    ): string {
      const operationId = crypto.randomUUID();

      pending.update(map => {
        map.set(operationId, {
          id: operationId,
          type,
          ticketId,
          originalState,
          optimisticState,
          timestamp: Date.now()
        });
        return new Map(map);
      });

      return operationId;
    },

    // Complete operation successfully
    completeOperation(operationId: string) {
      pending.update(map => {
        map.delete(operationId);
        return new Map(map);
      });
    },

    // Rollback operation on failure
    rollbackOperation(operationId: string): Ticket | null {
      const map = get(pending);
      const operation = map.get(operationId);

      if (operation) {
        pending.update(m => {
          m.delete(operationId);
          return new Map(m);
        });
        return operation.originalState;
      }

      return null;
    },

    // Check if ticket has pending operations
    hasPending(ticketId: string): boolean {
      const map = get(pending);
      for (const op of map.values()) {
        if (op.ticketId === ticketId) return true;
      }
      return false;
    },

    // Get all pending for a ticket
    getPendingForTicket(ticketId: string): PendingOperation[] {
      const map = get(pending);
      return Array.from(map.values()).filter(op => op.ticketId === ticketId);
    }
  };
}

export const optimisticStore = createOptimisticStore();
```

**Acceptance Criteria**:
- Operations tracked with IDs
- Rollback restores original state
- Visual indication of pending operations

---

### TASK-038: Add WebSocket Event Tests
**Priority**: High
**Estimated**: 1.5 hours

- [ ] Create WebSocket test utilities
- [ ] Test event emission
- [ ] Test event reception
- [ ] Test room management

```typescript
// tests/integration/websocket.test.ts
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { io, Socket } from 'socket.io-client';

describe('WebSocket Events', () => {
  let socket1: Socket;
  let socket2: Socket;
  const projectId = 'test-project-123';

  beforeAll(async () => {
    // Note: Requires running server
    // In CI, mock the server or use a test server
    socket1 = io('http://localhost:3000', { autoConnect: false });
    socket2 = io('http://localhost:3000', { autoConnect: false });
  });

  afterAll(() => {
    socket1?.disconnect();
    socket2?.disconnect();
  });

  describe('Room Management', () => {
    it('should join a project room', async () => {
      socket1.connect();

      const joinPromise = new Promise<void>((resolve) => {
        socket1.emit('project:join', projectId);
        // Server should acknowledge or we just proceed
        setTimeout(resolve, 100);
      });

      await joinPromise;
      expect(socket1.connected).toBe(true);
    });

    it('should receive events only for joined room', async () => {
      socket1.connect();
      socket2.connect();

      socket1.emit('project:join', projectId);
      // socket2 doesn't join

      const receivedEvents: any[] = [];
      socket2.on('ticket:created', (data) => receivedEvents.push(data));

      // Emit from socket1
      socket1.emit('ticket:create', {
        ticket: { id: 'ticket-1', title: 'Test' },
        projectId
      });

      // Wait for potential event
      await new Promise(r => setTimeout(r, 200));

      // socket2 shouldn't receive since it didn't join
      expect(receivedEvents.length).toBe(0);
    });
  });

  describe('Ticket Events', () => {
    it('should broadcast ticket:moved to room members', async () => {
      socket1.connect();
      socket2.connect();

      socket1.emit('project:join', projectId);
      socket2.emit('project:join', projectId);

      const receivedPromise = new Promise((resolve) => {
        socket2.on('ticket:moved', resolve);
      });

      socket1.emit('ticket:move', {
        ticketId: 'ticket-1',
        fromStatus: 'BACKLOG',
        toStatus: 'TODO',
        projectId
      });

      const received = await receivedPromise;
      expect(received).toMatchObject({
        ticketId: 'ticket-1',
        toStatus: 'TODO'
      });
    });
  });
});
```

**Acceptance Criteria**:
- Room join/leave tested
- Event broadcast tested
- Isolation between rooms verified

---

### TASK-039: Add Integration Tests for Real-time Updates
**Priority**: High
**Estimated**: 1.5 hours

- [ ] Test end-to-end ticket updates
- [ ] Test store synchronization
- [ ] Test optimistic update rollback
- [ ] Test reconnection behavior

```typescript
// tests/integration/realtime-updates.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { get } from 'svelte/store';
import { ticketStore, ticketsByStatus } from '$lib/stores/tickets';
import { optimisticStore } from '$lib/stores/optimistic';

describe('Real-time Store Updates', () => {
  const mockTicket = {
    id: 'ticket-1',
    title: 'Test Ticket',
    description: 'Description',
    status: 'BACKLOG' as const,
    priority: 'MEDIUM' as const,
    labels: [],
    position: 0,
    projectId: 'project-1',
    createdAt: new Date(),
    updatedAt: new Date()
  };

  beforeEach(() => {
    ticketStore.init([mockTicket]);
  });

  describe('Optimistic Updates', () => {
    it('should apply optimistic update immediately', () => {
      ticketStore.moveTicket('ticket-1', 'TODO');

      const state = get(ticketStore);
      const ticket = state.tickets.get('ticket-1');

      expect(ticket?.status).toBe('TODO');
    });

    it('should rollback on failure', () => {
      // Start optimistic operation
      const originalTicket = get(ticketStore).tickets.get('ticket-1')!;
      const opId = optimisticStore.startOperation(
        'move',
        'ticket-1',
        originalTicket,
        { status: 'TODO' }
      );

      // Apply optimistic update
      ticketStore.moveTicket('ticket-1', 'TODO');

      // Verify optimistic state
      expect(get(ticketStore).tickets.get('ticket-1')?.status).toBe('TODO');

      // Rollback
      const rolledBack = optimisticStore.rollbackOperation(opId);
      if (rolledBack) {
        ticketStore.rollback('ticket-1', rolledBack);
      }

      // Verify rollback
      expect(get(ticketStore).tickets.get('ticket-1')?.status).toBe('BACKLOG');
    });
  });

  describe('Remote Updates', () => {
    it('should apply remote ticket creation', () => {
      const newTicket = { ...mockTicket, id: 'ticket-2', title: 'New Ticket' };

      ticketStore.addTicket(newTicket);

      const state = get(ticketStore);
      expect(state.tickets.has('ticket-2')).toBe(true);
    });

    it('should apply remote ticket update', () => {
      const updatedTicket = { ...mockTicket, title: 'Updated Title' };

      ticketStore.updateTicket(updatedTicket);

      const state = get(ticketStore);
      expect(state.tickets.get('ticket-1')?.title).toBe('Updated Title');
    });

    it('should apply remote ticket deletion', () => {
      ticketStore.removeTicket('ticket-1');

      const state = get(ticketStore);
      expect(state.tickets.has('ticket-1')).toBe(false);
    });
  });

  describe('Derived Stores', () => {
    it('should group tickets by status', () => {
      ticketStore.init([
        { ...mockTicket, id: '1', status: 'BACKLOG' },
        { ...mockTicket, id: '2', status: 'TODO' },
        { ...mockTicket, id: '3', status: 'BACKLOG' }
      ]);

      const grouped = get(ticketsByStatus);

      expect(grouped.get('BACKLOG')?.length).toBe(2);
      expect(grouped.get('TODO')?.length).toBe(1);
    });
  });
});
```

**Acceptance Criteria**:
- Store operations tested
- Optimistic/rollback flow verified
- Derived stores work correctly

---

### TASK-040: Add Load Testing for WebSocket Connections
**Priority**: Medium
**Estimated**: 1 hour

- [ ] Create load test script
- [ ] Test multiple concurrent connections
- [ ] Measure event latency
- [ ] Document performance baseline

```typescript
// tests/load/websocket-load.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { io, Socket } from 'socket.io-client';

describe('WebSocket Load Testing', () => {
  const NUM_CLIENTS = 50;
  const clients: Socket[] = [];
  const projectId = 'load-test-project';

  beforeAll(async () => {
    // Create multiple clients
    for (let i = 0; i < NUM_CLIENTS; i++) {
      const client = io('http://localhost:3000', { autoConnect: false });
      clients.push(client);
    }
  });

  afterAll(() => {
    clients.forEach(c => c.disconnect());
  });

  it('should handle 50 concurrent connections', async () => {
    const connectPromises = clients.map(client =>
      new Promise<void>((resolve, reject) => {
        client.on('connect', () => resolve());
        client.on('connect_error', reject);
        client.connect();
      })
    );

    await Promise.all(connectPromises);

    const connected = clients.filter(c => c.connected);
    expect(connected.length).toBe(NUM_CLIENTS);
  });

  it('should broadcast to all room members with acceptable latency', async () => {
    // All clients join the same room
    clients.forEach(c => c.emit('project:join', projectId));

    // Wait for joins to complete
    await new Promise(r => setTimeout(r, 500));

    const latencies: number[] = [];
    const receivePromises: Promise<void>[] = [];

    // Set up listeners on all clients except first
    for (let i = 1; i < clients.length; i++) {
      const startTime = Date.now();
      receivePromises.push(
        new Promise<void>((resolve) => {
          clients[i].once('ticket:created', () => {
            latencies.push(Date.now() - startTime);
            resolve();
          });
        })
      );
    }

    // Emit from first client
    clients[0].emit('ticket:create', {
      ticket: { id: 'load-test-ticket', title: 'Load Test' },
      projectId
    });

    // Wait for all to receive (with timeout)
    await Promise.race([
      Promise.all(receivePromises),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), 5000)
      )
    ]);

    // Analyze latencies
    const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
    const maxLatency = Math.max(...latencies);
    const p95 = latencies.sort((a, b) => a - b)[Math.floor(latencies.length * 0.95)];

    console.log(`Load Test Results (${NUM_CLIENTS} clients):`);
    console.log(`  Average latency: ${avgLatency.toFixed(2)}ms`);
    console.log(`  Max latency: ${maxLatency}ms`);
    console.log(`  P95 latency: ${p95}ms`);

    // Assert acceptable performance
    expect(avgLatency).toBeLessThan(100);
    expect(p95).toBeLessThan(200);
  });
});
```

**Acceptance Criteria**:
- 50+ concurrent connections handled
- Average latency <100ms
- P95 latency <200ms
- Results documented

---

## Phase 2 Completion Checklist

Before moving to Phase 3, verify:

- [ ] All 20 tasks completed (TASK-021 to TASK-040)
- [ ] `npm test` passes with 80%+ coverage
- [ ] `npm run build` succeeds
- [ ] Real-time updates work across browser tabs
- [ ] Redis caching reduces database load
- [ ] Reconnection works with data sync
- [ ] Load test passes performance targets
- [ ] Implementation patterns stored in memory:

```bash
npx @claude-flow/cli@latest memory store \
  --key "impl-phase2-complete" \
  --value "Phase 2 complete. Socket.IO + Redis pub/sub. Optimistic UI with rollback. Svelte stores for reactive state. P95 latency <200ms." \
  --namespace cf-kanban-impl
```

---

## Next Phase Preview

**Phase 3: Claude Flow Integration (Weeks 9-12)**
- CLI command wrapper service
- Ticket analysis pipeline
- Agent assignment algorithm
- Swarm initialization workflow
- Swim-lane feedback loop implementation
