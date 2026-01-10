# PRD Amendment 001: Workspace Path Configuration

**Status**: Required Addition
**Priority**: P0 (Critical - System Cannot Function Without This)
**Date**: 2026-01-09
**Affects**: PRD Sections 3.1, 8.1, User Flows 7.1, API Contracts 9.1

---

## Executive Summary

This amendment addresses a critical gap in the original PRD: **projects have no mechanism to specify the local filesystem folder where Claude Code operates**. Without this, the entire system is non-functional because:

1. Claude Code agents must operate within a specific codebase directory
2. The Kanban can create tickets but cannot execute them without knowing WHERE to run
3. Users have no way to connect their project to their actual code

---

## The Gap

### What the PRD Says (Section 3.1, lines 108-114):
> "Create unlimited projects, each with isolated Claude Code instance"
> "Configure swarm topology per project"

### What's Missing:
- How users specify the **folder path** where Claude Code runs
- How the Kanban **connects to a local codebase**
- Where this critical configuration is **stored and displayed**
- **Onboarding/explanation** of what Claude Flow can do for the user

---

## Required Additions

### 1. Project Data Model Addition

**Add to Section 8.1 - Project Entity (line 714-742):**

```typescript
interface Project {
  id: UUID;
  name: string;
  description: string;

  // NEW: Workspace Configuration (REQUIRED)
  workspacePath: string;           // Absolute path to codebase folder
  workspaceValidated: boolean;     // Whether path exists and is accessible
  workspaceLastChecked?: DateTime; // When path was last validated

  // Existing fields...
  swarmConfig: SwarmConfiguration;
  // ...
}
```

**Field Specifications:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `workspacePath` | string | **Yes** | Absolute filesystem path to the project's codebase (e.g., `/Users/dev/my-app`) |
| `workspaceValidated` | boolean | No | Whether the system has verified the path exists |
| `workspaceLastChecked` | DateTime | No | Timestamp of last path validation |

### 2. Project Creation Flow Update

**Amend Section 7.1 - New Project Creation Flow:**

```
                                    ┌─────────────────┐
                                    │   User lands    │
                                    │   on dashboard  │
                                    └────────┬────────┘
                                             │
                                             v
                              ┌──────────────────────────────┐
                              │  Click "New Project" button  │
                              └──────────────┬───────────────┘
                                             │
                                             v
                    ┌────────────────────────────────────────────────────┐
                    │          STEP 1: WORKSPACE SELECTION               │
                    │   ─────────────────────────────────────────────    │
                    │                                                    │
                    │   📁 Select Your Codebase Folder                   │
                    │                                                    │
                    │   This is where Claude Code will run. It should    │
                    │   be the root of your project (where package.json, │
                    │   Cargo.toml, or similar config files live).       │
                    │                                                    │
                    │   [/Users/dev/my-project____________] [Browse]     │
                    │                                                    │
                    │   ✓ Folder exists and is accessible                │
                    │                                                    │
                    └────────────────────────┬───────────────────────────┘
                                             │
                                             v
                    ┌────────────────────────────────────────────────────┐
                    │          STEP 2: PROJECT DETAILS                   │
                    │   ─────────────────────────────────────────────    │
                    │                                                    │
                    │   Project Name: [My Awesome App______________]     │
                    │                                                    │
                    │   Description:  [Building a REST API...______]     │
                    │                                                    │
                    └────────────────────────┬───────────────────────────┘
                                             │
                                             v
                    ┌────────────────────────────────────────────────────┐
                    │          STEP 3: CLAUDE FLOW CAPABILITIES          │
                    │   ─────────────────────────────────────────────    │
                    │                                                    │
                    │   🤖 What Claude Flow Can Do For You:              │
                    │                                                    │
                    │   • 60+ Specialized Agents                         │
                    │     Coder, Tester, Security Architect, and more    │
                    │                                                    │
                    │   • Swarm Orchestration                            │
                    │     Multiple agents working together on tasks      │
                    │                                                    │
                    │   • Learning & Memory                              │
                    │     Patterns are learned and reused across tasks   │
                    │                                                    │
                    │   • Background Workers                             │
                    │     Security audits, test gaps, optimization       │
                    │                                                    │
                    │   [Learn More] [Skip - I know Claude Flow]         │
                    │                                                    │
                    └────────────────────────┬───────────────────────────┘
                                             │
                                             v
                              ┌──────────────────────────┐
                              │   Configure Swarm        │
                              │   (Optional - defaults   │
                              │    work for most cases)  │
                              └─────────────┬────────────┘
                                            │
                                            v
                              ┌──────────────────────────┐
                              │  Review & Create Project │
                              └─────────────┬────────────┘
                                            │
                                            v
                              ┌──────────────────────────┐
                              │  Project Board Opens     │
                              └──────────────────────────┘
```

### 3. API Contract Updates

**Amend Section 9.1 - Create Project API:**

```http
POST /api/v1/projects
Content-Type: application/json

{
  "name": "My AI Project",
  "description": "Building an AI-powered service",
  "workspacePath": "/Users/dev/my-project",    // NEW: REQUIRED
  "swarmConfig": {
    "topology": "hierarchical-mesh",
    "maxAgents": 15
  }
}

Response: 201 Created
{
  "id": "uuid-123",
  "name": "My AI Project",
  "workspacePath": "/Users/dev/my-project",
  "workspaceValidated": true,
  "status": "active",
  "createdAt": "2045-01-09T10:00:00Z"
}
```

**Validation Rules:**
- `workspacePath` is **required** and cannot be empty
- Path must be an absolute filesystem path
- Path should exist (warning if not, but allow creation for new projects)
- Path should not overlap with another project's workspace

### 4. Functional Requirements Additions

**Add to Section 5.1 - Project Management:**

#### FR-PM-010: Workspace Path Configuration
- System SHALL require workspace path during project creation
- System SHALL validate that workspace path exists on the filesystem
- System SHALL warn if workspace path is already used by another project
- System SHALL display workspace path prominently in project UI
- System SHALL allow workspace path modification from project settings

#### FR-PM-011: Workspace Path Display
- System SHALL show workspace path on project cards in dashboard
- System SHALL show workspace path in project header/details
- System SHALL provide quick "Open in Terminal" or "Open in Editor" actions
- System SHALL indicate if workspace path is invalid/inaccessible

#### FR-PM-012: Claude Flow Capabilities Onboarding
- System SHALL display Claude Flow capabilities during first project creation
- System SHALL provide "What can Claude Flow do?" help accessible from any screen
- System SHALL show contextual capability hints when creating tickets
- System SHALL include searchable capabilities browser in sidebar

### 5. User Stories Additions

**Add to Section 4.1 - Project Management Stories:**

| ID | As a... | I want to... | So that... | Priority |
|----|---------|--------------|------------|----------|
| PM-009 | Any User | Specify my codebase folder when creating a project | Claude Code knows where to run | **P0** |
| PM-010 | Solo Developer | See the folder path on my project cards | I know which codebase each project connects to | P1 |
| PM-011 | Non-Technical User | Understand what Claude Flow can do | I can leverage its full capabilities | P0 |
| PM-012 | Any User | Change my project's folder path | I can update if I move my codebase | P2 |

### 6. Acceptance Criteria Additions

**Add to Section 11.1:**

#### AC-PM-003: Workspace Path Configuration
```gherkin
Feature: Workspace Path Configuration
  As a user
  I want to specify my codebase folder
  So that Claude Code knows where to operate

  Scenario: Create project with workspace path
    Given I am creating a new project
    When I enter folder path "/Users/dev/my-app"
    And the folder exists
    Then the path is validated with a green checkmark
    And I can proceed to name my project

  Scenario: Invalid workspace path warning
    Given I am creating a new project
    When I enter folder path "/nonexistent/path"
    Then I see a warning "Folder not found"
    And I can still create the project (for new codebases)
    But I see a reminder to create the folder

  Scenario: Duplicate workspace path warning
    Given Project A uses folder "/Users/dev/my-app"
    When I try to create Project B with the same folder
    Then I see warning "This folder is already used by Project A"
    And I must confirm to proceed
```

#### AC-PM-004: Claude Flow Capabilities Onboarding
```gherkin
Feature: Claude Flow Capabilities Onboarding
  As a new user
  I want to understand what Claude Flow can do
  So that I can use it effectively

  Scenario: First project shows capabilities overview
    Given I am a new user
    When I create my first project
    Then I see "What Claude Flow Can Do" section
    And it lists: 60+ Agents, Swarm Orchestration, Learning & Memory
    And I can expand each to learn more

  Scenario: Experienced user can skip onboarding
    Given I have created projects before
    When I create a new project
    Then the capabilities section is collapsed
    And I can expand it if I want a refresher
```

---

## Implementation Priority

| Item | Priority | Reason |
|------|----------|--------|
| Workspace path field in data model | P0 | System cannot function without it |
| Workspace path in project creation | P0 | Users must specify folder |
| Path validation | P1 | Good UX, prevents errors |
| Capabilities onboarding | P1 | Users need to understand the system |
| Duplicate path warning | P2 | Edge case protection |
| Path change in settings | P2 | Nice to have for migrations |

---

## Impact Analysis

### Database Changes
- Add `workspacePath` column to Project table (or store in existing `settings` JSON)
- No migration issues for existing projects (can be nullable initially)

### UI Changes
- Project creation form needs folder path input
- Project cards need to display folder path
- Add capabilities explanation component

### Backend Changes
- API validation for workspace path
- Path existence checking (non-blocking)
- Update project creation endpoint

---

*This amendment is critical for the system to function. Without workspace path configuration, the Kanban cannot execute any tickets because Claude Code doesn't know where to operate.*
