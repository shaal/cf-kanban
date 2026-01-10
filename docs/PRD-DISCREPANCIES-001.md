# PRD Discrepancy Analysis: CF-Kanban Implementation Status

**Status**: Implementation Gap Analysis
**Date**: 2026-01-09
**Analysis Scope**: Comprehensive (All Discrepancies)
**Source PRDs**:
- `PRD-AI-KANBAN-2045.md` (Main PRD)
- `PRD-AMENDMENT-001-WORKSPACE-PATH.md` (Workspace Configuration)

---

## Executive Summary

This document identifies all discrepancies between the PRD specifications and the current implementation. The analysis reveals **47 gaps** across 9 PRD sections, with **12 critical (P0)**, **18 high-priority (P1)**, and **17 medium-priority (P2)** items.

### Implementation Progress Overview

| PRD Section | Specified Features | Implemented | Partial | Missing |
|-------------|-------------------|-------------|---------|---------|
| 3.1 Project Workspace | 8 | 3 | 2 | 3 |
| 3.2 Ticket Management | 12 | 6 | 3 | 3 |
| 3.3 Agent Orchestration | 6 | 0 | 1 | 5 |
| 3.4 Learning Dashboard | 8 | 4 | 2 | 2 |
| 3.5 Real-Time Updates | 4 | 2 | 1 | 1 |
| 8.0 Feature Discovery | 5 | 0 | 1 | 4 |
| Amendment-001 | 6 | 4 | 2 | 0 |
| **TOTAL** | **49** | **19 (39%)** | **12 (24%)** | **18 (37%)** |

---

## Section 3.1: Project Workspace

### PRD Reference: Lines 108-120

---

### GAP-3.1.1: Project Templates (Missing)

**PRD Specification (Line 116-120)**:
> Pre-configured swarm setups for common use cases:
> - "Web App" template: coder + tester + reviewer agents
> - "Security Audit" template: security-architect + security-auditor
> - "Documentation" template: researcher + api-docs agents

**Current Status**: ❌ NOT IMPLEMENTED

**Impact**: Users must manually configure agent routing for every project instead of selecting from proven templates.

**Implementation Requirements**:
- Add `templateId` field to Project model
- Create `ProjectTemplate` model with swarm configurations
- UI: Template selector during project creation
- Seed database with 5-10 standard templates

**Effort Estimate**: 3-4 days

**Priority**: P1

---

### GAP-3.1.2: Resource Allocation Dashboard (Missing)

**PRD Specification (Line 114)**:
> Resource allocation: CPU, memory, max agents per project

**Current Status**: ❌ NOT IMPLEMENTED

The `Project.settings` JSON field exists but has no schema for resource limits, and no UI exposes these settings.

**Implementation Requirements**:
- Define resource limit schema in `Project.settings`
- Backend: Enforce limits during swarm spawn
- UI: Resource allocation form in project settings
- Monitoring: Display current vs. allocated resources

**Effort Estimate**: 5-7 days

**Priority**: P2

---

### GAP-3.1.3: Learning Preferences Configuration (Missing)

**PRD Specification (Line 113)**:
> Set learning preferences (share patterns globally or keep private)

**Current Status**: ❌ NOT IMPLEMENTED

No UI or backend logic for controlling pattern sharing scope.

**Implementation Requirements**:
- Add `learningConfig` to Project settings schema
- UI: Toggle for "Share patterns across projects"
- Backend: Filter patterns by project when private
- Pattern transfer to respect privacy settings

**Effort Estimate**: 2-3 days

**Priority**: P2

---

### GAP-3.1.4: Multi-Project Dashboard Statistics (Partial)

**PRD Specification (Line 111)**:
> Create unlimited projects, each with isolated Claude Code instance

**Current Status**: ⚠️ PARTIAL

Projects are created successfully, but:
- No visual indication of Claude Code instance status
- No health/connectivity indicator per project
- No aggregate statistics on dashboard

**Implementation Requirements**:
- Add project health status component
- Display active agent count per project
- Show last activity timestamp

**Effort Estimate**: 2-3 days

**Priority**: P2

---

### GAP-3.1.5: Swarm Topology Configuration UI (Partial)

**PRD Specification (Line 112)**:
> Configure swarm topology per project (mesh, hierarchical, hybrid)

**Current Status**: ⚠️ PARTIAL

`Project.settings` can store topology, but:
- No UI for selecting topology
- No visual explanation of topology differences
- No validation that topology is applied during swarm init

**Implementation Requirements**:
- UI: Topology selector with visual diagrams
- Tooltip explanations for each topology type
- Verify topology is passed to CLI `swarm init`

**Effort Estimate**: 2-3 days

**Priority**: P1

---

## Section 3.2: Ticket Management

### PRD Reference: Lines 122-166

---

### GAP-3.2.1: Intelligent Complexity Scoring (Partial)

**PRD Specification (Line 132)**:
> Automatic complexity scoring (1-10)

**Current Status**: ⚠️ PARTIAL

- Database field `Ticket.complexity` exists
- `src/lib/server/analysis/complexity.ts` has scoring logic
- **NOT exposed in UI** - users cannot see/override complexity
- **NOT auto-calculated** on ticket creation

**Implementation Requirements**:
- Call complexity analyzer on ticket create/update
- Display complexity badge on ticket cards
- Allow manual override in ticket edit form

**Effort Estimate**: 1-2 days

**Priority**: P1

---

### GAP-3.2.2: Suggested Agent Assignment (Missing)

**PRD Specification (Line 133)**:
> Suggested agent assignment based on learned patterns

**Current Status**: ❌ NOT IMPLEMENTED

`agent-router.ts` and `pattern-matcher.ts` exist but are not connected to ticket UI.

**Implementation Requirements**:
- Call `agent-router` during ticket analysis
- Display suggested agents on ticket creation form
- Show confidence scores for suggestions
- Allow user to accept/modify suggestions

**Effort Estimate**: 3-4 days

**Priority**: P1

---

### GAP-3.2.3: Estimated Completion Time (Missing)

**PRD Specification (Line 134)**:
> Estimated completion time from historical data

**Current Status**: ❌ NOT IMPLEMENTED

`time-estimation.ts` has estimation logic but no UI integration.

**Implementation Requirements**:
- Store actual completion times on Done tickets
- Build historical model by complexity/type
- Display estimate on ticket cards
- Update estimates as work progresses

**Effort Estimate**: 3-4 days

**Priority**: P2

---

### GAP-3.2.4: Dependency Detection (Missing)

**PRD Specification (Line 135)**:
> Dependency detection across tickets

**Current Status**: ❌ NOT IMPLEMENTED

`dependencies.ts` analyzer exists but:
- No `dependencies` field on Ticket model
- No UI to view/manage dependencies
- No blocking logic when dependencies unmet

**Implementation Requirements**:
- Add `dependencies` relation to Ticket model
- UI: Dependency selector in ticket form
- Visual: Show dependency arrows/tree
- Logic: Block transition if dependencies incomplete

**Effort Estimate**: 5-7 days

**Priority**: P2

---

### GAP-3.2.5: Attachment Support (Missing)

**PRD Specification (Line 128)**:
> Attachments: mockups, specs, reference code

**Current Status**: ❌ NOT IMPLEMENTED

No file upload capability for tickets.

**Implementation Requirements**:
- Add `Attachment` model linked to Ticket
- File upload endpoint with storage (S3/local)
- UI: File drop zone in ticket form
- Display attached files on ticket cards

**Effort Estimate**: 4-5 days

**Priority**: P2

---

### GAP-3.2.6: Feedback Interaction UI Enhancement (Partial)

**PRD Specification (Lines 149-164)**:
> Claude needs your input: [checkbox options, radio buttons, submit]

**Current Status**: ⚠️ PARTIAL

`TicketQuestions.svelte` implements question UI, but:
- Missing "Ask Claude to Clarify" button
- No visual mockup/preview capability
- Questions not prominently displayed on Kanban cards

**Implementation Requirements**:
- Add clarification request button
- Show question indicator on card in NEEDS_FEEDBACK lane
- Expand questions inline or modal from card click

**Effort Estimate**: 2-3 days

**Priority**: P1

---

### GAP-3.2.7: Natural Language Task Parsing (Missing)

**PRD Specification (Line 126)**:
> Natural language descriptions ("Add user authentication with OAuth")

**Current Status**: ⚠️ PARTIAL

Tickets accept free-text descriptions, but:
- No NLP parsing to extract structured data
- No auto-label suggestion from description
- No routing hints extraction

**Implementation Requirements**:
- Integrate LLM for description parsing
- Auto-suggest labels from description
- Extract technical requirements/hints

**Effort Estimate**: 5-7 days

**Priority**: P2

---

## Section 3.3: Agent Orchestration

### PRD Reference: Lines 168-186

---

### GAP-3.3.1: Visual Agent Catalog (Missing)

**PRD Specification (Lines 175-179)**:
> Visual Agent Catalog:
> - Browse all agent types with capabilities
> - Filter by task type, success rate, average completion time
> - See which agents work best together
> - Custom agent configuration

**Current Status**: ❌ NOT IMPLEMENTED

No `/agents` or `/capabilities/agents` page exists. Users have no way to discover available agents.

**Implementation Requirements**:
- Create `/learning/agents` route
- Build AgentCatalog component with:
  - Grid/list view of all 60+ agents
  - Filter by category, success rate, usage
  - Agent detail panel with capabilities
  - "Best paired with" agent suggestions
- Connect to Claude Flow CLI for agent metadata

**Effort Estimate**: 7-10 days

**Priority**: P0 (Critical for user adoption)

---

### GAP-3.3.2: Swarm Visualization (Missing)

**PRD Specification (Lines 181-186)**:
> Real-time visualization of active swarms:
> - Node graph showing agent connections
> - Color-coded status (idle, working, blocked, learning)
> - Communication threads between agents
> - Consensus voting indicators

**Current Status**: ❌ NOT IMPLEMENTED

No swarm visualization component exists. Users cannot see what agents are doing.

**Implementation Requirements**:
- Create `SwarmVisualization.svelte` component
- WebSocket subscription to swarm events
- D3.js force-directed graph for agent network
- Real-time status color updates
- Communication flow animation
- Integrate into project page when swarm active

**Effort Estimate**: 10-14 days

**Priority**: P0 (Core differentiating feature)

---

### GAP-3.3.3: Agent Status on Ticket (Missing)

**PRD Specification (Line 183)**:
> Color-coded status (idle, working, blocked, learning)

**Current Status**: ❌ NOT IMPLEMENTED

Tickets in IN_PROGRESS show no information about which agents are assigned or their current status.

**Implementation Requirements**:
- Track assigned agents per ticket
- Display agent avatars/icons on card
- Show agent status (working, waiting, blocked)
- Real-time updates via WebSocket

**Effort Estimate**: 4-5 days

**Priority**: P0

---

### GAP-3.3.4: Agent Success Metrics (Missing)

**PRD Specification (Line 176)**:
> Filter by task type, success rate, average completion time

**Current Status**: ❌ NOT IMPLEMENTED

No tracking of agent performance metrics.

**Implementation Requirements**:
- Add `AgentMetrics` model or JSON field
- Track: tasks completed, success rate, avg duration
- Aggregate across projects
- Display in Agent Catalog

**Effort Estimate**: 4-5 days

**Priority**: P1

---

### GAP-3.3.5: Custom Agent Configuration (Missing)

**PRD Specification (Line 179)**:
> Custom agent configuration

**Current Status**: ❌ NOT IMPLEMENTED

Users cannot customize agent behavior or create custom agent profiles.

**Implementation Requirements**:
- UI for agent configuration presets
- Save custom configs to project settings
- Apply configs when spawning agents

**Effort Estimate**: 5-7 days

**Priority**: P2

---

## Section 3.4: Learning Dashboard

### PRD Reference: Lines 188-227

---

### GAP-3.4.1: Neural Training Progress Dashboard (Partial)

**PRD Specification (Lines 196-200)**:
> Neural Training Progress:
> - SONA adaptation metrics (<0.05ms target)
> - MoE expert utilization breakdown
> - Loss/accuracy graphs over time
> - EWC++ forgetting prevention status

**Current Status**: ⚠️ PARTIAL

Components exist in `src/lib/components/neural/`:
- `TrainingLossChart.svelte` ✅
- `ExpertUtilization.svelte` ✅
- `EWCStatus.svelte` ✅
- `TrainingConfig.svelte` ✅

**Missing**:
- No data source - components render mock/placeholder data
- No API endpoint for neural metrics
- No real-time updates during training

**Implementation Requirements**:
- Backend: Neural metrics API from Claude Flow CLI
- WebSocket: Training progress events
- Connect components to real data

**Effort Estimate**: 3-4 days

**Priority**: P1

---

### GAP-3.4.2: Memory Browser Semantic Search (Partial)

**PRD Specification (Lines 202-206)**:
> Memory Browser:
> - Browse all namespaces
> - Semantic search across all entries
> - Store new patterns manually
> - View vector similarity neighbors

**Current Status**: ⚠️ PARTIAL

`/learning/memory` page exists with:
- Namespace browsing ✅
- Search UI ✅
- Add entry form ✅

**Missing**:
- **Semantic search** - search appears keyword-based, not vector similarity
- **Similarity neighbors** - no way to see related entries

**Implementation Requirements**:
- Backend: Vector search endpoint using HNSW
- UI: "Similar patterns" panel on entry detail
- Visual: Embedding similarity visualization

**Effort Estimate**: 3-4 days

**Priority**: P1

---

### GAP-3.4.3: Cross-Project Insights (Missing)

**PRD Specification (Lines 207-210)**:
> Cross-Project Insights:
> - Which patterns transferred successfully
> - Performance impact of shared patterns
> - Pattern attribution and provenance
> - Opt-in/out sharing controls

**Current Status**: ❌ NOT IMPLEMENTED

`/learning/transfer` page exists but appears to be placeholder without functionality.

**Implementation Requirements**:
- Track pattern origin (project, timestamp)
- Track transfer history
- Measure success rate post-transfer
- UI: Transfer success dashboard
- Opt-in/out controls per pattern

**Effort Estimate**: 5-7 days

**Priority**: P2

---

### GAP-3.4.4: Pattern Transfer Between Projects (Missing)

**PRD Specification (Line 209)**:
> Transfer patterns between projects

**Current Status**: ❌ NOT IMPLEMENTED

No mechanism to copy/share patterns from one project to another.

**Implementation Requirements**:
- API: Pattern transfer endpoint
- UI: "Transfer to project" action on patterns
- Validation: Check pattern compatibility
- History: Track all transfers

**Effort Estimate**: 3-4 days

**Priority**: P2

---

## Section 3.5: Real-Time Updates

### PRD Reference: Lines 214-227

---

### GAP-3.5.1: Notification Preferences UI (Missing)

**PRD Specification (Lines 221-226)**:
> Notification Preferences:
> - In-app notifications
> - Email digests
> - Webhook integrations
> - Mobile push (future)

**Current Status**: ❌ NOT IMPLEMENTED

No notification preferences UI. System sends no notifications.

**Implementation Requirements**:
- Add `NotificationPreference` model per user
- UI: Settings page for notification config
- Backend: Notification dispatch service
- Email integration (SendGrid/Postmark)
- Webhook dispatcher

**Effort Estimate**: 7-10 days

**Priority**: P2

---

### GAP-3.5.2: System Health Alerts (Partial)

**PRD Specification (Line 220)**:
> System health alerts

**Current Status**: ⚠️ PARTIAL

- Health monitoring exists in `src/lib/server/monitoring/health.ts`
- No user-facing alerts for health issues
- No dashboard showing system status

**Implementation Requirements**:
- System status indicator in header
- Health alert toasts
- Status page route

**Effort Estimate**: 2-3 days

**Priority**: P1

---

## Section 8: Feature Discovery & AI Assistant

### PRD Reference: Lines 418-683

---

### GAP-8.1: AI Chat Assistant (Missing)

**PRD Specification (Lines 539-603)**:
> AI Chat Assistant (The Key Feature):
> - Natural language interface to all Claude Flow capabilities
> - Answer "What can I do?" questions about features
> - Explain any agent, hook, or worker
> - Create tickets via conversation
> - Suggest optimal configurations

**Current Status**: ❌ NOT IMPLEMENTED

This is described as the primary way users interact with features, but no chat component exists.

**Implementation Requirements**:
- Create ChatAssistant component
- Integrate with Claude API for responses
- Intent classification system
- Knowledge base of CF features
- Ticket creation from chat
- Capability search/explanation

**Effort Estimate**: 14-21 days

**Priority**: P0 (Key PRD feature)

---

### GAP-8.2: Command Palette (Cmd+K) (Missing)

**PRD Specification (Lines 606-629)**:
> Command Palette (Cmd+K):
> Quick access to all capabilities via fuzzy search

**Current Status**: ❌ NOT IMPLEMENTED

No global keyboard shortcut or command palette exists.

**Implementation Requirements**:
- Install/build cmdk-style component
- Index all agents, hooks, workers, actions
- Fuzzy search implementation
- Action execution from palette
- Keyboard navigation (arrows, enter)

**Effort Estimate**: 5-7 days

**Priority**: P1

---

### GAP-8.3: Interactive Tutorials (Missing)

**PRD Specification (Lines 631-658)**:
> Interactive Tutorials (First-Time Users):
> - Quick Start, Full Tour, Ask Claude, Read Docs paths

**Current Status**: ❌ NOT IMPLEMENTED

No onboarding flow or tutorials for new users.

**Implementation Requirements**:
- First-visit detection (localStorage/DB)
- Welcome modal with path selection
- Step-by-step guided tour component
- Progress tracking
- "Skip" and "Remind me later" options

**Effort Estimate**: 5-7 days

**Priority**: P1

---

### GAP-8.4: Capabilities Browser in Sidebar (Partial)

**PRD Specification (Lines 479-508)**:
> Capabilities Browser:
> - 🤖 Agents (60+)
> - 🪝 Hooks (27)
> - ⚙️ Workers (12)

**Current Status**: ⚠️ PARTIAL

The sidebar exists but:
- No expandable capabilities tree
- No browsable list of agents/hooks/workers
- Only navigation links present

**Implementation Requirements**:
- Add expandable capability tree to sidebar
- Link to full catalog pages
- Show counts dynamically

**Effort Estimate**: 2-3 days

**Priority**: P1

---

### GAP-8.5: Contextual Suggestions on Ticket Creation (Missing)

**PRD Specification (Lines 510-536)**:
> Contextual Suggestions when creating/editing tickets:
> - Suggested agents based on content
> - Topology recommendation
> - Similar past tickets with success rates

**Current Status**: ❌ NOT IMPLEMENTED

Ticket creation form has no suggestions.

**Implementation Requirements**:
- Analyze ticket content on blur/debounce
- Display agent suggestions
- Show topology recommendation
- Query similar past tickets
- Display pattern matches with success %

**Effort Estimate**: 5-7 days

**Priority**: P1

---

## Amendment-001: Workspace Path Configuration

### PRD Reference: Full Amendment Document

---

### GAP-A1.1: Workspace Path Validation (Partial)

**PRD Specification (Lines 179-182)**:
> - Path must be an absolute filesystem path
> - Path should exist (warning if not)
> - Path should not overlap with another project's workspace

**Current Status**: ⚠️ PARTIAL

- Path is collected in form ✅
- Path is stored in database ✅
- **NO validation** that path exists
- **NO warning** for invalid paths
- **NO duplicate detection**

**Implementation Requirements**:
- Backend: Validate path existence (non-blocking)
- Frontend: Show ✓/⚠️ indicator
- Backend: Check for duplicate paths
- Frontend: Warning modal for duplicates

**Effort Estimate**: 2-3 days

**Priority**: P1

---

### GAP-A1.2: "Open in Editor" Quick Action (Missing)

**PRD Specification (Line 198)**:
> Provide quick "Open in Terminal" or "Open in Editor" actions

**Current Status**: ❌ NOT IMPLEMENTED

**Implementation Requirements**:
- Detect available editors (VS Code, etc.)
- Add button to project card
- Generate appropriate URI scheme

**Effort Estimate**: 1-2 days

**Priority**: P2

---

## UX Vision Components (Appendix B)

### PRD Reference: Lines 739-757

---

### GAP-UX.1: KanbanCard AI Status Indicators (Missing)

**PRD Specification (Line 745)**:
> KanbanCard - AI status indicators, knowledge ring, confidence display

**Current Status**: ❌ NOT IMPLEMENTED

Current KanbanCard shows only: title, description, priority, labels.

**Missing**:
- AI status indicator (working, thinking, blocked)
- Knowledge ring (pattern familiarity)
- Confidence percentage
- Agent avatar

**Implementation Requirements**:
- Extend KanbanCard with AI status section
- Animated status indicators
- Confidence meter component
- Knowledge ring visualization

**Effort Estimate**: 3-4 days

**Priority**: P1

---

### GAP-UX.2: TimeTravelViewer (Missing)

**PRD Specification (Line 750)**:
> TimeTravelViewer - Decision replay with what-if

**Current Status**: ❌ NOT IMPLEMENTED

No way to replay agent decisions or explore alternatives.

**Implementation Requirements**:
- Store decision snapshots during execution
- Timeline visualization component
- Replay controls (play, pause, step)
- What-if branch exploration
- This is a complex feature

**Effort Estimate**: 14-21 days

**Priority**: P3 (Future)

---

### GAP-UX.3: ProjectParallelView (Missing)

**PRD Specification (Line 749)**:
> ProjectParallelView - Multi-project comparison

**Current Status**: ❌ NOT IMPLEMENTED

No way to view multiple projects side-by-side.

**Implementation Requirements**:
- Multi-column project view
- Synchronized scrolling option
- Aggregate metrics comparison

**Effort Estimate**: 5-7 days

**Priority**: P3 (Future)

---

## Implementation Roadmap Gaps

### PRD Reference: Lines 359-395

---

### GAP-ROAD.1: Phase 2 - Redis Integration (Partial)

**PRD Specification (Lines 369-374)**:
> - Socket.IO integration ✅
> - Namespace/room architecture ✅
> - Redis pub/sub and caching ⚠️
> - WebSocket event handlers ✅

**Current Status**: ⚠️ PARTIAL

Redis client exists (`src/lib/server/redis.ts`) but:
- Pub/sub may not be active
- Caching not fully utilized

**Effort Estimate**: 2-3 days

**Priority**: P1

---

### GAP-ROAD.2: Phase 5 - Production Deployment Config (Missing)

**PRD Specification (Line 395)**:
> Production deployment

**Current Status**: ❌ NOT IMPLEMENTED

No deployment configurations found:
- No `Dockerfile`
- No `docker-compose.yml`
- No Kubernetes manifests
- No CI/CD pipeline

**Effort Estimate**: 5-7 days

**Priority**: P1

---

## Summary: Priority Matrix

### P0 - Critical (Must Fix for Core Functionality)

| Gap ID | Feature | Effort |
|--------|---------|--------|
| GAP-3.3.1 | Visual Agent Catalog | 7-10 days |
| GAP-3.3.2 | Swarm Visualization | 10-14 days |
| GAP-3.3.3 | Agent Status on Ticket | 4-5 days |
| GAP-8.1 | AI Chat Assistant | 14-21 days |

**P0 Total Effort**: 35-50 days

---

### P1 - High Priority (Important for UX)

| Gap ID | Feature | Effort |
|--------|---------|--------|
| GAP-3.1.1 | Project Templates | 3-4 days |
| GAP-3.1.5 | Swarm Topology UI | 2-3 days |
| GAP-3.2.1 | Complexity Scoring | 1-2 days |
| GAP-3.2.2 | Agent Suggestions | 3-4 days |
| GAP-3.2.6 | Feedback UI Enhancement | 2-3 days |
| GAP-3.3.4 | Agent Success Metrics | 4-5 days |
| GAP-3.4.1 | Neural Dashboard Data | 3-4 days |
| GAP-3.4.2 | Semantic Search | 3-4 days |
| GAP-3.5.2 | Health Alerts | 2-3 days |
| GAP-8.2 | Command Palette | 5-7 days |
| GAP-8.3 | Interactive Tutorials | 5-7 days |
| GAP-8.4 | Capabilities Sidebar | 2-3 days |
| GAP-8.5 | Contextual Suggestions | 5-7 days |
| GAP-A1.1 | Path Validation | 2-3 days |
| GAP-UX.1 | KanbanCard AI Status | 3-4 days |
| GAP-ROAD.1 | Redis Integration | 2-3 days |
| GAP-ROAD.2 | Deployment Config | 5-7 days |

**P1 Total Effort**: 54-74 days

---

### P2 - Medium Priority (Nice to Have)

| Gap ID | Feature | Effort |
|--------|---------|--------|
| GAP-3.1.2 | Resource Allocation | 5-7 days |
| GAP-3.1.3 | Learning Preferences | 2-3 days |
| GAP-3.1.4 | Dashboard Statistics | 2-3 days |
| GAP-3.2.3 | Time Estimation | 3-4 days |
| GAP-3.2.4 | Dependency Detection | 5-7 days |
| GAP-3.2.5 | Attachments | 4-5 days |
| GAP-3.2.7 | NLP Task Parsing | 5-7 days |
| GAP-3.3.5 | Custom Agent Config | 5-7 days |
| GAP-3.4.3 | Cross-Project Insights | 5-7 days |
| GAP-3.4.4 | Pattern Transfer | 3-4 days |
| GAP-3.5.1 | Notifications | 7-10 days |
| GAP-A1.2 | Open in Editor | 1-2 days |

**P2 Total Effort**: 48-66 days

---

### P3 - Future (Deferred)

| Gap ID | Feature | Effort |
|--------|---------|--------|
| GAP-UX.2 | TimeTravelViewer | 14-21 days |
| GAP-UX.3 | ProjectParallelView | 5-7 days |

**P3 Total Effort**: 19-28 days

---

## Grand Total Effort Estimate

| Priority | Min Days | Max Days |
|----------|----------|----------|
| P0 | 35 | 50 |
| P1 | 54 | 74 |
| P2 | 48 | 66 |
| P3 | 19 | 28 |
| **Total** | **156** | **218** |

---

## Recommendations

### Immediate Actions (Week 1-2)

1. **GAP-3.3.3**: Agent Status on Ticket - Users need to see what's happening
2. **GAP-3.2.1**: Complexity Scoring - Low effort, high value
3. **GAP-A1.1**: Path Validation - Critical for Amendment-001 compliance
4. **GAP-ROAD.2**: Deployment Config - Unblock production releases

### Sprint 1 Focus (Week 3-4)

1. **GAP-3.3.1**: Visual Agent Catalog - Essential for feature discovery
2. **GAP-8.4**: Capabilities Sidebar - Quick win for navigation
3. **GAP-3.4.1**: Neural Dashboard Data - Complete existing components

### Sprint 2 Focus (Week 5-8)

1. **GAP-8.1**: AI Chat Assistant - The "key feature" per PRD
2. **GAP-3.3.2**: Swarm Visualization - Core differentiator

---

*PRD Discrepancy Analysis v1.0*
*Generated: 2026-01-09*
*Next Review: After Sprint 1*
