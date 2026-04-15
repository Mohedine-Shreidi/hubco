# HubConnect — Backend API

> Express.js REST API with JWT authentication, Socket.io real-time messaging, PostgreSQL with Row-Level Security, and full cohort-based RBAC isolation.

---

## Tech Stack

| Layer | Technology |
| --- | --- |
| Runtime | Node.js 18+ (ESM modules) |
| Framework | Express 5 |
| Database | PostgreSQL 15+ via `postgres.js` |
| Real-time | Socket.io 4 |
| Auth | JWT (`jsonwebtoken`) + `bcryptjs` |
| Validation | `express-validator` |
| Security | `helmet`, `cors`, `express-rate-limit` |
| Testing | Vitest + Supertest |

---

## Project Structure

```
Backend/
├── supabase_schema.sql             # Authoritative schema — run this on a fresh DB
├── init.sql                        # Local-only alternative schema
├── package.json
├── vitest.config.js
├── migrations/
│   ├── 000_rls_helper_functions.sql  # ← Run FIRST — defines RLS helpers
│   ├── rbac_cohort_isolation.sql     # Cohort scoping, course templates, multi-assignment
│   ├── add_dm_rooms.sql              # DM chat support
│   ├── security_audit_fixes.sql      # Grade-tamper RLS, team_leader enum removal
│   ├── add_attendance_table.sql
│   ├── enhance_platform.sql
│   └── ensure_unique_email.sql
├── scripts/                         # Utility scripts (backfill, schema checks)
└── src/
    ├── index.js                     # Express + Socket.io server entry
    ├── config/
    │   └── index.js                 # Centralised env config
    ├── db/
    │   ├── index.js                 # postgres.js connection pool
    │   ├── migrate.js               # Migration runner
    │   └── seed.js                  # Demo data seeder
    ├── middleware/
    │   ├── authenticate.js          # JWT verification → req.user
    │   ├── rbac.js                  # authorize(), checkCohortAccess(), cohortFilter()
    │   ├── validate.js              # express-validator result checker
    │   └── errorHandler.js          # Global error handler
    └── routes/
        ├── index.js                 # Route aggregator
        ├── auth.routes.js           # /register /login /logout /me
        ├── profiles.routes.js       # User profiles (cohort-scoped GET /:id)
        ├── organizations.routes.js
        ├── roles.routes.js
        ├── cohorts.routes.js
        ├── courses.routes.js        # Global templates + cohort assignment
        ├── teams.routes.js          # Teams CRUD + member management
        ├── tasks.routes.js          # Multi-assignment tasks (student/team/cohort)
        ├── submissions.routes.js    # Submit, review, grade (/assess)
        ├── chat.routes.js           # Rooms + messages (General/Team/Cohort/DM)
        ├── notifications.routes.js
        ├── analytics.routes.js
        ├── attendance.routes.js
        ├── reports.routes.js
        ├── files.routes.js
        └── activityLogs.routes.js
```

---

## Getting Started

### Prerequisites

- **Node.js** ≥ 18
- **PostgreSQL** 15+ (local or Supabase)

### 1 — Install dependencies

```bash
cd Backend
npm install
```

### 2 — Configure environment

Create a `.env` from `.env.example`:

```env
PORT=5000
NODE_ENV=development

DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/hubconnect

JWT_SECRET=change-this-to-a-long-random-string-min-32-chars
JWT_EXPIRES_IN=7d

BCRYPT_ROUNDS=10

CORS_ORIGIN=http://localhost:5173
```

### 3 — Initialise the database

```bash
# Option A — local PostgreSQL
psql -U postgres -c "CREATE DATABASE hubconnect;"
psql -U postgres -d hubconnect -f supabase_schema.sql

# Option B — run incremental migrations
npm run migrate
```

#### Migration run order

```
1. migrations/000_rls_helper_functions.sql   ← always first
2. migrations/rbac_cohort_isolation.sql
3. migrations/add_dm_rooms.sql
4. migrations/security_audit_fixes.sql
5. migrations/add_attendance_table.sql
6. migrations/enhance_platform.sql
```

### 4 — (Optional) Seed demo data

```bash
npm run seed
```

### 5 — Start the server

```bash
npm run dev    # development — auto-restart on changes
npm start      # production
```

API available at **http://localhost:5000**.

---

## Production Deployment

This API should run on a Node host that supports a long-lived process and Socket.io, such as Render, Railway, Fly.io, or a VPS. Do not hardcode `DATABASE_URL` in the backend source.

Minimum production environment variables:

```env
PORT=5000
NODE_ENV=production
DATABASE_URL=postgresql://user:password@your-host:5432/postgres?sslmode=require
JWT_SECRET=generate-a-long-random-secret
JWT_EXPIRES_IN=7d
BCRYPT_ROUNDS=10
CORS_ORIGIN=https://your-frontend.vercel.app
```

Deployment flow:

1. Provision a PostgreSQL database and confirm the connection string works with `psql`.
2. Run `supabase_schema.sql` and the migrations against the production database.
3. Deploy the backend using `Backend/Dockerfile` or `npm start` on your host.
4. Set `VITE_API_URL` in the Vercel frontend to `https://your-backend-domain.com/api`.

The API exposes `/health` for simple uptime checks.

---

## RBAC & Cohort Isolation

Every resource is protected at two layers:

1. **API layer** — `authorize(...roles)`, `checkCohortAccess()`, and `cohortFilter()` helpers in `middleware/rbac.js`
2. **Database layer** — Supabase Row-Level Security policies using `SECURITY DEFINER` helper functions

| Helper | Description |
| --- | --- |
| `authorize(...roles)` | Blocks requests from users without the required role |
| `checkCohortAccess(fn)` | Resolves the resource's `cohort_id` and blocks users not in that cohort |
| `cohortFilter(user)` | Returns `{ isAdmin, cohortIds }` for WHERE clauses — admins get all |

| Role | Scope |
| --- | --- |
| `admin` | Unrestricted access to all resources |
| `instructor` | Scoped to cohorts they are assigned to |
| `student` | Own tasks, own submissions, own profile, team rooms |

---

## API Reference

All routes are prefixed `/api`. Protected routes require `Authorization: Bearer <token>`.

### Auth

| Method | Endpoint | Auth | Description |
| --- | --- | --- | --- |
| POST | `/auth/register` | — | Register new user |
| POST | `/auth/login` | — | Login → JWT |
| POST | `/auth/logout` | ✓ | Logout |
| GET | `/auth/me` | ✓ | Current user + cohorts |

### Cohorts

| Method | Endpoint | Roles | Description |
| --- | --- | --- | --- |
| GET | `/cohorts` | All | List cohorts |
| POST | `/cohorts` | Admin | Create cohort |
| PUT | `/cohorts/:id` | Admin | Update cohort |
| DELETE | `/cohorts/:id` | Admin | Delete cohort |
| POST | `/cohorts/:id/instructor` | Admin | Assign instructor |

### Courses (Global Templates)

| Method | Endpoint | Roles | Description |
| --- | --- | --- | --- |
| GET | `/courses` | All | List courses (filterable by `?cohortId=`) |
| POST | `/courses` | Admin, Instructor | Create global template |
| POST | `/courses/:id/assign-cohort` | Admin | Link course to a cohort |
| DELETE | `/courses/:id/assign-cohort/:cId` | Admin | Unlink from cohort |

### Teams

| Method | Endpoint | Roles | Description |
| --- | --- | --- | --- |
| GET | `/teams` | All | List teams (`?cohortId=&courseId=`) |
| POST | `/teams` | Admin, Instructor | Create team (same-cohort validation) |
| POST | `/teams/:id/members` | Admin, Instructor | Add member (cohort-validated) |
| DELETE | `/teams/:id/members/:uid` | Admin, Instructor | Remove member |

### Tasks

| Method | Endpoint | Roles | Description |
| --- | --- | --- | --- |
| GET | `/tasks` | All | Cohort-scoped task list |
| GET | `/tasks/my` | All | Tasks assigned to me / my team |
| POST | `/tasks` | Admin, Instructor | Create task with multi-assignment |
| POST | `/tasks/:id/submit` | Student | Submit task |
| PUT | `/tasks/:id` | Admin, Instructor | Update task + reassign |
| DELETE | `/tasks/:id` | Admin, Instructor | Soft delete |

**Task assignment types** (`assignmentType` field):
- `individual` — specific students via `assignedStudents[]`
- `team` — specific teams via `assignedTeams[]`
- `mixed` — both students and teams
- `cohort` — every student in the cohort auto-assigned

> Cross-cohort assignment is rejected at the API layer — students or teams outside the task's cohort are blocked with a 400 error.

### Submissions

| Method | Endpoint | Roles | Description |
| --- | --- | --- | --- |
| GET | `/submissions` | All | Cohort-scoped list (student sees own only) |
| POST | `/submissions` | Student | Submit task (validates assignment + deadline) |
| GET | `/submissions/task/:taskId` | Admin, Instructor | All submissions for a task |
| PUT | `/submissions/:id/review` | Admin, Instructor | Accept / Reject / Request revision |
| PATCH | `/submissions/:id/assess` | Admin, Instructor | Record grade (0–100) + written feedback |

### Chat

| Method | Endpoint | Roles | Description |
| --- | --- | --- | --- |
| GET | `/chat/rooms` | All | List accessible rooms |
| POST | `/chat/rooms` | Admin, Instructor | Create room |
| POST | `/chat/rooms/team/:teamId` | Member / Instructor | Get-or-create team room |
| GET | `/chat/rooms/:id/messages` | Member | Paginated message history |
| POST | `/chat/rooms/:id/messages` | Member | Send message |
| GET | `/chat/users` | All | All users for DM search |
| POST | `/chat/dm/:userId` | All | Open DM with another user |

---

## Response Contract

Every endpoint uses the same shape:

```json
// Success
{ "success": true,  "message": "Resource retrieved.", "data": {} }

// Error
{ "success": false, "message": "Access denied.", "error": {} }

// Paginated
{ "success": true, "message": "...", "data": [], "meta": { "total": 0, "page": 1, "limit": 20, "pages": 0 } }
```

HTTP status codes: `200` success, `201` created, `400` bad request, `401` unauthenticated, `403` forbidden, `404` not found, `409` conflict.

---

## Real-Time (Socket.io)

Clients authenticate via `socket.handshake.auth.token` (JWT).

| Client → Server | Payload | Description |
| --- | --- | --- |
| `join_room` | `{ roomId }` | Join a chat room |
| `leave_room` | `{ roomId }` | Leave a chat room |
| `send_message` | `{ roomId, content }` | Send a message |
| `typing` | `{ roomId }` | Start typing broadcast |
| `stop_typing` | `{ roomId }` | Stop typing broadcast |

| Server → Client | Payload | Description |
| --- | --- | --- |
| `receive_message` | Message object | New inbound message |
| `user_typing` | `{ userId, name }` | A user is typing |
| `user_stop_typing` | `{ userId }` | A user stopped typing |

---

## Database Schema

The authoritative schema is `supabase_schema.sql`. Key tables:

| Table | Purpose |
| --- | --- |
| `profiles` | Users with `role` (`admin`/`instructor`/`student`) |
| `cohorts` / `user_cohorts` | Cohort definitions + membership |
| `courses` | Global course templates (no required `cohort_id`) |
| `cohort_courses` | M:N junction — course ↔ cohort assignment |
| `teams` | Scoped by `course_id` + `cohort_id`; `team_leader_id` |
| `team_members` | Team membership (VARCHAR role, not ENUM) |
| `tasks` | `cohort_id`, `assignment_type`, `course_id` |
| `task_assignments` | Individual student assignments |
| `task_team_assignments` | Team-level assignments |
| `submissions` | Includes `grade`, `feedback`, `assessed_by`, `assessed_at` |
| `chat_rooms` | Types: `general`, `cohort`, `course`, `team`, `dm` |
| `messages` | Per-room messages |
| `notifications` | Per-user in-app notifications |
| `attendance` | Daily check-in / check-out |
| `activity_logs` | Immutable audit trail |

---

## Security

| Layer | Mechanism |
| --- | --- |
| HTTP headers | `helmet` |
| CORS | Restricted to `CORS_ORIGIN` |
| Rate limiting | 500 req / 15 min global; 20 req / 15 min on `/auth` |
| Authentication | JWT — verified on every protected route |
| Role gate | `authorize(...roles)` middleware |
| Cohort gate | `checkCohortAccess()` middleware |
| Password storage | `bcrypt` (configurable rounds) |
| Input validation | `express-validator` on all mutation endpoints |
| RLS | Supabase Row-Level Security — every table has policies |
| Grade protection | Students cannot set `grade`, `assessed_by`, or `assessed_at` via RLS |
| Enum hygiene | `team_leader` removed from `user_role_type` ENUM |

---

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start with `--watch` (auto-restart) |
| `npm start` | Production start |
| `npm run migrate` | Run pending SQL migrations |
| `npm run seed` | Seed demo data |
| `npm run init-db` | Apply `init.sql` against `$DATABASE_URL` |
| `npm test` | Run Vitest security test suite |


---

## Tech Stack

| Layer          | Technology                          |
| -------------- | ----------------------------------- |
| Runtime        | Node.js (ESM)                       |
| Framework      | Express 5                           |
| Database       | PostgreSQL via `postgres` (postgres.js) |
| Real-time      | Socket.io 4                         |
| Auth           | JWT (jsonwebtoken) + bcryptjs       |
| Validation     | express-validator                   |
| Security       | Helmet, CORS, express-rate-limit    |
| File Uploads   | Multer                              |

---

## Project Structure

```
Backend/
├── .env                    # Environment variables (not committed)
├── init.sql                # Full database schema (PostgreSQL)
├── package.json
├── migrations/             # Incremental SQL migrations
│   └── add_attendance_table.sql
└── src/
    ├── index.js            # App entry — Express + Socket.io setup
    ├── config/
    │   └── index.js        # Centralised env config
    ├── db/
    │   ├── index.js        # postgres.js connection
    │   ├── migrate.js      # Migration runner
    │   └── seed.js         # Database seeder
    ├── middleware/
    │   ├── authenticate.js # JWT verification middleware
    │   ├── errorHandler.js # Global error handler
    │   ├── rbac.js         # Role-based access control (authorize)
    │   └── validate.js     # express-validator result checker
    └── routes/
        ├── index.js        # Route aggregator (/api/...)
        ├── auth.routes.js          # POST /register, /login, /logout, /me
        ├── organizations.routes.js # CRUD organizations
        ├── profiles.routes.js      # User profiles
        ├── roles.routes.js         # Org-level roles
        ├── cohorts.routes.js       # Cohorts CRUD + instructor assignment
        ├── courses.routes.js       # Courses CRUD
        ├── teams.routes.js         # Teams CRUD + membership
        ├── tasks.routes.js         # Tasks CRUD + assignment
        ├── submissions.routes.js   # Task submissions & reviews
        ├── chat.routes.js          # Chat rooms & messages
        ├── notifications.routes.js # In-app notifications
        ├── analytics.routes.js     # Dashboard analytics
        ├── attendance.routes.js    # Check-in / check-out
        ├── reports.routes.js       # Daily & student reports
        ├── files.routes.js         # File upload metadata
        └── activityLogs.routes.js  # Audit trail
```

---

## Getting Started

### Prerequisites

- **Node.js** ≥ 18
- **PostgreSQL** 15+ (local or Supabase)

### 1. Install dependencies

```bash
cd Backend
npm install
```

### 2. Configure environment

Copy `.env.example` or create a `.env` file:

```env
PORT=5000
NODE_ENV=development

DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/hubconnect

JWT_SECRET=change-this-to-a-long-random-string
JWT_EXPIRES_IN=7d

BCRYPT_ROUNDS=10

CORS_ORIGIN=http://localhost:5173
```

### 3. Initialise the database

```bash
# Create the database first (if local)
psql -U postgres -c "CREATE DATABASE hubconnect;"

# Run the full schema
psql -U postgres -d hubconnect -f init.sql

# Or run incremental migrations
npm run migrate
```

### 4. (Optional) Seed demo data

```bash
npm run seed
```

### 5. Start the server

```bash
# Development (auto-restart on file changes)
npm run dev

# Production
npm start
```

The API will be available at **http://localhost:5000**.

---

## API Endpoints

All routes are prefixed with `/api`.

| Method   | Endpoint                              | Auth | Roles               | Description                  |
| -------- | ------------------------------------- | ---- | -------------------- | ---------------------------- |
| `POST`   | `/auth/register`                      | —    | —                    | Register a new user          |
| `POST`   | `/auth/login`                         | —    | —                    | Login & receive JWT          |
| `POST`   | `/auth/logout`                        | ✓    | Any                  | Logout                       |
| `GET`    | `/auth/me`                            | ✓    | Any                  | Current user profile         |
| `GET`    | `/organizations`                      | ✓    | Any                  | List organizations           |
| `GET`    | `/profiles`                           | ✓    | Any                  | List profiles                |
| `GET`    | `/cohorts`                            | ✓    | Any                  | List cohorts                 |
| `POST`   | `/cohorts`                            | ✓    | Admin                | Create cohort                |
| `PUT`    | `/cohorts/:id`                        | ✓    | Admin                | Update cohort                |
| `DELETE` | `/cohorts/:id`                        | ✓    | Admin                | Delete cohort                |
| `POST`   | `/cohorts/:id/instructor`             | ✓    | Admin                | Assign instructor to cohort  |
| `GET`    | `/courses`                            | ✓    | Any                  | List courses                 |
| `POST`   | `/courses`                            | ✓    | Admin, Instructor    | Create course                |
| `GET`    | `/teams`                              | ✓    | Any                  | List teams                   |
| `POST`   | `/teams`                              | ✓    | Admin, Instructor    | Create team                  |
| `GET`    | `/tasks`                              | ✓    | Any                  | List tasks                   |
| `POST`   | `/tasks`                              | ✓    | Admin, Instructor, TL| Create task                  |
| `GET`    | `/submissions`                        | ✓    | Any                  | List submissions             |
| `POST`   | `/submissions`                        | ✓    | Any                  | Submit work                  |
| `GET`    | `/chat/rooms`                         | ✓    | Any                  | List chat rooms              |
| `POST`   | `/chat/rooms`                         | ✓    | Admin, Instructor    | Create chat room             |
| `GET`    | `/chat/rooms/:id/messages`            | ✓    | Any                  | Get room messages            |
| `POST`   | `/chat/rooms/:id/messages`            | ✓    | Any                  | Send message                 |
| `GET`    | `/notifications`                      | ✓    | Any                  | List notifications           |
| `GET`    | `/analytics`                          | ✓    | Admin, Instructor    | Dashboard analytics          |
| `POST`   | `/attendance/check-in`                | ✓    | Student, TL          | Check in                     |
| `POST`   | `/attendance/check-out`               | ✓    | Student, TL          | Check out                    |
| `GET`    | `/reports/daily`                      | ✓    | Admin, Instructor    | Daily reports                |

---

## Real-time (Socket.io)

Clients authenticate via `socket.handshake.auth.token` (JWT).

| Event (Client → Server) | Payload                | Description          |
| ------------------------ | ---------------------- | -------------------- |
| `join_room`              | `{ roomId }`           | Join a chat room     |
| `leave_room`             | `{ roomId }`           | Leave a chat room    |
| `send_message`           | `{ roomId, ... }`      | Send a message       |
| `typing`                 | `{ roomId }`           | Broadcast typing     |
| `stop_typing`            | `{ roomId }`           | Stop typing          |

| Event (Server → Client)  | Payload               | Description          |
| ------------------------- | --------------------- | -------------------- |
| `receive_message`         | Message object         | New message in room  |
| `user_typing`             | `{ userId, name }`    | User is typing       |
| `user_stop_typing`        | `{ userId }`          | User stopped typing  |

---

## Database Schema

The full schema is in `init.sql`. Key tables:

- **auth.users** — minimal auth identity (UUID PK)
- **profiles** — full user info, password hash, role
- **organizations** / **organization_users** — multi-tenant orgs
- **cohorts** / **user_cohorts** — academic cohorts
- **courses** — courses within cohorts
- **teams** / **team_members** — teams within courses
- **tasks** / **task_assignments** — task management
- **submissions** — task submissions & review workflow
- **chat_rooms** / **messages** — real-time messaging
- **notifications** — in-app notification system
- **attendance** — daily check-in/out
- **activity_logs** — audit trail
- **files** — file upload metadata

---

## Security

- **Helmet** — HTTP security headers
- **CORS** — restricted to `CORS_ORIGIN`
- **Rate limiting** — 500 req/15 min global, 20 req/15 min for auth
- **JWT** — token-based authentication on all protected routes
- **RBAC** — role-based authorization (`admin`, `instructor`, `team_leader`, `student`)
- **bcrypt** — password hashing (configurable rounds)
- **Input validation** — express-validator on all mutation endpoints

---

## Scripts

| Command            | Description                              |
| ------------------ | ---------------------------------------- |
| `npm run dev`      | Start with `--watch` (auto-restart)      |
| `npm start`        | Production start                         |
| `npm run migrate`  | Run pending SQL migrations               |
| `npm run seed`     | Seed the database with demo data         |
| `npm run init-db`  | Run `init.sql` against `$DATABASE_URL`   |
