# QueueBee 🐝 — Campus Virtual Queue Management System

**Course:** Advanced Programming (AP) · **Year:** B.Tech 2nd Year  
**Team No.:** T0083 · **Section:** D

| Role           | Name              | Enrollment No. | GitHub Username   |
| -------------- | ----------------- | -------------- | ----------------- |
| **Group Lead** | **Yatharth Soni** | **2501010531** | **Yatharth-26**   |
| Member 2       | Madhav Aggarwal   | 2501010619     | rmmadhav74-boop   |
| Member 3       | Kavy Singhvi      | 2501010215     | ksinghvi9         |
| Member 4       | Aaditya Bansal    | 2501010617     | aadityabansal-001 |

## What is QueueBee?

Students waste time standing in physical lines at the canteen, library desk or fee office.
QueueBee lets them **join a queue from their phone**, see their **ticket number, position and approximate waiting time**,
while **staff** call and complete tickets and the **admin** watches simple statistics.

| Role    | What they can do |
| ------- | ---------------- |
| Student | Register, log in, join a queue, see ticket / position / wait time, cancel a waiting ticket, view history |
| Staff   | Choose a counter, see its queue, call the next ticket, mark it completed |
| Admin   | See user and queue statistics, add / delete locations, change a user's role |

## Technology

Node.js · Express.js · PostgreSQL · Prisma ORM · JWT (`jsonwebtoken`) · bcrypt (`bcryptjs`) · Vanilla HTML / CSS / JavaScript

## Folder structure

```text
QueueBee/
├── prisma/
│   ├── schema.prisma          # database models (User, Location, QueueTicket)
│   └── seed.js                # demo data
├── src/
│   ├── server.js              # starts the server
│   ├── app.js                 # Express app: middleware + routes
│   ├── config/prisma.js       # shared Prisma Client
│   ├── middleware/
│   │   ├── auth.js            # requireAuth  (checks JWT)
│   │   ├── role.js            # requireRole  (checks role)
│   │   └── errorHandler.js    # notFound + central error handler
│   ├── controllers/           # the actual logic of each endpoint
│   │   ├── authController.js
│   │   ├── locationController.js
│   │   ├── queueController.js
│   │   └── adminController.js
│   └── routes/                # URL -> controller mapping
│       ├── authRoutes.js
│       ├── locationRoutes.js
│       ├── queueRoutes.js
│       └── adminRoutes.js
├── public/                    # frontend (served by Express)
│   ├── index.html  login.html  register.html
│   ├── student.html  staff.html  admin.html
│   ├── css/style.css
│   └── js/  api.js  home.js  login.js  register.js  student.js  staff.js  admin.js
├── .env.example
├── package.json
└── VIVA_GUIDE.md              # architecture, API table, viva questions
```

## How to run

**Requirements:** Node.js 18+ and PostgreSQL running on your computer.

```bash
# 1. Install packages
npm install

# 2. Create your .env file, then open it and put your PostgreSQL password
#    Windows (PowerShell):  copy .env.example .env
#    Mac / Linux:           cp .env.example .env

# 3. Create the database tables (also creates the database if it does not exist)
npx prisma migrate dev --name init

# 4. Fill the database with demo data
npm run seed

# 5. Start the server
npm start
```

Open **http://localhost:3000**.

Use `npm run dev` while coding (restarts automatically when files change).

### Demo accounts (created by the seed, password for all: `password123`)

| Role    | Email                  |
| ------- | ---------------------- |
| Admin   | admin@queuebee.edu     |
| Staff   | staff@queuebee.edu     |
| Student | student@queuebee.edu   |

The login page has buttons that fill these in for you.

### Quick demo for the viva

1. Log in as **student** → join the *Canteen* queue → note ticket number, position and wait time.
2. In another browser window log in as **staff** → choose *Canteen* → **Call next** → **Complete current**.
3. Watch the student page update by itself (it asks the server again every 5 seconds).
4. Log in as **admin** → see the statistics, add a location, change a user's role.

## More information

See **[VIVA_GUIDE.md](VIVA_GUIDE.md)** for the architecture, database relationships, API table,
authentication flow, explanation of every file and 30 likely viva questions with answers.
