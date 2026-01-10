# Production Redis Configuration

## TASK-112: Redis Production Setup

This document outlines the production Redis setup for CF-Kanban, including caching, pub/sub, and session storage.

## Table of Contents

1. [Overview](#overview)
2. [Managed Redis Providers](#managed-redis-providers)
3. [Persistence Configuration](#persistence-configuration)
4. [High Availability](#high-availability)
5. [Security Configuration](#security-configuration)
6. [Performance Tuning](#performance-tuning)
7. [Failover Testing](#failover-testing)
8. [Monitoring](#monitoring)

## Overview

CF-Kanban uses Redis for:
- **Caching**: API response caching and query results
- **Pub/Sub**: Real-time event distribution across server instances
- **Session Storage**: User session data (optional)
- **Rate Limiting**: Request throttling counters

For production deployments, we recommend managed Redis services for:
- Automatic failover and high availability
- Built-in persistence and backups
- Managed security patches
- Monitoring and alerting

## Managed Redis Providers

### Upstash (Recommended for serverless)

Upstash provides serverless Redis with per-request pricing, ideal for variable workloads.

**Setup:**
1. Create a new Redis database at [upstash.com](https://upstash.com)
2. Copy the REST API endpoint and token
3. Configure environment variables

```bash
# Upstash connection (REST API)
UPSTASH_REDIS_REST_URL="https://your-endpoint.upstash.io"
UPSTASH_REDIS_REST_TOKEN="your-token"

# Or use standard Redis protocol
REDIS_URL="redis://default:password@your-endpoint.upstash.io:6379"
```

**Features:**
- Global replication (low latency worldwide)
- Pay-per-request pricing ($0.2/100K requests)
- Automatic persistence
- Free tier: 10K requests/day

### Railway (Recommended for simplicity)

Railway offers Redis as a plugin with easy setup.

**Setup:**
1. Add Redis plugin to your Railway project
2. Environment variables are auto-configured
3. Connection string available in dashboard

```bash
# Railway auto-injects this
REDIS_URL="redis://default:password@containers-us-west-xxx.railway.app:6379"
```

**Features:**
- Persistent storage
- 512MB free tier
- Automatic backups
- $5-20/month for larger instances

### AWS ElastiCache (Recommended for enterprise)

ElastiCache provides managed Redis with multi-AZ deployment.

**Setup:**
1. Create ElastiCache Redis cluster
2. Configure VPC security groups
3. Use cluster endpoint for connection

```bash
# ElastiCache endpoint
REDIS_URL="redis://primary.xxxxx.cache.amazonaws.com:6379"

# With password (AUTH token)
REDIS_URL="redis://:auth-token@primary.xxxxx.cache.amazonaws.com:6379"
```

**Features:**
- Multi-AZ with automatic failover
- Read replicas for scaling
- Encryption at rest and in transit
- Reserved instance pricing

### Redis Cloud (Official managed service)

Redis Labs' cloud offering with full Redis Enterprise features.

**Setup:**
1. Create a database at [redis.com/cloud](https://redis.com/cloud)
2. Configure database settings
3. Copy connection details

```bash
REDIS_URL="redis://default:password@redis-xxxxx.c123.us-east-1-4.ec2.cloud.redislabs.com:16379"
```

**Features:**
- Active-Active geo-replication
- RediSearch, RedisJSON modules
- 99.999% uptime SLA
- 30MB free tier

## Persistence Configuration

### RDB Snapshots

RDB creates point-in-time snapshots at intervals.

```bash
# docker-compose.prod.yml configuration
redis:
  command: >
    redis-server
    --save 900 1
    --save 300 10
    --save 60 10000
```

| Setting | Meaning |
|---------|---------|
| `save 900 1` | Snapshot every 15 min if 1 key changed |
| `save 300 10` | Snapshot every 5 min if 10 keys changed |
| `save 60 10000` | Snapshot every 1 min if 10000 keys changed |

### AOF (Append-Only File)

AOF logs every write operation for maximum durability.

```bash
redis:
  command: >
    redis-server
    --appendonly yes
    --appendfsync everysec
```

| Setting | Trade-off |
|---------|-----------|
| `appendfsync always` | Max durability, slower writes |
| `appendfsync everysec` | Balanced (recommended) |
| `appendfsync no` | Faster, may lose 1s of data |

### Recommended: RDB + AOF

Use both for optimal durability and recovery speed:

```bash
redis:
  command: >
    redis-server
    --appendonly yes
    --appendfsync everysec
    --save 900 1
    --save 300 10
    --save 60 10000
    --aof-use-rdb-preamble yes
```

## High Availability

### Redis Sentinel (Self-hosted)

Sentinel provides automatic failover for self-hosted Redis.

```yaml
# docker-compose.sentinel.yml
services:
  redis-master:
    image: redis:7-alpine
    command: redis-server --appendonly yes
    volumes:
      - redis-master:/data

  redis-replica:
    image: redis:7-alpine
    command: redis-server --replicaof redis-master 6379 --appendonly yes
    depends_on:
      - redis-master
    volumes:
      - redis-replica:/data

  sentinel:
    image: redis:7-alpine
    command: redis-sentinel /etc/redis/sentinel.conf
    volumes:
      - ./sentinel.conf:/etc/redis/sentinel.conf
    depends_on:
      - redis-master
      - redis-replica
```

Sentinel configuration:
```
# sentinel.conf
sentinel monitor mymaster redis-master 6379 2
sentinel down-after-milliseconds mymaster 5000
sentinel failover-timeout mymaster 60000
sentinel parallel-syncs mymaster 1
```

### Redis Cluster (Self-hosted scaling)

For horizontal scaling and automatic sharding:

```yaml
# Example cluster setup (simplified)
services:
  redis-node-1:
    image: redis:7-alpine
    command: redis-server --cluster-enabled yes --cluster-config-file nodes.conf
    volumes:
      - redis1:/data

  redis-node-2:
    image: redis:7-alpine
    command: redis-server --cluster-enabled yes --cluster-config-file nodes.conf
    volumes:
      - redis2:/data

  # Add more nodes as needed (minimum 6 for cluster)
```

### Managed HA Options

| Provider | HA Method | Failover Time |
|----------|-----------|---------------|
| Upstash | Multi-zone replication | Automatic, <10s |
| Railway | Single instance | Manual restart |
| ElastiCache | Multi-AZ replicas | Automatic, ~30s |
| Redis Cloud | Active-Active | Automatic, <1s |

## Security Configuration

### Network Security

1. **VPC/Private Networking**
   - Keep Redis in private subnet
   - No public internet access
   - Use VPC peering for cross-service access

2. **Security Groups/Firewall**
   ```
   # Allow only from application servers
   Port 6379: 10.0.0.0/8 (internal VPC CIDR)
   ```

### Authentication

```bash
# Enable AUTH password
redis-server --requirepass "${REDIS_PASSWORD}"

# Connection string with password
REDIS_URL="redis://:${REDIS_PASSWORD}@hostname:6379"
```

### TLS Encryption

For managed services, TLS is typically enabled by default. For self-hosted:

```bash
redis-server \
  --tls-port 6379 \
  --port 0 \
  --tls-cert-file /path/to/redis.crt \
  --tls-key-file /path/to/redis.key \
  --tls-ca-cert-file /path/to/ca.crt
```

Connection with TLS:
```bash
REDIS_URL="rediss://:password@hostname:6379"  # Note: rediss (with s)
```

### Access Control (Redis 6+)

Create separate users with limited permissions:

```redis
# Admin user
ACL SETUSER admin on >admin-password ~* +@all

# Application user (limited)
ACL SETUSER cfkanban on >app-password ~cfkanban:* +@read +@write +@connection -@admin -@dangerous
```

## Performance Tuning

### Memory Configuration

```bash
redis-server \
  --maxmemory 512mb \
  --maxmemory-policy allkeys-lru
```

| Policy | Use Case |
|--------|----------|
| `noeviction` | Persist all data, error on full |
| `allkeys-lru` | Cache with LRU eviction (recommended) |
| `volatile-lru` | Evict only keys with TTL |
| `allkeys-random` | Random eviction |
| `volatile-ttl` | Evict keys closest to expiry |

### Connection Settings

```typescript
// src/lib/server/redis.ts
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL!, {
  // Connection pool
  maxRetriesPerRequest: 3,
  retryDelayOnFailover: 100,

  // Timeouts
  connectTimeout: 10000,
  commandTimeout: 5000,

  // Reconnection
  retryStrategy: (times) => {
    if (times > 10) return null;
    return Math.min(times * 50, 2000);
  },

  // Enable for cluster mode
  // enableReadyCheck: true,
  // scaleReads: 'slave',
});

export { redis };
```

### Pipelining

Batch multiple commands for efficiency:

```typescript
// Instead of multiple calls
await redis.set('key1', 'value1');
await redis.set('key2', 'value2');
await redis.set('key3', 'value3');

// Use pipeline
const pipeline = redis.pipeline();
pipeline.set('key1', 'value1');
pipeline.set('key2', 'value2');
pipeline.set('key3', 'value3');
await pipeline.exec();
```

### Key Design

Follow naming conventions for efficient operations:

```
cfkanban:cache:project:{projectId}
cfkanban:pubsub:{channel}
cfkanban:session:{sessionId}
cfkanban:ratelimit:{userId}:{endpoint}
```

## Failover Testing

### Test Procedure

1. **Verify Current State**
   ```bash
   redis-cli INFO replication
   redis-cli PING
   ```

2. **Simulate Master Failure**
   ```bash
   # For Sentinel setup
   redis-cli -p 26379 SENTINEL failover mymaster

   # For managed services, use provider's failover API
   ```

3. **Monitor Failover**
   ```bash
   # Watch Sentinel logs
   redis-cli -p 26379 SENTINEL get-master-addr-by-name mymaster
   ```

4. **Verify Application**
   - Check application logs for reconnection
   - Verify no data loss
   - Confirm latency returned to normal

### Failover Checklist

- [ ] Application handles connection errors gracefully
- [ ] Reconnection logic works correctly
- [ ] No data loss during failover
- [ ] Pub/Sub channels reconnect
- [ ] Failover completes within RTO target
- [ ] Alerts triggered appropriately

### Automated Failover Test Script

```bash
#!/bin/bash
# scripts/test-redis-failover.sh

echo "Testing Redis failover..."

# Get current master
MASTER=$(redis-cli -h sentinel -p 26379 SENTINEL get-master-addr-by-name mymaster | head -1)
echo "Current master: $MASTER"

# Trigger failover
echo "Triggering failover..."
redis-cli -h sentinel -p 26379 SENTINEL failover mymaster

# Wait and check new master
sleep 10
NEW_MASTER=$(redis-cli -h sentinel -p 26379 SENTINEL get-master-addr-by-name mymaster | head -1)
echo "New master: $NEW_MASTER"

if [ "$MASTER" != "$NEW_MASTER" ]; then
    echo "Failover successful!"
else
    echo "WARNING: Master did not change"
    exit 1
fi

# Verify connectivity
redis-cli -h $NEW_MASTER PING
```

## Monitoring

### Key Metrics

| Metric | Warning | Critical |
|--------|---------|----------|
| Memory usage | 70% | 85% |
| Connected clients | 80% of max | 95% of max |
| Keyspace hit rate | < 80% | < 50% |
| Evicted keys/sec | > 10 | > 100 |
| Blocked clients | > 5 | > 20 |
| Replication lag | > 100ms | > 1000ms |

### Redis INFO Command

Monitor key metrics:

```bash
# Memory info
redis-cli INFO memory | grep -E "(used_memory|maxmemory)"

# Clients
redis-cli INFO clients | grep connected_clients

# Stats
redis-cli INFO stats | grep -E "(keyspace_hits|keyspace_misses|evicted_keys)"

# Replication
redis-cli INFO replication | grep -E "(role|master_link_status|slave_repl_offset)"
```

### Application Monitoring

```typescript
// src/lib/server/redis-health.ts
import { redis } from './redis';

export async function checkRedisHealth(): Promise<{
  healthy: boolean;
  latencyMs?: number;
  info?: Record<string, string>;
  error?: string;
}> {
  const start = Date.now();
  try {
    const pong = await redis.ping();
    const info = await redis.info('memory');

    // Parse memory info
    const memoryInfo: Record<string, string> = {};
    info.split('\n').forEach(line => {
      const [key, value] = line.split(':');
      if (key && value) memoryInfo[key.trim()] = value.trim();
    });

    return {
      healthy: pong === 'PONG',
      latencyMs: Date.now() - start,
      info: memoryInfo
    };
  } catch (error) {
    return {
      healthy: false,
      latencyMs: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
```

### Alerting Rules

```yaml
# Prometheus alerting rules
groups:
  - name: redis
    rules:
      - alert: RedisDown
        expr: redis_up == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: Redis is down

      - alert: RedisMemoryHigh
        expr: redis_memory_used_bytes / redis_memory_max_bytes > 0.85
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: Redis memory usage above 85%

      - alert: RedisReplicationBroken
        expr: redis_master_link_up == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: Redis replication is broken

      - alert: RedisSlowOperations
        expr: rate(redis_commands_duration_seconds_total[5m]) > 0.01
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: Redis operations are slow
```

## Production Checklist

Before going to production, verify:

- [ ] Managed Redis instance created
- [ ] Persistence configured (RDB + AOF)
- [ ] High availability enabled (replica/multi-AZ)
- [ ] Authentication enabled
- [ ] TLS encryption enabled
- [ ] Memory limits configured
- [ ] Eviction policy set
- [ ] Connection pooling configured
- [ ] Monitoring and alerting set up
- [ ] Failover tested and documented
- [ ] Backup strategy verified
