/**
 * TASK-021: Socket.IO Server Configuration
 *
 * Configuration for Socket.IO server that doesn't require importing socket.io.
 * This allows for easier testing of configuration values.
 */

/**
 * Socket.IO server configuration options
 */
export interface SocketServerConfig {
  cors: {
    origin: string | string[] | boolean;
    methods: string[];
    credentials: boolean;
  };
  pingTimeout: number;
  pingInterval: number;
  transports: ('websocket' | 'polling')[];
}

/**
 * Get Socket.IO server configuration based on environment
 * @param env - The current environment (development, production, test)
 * @returns Socket.IO configuration object
 */
export function getSocketServerConfig(env: string = 'development'): SocketServerConfig {
  const isDevelopment = env === 'development' || env === 'test';

  return {
    cors: {
      // In development, allow all origins for easier testing
      origin: isDevelopment
        ? ['http://localhost:5173', 'http://localhost:4173', 'http://localhost:3000']
        : true,
      methods: ['GET', 'POST'],
      credentials: true
    },
    // Ping settings for connection health
    pingTimeout: 60000,
    pingInterval: 25000,
    // Prefer WebSocket, fall back to polling
    transports: ['websocket', 'polling']
  };
}

/**
 * Default Socket.IO server URL for client connections
 */
export function getDefaultSocketUrl(env: string = 'development'): string {
  if (env === 'development') {
    return 'http://localhost:3001';
  }
  // In production, connect to same origin
  return '';
}
