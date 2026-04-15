# HubConnect

> A full-stack team management platform built for coding bootcamps and tech hubs.
> Instructors organise cohorts, courses, teams, and tasks; students submit work, chat in real time, and track attendance — all from one secured, role-isolated dashboard.

---

## Tech Stack

| Layer     | Technology                                              |
| --------- | ------------------------------------------------------- |
| Frontend  | React 18, Vite 5, Tailwind CSS 3, Recharts              |
| Backend   | Node.js 18+ (ESM), Express 5, Socket.io 4               |
| Database  | PostgreSQL 15+ — local or Supabase                      |
| Auth      | Custom JWT — `jsonwebtoken` + `bcryptjs`                |
| Security  | Helmet, CORS, rate-limit, RLS, RBAC, input validation   |

---

## Features

| Feature | Description |
| --- | --- |
| Role-Based Access | `admin` / `instructor` / `student` with full RBAC |
| Cohort Isolation | Every resource is scoped to a cohort — cross-cohort leaks are blocked at both API and RLS level |
| Global Courses | Courses are reusable templates assigned to cohorts via `cohort_courses` |
| Multi-Assignment Tasks | Assign tasks to individual students, teams, or an entire cohort at once |
| Assessment Workflow | Submit → Review → Grade with `grade`, `feedback`, `assessed_by`, `assessed_at` |
| Team Leader (field, not role) | Leader is `teams.team_leader_id` — not a global role |
| Real-Time Chat | General, Cohort, Course, Team, and DM rooms via Socket.io |
| Attendance | Daily check-in / check-out with instructor reports |
| Analytics | Submission stats, timelines, team rankings |
| Notifications | In-app bell with live updates |
| Dark Mode | System-aware + manual toggle |
| Responsive UI | Mobile-friendly layouts and sidebar |

---

## Roles & Permissions

| Role | Access |
| --- | --- |
| `admin` | Full access — organisations, cohorts, instructors, all data |
| `instructor` | Manage courses, tasks, teams **within their assigned cohorts only** |
| `student` | View & submit assigned tasks, chat, check attendance |

> **Team Leader** is not a role. It is stored as `teams.team_leader_id`. Leader privileges are enforced only inside team logic.

---

## Prerequisites

- **Node.js** ≥ 18
- **PostgreSQL** 15+ (local or Supabase project)
- **npm** 9+

---

## Quick Start

### 1 — Clone

```bash
git clone git@github.com:Hisham-AlAhmad/HubConnect.git
cd HubConnect
```

### 2 — Database

**Option A — Local PostgreSQL**
```bash
psql -U postgres -c "CREATE DATABASE hubconnect;"
psql -U postgres -d hubconnect -f Backend/supabase_schema.sql
```

**Option B — Supabase**
Point `DATABASE_URL` at your Supabase project and run `Backend/supabase_schema.sql` in the SQL editor.

#### Migration order (run after schema)
```
1. Backend/migrations/000_rls_helper_functions.sql   ← must be first
2. Backend/migrations/rbac_cohort_isolation.sql
3. Backend/migrations/add_dm_rooms.sql
4. Backend/migrations/security_audit_fixes.sql
5. Backend/migrations/add_attendance_table.sql
6. Backend/migrations/enhance_platform.sql
```

### 3 — Backend

```bash
cd Backend
npm install
# copy and fill in .env (see Backend/README.md)
npm run dev          # → http://localhost:5000
```

### 4 — Frontend

```bash
cd Frontend
npm install
npm run dev          # → http://localhost:5173
```

Vite proxies every `/api` request to the backend automatically in development.

---

## Environment — Backend `.env`

```env
PORT=5000
NODE_ENV=development

DATABASE_URL=postgresql://postgres:password@localhost:5432/hubconnect

JWT_SECRET=change-this-to-a-long-random-string-min-32-chars
JWT_EXPIRES_IN=7d

BCRYPT_ROUNDS=10

CORS_ORIGIN=http://localhost:5173
```

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `DATABASE_URL` | **Yes** | — | PostgreSQL connection string |
| `JWT_SECRET` | **Yes** | — | Min 32-char random secret |
| `PORT` | No | `5000` | Server port |
| `NODE_ENV` | No | `development` | Environment flag |
| `JWT_EXPIRES_IN` | No | `7d` | Token lifetime |
| `BCRYPT_ROUNDS` | No | `10` | bcrypt cost factor |
| `CORS_ORIGIN` | No | `http://localhost:5173` | Allowed frontend origin |

---

## API Overview

All endpoints are prefixed with `/api`. Protected routes require `Authorization: Bearer <token>`.

| Prefix | Description |
| --- | --- |
| `/auth` | Register, login, logout, `/me` |
| `/cohorts` | Cohort CRUD + instructor assignment |
| `/courses` | Course templates + cohort assignment |
| `/teams` | Team CRUD, members, leader assignment |
| `/tasks` | Task CRUD, multi-assignment, submission |
| `/submissions` | Submit, review, assess (grade + feedback) |
| `/chat` | Rooms (General/Cohort/Course/Team/DM) + messages |
| `/attendance` | Check-in / check-out |
| `/notifications` | In-app notifications |
| `/analytics` | Stats, charts, team rankings |
| `/reports` | Daily, range, student summaries |
| `/profiles` | User profile CRUD (cohort-scoped) |
| `/organizations` | Organisation CRUD |
| `/roles` | Role assignment |
| `/files` | File upload metadata |
| `/activity-logs` | Read-only audit trail |

All responses follow a consistent contract:
```json
{ "success": true,  "message": "...", "data": {} }
{ "success": false, "message": "...", "error": {} }
```

---

## Real-Time (Socket.io)

Socket clients authenticate via `socket.handshake.auth.token` (JWT).

| Client → Server | Payload | Description |
| --- | --- | --- |
| `join_room` | `{ roomId }` | Join a chat room |
| `leave_room` | `{ roomId }` | Leave a chat room |
| `send_message` | `{ roomId, content }` | Send a message |
| `typing` | `{ roomId }` | Broadcast typing indicator |
| `stop_typing` | `{ roomId }` | Clear typing indicator |

| Server → Client | Payload | Description |
| --- | --- | --- |
| `receive_message` | Message object | New message in room |
| `user_typing` | `{ userId, name }` | User is typing |
| `user_stop_typing` | `{ userId }` | User stopped typing |

---

## Database Schema — Key Tables

| Table | Purpose |
| --- | --- |
| `profiles` | Users — role (`admin`/`instructor`/`student`), password hash |
| `organizations` | Multi-tenant root |
| `cohorts` / `user_cohorts` | Academic cohorts + membership |
| `courses` | Global reusable course templates |
| `cohort_courses` | M:N — which courses are assigned to which cohorts |
| `teams` | Teams within a course+cohort (`team_leader_id` field) |
| `team_members` | Team membership |
| `tasks` | Tasks with `cohort_id`, `assignment_type`, `course_id` |
| `task_assignments` | Individual student → task assignments |
| `task_team_assignments` | Team → task assignments |
| `submissions` | Submission with `grade`, `feedback`, `assessed_by`, `assessed_at` |
| `chat_rooms` | Type: `general`/`cohort`/`course`/`team`/`dm` |
| `messages` | Chat messages per room |
| `notifications` | In-app notifications per user |
| `attendance` | Daily check-in / check-out records |
| `activity_logs` | Immutable audit trail |
| `files` | File upload metadata |

---

## Project Structure

```
HubConnect/
├── README.md
├── Backend/
│   ├── supabase_schema.sql        # Full PostgreSQL schema (authoritative)
│   ├── init.sql                   # Alternative local-only schema
│   ├── package.json
│   ├── migrations/
│   │   ├── 000_rls_helper_functions.sql  # RLS helper functions (run first)
│   │   ├── rbac_cohort_isolation.sql     # Cohort isolation + course decoupling
│   │   ├── add_dm_rooms.sql              # DM chat support
│   │   ├── security_audit_fixes.sql      # Grade-tamper protection + RLS hardening
│   │   └── add_attendance_table.sql
│   └── src/
│       ├── index.js               # Express + Socket.io server entry
│       ├── config/
│       ├── db/                    # Connection, migration runner, seeder
│       ├── middleware/            # authenticate, rbac, validate, errorHandler
│       └── routes/                # 17 route files (one per resource)
└── Frontend/
    ├── vite.config.js             # Dev server + API proxy
    ├── tailwind.config.js
    └── src/
        ├── components/            # 10 shared UI components
        ├── context/               # Auth, Cohort, Course, Notification, Theme
        ├── hooks/                 # useAuth, useSocket
        ├── layouts/               # DashboardLayout
        ├── pages/                 # 18 page components
        ├── routes/                # AppRoutes with role guards
        ├── services/              # api.js (Axios modules) + socket.js
        └── utils/                 # constants, helpers
```

---

## Scripts

### Backend

| Command | Description |
| --- | --- |
| `npm run dev` | Start with `--watch` (auto-restart) |
| `npm start` | Production start |
| `npm run migrate` | Run pending SQL migrations |
| `npm run seed` | Seed database with demo data |
| `npm run init-db` | Apply `init.sql` against `$DATABASE_URL` |

### Frontend

| Command | Description |
| --- | --- |
| `npm run dev` | Vite dev server — http://localhost:5173 |
| `npm run build` | Production build → `dist/` |
| `npm run preview` | Preview production build locally |

---

## Demo Accounts

After running `npm run seed` in `Backend/`:

| Email | Password | Role |
| --- | --- | --- |
| `admin@hub.com` | `admin123` | admin |
| `instructor@hub.com` | `inst123` | instructor |
| `student@hub.com` | `stud123` | student |

---

## Security Highlights

- Row-Level Security (RLS) on every Supabase table
- RLS helper functions (`is_admin()`, `current_cohort_ids()`, etc.) defined via `SECURITY DEFINER`
- Students **cannot modify** `grade`, `assessed_by`, or `assessed_at` — enforced at RLS policy level
- Instructor queries are cohort-scoped at both the API layer (`cohortFilter`) and RLS layer
- `team_leader` has been removed from the role enum — leader is a field, not a role
- All auth errors return `{ success: false, message: "..." }` — consistent with route errors

---

## License

MIT


---

## Tech Stack

| Layer    | Technology                                       |
| -------- | ------------------------------------------------ |
| Frontend | React 18, Vite 5, Tailwind CSS 3, Recharts      |
| Backend  | Node.js (ESM), Express 5, Socket.io 4            |
| Database | PostgreSQL 15+ (local or Supabase)               |
| Auth     | Custom JWT — bcryptjs + jsonwebtoken              |

---

## Features

- **Role-Based Access** — Admin, Instructor, Team Leader, Student
- **Cohort & Course Management** — organise students into cohorts and courses
- **Team Management** — create teams, assign leaders, manage members
- **Task Workflow** — create, assign, submit, review, accept/reject tasks
- **Real-Time Chat** — General, Course, and Team channels via Socket.io
- **Attendance Tracking** — daily check-in / check-out with reports
- **Analytics Dashboard** — submission stats, timelines, team rankings
- **Notifications** — in-app notification bell with live updates
- **Dark Mode** — system-aware + manual toggle
- **Responsive UI** — mobile-friendly layouts and sidebar

---

## Prerequisites

- **Node.js** >= 18
- **PostgreSQL** 15+ (local install or Supabase project)
- **npm** 9+

---

## Quick Start

### 1. Clone the repository

```bash
git clone <repo-url>
cd HubConnect
```

### 2. Database setup

```bash
# Local PostgreSQL
psql -U postgres -c "CREATE DATABASE hubconnect;"
psql -U postgres -d hubconnect -f Backend/init.sql
```

Or point `DATABASE_URL` to a Supabase project and use `Backend/supabase_schema.sql`.

### 3. Backend

```bash
cd Backend
npm install
```

Create a `.env` file (see configuration below), then:

```bash
npm run dev          # http://localhost:5000
```

### 4. Frontend

```bash
cd Frontend
npm install
npm run dev          # http://localhost:5173
```

Open **http://localhost:5173** — the Vite dev server proxies `/api` requests to the backend automatically.

---

## Configuration

### Backend `.env`

```env
PORT=5000
NODE_ENV=development

DATABASE_URL=postgresql://postgres:password@localhost:5432/hubconnect

JWT_SECRET=change-this-to-a-long-random-string-min-32-chars
JWT_EXPIRES_IN=7d

BCRYPT_ROUNDS=10

CORS_ORIGIN=http://localhost:5173
```

| Variable         | Required | Default                 | Description                     |
| ---------------- | -------- | ----------------------- | ------------------------------- |
| `DATABASE_URL`   | **Yes**  | —                       | PostgreSQL connection string    |
| `JWT_SECRET`     | **Yes**  | —                       | Min 32-char secret              |
| `PORT`           | No       | `5000`                  | Server port                     |
| `NODE_ENV`       | No       | `development`           | Environment                     |
| `JWT_EXPIRES_IN` | No       | `7d`                    | Token lifetime                  |
| `BCRYPT_ROUNDS`  | No       | `10`                    | bcrypt cost factor              |
| `CORS_ORIGIN`    | No       | `http://localhost:5173` | Allowed frontend origin         |

### Frontend

No `.env` needed in development — Vite proxies `/api` to `localhost:5000`. For production, set `VITE_API_URL` to your backend URL.

---

## API Overview

All endpoints are prefixed with `/api`. Most require `Authorization: Bearer <token>`.

| Prefix           | Description                              |
| ---------------- | ---------------------------------------- |
| `/auth`          | Register, login, logout, current user    |
| `/cohorts`       | Cohort CRUD + instructor assignment      |
| `/courses`       | Course CRUD                              |
| `/teams`         | Team CRUD + member management            |
| `/tasks`         | Task CRUD + assignment                   |
| `/submissions`   | Submit & review task work                |
| `/chat`          | Chat rooms & messages                    |
| `/attendance`    | Check-in / check-out                     |
| `/notifications` | In-app notifications                     |
| `/analytics`     | Submission stats, rankings, timelines    |
| `/reports`       | Daily, range, student, and summary       |
| `/profiles`      | User profile CRUD                        |
| `/organizations` | Organization CRUD + user listing         |
| `/roles`         | Role assignment                          |
| `/files`         | File upload metadata                     |
| `/activity-logs` | Read-only audit trail                    |

---

## Real-Time (Socket.io)

Clients authenticate with `socket.handshake.auth.token` (JWT).

| Event (client → server) | Payload           | Description        |
| ------------------------ | ----------------- | ------------------ |
| `join_room`              | `{ roomId }`      | Join a chat room   |
| `leave_room`             | `{ roomId }`      | Leave a chat room  |
| `send_message`           | `{ roomId, ... }` | Send a message     |
| `typing`                 | `{ roomId }`      | Broadcast typing   |
| `stop_typing`            | `{ roomId }`      | Stop typing        |

| Event (server → client) | Payload            | Description         |
| ------------------------ | ------------------ | ------------------- |
| `receive_message`        | Message object     | New message in room |
| `user_typing`            | `{ userId, name }` | User is typing     |
| `user_stop_typing`       | `{ userId }`       | Stopped typing     |

---

## Database Schema

The full schema lives in [Backend/init.sql](Backend/init.sql). Key tables:

| Table               | Purpose                          |
| ------------------- | -------------------------------- |
| `auth.users`        | Minimal auth identity (UUID PK)  |
| `profiles`          | Full user info + password hash   |
| `organizations`     | Multi-tenant organisations       |
| `cohorts`           | Academic cohorts with date range  |
| `user_cohorts`      | Student ↔ Cohort membership      |
| `courses`           | Courses within cohorts           |
| `teams`             | Teams within courses             |
| `team_members`      | Team membership                  |
| `tasks`             | Task management                  |
| `task_assignments`  | Task ↔ User assignments          |
| `submissions`       | Task submissions + review        |
| `chat_rooms`        | General / Course / Team rooms    |
| `messages`          | Chat messages                    |
| `notifications`     | In-app notifications             |
| `attendance`        | Daily check-in / check-out       |
| `activity_logs`     | Audit trail                      |
| `files`             | File upload metadata             |

---

## Project Structure

```
HubConnect/
├── README.md                 # ← you are here
├── Backend/
│   ├── .env                  # Environment config (not committed)
│   ├── init.sql              # Full PostgreSQL schema
│   ├── supabase_schema.sql   # Supabase-compatible variant
│   ├── package.json
│   ├── migrations/           # Incremental SQL migrations
│   └── src/
│       ├── index.js          # Express + Socket.io entry
│       ├── config/           # Centralised env config
│       ├── db/               # DB connection, migration runner, seeder
│       ├── middleware/       # authenticate, rbac, validate, errorHandler
│       └── routes/           # One file per API resource (17 route files)
└── Frontend/
    ├── index.html
    ├── package.json
    ├── vite.config.js        # Dev server + API proxy
    ├── tailwind.config.js    # Theme + dark mode
    └── src/
        ├── App.jsx           # Context providers wrapper
        ├── components/       # 10 reusable UI components
        ├── context/          # Auth, Cohort, Course, Notification, Theme
        ├── hooks/            # useAuth, useSocket
        ├── layouts/          # DashboardLayout
        ├── pages/            # 18 page components
        ├── routes/           # AppRoutes with role guards
        ├── services/         # api.js (Axios) + socket.js
        └── utils/            # constants + helpers
```

---

## Roles & Access

| Role            | Permissions                                              |
| --------------- | -------------------------------------------------------- |
| **Admin**       | Full access — orgs, cohorts, instructors, all users      |
| **Instructor**  | Manage courses, tasks, teams; view reports & analytics   |
| **Team Leader** | Create tasks, manage team submissions, check attendance  |
| **Student**     | View tasks, submit work, chat, check attendance          |

---

## Scripts

### Backend (`Backend/`)

| Command           | Description                            |
| ----------------- | -------------------------------------- |
| `npm run dev`     | Start with `--watch` (auto-restart)    |
| `npm start`       | Production start                       |
| `npm run migrate` | Run pending SQL migrations             |
| `npm run seed`    | Seed database with demo data           |
| `npm run init-db` | Run `init.sql` against `$DATABASE_URL` |

### Frontend (`Frontend/`)

| Command           | Description                       |
| ----------------- | --------------------------------- |
| `npm run dev`     | Vite dev server (port 5173)       |
| `npm run build`   | Production build to `dist/`       |
| `npm run preview` | Preview production build locally  |

---

## Seed Data

```bash
cd Backend
npm run seed
```

Creates demo accounts:

| Email                | Password    | Role         |
| -------------------- | ----------- | ------------ |
| `admin@hub.com`      | `admin123`  | admin        |
| `instructor@hub.com` | `inst123`   | instructor   |
| `student@hub.com`    | `stud123`   | student      |
| `leader@hub.com`     | `lead123`   | team_leader  |

---

## License

MIT
