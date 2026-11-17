-- ============================================================================
-- Smart Queue (QueueBee) — Application SQL Workload & Analytics Queries
-- Course: Advanced Programming (AP) · B.Tech 2nd Year
-- Group Lead: Yatharth Soni (2501010531) · Team T0083
-- Checkpoint 3 (CP3) Deliverable
-- ============================================================================

-- ============================================================================
-- Query 1: Concurrency-Safe Queue Row Locking for Atomic Ticket Generation
-- Used in: joinQueue service
-- Prevents race conditions on next_ticket_no under parallel student joins
-- ============================================================================
SELECT 
    id, 
    name, 
    status, 
    max_size, 
    next_ticket_no, 
    avg_service_seconds
FROM queues 
WHERE id = 'a0000000-0000-0000-0000-000000000001'::uuid 
FOR UPDATE;

-- Atomic increment:
UPDATE queues 
SET next_ticket_no = next_ticket_no + 1 
WHERE id = 'a0000000-0000-0000-0000-000000000001'::uuid;

-- ============================================================================
-- Query 2: Concurrency-Safe Worker Selection (FOR UPDATE SKIP LOCKED)
-- Used in: callNextStudent service
-- Allows multiple staff counters to call students in parallel without collision
-- ============================================================================
SELECT 
    id, 
    ticket_no, 
    user_id, 
    joined_at
FROM queue_entries
WHERE queue_id = 'a0000000-0000-0000-0000-000000000001'::uuid 
  AND status = 'WAITING'::entry_status_enum
ORDER BY ticket_no ASC
LIMIT 1
FOR UPDATE SKIP LOCKED;

-- ============================================================================
-- Query 3: Student Live Queue Position Lookup (PostgreSQL Relational Fallback)
-- Used in: getMyPosition service
-- ============================================================================
SELECT 
    COUNT(*) AS people_ahead
FROM queue_entries
WHERE queue_id = 'a0000000-0000-0000-0000-000000000001'::uuid
  AND status = 'WAITING'::entry_status_enum
  AND ticket_no < 42;

-- ============================================================================
-- Query 4: Statistical Median Calculation using PostgreSQL PERCENTILE_CONT
-- Used in: Historical analysis & ETA calibration
-- ============================================================================
SELECT 
    queue_id,
    ROUND(
        PERCENTILE_CONT(0.5) WITHIN GROUP (
            ORDER BY EXTRACT(EPOCH FROM (served_at - called_at))
        )::numeric
    ) AS median_service_seconds
FROM queue_entries
WHERE status = 'SERVED'::entry_status_enum
  AND called_at IS NOT NULL 
  AND served_at IS NOT NULL
GROUP BY queue_id;

-- ============================================================================
-- Query 5: Hourly Aggregation Rollup for Analytics Dashboard
-- Used in: syncHourlyStatsTable service
-- ============================================================================
SELECT 
    queue_id,
    date_trunc('hour', joined_at) AS hour_window,
    COUNT(*) AS total_joins,
    COUNT(CASE WHEN status = 'SERVED' THEN 1 END) AS total_served,
    COUNT(CASE WHEN status = 'NO_SHOW' THEN 1 END) AS total_no_shows,
    COALESCE(ROUND(AVG(EXTRACT(EPOCH FROM (called_at - joined_at)))), 0) AS avg_wait_seconds
FROM queue_entries
GROUP BY queue_id, date_trunc('hour', joined_at)
ORDER BY hour_window DESC;

-- ============================================================================
-- Query 6: Campus Peak Usage Hours (Hourly Distribution 0-23)
-- Used in: Admin Hourly Chart visualization
-- ============================================================================
SELECT 
    EXTRACT(HOUR FROM joined_at) AS hour_of_day,
    COUNT(*) AS student_joins,
    COUNT(CASE WHEN status = 'SERVED' THEN 1 END) AS students_served,
    COUNT(CASE WHEN status = 'NO_SHOW' THEN 1 END) AS no_shows
FROM queue_entries
GROUP BY hour_of_day
ORDER BY hour_of_day ASC;
