# QueueBee 🐝 — Campus Virtual Queue Management System

**Course:** Advanced Programming (AP) · **Year:** B.Tech 2nd Year  
**Team No.:** T0083 · **Section:** D

| Role           | Name              | Enrollment No. | GitHub Username   |
| -------------- | ----------------- | -------------- | ----------------- |
| **Group Lead** | **Yatharth Soni** | **2501010531** | **Yatharth-26**   |
| Member 2       | Madhav Aggarwal   | 2501010619     | rmmadhav74-boop   |
| Member 3       | Kavy Singhvi      | 2501010215     | ksinghvi9         |
| Member 4       | Aaditya Bansal    | 2501010617     | aadityabansal-001 |

---

## 📌 Problem Statement & Solution

Students waste valuable academic time standing in crowded physical queues at service counters across campus — such as the **Canteen, Library Desk, Fee Office, and Certificate Counter**. 

**QueueBee** eliminates physical waiting lines with a clean, responsive virtual queue system:
- **Students** join queues from any device, track real-time queue position, and see calculated wait estimates.
- **Staff** manage counters digitally, calling the next waiting student (FIFO order) and marking service completion.
- **Admins** monitor live campus queue traffic, create and manage service points, and manage user roles (RBAC).

---

## 🛠️ Technology Stack

| Layer | Technologies |
| ----- | ------------ |
| **Runtime** | Node.js (v18+) |
| **Backend Framework** | Express.js (RESTful API, modular routing, centralized error handling) |
| **Database** | PostgreSQL |
| **ORM** | Prisma ORM (migrations, schema modeling, relation mapping, seeding) |
| **Authentication & Security** | JWT (`jsonwebtoken`), password hashing with salt rounds (`bcryptjs`) |
| **Frontend** | Vanilla HTML5, modern CSS3 (CSS Variables, Flexbox, Grid), JavaScript (Fetch API, DOM manipulation) |

---

## 📁 Project Structure

```text
QueueBee/
├── dbms/                              # DBMS Academic Deliverables (CP1 - CP4)
│   ├── 01_normalization.md            # Relational Normalization (1NF, 2NF, 3NF, BCNF)
│   ├── 02_er_diagram.md               # Entity-Relationship diagram & cardinalities
│   ├── 02_er_diagram.mmd              # Mermaid ER diagram source
│   ├── 02_er_diagram.png              # Rendered ER diagram image
│   ├── 03_schema.sql                  # PostgreSQL DDL schema with constraints & indexes
│   ├── 04_queries.sql                 # Application SQL queries (CRUD, joins, subqueries)
│   ├── 05_query_timings.md            # Query performance analysis & EXPLAIN ANALYZE timings
│   └── plans/                         # Query execution plans
├── prisma/
│   ├── schema.prisma                  # Prisma ORM schema models (User, Location, QueueTicket)
│   ├── seed.js                        # Database seeder with demo accounts & starter queues
│   └── migrations/                    # Versioned SQL migrations applied by Prisma
├── src/
│   ├── server.js                      # Entry point: environment validation & HTTP listener
│   ├── app.js                         # Express configuration: middleware, static assets & routes
│   ├── config/
│   │   └── prisma.js                  # Shared PrismaClient singleton instance
│   ├── middleware/
│   │   ├── auth.js                    # requireAuth (Bearer JWT token verification)
│   │   ├── role.js                    # requireRole (Role-Based Access Control - RBAC)
│   │   └── errorHandler.js            # notFound handler + centralized error handling
│   ├── controllers/                   # Business logic and database operations
│   │   ├── authController.js          # Register, login, current user profile
│   │   ├── locationController.js      # List, create, and delete service locations
│   │   ├── queueController.js         # Student queue actions & staff counter dispatching
│   │   └── adminController.js         # System metrics, user listing, role promotion
│   └── routes/                        # HTTP route declarations
│       ├── authRoutes.js
│       ├── locationRoutes.js
│       ├── queueRoutes.js
│       └── adminRoutes.js
├── public/                            # Static frontend client
│   ├── index.html                     # Landing page with feature overview
│   ├── login.html                     # Login page with 1-click demo credentials
│   ├── register.html                  # Student registration portal
│   ├── student.html                   # Student dashboard (live ticket, queue join, history)
│   ├── staff.html                     # Staff counter desk (call next, complete ticket)
│   ├── admin.html                     # Admin console (analytics, locations, user RBAC)
│   ├── css/
│   │   └── style.css                  # Unified responsive styles
│   └── js/
│       ├── api.js                     # Shared client utilities, JWT storage, API request wrapper
│       ├── home.js                    # Landing page interactions
│       ├── login.js                   # Auth submission & demo fill
│       ├── register.js                # Registration form validation
│       ├── student.js                 # Student live dashboard & polling
│       ├── staff.js                   # Staff dispatching desk & live queue monitor
│       └── admin.js                   # Admin stats polling & user/location management
├── .env.example                       # Template for environment configuration
├── .gitignore                         # Git ignore configuration
├── package.json                       # Dependencies, scripts & metadata
├── README.md                          # Project documentation
└── VIVA_GUIDE.md                      # Comprehensive viva Q&A, architecture & DB guide
```

---

## ⚡ How to Set Up and Run

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **PostgreSQL**: v14.0 or higher running locally on port `5432`

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Configure Environment Variables
Copy `.env.example` to `.env` and configure your database connection:
```bash
# macOS / Linux:
cp .env.example .env

# Windows (PowerShell):
copy .env.example .env
```

Ensure `.env` contains:
```ini
PORT=3000
DATABASE_URL="postgresql://postgres:QueueBee2026@localhost:5432/queuebee_db?schema=public"
JWT_SECRET="queuebee_super_secret_jwt_key_2026"
JWT_EXPIRES_IN="1d"
```

### Step 3: Run Database Migrations
Create the tables and apply the schema:
```bash
npx prisma migrate dev --name init
```

### Step 4: Seed Demo Data
Populate demo users, locations, and sample queues:
```bash
npm run seed
```

### Step 5: Start the Server
```bash
# Production mode:
npm start

# Development mode (auto-reloads on file change):
npm run dev
```

Visit the application at: **[http://localhost:3000](http://localhost:3000)**

---

## 👥 Demo Accounts

The database seeder automatically creates accounts with pre-hashed passwords (`password123`). The login page also features one-click quick-fill buttons:

| Role | Email | Password | Allowed Capabilities |
| ---- | ----- | -------- | -------------------- |
| **Admin** | `admin@queuebee.edu` | `password123` | View campus analytics, create/delete locations, promote user roles, manage counters |
| **Staff** | `staff@queuebee.edu` | `password123` | Select counter, view waiting queue, call next student (FIFO), complete ticket |
| **Student** | `student@queuebee.edu` | `password123` | Join queue, track live position & wait estimate, cancel waiting ticket, view history |

---

## 🎯 Step-by-Step Viva Demonstration Script

1. **Student Journey (Window 1)**:
   - Log in as `student@queuebee.edu`.
   - Browse campus service points (Canteen, Library Desk, Fee Office).
   - Click **Join Queue** for Canteen.
   - Observe immediate ticket generation: Ticket number, position in line, and estimated wait minutes.
   - Explain FIFO ordering: position = count of waiting tickets ahead + 1.

2. **Staff Journey (Window 2 - Incognito/Another Window)**:
   - Log in as `staff@queuebee.edu`.
   - Select **Canteen** from the counter dropdown.
   - Observe the live list of waiting students.
   - Click **Call Next Ticket** (invokes FIFO dispatch).
   - In Window 1, watch the Student view update automatically within 5 seconds to show the green alert: `🎉 It is your turn! Please go to the counter now.`
   - In Window 2, click **Complete Current** to finish serving.

3. **Admin Dashboard (Window 3)**:
   - Log in as `admin@queuebee.edu`.
   - View live overview metrics: Total Users, Active Students, Waiting Now, Completed Tickets.
   - Add a new campus location (e.g., "Health Center", 7 min/student).
   - Demonstrate Role-Based Access Control (RBAC): Promote a student user to `STAFF`.
   - Demonstrate security safeguards: Admin cannot demote their own account.

---

## 🔒 Security & Data Integrity Highlights

- **Bcrypt Password Hashing**: Passwords are salted and hashed (10 salt rounds) before storage; plaintext passwords are never logged or stored.
- **JWT Authorization**: Requests to protected routes require `Authorization: Bearer <token>`.
- **RBAC**: Middleware strictly enforces role hierarchy (`requireRole("ADMIN")`, `requireRole("STAFF", "ADMIN")`).
- **No Self-Privilege Escalation**: Public registration endpoint strictly forces `role: "STUDENT"`, rejecting any client-supplied role parameters.
- **Concurrency Protection**: Unique constraint on `(locationId, ticketNumber)` guarantees ticket numbers never collide within a service counter.
- **Cascade Deletion**: Database foreign key constraints enforce `ON DELETE CASCADE` so deleting a location or user cleans up related tickets.
- **XSS Prevention**: Frontend safely escapes user-generated text using `escapeHtml()` prior to DOM insertion.

---

## 📖 Additional Documentation

For deep technical details, check:
- **[VIVA_GUIDE.md](VIVA_GUIDE.md)**: Complete guide with system architecture, database normalization, full API table, and answers to 30 common examiner questions.
- **[dbms/01_normalization.md](dbms/01_normalization.md)**: Academic database normalization documentation (1NF through BCNF).
- **[dbms/03_schema.sql](dbms/03_schema.sql)** & **[dbms/04_queries.sql](dbms/04_queries.sql)**: Raw PostgreSQL DDL and DML queries.
- **[dbms/05_query_timings.md](dbms/05_query_timings.md)**: Performance analysis with index optimization.
