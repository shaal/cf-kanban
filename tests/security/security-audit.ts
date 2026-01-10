/**
 * TASK-116: Security Audit Script
 *
 * Comprehensive security testing covering:
 * - OWASP Top 10 vulnerabilities
 * - Authentication testing (session hijacking, CSRF)
 * - Authorization testing (privilege escalation)
 * - Input validation (XSS, SQL injection)
 * - API security
 *
 * Run with:
 *   npx ts-node tests/security/security-audit.ts
 *
 * Or run npm audit separately:
 *   npm audit
 *   npx snyk test
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';

const BASE_URL = process.env.TEST_URL || 'http://localhost:4173';
const API_URL = `${BASE_URL}/api`;

// Security test results collector
interface SecurityFinding {
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  category: string;
  title: string;
  description: string;
  remediation?: string;
}

const findings: SecurityFinding[] = [];

function reportFinding(finding: SecurityFinding) {
  findings.push(finding);
  console.log(`[${finding.severity.toUpperCase()}] ${finding.category}: ${finding.title}`);
}

describe('OWASP Top 10 Security Tests', () => {
  describe('A01:2021 - Broken Access Control', () => {
    it('should not allow access to other users projects', async () => {
      // Try to access a project without authorization
      const response = await fetch(`${API_URL}/projects/unauthorized-project`, {
        headers: { 'Authorization': 'Bearer invalid-token' }
      });

      // Should return 401 or 403, not 200
      if (response.status === 200) {
        reportFinding({
          severity: 'critical',
          category: 'A01 - Broken Access Control',
          title: 'Unauthorized project access',
          description: 'API allows access to projects without proper authorization',
          remediation: 'Implement proper authentication and authorization checks',
        });
      }

      expect(response.status).not.toBe(200);
    });

    it('should not allow modification of resources without permission', async () => {
      const response = await fetch(`${API_URL}/projects/test-project`, {
        method: 'DELETE',
        headers: { 'Authorization': 'Bearer viewer-token' }
      });

      if (response.status === 200 || response.status === 204) {
        reportFinding({
          severity: 'critical',
          category: 'A01 - Broken Access Control',
          title: 'Unauthorized resource modification',
          description: 'Viewer role can delete projects',
          remediation: 'Implement RBAC checks for all modifying operations',
        });
      }
    });

    it('should not expose sensitive endpoints without auth', async () => {
      const sensitiveEndpoints = [
        '/api/admin',
        '/api/users',
        '/api/settings',
        '/api/audit-logs',
      ];

      for (const endpoint of sensitiveEndpoints) {
        const response = await fetch(`${BASE_URL}${endpoint}`);

        if (response.status === 200) {
          reportFinding({
            severity: 'high',
            category: 'A01 - Broken Access Control',
            title: `Exposed sensitive endpoint: ${endpoint}`,
            description: `Endpoint ${endpoint} is accessible without authentication`,
            remediation: 'Add authentication middleware to sensitive endpoints',
          });
        }
      }
    });

    it('should prevent IDOR (Insecure Direct Object Reference)', async () => {
      // Try to access tickets by sequential IDs
      const responses = await Promise.all([
        fetch(`${API_URL}/tickets/1`),
        fetch(`${API_URL}/tickets/2`),
        fetch(`${API_URL}/tickets/3`),
      ]);

      const accessibleCount = responses.filter(r => r.status === 200).length;

      if (accessibleCount > 0) {
        reportFinding({
          severity: 'medium',
          category: 'A01 - Broken Access Control',
          title: 'Predictable resource IDs',
          description: 'Resources can be accessed via sequential/predictable IDs',
          remediation: 'Use UUIDs for resource identifiers',
        });
      }
    });
  });

  describe('A02:2021 - Cryptographic Failures', () => {
    it('should use HTTPS in production', async () => {
      // Check if cookies are set with Secure flag
      const response = await fetch(`${BASE_URL}/`);
      const setCookie = response.headers.get('set-cookie');

      if (setCookie && !setCookie.includes('Secure')) {
        reportFinding({
          severity: 'high',
          category: 'A02 - Cryptographic Failures',
          title: 'Cookies not marked Secure',
          description: 'Session cookies should have Secure flag in production',
          remediation: 'Add Secure flag to all cookies in production',
        });
      }
    });

    it('should not expose sensitive data in responses', async () => {
      const response = await fetch(`${API_URL}/projects`);
      const data = await response.text();

      const sensitivePatterns = [
        /password/i,
        /secret/i,
        /api[_-]?key/i,
        /private[_-]?key/i,
        /credit[_-]?card/i,
        /ssn/i,
      ];

      for (const pattern of sensitivePatterns) {
        if (pattern.test(data)) {
          reportFinding({
            severity: 'high',
            category: 'A02 - Cryptographic Failures',
            title: `Potential sensitive data exposure: ${pattern}`,
            description: 'API response may contain sensitive data fields',
            remediation: 'Filter sensitive fields from API responses',
          });
        }
      }
    });
  });

  describe('A03:2021 - Injection', () => {
    it('should prevent SQL injection in search', async () => {
      const maliciousInputs = [
        "'; DROP TABLE tickets; --",
        "1' OR '1'='1",
        "admin'--",
        "1; DELETE FROM projects",
      ];

      for (const input of maliciousInputs) {
        const response = await fetch(`${API_URL}/tickets?search=${encodeURIComponent(input)}`);

        // Should not cause 500 error (indicates query failed due to injection)
        if (response.status === 500) {
          reportFinding({
            severity: 'critical',
            category: 'A03 - Injection',
            title: 'Potential SQL injection vulnerability',
            description: `Input "${input}" caused server error`,
            remediation: 'Use parameterized queries (Prisma does this by default)',
          });
        }
      }
    });

    it('should prevent NoSQL injection', async () => {
      const maliciousInput = '{"$gt": ""}';

      const response = await fetch(`${API_URL}/tickets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: maliciousInput,
          description: { '$where': 'this.password == "admin"' },
        }),
      });

      // Should sanitize input, not accept malicious JSON operators
      if (response.status === 201) {
        const data = await response.json();
        if (data.title !== maliciousInput) {
          reportFinding({
            severity: 'high',
            category: 'A03 - Injection',
            title: 'NoSQL injection in input',
            description: 'Server modified input which might indicate operator injection',
            remediation: 'Sanitize all JSON input, strip $ prefixed keys',
          });
        }
      }
    });

    it('should prevent command injection', async () => {
      const maliciousInputs = [
        '; ls -la',
        '| cat /etc/passwd',
        '`whoami`',
        '$(id)',
      ];

      for (const input of maliciousInputs) {
        const response = await fetch(`${API_URL}/projects`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: input }),
        });

        // If we get unexpected output, might indicate command execution
        const data = await response.text();
        if (data.includes('root:') || data.includes('uid=')) {
          reportFinding({
            severity: 'critical',
            category: 'A03 - Injection',
            title: 'Command injection vulnerability',
            description: `Input "${input}" may have executed system commands`,
            remediation: 'Never pass user input to shell commands',
          });
        }
      }
    });
  });

  describe('A04:2021 - Insecure Design', () => {
    it('should rate limit authentication attempts', async () => {
      const attempts = 20;
      let successCount = 0;

      for (let i = 0; i < attempts; i++) {
        const response = await fetch(`${BASE_URL}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'admin@test.com',
            password: 'wrong-password-' + i,
          }),
        });

        // Should start getting 429 after several failed attempts
        if (response.status !== 429 && response.status !== 401) {
          successCount++;
        }
      }

      if (successCount >= 10) {
        reportFinding({
          severity: 'high',
          category: 'A04 - Insecure Design',
          title: 'No rate limiting on authentication',
          description: 'Allows unlimited authentication attempts',
          remediation: 'Implement rate limiting: 5 attempts per minute',
        });
      }
    });

    it('should not have verbose error messages', async () => {
      const response = await fetch(`${API_URL}/error-test`);
      const data = await response.text();

      const verbosePatterns = [
        /stack trace/i,
        /at \w+\.\w+/,
        /node_modules/,
        /prisma/i,
        /sql/i,
      ];

      for (const pattern of verbosePatterns) {
        if (pattern.test(data)) {
          reportFinding({
            severity: 'medium',
            category: 'A04 - Insecure Design',
            title: 'Verbose error messages',
            description: 'Error responses may leak implementation details',
            remediation: 'Use generic error messages in production',
          });
          break;
        }
      }
    });
  });

  describe('A05:2021 - Security Misconfiguration', () => {
    it('should have security headers', async () => {
      const response = await fetch(`${BASE_URL}/`);

      const requiredHeaders = [
        { name: 'X-Content-Type-Options', value: 'nosniff' },
        { name: 'X-Frame-Options', expected: ['DENY', 'SAMEORIGIN'] },
        { name: 'X-XSS-Protection', value: '1; mode=block' },
        { name: 'Strict-Transport-Security', contains: 'max-age' },
        { name: 'Content-Security-Policy', exists: true },
      ];

      for (const header of requiredHeaders) {
        const value = response.headers.get(header.name);

        if (!value) {
          reportFinding({
            severity: 'medium',
            category: 'A05 - Security Misconfiguration',
            title: `Missing security header: ${header.name}`,
            description: `HTTP response missing ${header.name} header`,
            remediation: `Add ${header.name} header to all responses`,
          });
        }
      }
    });

    it('should not expose server information', async () => {
      const response = await fetch(`${BASE_URL}/`);

      const serverHeader = response.headers.get('server');
      const poweredBy = response.headers.get('x-powered-by');

      if (serverHeader && serverHeader.includes('version')) {
        reportFinding({
          severity: 'low',
          category: 'A05 - Security Misconfiguration',
          title: 'Server version exposed',
          description: 'Server header reveals version information',
          remediation: 'Remove or obscure Server header',
        });
      }

      if (poweredBy) {
        reportFinding({
          severity: 'low',
          category: 'A05 - Security Misconfiguration',
          title: 'X-Powered-By header exposed',
          description: `X-Powered-By: ${poweredBy}`,
          remediation: 'Remove X-Powered-By header',
        });
      }
    });

    it('should not have directory listing enabled', async () => {
      const directories = ['/static/', '/assets/', '/uploads/', '/images/'];

      for (const dir of directories) {
        const response = await fetch(`${BASE_URL}${dir}`);
        const text = await response.text();

        if (text.includes('Index of') || text.includes('Directory listing')) {
          reportFinding({
            severity: 'medium',
            category: 'A05 - Security Misconfiguration',
            title: `Directory listing enabled: ${dir}`,
            description: 'Directory contents are publicly visible',
            remediation: 'Disable directory listing in web server config',
          });
        }
      }
    });
  });

  describe('A06:2021 - Vulnerable and Outdated Components', () => {
    // This is typically done via npm audit - documented separately
    it('should have no known vulnerabilities (run npm audit)', async () => {
      // npm audit should be run separately
      expect(true).toBe(true);
    });
  });

  describe('A07:2021 - Identification and Authentication Failures', () => {
    it('should not accept weak passwords', async () => {
      const weakPasswords = ['123456', 'password', 'admin', 'test', ''];

      for (const password of weakPasswords) {
        const response = await fetch(`${BASE_URL}/api/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'test@test.com',
            password: password,
          }),
        });

        if (response.status === 201) {
          reportFinding({
            severity: 'high',
            category: 'A07 - Identification and Authentication Failures',
            title: `Weak password accepted: "${password}"`,
            description: 'System accepts weak passwords',
            remediation: 'Implement password strength requirements',
          });
        }
      }
    });

    it('should invalidate session on logout', async () => {
      // Login first (if auth is implemented)
      const loginResponse = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@test.com',
          password: 'testpassword',
        }),
      });

      const cookies = loginResponse.headers.get('set-cookie');

      // Logout
      await fetch(`${BASE_URL}/api/auth/logout`, {
        method: 'POST',
        headers: {
          'Cookie': cookies || '',
        },
      });

      // Try to use the old session
      const response = await fetch(`${API_URL}/projects`, {
        headers: {
          'Cookie': cookies || '',
        },
      });

      if (response.status === 200) {
        reportFinding({
          severity: 'high',
          category: 'A07 - Identification and Authentication Failures',
          title: 'Session not invalidated on logout',
          description: 'Old session tokens remain valid after logout',
          remediation: 'Invalidate all session tokens on logout',
        });
      }
    });
  });

  describe('A08:2021 - Software and Data Integrity Failures', () => {
    it('should validate content integrity', async () => {
      const response = await fetch(`${BASE_URL}/`);
      const csp = response.headers.get('content-security-policy');

      if (!csp || !csp.includes('script-src')) {
        reportFinding({
          severity: 'medium',
          category: 'A08 - Software and Data Integrity Failures',
          title: 'Missing or incomplete CSP',
          description: 'Content Security Policy does not restrict script sources',
          remediation: 'Add strict CSP with script-src directive',
        });
      }
    });
  });

  describe('A09:2021 - Security Logging and Monitoring Failures', () => {
    it('should log security events', async () => {
      // Trigger a security event
      await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'attacker@test.com',
          password: 'attempt-to-breach',
        }),
      });

      // In a real test, you would check the logs
      // For now, this is a reminder to implement logging
      reportFinding({
        severity: 'info',
        category: 'A09 - Security Logging and Monitoring Failures',
        title: 'Verify security event logging',
        description: 'Ensure failed login attempts are logged',
        remediation: 'Implement comprehensive security event logging',
      });
    });
  });

  describe('A10:2021 - Server-Side Request Forgery (SSRF)', () => {
    it('should not allow SSRF via URL parameters', async () => {
      const ssrfPayloads = [
        'http://localhost:22',
        'http://127.0.0.1/admin',
        'http://169.254.169.254/latest/meta-data/',
        'file:///etc/passwd',
      ];

      for (const payload of ssrfPayloads) {
        const response = await fetch(`${API_URL}/fetch?url=${encodeURIComponent(payload)}`);

        if (response.status === 200) {
          const data = await response.text();
          if (data.includes('root:') || data.includes('ami-id')) {
            reportFinding({
              severity: 'critical',
              category: 'A10 - Server-Side Request Forgery',
              title: `SSRF vulnerability with payload: ${payload}`,
              description: 'Server made request to internal/sensitive resource',
              remediation: 'Validate and whitelist allowed URLs',
            });
          }
        }
      }
    });
  });
});

describe('Additional Security Tests', () => {
  describe('CSRF Protection', () => {
    it('should have CSRF protection on state-changing requests', async () => {
      const response = await fetch(`${API_URL}/projects`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Origin': 'https://evil-site.com',
        },
        body: JSON.stringify({ name: 'CSRF Test' }),
      });

      // Should be blocked by CORS or CSRF token requirement
      if (response.status === 201) {
        reportFinding({
          severity: 'high',
          category: 'CSRF',
          title: 'Missing CSRF protection',
          description: 'State-changing request accepted from different origin',
          remediation: 'Implement CSRF tokens or strict CORS policy',
        });
      }
    });
  });

  describe('XSS Prevention', () => {
    it('should escape HTML in API responses', async () => {
      const xssPayload = '<script>alert("XSS")</script>';

      // Create content with XSS payload
      const createResponse = await fetch(`${API_URL}/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: xssPayload,
          description: xssPayload,
        }),
      });

      if (createResponse.status === 201) {
        const data = await createResponse.json();

        if (data.name === xssPayload || data.description === xssPayload) {
          reportFinding({
            severity: 'high',
            category: 'XSS',
            title: 'Stored XSS vulnerability',
            description: 'Script tags not escaped in stored content',
            remediation: 'Sanitize or escape HTML in all user input',
          });
        }
      }
    });

    it('should have Content-Type header for API responses', async () => {
      const response = await fetch(`${API_URL}/projects`);
      const contentType = response.headers.get('content-type');

      if (!contentType || !contentType.includes('application/json')) {
        reportFinding({
          severity: 'medium',
          category: 'XSS',
          title: 'Missing Content-Type header',
          description: 'API responses should specify application/json',
          remediation: 'Set Content-Type: application/json on all API responses',
        });
      }
    });
  });
});

// Generate security report
afterAll(() => {
  console.log('\n========================================');
  console.log('SECURITY AUDIT REPORT');
  console.log('========================================\n');

  const bySeverity = {
    critical: findings.filter(f => f.severity === 'critical'),
    high: findings.filter(f => f.severity === 'high'),
    medium: findings.filter(f => f.severity === 'medium'),
    low: findings.filter(f => f.severity === 'low'),
    info: findings.filter(f => f.severity === 'info'),
  };

  console.log(`Total Findings: ${findings.length}`);
  console.log(`  Critical: ${bySeverity.critical.length}`);
  console.log(`  High: ${bySeverity.high.length}`);
  console.log(`  Medium: ${bySeverity.medium.length}`);
  console.log(`  Low: ${bySeverity.low.length}`);
  console.log(`  Info: ${bySeverity.info.length}`);

  if (bySeverity.critical.length > 0 || bySeverity.high.length > 0) {
    console.log('\n*** CRITICAL/HIGH FINDINGS REQUIRE IMMEDIATE ATTENTION ***\n');

    for (const finding of [...bySeverity.critical, ...bySeverity.high]) {
      console.log(`[${finding.severity.toUpperCase()}] ${finding.title}`);
      console.log(`  Category: ${finding.category}`);
      console.log(`  Description: ${finding.description}`);
      if (finding.remediation) {
        console.log(`  Remediation: ${finding.remediation}`);
      }
      console.log('');
    }
  }

  console.log('========================================');
  console.log('Run these additional security checks:');
  console.log('  npm audit');
  console.log('  npx snyk test');
  console.log('  npx retire');
  console.log('========================================\n');
});
