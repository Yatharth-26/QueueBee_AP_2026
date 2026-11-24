# QueueBee — Query Performance and Indexes (CP4)

**Course:** Advanced Programming (AP) · **Year:** B.Tech 2nd Year · **Team No.:** T0083 · **Section:** D

---

## 1. What is `EXPLAIN ANALYZE`?

- `EXPLAIN` displays the **execution plan** PostgreSQL generates for a query (how tables are accessed, join strategies, and scan methods).
- `EXPLAIN ANALYZE` actually **executes** the query, measuring real wall-clock execution time and actual row counts.
- `BUFFERS` adds buffer cache activity: how many 8 KB memory pages were hit (`shared hit`) or read from disk (`read`). Fewer pages processed indicates higher efficiency.

Common plan operations:

| Term | Meaning |
|---|---|
| **Seq Scan** | Scans the **entire table** sequentially row by row |
| **Index Scan** | Traverses an index directly to locate matching rows |
| **Bitmap Index / Heap Scan** | Builds a bitmap of matching pages using an index, then retrieves those heap pages |
| **Sort** | Sorts result tuples in memory (e.g. `ORDER BY` when the index cannot supply the requested order) |
| **Hash Join / Nested Loop** | Algorithms used to combine rows from multiple joined tables |
| **Execution Time** | Actual time spent running the query (excluding parse/plan overhead) |

---

## 2. Indexes in QueueBee

| Index | Definition & Origin | Purpose & Optimizations |
|---|---|---|
| `(locationId, status)` | `CREATE INDEX "QueueTicket_locationId_status_idx"` (from `@@index([locationId, status])` in Prisma) | Rapidly filters waiting tickets by location for staff queues (Q4), position counting (Q6), and queue summaries (Q7, Q14). |
| `(locationId, ticketNumber)` | `CREATE UNIQUE INDEX "QueueTicket_locationId_ticketNumber_key"` (from `@@unique([locationId, ticketNumber])` in Prisma) | Enforces running sequence integrity; powers next-ticket calculations (`MAX(ticketNumber) + 1` in Q3). |
| `(userId)` | `CREATE INDEX "QueueTicket_userId_idx"` (*Optional benchmark index*, commented in `03_schema.sql`) | Eliminates table scans for student ticket history (Q5) and student cancellations (Q10). |
| `email` & `name` | `CREATE UNIQUE INDEX` on `User(email)` and `Location(name)` | Provides fast $O(\log N)$ unique lookups for authentication, foreign key resolution, and filtering. |

> **Note on Foreign Key Indexes:** PostgreSQL does not automatically create indexes on foreign key columns. While `locationId` is indexed via compound indexes, `userId` is unindexed by default. Benchmarks below demonstrate the dramatic performance improvement when indexing foreign keys.

---

## 3. Benchmark Environment & Methodology

All timings reported in this document are **genuine measurements** executed against an active PostgreSQL instance:

- **Database Engine:** PostgreSQL 16.16 (Homebrew)
- **Host System:** macOS (Apple Silicon aarch64, Darwin 27.2.0)
- **Dataset Size:**
  - **5 Locations:** Canteen, Library Desk, Fee Office, Admin Center, IT Helpdesk
  - **2,000 Users:** Students, Staff, and Administrators
  - **100,000 Queue Tickets:** 20,000 tickets per location (200 active `WAITING` tickets, 40 per location; 1 `CALLED` ticket in Canteen; remaining tickets distributed between `COMPLETED` and `CANCELLED`)
- **Measurement Protocol:**
  - Every query from CP3 (`04_queries.sql`, Q1 through Q16) was executed **three separate times** (`Run 1`, `Run 2`, `Run 3`).
  - Execution times were extracted directly from the PostgreSQL engine via `EXPLAIN (ANALYZE, BUFFERS)`.
  - The arithmetic mean was computed as `Average (ms)` rounded to three decimal places.
- **Safety Protocol for WRITE Queries:**
  - In accordance with review guidelines, write queries (`INSERT`, `UPDATE`) were executed inside isolated database transactions (`BEGIN; ... ROLLBACK;`).
  - This guaranteed zero data corruption, prevented duplicate key collisions, and ensured that every benchmark run began with an identical baseline state.

---

## 4. CP3 Query Timing Measurements (Q1 – Q16)

The table below reports the **Run 1**, **Run 2**, **Run 3**, and **Average (ms)** execution times for every query in `dbms/04_queries.sql`:

| Query | Run 1 (ms) | Run 2 (ms) | Run 3 (ms) | Average (ms) |
|:---|---:|---:|---:|---:|
| Q1 (Insert users — WRITE) | 0.813 | 0.514 | 0.453 | 0.593 |
| Q2 (Insert locations — WRITE) | 0.686 | 0.238 | 0.337 | 0.420 |
| Q3 (Create queue ticket with JOIN — WRITE) | 6.960 | 6.736 | 7.415 | 7.037 |
| Q4 (FIFO waiting list of location — READ) | 0.147 | 0.125 | 0.148 | 0.140 |
| Q5 (Student ticket history pagination — READ) | 14.542 | 10.687 | 7.668 | 10.966 |
| Q6 (Position & wait calculation with JOIN — READ) | 0.128 | 0.224 | 0.213 | 0.188 |
| Q7 (Waiting count per location — READ) | 0.219 | 0.192 | 0.185 | 0.199 |
| Q8 (Staff call next waiting ticket — WRITE) | 0.550 | 0.292 | 0.674 | 0.505 |
| Q9 (Staff complete called ticket with JOIN — WRITE) | 0.300 | 0.308 | 0.306 | 0.305 |
| Q10 (Student cancel ticket with JOIN — WRITE) | 0.543 | 1.107 | 0.490 | 0.713 |
| Q11 (Total users by role — READ) | 0.806 | 0.470 | 0.448 | 0.575 |
| Q12 (Tickets by status aggregation — READ) | 18.038 | 14.314 | 10.984 | 14.445 |
| Q13 (Busiest locations with LEFT JOIN — READ) | 18.121 | 16.847 | 16.682 | 17.217 |
| Q14 (Per-location summary CTE with LEFT JOIN — READ) | 6.159 | 5.145 | 5.376 | 5.560 |
| Q15 (Average waiting time aggregation — READ) | 23.820 | 22.022 | 21.750 | 22.531 |
| Q16 (Students without tickets anti-join — READ) | 9.033 | 9.008 | 8.973 | 9.005 |

---

## 5. Detailed Index Analysis: Query 1 (Q4) — FIFO Waiting Queue

Used by the staff queue screen to display all active students waiting for service in order of arrival (`04_queries.sql`, Q4):

```sql
SELECT t."ticketNumber", u."name", t."createdAt"
FROM "QueueTicket" t
JOIN "User" u ON u."id" = t."userId"
WHERE t."locationId" = 1 AND t."status" = 'WAITING'
ORDER BY t."ticketNumber" ASC;
```

### Performance & Buffer Comparison

| Metric | With `(locationId, status)` Index | Without `(locationId, status)` Index |
|---|---|---|
| **Scan Strategy** | **Index Scan** on `QueueTicket_locationId_status_idx` | **Bitmap Heap Scan** via `(locationId, ticketNumber)` |
| **Rows Removed by Filter** | **0** | **19,960** rows read and discarded |
| **Buffers Read (`shared hit`)** | **27 blocks** (~216 KB) | **267 blocks** (~2,136 KB) |
| **Run 1** | 0.293 ms | 1.208 ms |
| **Run 2** | 0.229 ms | 1.247 ms |
| **Run 3** | 0.229 ms | 1.302 ms |
| **Average (ms)** | **0.250 ms** | **1.252 ms** |
| **Execution Plan File** | [`plans/01_fifo_with_status_index.txt`](file:///Users/yatharth/Downloads/QueueBee%202/dbms/plans/01_fifo_with_status_index.txt) | [`plans/01_fifo_without_status_index.txt`](file:///Users/yatharth/Downloads/QueueBee%202/dbms/plans/01_fifo_without_status_index.txt) |

**Analysis:**
With the compound `(locationId, status)` index, PostgreSQL navigates directly to the 40 active waiting records for location 1. Without it, the query planner must rely on the `(locationId, ticketNumber)` index, scanning all 20,000 records for the location and discarding 19,960 completed/cancelled tickets. The dedicated index yields a **5.0× speedup** and reduces buffer memory reads by **90%**.

---

## 6. Detailed Index Analysis: Query 2 (Q5) — Student Ticket History

Used on the student portal to show their previous tickets, paginated newest first (`04_queries.sql`, Q5):

```sql
SELECT t."ticketNumber", l."name", t."status", t."createdAt"
FROM "QueueTicket" t
JOIN "Location" l ON l."id" = t."locationId"
WHERE t."userId" = 1
ORDER BY t."createdAt" DESC
LIMIT 5 OFFSET 0;
```

### Performance & Buffer Comparison

| Metric | Without `userId` Index (As Shipped) | With Optional `(userId)` Index |
|---|---|---|
| **Scan Strategy** | **Seq Scan** across entire table | **Bitmap Index Scan** on `QueueTicket_userId_idx` |
| **Rows Removed by Filter** | **99,945** rows scanned and discarded | **0** rows discarded |
| **Buffers Read (`shared hit`)** | **922 blocks** (~7.37 MB) | **59 blocks** (~472 KB) |
| **Run 1** | 3.665 ms | 0.128 ms |
| **Run 2** | 3.564 ms | 0.117 ms |
| **Run 3** | 3.650 ms | 0.124 ms |
| **Average (ms)** | **3.626 ms** | **0.123 ms** |
| **Execution Plan File** | [`plans/02_history_without_userid_index.txt`](file:///Users/yatharth/Downloads/QueueBee%202/dbms/plans/02_history_without_userid_index.txt) | [`plans/02_history_with_userid_index.txt`](file:///Users/yatharth/Downloads/QueueBee%202/dbms/plans/02_history_with_userid_index.txt) |

**Analysis:**
Because foreign keys are not automatically indexed by PostgreSQL, queries filtering by `userId` must perform a sequential scan across all 100,000 tickets. Adding `CREATE INDEX "QueueTicket_userId_idx" ON "QueueTicket"("userId")` reduces execution time from **3.626 ms to 0.123 ms** (a **29.5× speedup**) and cuts memory page reads by **93.6%**. Adding `@@index([userId])` to `schema.prisma` is strongly recommended for production scaling.

---

## 7. Detailed Index Analysis: Query 3 (Q6 Core) — Queue Position Count

Used on the live queue status widget to compute how many people are ahead of a student (`04_queries.sql`, Q6):

```sql
SELECT COUNT(*) + 1
FROM "QueueTicket"
WHERE "locationId" = 1
  AND "status" = 'WAITING'
  AND "ticketNumber" < 19990;
```

### Performance & Buffer Comparison

| Metric | With `(locationId, status)` Index | Without `(locationId, status)` Index |
|---|---|---|
| **Scan Strategy** | **Index Scan** on `QueueTicket_locationId_status_idx` | **Bitmap Heap Scan** via `(locationId, ticketNumber)` |
| **Rows Removed by Filter** | **11** | **19,960** |
| **Buffers Read (`shared hit`)** | **3 blocks** (~24 KB) | **241 blocks** (~1.92 MB) |
| **Run 1** | 0.036 ms | 1.041 ms |
| **Run 2** | 0.033 ms | 1.093 ms |
| **Run 3** | 0.030 ms | 1.196 ms |
| **Average (ms)** | **0.033 ms** | **1.110 ms** |
| **Execution Plan File** | [`plans/03_position_with_status_index.txt`](file:///Users/yatharth/Downloads/QueueBee%202/dbms/plans/03_position_with_status_index.txt) | [`plans/03_position_without_status_index.txt`](file:///Users/yatharth/Downloads/QueueBee%202/dbms/plans/03_position_without_status_index.txt) |

**Analysis:**
Because the student dashboard polls position every 5 seconds, this query is executed frequently. With the index, PostgreSQL resolves the count in **0.033 ms** touching just 3 buffer pages. Without it, the database inspects 20,000 records taking **1.110 ms** (**33.6× slower**).

---

## 8. Summary of Index Impact

| Workload Area | Critical Index | Benchmark Impact | Engineering Conclusion |
|---|---|---|---|
| **Staff Queue (FIFO)** | `(locationId, status)` | **5.0× faster** (0.250 ms vs 1.252 ms); 90% fewer buffer reads | Essential: Keeps queue screen instant under heavy load. |
| **Student History** | `(userId)` | **29.5× faster** (0.123 ms vs 3.626 ms); avoids 100k-row Seq Scan | Highly Recommended: Foreign key index should be added to schema. |
| **Position & Wait Time** | `(locationId, status)` | **33.6× faster** (0.033 ms vs 1.110 ms); 3 pages vs 241 pages | Vital: Protects server CPU under frequent 5-second polling. |
| **Sequence Integrity** | `(locationId, ticketNumber)` | Unique constraint index; enables $O(1)$ lookups for `MAX + 1` | Prevents ticket race conditions and duplicates. |

---

## 9. How to Reproduce These Results

To reproduce these benchmarks on your local PostgreSQL instance:

1. **Create and initialize the benchmark database:**
   ```bash
   createdb queuebee_practice
   psql -d queuebee_practice -f dbms/03_schema.sql
   ```

2. **Generate the 100,000 ticket dataset:**
   ```sql
   -- Insert locations
   INSERT INTO "Location" ("name", "description", "avgServiceMinutes") VALUES
       ('Canteen', 'Main campus canteen', 3),
       ('Library Desk', 'Book issue and return desk', 4),
       ('Fee Office', 'Fee payment and receipts', 6),
       ('Admin Center', 'Student services', 5),
       ('IT Helpdesk', 'IT and network support', 5);

   -- Insert 2,000 users
   INSERT INTO "User" ("name", "email", "passwordHash", "role")
   SELECT 'Student ' || g, 'student' || g || '@test.edu', 'hash_demo', 'STUDENT'
   FROM generate_series(1, 2000) g;

   -- Insert 100,000 tickets across 5 locations
   INSERT INTO "QueueTicket" ("ticketNumber", "status", "createdAt", "calledAt", "completedAt", "userId", "locationId")
   SELECT
       n AS ticketNumber,
       CASE
           WHEN n > 19960 THEN 'WAITING'::"TicketStatus"
           WHEN n = 19960 AND l = 1 THEN 'CALLED'::"TicketStatus"
           WHEN n % 10 = 0 THEN 'CANCELLED'::"TicketStatus"
           ELSE 'COMPLETED'::"TicketStatus"
       END,
       now() - (20000 - n) * interval '1 minute',
       CASE WHEN n <= 19960 AND n % 10 != 0 THEN now() - (20000 - n) * interval '1 minute' + interval '4 minute' ELSE NULL END,
       CASE WHEN n < 19960 AND n % 10 != 0 THEN now() - (20000 - n) * interval '1 minute' + interval '8 minute' ELSE NULL END,
       1 + (n * 7 + l * 13) % 2000,
       l
   FROM generate_series(1, 20000) n
   CROSS JOIN generate_series(1, 5) l;

   ANALYZE;
   ```

3. **Run queries with `EXPLAIN (ANALYZE, BUFFERS)` 3 times:**
   - For **READ** queries:
     ```sql
     EXPLAIN (ANALYZE, BUFFERS)
     SELECT t."ticketNumber", u."name", t."createdAt"
     FROM "QueueTicket" t JOIN "User" u ON u."id" = t."userId"
     WHERE t."locationId" = 1 AND t."status" = 'WAITING'
     ORDER BY t."ticketNumber" ASC;
     ```
   - For **WRITE** queries, protect the database with transactional rollback:
     ```sql
     BEGIN;
     EXPLAIN (ANALYZE, BUFFERS)
     UPDATE "QueueTicket" t
     SET "status" = 'COMPLETED', "completedAt" = now()
     FROM "Location" l
     WHERE t."locationId" = l."id"
       AND t."status" = 'CALLED'
       AND l."name" = 'Canteen';
     ROLLBACK;
     ```
