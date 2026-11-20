-- ============================================================================
-- QueueBee - PostgreSQL schema (CP2)
-- Course: Advanced Programming (AP) · B.Tech 2nd Year · Team T0083
--
-- This file is the plain-SQL version of prisma/schema.prisma.
-- Prisma uses the model names as table names, so the tables are "User",
-- "Location" and "QueueTicket" (quoted because they start with a capital letter).
-- Three tables:   User 1 ----< QueueTicket >---- 1 Location
-- ============================================================================

-- Start clean so the file can be run again while practising
DROP TABLE IF EXISTS "QueueTicket";
DROP TABLE IF EXISTS "Location";
DROP TABLE IF EXISTS "User";
DROP TYPE  IF EXISTS "TicketStatus";
DROP TYPE  IF EXISTS "Role";

-- ----------------------------------------------------------------------------
-- ENUM types: a column can only hold one of the listed values
-- ----------------------------------------------------------------------------
CREATE TYPE "Role" AS ENUM ('STUDENT', 'STAFF', 'ADMIN');                       -- role-based access control
CREATE TYPE "TicketStatus" AS ENUM ('WAITING', 'CALLED', 'COMPLETED', 'CANCELLED');  -- ticket life cycle

-- ----------------------------------------------------------------------------
-- Table 1: User
-- ----------------------------------------------------------------------------
CREATE TABLE "User" (
    "id"           SERIAL        PRIMARY KEY,                 -- auto-increment primary key
    "name"         TEXT          NOT NULL,
    "email"        TEXT          NOT NULL,
    "passwordHash" TEXT          NOT NULL,                    -- bcrypt hash, never the real password
    "role"         "Role"        NOT NULL DEFAULT 'STUDENT',
    "createdAt"    TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP
);
-- Two users cannot have the same email (also gives a fast index for login)
CREATE UNIQUE INDEX "User_email_key" ON "User" ("email");

-- ----------------------------------------------------------------------------
-- Table 2: Location (a service point such as Canteen or Library Desk)
-- ----------------------------------------------------------------------------
CREATE TABLE "Location" (
    "id"                SERIAL        PRIMARY KEY,
    "name"              TEXT          NOT NULL,
    "description"       TEXT,                                 -- optional (NULL allowed)
    "avgServiceMinutes" INTEGER       NOT NULL DEFAULT 5,     -- used for the waiting-time estimate
    "createdAt"         TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "Location_name_key" ON "Location" ("name");

-- ----------------------------------------------------------------------------
-- Table 3: QueueTicket (one row = one student's place in one location's queue)
-- ----------------------------------------------------------------------------
CREATE TABLE "QueueTicket" (
    "id"           SERIAL          PRIMARY KEY,
    "ticketNumber" INTEGER         NOT NULL,                  -- running number inside one location: 1, 2, 3 ...
    "status"       "TicketStatus"  NOT NULL DEFAULT 'WAITING',
    "createdAt"    TIMESTAMP(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "calledAt"     TIMESTAMP(3),                              -- set when staff call the ticket
    "completedAt"  TIMESTAMP(3),                              -- set when service is finished
    "userId"       INTEGER         NOT NULL,                  -- foreign key -> User
    "locationId"   INTEGER         NOT NULL,                  -- foreign key -> Location

    -- Each ticket belongs to exactly one user ...
    CONSTRAINT "QueueTicket_userId_fkey" FOREIGN KEY ("userId")
        REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    -- ... and exactly one location. Deleting a user/location deletes its tickets.
    CONSTRAINT "QueueTicket_locationId_fkey" FOREIGN KEY ("locationId")
        REFERENCES "Location" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- The same ticket number can never appear twice in one location.
-- This also creates an index on ("locationId", "ticketNumber"), which helps
-- FIFO ordering (smallest ticket number first) inside a location.
CREATE UNIQUE INDEX "QueueTicket_locationId_ticketNumber_key"
    ON "QueueTicket" ("locationId", "ticketNumber");

-- Speeds up "waiting tickets of this location" and "count waiting per location".
CREATE INDEX "QueueTicket_locationId_status_idx"
    ON "QueueTicket" ("locationId", "status");

-- ----------------------------------------------------------------------------
-- OPTIONAL index - NOT part of prisma/schema.prisma today.
-- PostgreSQL does not create an index on a foreign key automatically, so the
-- "ticket history of one student" query has no index on "userId" unless you add
-- one. CP4 (dbms/05_query_timings.md) measures the difference.
-- To keep Prisma and SQL identical, also add   @@index([userId])   to the
-- QueueTicket model in schema.prisma and run a migration.
-- ----------------------------------------------------------------------------
-- CREATE INDEX "QueueTicket_userId_idx" ON "QueueTicket" ("userId");
