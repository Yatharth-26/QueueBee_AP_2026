-- ============================================================================
-- QueueBee - SQL queries used by the application (CP3)
-- Course: Advanced Programming (AP) · B.Tech 2nd Year · Team T0083
--
-- Run 03_schema.sql first. This file can then be run from top to bottom:
--     psql -d queuebee_db -f dbms/04_queries.sql
-- Queries look people/places up by email or name (not by id), so they work
-- even if your auto-increment ids are different.
-- NOTE: this file INSERTs sample rows. Use a practice database, not real data.
--
-- Every query is classified with -- READ or -- WRITE immediately before it,
-- and JOINs are used wherever applicable to replace unnecessary scalar subqueries.
-- ============================================================================


-- ============================================================================
-- PART A - INSERT (Create)
-- ============================================================================

-- Q1. Insert users (registration always creates a STUDENT; staff/admin are set by the admin)
-- The password column holds a bcrypt hash; 'hash_demo' is only a placeholder here.
-- WRITE
INSERT INTO "User" ("name", "email", "passwordHash", "role") VALUES
    ('Admin Anita',  'admin@queuebee.edu',   'hash_demo', 'ADMIN'),
    ('Staff Sameer', 'staff@queuebee.edu',   'hash_demo', 'STAFF'),
    ('Demo Student', 'student@queuebee.edu', 'hash_demo', 'STUDENT'),
    ('Riya Sharma',  'riya@queuebee.edu',    'hash_demo', 'STUDENT'),
    ('Kabir Mehta',  'kabir@queuebee.edu',   'hash_demo', 'STUDENT'),
    ('Meera Nair',   'meera@queuebee.edu',   'hash_demo', 'STUDENT');

-- Q2. Insert locations
-- WRITE
INSERT INTO "Location" ("name", "description", "avgServiceMinutes") VALUES
    ('Canteen',      'Main campus canteen - food counter', 3),
    ('Library Desk', 'Book issue and return desk',         4),
    ('Fee Office',   'Fee payment and receipts',           6);

-- Seed historical sample tickets for testing later queries.
-- Uses an INSERT ... SELECT with JOINs on "User" and "Location" instead of repeated scalar subqueries.
-- WRITE
INSERT INTO "QueueTicket" ("ticketNumber", "status", "createdAt", "calledAt", "completedAt", "userId", "locationId")
SELECT v."ticketNumber", v."status"::"TicketStatus", v."createdAt", v."calledAt", v."completedAt", u."id", l."id"
FROM (VALUES
    (1, 'COMPLETED', now() - interval '90 min', now() - interval '85 min', now() - interval '82 min', 'riya@queuebee.edu',    'Canteen'),
    (2, 'COMPLETED', now() - interval '80 min', now() - interval '78 min', now() - interval '75 min', 'kabir@queuebee.edu',   'Canteen'),
    (3, 'WAITING',   now() - interval '10 min', NULL,                      NULL,                      'riya@queuebee.edu',    'Canteen'),
    (4, 'WAITING',   now() - interval '5 min',  NULL,                      NULL,                      'kabir@queuebee.edu',   'Canteen'),
    (1, 'COMPLETED', now() - interval '200 min', now() - interval '195 min', now() - interval '190 min', 'student@queuebee.edu', 'Library Desk'),
    (2, 'WAITING',   now() - interval '8 min',  NULL,                      NULL,                      'meera@queuebee.edu',   'Library Desk'),
    (1, 'CANCELLED', now() - interval '300 min', NULL,                      NULL,                      'student@queuebee.edu', 'Fee Office')
) AS v("ticketNumber", "status", "createdAt", "calledAt", "completedAt", "userEmail", "locationName")
JOIN "User" u     ON u."email" = v."userEmail"
JOIN "Location" l ON l."name" = v."locationName";

-- Q3. Create a queue ticket (a student joins the Canteen queue)
-- New ticket number = highest number in that location + 1 (1 if the location has no tickets).
-- Uses a JOIN on "User" and "Location" instead of a scalar subquery.
-- The UNIQUE ("locationId","ticketNumber") rule stops two tickets getting the same number.
-- WRITE
INSERT INTO "QueueTicket" ("ticketNumber", "userId", "locationId")
SELECT COALESCE(MAX(t."ticketNumber"), 0) + 1,
       u."id",
       l."id"
FROM "Location" l
JOIN "User" u ON u."email" = 'student@queuebee.edu'
LEFT JOIN "QueueTicket" t ON t."locationId" = l."id"
WHERE l."name" = 'Canteen'
GROUP BY l."id", u."id"
RETURNING "id", "ticketNumber", "status", "locationId";


-- ============================================================================
-- PART B - SELECT (Read)
-- ============================================================================

-- Q4. All WAITING tickets of one location in FIFO order (first come, first served)
-- Smallest ticketNumber = joined first. This is the staff "queue" screen.
-- READ
SELECT t."ticketNumber", u."name" AS "studentName", t."status", t."createdAt"
FROM "QueueTicket" t
JOIN "User" u     ON u."id" = t."userId"
JOIN "Location" l ON l."id" = t."locationId"
WHERE l."name" = 'Canteen'
  AND t."status" = 'WAITING'
ORDER BY t."ticketNumber" ASC;

-- Q5. Ticket history of one student, newest first, 5 rows per page (page 1)
-- LIMIT = page size, OFFSET = (page - 1) * page size   (this is pagination)
-- READ
SELECT t."ticketNumber", l."name" AS "location", t."status", t."createdAt"
FROM "QueueTicket" t
JOIN "Location" l ON l."id" = t."locationId"
JOIN "User" u     ON u."id" = t."userId"
WHERE u."email" = 'student@queuebee.edu'
ORDER BY t."createdAt" DESC
LIMIT 5 OFFSET 0;

-- Q6. Current position and estimated wait of a student's active ticket
-- position = (WAITING tickets in the same location with a smaller number) + 1
-- estimated wait = position x avgServiceMinutes
-- Uses a self-LEFT JOIN on "QueueTicket" (ahead) to count waiting tickets ahead without repeated scalar subqueries.
-- READ
SELECT t."ticketNumber",
       l."name" AS "location",
       COUNT(ahead."id") + 1 AS "position",
       (COUNT(ahead."id") + 1) * l."avgServiceMinutes" AS "estimatedWaitMinutes"
FROM "QueueTicket" t
JOIN "Location" l ON l."id" = t."locationId"
JOIN "User" u     ON u."id" = t."userId"
LEFT JOIN "QueueTicket" ahead
       ON ahead."locationId" = t."locationId"
      AND ahead."status" = 'WAITING'
      AND ahead."ticketNumber" < t."ticketNumber"
WHERE u."email" = 'student@queuebee.edu'
  AND t."status" = 'WAITING'
GROUP BY t."id", t."ticketNumber", l."name", l."avgServiceMinutes";

-- Q7. Number of WAITING tickets per location (locations with nobody waiting show 0)
-- LEFT JOIN keeps every location; COUNT(t."id") ignores the NULLs of unmatched rows.
-- READ
SELECT l."name" AS "location", COUNT(t."id") AS "waitingCount"
FROM "Location" l
LEFT JOIN "QueueTicket" t
       ON t."locationId" = l."id" AND t."status" = 'WAITING'
GROUP BY l."id", l."name"
ORDER BY "waitingCount" DESC, l."name";


-- ============================================================================
-- PART C - UPDATE (the ticket life cycle: WAITING -> CALLED -> COMPLETED)
-- ============================================================================

-- Q8. Staff "Call next": change the oldest WAITING ticket of the Canteen to CALLED
-- Uses a CTE with a JOIN on "Location" to find the next FIFO ticket, then joins it in the UPDATE.
-- WRITE
WITH next_ticket AS (
    SELECT t."id"
    FROM "QueueTicket" t
    JOIN "Location" l ON l."id" = t."locationId"
    WHERE l."name" = 'Canteen' AND t."status" = 'WAITING'
    ORDER BY t."ticketNumber" ASC
    LIMIT 1
)
UPDATE "QueueTicket" q
SET "status" = 'CALLED', "calledAt" = now()
FROM next_ticket n
WHERE q."id" = n."id"
RETURNING q."id", q."ticketNumber", q."status", q."calledAt";

-- Q9. Staff "Complete": mark the CALLED ticket of the Canteen as COMPLETED
-- "status = 'CALLED'" in WHERE means only a called ticket can be completed.
-- Uses a JOIN (FROM "Location") to match the location by name instead of a scalar subquery.
-- WRITE
UPDATE "QueueTicket" t
SET "status" = 'COMPLETED', "completedAt" = now()
FROM "Location" l
WHERE t."locationId" = l."id"
  AND t."status" = 'CALLED'
  AND l."name" = 'Canteen'
RETURNING t."id", t."ticketNumber", t."status", t."completedAt";

-- Q10. Student cancels their WAITING ticket (a CALLED ticket cannot be cancelled)
-- Uses a JOIN (FROM "User") to match the user by email instead of a scalar subquery.
-- WRITE
UPDATE "QueueTicket" t
SET "status" = 'CANCELLED'
FROM "User" u
WHERE t."userId" = u."id"
  AND t."status" = 'WAITING'
  AND u."email" = 'student@queuebee.edu'
RETURNING t."id", t."ticketNumber", t."status";


-- ============================================================================
-- PART D - ADMIN STATISTICS (aggregates, GROUP BY, JOIN, CTE)
-- ============================================================================

-- Q11. Total users by role
-- READ
SELECT "role", COUNT(*) AS "totalUsers"
FROM "User"
GROUP BY "role"
ORDER BY "totalUsers" DESC;

-- Q12. Tickets by status
-- READ
SELECT "status", COUNT(*) AS "totalTickets"
FROM "QueueTicket"
GROUP BY "status"
ORDER BY "totalTickets" DESC;

-- Q13. Busiest locations (most tickets overall)
-- Uses a LEFT JOIN to include locations even if they have no tickets.
-- READ
SELECT l."name" AS "location", COUNT(t."id") AS "totalTickets"
FROM "Location" l
LEFT JOIN "QueueTicket" t ON t."locationId" = l."id"
GROUP BY l."id", l."name"
ORDER BY "totalTickets" DESC, l."name"
LIMIT 3;

-- Q14. Per-location summary using a CTE (WITH ...) = a named temporary result
-- Step 1 counts tickets per (location, status); step 2 turns them into columns.
-- The statement ultimately performs a SELECT, so it is classified as READ.
-- READ
WITH status_counts AS (
    SELECT "locationId", "status", COUNT(*) AS "total"
    FROM "QueueTicket"
    GROUP BY "locationId", "status"
)
SELECT l."name" AS "location",
       COALESCE(SUM("total") FILTER (WHERE s."status" = 'WAITING'),   0) AS "waiting",
       COALESCE(SUM("total") FILTER (WHERE s."status" = 'CALLED'),    0) AS "called",
       COALESCE(SUM("total") FILTER (WHERE s."status" = 'COMPLETED'), 0) AS "completed",
       COALESCE(SUM("total") FILTER (WHERE s."status" = 'CANCELLED'), 0) AS "cancelled"
FROM "Location" l
LEFT JOIN status_counts s ON s."locationId" = l."id"
GROUP BY l."id", l."name"
ORDER BY l."name";

-- Q15. Average real waiting time (minutes between joining and being called) per location
-- Only tickets that were actually called are used (calledAt IS NOT NULL).
-- This could later replace the fixed "avgServiceMinutes" estimate.
-- READ
SELECT l."name" AS "location",
       ROUND(AVG(EXTRACT(EPOCH FROM (t."calledAt" - t."createdAt")) / 60)::numeric, 1) AS "avgWaitMinutes"
FROM "QueueTicket" t
JOIN "Location" l ON l."id" = t."locationId"
WHERE t."calledAt" IS NOT NULL
GROUP BY l."id", l."name"
ORDER BY "avgWaitMinutes" DESC;

-- Q16. Students who have never joined any queue (LEFT JOIN / anti-join)
-- Uses a LEFT JOIN where the ticket id IS NULL to find students with no queue tickets.
-- READ
SELECT u."name", u."email"
FROM "User" u
LEFT JOIN "QueueTicket" t ON t."userId" = u."id"
WHERE u."role" = 'STUDENT'
  AND t."id" IS NULL;
