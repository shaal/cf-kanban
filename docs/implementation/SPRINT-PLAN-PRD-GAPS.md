# Sprint Plan: PRD Gap Implementation

**Document Version**: 1.0
**Created**: 2026-01-10
**Source**: PRD-DISCREPANCIES-001.md
**Total Beads**: 35 features + 6 epics = 41 items
**Estimated Duration**: 12-16 weeks (3-4 sprints)

---

## Executive Summary

This sprint plan organizes the 35 PRD gap features into a dependency-aware sequence that:
1. **Unblocks critical paths first** - Maximizes parallel work opportunities
2. **Delivers value incrementally** - Each sprint produces usable features
3. **Groups related work** - Minimizes context switching within sprints

### Key Metrics

| Metric | Value |
|--------|-------|
| Total Effort | 156-218 days |
| P0 Critical Items | 4 |
| P1 High Priority | 17 |
| P2 Medium Priority | 12 |
| P3 Future | 2 |
| Blocking Dependencies | 12 |
| Items Ready Now | 31 |

---

## Sprint Overview

```
Sprint 1 (Weeks 1-3)   ─── Unblock Critical Path ───────────────────
Sprint 2 (Weeks 4-6)   ─── P0 Completion + Core Intelligence ───────
Sprint 3 (Weeks 7-10)  ─── Epic Completion + Infrastructure ────────
Sprint 4 (Weeks 11-14) ─── Polish + Production Readiness ───────────
```

---

## Sprint 1: Unblock Critical Path

**Duration**: 3 weeks
**Theme**: Remove blockers to enable parallel work
**Goal**: Complete foundational features that unblock the most downstream items

### Week 1: Agent Foundation

| Bead ID | Title | Est. | Unblocks |
|---------|-------|------|----------|
| `cf-kanban-z0l` | Visual Agent Catalog | 9d | AI Chat, Agent Metrics |
| `cf-kanban-0bf` | Intelligent Complexity Scoring | 2d | Contextual Suggestions |

**Deliverables**:
- `/learning/agents` route with browsable 60+ agent catalog
- Grid/list view with filtering by category
- Complexity badges on ticket cards

**Commands**:
```bash
bd update cf-kanban-z0l --claim
bd update cf-kanban-0bf --claim
```

### Week 2: Visualization & Sidebar

| Bead ID | Title | Est. | Unblocks |
|---------|-------|------|----------|
| `cf-kanban-n4s` | Swarm Visualization | 12d | Agent Status on Tickets |
| `cf-kanban-d7s` | Capabilities Browser in Sidebar | 3d | AI Chat, Tutorials |

**Deliverables**:
- D3.js force-directed graph for active swarms
- Real-time WebSocket updates for agent status
- Expandable capabilities tree in sidebar

**Commands**:
```bash
bd update cf-kanban-n4s --claim
bd update cf-kanban-d7s --claim
```

### Week 3: Infrastructure Foundation

| Bead ID | Title | Est. | Unblocks |
|---------|-------|------|----------|
| `cf-kanban-7tl` | Redis Integration Completion | 3d | Health Alerts, Notifications |
| `cf-kanban-dkd` | Suggested Agent Assignment | 4d | Contextual Suggestions |

**Deliverables**:
- Redis pub/sub active for real-time events
- Pattern caching with invalidation
- Agent suggestions on ticket creation form

**Commands**:
```bash
bd update cf-kanban-7tl --claim
bd update cf-kanban-dkd --claim
```

### Sprint 1 Completion Checklist

- [ ] Agent Catalog page functional
- [ ] Swarm visualization rendering
- [ ] Sidebar capabilities tree added
- [ ] Redis pub/sub verified
- [ ] Complexity scoring auto-calculated
- [ ] Agent suggestions appearing on tickets

**Sprint 1 closes**: `cf-kanban-z0l`, `cf-kanban-n4s`, `cf-kanban-d7s`, `cf-kanban-7tl`, `cf-kanban-0bf`, `cf-kanban-dkd`

---

## Sprint 2: P0 Completion + Core Intelligence

**Duration**: 3 weeks
**Theme**: Complete all P0 items and core ticket intelligence
**Goal**: Deliver the "key feature" (AI Chat) and intelligent ticket analysis

### Week 4: Agent Status & Card Enhancement

| Bead ID | Title | Est. | Unblocks |
|---------|-------|------|----------|
| `cf-kanban-gwf` | Agent Status on Ticket Cards | 5d | KanbanCard AI Status |
| `cf-kanban-mxy` | Agent Success Metrics | 5d | (none) |

**Deliverables**:
- Agent avatars/icons on ticket cards
- Color-coded status (working, blocked, idle)
- Success rate tracking per agent
- Metrics displayed in Agent Catalog

**Commands**:
```bash
bd update cf-kanban-gwf --claim
bd update cf-kanban-mxy --claim
```

### Week 5: AI Chat Assistant (KEY FEATURE)

| Bead ID | Title | Est. | Unblocks |
|---------|-------|------|----------|
| `cf-kanban-z1w` | AI Chat Assistant | 18d | (none - terminal) |

**Deliverables**:
- ChatAssistant component accessible from any screen
- Claude API integration for responses
- Intent classification for capability questions
- Ticket creation from natural language
- Agent/hook explanations

**This is the flagship feature** - allocate dedicated focus.

**Commands**:
```bash
bd update cf-kanban-z1w --claim
```

### Week 6: Ticket Intelligence Completion

| Bead ID | Title | Est. | Unblocks |
|---------|-------|------|----------|
| `cf-kanban-vew` | Contextual Suggestions | 6d | (none) |
| `cf-kanban-d84` | Feedback UI Enhancement | 3d | (none) |

**Deliverables**:
- Agent suggestions while typing ticket description
- Similar past tickets with success rates
- "Ask Claude to Clarify" button
- Question indicator on NEEDS_FEEDBACK cards

**Commands**:
```bash
bd update cf-kanban-vew --claim
bd update cf-kanban-d84 --claim
```

### Sprint 2 Completion Checklist

- [ ] All P0 items closed
- [ ] AI Chat accessible and functional
- [ ] Agent status visible on cards
- [ ] Success metrics in Agent Catalog
- [ ] Contextual suggestions working
- [ ] Feedback UI enhanced

**Sprint 2 closes**: `cf-kanban-gwf`, `cf-kanban-mxy`, `cf-kanban-z1w`, `cf-kanban-vew`, `cf-kanban-d84`

---

## Sprint 3: Epic Completion + Infrastructure

**Duration**: 4 weeks
**Theme**: Complete full epics for coherent feature sets
**Goal**: Finish Learning Dashboard and Project Workspace epics

### Week 7-8: Learning Dashboard Epic

| Bead ID | Title | Est. |
|---------|-------|------|
| `cf-kanban-058` | Neural Training Progress Dashboard | 4d |
| `cf-kanban-m1x` | Memory Browser Semantic Search | 4d |
| `cf-kanban-zqp` | Cross-Project Insights Dashboard | 6d |
| `cf-kanban-e1c` | Pattern Transfer Between Projects | 4d |

**Epic**: `cf-kanban-c0b` (Learning Dashboard & Memory)

**Deliverables**:
- Live neural training metrics
- HNSW-powered semantic search
- Pattern origin tracking
- Transfer success dashboard
- Cross-project pattern transfer UI

**Commands**:
```bash
bd update cf-kanban-058 cf-kanban-m1x --claim  # Week 7
bd update cf-kanban-zqp cf-kanban-e1c --claim  # Week 8
```

### Week 9-10: Project Workspace Epic

| Bead ID | Title | Est. |
|---------|-------|------|
| `cf-kanban-1t4` | Project Templates | 4d |
| `cf-kanban-d8c` | Swarm Topology Configuration UI | 3d |
| `cf-kanban-az2` | Resource Allocation Dashboard | 6d |
| `cf-kanban-i10` | Learning Preferences Configuration | 3d |
| `cf-kanban-jw2` | Multi-Project Dashboard Statistics | 3d |

**Epic**: `cf-kanban-f3d` (Project Workspace Configuration)

**Deliverables**:
- 5+ project templates (Web App, Security, Docs, etc.)
- Visual topology selector with diagrams
- Resource limits per project
- Privacy settings for patterns
- Health indicators per project

**Commands**:
```bash
bd update cf-kanban-1t4 cf-kanban-d8c --claim  # Week 9
bd update cf-kanban-az2 cf-kanban-i10 cf-kanban-jw2 --claim  # Week 10
```

### Sprint 3 Completion Checklist

- [ ] Learning Dashboard epic 100%
- [ ] Project Workspace epic 100%
- [ ] Semantic search functional
- [ ] Templates available in project creation
- [ ] Topology diagrams displayed

**Sprint 3 closes**: All items in `cf-kanban-c0b` and `cf-kanban-f3d` epics

---

## Sprint 4: Polish + Production Readiness

**Duration**: 4 weeks
**Theme**: Complete remaining epics, production deployment, UX polish
**Goal**: Ship to production with full feature set

### Week 11: Ticket Intelligence Completion

| Bead ID | Title | Est. |
|---------|-------|------|
| `cf-kanban-t2y` | Estimated Completion Time | 4d |
| `cf-kanban-1c3` | Ticket Dependency Detection | 6d |
| `cf-kanban-5l7` | Ticket Attachment Support | 5d |

**Commands**:
```bash
bd update cf-kanban-t2y cf-kanban-1c3 cf-kanban-5l7 --claim
```

### Week 12: Feature Discovery Completion

| Bead ID | Title | Est. |
|---------|-------|------|
| `cf-kanban-jbz` | Command Palette (Cmd+K) | 6d |
| `cf-kanban-i0f` | Interactive Tutorials | 6d |

**Commands**:
```bash
bd update cf-kanban-jbz cf-kanban-i0f --claim
```

### Week 13: Infrastructure Epic Completion

| Bead ID | Title | Est. |
|---------|-------|------|
| `cf-kanban-yc1` | Production Deployment Config | 6d |
| `cf-kanban-xrc` | System Health Alerts | 3d |
| `cf-kanban-92u` | Notification Preferences UI | 9d |
| `cf-kanban-amd` | Workspace Path Validation | 3d |
| `cf-kanban-3rq` | Open in Editor Quick Action | 2d |
| `cf-kanban-ije` | KanbanCard AI Status Indicators | 4d |

**Commands**:
```bash
bd update cf-kanban-yc1 cf-kanban-xrc --claim
bd update cf-kanban-92u cf-kanban-amd cf-kanban-3rq cf-kanban-ije --claim
```

### Week 14: P2 Cleanup + Documentation

| Bead ID | Title | Est. |
|---------|-------|------|
| `cf-kanban-zc5` | Natural Language Task Parsing | 6d |
| `cf-kanban-pvn` | Custom Agent Configuration | 6d |

**Commands**:
```bash
bd update cf-kanban-zc5 cf-kanban-pvn --claim
```

### Sprint 4 Completion Checklist

- [ ] All P1 items closed
- [ ] All P2 items closed
- [ ] Dockerfile and docker-compose ready
- [ ] CI/CD pipeline configured
- [ ] Cmd+K command palette working
- [ ] First-time user tutorials
- [ ] Production deployment tested

**Sprint 4 closes**: All remaining items except P3

---

## Deferred: P3 Future Items

These items are explicitly deferred to post-launch:

| Bead ID | Title | Est. | Rationale |
|---------|-------|------|-----------|
| `cf-kanban-51s` | TimeTravelViewer | 18d | Complex, not MVP critical |
| `cf-kanban-1qz` | ProjectParallelView | 6d | Nice-to-have comparison view |

**Revisit**: After 1 month of production usage and user feedback.

---

## Daily Workflow

### Starting Work

```bash
# See what's ready (respects dependencies)
bd ready

# Claim an item
bd update <bead-id> --claim

# Check epic progress
bd epic status
```

### During Work

```bash
# View issue details
bd show <bead-id>

# Check dependency tree
bd dep tree <bead-id>

# Add notes during implementation
bd comments <bead-id> add "Started frontend component"
```

### Completing Work

```bash
# Close when done
bd close <bead-id>

# Sync changes
bd sync

# Check what unblocked
bd ready
```

---

## Risk Mitigation

### Risk 1: AI Chat Complexity
**Risk**: AI Chat Assistant (18d) may take longer than estimated.
**Mitigation**: Start in Week 5 to avoid blocking other work. Consider MVP scope reduction.

### Risk 2: Swarm Visualization Performance
**Risk**: D3.js graph may lag with many agents.
**Mitigation**: Implement virtualization early. Test with 50+ nodes.

### Risk 3: Redis Integration Issues
**Risk**: Pub/sub may have edge cases in production.
**Mitigation**: Complete in Sprint 1 to allow time for hardening.

### Risk 4: Dependency Chain Delays
**Risk**: Blocked items pile up if blockers slip.
**Mitigation**: Prioritize blockers aggressively. Track with `bd ready`.

---

## Success Metrics

### Sprint 1 Exit Criteria
- [ ] 6 blockers resolved
- [ ] Agent Catalog has 60+ agents listed
- [ ] Swarm shows real-time updates

### Sprint 2 Exit Criteria
- [ ] All P0 items (4) complete
- [ ] AI Chat can answer "What agents are available?"
- [ ] AI Chat can create a ticket via conversation

### Sprint 3 Exit Criteria
- [ ] Learning Dashboard epic 100%
- [ ] Project Workspace epic 100%
- [ ] Pattern transfer functional

### Sprint 4 Exit Criteria
- [ ] Production deployment successful
- [ ] First-time user can complete tutorial
- [ ] All P1/P2 items complete

---

## Appendix A: Dependency Graph

```
                    ┌─────────────────┐
                    │  Agent Catalog  │ (P0)
                    │   cf-kanban-z0l │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
              ▼              │              ▼
    ┌─────────────────┐      │    ┌─────────────────┐
    │  Agent Metrics  │      │    │   AI Chat       │ (P0)
    │   cf-kanban-mxy │      │    │   cf-kanban-z1w │
    └─────────────────┘      │    └────────▲────────┘
                             │             │
                             │             │
    ┌─────────────────┐      │    ┌────────┴────────┐
    │ Swarm Viz       │ (P0) │    │ Capabilities    │ (P1)
    │ cf-kanban-n4s   │──────┘    │ Sidebar d7s     │
    └────────┬────────┘           └────────┬────────┘
             │                             │
             ▼                             ▼
    ┌─────────────────┐           ┌─────────────────┐
    │ Agent Status    │ (P0)      │ Tutorials       │ (P1)
    │ cf-kanban-gwf   │           │ cf-kanban-i0f   │
    └────────┬────────┘           └─────────────────┘
             │
             ▼
    ┌─────────────────┐
    │ KanbanCard AI   │ (P1)
    │ cf-kanban-ije   │
    └─────────────────┘


    ┌─────────────────┐     ┌─────────────────┐
    │ Complexity      │ (P1)│ Agent Suggest   │ (P1)
    │ cf-kanban-0bf   │     │ cf-kanban-dkd   │
    └────────┬────────┘     └────────┬────────┘
             │                       │
             └───────────┬───────────┘
                         │
                         ▼
               ┌─────────────────┐
               │ Contextual      │ (P1)
               │ Suggestions vew │
               └─────────────────┘


    ┌─────────────────┐
    │ Semantic Search │ (P1)
    │ cf-kanban-m1x   │
    └────────┬────────┘
             │
             ▼
    ┌─────────────────┐
    │ Cross-Project   │ (P2)
    │ Insights zqp    │
    └────────┬────────┘
             │
             ▼
    ┌─────────────────┐
    │ Pattern Transfer│ (P2)
    │ cf-kanban-e1c   │
    └─────────────────┘


    ┌─────────────────┐
    │ Redis Integ.    │ (P1)
    │ cf-kanban-7tl   │
    └────────┬────────┘
             │
       ┌─────┴─────┐
       │           │
       ▼           ▼
┌───────────┐ ┌───────────┐
│ Health    │ │ Notifs    │
│ Alerts    │ │ cf-92u    │
│ cf-xrc    │ └───────────┘
└───────────┘
```

---

## Appendix B: Bead Quick Reference

### By Epic

**EPIC: Agent Orchestration** (`cf-kanban-dib`)
- `cf-kanban-z0l` Visual Agent Catalog (P0)
- `cf-kanban-n4s` Swarm Visualization (P0)
- `cf-kanban-gwf` Agent Status on Tickets (P0)
- `cf-kanban-mxy` Agent Success Metrics (P1)
- `cf-kanban-pvn` Custom Agent Config (P2)

**EPIC: Feature Discovery** (`cf-kanban-8i7`)
- `cf-kanban-z1w` AI Chat Assistant (P0)
- `cf-kanban-jbz` Command Palette (P1)
- `cf-kanban-i0f` Interactive Tutorials (P1)
- `cf-kanban-d7s` Capabilities Sidebar (P1)
- `cf-kanban-vew` Contextual Suggestions (P1)

**EPIC: Ticket Intelligence** (`cf-kanban-aht`)
- `cf-kanban-0bf` Complexity Scoring (P1)
- `cf-kanban-dkd` Agent Suggestions (P1)
- `cf-kanban-t2y` Time Estimation (P2)
- `cf-kanban-1c3` Dependencies (P2)
- `cf-kanban-5l7` Attachments (P2)
- `cf-kanban-d84` Feedback UI (P1)
- `cf-kanban-zc5` NLP Parsing (P2)

**EPIC: Learning Dashboard** (`cf-kanban-c0b`)
- `cf-kanban-058` Neural Dashboard (P1)
- `cf-kanban-m1x` Semantic Search (P1)
- `cf-kanban-zqp` Cross-Project Insights (P2)
- `cf-kanban-e1c` Pattern Transfer (P2)

**EPIC: Project Workspace** (`cf-kanban-f3d`)
- `cf-kanban-1t4` Project Templates (P1)
- `cf-kanban-d8c` Topology UI (P1)
- `cf-kanban-az2` Resource Allocation (P2)
- `cf-kanban-i10` Learning Preferences (P2)
- `cf-kanban-jw2` Dashboard Stats (P2)

**EPIC: Infrastructure** (`cf-kanban-cf9`)
- `cf-kanban-7tl` Redis Integration (P1)
- `cf-kanban-yc1` Deployment Config (P1)
- `cf-kanban-92u` Notifications (P2)
- `cf-kanban-xrc` Health Alerts (P1)
- `cf-kanban-amd` Workspace Validation (P1)
- `cf-kanban-3rq` Open in Editor (P2)
- `cf-kanban-ije` KanbanCard AI Status (P1)

---

*Sprint Plan v1.0 - Generated 2026-01-10*
