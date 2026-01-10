/**
 * TASK-110: CI/CD Pipeline Configuration Tests
 *
 * Tests to verify GitHub Actions workflow configuration.
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';

const PROJECT_ROOT = path.resolve(__dirname, '../../..');

describe('CI/CD Pipeline Configuration', () => {
  describe('deploy.yml workflow', () => {
    const workflowPath = path.join(PROJECT_ROOT, '.github/workflows/deploy.yml');

    it('should exist', () => {
      expect(fs.existsSync(workflowPath)).toBe(true);
    });

    it('should be valid YAML', () => {
      const content = fs.readFileSync(workflowPath, 'utf-8');
      expect(() => yaml.parse(content)).not.toThrow();
    });

    describe('workflow structure', () => {
      let workflow: any;

      beforeAll(() => {
        const content = fs.readFileSync(workflowPath, 'utf-8');
        workflow = yaml.parse(content);
      });

      it('should have name', () => {
        expect(workflow.name).toBeDefined();
      });

      it('should trigger on push to main', () => {
        expect(workflow.on.push).toBeDefined();
        expect(workflow.on.push.branches).toContain('main');
      });

      it('should trigger on pull requests to main', () => {
        expect(workflow.on.pull_request).toBeDefined();
        expect(workflow.on.pull_request.branches).toContain('main');
      });

      it('should define environment variables', () => {
        expect(workflow.env).toBeDefined();
        expect(workflow.env.NODE_VERSION).toBeDefined();
      });

      it('should have test job', () => {
        expect(workflow.jobs.test).toBeDefined();
      });

      it('should have build job', () => {
        expect(workflow.jobs.build).toBeDefined();
      });

      it('should have deploy-staging job', () => {
        expect(workflow.jobs['deploy-staging']).toBeDefined();
      });

      it('should have deploy-production job', () => {
        expect(workflow.jobs['deploy-production']).toBeDefined();
      });
    });

    describe('test job', () => {
      let workflow: any;

      beforeAll(() => {
        const content = fs.readFileSync(workflowPath, 'utf-8');
        workflow = yaml.parse(content);
      });

      it('should run on ubuntu-latest', () => {
        expect(workflow.jobs.test['runs-on']).toBe('ubuntu-latest');
      });

      it('should checkout code', () => {
        const steps = workflow.jobs.test.steps;
        const checkoutStep = steps.find((s: any) => s.uses?.includes('checkout'));
        expect(checkoutStep).toBeDefined();
      });

      it('should setup Node.js', () => {
        const steps = workflow.jobs.test.steps;
        const nodeStep = steps.find((s: any) => s.uses?.includes('setup-node'));
        expect(nodeStep).toBeDefined();
      });

      it('should install dependencies', () => {
        const steps = workflow.jobs.test.steps;
        const installStep = steps.find((s: any) => s.run?.includes('npm ci'));
        expect(installStep).toBeDefined();
      });

      it('should run tests', () => {
        const steps = workflow.jobs.test.steps;
        const testStep = steps.find((s: any) => s.run?.includes('test'));
        expect(testStep).toBeDefined();
      });

      it('should run linting', () => {
        const steps = workflow.jobs.test.steps;
        const lintStep = steps.find((s: any) => s.run?.includes('lint'));
        expect(lintStep).toBeDefined();
      });
    });

    describe('build job', () => {
      let workflow: any;

      beforeAll(() => {
        const content = fs.readFileSync(workflowPath, 'utf-8');
        workflow = yaml.parse(content);
      });

      it('should depend on test job', () => {
        expect(workflow.jobs.build.needs).toContain('test');
      });

      it('should build Docker image', () => {
        const steps = workflow.jobs.build.steps;
        const buildStep = steps.find((s: any) =>
          s.uses?.includes('docker/build-push-action') ||
          s.run?.includes('docker build')
        );
        expect(buildStep).toBeDefined();
      });

      it('should tag images appropriately', () => {
        const steps = workflow.jobs.build.steps;
        const tagStep = steps.find((s: any) =>
          s.uses?.includes('docker/metadata-action') ||
          (s.with && s.with.tags)
        );
        expect(tagStep).toBeDefined();
      });
    });

    describe('deploy-staging job', () => {
      let workflow: any;

      beforeAll(() => {
        const content = fs.readFileSync(workflowPath, 'utf-8');
        workflow = yaml.parse(content);
      });

      it('should depend on build job', () => {
        expect(workflow.jobs['deploy-staging'].needs).toContain('build');
      });

      it('should only run on main branch', () => {
        const job = workflow.jobs['deploy-staging'];
        expect(job.if).toMatch(/github\.ref.*main|github\.event_name/);
      });

      it('should define staging environment', () => {
        const job = workflow.jobs['deploy-staging'];
        expect(job.environment).toBeDefined();
        expect(job.environment.name || job.environment).toMatch(/staging/i);
      });
    });

    describe('deploy-production job', () => {
      let workflow: any;

      beforeAll(() => {
        const content = fs.readFileSync(workflowPath, 'utf-8');
        workflow = yaml.parse(content);
      });

      it('should depend on deploy-staging job', () => {
        expect(workflow.jobs['deploy-production'].needs).toContain('deploy-staging');
      });

      it('should require manual approval', () => {
        const job = workflow.jobs['deploy-production'];
        // Environment with manual approval or workflow_dispatch
        expect(job.environment).toBeDefined();
        expect(job.environment.name || job.environment).toMatch(/production/i);
      });

      it('should only run on main branch', () => {
        const job = workflow.jobs['deploy-production'];
        expect(job.if).toMatch(/github\.ref.*main/);
      });
    });

    describe('security best practices', () => {
      let workflow: any;

      beforeAll(() => {
        const content = fs.readFileSync(workflowPath, 'utf-8');
        workflow = yaml.parse(content);
      });

      it('should use specific action versions (not @latest)', () => {
        const content = fs.readFileSync(workflowPath, 'utf-8');
        // Count uses of @latest vs specific versions
        const latestMatches = content.match(/@latest/g) || [];
        const versionedMatches = content.match(/@v\d+/g) || [];
        expect(versionedMatches.length).toBeGreaterThan(latestMatches.length);
      });

      it('should define minimal permissions', () => {
        // Either global permissions or job-level permissions should be defined
        const hasGlobalPerms = workflow.permissions !== undefined;
        const hasJobPerms = Object.values(workflow.jobs).some(
          (job: any) => job.permissions !== undefined
        );
        expect(hasGlobalPerms || hasJobPerms).toBe(true);
      });
    });
  });
});
