# CF-Kanban Deployment Guide

## Overview

This guide covers deploying CF-Kanban to production environments. The application consists of:

- **SvelteKit Application**: Main web application and API
- **PostgreSQL Database**: Primary data store
- **Redis**: Caching and pub/sub for real-time features
- **WebSocket Server**: Real-time updates

---

## Prerequisites

- Node.js 20+ LTS
- npm 9+
- PostgreSQL 15+
- Redis 7+
- Domain with SSL certificate
- CI/CD pipeline (GitHub Actions recommended)

---

## Environment Configuration

### Required Environment Variables

Create `.env.production` with:

```bash
# Application
NODE_ENV=production
PUBLIC_BASE_URL=https://your-domain.com

# Database
DATABASE_URL="postgresql://user:password@host:5432/cf_kanban?schema=public"
DATABASE_POOL_SIZE=10

# Redis
REDIS_URL="redis://user:password@host:6379"

# Authentication (Clerk)
CLERK_SECRET_KEY=sk_live_xxx
PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_xxx

# WebSocket
WS_PORT=3001
WS_CORS_ORIGIN=https://your-domain.com

# Optional: Monitoring
SENTRY_DSN=https://xxx@sentry.io/xxx
LOG_LEVEL=info

# Optional: Performance
CACHE_TTL=3600
ENABLE_COMPRESSION=true
```

---

## Database Setup

### 1. Create Production Database

```sql
CREATE DATABASE cf_kanban;
CREATE USER cf_kanban_user WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE cf_kanban TO cf_kanban_user;
```

### 2. Run Migrations

```bash
# Generate Prisma client
npx prisma generate

# Apply migrations
npx prisma migrate deploy
```

### 3. Verify Database Indexes

```sql
-- These indexes should be created by migrations
-- Verify they exist:
SELECT indexname FROM pg_indexes WHERE tablename = 'Ticket';

-- Expected indexes:
-- idx_tickets_project_status
-- idx_ticket_history_ticket
-- idx_questions_ticket
```

---

## Redis Setup

### Production Configuration

```bash
# redis.conf
bind 0.0.0.0
port 6379
requirepass your_redis_password

# Persistence
save 900 1
save 300 10
save 60 10000
appendonly yes

# Memory management
maxmemory 256mb
maxmemory-policy allkeys-lru
```

### Verify Connection

```bash
redis-cli -h your-redis-host -a your_password ping
# Should return: PONG
```

---

## Build Process

### 1. Install Dependencies

```bash
npm ci --production=false
```

### 2. Build Application

```bash
npm run build
```

### 3. Verify Build

```bash
ls -la build/
# Should contain server files and static assets
```

---

## Docker Deployment

### Dockerfile

```dockerfile
# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Build application
COPY . .
RUN npx prisma generate
RUN npm run build

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 sveltekit
USER sveltekit

# Copy built application
COPY --from=builder --chown=sveltekit:nodejs /app/build build/
COPY --from=builder --chown=sveltekit:nodejs /app/node_modules node_modules/
COPY --from=builder --chown=sveltekit:nodejs /app/package.json .
COPY --from=builder --chown=sveltekit:nodejs /app/prisma prisma/

# Environment
ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

CMD ["node", "build"]
```

### docker-compose.yml

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://postgres:password@db:5432/cf_kanban
      - REDIS_URL=redis://redis:6379
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy
    restart: unless-stopped

  websocket:
    build: .
    ports:
      - "3001:3001"
    command: ["node", "server.js"]
    environment:
      - NODE_ENV=production
      - REDIS_URL=redis://redis:6379
    depends_on:
      - redis
    restart: unless-stopped

  db:
    image: postgres:15-alpine
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      POSTGRES_DB: cf_kanban
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
```

### Deploy with Docker

```bash
# Build images
docker-compose build

# Start services
docker-compose up -d

# View logs
docker-compose logs -f

# Run migrations
docker-compose exec app npx prisma migrate deploy
```

---

## Vercel Deployment

### vercel.json

```json
{
  "version": 2,
  "framework": "sveltekit",
  "buildCommand": "prisma generate && npm run build",
  "outputDirectory": ".svelte-kit/vercel",
  "env": {
    "DATABASE_URL": "@database-url",
    "REDIS_URL": "@redis-url"
  },
  "functions": {
    "api/**/*.ts": {
      "memory": 1024,
      "maxDuration": 30
    }
  }
}
```

### Deploy

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod

# Set environment variables
vercel env add DATABASE_URL production
vercel env add REDIS_URL production
vercel env add CLERK_SECRET_KEY production
```

---

## CI/CD Pipeline

### GitHub Actions

`.github/workflows/deploy.yml`:

```yaml
name: Deploy

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

env:
  NODE_VERSION: '20'

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run type check
        run: npm run check

      - name: Run unit tests
        run: npm test -- --run

      - name: Run E2E tests
        run: npx playwright install && npm run test:e2e

  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Run npm audit
        run: npm audit --audit-level=high

      - name: Run Snyk security scan
        uses: snyk/actions/node@master
        continue-on-error: true
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}

  build:
    runs-on: ubuntu-latest
    needs: [test, security]
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build

      - name: Upload build artifacts
        uses: actions/upload-artifact@v4
        with:
          name: build
          path: build/

  deploy:
    runs-on: ubuntu-latest
    needs: build
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4

      - name: Download build artifacts
        uses: actions/download-artifact@v4
        with:
          name: build
          path: build/

      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
```

---

## Health Checks

### API Health Endpoint

Create `src/routes/api/health/+server.ts`:

```typescript
import { json } from '@sveltejs/kit';
import { prisma } from '$lib/server/prisma';
import { redis } from '$lib/server/redis';

export async function GET() {
  const checks = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version,
    checks: {
      database: false,
      redis: false,
    },
  };

  try {
    // Check database
    await prisma.$queryRaw`SELECT 1`;
    checks.checks.database = true;
  } catch (error) {
    checks.status = 'unhealthy';
  }

  try {
    // Check Redis
    await redis.ping();
    checks.checks.redis = true;
  } catch (error) {
    checks.status = 'unhealthy';
  }

  const statusCode = checks.status === 'healthy' ? 200 : 503;
  return json(checks, { status: statusCode });
}
```

---

## Monitoring

### Sentry Integration

```bash
npm install @sentry/sveltekit
```

`src/hooks.client.ts`:
```typescript
import * as Sentry from '@sentry/sveltekit';

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  tracesSampleRate: 0.1,
  environment: import.meta.env.MODE,
});
```

### Logging

Use structured logging for production:

```typescript
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV === 'development'
    ? { target: 'pino-pretty' }
    : undefined,
});
```

---

## Scaling Considerations

### Horizontal Scaling

1. **Stateless Application**: Use Redis for session storage
2. **Load Balancer**: Use sticky sessions for WebSocket
3. **Database**: Use read replicas for heavy read loads
4. **Redis Cluster**: Use Redis Cluster for high availability

### Performance Optimization

1. **CDN**: Serve static assets from CDN
2. **Caching**: Implement aggressive caching with Redis
3. **Connection Pooling**: Use pgBouncer for database
4. **Compression**: Enable gzip/brotli

### Recommended Infrastructure

| Component | Development | Production |
|-----------|-------------|------------|
| App Servers | 1 | 2-4 |
| Database | 1 CPU, 1GB RAM | 2 CPU, 4GB RAM |
| Redis | 256MB | 1GB |
| Storage | 10GB | 100GB |

---

## Troubleshooting

### Common Issues

1. **Database Connection Errors**
   - Check `DATABASE_URL` format
   - Verify network/firewall rules
   - Check connection pool limits

2. **WebSocket Connection Issues**
   - Verify CORS configuration
   - Check load balancer sticky sessions
   - Verify Redis pub/sub connection

3. **Memory Issues**
   - Increase Node.js heap: `NODE_OPTIONS=--max-old-space-size=4096`
   - Check for memory leaks
   - Review caching strategy

### Debug Commands

```bash
# Check application logs
docker-compose logs -f app

# Check database connections
docker-compose exec db psql -U postgres -c "SELECT count(*) FROM pg_stat_activity;"

# Check Redis memory
docker-compose exec redis redis-cli info memory

# Test health endpoint
curl https://your-domain.com/api/health
```

---

## Backup and Recovery

### Database Backup

```bash
# Create backup
pg_dump -h host -U user -d cf_kanban > backup_$(date +%Y%m%d).sql

# Restore backup
psql -h host -U user -d cf_kanban < backup_20240115.sql
```

### Automated Backups

Use managed database with automated backups or set up cron job:

```bash
# /etc/cron.d/cf-kanban-backup
0 2 * * * root pg_dump -h localhost -U postgres cf_kanban | gzip > /backups/cf_kanban_$(date +\%Y\%m\%d).sql.gz
```

---

## Security Checklist

- [ ] HTTPS enabled with valid SSL certificate
- [ ] Environment variables secured (not in code)
- [ ] Database password is strong and rotated
- [ ] Redis password configured
- [ ] Rate limiting enabled
- [ ] CORS configured correctly
- [ ] Security headers configured
- [ ] npm audit shows no critical vulnerabilities
- [ ] Secrets are in secrets manager, not environment
- [ ] Logging does not include sensitive data
- [ ] Backups are encrypted and tested

---

## Support

For deployment issues:
1. Check the troubleshooting section
2. Review application logs
3. Open an issue on GitHub
