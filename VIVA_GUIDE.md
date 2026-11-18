# QueueBee — Viva Preparation Guide

## 1. Architecture (client–server + MVC)

```text
 Browser (HTML + CSS + JS)                 Server (Node.js + Express)                  Database
 ┌──────────────────────┐   HTTP request   ┌──────────────────────────────────────┐   ┌────────────┐
 │ public/*.html        │ ───────────────► │ routes  →  middleware  →  controller │──►│ PostgreSQL │
 │ public/js/*.js       │ ◄─────────────── │ (URL)    (auth, role)    (logic)     │◄──│ via Prisma │
 └──────────────────────┘   JSON response  └──────────────────────────────────────┘   └────────────┘
```

* **Client–server:** the browser (client) asks, the Express server answers with JSON. The server also serves the HTML/CSS/JS files.
* **MVC-style structure**
  * **Model** = Prisma models in `prisma/schema.prisma` (the data and its relations).
  * **View** = the HTML pages in `public/` (what the user sees).
  * **Controller** = functions in `src/controllers/` (the logic for each request).
  * **Routes** (`src/routes/`) only connect a URL + HTTP method to a controller function.
* **Request journey** (example: staff calls the next ticket):
  `POST /api/queue/location/1/call-next` → `app.js` (logger, `express.json`) → `queueRoutes.js` → `requireAuth` (is the JWT valid?) → `requireRole("STAFF","ADMIN")` → `callNextTicket` controller → Prisma updates PostgreSQL → JSON response → `staff.js` updates the page.
* **Why polling?** Pages call the API again every 5 seconds (`setInterval`). It is the simplest way to show fresh data; we did not use WebSockets because they are outside our syllabus.

## 2. Database design

Three tables only.

```text
User 1 ────────< QueueTicket >──────── 1 Location
```

| Model         | Important fields |
| ------------- | ---------------- |
| `User`        | id, name, email (unique), passwordHash, role (`STUDENT`/`STAFF`/`ADMIN`) |
| `Location`    | id, name (unique), description, avgServiceMinutes |
| `QueueTicket` | id, ticketNumber, status (`WAITING`/`CALLED`/`COMPLETED`/`CANCELLED`), createdAt, calledAt, completedAt, **userId** (FK), **locationId** (FK) |

* **One-to-many:** one user has many tickets; one location has many tickets.
* Every ticket belongs to **exactly one** user and **exactly one** location (the two foreign keys).
* `@@unique([locationId, ticketNumber])` → the same ticket number cannot be used twice in one location.
* `onDelete: Cascade` → deleting a user or location also deletes their tickets.
* Ticket life cycle: `WAITING → CALLED → COMPLETED`, or `WAITING → CANCELLED`.

**Position and waiting time**

* `position = (WAITING tickets of this location with a smaller ticketNumber) + 1`
* `estimated wait = position × avgServiceMinutes` (an approximation, not an exact promise)

## 3. API route table

Base URL: `http://localhost:3000/api`. "Auth" = needs `Authorization: Bearer <token>`.

| Method | URL | Who | Purpose | Success | Common errors |
| ------ | --- | --- | ------- | ------- | ------------- |
| POST | `/auth/register` | public | Create a STUDENT account | 201 | 400 bad input, 409 email exists |
| POST | `/auth/login` | public | Log in, get JWT | 200 | 400, 401 wrong email/password |
| GET | `/auth/me` | any logged-in | Current user | 200 | 401 |
| GET | `/locations` | any logged-in | List locations with waiting count & estimate | 200 | 401 |
| POST | `/locations` | ADMIN | Create location | 201 | 400, 403, 409 duplicate name |
| DELETE | `/locations/:id` | ADMIN | Delete location (and its tickets) | 200 | 403, 404 |
| POST | `/queue/join` | STUDENT | Join a queue `{ locationId }` | 201 | 400, 404, 409 already has active ticket |
| GET | `/queue/my-ticket` | STUDENT | My active ticket + position + wait (or `null`) | 200 | 401, 403 |
| POST | `/queue/cancel` | STUDENT | Cancel my WAITING ticket | 200 | 404 |
| GET | `/queue/history?page=&limit=&status=` | STUDENT | My old tickets (paginated, sorted, filtered) | 200 | 401, 403 |
| GET | `/queue/location/:locationId?status=` | STAFF, ADMIN | Queue of one location | 200 | 404 |
| POST | `/queue/location/:locationId/call-next` | STAFF, ADMIN | Call smallest WAITING ticket | 200 | 404 nobody waiting, 409 someone still being served |
| POST | `/queue/tickets/:ticketId/complete` | STAFF, ADMIN | Complete a CALLED ticket | 200 | 404, 409 not CALLED |
| GET | `/admin/stats` | ADMIN | User and ticket statistics | 200 | 403 |
| GET | `/admin/users?page=&limit=&role=` | ADMIN | Users (paginated, filtered) | 200 | 403 |
| PATCH | `/admin/users/:id/role` | ADMIN | Change a user's role `{ role }` | 200 | 400, 404 |

**Status codes used:** 200 OK · 201 Created · 400 Bad Request · 401 Unauthorized (not logged in) · 403 Forbidden (wrong role) · 404 Not Found · 409 Conflict · 500 Internal Server Error.

## 4. Authentication and authorization flow

1. **Register:** the server hashes the password with `bcrypt.hash(password, 10)` and saves only the hash. The role is always `STUDENT`.
2. **Login:** the server finds the user by email and runs `bcrypt.compare(typedPassword, storedHash)`. If correct, it creates a **JWT** with `jwt.sign({ id, name, role }, JWT_SECRET, { expiresIn })` and sends it back.
3. **Browser:** `api.js` saves the token in `localStorage` and sends it on every request as `Authorization: Bearer <token>`.
4. **`requireAuth` middleware:** reads the header, runs `jwt.verify(token, JWT_SECRET)`. If valid, puts `{ id, name, role }` in `req.user`; otherwise answers **401**.
5. **`requireRole("ADMIN")` middleware:** checks `req.user.role`; if not allowed, answers **403**. This is **role-based access control (RBAC)**.
6. The frontend also hides pages from the wrong role, but that is only for convenience — **the server is what really protects the data**.

## 5. What each file does

| File | Explanation |
| ---- | ----------- |
| `src/server.js` | Loads `.env`, checks `JWT_SECRET`, and calls `app.listen`. |
| `src/app.js` | Creates the Express app, adds middleware (logger, JSON parser, static files), mounts the routes, and adds the 404 and error handlers last. |
| `src/config/prisma.js` | Creates one shared `PrismaClient` used by all controllers. |
| `src/middleware/auth.js` | `requireAuth`: verifies the JWT and sets `req.user`. |
| `src/middleware/role.js` | `requireRole(...roles)`: allows only the listed roles. |
| `src/middleware/errorHandler.js` | `notFound` (404 JSON) and `errorHandler` (turns errors into JSON with a proper status code). |
| `src/controllers/authController.js` | register, login, getMe. |
| `src/controllers/locationController.js` | list, create, delete locations. |
| `src/controllers/queueController.js` | join, cancel, my ticket, history, staff queue view, call next, complete. |
| `src/controllers/adminController.js` | statistics, user list, change role. |
| `src/routes/*.js` | Map URL + method → middleware → controller. |
| `prisma/schema.prisma` | Defines the models, enums and relations. |
| `prisma/seed.js` | Deletes old data and inserts demo users, locations and tickets. |
| `public/js/api.js` | Shared helpers: `apiRequest` (fetch + JWT), navbar, login storage, `escapeHtml`. |
| `public/js/student.js` | Student dashboard: ticket card, join/cancel, history with pagination. |
| `public/js/staff.js` | Staff desk: choose location, call next, complete. |
| `public/js/admin.js` | Admin dashboard: statistics, add/delete locations, users table. |
| `public/js/login.js`, `register.js`, `home.js` | Form validation and login/registration for those pages. |
| `public/css/style.css` | All styling; responsive using CSS Grid and a media query. |

## 6. Likely viva questions and answers

**Node.js and async**

1. **What is Node.js?** A runtime that lets us run JavaScript outside the browser, built on Chrome's V8 engine.
2. **What is the event loop?** The mechanism that lets Node handle many requests on one thread: slow tasks (database, files) run in the background and their callbacks/promises are handled when they finish.
3. **Why `async/await`?** It lets us write asynchronous code (database calls) so it reads like normal step-by-step code. `await` pauses only that function, not the whole server. Errors are caught with `try/catch`.
4. **What is a module? How do we use them?** A file that exports something. We use CommonJS: `module.exports = ...` and `require(...)`.

**HTTP, REST, Express**

5. **What is client–server architecture?** The client (browser) sends requests; the server processes them and sends responses. QueueBee's client is the HTML/JS pages; the server is Express.
6. **GET vs POST vs PATCH vs DELETE?** GET reads data, POST creates/does an action, PATCH changes part of a record, DELETE removes it.
7. **What is REST?** A style of designing APIs: URLs name resources (`/locations`), HTTP methods say the action, and responses are JSON with proper status codes.
8. **Which status codes do you use and why?** 201 after creating, 400 bad input, 401 not logged in, 403 wrong role, 404 not found, 409 conflict (e.g. already has a ticket), 500 server error.
9. **What is middleware?** A function `(req, res, next)` that runs before the final handler. Examples here: our logger, `express.json()`, `requireAuth`, `requireRole`. Calling `next()` passes control onward.
10. **How is error handling done?** Controllers use `try/catch` and call `next(error)`. One central `errorHandler` (4 parameters) sends a JSON error with the right status. Expected problems (like "email already registered") get a direct 4xx response.
11. **Difference between `req.params`, `req.query` and `req.body`?** `params` = parts of the URL path (`/tickets/5/complete`), `query` = after `?` (`?page=2`), `body` = JSON sent with POST/PATCH.
12. **Why separate `app.js` and `server.js`?** `app.js` builds the app; `server.js` only starts listening. It keeps things clean and makes testing easier.

**MVC, database, Prisma**

13. **How does your project follow MVC?** Models = Prisma schema, Views = HTML in `public/`, Controllers = `src/controllers`. Routes just connect URLs to controllers.
14. **What is an ORM and why Prisma?** An ORM lets us use JavaScript objects/methods instead of raw SQL. Prisma gives readable queries like `prisma.user.findMany(...)` and a schema file that defines the tables.
15. **What are migrations?** Versioned changes to the database structure. `prisma migrate dev` compares `schema.prisma` with the database, creates a SQL file in `prisma/migrations`, and applies it.
16. **What is seeding?** Inserting starting data (demo users, locations, tickets) with `prisma/seed.js` so the app can be demonstrated immediately.
17. **Explain the relationships.** One user → many tickets, one location → many tickets. A ticket stores `userId` and `locationId` as foreign keys, so each ticket belongs to one user and one location.
18. **How do you do filtering, sorting and pagination?** Filtering: `where` (e.g. `where: { status: "WAITING" }`). Sorting: `orderBy` (e.g. newest first). Pagination: `skip: (page-1)*limit` and `take: limit`; we also send `total` and `totalPages`.
19. **How is the queue position calculated?** Count the WAITING tickets in the same location with a smaller ticket number, then add 1.
20. **How is the waiting time estimated?** `position × avgServiceMinutes` of that location. It is an estimate. A real system could use the average of actual service times.
21. **How does "call next" pick the ticket?** It takes the WAITING ticket with the smallest `ticketNumber` (`orderBy: { ticketNumber: "asc" }`), i.e. first come, first served.

**Authentication and authorization**

22. **Why hash passwords? What is bcrypt?** If the database leaks, plain passwords would be exposed. bcrypt makes a one-way, salted hash; we can only compare, never decrypt.
23. **What is a JWT and what is inside it?** A signed token with three parts: header, payload (our `id`, `name`, `role`, expiry) and signature. The server can verify that nobody changed it. It is signed, not encrypted, so never put passwords in it.
24. **Where do you store the token and what are the alternatives?** In `localStorage`, sent in the `Authorization` header. An alternative is an httpOnly cookie, which JavaScript cannot read (safer against XSS) but needs extra CSRF care. Sessions store login state on the server instead of in a token.
25. **Authentication vs authorization?** Authentication = who are you (login, `requireAuth`). Authorization = what are you allowed to do (`requireRole`).
26. **How do you stop someone registering as ADMIN?** The register controller always sets `role: "STUDENT"` and ignores any role in the request. Only an admin can change roles (`PATCH /admin/users/:id/role`).
27. **Why the same error message for wrong email and wrong password?** So an attacker cannot find out which emails are registered.

**Design decisions (be honest in the viva)**

28. **What if two students join at exactly the same moment?** Ticket numbers are `last number + 1`. The database rule `@@unique([locationId, ticketNumber])` makes sure a duplicate number can never be saved; the second request would fail and the student can simply tap Join again. A production system would use transactions or locking, which we kept out of scope.
29. **Why no Redis / WebSockets / rate limiting?** To keep the project within what we studied and easy to explain. They are good future improvements.
30. **How could the project be improved?** Assign staff to a specific location, reset ticket numbers every day, show real average service time, add real-time updates, add input-validation library and automated tests.
