# Relational Normalization Analysis — Smart Queue (QueueBee)

**Course:** Advanced Programming (AP) · **Project:** Smart Queue (QueueBee)
**Deliverable:** Checkpoint 1 (CP1) — `dbms/01_normalization.md`
**Database Engine:** PostgreSQL 15+ with Prisma ORM
**Team No.:** T0083 · **Section:** D

---

## 1. Executive Summary & Application Domain

**Smart Queue (QueueBee)** is a full-stack virtual queue management platform designed for campus service automation. In traditional campus environments, physical queues at canteens, library circulation desks, administration offices, and fee/accounts counters create crowding, loss of productive study hours, and operational bottlenecks.

Smart Queue transitions physical waiting into an organized, transparent digital queue where:
1. **Students** join queues remotely via web or QR code, receiving a unique sequential ticket number and tracking live queue position and estimated waiting time (ETA).
2. **Staff Members** manage counter queues, call the next waiting student (`FOR UPDATE SKIP LOCKED`), record service times, or flag no-shows.
3. **Administrators** configure campus locations, establish service queues, assign staff, and monitor system-wide throughput and hourly analytics.

To ensure data integrity, eliminate data redundancy, prevent modification anomalies, and support high-concurrency transactional throughput, the relational persistence model must adhere to rigorous normalization standards. This document details the step-by-step mathematical decomposition of the application domain from **Unnormalized Form (UNF)** through **First Normal Form (1NF)**, **Second Normal Form (2NF)**, **Third Normal Form (3NF)**, and evaluates compliance with **Boyce-Codd Normal Form (BCNF)**.

---

## 2. Unnormalized Form (UNF) & Initial Data Representation

In an unnormalized architecture, all system entities—users, campus locations, service queues, staff assignments, queue tickets, and hourly aggregated performance statistics—are captured in a single flat or nested log representation.

### 2.1 The Unnormalized Universal Relation

```text
CAMPUS_QUEUE_RECORD (
    user_id,
    user_name,
    user_email,
    user_password_hash,
    user_role,
    user_created_at,
    location_id,
    location_name,
    location_building,
    queue_id,
    queue_name,
    queue_status,
    queue_max_size,
    queue_next_ticket_no,
    queue_avg_service_seconds,
    { assigned_staff_user_id, assigned_staff_name, assigned_staff_email },
    ticket_id,
    ticket_no,
    ticket_status,
    ticket_joined_at,
    ticket_called_at,
    ticket_served_at,
    served_by_staff_id,
    served_by_staff_name,
    { stat_hour, stat_joins, stat_served, stat_no_shows, stat_avg_wait_seconds }
)
```

*(Brackets `{ ... }` denote repeating groups / multi-valued collections).*

### 2.2 Operational Anomalies in UNF

1. **Insertion Anomaly:**
   - A new campus service location (e.g., *“Admin Block — Fee Counter”*) cannot be registered in the database until at least one service queue and one student ticket are created.
   - A staff member cannot be added to the system without assigning them to an active ticket.
2. **Deletion Anomaly:**
   - If historical queue ticket records are purged or archived, campus location data or queue configuration definitions might be inadvertently deleted if no other active records reference them.
3. **Update / Modification Anomaly:**
   - If a campus building name changes (e.g., *“Academic Block A”* renamed to *“Ramanujan Block”*), every ticket record ever issued at that location must be updated. Any missed record leads to data inconsistency.
   - If a student updates their email or name, multiple historical ticket rows must be modified simultaneously.

---

## 3. First Normal Form (1NF)

### 3.1 1NF Requirements
A relation $R$ is in **First Normal Form (1NF)** if and only if:
1. Every attribute value is atomic (indivisible).
2. There are no repeating groups, arrays, or nested relations.
3. Each record is distinct and uniquely identifiable by a Primary Key.

### 3.2 Transformation to 1NF
To convert the universal relation to 1NF:
- Repeating groups for assigned staff members and hourly statistics are flattened by replicating row entries or decomposing multi-valued attributes.
- All non-atomic collections are expanded such that each tuple contains scalar, atomic data values.
- A composite primary key is established to uniquely identify each row in the flattened universal relation:
  **Primary Key:** `(queue_id, ticket_id, assigned_staff_user_id)`

### 3.3 Functional Dependencies in 1NF Relation

Let $K$ be the composite primary key `(queue_id, ticket_id, assigned_staff_user_id)`:

* **FD1:** `user_id → user_name, user_email, user_password_hash, user_role, user_created_at`
* **FD2:** `location_id → location_name, location_building`
* **FD3:** `queue_id → location_id, queue_name, queue_status, queue_max_size, queue_next_ticket_no, queue_avg_service_seconds`
* **FD4:** `ticket_id → queue_id, user_id, ticket_no, ticket_status, ticket_joined_at, ticket_called_at, ticket_served_at, served_by_staff_id`
* **FD5:** `(queue_id, ticket_no) → ticket_id` *(Within a queue, ticket numbers are unique)*
* **FD6:** `(assigned_staff_user_id, queue_id) → [staff assignment exists]`
* **FD7:** `served_by_staff_id → served_by_staff_name`

### 3.4 Why 1NF is Insufficient (Partial Dependencies)
The relation contains severe **partial dependencies**, where non-key attributes depend on only a subset of the candidate key:
- `ticket_status`, `ticket_joined_at`, `user_id` depend only on `ticket_id`, completely independent of `assigned_staff_user_id`.
- `queue_name`, `queue_status`, `location_id` depend only on `queue_id`.
- `user_name`, `user_email` depend on `user_id` (which is part of `ticket_id`, not the full composite key).

These partial dependencies violate the requirements of Second Normal Form.

---

## 4. Second Normal Form (2NF)

### 4.1 2NF Requirements
A relation $R$ is in **Second Normal Form (2NF)** if and only if:
1. It is in **1NF**.
2. No non-prime attribute is partially dependent on any candidate key of the relation (i.e., every non-prime attribute is fully functionally dependent on the entire primary key).

### 4.2 Decomposition to 2NF
To achieve 2NF, attributes that depend on only a subset of composite keys are extracted into distinct relations:

1. **`users` Relation:**
   Attributes functionally dependent purely on `user_id`:
   $$\text{user\_id} \to \text{name, email, password\_hash, role, created\_at}$$

2. **`locations_and_queues` Relation:**
   Attributes functionally dependent purely on `queue_id`:
   $$\text{queue\_id} \to \text{location\_id, location\_name, location\_building, queue\_name, queue\_status, queue\_max\_size, queue\_next\_ticket\_no, queue\_avg\_service\_seconds}$$

3. **`staff_assignments` Relation:**
   Linking staff members to their assigned queues via a composite key:
   $$(\text{user\_id, queue\_id}) \to \text{assigned\_at}$$

4. **`queue_entries` Relation:**
   Attributes dependent purely on `ticket_id`:
   $$\text{id} \to \text{queue\_id, user\_id, ticket\_no, status, joined\_at, called\_at, served\_at, served\_by}$$

5. **`queue_stats_hourly` Relation:**
   Analytical rollups indexed by queue and time window:
   $$(\text{queue\_id, hour}) \to \text{joins, served, no\_shows, avg\_wait\_seconds}$$

### 4.3 Remaining Defects in 2NF (Transitive Dependencies)
Although partial functional dependencies on composite keys have been eliminated, **transitive dependencies** remain in the `locations_and_queues` relation:
$$\text{queue\_id} \to \text{location\_id} \quad \text{and} \quad \text{location\_id} \to \text{location\_name, location\_building}$$
Because $\text{location\_id}$ is not a candidate key of `locations_and_queues`, non-prime attributes `location_name` and `location_building` transitively depend on `queue_id`. This violates Third Normal Form.

---

## 5. Third Normal Form (3NF)

### 5.1 3NF Requirements
A relation $R$ is in **Third Normal Form (3NF)** if and only if:
1. It is in **2NF**.
2. For every non-trivial functional dependency $X \to Y$:
   - $X$ is a **superkey**, OR
   - $Y$ is a **prime attribute** (member of a candidate key).

In plain terms: *“Every non-key attribute must provide a fact about the key, the whole key, and nothing but the key.”*

### 5.2 Eliminating Transitive Dependencies
We decompose `locations_and_queues` into two separate, normalized relations:
1. **`locations`:** Contains location attributes determined directly by `location_id`.
2. **`queues`:** Contains queue configuration attributes, referencing `locations(id)` via foreign key `location_id`.

Similarly, `served_by_staff_name` is removed from `queue_entries`, retaining only the foreign key `served_by` pointing to `users(id)`.

### 5.3 Normalized 3NF Relational Schema

#### 1. `users`
* **Attributes:** `id` (PK), `name`, `email` (UK), `password_hash`, `role`, `created_at`
* **Determinant:** `id` is the primary key; `email` is a candidate key.
* **Functional Dependencies:**
  $$\text{id} \to \text{name, email, password\_hash, role, created\_at}$$
  $$\text{email} \to \text{id, name, password\_hash, role, created\_at}$$

#### 2. `locations`
* **Attributes:** `id` (PK), `name` (UK), `building`
* **Determinant:** `id` is the primary key; `name` is unique.
* **Functional Dependencies:**
  $$\text{id} \to \text{name, building}$$
  $$\text{name} \to \text{id, building}$$

#### 3. `queues`
* **Attributes:** `id` (PK), `location_id` (FK), `name`, `status`, `max_size`, `next_ticket_no`, `avg_service_seconds`
* **Determinant:** `id` is the primary key. Composite candidate key: `(location_id, name)`.
* **Functional Dependencies:**
  $$\text{id} \to \text{location\_id, name, status, max\_size, next\_ticket\_no, avg\_service_seconds}$$
  $$(\text{location\_id, name}) \to \text{id, status, max\_size, next\_ticket\_no, avg\_service\_seconds}$$

#### 4. `staff_assignments`
* **Attributes:** `user_id` (PK, FK), `queue_id` (PK, FK), `assigned_at`
* **Determinant:** Composite primary key `(user_id, queue_id)`.
* **Functional Dependencies:**
  $$(\text{user\_id, queue\_id}) \to \text{assigned\_at}$$

#### 5. `queue_entries`
* **Attributes:** `id` (PK), `queue_id` (FK), `user_id` (FK), `ticket_no`, `status`, `joined_at`, `called_at`, `served_at`, `served_by` (FK, nullable)
* **Determinants:** `id` is the primary key. Candidate key: `(queue_id, ticket_no)`.
* **Functional Dependencies:**
  $$\text{id} \to \text{queue\_id, user\_id, ticket\_no, status, joined\_at, called\_at, served\_at, served\_by}$$
  $$(\text{queue\_id, ticket\_no}) \to \text{id, user\_id, status, joined\_at, called\_at, served\_at, served\_by}$$

#### 6. `queue_stats_hourly`
* **Attributes:** `queue_id` (PK, FK), `hour` (PK), `joins`, `served`, `no_shows`, `avg_wait_seconds`
* **Determinant:** Composite primary key `(queue_id, hour)`.
* **Functional Dependencies:**
  $$(\text{queue\_id, hour}) \to \text{joins, served, no\_shows, avg\_wait\_seconds}$$

---

## 6. Boyce-Codd Normal Form (BCNF) Evaluation

### 6.1 BCNF Definition
A relation $R$ is in **Boyce-Codd Normal Form (BCNF)** if and only if:
> For every non-trivial functional dependency $X \to Y$, the determinant $X$ is a **superkey**.

BCNF is stricter than 3NF because it disallows cases where $X$ is not a superkey even if $Y$ is a prime attribute.

### 6.2 Table-by-Table BCNF Verification

| Relation | Non-Trivial FDs | Determinant ($X$) | Is $X$ a Superkey? | BCNF Status |
|---|---|---|:---:|:---:|
| **`users`** | $\text{id} \to \text{all attributes}$<br>$\text{email} \to \text{all attributes}$ | `id`<br>`email` | Yes (Primary Key)<br>Yes (Candidate Key) | **Compliant** |
| **`locations`** | $\text{id} \to \text{name, building}$<br>$\text{name} \to \text{id, building}$ | `id`<br>`name` | Yes (Primary Key)<br>Yes (Candidate Key) | **Compliant** |
| **`queues`** | $\text{id} \to \text{all attributes}$<br>$(\text{location\_id, name}) \to \text{all attributes}$ | `id`<br>`(location_id, name)` | Yes (Primary Key)<br>Yes (Candidate Key) | **Compliant** |
| **`staff_assignments`** | $(\text{user\_id, queue\_id}) \to \text{assigned\_at}$ | `(user_id, queue_id)` | Yes (Primary Key) | **Compliant** |
| **`queue_entries`** | $\text{id} \to \text{all attributes}$<br>$(\text{queue\_id, ticket\_no}) \to \text{all attributes}$ | `id`<br>`(queue_id, ticket_no)` | Yes (Primary Key)<br>Yes (Candidate Key) | **Compliant** |
| **`queue_stats_hourly`** | $(\text{queue\_id, hour}) \to \text{joins, served, no\_shows, avg\_wait\_seconds}$ | `(queue_id, hour)` | Yes (Primary Key) | **Compliant** |

### 6.3 Conclusion on BCNF
In all six normalized relations, every single determinant of a non-trivial functional dependency is a candidate key or primary key. Therefore, **the entire Smart Queue relational schema satisfies BCNF**.

---

## 7. Justified Denormalizations & Performance Engineering

While pure theoretical normalization eliminates all redundancies, high-concurrency real-time systems require deliberate, documented exceptions to avoid catastrophic read latencies. The Smart Queue architecture incorporates two justified denormalized attributes:

### 1. `queues.avg_service_seconds` (Cached Median Service Duration)
* **Derivation:** Mathematically derivable from historical service intervals in `queue_entries`:
  $$\text{duration} = \text{served\_at} - \text{called\_at}$$
* **Justification:** Every student polling their position (every 3–5 seconds) calculates their estimated waiting time:
  $$\text{ETA} = \text{Number of People Ahead} \times \text{Median Service Duration}$$
  Computing the median across thousands of rows on every HTTP poll would cause extreme database load. Caching the rolling median in `queues.avg_service_seconds` converts an $O(N \log N)$ window aggregation into an instantaneous $O(1)$ scalar read.
* **Consistency Control:** Updated asynchronously or periodically by background service workers upon ticket completion.

### 2. `queues.next_ticket_no` (Monotonic Ticket Counter)
* **Derivation:** Can be derived by executing `SELECT COALESCE(MAX(ticket_no), 0) + 1 FROM queue_entries WHERE queue_id = ?`.
* **Justification:** Scanning `queue_entries` under high concurrent student traffic creates table contention and race conditions. Storing `next_ticket_no` directly on the `queues` record allows PostgreSQL to use atomic row locking (`UPDATE queues SET next_ticket_no = next_ticket_no + 1 RETURNING next_ticket_no`) inside a transaction, guaranteeing zero duplicate tickets.

### 3. `queue_stats_hourly` (Pre-Aggregated Analytical Rollup)
* **Derivation:** Fully derivable by aggregating `queue_entries` grouped by `date_trunc('hour', joined_at)`.
* **Justification:** Real-time admin dashboard analytics across tens of thousands of historical entries would require full table scans. Pre-aggregating hourly joins, served counts, no-shows, and wait averages isolates operational workloads from heavy analytical queries.

---

## 8. Relational Data Dictionary

Below is the production database specification implemented with PostgreSQL and Prisma ORM.

### 8.1 Table: `users`
Stores student accounts, counter staff, and system administrators.

| Column | Data Type | Constraints | Description |
|---|---|---|---|
| `id` | `INTEGER` | `PRIMARY KEY`, `GENERATED ALWAYS AS IDENTITY` | Unique surrogate user identifier |
| `name` | `VARCHAR(100)` | `NOT NULL` | Full name of the user |
| `email` | `VARCHAR(255)` | `NOT NULL`, `UNIQUE` | Institutional or personal login email |
| `password_hash` | `VARCHAR(255)` | `NOT NULL` | Salted bcrypt password hash |
| `role` | `VARCHAR(20)` | `NOT NULL`, `CHECK (role IN ('STUDENT', 'STAFF', 'ADMIN'))` | Role-based access control level |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL`, `DEFAULT CURRENT_TIMESTAMP` | Account creation timestamp |

### 8.2 Table: `locations`
Stores campus service facilities (canteens, libraries, offices).

| Column | Data Type | Constraints | Description |
|---|---|---|---|
| `id` | `INTEGER` | `PRIMARY KEY`, `GENERATED ALWAYS AS IDENTITY` | Unique location identifier |
| `name` | `VARCHAR(100)` | `NOT NULL`, `UNIQUE` | Name of the facility (e.g., Central Library) |
| `building` | `VARCHAR(100)` | `NOT NULL` | Campus building or block name |

### 8.3 Table: `queues`
Stores configurable service queues operating within campus locations.

| Column | Data Type | Constraints | Description |
|---|---|---|---|
| `id` | `INTEGER` | `PRIMARY KEY`, `GENERATED ALWAYS AS IDENTITY` | Unique queue identifier |
| `location_id` | `INTEGER` | `NOT NULL`, `REFERENCES locations(id) ON DELETE RESTRICT` | Owning facility reference |
| `name` | `VARCHAR(100)` | `NOT NULL` | Queue display name (e.g., Book Issue Counter) |
| `status` | `VARCHAR(20)` | `NOT NULL`, `CHECK (status IN ('OPEN', 'PAUSED', 'CLOSED'))` | Current operational status |
| `max_size` | `INTEGER` | `NOT NULL`, `CHECK (max_size > 0)` | Maximum active waiting capacity |
| `next_ticket_no` | `INTEGER` | `NOT NULL`, `DEFAULT 1`, `CHECK (next_ticket_no > 0)` | Monotonic counter for atomic ticket allocation |
| `avg_service_seconds` | `INTEGER` | `NOT NULL`, `DEFAULT 300`, `CHECK (avg_service_seconds >= 0)` | Cached rolling median service duration in seconds |

### 8.4 Table: `staff_assignments`
Associates staff members with the specific queues they are authorized to manage.

| Column | Data Type | Constraints | Description |
|---|---|---|---|
| `user_id` | `INTEGER` | `NOT NULL`, `REFERENCES users(id) ON DELETE CASCADE` | Staff member user identifier |
| `queue_id` | `INTEGER` | `NOT NULL`, `REFERENCES queues(id) ON DELETE CASCADE` | Assigned service queue identifier |
| `assigned_at` | `TIMESTAMPTZ` | `NOT NULL`, `DEFAULT CURRENT_TIMESTAMP` | Assignment timestamp |
| **PRIMARY KEY** | `(user_id, queue_id)` | Composite key enforcing unique assignments |

### 8.5 Table: `queue_entries`
Records lifecycle events for each digital ticket issued to a student.

| Column | Data Type | Constraints | Description |
|---|---|---|---|
| `id` | `INTEGER` | `PRIMARY KEY`, `GENERATED ALWAYS AS IDENTITY` | Unique ticket transaction identifier |
| `queue_id` | `INTEGER` | `NOT NULL`, `REFERENCES queues(id) ON DELETE RESTRICT` | Associated queue reference |
| `user_id` | `INTEGER` | `NOT NULL`, `REFERENCES users(id) ON DELETE RESTRICT` | Student recipient reference |
| `ticket_no` | `INTEGER` | `NOT NULL`, `CHECK (ticket_no > 0)` | Sequential ticket number within the queue |
| `status` | `VARCHAR(20)` | `NOT NULL`, `CHECK (status IN ('WAITING', 'CALLED', 'SERVED', 'NO_SHOW', 'CANCELLED'))` | Current ticket state |
| `joined_at` | `TIMESTAMPTZ` | `NOT NULL`, `DEFAULT CURRENT_TIMESTAMP` | Queue join timestamp |
| `called_at` | `TIMESTAMPTZ` | `NULL` | Timestamp when staff called the ticket |
| `served_at` | `TIMESTAMPTZ` | `NULL` | Timestamp when service completed |
| `served_by` | `INTEGER` | `NULL`, `REFERENCES users(id) ON DELETE SET NULL` | Staff member who fulfilled the service |

* **Integrity Constraint:** Active duplicate prevention partial unique index:
  ```sql
  CREATE UNIQUE INDEX uq_active_user_per_queue
  ON queue_entries (queue_id, user_id)
  WHERE status IN ('WAITING', 'CALLED');
  ```

### 8.6 Table: `queue_stats_hourly`
Stores pre-computed hourly analytical metrics for administrative reporting.

| Column | Data Type | Constraints | Description |
|---|---|---|---|
| `queue_id` | `INTEGER` | `NOT NULL`, `REFERENCES queues(id) ON DELETE CASCADE` | Service queue reference |
| `hour` | `TIMESTAMPTZ` | `NOT NULL` | Truncated hourly bucket timestamp |
| `joins` | `INTEGER` | `NOT NULL`, `DEFAULT 0`, `CHECK (joins >= 0)` | Total tickets requested in the hour |
| `served` | `INTEGER` | `NOT NULL`, `DEFAULT 0`, `CHECK (served >= 0)` | Total students served in the hour |
| `no_shows` | `INTEGER` | `NOT NULL`, `DEFAULT 0`, `CHECK (no_shows >= 0)` | Total students flagged as no-shows |
| `avg_wait_seconds` | `INTEGER` | `NOT NULL`, `DEFAULT 0`, `CHECK (avg_wait_seconds >= 0)` | Average waiting duration in seconds |
| **PRIMARY KEY** | `(queue_id, hour)` | Composite primary key per queue per hour |

---

## 9. Entity-Relationship & Cardinality Overview

```text
       +---------------+
       |   LOCATIONS   |
       +---------------+
               | 1
               |
               | operates (1:N)
               |
               v N
       +---------------+           M:N            +---------------+
       |    QUEUES     |<========================>|     USERS     |
       +---------------+   (staff_assignments)    +---------------+
         | 1       | 1                              | 1         ^ 1
         |         |                                |           |
         |         +-------------+                  |           | served_by
         |                       |                  |           | (0..1)
         | logs (1:N)            | tracks (1:N)     | places    |
         v N                     v N                v N         |
+--------------------+   +--------------------------------------+
| QUEUE_STATS_HOURLY |   |            QUEUE_ENTRIES             |
+--------------------+   +--------------------------------------+
```

### Cardinality Summary
1. **Locations to Queues:** `1 : N` (A campus building/location hosts multiple service queues; each queue belongs to exactly one location).
2. **Queues to Users (Staff):** `M : N` (Resolved via bridge relation `staff_assignments`; a staff member can operate multiple queues, and a busy queue can have multiple operators).
3. **Queues to Queue Entries:** `1 : N` (A service queue issues multiple sequential tickets over its lifetime).
4. **Users (Students) to Queue Entries:** `1 : N` (A student can join queues historically, but at most one active ticket per queue via partial unique constraint).
5. **Users (Staff) to Queue Entries:** `1 : N` (Optional: a staff member can fulfill many tickets; an uncalled ticket has `served_by = NULL`).
6. **Queues to Queue Stats Hourly:** `1 : N` (Each queue accumulates hourly aggregate performance metrics).

---

## 10. Summary of Anomaly Resolution

| Anomaly Type | Unnormalized State (UNF) | Normalized State (3NF / BCNF) |
|---|---|---|
| **Insertion** | Cannot add a campus location or staff member without issuing a ticket. | Locations, Queues, and Users exist as independent master entities. |
| **Deletion** | Deleting old tickets risks erasing location details and staff accounts. | Purging or archiving `queue_entries` does not affect `locations`, `queues`, or `users`. |
| **Update** | Changing a building name or user email requires updating thousands of historical ticket records. | Building name and user email are stored exactly once in `locations` and `users`. |

The resulting relational architecture provides maximum transactional integrity, avoids redundant storage, ensures zero update anomalies, and establishes a robust foundation for PostgreSQL locking (`FOR UPDATE SKIP LOCKED`) and Redis Sorted Set caching.
