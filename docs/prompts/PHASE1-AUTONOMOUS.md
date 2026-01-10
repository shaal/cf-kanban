# Phase 1 Autonomous Implementation Prompt

Copy and paste this prompt to start autonomous implementation of CF-Kanban Phase 1.

---

## The Prompt

```
Implement Phase 1 of CF-Kanban following TDD methodology.

## Instructions

1. **Read the docs first** (in this order):
   - /docs/implementation/IMPLEMENTATION-PROMPT.md (overview)
   - /docs/implementation/PHASE1-TASKS.md (20 detailed tasks)
   - /docs/sparc/SPECIFICATION.md (data models, APIs)
   - /docs/testing/TDD-ARCHITECTURE.md (test patterns)

2. **Execute all 20 tasks in PHASE1-TASKS.md** autonomously:
   - Use TodoWrite to track progress through all tasks
   - Follow TDD: write failing test → implement → refactor
   - Run tests after each task to ensure nothing breaks

3. **Commit and push after EVERY task**:
   - After completing each TASK-XXX, create a commit with message:
     "feat(phase1): TASK-XXX - [brief description]"
   - Push to origin after every 3 commits (or after each sprint)
   - Use conventional commits: feat, test, fix, refactor, chore

4. **Work in parallel when possible**:
   - Spawn swarm agents for independent tasks
   - Use background agents for tests while implementing

5. **Don't ask for confirmation** - just execute. Only stop if:
   - A critical error blocks progress
   - A design decision has multiple valid approaches
   - External setup is needed (database, API keys)

6. **Store learnings** after each sprint:
   ```bash
   npx @claude-flow/cli@latest memory store --key "impl-sprint-N" --value "[learnings]" --namespace cf-kanban-impl
   ```

## Git Workflow

After each task:
```bash
git add -A
git commit -m "feat(phase1): TASK-XXX - description"
```

After each sprint (every 5 tasks):
```bash
git push origin main
```

## Success Criteria
By the end, I should have:
- [ ] SvelteKit app running at localhost:5173
- [ ] PostgreSQL + Prisma with Project/Ticket models
- [ ] Ticket state machine with full test coverage
- [ ] Basic Kanban board with drag-drop
- [ ] REST API for CRUD operations
- [ ] 80%+ test coverage
- [ ] 20 commits pushed to GitHub

Start now. Execute TASK-001 first.
```

---

## When to Use

- Starting a fresh implementation session
- Resuming after a break (Claude will read docs and pick up where left off)
- You want sequential, thorough execution with commits at each task

## Prerequisites

Before running this prompt:
1. Ensure Docker is available (for PostgreSQL)
2. Have Node.js 20+ installed
3. Be in the `/home/shaal/code/utilities/cf-kanban` directory
4. Ensure git remote is configured: `git remote -v`

## Expected Commits

```
feat(phase1): TASK-001 - Initialize SvelteKit project
feat(phase1): TASK-002 - Configure testing infrastructure
feat(phase1): TASK-003 - Set up Prisma with PostgreSQL
feat(phase1): TASK-004 - Define core data models
feat(phase1): TASK-005 - Create Prisma client singleton
   → git push origin main

feat(phase1): TASK-006 - Define ticket status enum and types
test(phase1): TASK-007 - Write state machine unit tests
feat(phase1): TASK-008 - Implement ticket state machine
feat(phase1): TASK-009 - Add state machine edge cases
   → git push origin main

feat(phase1): TASK-010 - Install UI dependencies
feat(phase1): TASK-011 - Create KanbanColumn component
feat(phase1): TASK-012 - Create KanbanCard component
feat(phase1): TASK-013 - Create KanbanBoard component
feat(phase1): TASK-014 - Add drag-and-drop functionality
   → git push origin main

feat(phase1): TASK-015 - Create main Kanban page
feat(phase1): TASK-016 - Implement projects API routes
feat(phase1): TASK-017 - Implement tickets API routes
feat(phase1): TASK-018 - Add integration tests
feat(phase1): TASK-019 - Add accessibility features
feat(phase1): TASK-020 - Final polish and documentation
   → git push origin main
```

## Expected Duration

- Sprint 1 (Setup): ~2 hours
- Sprint 2 (State Machine): ~3 hours
- Sprint 3 (UI Components): ~4 hours
- Sprint 4 (API & Polish): ~3 hours

**Total: ~12 hours of Claude execution time**
