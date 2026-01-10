# Phase 4 Swarm Implementation Prompt

Copy and paste this prompt to start **parallel swarm implementation** of CF-Kanban Phase 4.

**Focus**: Learning Visualization - Making AI learning visible through D3.js graphs and dashboards.

---

## The Prompt

```
Implement Phase 4 of CF-Kanban using swarm orchestration.

Read /docs/implementation/IMPLEMENTATION-PROMPT.md and /docs/implementation/PHASE4-TASKS.md.

## Execution Strategy

Spawn a swarm with these agents working in parallel:
- **D3 Agent**: TASK-066 to TASK-070 (D3.js setup, force graphs, animations)
- **Pattern Agent**: TASK-071 to TASK-075 (Pattern Explorer, clustering, search)
- **Neural Agent**: TASK-076 to TASK-079 (Training dashboard, metrics, charts)
- **Memory Agent**: TASK-080 to TASK-083 (Memory browser, namespace viewer)
- **Transfer Agent**: TASK-084 to TASK-087 (Cross-project patterns, sharing)
- **Testing Agent**: TASK-088 to TASK-090 (Visual tests, accessibility)

## Git Workflow (IMPORTANT)

After each agent completes its task group:
1. Stage all changes: `git add -A`
2. Create a commit for each completed task:
   ```bash
   git commit -m "feat(phase4): TASK-XXX - [description]"
   ```
3. Push after each agent completes its batch

Follow TDD. Run all agents in background. Synthesize results and push after each sprint.

Start now.
```

---

## When to Use

- Phase 3 is complete (Claude Flow integration working)
- You want to visualize AI learning patterns
- D3.js is the target visualization library

## How It Works

```
┌─────────────────────────────────────────────────────────────────┐
│                     PHASE 4 SWARM ORCHESTRATION                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                      │
│  │   D3     │  │ Pattern  │  │  Neural  │                      │
│  │  Agent   │  │  Agent   │  │  Agent   │                      │
│  │          │  │          │  │          │                      │
│  │ TASK-066 │  │ TASK-071 │  │ TASK-076 │                      │
│  │ TASK-067 │  │ TASK-072 │  │ TASK-077 │                      │
│  │ TASK-068 │  │ TASK-073 │  │ TASK-078 │                      │
│  │ TASK-069 │  │ TASK-074 │  │ TASK-079 │                      │
│  │ TASK-070 │  │ TASK-075 │  │          │                      │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘                      │
│       │             │             │                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                      │
│  │  Memory  │  │ Transfer │  │ Testing  │                      │
│  │  Agent   │  │  Agent   │  │  Agent   │                      │
│  │          │  │          │  │          │                      │
│  │ TASK-080 │  │ TASK-084 │  │ TASK-088 │                      │
│  │ TASK-081 │  │ TASK-085 │  │ TASK-089 │                      │
│  │ TASK-082 │  │ TASK-086 │  │ TASK-090 │                      │
│  │ TASK-083 │  │ TASK-087 │  │          │                      │
│  └──────────┘  └──────────┘  └──────────┘                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Key Visualizations

### 1. Pattern Explorer (Constellation View)
```
         ┌─────────────────────────────────────────┐
         │         PATTERN EXPLORER                 │
         │                                          │
         │           ●auth                          │
         │          / \                             │
         │       jwt●   ●oauth                      │
         │        |     |                           │
         │   session●   ●social-login               │
         │                                          │
         │  ●api          ●database                 │
         │   |              |                       │
         │  rest●         prisma●                   │
         │   |              |                       │
         │ graphql●       migrations●               │
         │                                          │
         │  [Search patterns...]  [Filter: All]     │
         └─────────────────────────────────────────┘
```

### 2. Neural Training Dashboard
```
         ┌─────────────────────────────────────────┐
         │      NEURAL TRAINING PROGRESS           │
         │                                          │
         │  SONA Adaptation: 0.04ms ████████░░ 85%  │
         │                                          │
         │  MoE Expert Usage:                       │
         │  [coding]  ████████████░░░ 78%           │
         │  [testing] ████████░░░░░░░ 52%           │
         │  [review]  █████░░░░░░░░░░ 34%           │
         │                                          │
         │  Training Loss (7d):                     │
         │  2.1 ┤  ╭────╮                           │
         │  1.4 ┤ ╭╯    ╰──╮                        │
         │  0.7 ┤─╯        ╰────                    │
         │      └─────────────────                  │
         │       Mon  Wed  Fri  Sun                 │
         └─────────────────────────────────────────┘
```

### 3. Memory Browser
```
         ┌─────────────────────────────────────────┐
         │         MEMORY BROWSER                   │
         │                                          │
         │  Namespaces:                             │
         │  ├─ patterns (1,247 entries)             │
         │  ├─ solutions (892 entries)              │
         │  ├─ agent-assignments (156 entries)      │
         │  └─ cf-kanban-impl (23 entries)          │
         │                                          │
         │  [Search: "auth"]                        │
         │                                          │
         │  Results:                                │
         │  ● jwt-auth-pattern  [94% success]       │
         │  ● oauth-flow        [89% success]       │
         │  ● session-mgmt      [87% success]       │
         │                                          │
         └─────────────────────────────────────────┘
```

## Agent Dependencies

| Agent | Can Start | Depends On |
|-------|-----------|------------|
| D3 Agent | Immediately | None |
| Pattern Agent | After TASK-068 | D3 force graph |
| Neural Agent | After TASK-068 | D3 charts |
| Memory Agent | After TASK-066 | D3 setup |
| Transfer Agent | After TASK-075 | Pattern Explorer |
| Testing Agent | After all others | Full implementation |

## Prerequisites

Before running this prompt:
1. Phase 3 complete (Claude Flow integration)
2. D3.js installed: `npm install d3`
3. Patterns exist in Claude Flow memory

## Expected Duration

With parallel execution:
- **D3 + Pattern + Neural**: ~4 hours (parallel)
- **Memory + Transfer**: ~3 hours (parallel with above)
- **Testing**: ~2 hours (sequential)

**Total: ~6 hours** (vs ~15 hours sequential)

## Success Criteria

- [ ] D3.js force-directed graph for patterns
- [ ] Interactive Pattern Explorer with search/filter
- [ ] Neural training dashboard with metrics
- [ ] Memory browser with namespace navigation
- [ ] Cross-project pattern sharing UI
- [ ] Smooth animations (<60fps)
- [ ] Accessible visualizations
- [ ] All tests passing
