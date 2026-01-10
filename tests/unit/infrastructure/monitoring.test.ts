/**
 * TASK-113: Monitoring Module Tests
 *
 * Tests for Sentry integration, metrics collection, logging, and health checks.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock environment variables
vi.stubEnv('NODE_ENV', 'test');
vi.stubEnv('SENTRY_DSN', '');
vi.stubEnv('LOG_LEVEL', 'debug');
vi.stubEnv('LOG_FORMAT', 'json');

describe('Monitoring Module', () => {
  describe('Sentry Integration', () => {
    let sentry: typeof import('$lib/server/monitoring/sentry');

    beforeEach(async () => {
      vi.resetModules();
      sentry = await import('$lib/server/monitoring/sentry');
      sentry.clearErrorBuffer();
    });

    it('should get Sentry config from environment', () => {
      const config = sentry.getSentryConfig();
      expect(config).toHaveProperty('dsn');
      expect(config).toHaveProperty('environment');
      expect(config).toHaveProperty('tracesSampleRate');
      expect(config.tracesSampleRate).toBeLessThanOrEqual(1);
    });

    it('should detect when Sentry is disabled', () => {
      expect(sentry.isSentryEnabled()).toBe(false);
    });

    it('should capture error and return event ID', () => {
      const error = new Error('Test error');
      const eventId = sentry.captureError(error);

      expect(eventId).toBeDefined();
      expect(typeof eventId).toBe('string');
      expect(eventId.length).toBeGreaterThan(0);
    });

    it('should capture error with context', () => {
      const error = new Error('Test error');
      const eventId = sentry.captureError(error, {
        level: 'warning',
        tags: { component: 'test' },
        extra: { testData: 123 },
        user: { id: 'user-123' }
      });

      expect(eventId).toBeDefined();
    });

    it('should capture message', () => {
      const eventId = sentry.captureMessage('Test message', 'info', {
        testKey: 'testValue'
      });

      expect(eventId).toBeDefined();
    });

    it('should manage user context', () => {
      expect(() => sentry.setUser({ id: 'user-123' })).not.toThrow();
      expect(() => sentry.setUser(null)).not.toThrow();
    });

    it('should add breadcrumb', () => {
      expect(() => sentry.addBreadcrumb({
        category: 'test',
        message: 'Test breadcrumb',
        level: 'info'
      })).not.toThrow();
    });

    describe('Performance Transactions', () => {
      it('should start and finish transaction', () => {
        const transaction = sentry.startTransaction('test-transaction', 'http.request');

        expect(transaction).toHaveProperty('name', 'test-transaction');
        expect(transaction).toHaveProperty('op', 'http.request');
        expect(transaction).toHaveProperty('startTimestamp');
        expect(transaction.spans).toEqual([]);

        sentry.finishTransaction(transaction, 'ok');
        expect(transaction).toHaveProperty('endTimestamp');
        expect(transaction).toHaveProperty('status', 'ok');
      });

      it('should start and finish span within transaction', () => {
        const transaction = sentry.startTransaction('test', 'test');
        const span = sentry.startSpan(transaction, 'db-query', 'db.query');

        expect(span).toHaveProperty('name', 'db-query');
        expect(span).toHaveProperty('op', 'db.query');
        expect(transaction.spans).toContain(span);

        sentry.finishSpan(span, 'ok');
        expect(span).toHaveProperty('endTimestamp');
        expect(span).toHaveProperty('status', 'ok');
      });
    });

    describe('Error Buffer', () => {
      it('should buffer errors', () => {
        const error = new Error('Buffered error');
        sentry.captureError(error);

        const buffered = sentry.getBufferedErrors();
        expect(buffered.length).toBeGreaterThan(0);
      });

      it('should clear error buffer', () => {
        sentry.captureError(new Error('Test'));
        sentry.clearErrorBuffer();

        expect(sentry.getBufferedErrors()).toHaveLength(0);
      });

      it('should flush errors', async () => {
        sentry.captureError(new Error('Test 1'));
        sentry.captureError(new Error('Test 2'));

        const count = await sentry.flushErrors();
        expect(count).toBe(2);
        expect(sentry.getBufferedErrors()).toHaveLength(0);
      });
    });
  });

  describe('Metrics Collection', () => {
    let metrics: typeof import('$lib/server/monitoring/metrics');

    beforeEach(async () => {
      vi.resetModules();
      metrics = await import('$lib/server/monitoring/metrics');
      metrics.resetMetrics();
    });

    describe('Counter', () => {
      it('should register and increment counter', () => {
        const counter = metrics.registerCounter('test_counter', 'Test counter');

        counter.inc();
        expect(counter.get()).toBe(1);

        counter.inc(undefined, 5);
        expect(counter.get()).toBe(6);
      });

      it('should support labels', () => {
        const counter = metrics.registerCounter('test_labeled', 'Test', ['method']);

        counter.inc({ method: 'GET' });
        counter.inc({ method: 'POST' }, 2);

        expect(counter.get({ method: 'GET' })).toBe(1);
        expect(counter.get({ method: 'POST' })).toBe(2);
      });
    });

    describe('Gauge', () => {
      it('should register and set gauge', () => {
        const gauge = metrics.registerGauge('test_gauge', 'Test gauge');

        gauge.set(42);
        expect(gauge.get()).toBe(42);

        gauge.set(100);
        expect(gauge.get()).toBe(100);
      });

      it('should increment and decrement', () => {
        const gauge = metrics.registerGauge('test_gauge_inc', 'Test');

        gauge.set(10);
        gauge.inc();
        expect(gauge.get()).toBe(11);

        gauge.dec(undefined, 3);
        expect(gauge.get()).toBe(8);
      });
    });

    describe('Histogram', () => {
      it('should register and observe values', () => {
        const histogram = metrics.registerHistogram('test_histogram', 'Test histogram');

        histogram.observe(0.5);
        histogram.observe(1.5);
        histogram.observe(0.1);

        const value = histogram.get();
        expect(value.count).toBe(3);
        expect(value.sum).toBe(2.1);
      });

      it('should provide timer function', async () => {
        const histogram = metrics.registerHistogram('test_timer', 'Test');

        const endTimer = histogram.startTimer();
        await new Promise(resolve => setTimeout(resolve, 50));
        endTimer();

        const value = histogram.get();
        expect(value.count).toBe(1);
        expect(value.sum).toBeGreaterThan(0.04);
      });
    });

    describe('Pre-defined Metrics', () => {
      it('should have HTTP request metrics', () => {
        expect(metrics.httpRequestsTotal).toBeDefined();
        expect(metrics.httpRequestDuration).toBeDefined();
      });

      it('should have WebSocket metrics', () => {
        expect(metrics.websocketConnectionsActive).toBeDefined();
      });

      it('should have database metrics', () => {
        expect(metrics.databaseQueryDuration).toBeDefined();
      });

      it('should have Redis metrics', () => {
        expect(metrics.redisOperationDuration).toBeDefined();
      });
    });

    describe('Output', () => {
      it('should generate Prometheus format output', () => {
        const counter = metrics.registerCounter('output_test', 'Test counter');
        counter.inc();

        const output = metrics.getMetricsOutput();
        expect(output).toContain('# HELP output_test Test counter');
        expect(output).toContain('# TYPE output_test counter');
        expect(output).toContain('output_test 1');
      });

      it('should generate JSON output', () => {
        const counter = metrics.registerCounter('json_test', 'Test');
        counter.inc({ label: 'value' });

        const json = metrics.getMetricsJson();
        expect(json).toHaveProperty('json_test');
      });
    });
  });

  describe('Logger', () => {
    let logger: typeof import('$lib/server/monitoring/logger');
    let consoleSpy: ReturnType<typeof vi.spyOn>;
    let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(async () => {
      vi.resetModules();
      logger = await import('$lib/server/monitoring/logger');
      consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      logger.clearGlobalContext();
    });

    afterEach(() => {
      consoleSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });

    it('should log at info level', () => {
      logger.info('Test message');

      expect(consoleSpy).toHaveBeenCalled();
      const output = consoleSpy.mock.calls[0][0];
      expect(output).toContain('info');
      expect(output).toContain('Test message');
    });

    it('should log at debug level', () => {
      logger.debug('Debug message');

      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should log at warn level', () => {
      logger.warn('Warning message');

      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should log at error level', () => {
      logger.error('Error message', new Error('Test error'));

      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('should include context in log', () => {
      logger.info('Test', { userId: 'user-123', action: 'test' });

      const output = consoleSpy.mock.calls[0][0];
      expect(output).toContain('userId');
      expect(output).toContain('user-123');
    });

    it('should set and use global context', () => {
      logger.setGlobalContext({ requestId: 'req-123' });
      logger.info('Test message');

      const output = consoleSpy.mock.calls[0][0];
      expect(output).toContain('requestId');
      expect(output).toContain('req-123');
    });

    it('should create child logger with context', () => {
      const childLogger = logger.createChildLogger({ component: 'test' });
      childLogger.info('Child log');

      const output = consoleSpy.mock.calls[0][0];
      expect(output).toContain('component');
      expect(output).toContain('test');
    });

    it('should log HTTP requests', () => {
      logger.logRequest('GET', '/api/test', 200, 45, { userId: 'user-123' });

      expect(consoleSpy).toHaveBeenCalled();
      const output = consoleSpy.mock.calls[0][0];
      expect(output).toContain('GET');
      expect(output).toContain('/api/test');
      expect(output).toContain('200');
    });
  });

  describe('Health Checks', () => {
    // These tests would require mocking database and Redis connections
    // For now, we test the structure

    it('should export health check functions', async () => {
      const health = await import('$lib/server/monitoring/health');

      expect(health.checkHealth).toBeDefined();
      expect(health.checkLiveness).toBeDefined();
      expect(health.checkReadiness).toBeDefined();
      expect(health.getSystemMetrics).toBeDefined();
      expect(health.generateHealthResponse).toBeDefined();
    });

    it('should return liveness check', async () => {
      const health = await import('$lib/server/monitoring/health');
      const result = health.checkLiveness();

      expect(result).toHaveProperty('status', 'ok');
      expect(result).toHaveProperty('timestamp');
    });

    it('should return system metrics', async () => {
      const health = await import('$lib/server/monitoring/health');
      const metrics = health.getSystemMetrics();

      expect(metrics).toHaveProperty('uptime');
      expect(metrics.uptime).toBeGreaterThanOrEqual(0);
      expect(metrics).toHaveProperty('memory');
      expect(metrics.memory).toHaveProperty('used');
      expect(metrics.memory).toHaveProperty('total');
      expect(metrics.memory).toHaveProperty('percentage');
    });
  });
});
