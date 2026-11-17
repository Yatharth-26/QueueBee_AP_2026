# Smart Queue (QueueBee) — Campus Virtual Queue Management System

**Course:** Advanced Programming (AP) · **Year:** B.Tech 2nd Year  
**Team No.:** T0083 · **Section:** D  

## 👥 Team Details

| Role | Name | Enrollment No. | GitHub Username |
|---|---|---|---|
| **Group Lead** | **Yatharth Soni** | **2501010531** | **Yatharth-26** |
| Member 2 | Madhav Aggarwal | 2501010619 | rmmadhav74-boop |
| Member 3 | Kavy Singhvi | 2501010215 | ksinghvi9 |
| Member 4 | Aaditya Bansal | 2501010617 | aadityabansal-001 |

---

## 🎯 Project Overview

**Smart Queue (QueueBee)** is a full-stack virtual queue management platform engineered to eliminate physical waiting lines in high-traffic campus facilities, including college cafeterias/canteens, central library circulation desks, student accounts/fee offices, and academic certificate counters.

Students join queues digitally via web browser or QR code, receiving a unique sequential ticket number to monitor their live position and median-based estimated waiting time (ETA). Staff operators manage counter queues with concurrency-safe ticket calling (`FOR UPDATE SKIP LOCKED`), and campus administrators monitor system throughput, peak hours, and staff performance through real-time analytics.

---

## 🏆 Coursework Deliverables & Checkpoints Status

| Checkpoint | AP Coursework Deliverables | Files & Evidence | Status |
|---|---|---|:---:|
| **CP1** | Normalization (UNF &rarr; 1NF &rarr; 2NF &rarr; 3NF &rarr; BCNF) | `dbms/01_normalization.md` | ✅ Completed |
| **CP2** | Entity-Relationship Model & Production DDL Schema | `dbms/02_er_diagram.md`, `dbms/03_schema.sql` | ✅ Completed |
| **CP3** | Application SQL Workload & Transaction Queries | `dbms/04_queries.sql` | ✅ Completed |
| **CP4** | Query Benchmark Timings & `EXPLAIN ANALYZE` Plans | `dbms/05_query_timings.md`, `dbms/plans/` | ✅ Completed |

---

## 🚀 Key Engineering Differentiators

### 1. Intelligent Median-Based Waiting-Time Estimation (ETA)
- Rather than computing an arbitrary fixed waiting time or a distorted arithmetic average ($\mu$), QueueBee calculates the **statistical median** ($M$) of the most recent completed service counter durations:
  $$\text{Service Duration} = \text{EXTRACT}(\text{EPOCH FROM } (\text{served\_at} - \text{called\_at}))$$
- **Why Median over Mean?** An abnormal 25-minute issue or a counter left idle artificially inflates the average from 4 minutes to 8 minutes. The median remains strictly robust against outliers, providing students with dependable ETAs:
  $$\text{ETA} = (\text{Students Ahead}) \times (\text{Median Service Duration}) + \text{Remaining Active Service Buffer}$$

### 2. Concurrency-Safe Queue Operations
- **Atomic Ticket Allocation:** Generated inside an interactive PostgreSQL transaction using table/row locking (`SELECT ... FOR UPDATE`). Eliminates ticket duplication under simultaneous client requests.
- **Worker Lock-Free Dispatch (`FOR UPDATE SKIP LOCKED`):** When multiple staff members call the next student simultaneously, PostgreSQL skips rows already locked by concurrent transactions. Zero multi-staff collisions and zero deadlocks.
- **Partial Unique Index Enforcement:**
  ```sql
  CREATE UNIQUE INDEX unique_active_student_queue 
  ON queue_entries (queue_id, user_id) 
  WHERE status IN ('WAITING', 'CALLED');
  ```
  Guarantees at the database level that a student can never hold multiple active tickets in the same queue.

### 3. Redis Sorted Sets Performance Layer
- Waiting tickets are mirrored in Redis Sorted Sets (`queue:{queueId}`) where:
  - **Member:** `entryId`
  - **Score:** Sequential `ticketNo`
- Position lookup via `ZRANK` completes in **$O(\log N)$ time** (~0.15 ms), completely shielding the PostgreSQL database from client polling storms (every 3 seconds).
- PostgreSQL remains the authoritative ACID source of truth; if Redis restarts, the cache is cleanly rebuilt on-demand via `rebuildQueueFromDB()`.

### 4. Database Indexing & Query Optimization (10,500+ Seeded Records)
- Verified with `EXPLAIN ANALYZE` on 10,524 historical campus records:
  - **Unindexed Sequential Scan:** 1.273 ms (455 shared buffer hits)
  - **Composite Indexed Scan:** **0.148 ms** (50 shared buffer hits) &rarr; **8.6x Query Acceleration!**

---

## 🛠️ Technology Stack (Strict Compliance)

- **Backend:** Node.js, Express.js
- **Database & ORM:** PostgreSQL 18 with Prisma ORM (snake_case mappings via `@map` / `@@map`)
- **NoSQL / Fast Lookup Cache:** Redis (ioredis) using Sorted Sets
- **Security & Auth:** JWT (`jsonwebtoken`), `bcryptjs`, `zod`, `helmet`, `cors`, `express-rate-limit`, `morgan`, `dotenv`
- **Testing & Benchmarking:** Jest, Supertest, Autocannon
- **Data Seeding:** `@faker-js/faker`
- **Frontend:** Vanilla HTML5, CSS3, ES6 JavaScript (No frameworks, clean SaaS design system, responsive card grids, live HTTP polling every 3s)

---

## 📁 Repository Structure

```text
QueueBee_AP_2026/
├── dbms/                              # AP Coursework Deliverables
│   ├── 01_normalization.md            # CP1: Complete 1NF, 2NF, 3NF, BCNF proofs
│   ├── 02_er_diagram.md               # CP2: Mermaid Entity-Relationship diagram
│   ├── 03_schema.sql                  # CP2: PostgreSQL production DDL with checks & indexes
│   ├── 04_queries.sql                 # CP3: Workload queries (FOR UPDATE SKIP LOCKED, median, rollup)
│   ├── 05_query_timings.md            # CP4: Performance comparison report (10k+ rows)
│   └── plans/                         # CP4: Raw EXPLAIN ANALYZE plans
├── prisma/
│   ├── schema.prisma                  # 3NF Prisma schema (6 relational tables)
│   └── seed.js                        # High-volume seeder generating 10,500+ records
├── public/                            # Vanilla Web Client
│   ├── index.html                     # Portal landing page & technical overview
│   ├── login.html                     # Login with 1-click viva evaluator credentials
│   ├── register.html                  # Student registration (strictly enforces STUDENT role)
│   ├── student.html                   # Browse campus locations & join queues
│   ├── my-queue.html                  # Live virtual ticket with 3s HTTP polling & ETA
│   ├── staff.html                     # Counter management (call next, complete, no-show, pause)
│   ├── admin.html                     # KPI cards, hourly activity chart, counter configuration
│   ├── css/style.css                  # Modern SaaS UI design system
│   └── js/api.js                      # Fetch wrapper, JWT bearer injection, toast alerts
├── src/
│   ├── config/                        # Prisma, Redis, and Zod environment loaders
│   ├── controllers/                   # HTTP controllers (auth, queue, staff, admin, analytics)
│   ├── middleware/                    # Auth, role check, staff counter assignment, rate limiting
│   ├── routes/                        # RESTful route definitions
│   ├── services/                      # Core business logic (concurrency, Redis sync, ETA, analytics)
│   ├── utils/                         # Median statistical algorithm, response envelopes
│   ├── validators/                    # Zod input validation schemas
│   ├── app.js                         # Express configuration, static middleware, helmet, cors
│   └── server.js                      # Server boot and graceful shutdown lifecycle
├── tests/                             # Comprehensive Automated Test Suite
│   ├── auth.test.js                   # Auth & role security tests
│   ├── concurrency.test.js            # Parallel joins & FOR UPDATE SKIP LOCKED tests
│   ├── eta.test.js                    # Median & ETA algorithm unit tests
│   ├── queue.test.js                  # Queue lifecycle & state transition tests
│   └── benchmark.test.js              # PostgreSQL vs Redis Sorted Set latency benchmark
├── benchmark/
│   └── autocannon-benchmark.js        # Autocannon stress testing script
├── package.json
└── README.md
```

---

## ⚡ Quick Start & Installation

### 1. Prerequisites
- **Node.js:** v18+ (tested on Node v24)
- **PostgreSQL:** Running locally or hosted (e.g., Supabase / Neon / Railway)
- **Redis:** Running locally or cloud (e.g., Upstash / Redis Cloud)

### 2. Setup Environment
```bash
git clone https://github.com/Yatharth-26/QueueBee_AP_2026.git
cd QueueBee_AP_2026
npm install
```

Create a `.env` file from `.env.example`:
```env
PORT=3000
NODE_ENV=development
DATABASE_URL="postgresql://username:password@localhost:5432/queuebee_db?schema=public"
REDIS_URL="redis://localhost:6379"
JWT_SECRET="smart_queuebee_super_secret_jwt_key_2026_btech_ap"
JWT_EXPIRES_IN="7d"
```

### 3. Database Migration & 10,500+ Record Seeding
```bash
# Push schema into PostgreSQL
npx prisma db push

# Seed 10,500+ realistic campus entries across 30 days
npm run seed
```

### 4. Run Automated Test Suite
```bash
npm test
```
*Executes all 5 test suites (Auth, Concurrency, Lifecycle, ETA, Redis Benchmark).*

### 5. Start Application Server
```bash
npm start
```
Open **`http://localhost:3000`** in your browser.

---

## 🔐 Demo Credentials for Viva Examination

The database seed script automatically creates pre-configured accounts across all three user roles:

| Role | Campus Email | Password | Access Area |
|---|---|---|---|
| **👑 Administrator** | `admin@smartqueue.campus` | `adminPassword123` | `/admin.html` (Full System Analytics & Config) |
| **👔 Staff (Canteen)** | `staff.canteen@smartqueue.campus` | `password123` | `/staff.html` (Counter 1 & 2 Operator) |
| **👔 Staff (Library)** | `staff.library@smartqueue.campus` | `password123` | `/staff.html` (Book Circulation Desk) |
| **👔 Staff (Accounts)** | `staff.accounts@smartqueue.campus` | `password123` | `/staff.html` (Fee Verification Desk) |
| **🎓 Student (Lead)** | `yatharth@student.campus` | `password123` | `/student.html` & `/my-queue.html` |
| **🎓 Student (Sample)** | `student1@campus.edu` | `password123` | `/student.html` & `/my-queue.html` |

*Note: The login page includes 1-click demo buttons to switch between Admin, Staff, and Student roles instantly without typing.*

---

## 🎓 Technical Viva Preparation Guide & FAQ

### Q1: Why use PostgreSQL row locking (`FOR UPDATE SKIP LOCKED`) instead of optimistic locking?
> **Answer:** In high-concurrency physical queue counters (e.g., lunch rush at the cafeteria), multiple counter operators frequently request the "next student" simultaneously. Optimistic locking (version numbers) would cause transaction conflicts, retries, and high abort rates. `FOR UPDATE SKIP LOCKED` guarantees that Worker 1 acquires the next waiting ticket, while Worker 2 automatically skips Worker 1's locked row and grabs ticket #2 without blocking, deadlocking, or throwing an error.

### Q2: Why use the median rather than the mean for estimated waiting time?
> **Answer:** Service counter durations frequently contain extreme right-skewed outliers (e.g., a student with missing documents taking 20 minutes, or a counter operator stepping away). An arithmetic mean is sensitive to outliers and would artificially inflate the wait estimate for everyone behind. The median represents the 50th percentile and reflects typical student throughput accurately.

### Q3: What is the purpose of Redis Sorted Sets when PostgreSQL is already ACID compliant?
> **Answer:** Students poll the server every 3 seconds to update their queue position. If 500 students are waiting, this generates ~166 queries/second. Running `COUNT(*)` in PostgreSQL under this polling load creates unnecessary disk I/O and shared buffer contention. Redis Sorted Sets store `ticket_no` as score and execute `ZRANK` in pure memory in $O(\log N)$ time (< 0.2 ms). PostgreSQL remains the permanent source of truth; if Redis restarts, the sorted set is cleanly rebuilt on-demand.

### Q4: How is privilege escalation prevented during user registration?
> **Answer:** In `auth.service.js`, the user role is hardcoded to `STUDENT` during creation: `role: 'STUDENT'`. Any role parameter supplied in the request body is stripped and rejected by the Zod schema. Administrative and Staff privileges can only be granted by campus administrators or through database seeds.
