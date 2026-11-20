# QueueBee — Database Normalization (CP1)

**Course:** Advanced Programming (AP) · **Year:** B.Tech 2nd Year · **Team No.:** T0083 · **Section:** D

Normalization means arranging data in tables so that **the same fact is stored only once**.
It prevents wrong or inconsistent data when we insert, update or delete rows.

The final design has three tables (the same three models as `prisma/schema.prisma`):
`User`, `Location` and `QueueTicket`.

---

## 1. Unnormalized data (UNF)

Imagine we first keep everything in one sheet, `QUEUE_RECORD`:

| studentName | studentEmail | role | locationName | locationInfo | tickets (number : status) |
|---|---|---|---|---|---|
| Riya Sharma | riya@queuebee.edu | STUDENT | Canteen | Food counter, 3 min | 1 : COMPLETED, 3 : WAITING |
| Kabir Mehta | kabir@queuebee.edu | STUDENT | Canteen | Food counter, 3 min | 2 : COMPLETED, 4 : WAITING |
| Meera Nair | meera@queuebee.edu | STUDENT | Library Desk | Book desk, 4 min | 2 : WAITING |

**Problems**

- The last column holds **many values in one cell** (a repeating group).
- The location details are repeated for every student.
- We cannot easily count, filter or sort tickets.

---

## 2. First Normal Form (1NF)

**Rule:** every cell has one single (atomic) value, there are no repeating groups, and every row can be identified by a key.

Fix: one row for each ticket, and the info is split into separate columns.

**QUEUE_RECORD (1NF)** — key: `(locationName, ticketNumber)` (a ticket number is unique inside one location)

| locationName | ticketNumber | status | studentEmail | studentName | role | description | avgServiceMinutes |
|---|---|---|---|---|---|---|---|
| Canteen | 1 | COMPLETED | riya@queuebee.edu | Riya Sharma | STUDENT | Food counter | 3 |
| Canteen | 2 | COMPLETED | kabir@queuebee.edu | Kabir Mehta | STUDENT | Food counter | 3 |
| Canteen | 3 | WAITING | riya@queuebee.edu | Riya Sharma | STUDENT | Food counter | 3 |
| Library Desk | 2 | WAITING | meera@queuebee.edu | Meera Nair | STUDENT | Book desk | 4 |

Still a problem: "Food counter, 3" and "Riya Sharma" are repeated again and again.

---

## 3. Functional dependencies (FDs)

`A → B` means "if I know A, I can find exactly one B".

| Dependency | Meaning |
|---|---|
| `(locationName, ticketNumber) → status, studentEmail` | A ticket (its location + number) has one status and belongs to one student |
| `locationName → description, avgServiceMinutes` | A location has one description and one average service time |
| `studentEmail → studentName, role` | An email belongs to one student, with one name and one role |

---

## 4. Second Normal Form (2NF)

**Rule:** the table is in 1NF **and** no non-key column depends on only *part* of a composite key (no partial dependency).

Here the key is `(locationName, ticketNumber)`.
`locationName → description, avgServiceMinutes` is a **partial dependency** (it depends only on `locationName`, which is part of the key).

Fix: move location details to their own table.

**LOCATION (2NF)** — PK: `locationName`

| locationName | description | avgServiceMinutes |
|---|---|---|
| Canteen | Food counter | 3 |
| Library Desk | Book desk | 4 |

**QUEUE_RECORD (2NF)** — PK: `(locationName, ticketNumber)`; `locationName` is a foreign key to LOCATION

| locationName | ticketNumber | status | studentEmail | studentName | role |
|---|---|---|---|---|---|
| Canteen | 1 | COMPLETED | riya@queuebee.edu | Riya Sharma | STUDENT |
| Canteen | 3 | WAITING | riya@queuebee.edu | Riya Sharma | STUDENT |
| ... | ... | ... | ... | ... | ... |

---

## 5. Third Normal Form (3NF)

**Rule:** the table is in 2NF **and** no non-key column depends on another non-key column (no transitive dependency).

Here: `(locationName, ticketNumber) → studentEmail` and `studentEmail → studentName, role`.
So `studentName` and `role` depend on the key only **through** `studentEmail` — a **transitive dependency**.

Fix: move student details to their own table.

**USER (3NF)** — PK: `email`

| email | name | role |
|---|---|---|
| riya@queuebee.edu | Riya Sharma | STUDENT |
| kabir@queuebee.edu | Kabir Mehta | STUDENT |

**QUEUE_TICKET (3NF)** — PK: `(locationName, ticketNumber)`, FKs: `locationName`, `studentEmail`

| locationName | ticketNumber | status | studentEmail |
|---|---|---|---|
| Canteen | 1 | COMPLETED | riya@queuebee.edu |
| Canteen | 3 | WAITING | riya@queuebee.edu |

---

## 6. Final tables (what we really use)

In the real database we give every table a short numeric primary key `id` (a *surrogate key*), because it is smaller and easier to use as a foreign key than a name or an email.
The natural keys are kept as **UNIQUE** columns, so nothing is lost.

| Table | Columns | Keys |
|---|---|---|
| `User` | id, name, email, passwordHash, role, createdAt | PK `id`; UNIQUE `email` |
| `Location` | id, name, description, avgServiceMinutes, createdAt | PK `id`; UNIQUE `name` |
| `QueueTicket` | id, ticketNumber, status, createdAt, calledAt, completedAt, userId, locationId | PK `id`; FK `userId` → User; FK `locationId` → Location; UNIQUE `(locationId, ticketNumber)` |

*(In the project brief these are called Users, Locations and QueueTickets; the real tables are singular because Prisma uses the model name.)*

**Final functional dependencies**

- `User`: `id → name, email, passwordHash, role, createdAt` and `email → id`
- `Location`: `id → name, description, avgServiceMinutes, createdAt` and `name → id`
- `QueueTicket`: `id → ticketNumber, status, createdAt, calledAt, completedAt, userId, locationId` and `(locationId, ticketNumber) → id`

### Why the final tables are in 3NF

- **1NF:** all values are atomic (`role` and `status` are single enum values; times are single timestamps).
- **2NF:** every table has a single-column primary key, so a partial dependency is impossible.
- **3NF:** in each table, the non-key columns depend only on the key. A student's name is only in `User`; a location's average service time is only in `Location`; `QueueTicket` only stores the ticket's own facts and two foreign keys.

### BCNF (extra check)

**Rule:** for every functional dependency `X → Y`, `X` must be a candidate key.
All determinants above (`id`, `email`, `name`, `(locationId, ticketNumber)`) are candidate keys of their own table, so **every table is also in BCNF**.

### What normalization gives us

| Problem (anomaly) | Example | How the design avoids it |
|---|---|---|
| Update | Changing a location's average time in many rows | It is stored once, in `Location` |
| Insert | Adding a new location with no tickets | It is just a row in `Location` |
| Delete | Deleting the last ticket loses student info | Student info lives in `User` |

> The design uses `status` (an enum) and does not store the "position" or "waiting time" — those are **calculated** by queries (see `04_queries.sql`, Q6), so they can never become out of date.
