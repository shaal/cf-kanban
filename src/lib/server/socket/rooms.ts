/**
 * TASK-024: Room Management for Projects
 *
 * Manages WebSocket rooms for project-based real-time collaboration.
 * Tracks connected users per project and handles cleanup on disconnect.
 */

/**
 * User information stored for each socket in a room
 */
export interface RoomUser {
  socketId: string;
  userId?: string;
  userName?: string;
}

/**
 * Room Manager for handling project-based WebSocket rooms
 */
export class RoomManager {
  /** Map of room ID to array of users in the room */
  private rooms: Map<string, RoomUser[]> = new Map();

  /** Reverse index: socket ID to set of rooms */
  private socketRooms: Map<string, Set<string>> = new Map();

  /**
   * Add a socket to a project room
   * @param roomId - The project ID to use as room identifier
   * @param socketId - The socket ID joining the room
   * @param userInfo - Optional user information
   */
  joinRoom(roomId: string, socketId: string, userInfo: { userId?: string; userName?: string } = {}): void {
    // Get or create the room
    let room = this.rooms.get(roomId);
    if (!room) {
      room = [];
      this.rooms.set(roomId, room);
    }

    // Check if socket is already in room
    if (room.some((u) => u.socketId === socketId)) {
      return;
    }

    // Add user to room
    room.push({
      socketId,
      userId: userInfo.userId,
      userName: userInfo.userName
    });

    // Update reverse index
    let socketRoomSet = this.socketRooms.get(socketId);
    if (!socketRoomSet) {
      socketRoomSet = new Set();
      this.socketRooms.set(socketId, socketRoomSet);
    }
    socketRoomSet.add(roomId);
  }

  /**
   * Remove a socket from a specific room
   * @param roomId - The room to leave
   * @param socketId - The socket ID leaving the room
   */
  leaveRoom(roomId: string, socketId: string): void {
    const room = this.rooms.get(roomId);
    if (!room) {
      return;
    }

    // Remove user from room
    const index = room.findIndex((u) => u.socketId === socketId);
    if (index !== -1) {
      room.splice(index, 1);
    }

    // Clean up empty rooms
    if (room.length === 0) {
      this.rooms.delete(roomId);
    }

    // Update reverse index
    const socketRoomSet = this.socketRooms.get(socketId);
    if (socketRoomSet) {
      socketRoomSet.delete(roomId);
      if (socketRoomSet.size === 0) {
        this.socketRooms.delete(socketId);
      }
    }
  }

  /**
   * Remove a socket from all rooms (on disconnect)
   * @param socketId - The socket ID that disconnected
   * @returns Array of room IDs the socket was removed from
   */
  leaveAllRooms(socketId: string): string[] {
    const socketRoomSet = this.socketRooms.get(socketId);
    if (!socketRoomSet) {
      return [];
    }

    const leftRooms: string[] = [];

    for (const roomId of socketRoomSet) {
      const room = this.rooms.get(roomId);
      if (room) {
        const index = room.findIndex((u) => u.socketId === socketId);
        if (index !== -1) {
          room.splice(index, 1);
          leftRooms.push(roomId);
        }

        // Clean up empty rooms
        if (room.length === 0) {
          this.rooms.delete(roomId);
        }
      }
    }

    // Clean up socket's room set
    this.socketRooms.delete(socketId);

    return leftRooms;
  }

  /**
   * Get all users in a room
   * @param roomId - The room to query
   * @returns Array of users in the room
   */
  getUsersInRoom(roomId: string): RoomUser[] {
    return this.rooms.get(roomId) || [];
  }

  /**
   * Get the count of users in a room
   * @param roomId - The room to query
   * @returns Number of users in the room
   */
  getUserCount(roomId: string): number {
    const room = this.rooms.get(roomId);
    return room ? room.length : 0;
  }

  /**
   * Get all rooms a socket is in
   * @param socketId - The socket to query
   * @returns Array of room IDs
   */
  getRoomsForSocket(socketId: string): string[] {
    const socketRoomSet = this.socketRooms.get(socketId);
    return socketRoomSet ? Array.from(socketRoomSet) : [];
  }

  /**
   * Check if a socket is in a room
   * @param roomId - The room to check
   * @param socketId - The socket to check
   * @returns True if socket is in the room
   */
  isInRoom(roomId: string, socketId: string): boolean {
    const room = this.rooms.get(roomId);
    return room ? room.some((u) => u.socketId === socketId) : false;
  }

  /**
   * Get user info for a socket in a room
   * @param roomId - The room to query
   * @param socketId - The socket to query
   * @returns User info or undefined if not found
   */
  getSocketUser(roomId: string, socketId: string): RoomUser | undefined {
    const room = this.rooms.get(roomId);
    return room?.find((u) => u.socketId === socketId);
  }
}

/** Singleton instance of the room manager */
export const roomManager = new RoomManager();
