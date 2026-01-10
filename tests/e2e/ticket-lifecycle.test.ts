/**
 * TASK-065: E2E Tests for Full Ticket Lifecycle
 *
 * End-to-end tests for the complete ticket workflow:
 * Create -> TODO -> IN_PROGRESS -> NEEDS_FEEDBACK -> READY_TO_RESUME -> DONE
 *
 * Uses Playwright for browser automation.
 */

import { test, expect, type Page, type Locator } from '@playwright/test';

// Test configuration
const BASE_URL = process.env.TEST_URL || 'http://localhost:4173';
const API_URL = `${BASE_URL}/api`;

// Helper class for Kanban board interactions
class KanbanPage {
  constructor(private page: Page) {}

  async goto(projectId: string = 'test-project') {
    await this.page.goto(`${BASE_URL}/projects/${projectId}`);
    await this.page.waitForSelector('[data-testid="kanban-board"]');
  }

  // Column accessors
  get backlogColumn(): Locator {
    return this.page.locator('[data-testid="column-BACKLOG"]');
  }

  get todoColumn(): Locator {
    return this.page.locator('[data-testid="column-TODO"]');
  }

  get inProgressColumn(): Locator {
    return this.page.locator('[data-testid="column-IN_PROGRESS"]');
  }

  get needsFeedbackColumn(): Locator {
    return this.page.locator('[data-testid="column-NEEDS_FEEDBACK"]');
  }

  get readyToResumeColumn(): Locator {
    return this.page.locator('[data-testid="column-READY_TO_RESUME"]');
  }

  get doneColumn(): Locator {
    return this.page.locator('[data-testid="column-DONE"]');
  }

  // Actions
  async createTicket(title: string, description?: string) {
    await this.page.click('[data-testid="create-ticket-btn"]');
    await this.page.fill('[data-testid="ticket-title-input"]', title);
    if (description) {
      await this.page.fill('[data-testid="ticket-description-input"]', description);
    }
    await this.page.click('[data-testid="submit-ticket-btn"]');
    await this.page.waitForSelector(`[data-testid="ticket-card"]:has-text("${title}")`);
  }

  async getTicketCard(title: string): Promise<Locator> {
    return this.page.locator(`[data-testid="ticket-card"]:has-text("${title}")`);
  }

  async dragTicketToColumn(ticketTitle: string, targetColumnStatus: string) {
    const ticket = await this.getTicketCard(ticketTitle);
    const targetColumn = this.page.locator(`[data-testid="column-${targetColumnStatus}"]`);

    await ticket.dragTo(targetColumn);
    await this.page.waitForTimeout(500); // Wait for animation
  }

  async clickTicket(title: string) {
    const ticket = await this.getTicketCard(title);
    await ticket.click();
    await this.page.waitForSelector('[data-testid="ticket-detail-modal"]');
  }

  async answerQuestion(questionText: string, answer: string) {
    const questionBlock = this.page.locator(
      `[data-testid="question-block"]:has-text("${questionText}")`
    );
    await questionBlock.locator('[data-testid="answer-input"]').fill(answer);
    await questionBlock.locator('[data-testid="submit-answer-btn"]').click();
  }

  async clickReadyToResume() {
    await this.page.click('[data-testid="ready-to-resume-btn"]');
  }

  async getProgressBar(): Promise<Locator> {
    return this.page.locator('[data-testid="execution-progress"]');
  }

  async getTicketStatus(title: string): Promise<string> {
    const ticket = await this.getTicketCard(title);
    return await ticket.getAttribute('data-status') || '';
  }
}

test.describe('Full Ticket Lifecycle', () => {
  let kanban: KanbanPage;

  test.beforeEach(async ({ page }) => {
    kanban = new KanbanPage(page);

    // Set up test data via API
    await page.request.post(`${API_URL}/test/setup`, {
      data: { projectId: 'test-project' }
    });
  });

  test.afterEach(async ({ page }) => {
    // Clean up test data
    await page.request.post(`${API_URL}/test/cleanup`, {
      data: { projectId: 'test-project' }
    });
  });

  test('complete ticket lifecycle from creation to done', async ({ page }) => {
    await kanban.goto();

    // Step 1: Create a new ticket
    await kanban.createTicket(
      'Implement user authentication',
      'Add OAuth2 login with JWT tokens'
    );

    // Verify ticket is in BACKLOG
    const ticket = await kanban.getTicketCard('Implement user authentication');
    await expect(kanban.backlogColumn.locator(ticket)).toBeVisible();

    // Step 2: Move to TODO
    await kanban.dragTicketToColumn('Implement user authentication', 'TODO');
    await expect(kanban.todoColumn.locator(ticket)).toBeVisible();

    // Step 3: Move to IN_PROGRESS (triggers Claude Flow)
    await kanban.dragTicketToColumn('Implement user authentication', 'IN_PROGRESS');
    await expect(kanban.inProgressColumn.locator(ticket)).toBeVisible();

    // Verify execution started
    await kanban.clickTicket('Implement user authentication');
    const progressBar = await kanban.getProgressBar();
    await expect(progressBar).toBeVisible();

    // Step 4: Simulate NEEDS_FEEDBACK state
    // In real test, this would be triggered by Claude Flow agent
    await page.request.post(`${API_URL}/tickets/test-ticket-1/feedback/request`, {
      data: {
        agentId: 'agent-123',
        questions: [
          {
            id: 'q1',
            text: 'Which OAuth provider should we use?',
            type: 'CHOICE',
            options: ['Google', 'GitHub', 'Both'],
            required: true
          }
        ],
        context: 'Need to decide on OAuth provider for authentication',
        blocking: true
      }
    });

    // Wait for ticket to move to NEEDS_FEEDBACK
    await page.waitForSelector('[data-testid="column-NEEDS_FEEDBACK"]');
    await expect(kanban.needsFeedbackColumn.locator(ticket)).toBeVisible();

    // Step 5: Answer the question
    await kanban.clickTicket('Implement user authentication');
    await expect(page.locator('[data-testid="question-block"]')).toBeVisible();

    await kanban.answerQuestion('Which OAuth provider should we use?', 'Both');

    // Step 6: Click Ready to Resume
    await kanban.clickReadyToResume();

    // Verify ticket moves through READY_TO_RESUME to IN_PROGRESS
    await page.waitForSelector(`[data-testid="column-IN_PROGRESS"] [data-testid="ticket-card"]:has-text("Implement user authentication")`);

    // Step 7: Simulate completion
    await page.request.post(`${API_URL}/tickets/test-ticket-1/complete`, {
      data: { result: 'success' }
    });

    // Verify ticket is in DONE
    await page.waitForSelector('[data-testid="column-DONE"]');
    await expect(kanban.doneColumn.locator(ticket)).toBeVisible();
  });

  test('ticket moves back to TODO on execution failure', async ({ page }) => {
    await kanban.goto();

    // Create and move ticket to IN_PROGRESS
    await kanban.createTicket('Failing task', 'This will fail to execute');
    await kanban.dragTicketToColumn('Failing task', 'TODO');
    await kanban.dragTicketToColumn('Failing task', 'IN_PROGRESS');

    // Simulate execution failure
    await page.request.post(`${API_URL}/tickets/test-ticket-2/fail`, {
      data: { error: 'Claude Flow CLI not available' }
    });

    // Verify ticket moves back to TODO
    const ticket = await kanban.getTicketCard('Failing task');
    await expect(kanban.todoColumn.locator(ticket)).toBeVisible();

    // Verify error is displayed
    await kanban.clickTicket('Failing task');
    await expect(page.locator('[data-testid="error-message"]')).toContainText('execution failed');
  });

  test('multiple questions can be answered before resuming', async ({ page }) => {
    await kanban.goto();

    // Create ticket and move to IN_PROGRESS
    await kanban.createTicket('Complex feature', 'Needs multiple decisions');
    await kanban.dragTicketToColumn('Complex feature', 'TODO');
    await kanban.dragTicketToColumn('Complex feature', 'IN_PROGRESS');

    // Request multiple questions
    await page.request.post(`${API_URL}/tickets/test-ticket-3/feedback/request`, {
      data: {
        agentId: 'agent-123',
        questions: [
          {
            id: 'q1',
            text: 'Which database?',
            type: 'CHOICE',
            options: ['PostgreSQL', 'MySQL', 'MongoDB'],
            required: true
          },
          {
            id: 'q2',
            text: 'Should we add caching?',
            type: 'CONFIRM',
            required: true
          },
          {
            id: 'q3',
            text: 'Any additional notes?',
            type: 'TEXT',
            required: false
          }
        ],
        blocking: true
      }
    });

    await page.waitForSelector('[data-testid="column-NEEDS_FEEDBACK"]');

    await kanban.clickTicket('Complex feature');

    // Verify all questions are shown
    const questions = page.locator('[data-testid="question-block"]');
    await expect(questions).toHaveCount(3);

    // Ready to Resume should be disabled
    const resumeBtn = page.locator('[data-testid="ready-to-resume-btn"]');
    await expect(resumeBtn).toBeDisabled();

    // Answer required questions
    await kanban.answerQuestion('Which database?', 'PostgreSQL');
    await expect(resumeBtn).toBeDisabled(); // Still disabled

    await kanban.answerQuestion('Should we add caching?', 'Yes');

    // Now Ready to Resume should be enabled (optional question not answered)
    await expect(resumeBtn).toBeEnabled();
  });

  test('real-time progress updates are shown', async ({ page }) => {
    await kanban.goto();

    await kanban.createTicket('Track progress', 'Monitor execution progress');
    await kanban.dragTicketToColumn('Track progress', 'TODO');
    await kanban.dragTicketToColumn('Track progress', 'IN_PROGRESS');

    await kanban.clickTicket('Track progress');

    // Verify progress bar exists
    const progressBar = await kanban.getProgressBar();
    await expect(progressBar).toBeVisible();

    // Simulate progress updates
    await page.request.post(`${API_URL}/tickets/test-ticket-4/progress`, {
      data: {
        stage: 'Analyzing',
        status: 'completed',
        percentComplete: 14
      }
    });

    // Verify progress is updated
    await expect(page.locator('[data-testid="progress-percentage"]')).toContainText('14%');
    await expect(page.locator('[data-testid="stage-Analyzing"]')).toHaveClass(/completed/);

    // Simulate more progress
    await page.request.post(`${API_URL}/tickets/test-ticket-4/progress`, {
      data: {
        stage: 'Assigning Agents',
        status: 'in-progress',
        percentComplete: 28
      }
    });

    await expect(page.locator('[data-testid="progress-percentage"]')).toContainText('28%');
  });

  test('execution logs are streamed in real-time', async ({ page }) => {
    await kanban.goto();

    await kanban.createTicket('Stream logs', 'View execution logs');
    await kanban.dragTicketToColumn('Stream logs', 'TODO');
    await kanban.dragTicketToColumn('Stream logs', 'IN_PROGRESS');

    await kanban.clickTicket('Stream logs');

    // Open logs panel
    await page.click('[data-testid="toggle-logs-btn"]');

    const logsContainer = page.locator('[data-testid="execution-logs"]');
    await expect(logsContainer).toBeVisible();

    // Simulate log entries
    for (const log of [
      'Starting analysis...',
      'Found 5 keywords: api, auth, security, jwt, oauth',
      'Complexity score: 7',
      'Spawning agents: coordinator, coder, tester, security-auditor'
    ]) {
      await page.request.post(`${API_URL}/tickets/test-ticket-5/log`, {
        data: { message: log }
      });

      await expect(logsContainer).toContainText(log);
    }
  });
});

test.describe('Ticket Analysis Display', () => {
  let kanban: KanbanPage;

  test.beforeEach(async ({ page }) => {
    kanban = new KanbanPage(page);
    await page.request.post(`${API_URL}/test/setup`, {
      data: { projectId: 'test-project' }
    });
  });

  test('shows complexity and estimated time on ticket card', async ({ page }) => {
    await kanban.goto();

    await kanban.createTicket(
      'Complex security feature',
      'Implement OAuth2 with JWT, MFA, and encryption'
    );

    await kanban.dragTicketToColumn('Complex security feature', 'TODO');
    await kanban.dragTicketToColumn('Complex security feature', 'IN_PROGRESS');

    const ticket = await kanban.getTicketCard('Complex security feature');

    // Verify complexity badge
    await expect(ticket.locator('[data-testid="complexity-badge"]')).toBeVisible();

    // Verify estimated time
    await expect(ticket.locator('[data-testid="estimated-time"]')).toBeVisible();
  });

  test('shows suggested agents in ticket detail', async ({ page }) => {
    await kanban.goto();

    await kanban.createTicket('API feature', 'Build REST API endpoint');
    await kanban.dragTicketToColumn('API feature', 'TODO');
    await kanban.dragTicketToColumn('API feature', 'IN_PROGRESS');

    await kanban.clickTicket('API feature');

    // Verify agents section
    const agentsSection = page.locator('[data-testid="assigned-agents"]');
    await expect(agentsSection).toBeVisible();

    // Should show at least one agent
    await expect(agentsSection.locator('[data-testid="agent-badge"]')).toHaveCount(
      { min: 1 }
    );
  });

  test('shows topology information', async ({ page }) => {
    await kanban.goto();

    await kanban.createTicket('Team feature', 'Complex multi-component work');
    await kanban.dragTicketToColumn('Team feature', 'TODO');
    await kanban.dragTicketToColumn('Team feature', 'IN_PROGRESS');

    await kanban.clickTicket('Team feature');

    // Verify topology display
    await expect(page.locator('[data-testid="swarm-topology"]')).toBeVisible();
  });
});

test.describe('Keyboard Navigation', () => {
  let kanban: KanbanPage;

  test.beforeEach(async ({ page }) => {
    kanban = new KanbanPage(page);
    await page.request.post(`${API_URL}/test/setup`, {
      data: { projectId: 'test-project' }
    });
  });

  test('can navigate tickets with arrow keys', async ({ page }) => {
    await kanban.goto();

    // Create multiple tickets
    await kanban.createTicket('Ticket 1', 'First ticket');
    await kanban.createTicket('Ticket 2', 'Second ticket');

    // Focus first ticket
    const ticket1 = await kanban.getTicketCard('Ticket 1');
    await ticket1.focus();

    // Press down arrow
    await page.keyboard.press('ArrowDown');

    // Second ticket should be focused
    const ticket2 = await kanban.getTicketCard('Ticket 2');
    await expect(ticket2).toBeFocused();
  });

  test('can open ticket with Enter key', async ({ page }) => {
    await kanban.goto();

    await kanban.createTicket('Keyboard test', 'Open with keyboard');

    const ticket = await kanban.getTicketCard('Keyboard test');
    await ticket.focus();
    await page.keyboard.press('Enter');

    await expect(page.locator('[data-testid="ticket-detail-modal"]')).toBeVisible();
  });

  test('can close modal with Escape key', async ({ page }) => {
    await kanban.goto();

    await kanban.createTicket('Modal test', 'Close with escape');
    await kanban.clickTicket('Modal test');

    await expect(page.locator('[data-testid="ticket-detail-modal"]')).toBeVisible();

    await page.keyboard.press('Escape');

    await expect(page.locator('[data-testid="ticket-detail-modal"]')).not.toBeVisible();
  });
});

test.describe('Error Handling', () => {
  let kanban: KanbanPage;

  test.beforeEach(async ({ page }) => {
    kanban = new KanbanPage(page);
    await page.request.post(`${API_URL}/test/setup`, {
      data: { projectId: 'test-project' }
    });
  });

  test('shows error when Claude Flow is unavailable', async ({ page }) => {
    // Mock Claude Flow being unavailable
    await page.route('**/api/claude-flow/**', route => {
      route.fulfill({
        status: 503,
        body: JSON.stringify({ error: 'Claude Flow service unavailable' })
      });
    });

    await kanban.goto();

    await kanban.createTicket('Will fail', 'Claude Flow unavailable');
    await kanban.dragTicketToColumn('Will fail', 'TODO');
    await kanban.dragTicketToColumn('Will fail', 'IN_PROGRESS');

    // Verify error message is shown
    await expect(page.locator('[data-testid="error-toast"]')).toContainText('service unavailable');

    // Ticket should move back to TODO
    const ticket = await kanban.getTicketCard('Will fail');
    await expect(kanban.todoColumn.locator(ticket)).toBeVisible();
  });

  test('handles WebSocket disconnect gracefully', async ({ page }) => {
    await kanban.goto();

    await kanban.createTicket('WS test', 'Test WebSocket handling');
    await kanban.dragTicketToColumn('WS test', 'TODO');
    await kanban.dragTicketToColumn('WS test', 'IN_PROGRESS');

    // Simulate WebSocket disconnect
    await page.evaluate(() => {
      // Dispatch custom disconnect event
      window.dispatchEvent(new CustomEvent('ws:disconnect'));
    });

    // Verify reconnection indicator
    await expect(page.locator('[data-testid="connection-status"]')).toContainText('Reconnecting');

    // Simulate reconnection
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('ws:connect'));
    });

    await expect(page.locator('[data-testid="connection-status"]')).toContainText('Connected');
  });

  test('validates required fields on question forms', async ({ page }) => {
    await kanban.goto();

    await kanban.createTicket('Validation test', 'Test form validation');
    await kanban.dragTicketToColumn('Validation test', 'TODO');
    await kanban.dragTicketToColumn('Validation test', 'IN_PROGRESS');

    // Request a required question
    await page.request.post(`${API_URL}/tickets/test-ticket-v/feedback/request`, {
      data: {
        agentId: 'agent-123',
        questions: [
          {
            id: 'q1',
            text: 'Required question',
            type: 'TEXT',
            required: true
          }
        ],
        blocking: true
      }
    });

    await page.waitForSelector('[data-testid="column-NEEDS_FEEDBACK"]');
    await kanban.clickTicket('Validation test');

    // Try to submit empty answer
    const submitBtn = page.locator('[data-testid="submit-answer-btn"]');
    await submitBtn.click();

    // Should show validation error
    await expect(page.locator('[data-testid="validation-error"]')).toContainText('required');
  });
});

test.describe('Performance', () => {
  test('loads kanban board within 2 seconds', async ({ page }) => {
    const startTime = Date.now();

    await page.goto(`${BASE_URL}/projects/test-project`);
    await page.waitForSelector('[data-testid="kanban-board"]');

    const loadTime = Date.now() - startTime;
    expect(loadTime).toBeLessThan(2000);
  });

  test('drag and drop is responsive', async ({ page }) => {
    const kanban = new KanbanPage(page);
    await kanban.goto();

    await kanban.createTicket('Drag test', 'Test drag performance');

    const startTime = Date.now();
    await kanban.dragTicketToColumn('Drag test', 'TODO');
    const dragTime = Date.now() - startTime;

    expect(dragTime).toBeLessThan(500);
  });
});
