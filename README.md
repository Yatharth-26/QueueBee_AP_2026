# Smart Queue (QueueBee) — Campus Virtual Queue Management System

**Course:** Advanced Programming (AP) · **Year:** B.Tech 2nd Year
**Team No.:** T0083 · **Section:** D

## Team Details

| Role | Name | Enrollment No. | GitHub Username |
|---|---|---|---|
| Group Lead | Yatharth Soni | 2501010531 | Yatharth-26 |
| Member 2 | Madhav Aggarwal | 2501010619 | rmmadhav74-boop |
| Member 3 | Kavy Singhvi | 2501010215 | ksinghvi9 |
| Member 4 | Aaditya Bansal | 2501010617 | aadityabansal-001 |

---

## Project Overview

**Smart Queue (QueueBee)** is a full-stack virtual queue management platform designed to eliminate physical waiting lines in campus service facilities such as college canteens, library circulation desks, administration offices, and accounts/fee counters.

Students join queues digitally via web or QR code, receiving a unique sequential ticket number to monitor their live position and median-based estimated waiting time (ETA). Staff members manage counter queues with concurrency-safe ticket calling (`FOR UPDATE SKIP LOCKED`), and administrators access system analytics and performance reports.

---

## Technology Stack

- **Backend:** Node.js, Express.js
- **Database:** PostgreSQL with Prisma ORM
- **In-Memory Caching / Fast Lookup:** Redis (Sorted Sets via ioredis)
- **Authentication & Security:** JWT (jsonwebtoken), bcrypt, Zod, Helmet, CORS, express-rate-limit
- **Testing & Benchmarking:** Jest, Supertest, Autocannon
- **Frontend:** HTML5, CSS3, Vanilla JavaScript (ES6+ with automatic polling)

---

## Repository Structure

```text
QueueBee_AP_2026/
├── README.md                          # Project overview and team information
└── dbms/
    ├── 01_normalization.md            # CP1: Normalization (UNF -> 1NF -> 2NF -> 3NF -> BCNF)
    ├── 02_er_diagram.png              # CP2: ER diagram (due CP2)
    ├── 03_schema.sql                  # CP2: PostgreSQL DDL schema (due CP2)
    ├── 04_queries.sql                 # CP3: Application SQL workload (due CP3)
    ├── 05_query_timings.md            # CP4: Query benchmark timings (due CP4)
    └── plans/                         # CP4: EXPLAIN ANALYZE raw execution plans (due CP4)
```

---

## Checkpoints Deliverables

| Checkpoint | Due Date | AP Deliverables | Status |
|---|---|---|:---:|
| **CP1** | Mon 16 Nov 2026 | `dbms/01_normalization.md` | Completed |
| **CP2** | Tue 17 Nov 2026 | `dbms/02_er_diagram.*`, `dbms/03_schema.sql` | Pending |
| **CP3** | Thu 19 Nov 2026 | `dbms/04_queries.sql` | Pending |
| **CP4** | Mon 23 Nov 2026 | `dbms/05_query_timings.md`, `dbms/plans/` | Pending |
