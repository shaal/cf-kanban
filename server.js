/**
 * TASK-021: Custom Server with Socket.IO
 *
 * This is a custom Node.js server that integrates SvelteKit with Socket.IO.
 * Run this instead of the default Vite dev server when you need WebSocket support.
 *
 * Usage:
 *   Development: node server.js
 *   Production: node build/server.js (after building with adapter-node)
 */

import { createServer } from 'http';
import { Server } from 'socket.io';
import { handler } from './build/handler.js';

const PORT = process.env.PORT || 3000;

// Create HTTP server
const server = createServer(handler);

// Create Socket.IO server with CORS configuration
const io = new Server(server, {
  cors: {
    origin: ['http://localhost:5173', 'http://localhost:4173', 'http://localhost:3000'],
    methods: ['GET', 'POST'],
    credentials: true
  },
  pingTimeout: 60000,
  pingInterval: 25000,
  transports: ['websocket', 'polling']
});

// Simple in-memory room tracking
const rooms = new Map();
let anonymousCounter = 0;

// Authentication middleware
io.use((socket, next) => {
  const token = socket.handshake.auth?.token || socket.handshake.query?.token;

  if (token && token.startsWith('mock-token:')) {
    const parts = token.split(':');
    socket.data = {
      userId: parts[1],
      userName: parts.slice(2).join(':') || '',
      isAuthenticated: true
    };
  } else {
    anonymousCounter++;
    socket.data = {
      userId: `anon-${Date.now()}-${anonymousCounter}`,
      userName: `Anonymous ${anonymousCounter}`,
      isAuthenticated: false
    };
  }

  next();
});

// Handle connections
io.on('connection', (socket) => {
  console.log(`[Socket.IO] Connected: ${socket.id} (${socket.data.userName})`);

  // Project handlers
  socket.on('project:join', async (payload, callback) => {
    const { projectId } = payload;

    await socket.join(projectId);
    socket.data.currentProject = projectId;

    // Track in rooms map
    if (!rooms.has(projectId)) {
      rooms.set(projectId, new Map());
    }
    rooms.get(projectId).set(socket.id, {
      socketId: socket.id,
      userId: socket.data.userId,
      userName: socket.data.userName
    });

    const users = Array.from(rooms.get(projectId).values()).map(
      (u) => u.userName || u.userId || 'Anonymous'
    );

    socket.to(projectId).emit('user:joined', {
      projectId,
      userId: socket.data.userId,
      userName: socket.data.userName
    });

    callback?.({ success: true, users });
  });

  socket.on('project:leave', async (payload) => {
    const { projectId } = payload;

    socket.to(projectId).emit('user:left', {
      projectId,
      userId: socket.data.userId
    });

    await socket.leave(projectId);

    if (rooms.has(projectId)) {
      rooms.get(projectId).delete(socket.id);
      if (rooms.get(projectId).size === 0) {
        rooms.delete(projectId);
      }
    }

    if (socket.data.currentProject === projectId) {
      socket.data.currentProject = undefined;
    }
  });

  // Ticket handlers
  socket.on('ticket:move', (payload, callback) => {
    const { projectId } = payload;

    if (!rooms.has(projectId) || !rooms.get(projectId).has(socket.id)) {
      callback?.({
        success: false,
        error: { code: 'NOT_IN_PROJECT', message: 'You must join the project first' }
      });
      return;
    }

    socket.to(projectId).emit('ticket:moved', payload);
    callback?.({ success: true });
  });

  socket.on('ticket:create', (payload, callback) => {
    const { projectId, ticket } = payload;

    if (!rooms.has(projectId) || !rooms.get(projectId).has(socket.id)) {
      callback?.({
        success: false,
        error: { code: 'NOT_IN_PROJECT', message: 'You must join the project first' }
      });
      return;
    }

    const createdTicket = {
      id: `ticket-${Date.now()}`,
      ...ticket,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    socket.to(projectId).emit('ticket:created', { projectId, ticket: createdTicket });
    callback?.({ success: true, ticket: createdTicket });
  });

  socket.on('ticket:update', (payload, callback) => {
    const { projectId } = payload;

    if (!rooms.has(projectId) || !rooms.get(projectId).has(socket.id)) {
      callback?.({
        success: false,
        error: { code: 'NOT_IN_PROJECT', message: 'You must join the project first' }
      });
      return;
    }

    socket.to(projectId).emit('ticket:updated', payload);
    callback?.({ success: true });
  });

  socket.on('ticket:delete', (payload, callback) => {
    const { projectId } = payload;

    if (!rooms.has(projectId) || !rooms.get(projectId).has(socket.id)) {
      callback?.({
        success: false,
        error: { code: 'NOT_IN_PROJECT', message: 'You must join the project first' }
      });
      return;
    }

    socket.to(projectId).emit('ticket:deleted', payload);
    callback?.({ success: true });
  });

  // Handle disconnect
  socket.on('disconnect', (reason) => {
    console.log(`[Socket.IO] Disconnected: ${socket.id} (${reason})`);

    // Clean up from all rooms
    for (const [projectId, roomUsers] of rooms.entries()) {
      if (roomUsers.has(socket.id)) {
        socket.to(projectId).emit('user:left', {
          projectId,
          userId: socket.data.userId
        });
        roomUsers.delete(socket.id);
        if (roomUsers.size === 0) {
          rooms.delete(projectId);
        }
      }
    }
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`[Server] Running on http://localhost:${PORT}`);
  console.log(`[Socket.IO] WebSocket server ready`);
});
