-- ============================================================================
-- Smart Queue (QueueBee) — PostgreSQL Production DDL Schema
-- Course: Advanced Programming (AP) · B.Tech 2nd Year
-- Group Lead: Yatharth Soni (2501010531) · Team T0083
-- Checkpoint 2 (CP2) Deliverable
-- ============================================================================

-- Enable UUID extension if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Create Enums
DO $$ BEGIN
    CREATE TYPE role_enum AS ENUM ('STUDENT', 'STAFF', 'ADMIN');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE queue_status_enum AS ENUM ('OPEN', 'PAUSED', 'CLOSED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE entry_status_enum AS ENUM ('WAITING', 'CALLED', 'SERVED', 'NO_SHOW', 'CANCELLED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Table: users
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role role_enum NOT NULL DEFAULT 'STUDENT',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 3. Table: locations
CREATE TABLE IF NOT EXISTS locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    building VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 4. Table: queues
CREATE TABLE IF NOT EXISTS queues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    status queue_status_enum NOT NULL DEFAULT 'OPEN',
    max_size INTEGER NOT NULL DEFAULT 100 CHECK (max_size > 0),
    next_ticket_no INTEGER NOT NULL DEFAULT 1 CHECK (next_ticket_no >= 1),
    avg_service_seconds INTEGER NOT NULL DEFAULT 300 CHECK (avg_service_seconds >= 0),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 5. Table: staff_assignments
CREATE TABLE IF NOT EXISTS staff_assignments (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    queue_id UUID NOT NULL REFERENCES queues(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, queue_id)
);

-- 6. Table: queue_entries
CREATE TABLE IF NOT EXISTS queue_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    queue_id UUID NOT NULL REFERENCES queues(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    ticket_no INTEGER NOT NULL CHECK (ticket_no >= 1),
    status entry_status_enum NOT NULL DEFAULT 'WAITING',
    joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    called_at TIMESTAMP WITH TIME ZONE,
    served_at TIMESTAMP WITH TIME ZONE,
    served_by UUID REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT uq_queue_ticket UNIQUE (queue_id, ticket_no)
);

-- 7. Table: queue_stats_hourly
CREATE TABLE IF NOT EXISTS queue_stats_hourly (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    queue_id UUID NOT NULL REFERENCES queues(id) ON DELETE CASCADE,
    hour TIMESTAMP WITH TIME ZONE NOT NULL,
    joins INTEGER NOT NULL DEFAULT 0 CHECK (joins >= 0),
    served INTEGER NOT NULL DEFAULT 0 CHECK (served >= 0),
    no_shows INTEGER NOT NULL DEFAULT 0 CHECK (no_shows >= 0),
    avg_wait_seconds DOUBLE PRECISION NOT NULL DEFAULT 0.0 CHECK (avg_wait_seconds >= 0.0),
    CONSTRAINT uq_queue_hour UNIQUE (queue_id, hour)
);

-- ============================================================================
-- Indexes for Concurrency, Foreign Keys & Analytics Optimization
-- ============================================================================

-- Index for queue lookups by location
CREATE INDEX IF NOT EXISTS idx_queues_location_id ON queues(location_id);
CREATE INDEX IF NOT EXISTS idx_queues_status ON queues(status);

-- Concurrency safe queue selection: fast lookup for FIFO waiting tickets with row locking
CREATE INDEX IF NOT EXISTS idx_queue_entries_queue_status_joined 
ON queue_entries(queue_id, status, joined_at);

-- Fast lookup for student active entries
CREATE INDEX IF NOT EXISTS idx_queue_entries_user_status 
ON queue_entries(user_id, status);

-- Analytics range queries
CREATE INDEX IF NOT EXISTS idx_queue_entries_joined_at ON queue_entries(joined_at);
CREATE INDEX IF NOT EXISTS idx_queue_entries_served_at ON queue_entries(served_at);

-- Partial Unique Index: A student can only have ONE active (WAITING or CALLED) ticket per queue
CREATE UNIQUE INDEX IF NOT EXISTS unique_active_student_queue 
ON queue_entries(queue_id, user_id) 
WHERE status IN ('WAITING', 'CALLED');

-- Hourly statistics indexes
CREATE INDEX IF NOT EXISTS idx_queue_stats_queue_id ON queue_stats_hourly(queue_id);
CREATE INDEX IF NOT EXISTS idx_queue_stats_hour ON queue_stats_hourly(hour);
