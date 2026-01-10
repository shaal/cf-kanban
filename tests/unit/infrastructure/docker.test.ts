/**
 * TASK-109: Docker Configuration Tests
 *
 * Tests to verify Docker configuration is valid and follows best practices.
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const PROJECT_ROOT = path.resolve(__dirname, '../../..');

describe('Docker Configuration', () => {
  describe('Dockerfile', () => {
    const dockerfilePath = path.join(PROJECT_ROOT, 'Dockerfile');

    it('should exist', () => {
      expect(fs.existsSync(dockerfilePath)).toBe(true);
    });

    it('should use multi-stage build', () => {
      const content = fs.readFileSync(dockerfilePath, 'utf-8');
      const fromStatements = content.match(/^FROM /gm);
      expect(fromStatements?.length).toBeGreaterThanOrEqual(2);
    });

    it('should use Node.js 20 LTS', () => {
      const content = fs.readFileSync(dockerfilePath, 'utf-8');
      expect(content).toMatch(/FROM node:20/);
    });

    it('should use alpine for production', () => {
      const content = fs.readFileSync(dockerfilePath, 'utf-8');
      expect(content).toMatch(/node:20.*alpine/);
    });

    it('should set non-root user', () => {
      const content = fs.readFileSync(dockerfilePath, 'utf-8');
      expect(content).toMatch(/USER\s+(node|app|nonroot|sveltekit)/);
    });

    it('should expose port 3000', () => {
      const content = fs.readFileSync(dockerfilePath, 'utf-8');
      expect(content).toMatch(/EXPOSE\s+3000/);
    });

    it('should define health check', () => {
      const content = fs.readFileSync(dockerfilePath, 'utf-8');
      expect(content).toMatch(/HEALTHCHECK/);
    });

    it('should copy package files before source for caching', () => {
      const content = fs.readFileSync(dockerfilePath, 'utf-8');
      const packageCopyIndex = content.indexOf('package*.json');
      const srcCopyIndex = content.lastIndexOf('COPY . .');
      expect(packageCopyIndex).toBeLessThan(srcCopyIndex);
    });
  });

  describe('docker-compose.prod.yml', () => {
    const composePath = path.join(PROJECT_ROOT, 'docker-compose.prod.yml');

    it('should exist', () => {
      expect(fs.existsSync(composePath)).toBe(true);
    });

    it('should define app service', () => {
      const content = fs.readFileSync(composePath, 'utf-8');
      expect(content).toMatch(/services:[\s\S]*app:/);
    });

    it('should define postgres service', () => {
      const content = fs.readFileSync(composePath, 'utf-8');
      expect(content).toMatch(/services:[\s\S]*postgres:/);
    });

    it('should define redis service', () => {
      const content = fs.readFileSync(composePath, 'utf-8');
      expect(content).toMatch(/services:[\s\S]*redis:/);
    });

    it('should include health checks for all services', () => {
      const content = fs.readFileSync(composePath, 'utf-8');
      // Count healthcheck occurrences - should be at least 3 (app, postgres, redis)
      const healthchecks = content.match(/healthcheck:/g);
      expect(healthchecks?.length).toBeGreaterThanOrEqual(3);
    });

    it('should use environment variables for secrets', () => {
      const content = fs.readFileSync(composePath, 'utf-8');
      expect(content).toMatch(/\$\{[A-Z_]+\}/);
    });

    it('should define persistent volumes', () => {
      const content = fs.readFileSync(composePath, 'utf-8');
      expect(content).toMatch(/volumes:/);
      expect(content).toMatch(/pgdata:/);
      expect(content).toMatch(/redisdata:/);
    });

    it('should define network', () => {
      const content = fs.readFileSync(composePath, 'utf-8');
      expect(content).toMatch(/networks:/);
    });

    it('should set resource limits', () => {
      const content = fs.readFileSync(composePath, 'utf-8');
      expect(content).toMatch(/deploy:/);
      expect(content).toMatch(/resources:/);
      expect(content).toMatch(/limits:/);
    });

    it('should configure depends_on with health conditions', () => {
      const content = fs.readFileSync(composePath, 'utf-8');
      expect(content).toMatch(/depends_on:/);
      expect(content).toMatch(/condition:\s*service_healthy/);
    });

    it('should set restart policy', () => {
      const content = fs.readFileSync(composePath, 'utf-8');
      expect(content).toMatch(/restart:\s*(always|unless-stopped)/);
    });
  });

  describe('.env.production.example', () => {
    const envPath = path.join(PROJECT_ROOT, '.env.production.example');

    it('should exist', () => {
      expect(fs.existsSync(envPath)).toBe(true);
    });

    it('should define DATABASE_URL', () => {
      const content = fs.readFileSync(envPath, 'utf-8');
      expect(content).toMatch(/DATABASE_URL=/);
    });

    it('should define REDIS_URL', () => {
      const content = fs.readFileSync(envPath, 'utf-8');
      expect(content).toMatch(/REDIS_URL=/);
    });

    it('should define NODE_ENV', () => {
      const content = fs.readFileSync(envPath, 'utf-8');
      expect(content).toMatch(/NODE_ENV=production/);
    });

    it('should define SENTRY_DSN placeholder', () => {
      const content = fs.readFileSync(envPath, 'utf-8');
      expect(content).toMatch(/SENTRY_DSN=/);
    });

    it('should not contain actual secrets', () => {
      const content = fs.readFileSync(envPath, 'utf-8');
      // Should have placeholder values, not actual secrets
      expect(content).toMatch(/your[-_]?|changeme|placeholder|example/i);
    });
  });

  describe('.dockerignore', () => {
    const ignorePath = path.join(PROJECT_ROOT, '.dockerignore');

    it('should exist', () => {
      expect(fs.existsSync(ignorePath)).toBe(true);
    });

    it('should ignore node_modules', () => {
      const content = fs.readFileSync(ignorePath, 'utf-8');
      expect(content).toMatch(/node_modules/);
    });

    it('should ignore .git', () => {
      const content = fs.readFileSync(ignorePath, 'utf-8');
      expect(content).toMatch(/\.git/);
    });

    it('should ignore .env files', () => {
      const content = fs.readFileSync(ignorePath, 'utf-8');
      expect(content).toMatch(/\.env/);
    });

    it('should ignore test files', () => {
      const content = fs.readFileSync(ignorePath, 'utf-8');
      expect(content).toMatch(/test/i);
    });
  });
});
