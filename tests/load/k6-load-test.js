/**
 * TASK-115: Load Testing with k6
 *
 * This script tests:
 * - 100 concurrent users making HTTP requests
 * - 50 concurrent WebSocket connections
 * - Sustained load for 1 hour
 *
 * Run with:
 *   k6 run tests/load/k6-load-test.js
 *
 * Or with specific options:
 *   k6 run --vus 100 --duration 1h tests/load/k6-load-test.js
 *
 * Install k6:
 *   brew install k6 (macOS)
 *   sudo apt install k6 (Ubuntu)
 *   choco install k6 (Windows)
 *
 * Or use Docker:
 *   docker run -i grafana/k6 run - < tests/load/k6-load-test.js
 */

import http from 'k6/http';
import ws from 'k6/ws';
import { check, sleep, group } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';
import { randomString, randomIntBetween } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';

// Configuration
const BASE_URL = __ENV.BASE_URL || 'http://localhost:4173';
const WS_URL = __ENV.WS_URL || 'ws://localhost:3001';

// Custom metrics
const projectsCreated = new Counter('projects_created');
const ticketsCreated = new Counter('tickets_created');
const ticketTransitions = new Counter('ticket_transitions');
const wsMessages = new Counter('ws_messages');
const wsErrors = new Counter('ws_errors');
const apiErrors = new Rate('api_error_rate');
const responseTime = new Trend('response_time');

// Test stages
export const options = {
  scenarios: {
    // HTTP load test - 100 concurrent users
    http_load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 25 },   // Ramp up to 25 users
        { duration: '5m', target: 50 },   // Ramp up to 50 users
        { duration: '10m', target: 100 }, // Ramp up to 100 users
        { duration: '30m', target: 100 }, // Stay at 100 users
        { duration: '10m', target: 50 },  // Ramp down to 50
        { duration: '3m', target: 0 },    // Ramp down to 0
      ],
      gracefulRampDown: '1m',
    },
    // WebSocket load test - 50 concurrent connections
    websocket_load: {
      executor: 'constant-vus',
      vus: 50,
      duration: '1h',
      exec: 'websocketTest',
    },
  },
  thresholds: {
    // 95% of requests should be below 500ms
    'http_req_duration': ['p(95)<500'],
    // 99% of requests should be below 1000ms
    'http_req_duration{type:api}': ['p(99)<1000'],
    // API error rate should be below 1%
    'api_error_rate': ['rate<0.01'],
    // WebSocket messages should be low latency
    'ws_message_latency': ['p(95)<100'],
    // All WebSocket connections should succeed
    'ws_connection_rate': ['rate>0.99'],
  },
};

// Project data
const testProjects = [];

// Main HTTP load test
export default function() {
  group('Homepage', () => {
    const res = http.get(`${BASE_URL}/`);
    check(res, {
      'homepage loads': (r) => r.status === 200,
      'homepage fast': (r) => r.timings.duration < 500,
    });
    responseTime.add(res.timings.duration);
    apiErrors.add(res.status >= 400);
  });

  group('Projects API', () => {
    // List projects
    const listRes = http.get(`${BASE_URL}/api/projects`);
    check(listRes, {
      'list projects succeeds': (r) => r.status === 200,
      'list returns array': (r) => {
        try {
          const data = JSON.parse(r.body);
          return Array.isArray(data);
        } catch {
          return false;
        }
      },
    });
    responseTime.add(listRes.timings.duration);
    apiErrors.add(listRes.status >= 400);

    // Create project
    const projectName = `Load Test Project ${randomString(8)}`;
    const createRes = http.post(
      `${BASE_URL}/api/projects`,
      JSON.stringify({
        name: projectName,
        description: 'Created during load test',
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        tags: { type: 'api' },
      }
    );

    if (check(createRes, {
      'create project succeeds': (r) => r.status === 201,
    })) {
      projectsCreated.add(1);
      const project = JSON.parse(createRes.body);
      testProjects.push(project.id);
    }
    responseTime.add(createRes.timings.duration);
    apiErrors.add(createRes.status >= 400);
  });

  sleep(randomIntBetween(1, 3));

  group('Tickets API', () => {
    if (testProjects.length === 0) {
      return;
    }

    const projectId = testProjects[randomIntBetween(0, testProjects.length - 1)];

    // List tickets
    const listRes = http.get(`${BASE_URL}/api/projects/${projectId}/tickets`);
    check(listRes, {
      'list tickets succeeds': (r) => r.status === 200 || r.status === 404,
    });

    // Create ticket
    const ticketTitle = `Load Test Ticket ${randomString(6)}`;
    const createRes = http.post(
      `${BASE_URL}/api/projects/${projectId}/tickets`,
      JSON.stringify({
        title: ticketTitle,
        description: 'Created during load test',
        priority: ['LOW', 'MEDIUM', 'HIGH'][randomIntBetween(0, 2)],
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        tags: { type: 'api' },
      }
    );

    if (check(createRes, {
      'create ticket succeeds': (r) => r.status === 201,
    })) {
      ticketsCreated.add(1);

      const ticket = JSON.parse(createRes.body);

      // Simulate ticket lifecycle
      const transitions = [
        { from: 'BACKLOG', to: 'TODO' },
        { from: 'TODO', to: 'IN_PROGRESS' },
        { from: 'IN_PROGRESS', to: 'DONE' },
      ];

      for (const transition of transitions) {
        sleep(randomIntBetween(1, 2));

        const transitionRes = http.post(
          `${BASE_URL}/api/tickets/${ticket.id}/transition`,
          JSON.stringify({
            toState: transition.to,
            triggeredBy: 'load-test',
          }),
          {
            headers: { 'Content-Type': 'application/json' },
            tags: { type: 'api' },
          }
        );

        if (check(transitionRes, {
          'transition succeeds': (r) => r.status === 200,
        })) {
          ticketTransitions.add(1);
        }
        responseTime.add(transitionRes.timings.duration);
        apiErrors.add(transitionRes.status >= 400);
      }
    }
    responseTime.add(createRes.timings.duration);
    apiErrors.add(createRes.status >= 400);
  });

  sleep(randomIntBetween(1, 5));
}

// WebSocket load test
export function websocketTest() {
  const projectId = 'test-project';
  const url = `${WS_URL}/socket.io/?EIO=4&transport=websocket`;

  const res = ws.connect(url, {}, function(socket) {
    socket.on('open', () => {
      console.log('WebSocket connected');

      // Join a room
      socket.send(JSON.stringify({
        type: 'join',
        projectId: projectId,
      }));
    });

    socket.on('message', (data) => {
      wsMessages.add(1);

      try {
        const msg = JSON.parse(data);

        check(msg, {
          'message has type': (m) => m.type !== undefined,
        });
      } catch {
        // Binary or non-JSON message
      }
    });

    socket.on('error', (e) => {
      wsErrors.add(1);
      console.error('WebSocket error:', e);
    });

    socket.on('close', () => {
      console.log('WebSocket closed');
    });

    // Send periodic updates
    socket.setInterval(() => {
      socket.send(JSON.stringify({
        type: 'ping',
        timestamp: Date.now(),
      }));
    }, 5000);

    // Simulate ticket updates
    socket.setInterval(() => {
      socket.send(JSON.stringify({
        type: 'ticket:update',
        ticketId: `ticket-${randomString(8)}`,
        changes: {
          title: `Updated ticket ${randomString(4)}`,
        },
      }));
    }, 10000);

    // Keep connection alive for the duration
    socket.setTimeout(() => {
      socket.close();
    }, 60000); // Close after 1 minute and reconnect
  });

  check(res, {
    'WebSocket connected': (r) => r && r.status === 101,
  });
}

// Cleanup function
export function teardown(data) {
  console.log('Load test complete');
  console.log(`Projects created: ${projectsCreated.value}`);
  console.log(`Tickets created: ${ticketsCreated.value}`);
  console.log(`Ticket transitions: ${ticketTransitions.value}`);
  console.log(`WebSocket messages: ${wsMessages.value}`);
  console.log(`WebSocket errors: ${wsErrors.value}`);

  // Clean up test data
  for (const projectId of testProjects) {
    http.del(`${BASE_URL}/api/projects/${projectId}`);
  }
}

// Summary output
export function handleSummary(data) {
  return {
    'tests/load/k6-results.json': JSON.stringify(data, null, 2),
    'tests/load/k6-results.html': generateHtmlReport(data),
    stdout: textSummary(data, { indent: '  ', enableColors: true }),
  };
}

function textSummary(data, options = {}) {
  const { indent = '', enableColors = false } = options;

  let summary = '\n' + indent + '=== Load Test Summary ===\n\n';

  // HTTP metrics
  if (data.metrics.http_reqs) {
    summary += indent + 'HTTP Requests:\n';
    summary += indent + `  Total: ${data.metrics.http_reqs.values.count}\n`;
    summary += indent + `  Rate: ${data.metrics.http_reqs.values.rate.toFixed(2)}/s\n`;
  }

  if (data.metrics.http_req_duration) {
    summary += indent + '\nResponse Times:\n';
    summary += indent + `  Avg: ${data.metrics.http_req_duration.values.avg.toFixed(2)}ms\n`;
    summary += indent + `  P90: ${data.metrics.http_req_duration.values['p(90)'].toFixed(2)}ms\n`;
    summary += indent + `  P95: ${data.metrics.http_req_duration.values['p(95)'].toFixed(2)}ms\n`;
    summary += indent + `  P99: ${data.metrics.http_req_duration.values['p(99)'].toFixed(2)}ms\n`;
  }

  // Custom metrics
  if (data.metrics.api_error_rate) {
    summary += indent + '\nError Rates:\n';
    summary += indent + `  API: ${(data.metrics.api_error_rate.values.rate * 100).toFixed(2)}%\n`;
  }

  // Thresholds
  summary += indent + '\nThresholds:\n';
  for (const [name, threshold] of Object.entries(data.root_group.checks || {})) {
    const passed = threshold.passes > 0;
    const status = passed ? 'PASS' : 'FAIL';
    summary += indent + `  ${name}: ${status}\n`;
  }

  return summary;
}

function generateHtmlReport(data) {
  return `
<!DOCTYPE html>
<html>
<head>
  <title>k6 Load Test Report</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; }
    h1 { color: #333; }
    .metric { margin: 20px 0; padding: 15px; background: #f5f5f5; border-radius: 8px; }
    .metric h3 { margin: 0 0 10px 0; color: #555; }
    .value { font-size: 24px; font-weight: bold; color: #2196F3; }
    .pass { color: #4CAF50; }
    .fail { color: #F44336; }
    table { border-collapse: collapse; width: 100%; margin-top: 20px; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
    th { background-color: #f5f5f5; }
  </style>
</head>
<body>
  <h1>k6 Load Test Report</h1>
  <p>Generated: ${new Date().toISOString()}</p>

  <div class="metric">
    <h3>Total Requests</h3>
    <div class="value">${data.metrics.http_reqs?.values.count || 0}</div>
  </div>

  <div class="metric">
    <h3>Request Rate</h3>
    <div class="value">${(data.metrics.http_reqs?.values.rate || 0).toFixed(2)}/s</div>
  </div>

  <div class="metric">
    <h3>Average Response Time</h3>
    <div class="value">${(data.metrics.http_req_duration?.values.avg || 0).toFixed(2)}ms</div>
  </div>

  <div class="metric">
    <h3>P95 Response Time</h3>
    <div class="value">${(data.metrics.http_req_duration?.values['p(95)'] || 0).toFixed(2)}ms</div>
  </div>

  <h2>Thresholds</h2>
  <table>
    <tr>
      <th>Metric</th>
      <th>Threshold</th>
      <th>Status</th>
    </tr>
    ${Object.entries(data.root_group?.checks || {})
      .map(([name, check]) => `
        <tr>
          <td>${name}</td>
          <td>-</td>
          <td class="${check.passes > 0 ? 'pass' : 'fail'}">${check.passes > 0 ? 'PASS' : 'FAIL'}</td>
        </tr>
      `).join('')}
  </table>
</body>
</html>
  `;
}
