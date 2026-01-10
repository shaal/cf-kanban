# Production Monitoring Setup

## TASK-113: Monitoring and Observability

This document outlines the monitoring, logging, and alerting setup for CF-Kanban in production.

## Table of Contents

1. [Overview](#overview)
2. [Sentry Error Tracking](#sentry-error-tracking)
3. [Performance Monitoring](#performance-monitoring)
4. [Log Aggregation](#log-aggregation)
5. [Health Checks](#health-checks)
6. [Alerting Rules](#alerting-rules)
7. [Dashboards](#dashboards)

## Overview

CF-Kanban uses a comprehensive monitoring stack:

- **Error Tracking**: Sentry for error capture and alerting
- **Performance**: Custom metrics with Prometheus-compatible output
- **Logging**: Structured JSON logs for aggregation
- **Health Checks**: Kubernetes-compatible liveness/readiness probes

## Sentry Error Tracking

### Setup

1. Create a Sentry project at [sentry.io](https://sentry.io)
2. Get your DSN from Project Settings > Client Keys
3. Configure environment variables:

```bash
# Required
SENTRY_DSN=https://xxxx@xxxx.ingest.sentry.io/xxxxx

# Optional
SENTRY_ENVIRONMENT=production
SENTRY_RELEASE=cf-kanban@1.0.0
SENTRY_TRACES_SAMPLE_RATE=0.1  # 10% of transactions
SENTRY_PROFILES_SAMPLE_RATE=0.1  # 10% profiling
```

### Integration

The application automatically captures:

- Unhandled exceptions
- Rejected promises
- API errors (4xx/5xx)
- Slow queries (>1s)
- WebSocket errors

### Usage in Code

```typescript
import { captureError, captureMessage, setUser } from '$lib/server/monitoring';

// Capture an error with context
captureError(error, {
  level: 'error',
  tags: { component: 'tickets-api' },
  extra: { ticketId, userId }
});

// Capture a message
captureMessage('User completed onboarding', 'info', {
  userId,
  duration: 45000
});

// Set user context
setUser({
  id: user.id,
  email: user.email
});
```

### Alert Configuration

Configure Sentry alerts for:

| Alert | Condition | Action |
|-------|-----------|--------|
| Error spike | >10 errors in 10 min | Slack + PagerDuty |
| New issue | Any new error type | Slack |
| Error regression | Fixed issue reoccurs | Slack |
| Performance degradation | p95 latency >2s | Slack |

## Performance Monitoring

### Metrics Endpoint

The application exposes metrics at `/api/metrics` in Prometheus format:

```bash
curl http://localhost:3000/api/metrics
```

### Available Metrics

| Metric | Type | Description |
|--------|------|-------------|
| `http_requests_total` | Counter | Total HTTP requests by method, path, status |
| `http_request_duration_seconds` | Histogram | Request duration by method, path |
| `websocket_connections_active` | Gauge | Active WebSocket connections |
| `database_query_duration_seconds` | Histogram | Database query latency |
| `redis_operation_duration_seconds` | Histogram | Redis operation latency |
| `active_agents_count` | Gauge | Active AI agents by type |
| `ticket_transitions_total` | Counter | Ticket state transitions |
| `errors_total` | Counter | Error count by type and severity |

### Custom Metrics

Add custom metrics in your code:

```typescript
import {
  registerCounter,
  registerHistogram,
  httpRequestDuration
} from '$lib/server/monitoring/metrics';

// Track request duration
const endTimer = httpRequestDuration.startTimer({ method: 'GET', path: '/api/tickets' });
// ... handle request
endTimer();

// Custom counter
const myCounter = registerCounter('my_feature_usage', 'Feature usage count', ['feature']);
myCounter.inc({ feature: 'bulk-update' });
```

### Prometheus Configuration

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'cf-kanban'
    static_configs:
      - targets: ['cf-kanban:3000']
    metrics_path: '/api/metrics'
    scrape_interval: 15s
```

## Log Aggregation

### Structured Logging

All logs are output in JSON format for easy aggregation:

```json
{
  "timestamp": "2026-01-09T21:00:00.000Z",
  "level": "info",
  "message": "User created ticket",
  "service": "cf-kanban",
  "environment": "production",
  "version": "1.0.0",
  "userId": "user-123",
  "ticketId": "ticket-456",
  "duration": 45
}
```

### Log Levels

| Level | When to Use |
|-------|-------------|
| `debug` | Development debugging, verbose info |
| `info` | Normal operations, user actions |
| `warn` | Recoverable issues, deprecations |
| `error` | Errors requiring attention |
| `fatal` | Critical failures, service shutdown |

### Usage

```typescript
import logger from '$lib/server/monitoring/logger';

// Basic logging
logger.info('User logged in', { userId, ip: request.ip });
logger.warn('Rate limit approaching', { userId, remaining: 5 });
logger.error('Failed to create ticket', error, { ticketData });

// Request logging
logger.logRequest('POST', '/api/tickets', 201, 45, { userId });

// Child logger with context
const requestLogger = logger.createChildLogger({
  requestId: crypto.randomUUID(),
  userId
});
requestLogger.info('Processing request');
```

### Log Configuration

```bash
# Log level (debug, info, warn, error, fatal)
LOG_LEVEL=info

# Output format (json or pretty for development)
LOG_FORMAT=json

# Service name for aggregation
SERVICE_NAME=cf-kanban
```

### Log Aggregation Setup

#### Loki (Recommended with Grafana)

```yaml
# docker-compose.prod.yml addition
services:
  loki:
    image: grafana/loki:2.9.0
    ports:
      - "3100:3100"
    volumes:
      - ./loki-config.yaml:/etc/loki/local-config.yaml

  promtail:
    image: grafana/promtail:2.9.0
    volumes:
      - /var/log:/var/log
      - ./promtail-config.yaml:/etc/promtail/config.yml
```

#### Datadog

```bash
DD_API_KEY=your-api-key
DD_SITE=datadoghq.com
DD_LOGS_INJECTION=true
```

#### AWS CloudWatch

```bash
AWS_REGION=us-east-1
CLOUDWATCH_LOG_GROUP=/cf-kanban/production
```

## Health Checks

### Endpoints

| Endpoint | Purpose | Response |
|----------|---------|----------|
| `/api/health` | Full health check | 200/503 with component status |
| `/api/health/live` | Liveness probe | 200 if process alive |
| `/api/health/ready` | Readiness probe | 200 if ready for traffic |

### Health Response

```json
{
  "status": "healthy",
  "checks": [
    {
      "name": "database",
      "status": "healthy",
      "latencyMs": 5,
      "message": "PostgreSQL connection OK"
    },
    {
      "name": "redis",
      "status": "healthy",
      "latencyMs": 2,
      "message": "Redis connection OK",
      "details": {
        "memory": { "used": "10M", "peak": "15M" },
        "clients": 5
      }
    }
  ],
  "timestamp": "2026-01-09T21:00:00.000Z",
  "version": "1.0.0",
  "uptime": 86400
}
```

### Kubernetes Probes

```yaml
# kubernetes deployment
livenessProbe:
  httpGet:
    path: /api/health/live
    port: 3000
  initialDelaySeconds: 10
  periodSeconds: 30

readinessProbe:
  httpGet:
    path: /api/health/ready
    port: 3000
  initialDelaySeconds: 5
  periodSeconds: 10

startupProbe:
  httpGet:
    path: /api/health/ready
    port: 3000
  failureThreshold: 30
  periodSeconds: 10
```

## Alerting Rules

### Prometheus Alerting

```yaml
# alerting-rules.yml
groups:
  - name: cf-kanban
    rules:
      # Application alerts
      - alert: HighErrorRate
        expr: rate(errors_total[5m]) > 0.1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: High error rate detected
          description: Error rate is {{ $value }} errors/second

      - alert: SlowResponseTime
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 2
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: High p95 response time
          description: p95 latency is {{ $value }}s

      - alert: HighMemoryUsage
        expr: process_resident_memory_bytes / 1024 / 1024 > 400
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: High memory usage
          description: Memory usage is {{ $value }}MB

      # Infrastructure alerts
      - alert: DatabaseDown
        expr: up{job="postgresql"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: Database is down

      - alert: RedisDown
        expr: up{job="redis"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: Redis is down

      - alert: HighWebSocketConnections
        expr: websocket_connections_active > 1000
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: High WebSocket connection count
```

### Alertmanager Configuration

```yaml
# alertmanager.yml
global:
  slack_api_url: 'https://hooks.slack.com/services/xxx'
  pagerduty_url: 'https://events.pagerduty.com/v2/enqueue'

route:
  receiver: 'slack-notifications'
  group_by: ['alertname', 'severity']
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 4h

  routes:
    - match:
        severity: critical
      receiver: 'pagerduty-critical'
    - match:
        severity: warning
      receiver: 'slack-notifications'

receivers:
  - name: 'slack-notifications'
    slack_configs:
      - channel: '#cf-kanban-alerts'
        send_resolved: true
        title: '{{ .Status }}: {{ .Alerts.Firing | len }} alerts'
        text: '{{ range .Alerts }}{{ .Annotations.summary }}\n{{ end }}'

  - name: 'pagerduty-critical'
    pagerduty_configs:
      - service_key: 'your-pagerduty-key'
        severity: critical
```

## Dashboards

### Grafana Dashboard

Import the CF-Kanban dashboard (JSON available in `docs/dashboards/`):

**Key Panels:**

1. **Overview**
   - Request rate (req/s)
   - Error rate (%)
   - Response time (p50, p95, p99)
   - Active users

2. **API Performance**
   - Endpoint latency heatmap
   - Slowest endpoints
   - Error breakdown by endpoint

3. **WebSocket**
   - Active connections
   - Messages per second
   - Connection duration

4. **Database**
   - Query latency
   - Connection pool usage
   - Slow queries

5. **Redis**
   - Operations per second
   - Hit rate
   - Memory usage

### Example Dashboard JSON

```json
{
  "title": "CF-Kanban Production",
  "panels": [
    {
      "title": "Request Rate",
      "type": "graph",
      "targets": [
        {
          "expr": "rate(http_requests_total[1m])",
          "legendFormat": "{{method}} {{path}}"
        }
      ]
    },
    {
      "title": "Response Time (p95)",
      "type": "gauge",
      "targets": [
        {
          "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))"
        }
      ],
      "thresholds": [
        { "value": 0.1, "color": "green" },
        { "value": 0.5, "color": "yellow" },
        { "value": 1, "color": "red" }
      ]
    }
  ]
}
```

## Production Checklist

Before going to production, verify:

- [ ] Sentry DSN configured
- [ ] Sentry alerts configured for error spikes
- [ ] Metrics endpoint accessible
- [ ] Prometheus scraping metrics
- [ ] Log aggregation configured
- [ ] Health endpoints working
- [ ] Kubernetes probes configured
- [ ] Alertmanager rules configured
- [ ] PagerDuty integration for critical alerts
- [ ] Grafana dashboards created
- [ ] On-call rotation established
- [ ] Runbooks documented for common alerts
