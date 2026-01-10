# Product Requirements Document: AI-Orchestrated Kanban System

## Vision Statement

**"The Kanban board IS the entire interface. Users never touch the terminal."**

A futuristic web-based visual Kanban system (2045 vision) that serves as the **command center for Claude Flow swarms**. Users create tickets in the browser, and Claude Code executes them autonomously in the background. The system provides unprecedented visibility into AI learning, patterns, and decision-making.

---

## Core Paradigm: Swim-Lane Human-AI Handoff

### The Fundamental Innovation

Unlike traditional AI chat interfaces where users wait in real-time for responses, this system implements **asynchronous bounded autonomy** through swim lanes:

```
┌────────────────────────────────────────────────────────────────────────────────┐
│                         SWIM-LANE STATE MACHINE                                │
├────────────┬────────────┬───────────────┬──────────────┬──────────┬───────────┤
│  BACKLOG   │  IN WORK   │    NEEDS      │   READY TO   │ IN REVIEW│   DONE    │
│   (User)   │  (Claude)  │   FEEDBACK    │    RESUME    │  (User)  │ (Claude)  │
│            │            │    (User)     │    (User)    │          │           │
├────────────┼────────────┼───────────────┼──────────────┼──────────┼───────────┤
│ User       │ Claude     │ Claude hit    │ User moved   │ Work     │ Complete  │
│ creates    │ works      │ a decision    │ ticket here  │ ready    │ with      │
│ tickets    │ autonomously│ point        │ after        │ for      │ learning  │
│            │            │               │ answering    │ approval │ artifacts │
└────────────┴────────────┴───────────────┴──────────────┴──────────┴───────────┘
```

### Key Principles

1. **Users Work OUTSIDE Claude Code** - The Kanban UI is the primary interface
2. **Claude Code is Autonomous** - Works on tickets without hand-holding
3. **Swim Lanes for Handoffs** - When Claude needs input, tickets move to "Needs Feedback"
4. **User-Driven Flow** - Users answer questions in UI, move tickets to "Ready to Resume"
5. **Learning is Visible** - Completed tickets show what Claude learned

---

## Document Index

This PRD is supported by detailed specification documents created by our research swarm:

| Document | Location | Contents |
|----------|----------|----------|
| **SPARC Specification** | `/docs/sparc/SPECIFICATION.md` | User personas, 40+ user stories, requirements, API contracts |
| **System Architecture** | Embedded in this PRD | Federated swarm, data flow, tech stack |
| **UX Vision 2045** | `/docs/ux/AI-KANBAN-UX-VISION-2045.md` | Visual language, interactions, components |
| **TDD Architecture** | `/docs/testing/TDD-ARCHITECTURE.md` | Test strategy, 100+ test case examples |

---

## Part 1: Market Context & Research

### Market Validation

| Metric | Value | Source |
|--------|-------|--------|
| AI PM Market 2025 | $7.8B | Industry reports |
| AI PM Market 2030 | $52.62B (46.3% CAGR) | Projections |
| Developer AI Adoption | 84% using or planning | 2025 surveys |
| Multi-Agent Interest | +1,445% YoY | Q1 2024 → Q2 2025 |

### Competitive Differentiation

| Feature | Vibe Kanban (Current) | CF-Kanban (Our Vision) |
|---------|----------------------|-------------------------|
| Primary Focus | Git worktrees, parallel agents | **Human-AI handoff workflow** |
| User Location | Developer-centric, terminal | **Kanban IS the entire interface** |
| Learning Visibility | Not visible | **Learning dashboard, pattern graphs** |
| Feedback Loop | Not formalized | **Swim-lane state machine** |
| Multi-Project | Yes | Yes + **cross-project pattern transfer** |

### Key Industry Insight

> *"Orchestration, not bigger models, is the real AI productivity multiplier"* — MIT Technology Review, 2025

---

## Part 2: User Personas

### Alex - Solo Developer
- **Context**: Managing 3-5 AI-assisted projects simultaneously
- **Goal**: Focus on architecture while AI handles implementation
- **Key Need**: Clear visibility into what AI is doing across all projects

### Maya - Team Lead
- **Context**: Orchestrating AI swarms across team of 8 developers
- **Goal**: Maintain quality and consistency with AI assistance
- **Key Need**: Override controls and approval workflows

### Dr. Chen - Enterprise Architect
- **Context**: Monitoring 50+ projects for AI maturity patterns
- **Goal**: Optimize organizational AI learning transfer
- **Key Need**: Cross-project analytics and pattern library

### Jordan - Non-Technical User
- **Context**: Product manager creating tasks for AI execution
- **Goal**: Get features built without knowing how to code
- **Key Need**: Natural language task creation, plain-language status

---

## Part 3: Core Features

### 3.1 Project Workspace

**Multi-Project Dashboard**
- Create unlimited projects, each with isolated Claude Code instance
- Configure swarm topology per project (mesh, hierarchical, hybrid)
- Set learning preferences (share patterns globally or keep private)
- Resource allocation: CPU, memory, max agents per project

**Project Templates**
- Pre-configured swarm setups for common use cases
- "Web App" template: coder + tester + reviewer agents
- "Security Audit" template: security-architect + security-auditor
- "Documentation" template: researcher + api-docs agents

### 3.2 Ticket Management

**Ticket Creation**
- Natural language descriptions ("Add user authentication with OAuth")
- Label system for routing hints (backend, frontend, security, performance)
- Priority levels with SLA implications
- Attachments: mockups, specs, reference code

**Intelligent Analysis**
- Automatic complexity scoring (1-10)
- Suggested agent assignment based on learned patterns
- Estimated completion time from historical data
- Dependency detection across tickets

**Swim-Lane Workflow**

| Lane | Owner | Trigger | Actions |
|------|-------|---------|---------|
| Backlog | User | Manual creation | Ticket sits until prioritized |
| To Do | User | User drags ticket | Queued for agent assignment |
| In Work | Claude | Auto-assigned | Swarm spawned, execution begins |
| Needs Feedback | Claude | Hit decision point | Questions displayed on card |
| Ready to Resume | User | User answered | Queued for Claude to continue |
| In Review | Claude | Work complete | User verifies output |
| Done | User | User approves | Learning artifacts recorded |

**Feedback Interaction**
When Claude needs user input:
```
┌─────────────────────────────────────────────────┐
│ TICKET-142: Add OAuth Integration               │
├─────────────────────────────────────────────────┤
│ ❓ Claude needs your input:                     │
│                                                 │
│ 1. Which OAuth providers should I support?      │
│    [ ] Google  [ ] GitHub  [ ] Microsoft        │
│                                                 │
│ 2. Should refresh tokens be stored in:          │
│    ○ HTTP-only cookies (more secure)            │
│    ○ Local storage (easier to implement)        │
│                                                 │
│ [Submit Answers] [Ask Claude to Clarify]        │
└─────────────────────────────────────────────────┘
```

### 3.3 Agent Orchestration

**60+ Agent Types Available**
- Core: `coder`, `reviewer`, `tester`, `planner`, `researcher`
- Specialized: `security-architect`, `performance-engineer`, `ml-developer`
- Swarm: `hierarchical-coordinator`, `mesh-coordinator`, `consensus-builder`
- SPARC: `specification`, `pseudocode`, `architecture`, `refinement`

**Visual Agent Catalog**
- Browse all agent types with capabilities
- Filter by task type, success rate, average completion time
- See which agents work best together
- Custom agent configuration

**Swarm Visualization**
Real-time visualization of active swarms:
- Node graph showing agent connections
- Color-coded status (idle, working, blocked, learning)
- Communication threads between agents
- Consensus voting indicators

### 3.4 Learning Dashboard

**Pattern Explorer**
- Interactive D3.js graph of learned patterns
- Cluster by domain (auth, API, testing, etc.)
- Filter by success rate, recency, usage count
- Transfer patterns between projects

**Neural Training Progress**
- SONA adaptation metrics (<0.05ms target)
- MoE expert utilization breakdown
- Loss/accuracy graphs over time
- EWC++ forgetting prevention status

**Memory Browser**
- Browse all namespaces: patterns, solutions, tasks, custom
- Semantic search across all entries
- Store new patterns manually
- View vector similarity neighbors

**Cross-Project Insights**
- Which patterns transferred successfully
- Performance impact of shared patterns
- Pattern attribution and provenance
- Opt-in/out sharing controls

### 3.5 Real-Time Updates

**WebSocket Architecture**
- Instant ticket status changes
- Live agent progress streaming
- Pattern storage notifications
- System health alerts

**Notification Preferences**
- In-app notifications
- Email digests
- Webhook integrations
- Mobile push (future)

---

## Part 4: System Architecture

### High-Level Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                      CF-KANBAN ARCHITECTURE                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   ┌─────────────────┐        ┌─────────────────┐                   │
│   │  Web Frontend   │        │  Web Frontend   │  (Multiple Users) │
│   │  (SvelteKit 2)  │        │  (SvelteKit 2)  │                   │
│   └────────┬────────┘        └────────┬────────┘                   │
│            │                          │                             │
│            └────────────┬─────────────┘                             │
│                         ▼                                           │
│   ┌─────────────────────────────────────────────────────────────┐  │
│   │              API Gateway / WebSocket Server                  │  │
│   │              (Socket.IO v4 + Express)                        │  │
│   └─────────────────────────┬───────────────────────────────────┘  │
│                             │                                       │
│            ┌────────────────┼────────────────┐                     │
│            ▼                ▼                ▼                     │
│   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐               │
│   │  Project A  │  │  Project B  │  │  Project N  │               │
│   │   Swarm     │  │   Swarm     │  │   Swarm     │               │
│   │ (Claude Code)│  │ (Claude Code)│ │ (Claude Code)│              │
│   └──────┬──────┘  └──────┬──────┘  └──────┬──────┘               │
│          │                │                │                       │
│          └────────────────┼────────────────┘                       │
│                           ▼                                         │
│   ┌─────────────────────────────────────────────────────────────┐  │
│   │              Shared Intelligence Layer                       │  │
│   │  (HNSW Patterns + Neural Training + Cross-Project Learning) │  │
│   └─────────────────────────────────────────────────────────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Federated Swarm Coordination

Multiple Claude Code instances coordinate through Redis:

| Component | Purpose | Technology |
|-----------|---------|------------|
| Task Queue | Distribute tickets | Redis Streams / BullMQ |
| Event Bus | Real-time propagation | Redis Pub/Sub |
| Pattern Store | Shared HNSW index | Redis + RediSearch |
| State Sync | CRDT consistency | Automerge / Yjs |

### Ticket-to-Agent Pipeline

1. **Ticket Ingestion** - Parse title, description, labels
2. **Complexity Analysis** - Estimate files, classify type, score 1-10
3. **Topology Selection** - Single/mesh/hierarchical based on complexity
4. **Agent Routing** - Match task to agents using learned patterns
5. **Swarm Initialization** - CLI: `swarm init`, spawn agents via Task tool
6. **Progress Tracking** - WebSocket updates, checkpoints, completion

### Technology Stack

> **Why SvelteKit?** SvelteKit is the optimal choice for CF-Kanban because:
> 1. **Animation-first architecture** - Svelte's built-in transitions and motion primitives are ideal for our 2045 UX vision with fluid agent visualizations
> 2. **Smaller bundles** - No virtual DOM overhead means faster load times (<2s TTI target)
> 3. **Superior D3 integration** - Svelte's reactive declarations work seamlessly with D3's data-driven approach, no useEffect gymnastics needed
> 4. **Less boilerplate** - Stores are simpler than Zustand, reactivity is built-in

**Frontend**
- SvelteKit 2+ (SSR, file-based routing)
- Svelte Stores + TanStack Query/Svelte (state)
- Socket.IO Client (real-time)
- D3.js (visualizations - native Svelte reactivity)
- svelte-dnd-action (drag & drop)
- Bits UI + Tailwind CSS (components)

**Backend**
- Node.js + Express/Fastify
- Socket.IO v4 (WebSocket)
- PostgreSQL + Prisma (database)
- Redis (cache, pub/sub, vectors)
- Clerk/Auth.js (authentication)

**Infrastructure**
- Vercel/Cloudflare Pages (frontend) + Railway (backend)
- Docker Compose (dev) / K8s (prod)
- Grafana + Prometheus (monitoring)
- Pino + Loki (logging)

---

## Part 5: Non-Functional Requirements

### Performance

| Metric | Target |
|--------|--------|
| Real-time update latency | <100ms |
| Agent spawn time | <2s |
| Memory search (1M+ entries) | <50ms |
| WebSocket reconnection | <5s |
| Page load (TTI) | <2s |

### Scalability

| Dimension | Target |
|-----------|--------|
| Concurrent projects | 100+ |
| Concurrent agents | 500+ |
| Stored patterns | 1M+ |
| WebSocket connections | 10K+ |

### Security

- Sandboxed agent execution per project
- RBAC for team management
- AES-256 encryption at rest
- TLS 1.3 in transit
- Complete audit logging
- No secrets cross project boundaries

### Reliability

- 99.9% uptime target
- Byzantine fault tolerance for swarms
- Auto-recovery <30s on agent failure
- Checkpoint/restore for long-running tasks

---

## Part 6: Implementation Roadmap

### Phase 1: Foundation (Weeks 1-4)
- [ ] SvelteKit project setup with TypeScript
- [ ] Basic Kanban board UI (drag-drop columns with svelte-dnd-action)
- [ ] REST API for CRUD operations
- [ ] PostgreSQL with Prisma
- [ ] Basic authentication

### Phase 2: Real-time Layer (Weeks 5-8)
- [ ] Socket.IO integration
- [ ] Namespace/room architecture
- [ ] Redis pub/sub and caching
- [ ] WebSocket event handlers
- [ ] Real-time ticket updates

### Phase 3: Claude Flow Integration (Weeks 9-12)
- [ ] CLI command wrapper service
- [ ] Ticket analysis pipeline
- [ ] Agent assignment algorithm
- [ ] Swarm initialization workflow
- [ ] Progress tracking system
- [ ] **Swim-lane feedback loop implementation**

### Phase 4: Learning Visualization (Weeks 13-16)
- [ ] Pattern Explorer with D3.js
- [ ] Neural training dashboard
- [ ] Memory browser UI
- [ ] Cross-project transfer view
- [ ] Hook configuration interface

### Phase 5: Polish & Scale (Weeks 17-20)
- [ ] Performance optimization
- [ ] Multi-project workspace polish
- [ ] Resource allocation dashboard
- [ ] Admin panel
- [ ] Production deployment

---

## Part 7: Success Metrics

### User Engagement
- DAU/MAU ratio > 40%
- Average session duration > 15 minutes
- Tickets created per user per week > 10

### System Performance
- 95th percentile response time < 200ms
- Agent success rate > 85%
- Pattern reuse rate > 30%

### Learning Effectiveness
- Cross-project pattern transfer success > 70%
- Time-to-completion improvement > 20% over 3 months
- User satisfaction score > 4.2/5

---

## Part 8: Feature Discovery & AI Assistant

### The Challenge: Feature-Rich Without Overwhelming

Claude Flow has **140+ capabilities** across agents, hooks, workers, and commands. Users need to:
1. Discover what's possible
2. Find the right tool for their task
3. Not be overwhelmed by options

### Solution: Progressive Disclosure + AI Chat

```
┌─────────────────────────────────────────────────────────────────────────┐
│  CF-KANBAN UI LAYOUT                                                    │
├──────────────────────┬──────────────────────────────────────────────────┤
│                      │                                                  │
│   SIDEBAR            │    MAIN KANBAN BOARD                             │
│   ───────────        │    ──────────────────                            │
│                      │                                                  │
│   🏠 Dashboard       │    [Backlog] [To Do] [In Work] [Feedback] [Done] │
│                      │                                                  │
│   📋 Projects        │    ┌─────────┐ ┌─────────┐ ┌─────────┐           │
│      └ Project A     │    │ Ticket  │ │ Ticket  │ │ Ticket  │           │
│      └ Project B     │    │ #101    │ │ #102    │ │ #103    │           │
│                      │    └─────────┘ └─────────┘ └─────────┘           │
│   🤖 Capabilities    │                                                  │
│      └ Agents (60+)  │                                                  │
│      └ Hooks (27)    │                                                  │
│      └ Workers (12)  │                                                  │
│                      │                                                  │
│   📊 Learning        │                                                  │
│      └ Patterns      │                                                  │
│      └ Training      │                                                  │
│                      ├──────────────────────────────────────────────────┤
│   ⚙️ Settings        │                                                  │
│                      │   💬 AI ASSISTANT (Collapsible Panel)            │
├──────────────────────┤   ─────────────────────────────                  │
│                      │   │ "How can I help? Ask about                   │
│   💬 ASK CLAUDE      │   │  features or let me create                   │
│   [What can I do?]   │   │  tickets for you."                           │
│                      │   │                                              │
│                      │   │ User: "What agents are good                  │
│                      │   │        for security audits?"                 │
│                      │   │                                              │
│                      │   │ Claude: "For security audits,                │
│                      │   │ I recommend:                                 │
│                      │   │ • security-architect - designs               │
│                      │   │   secure systems                             │
│                      │   │ • security-auditor - finds                   │
│                      │   │   vulnerabilities                            │
│                      │   │ • reviewer - code review                     │
│                      │   │                                              │
│                      │   │ [Create Security Audit Ticket]"              │
│                      │   │                                              │
│                      │   │ [Type a message...]              [Send]      │
│                      │                                                  │
└──────────────────────┴──────────────────────────────────────────────────┘
```

### Feature Discovery Mechanisms

#### 1. Capabilities Browser (Organized Hierarchy)

```
📁 Capabilities
├── 🤖 Agents (60+)
│   ├── Core Development
│   │   └── coder, reviewer, tester, planner, researcher
│   ├── Specialized
│   │   └── security-architect, performance-engineer, ml-developer
│   ├── Swarm Coordination
│   │   └── hierarchical-coordinator, mesh-coordinator, consensus-builder
│   └── Domain Specific
│       └── backend-dev, mobile-dev, api-docs, cicd-engineer
│
├── 🪝 Hooks (27)
│   ├── Lifecycle Hooks
│   │   └── pre-task, post-task, pre-edit, post-edit
│   ├── Learning Hooks
│   │   └── pretrain, neural train, pattern store
│   └── Session Hooks
│       └── session-start, session-end, session-restore
│
└── ⚙️ Workers (12)
    ├── Critical Priority
    │   └── audit (security scanning)
    ├── High Priority
    │   └── optimize (performance)
    └── Normal Priority
        └── ultralearn, map, testgaps, document, consolidate
```

#### 2. Contextual Suggestions

When creating/editing tickets, show relevant capabilities:

```
┌─────────────────────────────────────────────────────┐
│ NEW TICKET                                          │
├─────────────────────────────────────────────────────┤
│ Title: [Add OAuth integration                    ]  │
│                                                     │
│ Description:                                        │
│ [Support Google and GitHub OAuth for user login  ]  │
│                                                     │
│ ───────────────────────────────────────────────────│
│ 🤖 SUGGESTED FOR THIS TICKET:                       │
│                                                     │
│ Agents: [security-architect] [coder] [tester]       │
│ Topology: hierarchical (complexity: 7)              │
│ Hooks: security-scan will auto-run                  │
│                                                     │
│ 💡 Similar past tickets used these patterns:        │
│    • jwt-auth-pattern (94% success)                 │
│    • oauth-flow-pattern (89% success)               │
│                                                     │
│                          [Create Ticket] [Cancel]   │
└─────────────────────────────────────────────────────┘
```

#### 3. AI Chat Assistant (The Key Feature)

**Purpose**: Natural language interface to all Claude Flow capabilities

**Capabilities**:
- Answer "What can I do?" questions about features
- Explain any agent, hook, or worker in plain language
- Create tickets via conversation
- Suggest optimal configurations
- Troubleshoot issues

**Example Conversations**:

```
User: "I want to improve my app's performance"
Claude: "I can help with performance optimization! Here's what I recommend:

1. **Performance Audit Ticket** - I'll create a ticket that spawns:
   • performance-engineer agent to profile your app
   • optimize worker to suggest improvements

2. **After the audit**, I'll create targeted fix tickets

Should I create the performance audit ticket now?

[Yes, Create Ticket] [Tell Me More] [Configure Manually]"
```

```
User: "What's the difference between mesh and hierarchical topology?"
Claude: "Great question! Here's the difference:

**Mesh Topology** 🕸️
- All agents communicate with each other directly
- Best for: collaborative tasks, brainstorming, code review
- More democratic, slower consensus

**Hierarchical Topology** 🏛️
- One coordinator agent leads worker agents
- Best for: complex features, clear task breakdown
- Faster decisions, single point of coordination

**Your current project uses**: hierarchical-mesh (hybrid)

Want me to explain when to change topology?"
```

```
User: "Create a ticket to add user authentication"
Claude: "I'll create that ticket for you. Let me gather a few details:

**Title**: Add user authentication
**Suggested Priority**: High (security-related)
**Recommended Agents**:
  • security-architect (design)
  • coder (implement)
  • tester (verify)
  • reviewer (security review)

**I have a question**: Which authentication method?
• JWT with refresh tokens
• Session-based auth
• OAuth providers (Google, GitHub)
• Let Claude decide

[Select one or type custom]"
```

#### 4. Command Palette (Cmd+K)

Quick access to all capabilities via fuzzy search:

```
┌─────────────────────────────────────────────────────────┐
│ 🔍 Search commands, agents, hooks...                    │
├─────────────────────────────────────────────────────────┤
│ > security                                              │
│                                                         │
│ 🤖 Agents                                               │
│    security-architect - Design secure systems           │
│    security-auditor - Find vulnerabilities              │
│                                                         │
│ 🪝 Hooks                                                │
│    security-scan - Run security analysis                │
│                                                         │
│ ⚙️ Workers                                              │
│    audit - Critical priority security scanning          │
│                                                         │
│ 📋 Actions                                              │
│    Create security audit ticket                         │
│    View security patterns learned                       │
└─────────────────────────────────────────────────────────┘
```

#### 5. Interactive Tutorials (First-Time Users)

```
┌─────────────────────────────────────────────────────────┐
│ 👋 WELCOME TO CF-KANBAN                                 │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ Let's get you started! Choose your path:                │
│                                                         │
│ ┌───────────────────┐  ┌───────────────────┐           │
│ │  🚀 QUICK START   │  │  📚 FULL TOUR     │           │
│ │                   │  │                   │           │
│ │  Create your      │  │  Learn about all  │           │
│ │  first ticket     │  │  60+ agents and   │           │
│ │  in 2 minutes     │  │  capabilities     │           │
│ └───────────────────┘  └───────────────────┘           │
│                                                         │
│ ┌───────────────────┐  ┌───────────────────┐           │
│ │  💬 ASK CLAUDE    │  │  📖 READ DOCS     │           │
│ │                   │  │                   │           │
│ │  Tell me what     │  │  Browse the       │           │
│ │  you want to      │  │  full reference   │           │
│ │  build today      │  │  documentation    │           │
│ └───────────────────┘  └───────────────────┘           │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Chat Assistant Technical Design

**Architecture**:
```
User Message → Intent Classification → Route to Handler
                                            │
              ┌─────────────────────────────┼─────────────────────────────┐
              │                             │                             │
              ▼                             ▼                             ▼
      Feature Question             Ticket Creation              Troubleshooting
      Handler                      Handler                      Handler
              │                             │                             │
              ▼                             ▼                             ▼
      Search capabilities          Parse requirements           Check logs
      Generate explanation         Suggest agents               Diagnose issue
      Show examples                Create ticket draft          Suggest fixes
```

**Integration Points**:
- Access to all Claude Flow CLI commands
- Memory search for relevant patterns
- Ticket creation API
- Project/swarm status APIs

---

## Part 9: Open Questions

1. **Monetization Model**: Per-seat, per-project, or usage-based?
2. **Enterprise Features**: SSO, audit logs, custom agent training?
3. **Mobile Experience**: Full app or notification-only?
4. **Offline Mode**: Queue tickets when disconnected?
5. **AI Provider Lock-in**: Support for non-Anthropic models?

---

## Appendix A: Claude Flow Integration Reference

### CLI Commands Exposed as UI Actions

| UI Action | CLI Command |
|-----------|-------------|
| "Start Work" button | `swarm init` + `agent spawn(s)` |
| Drag to "In Progress" | `task assign` + `swarm init` |
| "Pause" button | `agent stop --graceful` |
| "Cancel" button | `swarm terminate` |
| "View Patterns" | `memory search --namespace` |
| "Health Check" | `doctor --fix` |

### All 27 Hooks Available

| Hook | Purpose |
|------|---------|
| `pre-edit` / `post-edit` | File modification tracking |
| `pre-task` / `post-task` | Task lifecycle |
| `pre-command` / `post-command` | Command safety |
| `route` / `route-task` | Agent routing |
| `session-start` / `session-end` | Session persistence |
| `pretrain` | Knowledge bootstrapping |
| `build-agents` | Generate agent configs |
| `neural train/predict/patterns` | Neural learning |
| `coverage-route/suggest/gaps` | Test coverage |
| `worker dispatch/list/status` | Background workers |

### 12 Background Workers

| Worker | Priority | Function |
|--------|----------|----------|
| `audit` | CRITICAL | Security analysis |
| `optimize` | HIGH | Performance optimization |
| `ultralearn` | NORMAL | Deep knowledge acquisition |
| `map` | NORMAL | Codebase mapping |
| `testgaps` | NORMAL | Test coverage analysis |
| `document` | NORMAL | Auto-documentation |
| `consolidate` | LOW | Memory consolidation |

---

## Appendix B: UX Component Library

See `/docs/ux/AI-KANBAN-UX-VISION-2045.md` for detailed specifications:

1. **KanbanCard** - AI status indicators, knowledge ring, confidence display
2. **AgentSwarmVisualization** - Canvas-based neural mesh
3. **LearningPatternGraph** - Constellation-style pattern visualization
4. **MemoryBrowser** - List/Graph/Timeline views
5. **ProjectParallelView** - Multi-project comparison
6. **TimeTravelViewer** - Decision replay with what-if

---

## Appendix C: TDD Test Categories

See `/docs/testing/TDD-ARCHITECTURE.md` for 100+ example test cases:

- **Unit Tests** (75%): Ticket state machine, agent routing, memory operations
- **Integration Tests** (20%): Ticket lifecycle, multi-project, pattern transfer
- **E2E Tests** (5%): Complete user journeys, visual regression
- **AI Tests** (orthogonal): Behavior verification, learning validation, consensus

---

*PRD Version: 1.0*
*Created: 2026-01-09*
*Research Swarm: 5 agents (Researcher, Architect, SPARC, TDD, UX)*
*Total Research Output: ~200,000 tokens*
