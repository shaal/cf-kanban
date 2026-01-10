# CF-Kanban

A real-time Kanban board application designed for AI-agent driven workflows, built with SvelteKit and integrated with Claude Flow.

## Features

- **AI-Agent Workflow States**: Extended ticket lifecycle with `NEEDS_FEEDBACK` and `READY_TO_RESUME` states for human-in-the-loop agent execution
- **Real-Time Collaboration**: WebSocket-based live updates powered by Socket.io and Redis pub/sub
- **Drag-and-Drop**: Smooth ticket movement between columns with optimistic updates
- **Role-Based Access Control**: Four-tier permission system (Owner, Admin, Member, Viewer)
- **Ticket Questions**: Structured feedback loop allowing agents to ask clarifying questions during execution
- **Execution Checkpoints**: State persistence for recovery on agent failure
- **Audit Logging**: Track all sensitive operations for compliance
- **Admin Dashboard**: Manage users, projects, and system settings

## Tech Stack

- **Frontend**: SvelteKit 2, Svelte 5, Tailwind CSS, bits-ui, lucide-svelte
- **Backend**: SvelteKit API routes, Prisma ORM, PostgreSQL
- **Real-Time**: Socket.io, Redis (pub/sub + caching)
- **Authentication**: Auth.js with OAuth providers
- **Visualization**: D3.js
- **Testing**: Vitest (unit/integration), Playwright (E2E), k6/Artillery (load)

## Ticket States

| State | Description |
|-------|-------------|
| BACKLOG | Unprioritized work |
| TODO | Ready to start |
| IN_PROGRESS | Being worked on |
| NEEDS_FEEDBACK | Agent waiting for user input |
| READY_TO_RESUME | Feedback provided, ready to continue |
| REVIEW | Work complete, awaiting review |
| DONE | Completed (terminal) |
| CANCELLED | Stopped (can reopen) |

## Installation

```bash
# Clone the repository
git clone <repo-url>
cd cf-kanban

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env

# Run database migrations
npx prisma migrate dev

# Start development server
npm run dev
```

## Environment Variables

```bash
DATABASE_URL="postgresql://user:password@localhost:5432/cf_kanban"
AUTH_SECRET="your-auth-secret"
REDIS_URL="redis://localhost:6379"
```

## Scripts

```bash
npm run dev           # Start development server
npm run dev:socket    # Start with WebSocket server
npm run build         # Build for production
npm run start         # Start production server
npm run test          # Run unit tests
npm run test:e2e      # Run E2E tests (Chromium)
npm run test:load     # Run load tests
npm run lint          # Check code style
npm run format        # Format code
```

## Project Structure

```
src/
├── lib/
│   ├── components/       # Reusable UI components
│   ├── server/           # Server-only code
│   │   ├── redis/        # Redis client and pub/sub
│   │   └── socket/       # WebSocket handlers
│   ├── state-machine/    # Ticket state transitions
│   ├── stores/           # Svelte stores
│   └── types/            # TypeScript types
├── routes/
│   ├── admin/            # Admin dashboard
│   ├── api/              # API endpoints
│   ├── auth/             # Authentication pages
│   ├── learning/         # Neural/memory UI
│   └── projects/         # Project boards
└── prisma/
    └── schema.prisma     # Database schema
```

## Claude Flow Integration

This project is designed to work with [Claude Flow](https://github.com/ruvnet/claude-flow) for multi-agent orchestration. The kanban board serves as a visual interface for tracking agent task execution.

## License

MIT
