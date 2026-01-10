# Production Database Configuration

## TASK-111: PostgreSQL Production Setup

This document outlines the production database setup for CF-Kanban using managed PostgreSQL services.

## Table of Contents

1. [Overview](#overview)
2. [Managed Database Providers](#managed-database-providers)
3. [Connection Pooling](#connection-pooling)
4. [Backup Strategy](#backup-strategy)
5. [Disaster Recovery](#disaster-recovery)
6. [Performance Tuning](#performance-tuning)
7. [Security Configuration](#security-configuration)
8. [Monitoring](#monitoring)

## Overview

CF-Kanban uses PostgreSQL 16 for persistent data storage. For production deployments, we recommend using a managed PostgreSQL service for:

- Automatic backups and point-in-time recovery
- High availability with automatic failover
- Managed security patches and updates
- Built-in monitoring and alerting

## Managed Database Providers

### Railway (Recommended for startups)

Railway provides a simple, developer-friendly PostgreSQL service.

**Setup:**
1. Create a new PostgreSQL service in your Railway project
2. Copy the connection string from the Railway dashboard
3. Set `DATABASE_URL` in your environment

```bash
# Example Railway connection string format
DATABASE_URL="postgresql://user:password@host.railway.app:5432/railway"
```

**Features:**
- Automatic daily backups (7-day retention)
- Built-in connection pooling
- Automatic failover
- $5-20/month for small workloads

### Supabase (Recommended for real-time features)

Supabase provides PostgreSQL with additional features like real-time subscriptions.

**Setup:**
1. Create a new Supabase project
2. Navigate to Settings > Database
3. Copy the connection string (use "Connection pooling" for production)

```bash
# Example Supabase connection string format
DATABASE_URL="postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres"

# With connection pooling (recommended)
DATABASE_URL="postgresql://postgres:[password]@db.[project-ref].supabase.co:6543/postgres?pgbouncer=true"
```

**Features:**
- Daily backups with point-in-time recovery
- Built-in PgBouncer connection pooling
- Row-level security support
- Free tier available, $25/month for Pro

### AWS RDS (Recommended for enterprise)

AWS RDS provides enterprise-grade PostgreSQL with extensive configuration options.

**Setup:**
1. Create an RDS PostgreSQL instance
2. Configure VPC security groups
3. Set up the connection string

```bash
# Example RDS connection string format
DATABASE_URL="postgresql://user:password@mydb.xxxxx.us-east-1.rds.amazonaws.com:5432/cfkanban"
```

**Features:**
- Multi-AZ deployment for high availability
- Automated backups with 35-day retention
- Performance Insights for monitoring
- Read replicas for scaling

## Connection Pooling

### Why Connection Pooling?

Serverless environments and high-traffic applications can exhaust PostgreSQL connections. Connection pooling maintains a pool of reusable connections.

### Using PgBouncer

For self-hosted or providers without built-in pooling, use PgBouncer:

```yaml
# docker-compose.prod.yml addition
services:
  pgbouncer:
    image: edoburu/pgbouncer:1.20.0
    environment:
      DATABASE_URL: ${DATABASE_URL}
      POOL_MODE: transaction
      MAX_CLIENT_CONN: 100
      DEFAULT_POOL_SIZE: 20
      MIN_POOL_SIZE: 5
    ports:
      - "6432:6432"
    healthcheck:
      test: ["CMD", "pg_isready", "-h", "localhost", "-p", "6432"]
      interval: 10s
      timeout: 5s
      retries: 5
```

### Prisma Connection Pool Settings

Configure Prisma for optimal connection pooling:

```prisma
// prisma/schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  // For Supabase/managed poolers, add:
  // directUrl = env("DIRECT_URL")
}
```

```typescript
// src/lib/server/prisma.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  },
  log: process.env.NODE_ENV === 'development'
    ? ['query', 'info', 'warn', 'error']
    : ['error']
});

export { prisma };
```

### Recommended Pool Settings

| Setting | Development | Production |
|---------|-------------|------------|
| connection_limit | 5 | 10-25 |
| pool_timeout | 10000 | 30000 |
| idle_timeout | 60000 | 300000 |

## Backup Strategy

### Automated Backups

All managed providers include automated backups. Configure retention:

| Provider | Default Retention | Max Retention |
|----------|-------------------|---------------|
| Railway | 7 days | 7 days |
| Supabase | 7 days (Free), 30 days (Pro) | 30 days |
| AWS RDS | 7 days | 35 days |

### Manual Backup Script

For additional backup security:

```bash
#!/bin/bash
# scripts/backup-db.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="backup_${DATE}.sql"

# Create backup
pg_dump "${DATABASE_URL}" > "${BACKUP_FILE}"

# Compress
gzip "${BACKUP_FILE}"

# Upload to S3 (or other storage)
aws s3 cp "${BACKUP_FILE}.gz" "s3://cf-kanban-backups/${BACKUP_FILE}.gz"

# Clean up local file
rm "${BACKUP_FILE}.gz"

echo "Backup completed: ${BACKUP_FILE}.gz"
```

### Backup Schedule

| Backup Type | Frequency | Retention |
|-------------|-----------|-----------|
| Full automated | Daily | 30 days |
| Manual snapshot | Before major changes | 90 days |
| Point-in-time | Continuous (WAL) | 7 days |

## Disaster Recovery

### Recovery Time Objective (RTO)

- **Target:** < 15 minutes for failover
- **Method:** Managed provider automatic failover or standby replica promotion

### Recovery Point Objective (RPO)

- **Target:** < 1 hour of data loss
- **Method:** Point-in-time recovery from WAL logs

### Disaster Recovery Procedure

1. **Identify the issue**
   ```bash
   # Check database connectivity
   psql "${DATABASE_URL}" -c "SELECT 1"
   ```

2. **Failover to standby (if available)**
   - Railway: Automatic
   - Supabase: Automatic
   - RDS: Promote read replica or restore from snapshot

3. **Point-in-time recovery**
   ```bash
   # For RDS:
   aws rds restore-db-instance-to-point-in-time \
     --source-db-instance-identifier cfkanban-prod \
     --target-db-instance-identifier cfkanban-recovery \
     --restore-time "2026-01-09T12:00:00Z"
   ```

4. **Restore from backup**
   ```bash
   # Download latest backup
   aws s3 cp "s3://cf-kanban-backups/latest.sql.gz" .
   gunzip latest.sql.gz

   # Restore to new database
   psql "${NEW_DATABASE_URL}" < latest.sql
   ```

5. **Update application connection**
   - Update `DATABASE_URL` in environment
   - Restart application
   - Verify connectivity and data integrity

### DR Testing Schedule

- **Monthly:** Connection failover test
- **Quarterly:** Full restoration from backup
- **Annually:** Complete DR drill

## Performance Tuning

### PostgreSQL Configuration

For managed databases, these settings are typically pre-configured:

```sql
-- Recommended settings (adjust based on instance size)
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '768MB';
ALTER SYSTEM SET maintenance_work_mem = '128MB';
ALTER SYSTEM SET checkpoint_completion_target = 0.9;
ALTER SYSTEM SET wal_buffers = '16MB';
ALTER SYSTEM SET default_statistics_target = 100;
ALTER SYSTEM SET random_page_cost = 1.1;
ALTER SYSTEM SET effective_io_concurrency = 200;
ALTER SYSTEM SET work_mem = '16MB';
```

### Indexing Strategy

Ensure these indexes exist for optimal performance:

```sql
-- Primary indexes (created by Prisma)
-- Additional performance indexes

-- For ticket filtering by status and project
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ticket_project_status
ON "Ticket" ("projectId", "status");

-- For ticket history queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_history_ticket_created
ON "TicketHistory" ("ticketId", "createdAt" DESC);

-- For question lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_question_ticket_answered
ON "TicketQuestion" ("ticketId", "answered")
WHERE answered = false;
```

### Query Optimization

Enable query analysis:

```sql
-- Slow query logging
ALTER SYSTEM SET log_min_duration_statement = 1000;

-- Query statistics
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
```

## Security Configuration

### SSL/TLS

Always use SSL connections in production:

```bash
DATABASE_URL="postgresql://user:password@host:5432/db?sslmode=require"
```

### Access Control

1. **Restrict IP access**
   - Use VPC/private networking when possible
   - Whitelist only application server IPs

2. **Use separate credentials**
   - Admin user for migrations
   - Application user with limited permissions

```sql
-- Create application user with limited permissions
CREATE USER cfkanban_app WITH PASSWORD 'secure_password';
GRANT CONNECT ON DATABASE cfkanban TO cfkanban_app;
GRANT USAGE ON SCHEMA public TO cfkanban_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO cfkanban_app;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO cfkanban_app;
```

### Secrets Management

- Store credentials in environment variables
- Use secrets management (AWS Secrets Manager, Vault)
- Rotate credentials periodically

## Monitoring

### Key Metrics

| Metric | Warning Threshold | Critical Threshold |
|--------|-------------------|-------------------|
| Connection count | 80% of max | 95% of max |
| CPU utilization | 70% | 90% |
| Storage usage | 80% | 95% |
| Replication lag | 10 seconds | 60 seconds |
| Long-running queries | 30 seconds | 60 seconds |

### Monitoring Tools

1. **Provider dashboards**
   - Railway: Built-in metrics
   - Supabase: Dashboard with usage metrics
   - RDS: CloudWatch metrics

2. **Application-level**
   ```typescript
   // Add Prisma query logging
   const prisma = new PrismaClient({
     log: [
       { level: 'query', emit: 'event' },
       { level: 'error', emit: 'stdout' }
     ]
   });

   prisma.$on('query', (e) => {
     if (e.duration > 1000) {
       console.warn(`Slow query (${e.duration}ms): ${e.query}`);
     }
   });
   ```

### Alerting

Set up alerts for critical conditions:

```yaml
# Example Prometheus alerting rules
groups:
  - name: database
    rules:
      - alert: DatabaseConnectionsHigh
        expr: pg_stat_activity_count > 80
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: High database connection count

      - alert: DatabaseDown
        expr: pg_up == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: Database is down
```

## Checklist

Before going to production, verify:

- [ ] Managed PostgreSQL instance created
- [ ] Connection pooling configured
- [ ] Automated backups enabled
- [ ] Point-in-time recovery configured
- [ ] Disaster recovery procedure documented
- [ ] Performance indexes created
- [ ] SSL/TLS enabled
- [ ] Application user with limited permissions
- [ ] Monitoring and alerting configured
- [ ] DR procedure tested
