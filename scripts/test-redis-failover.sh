#!/bin/bash
# =============================================================================
# TASK-112: Redis Failover Test Script
# =============================================================================
# Tests Redis connection and simulates failover scenarios
#
# Usage:
#   ./scripts/test-redis-failover.sh              # Basic health check
#   ./scripts/test-redis-failover.sh --failover   # Test failover (Sentinel)
#   ./scripts/test-redis-failover.sh --stress     # Connection stress test
# =============================================================================

set -euo pipefail

# Configuration
REDIS_URL="${REDIS_URL:-redis://localhost:6379}"
SENTINEL_HOST="${SENTINEL_HOST:-localhost}"
SENTINEL_PORT="${SENTINEL_PORT:-26379}"
MASTER_NAME="${REDIS_MASTER_NAME:-mymaster}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# Extract host and port from Redis URL
parse_redis_url() {
    local url=$1
    # Remove redis:// prefix
    url=${url#redis://}
    url=${url#rediss://}
    # Remove password if present
    url=${url#*@}
    # Extract host and port
    REDIS_HOST=${url%:*}
    REDIS_PORT=${url#*:}
    REDIS_PORT=${REDIS_PORT%/*}  # Remove database if present
}

# Basic health check
health_check() {
    log_step "Running Redis health check..."

    parse_redis_url "$REDIS_URL"

    # Test PING
    log_info "Testing PING..."
    if redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" PING | grep -q "PONG"; then
        log_info "PING: OK"
    else
        log_error "PING: FAILED"
        return 1
    fi

    # Test basic operations
    log_info "Testing SET/GET..."
    local test_key="cfkanban:test:$(date +%s)"
    local test_value="health-check-$(date +%s)"

    redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" SET "$test_key" "$test_value" EX 60 > /dev/null
    local result=$(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" GET "$test_key")

    if [ "$result" = "$test_value" ]; then
        log_info "SET/GET: OK"
    else
        log_error "SET/GET: FAILED (expected '$test_value', got '$result')"
        return 1
    fi

    # Clean up
    redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" DEL "$test_key" > /dev/null

    # Get server info
    log_info "Server Information:"
    echo "  Version: $(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" INFO server | grep redis_version | cut -d: -f2 | tr -d '\r')"
    echo "  Uptime: $(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" INFO server | grep uptime_in_days | cut -d: -f2 | tr -d '\r') days"
    echo "  Clients: $(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" INFO clients | grep connected_clients | cut -d: -f2 | tr -d '\r')"
    echo "  Memory: $(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" INFO memory | grep used_memory_human | cut -d: -f2 | tr -d '\r')"

    # Check replication status
    local role=$(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" INFO replication | grep role | cut -d: -f2 | tr -d '\r')
    echo "  Role: $role"

    if [ "$role" = "slave" ]; then
        echo "  Master: $(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" INFO replication | grep master_host | cut -d: -f2 | tr -d '\r')"
        echo "  Link Status: $(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" INFO replication | grep master_link_status | cut -d: -f2 | tr -d '\r')"
    fi

    log_info "Health check completed successfully!"
}

# Sentinel failover test
failover_test() {
    log_step "Testing Redis Sentinel failover..."

    # Check if sentinel is available
    if ! redis-cli -h "$SENTINEL_HOST" -p "$SENTINEL_PORT" PING > /dev/null 2>&1; then
        log_error "Cannot connect to Sentinel at $SENTINEL_HOST:$SENTINEL_PORT"
        log_warn "Failover test requires Redis Sentinel"
        return 1
    fi

    # Get current master
    log_info "Getting current master..."
    local master_info=$(redis-cli -h "$SENTINEL_HOST" -p "$SENTINEL_PORT" SENTINEL get-master-addr-by-name "$MASTER_NAME")
    local current_master=$(echo "$master_info" | head -1)
    log_info "Current master: $current_master"

    # Get number of replicas
    local replicas=$(redis-cli -h "$SENTINEL_HOST" -p "$SENTINEL_PORT" SENTINEL replicas "$MASTER_NAME" | grep -c "name")
    log_info "Number of replicas: $replicas"

    if [ "$replicas" -eq 0 ]; then
        log_warn "No replicas available - failover will not work!"
        return 1
    fi

    # Trigger failover
    log_warn "Triggering failover..."
    redis-cli -h "$SENTINEL_HOST" -p "$SENTINEL_PORT" SENTINEL failover "$MASTER_NAME"

    # Wait for failover
    log_info "Waiting for failover to complete..."
    local max_wait=30
    local waited=0

    while [ $waited -lt $max_wait ]; do
        sleep 1
        waited=$((waited + 1))

        local new_master=$(redis-cli -h "$SENTINEL_HOST" -p "$SENTINEL_PORT" SENTINEL get-master-addr-by-name "$MASTER_NAME" | head -1)

        if [ "$new_master" != "$current_master" ]; then
            log_info "Failover completed in ${waited}s"
            log_info "New master: $new_master"
            break
        fi

        echo -n "."
    done

    echo ""

    if [ $waited -ge $max_wait ]; then
        log_error "Failover timed out after ${max_wait}s"
        return 1
    fi

    # Verify new master is responsive
    local new_master_host=$(redis-cli -h "$SENTINEL_HOST" -p "$SENTINEL_PORT" SENTINEL get-master-addr-by-name "$MASTER_NAME" | head -1)
    local new_master_port=$(redis-cli -h "$SENTINEL_HOST" -p "$SENTINEL_PORT" SENTINEL get-master-addr-by-name "$MASTER_NAME" | tail -1)

    if redis-cli -h "$new_master_host" -p "$new_master_port" PING | grep -q "PONG"; then
        log_info "New master is responding to PING"
    else
        log_error "New master is not responding!"
        return 1
    fi

    # Test write to new master
    local test_key="cfkanban:failover:test"
    redis-cli -h "$new_master_host" -p "$new_master_port" SET "$test_key" "after-failover" EX 60 > /dev/null

    if [ "$(redis-cli -h "$new_master_host" -p "$new_master_port" GET "$test_key")" = "after-failover" ]; then
        log_info "Write to new master: OK"
    else
        log_error "Write to new master: FAILED"
        return 1
    fi

    redis-cli -h "$new_master_host" -p "$new_master_port" DEL "$test_key" > /dev/null

    log_info "Failover test completed successfully!"
}

# Connection stress test
stress_test() {
    log_step "Running connection stress test..."

    parse_redis_url "$REDIS_URL"

    local connections=50
    local operations=1000
    local errors=0

    log_info "Testing $connections concurrent connections with $operations operations each..."

    # Create test script
    local test_script=$(mktemp)
    cat > "$test_script" << 'SCRIPT'
#!/bin/bash
HOST=$1
PORT=$2
OPS=$3
ID=$4

for i in $(seq 1 $OPS); do
    KEY="stress:$ID:$i"
    if ! redis-cli -h "$HOST" -p "$PORT" SET "$KEY" "value$i" EX 10 > /dev/null 2>&1; then
        echo "ERROR"
        exit 1
    fi
    if ! redis-cli -h "$HOST" -p "$PORT" GET "$KEY" > /dev/null 2>&1; then
        echo "ERROR"
        exit 1
    fi
    redis-cli -h "$HOST" -p "$PORT" DEL "$KEY" > /dev/null 2>&1
done
echo "OK"
SCRIPT
    chmod +x "$test_script"

    # Run parallel connections
    local start_time=$(date +%s)

    for i in $(seq 1 $connections); do
        "$test_script" "$REDIS_HOST" "$REDIS_PORT" "$operations" "$i" &
    done

    # Wait for all and count errors
    for job in $(jobs -p); do
        if ! wait "$job"; then
            errors=$((errors + 1))
        fi
    done

    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    local total_ops=$((connections * operations * 3))  # SET, GET, DEL
    local ops_per_sec=$((total_ops / (duration + 1)))

    # Clean up
    rm -f "$test_script"

    log_info "Stress test results:"
    echo "  Duration: ${duration}s"
    echo "  Total operations: $total_ops"
    echo "  Operations/sec: $ops_per_sec"
    echo "  Errors: $errors"

    if [ $errors -eq 0 ]; then
        log_info "Stress test completed successfully!"
    else
        log_error "Stress test completed with $errors errors"
        return 1
    fi
}

# Main
main() {
    case "${1:-health}" in
        --failover)
            failover_test
            ;;
        --stress)
            stress_test
            ;;
        health|*)
            health_check
            ;;
    esac
}

main "$@"
