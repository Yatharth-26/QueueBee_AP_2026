# QueueBee — Query Performance and Indexes (CP4)

**Course:** Advanced Programming (AP) · **Year:** B.Tech 2nd Year · **Team No.:** T0083 · **Section:** D

## 1. What is `EXPLAIN ANALYZE`?

- `EXPLAIN` shows the **plan** PostgreSQL chooses to run a query (which tables it reads and how).
- `EXPLAIN ANALYZE` also **runs** the query and adds the **real time** and the **real number of rows**.
- `BUFFERS` adds how many 8 KB data pages were read (`shared hit` = found in memory). Fewer pages = less work.

Words you will see in a plan:

| Term | Meaning |
|---|---|
| **Seq Scan** | Reads the **whole table** row by row |
| **Index Scan** | Uses an index to jump straight to matching rows |
| **Bitmap Index/Heap Scan** | Uses an index to collect row locations, then reads those pages |
| **Sort** | Sorts rows (needed for `ORDER BY` when the index gives no order) |
| **Execution Time** | Real time to run the query |

## 2. Indexes in QueueBee

| Index | Where it comes from | Helps |
|---|---|---|
| `(locationId, status)` | `@@index([locationId, status])` in `schema.prisma` | "Waiting tickets of a location", "count waiting per location", position calculation |
| `(locationId, ticketNumber)` | `@@unique([locationId, ticketNumber])` — a UNIQUE constraint also creates an index | Stops duplicate ticket numbers; finding the highest number of a location (next ticket number) |
| `(userId)` | **Not in `schema.prisma` today.** Optional, shown as a comment at the end of `03_schema.sql` | "Ticket history of one student" |
| `email` (unique) and `name` (unique) | `@unique` | Login by email, location lookup by name |

> Honest note: PostgreSQL does **not** create an index on a foreign key column automatically.
> That is why `userId` has no index at the moment. Section 5 shows what it would change.

## 3. How these numbers were collected

The numbers below are **real measurements**, not invented. They were taken once, on a small cloud sandbox with **PostgreSQL 16.15**, on generated practice data:

- 5 locations, 2,000 users, **100,000 tickets** (200 of them `WAITING`, the rest `COMPLETED` or `CANCELLED`)
- Each query was run 3 times; the last run (data in memory) is reported.
- Your computer will give **different times**. What matters is the **plan** (Seq Scan vs Index Scan) and the **pages read**, which should look similar.
- The full plans are in the `plans/` folder.

You can repeat everything yourself — see section 6.

## 4. Query 1 — FIFO list of waiting tickets of one location

Used by the staff screen and by "call next" (`04_queries.sql`, Q4 and Q8).

```sql
SELECT t."ticketNumber", u."name", t."createdAt"
FROM "QueueTicket" t JOIN "User" u ON u."id" = t."userId"
WHERE t."locationId" = 1 AND t."status" = 'WAITING'
ORDER BY t."ticketNumber" ASC;
```

| | With `(locationId, status)` index | Without it (only the unique `(locationId, ticketNumber)` index left) |
|---|---|---|
| How tickets are found | **Index Scan** on `QueueTicket_locationId_status_idx` | **Bitmap Index Scan** on `(locationId, ticketNumber)` then filter `status` |
| Rows read from the table that are thrown away | 0 | 19,960 |
| Pages read (`shared hit`) | 28 | 228 |
| Execution time | **1.022 ms** | **2.582 ms** |
| Plan file | `plans/01_fifo_with_status_index.txt` | `plans/01_fifo_without_status_index.txt` |

**Explanation.** With the `(locationId, status)` index PostgreSQL goes directly to the 40 waiting tickets of location 1.
Without it, the unique `(locationId, ticketNumber)` index still helps a little (it finds the 20,000 tickets of location 1 instead of all 100,000) but PostgreSQL must then read them all and throw away the finished ones.
The query still has a small **Sort** step for `ORDER BY ticketNumber`: the `(locationId, status)` index finds the right rows but does not store them in ticket-number order. With only 40 waiting rows this sort is very cheap.

## 5. Query 2 — Ticket history of one student

Used by the student history table (`04_queries.sql`, Q5).

```sql
SELECT t."ticketNumber", l."name", t."status", t."createdAt"
FROM "QueueTicket" t JOIN "Location" l ON l."id" = t."locationId"
WHERE t."userId" = 42
ORDER BY t."createdAt" DESC LIMIT 5 OFFSET 0;
```

| | As shipped (no `userId` index) | With optional index `(userId)` |
|---|---|---|
| How tickets are found | **Seq Scan** of the whole table | **Bitmap Index Scan** on `QueueTicket_userId_idx` |
| Rows read and thrown away | 99,950 | 0 |
| Pages read (`shared hit`) | 740 | 56 |
| Execution time | **5.921 ms** | **0.379 ms** |
| Plan file | `plans/02_history_without_userid_index.txt` | `plans/02_history_with_userid_index.txt` |

**Explanation.** No index starts with `userId`, so PostgreSQL has to read every ticket to find the 50 tickets of this student.
An index on `userId` jumps directly to them. This is the one place where the current schema could be improved: add `@@index([userId])` to the `QueueTicket` model in `schema.prisma` and run `npx prisma migrate dev`.
For a campus project with a few thousand tickets the difference is tiny, but the table grows every day.

## 6. Query 3 — Position in the queue (people ahead)

Used to show the student's position (`04_queries.sql`, Q6 and `addPositionInfo` in `queueController.js`).

```sql
SELECT COUNT(*) + 1 FROM "QueueTicket"
WHERE "locationId" = 1 AND "status" = 'WAITING' AND "ticketNumber" < 19990;
```

| | With `(locationId, status)` | Without it |
|---|---|---|
| Plan | Index Scan | Bitmap Index Scan on `(locationId, ticketNumber)` + filter |
| Pages read | 4 | 203 |
| Execution time | **0.073 ms** | **1.782 ms** |
| Plan file | `plans/03_position_with_status_index.txt` | `plans/03_position_without_status_index.txt` |

This query runs every time a student page refreshes (every 5 seconds), so keeping it cheap is useful.

## 7. Summary

| Query | Best index | Result in our test |
|---|---|---|
| FIFO waiting list | `(locationId, status)` | about 2.5× faster, 8× fewer pages |
| Position / people ahead | `(locationId, status)` | about 24× faster |
| Student history | `(userId)` — optional, not yet in schema | about 15× faster |
| Next ticket number | `(locationId, ticketNumber)` | already covered by the UNIQUE constraint |

**Cost of indexes:** every index uses disk space and makes `INSERT`/`UPDATE` slightly slower, so we only keep indexes that match real queries.

## 8. How to run it yourself

1. Create a practice database and load the schema:
   ```bash
   createdb queuebee_practice
   psql -d queuebee_practice -f dbms/03_schema.sql
   ```
2. Generate practice data (about 100,000 tickets):
   ```sql
   INSERT INTO "User"("name","email","passwordHash","role")
   SELECT 'Student '||g, 'student'||g||'@test.edu', 'x', 'STUDENT' FROM generate_series(1,2000) g;

   INSERT INTO "Location"("name","avgServiceMinutes")
   SELECT 'Location '||g, 5 FROM generate_series(1,5) g;

   INSERT INTO "QueueTicket"("ticketNumber","status","createdAt","userId","locationId")
   SELECT n,
          CASE WHEN n > 19960 THEN 'WAITING'::"TicketStatus"
               WHEN n % 10 = 0 THEN 'CANCELLED'::"TicketStatus"
               ELSE 'COMPLETED'::"TicketStatus" END,
          now() - (20000 - n) * interval '1 minute',
          1 + (n * 7 + l * 13) % 2000,
          l
   FROM generate_series(1,20000) n CROSS JOIN generate_series(1,5) l;

   ANALYZE;   -- refresh the statistics the planner uses
   ```
3. Run a query with `EXPLAIN (ANALYZE, BUFFERS)` in front, **3 times**, and note the last result:
   ```sql
   EXPLAIN (ANALYZE, BUFFERS)
   SELECT t."ticketNumber", u."name", t."createdAt"
   FROM "QueueTicket" t JOIN "User" u ON u."id" = t."userId"
   WHERE t."locationId" = 1 AND t."status" = 'WAITING'
   ORDER BY t."ticketNumber" ASC;
   ```
4. To compare, drop or add an index and run again:
   ```sql
   DROP INDEX "QueueTicket_locationId_status_idx";                       -- see the slower plan
   CREATE INDEX "QueueTicket_locationId_status_idx" ON "QueueTicket" ("locationId","status");
   CREATE INDEX "QueueTicket_userId_idx" ON "QueueTicket" ("userId");     -- optional index for history
   ANALYZE;
   ```
5. Do **not** run these on your real QueueBee database — use the practice database.

Tip: with only a few rows (like the seed data) PostgreSQL may choose a Seq Scan even when an index exists, because reading a tiny table is faster. That is normal and why we test with many rows.
