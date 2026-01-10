/**
 * TASK-113: Performance Metrics Collection
 *
 * Collects and exposes application metrics for monitoring.
 * Compatible with Prometheus/Grafana stack.
 */

// Metric types
export type MetricType = 'counter' | 'gauge' | 'histogram' | 'summary';

// Metric definition
export interface MetricDefinition {
  name: string;
  type: MetricType;
  help: string;
  labelNames?: string[];
}

// Counter metric
export interface Counter {
  inc(labels?: Record<string, string>, value?: number): void;
  get(labels?: Record<string, string>): number;
}

// Gauge metric
export interface Gauge {
  set(value: number, labels?: Record<string, string>): void;
  inc(labels?: Record<string, string>, value?: number): void;
  dec(labels?: Record<string, string>, value?: number): void;
  get(labels?: Record<string, string>): number;
}

// Histogram metric
export interface Histogram {
  observe(value: number, labels?: Record<string, string>): void;
  startTimer(labels?: Record<string, string>): () => void;
  get(labels?: Record<string, string>): HistogramValue;
}

export interface HistogramValue {
  count: number;
  sum: number;
  buckets: Map<number, number>;
}

// In-memory metrics storage
const counters = new Map<string, Map<string, number>>();
const gauges = new Map<string, Map<string, number>>();
const histograms = new Map<string, Map<string, HistogramValue>>();
const definitions = new Map<string, MetricDefinition>();

// Default histogram buckets
const DEFAULT_BUCKETS = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10];

/**
 * Create a label key from labels object
 */
function labelsToKey(labels?: Record<string, string>): string {
  if (!labels || Object.keys(labels).length === 0) return '';
  return Object.entries(labels)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}="${v}"`)
    .join(',');
}

/**
 * Register a counter metric
 */
export function registerCounter(
  name: string,
  help: string,
  labelNames?: string[]
): Counter {
  definitions.set(name, { name, type: 'counter', help, labelNames });
  counters.set(name, new Map());

  return {
    inc(labels?: Record<string, string>, value = 1) {
      const key = labelsToKey(labels);
      const metric = counters.get(name)!;
      metric.set(key, (metric.get(key) || 0) + value);
    },
    get(labels?: Record<string, string>) {
      const key = labelsToKey(labels);
      return counters.get(name)?.get(key) || 0;
    }
  };
}

/**
 * Register a gauge metric
 */
export function registerGauge(
  name: string,
  help: string,
  labelNames?: string[]
): Gauge {
  definitions.set(name, { name, type: 'gauge', help, labelNames });
  gauges.set(name, new Map());

  return {
    set(value: number, labels?: Record<string, string>) {
      const key = labelsToKey(labels);
      gauges.get(name)!.set(key, value);
    },
    inc(labels?: Record<string, string>, value = 1) {
      const key = labelsToKey(labels);
      const metric = gauges.get(name)!;
      metric.set(key, (metric.get(key) || 0) + value);
    },
    dec(labels?: Record<string, string>, value = 1) {
      const key = labelsToKey(labels);
      const metric = gauges.get(name)!;
      metric.set(key, (metric.get(key) || 0) - value);
    },
    get(labels?: Record<string, string>) {
      const key = labelsToKey(labels);
      return gauges.get(name)?.get(key) || 0;
    }
  };
}

/**
 * Register a histogram metric
 */
export function registerHistogram(
  name: string,
  help: string,
  labelNames?: string[],
  buckets = DEFAULT_BUCKETS
): Histogram {
  definitions.set(name, { name, type: 'histogram', help, labelNames });
  histograms.set(name, new Map());

  const createValue = (): HistogramValue => ({
    count: 0,
    sum: 0,
    buckets: new Map(buckets.map(b => [b, 0]))
  });

  return {
    observe(value: number, labels?: Record<string, string>) {
      const key = labelsToKey(labels);
      const metric = histograms.get(name)!;
      if (!metric.has(key)) {
        metric.set(key, createValue());
      }
      const hist = metric.get(key)!;
      hist.count++;
      hist.sum += value;
      for (const bucket of buckets) {
        if (value <= bucket) {
          hist.buckets.set(bucket, (hist.buckets.get(bucket) || 0) + 1);
        }
      }
    },
    startTimer(labels?: Record<string, string>) {
      const start = process.hrtime.bigint();
      return () => {
        const end = process.hrtime.bigint();
        const duration = Number(end - start) / 1e9; // Convert to seconds
        this.observe(duration, labels);
      };
    },
    get(labels?: Record<string, string>) {
      const key = labelsToKey(labels);
      return histograms.get(name)?.get(key) || createValue();
    }
  };
}

// Pre-defined application metrics
export const httpRequestsTotal = registerCounter(
  'http_requests_total',
  'Total number of HTTP requests',
  ['method', 'path', 'status']
);

export const httpRequestDuration = registerHistogram(
  'http_request_duration_seconds',
  'HTTP request duration in seconds',
  ['method', 'path']
);

export const websocketConnectionsActive = registerGauge(
  'websocket_connections_active',
  'Number of active WebSocket connections',
  ['project_id']
);

export const databaseQueryDuration = registerHistogram(
  'database_query_duration_seconds',
  'Database query duration in seconds',
  ['operation', 'table']
);

export const redisOperationDuration = registerHistogram(
  'redis_operation_duration_seconds',
  'Redis operation duration in seconds',
  ['operation']
);

export const activeAgents = registerGauge(
  'active_agents_count',
  'Number of active AI agents',
  ['agent_type']
);

export const ticketTransitions = registerCounter(
  'ticket_transitions_total',
  'Total number of ticket state transitions',
  ['from_status', 'to_status']
);

export const errorsTotal = registerCounter(
  'errors_total',
  'Total number of errors',
  ['type', 'severity']
);

/**
 * Generate Prometheus-compatible metrics output
 */
export function getMetricsOutput(): string {
  const lines: string[] = [];

  // Output counters
  for (const [name, values] of counters) {
    const def = definitions.get(name)!;
    lines.push(`# HELP ${name} ${def.help}`);
    lines.push(`# TYPE ${name} counter`);
    for (const [labels, value] of values) {
      const labelStr = labels ? `{${labels}}` : '';
      lines.push(`${name}${labelStr} ${value}`);
    }
  }

  // Output gauges
  for (const [name, values] of gauges) {
    const def = definitions.get(name)!;
    lines.push(`# HELP ${name} ${def.help}`);
    lines.push(`# TYPE ${name} gauge`);
    for (const [labels, value] of values) {
      const labelStr = labels ? `{${labels}}` : '';
      lines.push(`${name}${labelStr} ${value}`);
    }
  }

  // Output histograms
  for (const [name, values] of histograms) {
    const def = definitions.get(name)!;
    lines.push(`# HELP ${name} ${def.help}`);
    lines.push(`# TYPE ${name} histogram`);
    for (const [labels, hist] of values) {
      const baseLabel = labels ? `${labels},` : '';
      for (const [bucket, count] of hist.buckets) {
        lines.push(`${name}_bucket{${baseLabel}le="${bucket}"} ${count}`);
      }
      lines.push(`${name}_bucket{${baseLabel}le="+Inf"} ${hist.count}`);
      lines.push(`${name}_sum{${labels}} ${hist.sum}`);
      lines.push(`${name}_count{${labels}} ${hist.count}`);
    }
  }

  return lines.join('\n');
}

/**
 * Reset all metrics (for testing)
 */
export function resetMetrics(): void {
  counters.clear();
  gauges.clear();
  histograms.clear();
}

/**
 * Get metrics as JSON (for debugging)
 */
export function getMetricsJson(): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [name, values] of counters) {
    result[name] = Object.fromEntries(values);
  }

  for (const [name, values] of gauges) {
    result[name] = Object.fromEntries(values);
  }

  for (const [name, values] of histograms) {
    result[name] = Object.fromEntries(
      Array.from(values.entries()).map(([k, v]) => [
        k,
        {
          count: v.count,
          sum: v.sum,
          buckets: Object.fromEntries(v.buckets)
        }
      ])
    );
  }

  return result;
}
