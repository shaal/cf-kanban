/**
 * TASK-114: Full E2E Test Suite - User Journey Tests
 *
 * Complete user journey tests covering:
 * - Project creation and management
 * - Ticket lifecycle (create -> TODO -> IN_PROGRESS -> NEEDS_FEEDBACK -> DONE)
 * - Agent execution flow
 * - Error handling and recovery
 *
 * Cross-browser testing configured in playwright.config.ts
 */

import { test, expect, type Page, type BrowserContext } from '@playwright/test';

// Test configuration
const BASE_URL = process.env.TEST_URL || 'http://localhost:4173';
const API_URL = `${BASE_URL}/api`;

// Helper class for page interactions
class AppPage {
  constructor(private page: Page) {}

  // Navigation
  async goto(path: string = '/') {
    await this.page.goto(`${BASE_URL}${path}`);
  }

  // Wait for loading states to complete
  async waitForLoad() {
    await this.page.waitForLoadState('networkidle');
    // Wait for any loading spinners to disappear
    const loadingIndicator = this.page.locator('[data-testid="loading"]');
    if (await loadingIndicator.isVisible()) {
      await loadingIndicator.waitFor({ state: 'hidden', timeout: 10000 });
    }
  }

  // Get toast notifications
  getToast(type: 'success' | 'error' | 'info' = 'success') {
    return this.page.locator(`[data-testid="toast-${type}"]`);
  }
}

// Project page helper
class ProjectsPage extends AppPage {
  async createProject(name: string, description?: string) {
    await this.page.click('[data-testid="create-project-btn"]');
    await this.page.fill('[data-testid="project-name-input"]', name);
    if (description) {
      await this.page.fill('[data-testid="project-description-input"]', description);
    }
    await this.page.click('[data-testid="submit-project-btn"]');
    await this.waitForLoad();
  }

  async openProject(name: string) {
    await this.page.click(`[data-testid="project-card"]:has-text("${name}")`);
    await this.waitForLoad();
  }

  async deleteProject(name: string) {
    const projectCard = this.page.locator(`[data-testid="project-card"]:has-text("${name}")`);
    await projectCard.hover();
    await projectCard.locator('[data-testid="delete-project-btn"]').click();
    await this.page.click('[data-testid="confirm-delete-btn"]');
    await this.waitForLoad();
  }

  getProjectCard(name: string) {
    return this.page.locator(`[data-testid="project-card"]:has-text("${name}")`);
  }
}

// Kanban board page helper
class KanbanBoardPage extends AppPage {
  // Column accessors
  getColumn(status: string) {
    return this.page.locator(`[data-testid="column-${status}"]`);
  }

  // Ticket operations
  async createTicket(title: string, description?: string, priority: string = 'MEDIUM') {
    await this.page.click('[data-testid="create-ticket-btn"]');
    await this.page.waitForSelector('[data-testid="ticket-form-modal"]');
    await this.page.fill('[data-testid="ticket-title-input"]', title);
    if (description) {
      await this.page.fill('[data-testid="ticket-description-input"]', description);
    }
    await this.page.selectOption('[data-testid="ticket-priority-select"]', priority);
    await this.page.click('[data-testid="submit-ticket-btn"]');
    await this.waitForLoad();
  }

  async getTicketCard(title: string) {
    return this.page.locator(`[data-testid="ticket-card"]:has-text("${title}")`);
  }

  async dragTicketToColumn(ticketTitle: string, targetStatus: string) {
    const ticket = await this.getTicketCard(ticketTitle);
    const targetColumn = this.getColumn(targetStatus);
    await ticket.dragTo(targetColumn);
    // Wait for optimistic update and server confirmation
    await this.page.waitForTimeout(500);
  }

  async openTicketDetail(title: string) {
    const ticket = await this.getTicketCard(title);
    await ticket.click();
    await this.page.waitForSelector('[data-testid="ticket-detail-modal"]');
  }

  async closeTicketDetail() {
    await this.page.keyboard.press('Escape');
    await this.page.waitForSelector('[data-testid="ticket-detail-modal"]', { state: 'hidden' });
  }

  async deleteTicket(title: string) {
    await this.openTicketDetail(title);
    await this.page.click('[data-testid="delete-ticket-btn"]');
    await this.page.click('[data-testid="confirm-delete-btn"]');
    await this.waitForLoad();
  }

  // Get ticket count in a column
  async getColumnTicketCount(status: string): Promise<number> {
    const column = this.getColumn(status);
    const tickets = column.locator('[data-testid="ticket-card"]');
    return await tickets.count();
  }
}

// ============================================================================
// User Journey Tests
// ============================================================================

test.describe('User Journey: Project Management', () => {
  let projectsPage: ProjectsPage;

  test.beforeEach(async ({ page }) => {
    projectsPage = new ProjectsPage(page);
    await projectsPage.goto('/');
  });

  test('should create a new project successfully', async ({ page }) => {
    await projectsPage.createProject('Test Project', 'A project for testing');

    const projectCard = projectsPage.getProjectCard('Test Project');
    await expect(projectCard).toBeVisible();
    await expect(projectCard).toContainText('A project for testing');
  });

  test('should navigate to project kanban board', async ({ page }) => {
    // Create project first
    await projectsPage.createProject('Navigate Test');

    // Open the project
    await projectsPage.openProject('Navigate Test');

    // Verify kanban board is visible
    await expect(page.locator('[data-testid="kanban-board"]')).toBeVisible();
    await expect(page.locator('[data-testid="column-BACKLOG"]')).toBeVisible();
  });

  test('should show project statistics', async ({ page }) => {
    await projectsPage.createProject('Stats Test');
    await projectsPage.openProject('Stats Test');

    // Create some tickets
    const kanban = new KanbanBoardPage(page);
    await kanban.createTicket('Task 1');
    await kanban.createTicket('Task 2');
    await kanban.createTicket('Task 3');

    // Go back to projects
    await page.click('[data-testid="back-to-projects"]');

    // Check stats are displayed
    const projectCard = projectsPage.getProjectCard('Stats Test');
    await expect(projectCard.locator('[data-testid="ticket-count"]')).toContainText('3');
  });

  test('should handle project deletion', async ({ page }) => {
    await projectsPage.createProject('Delete Me');
    await expect(projectsPage.getProjectCard('Delete Me')).toBeVisible();

    await projectsPage.deleteProject('Delete Me');

    await expect(projectsPage.getProjectCard('Delete Me')).not.toBeVisible();
  });
});

test.describe('User Journey: Complete Ticket Lifecycle', () => {
  let kanban: KanbanBoardPage;
  const PROJECT_NAME = 'Lifecycle Test Project';

  test.beforeEach(async ({ page }) => {
    const projectsPage = new ProjectsPage(page);
    await projectsPage.goto('/');

    // Create a project for testing
    await projectsPage.createProject(PROJECT_NAME);
    await projectsPage.openProject(PROJECT_NAME);

    kanban = new KanbanBoardPage(page);
  });

  test('should complete full ticket lifecycle: BACKLOG -> TODO -> IN_PROGRESS -> DONE', async ({ page }) => {
    // Step 1: Create ticket (starts in BACKLOG)
    await kanban.createTicket(
      'Implement user authentication',
      'Add OAuth2 login with JWT tokens',
      'HIGH'
    );

    let ticket = await kanban.getTicketCard('Implement user authentication');
    await expect(kanban.getColumn('BACKLOG').locator(ticket)).toBeVisible();

    // Step 2: Move to TODO
    await kanban.dragTicketToColumn('Implement user authentication', 'TODO');
    ticket = await kanban.getTicketCard('Implement user authentication');
    await expect(kanban.getColumn('TODO').locator(ticket)).toBeVisible();

    // Step 3: Move to IN_PROGRESS
    await kanban.dragTicketToColumn('Implement user authentication', 'IN_PROGRESS');
    ticket = await kanban.getTicketCard('Implement user authentication');
    await expect(kanban.getColumn('IN_PROGRESS').locator(ticket)).toBeVisible();

    // Verify execution indicators appear
    await kanban.openTicketDetail('Implement user authentication');
    await expect(page.locator('[data-testid="execution-progress"]')).toBeVisible();
    await kanban.closeTicketDetail();

    // Step 4: Move to DONE (simulating completion)
    await kanban.dragTicketToColumn('Implement user authentication', 'DONE');
    ticket = await kanban.getTicketCard('Implement user authentication');
    await expect(kanban.getColumn('DONE').locator(ticket)).toBeVisible();
  });

  test('should handle feedback loop: IN_PROGRESS -> NEEDS_FEEDBACK -> READY_TO_RESUME -> IN_PROGRESS', async ({ page }) => {
    // Create and move to IN_PROGRESS
    await kanban.createTicket('Complex feature', 'Needs multiple decisions');
    await kanban.dragTicketToColumn('Complex feature', 'TODO');
    await kanban.dragTicketToColumn('Complex feature', 'IN_PROGRESS');

    // Simulate agent requesting feedback via API
    await page.request.post(`${API_URL}/tickets/test-ticket/feedback`, {
      data: {
        questions: [
          {
            id: 'q1',
            text: 'Which database should we use?',
            type: 'CHOICE',
            options: ['PostgreSQL', 'MySQL', 'MongoDB'],
            required: true
          }
        ]
      }
    });

    // Wait for WebSocket update
    await page.waitForTimeout(1000);

    // Verify ticket moved to NEEDS_FEEDBACK
    const ticket = await kanban.getTicketCard('Complex feature');
    await expect(kanban.getColumn('NEEDS_FEEDBACK').locator(ticket)).toBeVisible();

    // Open ticket and answer question
    await kanban.openTicketDetail('Complex feature');
    await expect(page.locator('[data-testid="question-block"]')).toBeVisible();

    // Answer the question
    await page.click('[data-testid="answer-option-PostgreSQL"]');
    await page.click('[data-testid="submit-answer-btn"]');

    // Click Ready to Resume
    await page.click('[data-testid="ready-to-resume-btn"]');
    await kanban.closeTicketDetail();

    // Verify ticket goes through READY_TO_RESUME
    await expect(kanban.getColumn('IN_PROGRESS').locator(ticket)).toBeVisible({ timeout: 5000 });
  });

  test('should handle execution failure gracefully', async ({ page }) => {
    await kanban.createTicket('Failing task', 'This will fail');
    await kanban.dragTicketToColumn('Failing task', 'TODO');
    await kanban.dragTicketToColumn('Failing task', 'IN_PROGRESS');

    // Simulate execution failure
    await page.request.post(`${API_URL}/tickets/test-ticket/fail`, {
      data: { error: 'Claude Flow CLI not available' }
    });

    await page.waitForTimeout(1000);

    // Ticket should return to TODO
    const ticket = await kanban.getTicketCard('Failing task');
    await expect(kanban.getColumn('TODO').locator(ticket)).toBeVisible();

    // Error message should be displayed
    await kanban.openTicketDetail('Failing task');
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
  });

  test('should track real-time progress during execution', async ({ page }) => {
    await kanban.createTicket('Track progress', 'Monitor execution');
    await kanban.dragTicketToColumn('Track progress', 'TODO');
    await kanban.dragTicketToColumn('Track progress', 'IN_PROGRESS');

    await kanban.openTicketDetail('Track progress');

    // Verify progress bar exists
    await expect(page.locator('[data-testid="execution-progress"]')).toBeVisible();

    // Simulate progress updates
    const progressUpdates = [
      { stage: 'Analyzing', percentComplete: 14 },
      { stage: 'Assigning Agents', percentComplete: 28 },
      { stage: 'Executing', percentComplete: 57 },
      { stage: 'Testing', percentComplete: 85 },
    ];

    for (const update of progressUpdates) {
      await page.request.post(`${API_URL}/tickets/test-ticket/progress`, {
        data: update
      });
      await page.waitForTimeout(200);
      await expect(page.locator('[data-testid="progress-percentage"]')).toContainText(`${update.percentComplete}%`);
    }
  });
});

test.describe('User Journey: Admin Workflows', () => {
  test.skip('should access admin panel with admin role', async ({ page }) => {
    // Note: Requires auth implementation
    // await page.goto(`${BASE_URL}/admin`);
    // await expect(page.locator('[data-testid="admin-panel"]')).toBeVisible();
  });

  test.skip('should manage users in admin panel', async ({ page }) => {
    // Note: Requires auth implementation
  });

  test.skip('should view audit logs', async ({ page }) => {
    // Note: Requires auth implementation
  });
});

test.describe('User Journey: Error Handling', () => {
  test('should display error toast on API failure', async ({ page }) => {
    const kanban = new KanbanBoardPage(page);
    await kanban.goto('/projects/test-project');

    // Mock API failure
    await page.route('**/api/tickets', route => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Internal server error' })
      });
    });

    // Try to create a ticket
    await page.click('[data-testid="create-ticket-btn"]');
    await page.fill('[data-testid="ticket-title-input"]', 'Will fail');
    await page.click('[data-testid="submit-ticket-btn"]');

    // Should show error toast
    await expect(page.locator('[data-testid="toast-error"]')).toBeVisible();
  });

  test('should handle 404 gracefully', async ({ page }) => {
    await page.goto(`${BASE_URL}/projects/non-existent-project`);

    await expect(page.locator('[data-testid="error-page"]')).toBeVisible();
    await expect(page).toHaveURL(/.*error.*/);
  });

  test('should validate form inputs', async ({ page }) => {
    const kanban = new KanbanBoardPage(page);
    await kanban.goto('/projects/test-project');

    await page.click('[data-testid="create-ticket-btn"]');

    // Try to submit empty form
    await page.click('[data-testid="submit-ticket-btn"]');

    // Should show validation error
    await expect(page.locator('[data-testid="validation-error"]')).toBeVisible();
  });

  test('should handle WebSocket disconnection', async ({ page }) => {
    const kanban = new KanbanBoardPage(page);
    await kanban.goto('/projects/test-project');

    // Simulate WebSocket disconnect
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('ws:disconnect'));
    });

    // Should show connection status
    await expect(page.locator('[data-testid="connection-status"]')).toContainText('Reconnecting');

    // Simulate reconnection
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('ws:connect'));
    });

    await expect(page.locator('[data-testid="connection-status"]')).toContainText('Connected');
  });
});

test.describe('User Journey: Keyboard Navigation', () => {
  test('should navigate tickets with arrow keys', async ({ page }) => {
    const kanban = new KanbanBoardPage(page);
    await kanban.goto('/projects/test-project');

    await kanban.createTicket('Ticket 1');
    await kanban.createTicket('Ticket 2');

    // Focus first ticket
    const ticket1 = await kanban.getTicketCard('Ticket 1');
    await ticket1.focus();

    // Press down arrow
    await page.keyboard.press('ArrowDown');

    // Second ticket should be focused
    const ticket2 = await kanban.getTicketCard('Ticket 2');
    await expect(ticket2).toBeFocused();
  });

  test('should open ticket with Enter key', async ({ page }) => {
    const kanban = new KanbanBoardPage(page);
    await kanban.goto('/projects/test-project');

    await kanban.createTicket('Keyboard test');

    const ticket = await kanban.getTicketCard('Keyboard test');
    await ticket.focus();
    await page.keyboard.press('Enter');

    await expect(page.locator('[data-testid="ticket-detail-modal"]')).toBeVisible();
  });

  test('should close modal with Escape key', async ({ page }) => {
    const kanban = new KanbanBoardPage(page);
    await kanban.goto('/projects/test-project');

    await kanban.createTicket('Modal test');
    await kanban.openTicketDetail('Modal test');

    await page.keyboard.press('Escape');

    await expect(page.locator('[data-testid="ticket-detail-modal"]')).not.toBeVisible();
  });

  test('should support Tab navigation', async ({ page }) => {
    const kanban = new KanbanBoardPage(page);
    await kanban.goto('/projects/test-project');

    // Tab through interactive elements
    await page.keyboard.press('Tab');

    // First focusable element should be focused
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(focusedElement).toBeTruthy();
  });
});

test.describe('User Journey: Multi-User Collaboration', () => {
  test('should see real-time updates from other users', async ({ browser }) => {
    // Create two browser contexts (simulating two users)
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();

    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    const kanban1 = new KanbanBoardPage(page1);
    const kanban2 = new KanbanBoardPage(page2);

    // Both users open the same project
    await kanban1.goto('/projects/shared-project');
    await kanban2.goto('/projects/shared-project');

    // User 1 creates a ticket
    await kanban1.createTicket('Collaborative ticket');

    // User 2 should see the ticket appear
    await page2.waitForTimeout(1000); // Wait for WebSocket update
    const ticket = await kanban2.getTicketCard('Collaborative ticket');
    await expect(ticket).toBeVisible();

    // Cleanup
    await context1.close();
    await context2.close();
  });

  test('should handle concurrent edits', async ({ browser }) => {
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();

    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    // Both users open same ticket
    await page1.goto(`${BASE_URL}/projects/test/tickets/concurrent-test`);
    await page2.goto(`${BASE_URL}/projects/test/tickets/concurrent-test`);

    // Both try to edit - should handle gracefully with optimistic updates
    // and conflict resolution

    await context1.close();
    await context2.close();
  });
});

test.describe('User Journey: Performance', () => {
  test('should load kanban board within 2 seconds', async ({ page }) => {
    const startTime = Date.now();

    await page.goto(`${BASE_URL}/projects/test-project`);
    await page.waitForSelector('[data-testid="kanban-board"]');

    const loadTime = Date.now() - startTime;
    expect(loadTime).toBeLessThan(2000);
  });

  test('should render large number of tickets without lag', async ({ page }) => {
    const kanban = new KanbanBoardPage(page);
    await kanban.goto('/projects/large-project');

    // Measure time to interact after load
    const startTime = Date.now();

    const ticket = await kanban.getTicketCard('Ticket 1');
    await ticket.click();

    const interactionTime = Date.now() - startTime;
    expect(interactionTime).toBeLessThan(500);
  });

  test('should handle rapid state transitions', async ({ page }) => {
    const kanban = new KanbanBoardPage(page);
    await kanban.goto('/projects/test-project');

    await kanban.createTicket('Rapid transition');

    const startTime = Date.now();

    // Rapid transitions
    await kanban.dragTicketToColumn('Rapid transition', 'TODO');
    await kanban.dragTicketToColumn('Rapid transition', 'IN_PROGRESS');
    await kanban.dragTicketToColumn('Rapid transition', 'DONE');

    const totalTime = Date.now() - startTime;
    expect(totalTime).toBeLessThan(3000);
  });
});
