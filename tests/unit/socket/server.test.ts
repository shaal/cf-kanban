/**
 * TASK-021: Socket.IO Server Tests (TDD - RED Phase)
 *
 * Tests for Socket.IO server setup and configuration.
 * Note: These tests focus on configuration, not actual server creation
 * since Socket.IO requires a real HTTP server.
 */

import { describe, it, expect } from 'vitest';
import { getSocketServerConfig } from '$lib/server/socket/config';

describe('Socket Server Configuration', () => {
  describe('getSocketServerConfig', () => {
    it('should return CORS configuration for development', () => {
      const config = getSocketServerConfig('development');

      expect(config.cors).toBeDefined();
      expect(config.cors.origin).toBeDefined();
      expect(config.cors.methods).toContain('GET');
      expect(config.cors.methods).toContain('POST');
    });

    it('should return stricter CORS for production', () => {
      const config = getSocketServerConfig('production');

      expect(config.cors).toBeDefined();
      // In production, origin should be more restrictive
      expect(config.cors.credentials).toBe(true);
    });

    it('should set default connection settings', () => {
      const config = getSocketServerConfig('development');

      expect(config.pingTimeout).toBeDefined();
      expect(config.pingInterval).toBeDefined();
    });

    it('should prefer WebSocket transport', () => {
      const config = getSocketServerConfig('development');

      expect(config.transports).toBeDefined();
      expect(config.transports[0]).toBe('websocket');
    });

    it('should have polling as fallback', () => {
      const config = getSocketServerConfig('development');

      expect(config.transports).toContain('polling');
    });
  });
});
