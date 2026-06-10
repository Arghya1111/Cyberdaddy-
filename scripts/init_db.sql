-- ============================================================
-- CyberDaddy - PostgreSQL Initialization Script
-- Run once when the container starts fresh
-- ============================================================

-- Enable essential extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";      -- UUID generation
CREATE EXTENSION IF NOT EXISTS "pg_trgm";         -- Trigram full-text search
CREATE EXTENSION IF NOT EXISTS "btree_gin";       -- GIN index support
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements"; -- Query performance stats

-- Set timezone
SET timezone = 'UTC';

-- Configure performance settings (adjust based on your server RAM)
-- These are applied at session level here; set in postgresql.conf for persistence
-- ALTER SYSTEM SET shared_buffers = '256MB';
-- ALTER SYSTEM SET effective_cache_size = '1GB';
-- ALTER SYSTEM SET work_mem = '16MB';
-- ALTER SYSTEM SET maintenance_work_mem = '128MB';
-- ALTER SYSTEM SET wal_buffers = '16MB';
-- ALTER SYSTEM SET checkpoint_completion_target = 0.9;
-- ALTER SYSTEM SET random_page_cost = 1.1; -- For SSD storage

SELECT 'CyberDaddy PostgreSQL initialized successfully.' AS status;
