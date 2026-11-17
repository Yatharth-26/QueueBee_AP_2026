# Smart Queue (QueueBee) — Entity Relationship (ER) Model
**Course:** Advanced Programming (AP) · **Year:** B.Tech 2nd Year  
**Team No.:** T0083 · **Section:** D  
**Group Lead:** Yatharth Soni (2501010531)  
**Checkpoint 2 (CP2) Deliverable**

---

## 1. Visual ER Diagram

![QueueBee ER Diagram](02_er_diagram.png)

```mermaid
erDiagram
    LOCATIONS ||--o{ QUEUES : "hosts"
    USERS ||--o{ STAFF_ASSIGNMENTS : "assigned to"
    QUEUES ||--o{ STAFF_ASSIGNMENTS : "managed by"
    USERS ||--o{ QUEUE_ENTRIES : "places ticket"
    USERS ||--o{ QUEUE_ENTRIES : "serves ticket"
    QUEUES ||--o{ QUEUE_ENTRIES : "contains"
    QUEUES ||--o{ QUEUE_STATS_HOURLY : "aggregates"

    USERS {
        uuid id PK
        varchar name
        varchar email UK
        varchar password_hash
        role_enum role "STUDENT, STAFF, ADMIN"
        timestamptz created_at
    }

    LOCATIONS {
        uuid id PK
        varchar name
        varchar building
        timestamptz created_at
    }

    QUEUES {
        uuid id PK
        uuid location_id FK
        varchar name
        queue_status_enum status "OPEN, PAUSED, CLOSED"
        integer max_size
        integer next_ticket_no
        integer avg_service_seconds
        timestamptz created_at
    }

    STAFF_ASSIGNMENTS {
        uuid user_id PK,FK
        uuid queue_id PK,FK
    }

    QUEUE_ENTRIES {
        uuid id PK
        uuid queue_id FK
        uuid user_id FK
        integer ticket_no
        entry_status_enum status "WAITING, CALLED, SERVED, NO_SHOW, CANCELLED"
        timestamptz joined_at
        timestamptz called_at
        timestamptz served_at
        uuid served_by FK
    }

    QUEUE_STATS_HOURLY {
        uuid id PK
        uuid queue_id FK
        timestamptz hour
        integer joins
        integer served
        integer no_shows
        float avg_wait_seconds
    }
```

---

## 2. Cardinalities & Relationship Descriptions

1. **LOCATIONS to QUEUES (1:N):**
   - One location (e.g., "Main Student Canteen", "Central Library") can have one or more distinct service queues (e.g., "Hot Meals Counter", "Book Issue Desk").
   - Each queue belongs strictly to one physical campus location (`location_id` FK).

2. **USERS to STAFF_ASSIGNMENTS to QUEUES (M:N):**
   - Staff assignments bridge the many-to-many relationship between staff members and counter queues.
   - A staff member can manage multiple queues, and a single queue can have multiple assigned staff operators working in parallel.
   - Enforced by composite primary key `(user_id, queue_id)`.

3. **USERS to QUEUE_ENTRIES (1:N):**
   - A student user creates queue entries over time as they join queues (`user_id` FK).
   - Enforced rule: A partial unique index prevents a student from having multiple active (`WAITING` or `CALLED`) tickets in the same queue simultaneously.

4. **QUEUES to QUEUE_ENTRIES (1:N):**
   - Every ticket entry belongs to a specific queue (`queue_id` FK).
   - Tickets receive a strictly monotonically increasing sequential `ticket_no` allocated safely via PostgreSQL transaction locks.
   - Database constraint `UNIQUE (queue_id, ticket_no)` enforces ticket-number uniqueness per queue.

5. **USERS (Staff) to QUEUE_ENTRIES (1:N, Optional):**
   - `served_by` references the staff user who called and served the student ticket. Allows auditability and staff productivity metrics.

6. **QUEUES to QUEUE_STATS_HOURLY (1:N):**
   - Pre-aggregated hourly summary records for efficient administrative dashboards and high-speed reporting without scanning millions of historical raw entry rows (`queue_id` FK).
