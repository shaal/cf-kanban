-- =============================================================================
-- TASK-109: PostgreSQL Initialization Script
-- =============================================================================
-- This script runs on first database initialization
-- Creates extensions and optimizes settings for production
-- =============================================================================

-- Enable useful extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- For fuzzy text search

-- Grant permissions (container user)
GRANT ALL PRIVILEGES ON DATABASE cfkanban TO cfkanban;

-- Create application schema if needed
-- Note: Prisma migrations handle table creation, this is for extensions only
