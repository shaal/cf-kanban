/**
 * Socket Module Exports
 *
 * Re-exports all socket-related functionality for easy imports.
 */

export { createSocketServer, setGlobalIO, getGlobalIO } from './server';
export { getSocketServerConfig, getDefaultSocketUrl } from './config';
export type { SocketServerConfig } from './config';

export { RoomManager, roomManager } from './rooms';
export type { RoomUser } from './rooms';

export { authenticateSocket, extractUserFromToken, generateAnonymousUser, requireAuthentication } from './auth';
export type { AuthenticatedUser } from './auth';

export { createTicketHandlers, createProjectHandlers, handleDisconnect } from './handlers';
export type { TicketHandlers, ProjectHandlers } from './handlers';
