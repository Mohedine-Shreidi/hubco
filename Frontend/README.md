# HubConnect — Frontend

> React 18 SPA with Vite, Tailwind CSS, Socket.io real-time chat, and fully role-isolated dashboards for admins, instructors, and students.

---

## Tech Stack

| Layer | Technology |
| --- | --- |
| Framework | React 18 |
| Build Tool | Vite 5 |
| Styling | Tailwind CSS 3 (dark mode — `class` strategy) |
| Routing | React Router DOM 6 |
| HTTP Client | Axios |
| Real-time | Socket.io Client 4 |
| Charts | Recharts |
| Icons | Lucide React |
| Auth | JWT — `jwt-decode` |

---

## Project Structure

```
Frontend/
├── index.html
├── package.json
├── vite.config.js             # Dev server + /api proxy
├── tailwind.config.js         # Theme + dark mode
├── postcss.config.js
└── src/
    ├── main.jsx               # React DOM entry
    ├── App.jsx                # Root — context providers
    ├── index.css              # Tailwind directives + globals
    ├── components/
    │   ├── Avatar.jsx             # Initials fallback avatar
    │   ├── ChatBox.jsx            # Real-time chat UI
    │   ├── ErrorBoundary.jsx      # React error boundary
    │   ├── Navbar.jsx             # Top navigation bar
    │   ├── NotificationBell.jsx   # Notification dropdown
    │   ├── RoleGuard.jsx          # Route-level role protection
    │   ├── Sidebar.jsx            # Dashboard sidebar (role-adaptive)
    │   ├── SubmissionModal.jsx    # Task submission dialog
    │   ├── TaskCard.jsx           # Task card component
    │   └── ThemeToggle.jsx        # Light / dark mode toggle
    ├── context/
    │   ├── AuthContext.jsx        # JWT auth state + login/logout
    │   ├── CohortContext.jsx      # Cohort selection + CRUD
    │   ├── CourseContext.jsx      # Active course state
    │   ├── NotificationContext.jsx
    │   └── ThemeContext.jsx
    ├── hooks/
    │   ├── useAuth.js             # Auth context consumer
    │   └── useSocket.js           # Socket.io connection
    ├── layouts/
    │   └── DashboardLayout.jsx    # Sidebar + Navbar wrapper
    ├── pages/
    │   ├── Analytics.jsx          # Charts (Admin / Instructor)
    │   ├── Chat.jsx               # Tabbed rooms — General / Course / Team / DM
    │   ├── CheckInOut.jsx         # Attendance check-in / check-out
    │   ├── CohortDetails.jsx      # Single cohort view
    │   ├── Cohorts.jsx            # Cohort management
    │   ├── CourseDetails.jsx      # Course view + team list
    │   ├── Courses.jsx            # Course listing
    │   ├── CreateTask.jsx         # Multi-assignment task creation form
    │   ├── DailyReports.jsx       # Attendance reports
    │   ├── Dashboard.jsx          # Role-specific overview
    │   ├── Instructors.jsx        # Instructor management (Admin)
    │   ├── Login.jsx
    │   ├── NotFound.jsx
    │   ├── Profile.jsx
    │   ├── Students.jsx           # Student list (cohort-scoped for instructor)
    │   ├── TaskDetails.jsx        # Task view + submit / assess UI
    │   ├── Tasks.jsx              # Task listing
    │   └── Teams.jsx              # Team management
    ├── routes/
    │   └── AppRoutes.jsx          # All routes + RoleGuard protection
    ├── services/
    │   ├── api.js                 # Axios instance + all API modules
    │   └── socket.js              # Socket.io client singleton
    └── utils/
        ├── constants.js
        └── helpers.js
```

---

## Getting Started

### Prerequisites

- **Node.js** ≥ 18
- Backend API running on `http://localhost:5000`

### 1 — Install

```bash
cd Frontend
npm install
```

### 2 — Development

```bash
npm run dev
```

Opens at **http://localhost:5173**. All `/api/*` requests are proxied to the backend — no CORS configuration needed in dev.

### 3 — Production build

```bash
npm run build      # output → dist/
npm run preview    # preview the build locally
```

---

## Pages & Routes

| Path | Page | Access |
| --- | --- | --- |
| `/login` | Login | Public |
| `/dashboard` | Dashboard | All authenticated |
| `/tasks` | Tasks | All authenticated |
| `/tasks/create` | Create Task | Admin, Instructor |
| `/tasks/:id` | Task Details | All authenticated |
| `/teams` | Teams | All authenticated |
| `/courses` | Courses | All authenticated |
| `/courses/:id` | Course Details | All authenticated |
| `/cohorts` | Cohorts | Admin, Instructor |
| `/students` | Students | Admin, Instructor |
| `/instructors` | Instructors | Admin |
| `/chat` | Chat | All authenticated |
| `/attendance` | Check In/Out | Student |
| `/reports/daily` | Daily Reports | Admin, Instructor |
| `/reports/student` | Student Reports | Admin, Instructor |
| `/analytics` | Analytics | Admin, Instructor |
| `/profile` | Profile | All authenticated |

---

## Roles

| Role | UI Behaviour |
| --- | --- |
| `admin` | Sees all data — org-wide cohorts, all students, all teams |
| `instructor` | Dashboard and lists are cohort-scoped — cannot see other cohorts' data |
| `student` | Sees own tasks, own submissions, team chat; cannot access management pages |

> **Team Leader** is not a login role. It is a field (`teams.team_leader_id`) displayed in the Team management UI. No elevated permissions are granted system-wide.

---

## Features

- **Dashboard** — role-specific stats, recent tasks, upcoming deadlines
- **Task Management** — create with `individual` / `team` / `mixed` / `cohort` assignment types; per-student and per-team submission tracking
- **Assessment** — instructors can grade (0–100) and leave written feedback directly on a submission
- **Teams** — create teams within a course + cohort; cross-cohort membership is blocked
- **Real-Time Chat** — General, Course, Team, Cohort, and DM rooms via Socket.io with typing indicators
- **Attendance** — daily check-in / check-out with instructor report views
- **Notifications** — live bell with unread count; mark-all-read
- **Analytics** — submission rate charts, team rankings, timeline breakdowns (Recharts)
- **Dark Mode** — system preference detected on load; manual toggle persisted
- **Responsive** — sidebar collapses on mobile; layouts adapt to screen size

---

## Authentication Flow

1. POST `/auth/login` → JWT returned
2. Token stored in `localStorage`
3. `jwt-decode` extracts `{ id, role, cohorts, organizationId }` — no extra round-trip
4. `AuthContext` exposes `user`, `login()`, `logout()`
5. `RoleGuard` wraps protected routes; redirects to `/login` when unauthenticated
6. Sidebar and navigation items render conditionally based on `user.role`

---

## Environment

No `.env` is needed in development. The Vite dev server proxies `/api` to the backend:

```js
// vite.config.js
proxy: {
  '/api': {
    target: 'http://localhost:5000',
    changeOrigin: true,
  },
}
```

For production deployments where the frontend and backend are on separate origins, set:

```env
VITE_API_URL=https://your-api-domain.com
```

## Vercel Deployment

Deploy the `Frontend/` folder as the Vercel project root. Keep the Express API on a separate Node host because the backend uses long-lived HTTP and Socket.io connections.

Required production settings:

```env
VITE_API_URL=https://your-api-domain.com/api
```

If your backend enforces CORS, set:

```env
CORS_ORIGIN=https://your-app.vercel.app
```

The included `vercel.json` preserves React Router routes so direct visits to pages like `/dashboard` or `/tasks/123` work on refresh.

---

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Vite dev server — http://localhost:5173 |
| `npm run build` | Production build → `dist/` |
| `npm run preview` | Preview production build locally |


---

## Tech Stack

| Layer        | Technology                              |
| ------------ | --------------------------------------- |
| Framework    | React 18                                |
| Build Tool   | Vite 5                                  |
| Styling      | Tailwind CSS 3 (dark mode support)      |
| Routing      | React Router DOM 6                      |
| HTTP Client  | Axios                                   |
| Real-time    | Socket.io Client 4                      |
| Charts       | Recharts                                |
| Icons        | Lucide React                            |
| Auth         | JWT (jwt-decode)                        |

---

## Project Structure

```
Frontend/
├── index.html              # HTML entry
├── package.json
├── vite.config.js          # Vite config + API proxy
├── tailwind.config.js      # Tailwind theme + dark mode
├── postcss.config.js
└── src/
    ├── main.jsx            # React DOM entry
    ├── App.jsx             # Root — context providers wrapper
    ├── index.css           # Tailwind directives + global styles
    ├── components/
    │   ├── Avatar.jsx          # User avatar with initials fallback
    │   ├── ChatBox.jsx         # Real-time chat UI (Socket.io)
    │   ├── ErrorBoundary.jsx   # React error boundary
    │   ├── Navbar.jsx          # Top navigation bar
    │   ├── NotificationBell.jsx# Notification dropdown
    │   ├── RoleGuard.jsx       # Route-level role protection
    │   ├── Sidebar.jsx         # Dashboard sidebar navigation
    │   ├── SubmissionModal.jsx # Task submission dialog
    │   ├── TaskCard.jsx        # Task card component
    │   └── ThemeToggle.jsx     # Light/dark mode toggle
    ├── context/
    │   ├── AuthContext.jsx      # Authentication state + JWT
    │   ├── CohortContext.jsx    # Cohort selection & CRUD
    │   ├── CourseContext.jsx    # Active course state
    │   ├── NotificationContext.jsx # Notifications state
    │   └── ThemeContext.jsx     # Dark/light theme state
    ├── hooks/
    │   ├── useAuth.js          # Auth context consumer hook
    │   └── useSocket.js        # Socket.io connection hook
    ├── layouts/
    │   └── DashboardLayout.jsx # Sidebar + Navbar layout
    ├── pages/
    │   ├── Analytics.jsx       # Charts & analytics (Admin/Instructor)
    │   ├── Chat.jsx            # Tabbed chat (General/Course/Team)
    │   ├── CheckInOut.jsx      # Daily attendance (Student/TL)
    │   ├── Cohorts.jsx         # Cohort management (Admin/Instructor)
    │   ├── CourseDetails.jsx   # Single course view
    │   ├── Courses.jsx         # Course listing
    │   ├── CreateTask.jsx      # Task creation form
    │   ├── DailyReports.jsx    # Daily attendance reports
    │   ├── Dashboard.jsx       # Main dashboard
    │   ├── Instructors.jsx     # Instructor management (Admin)
    │   ├── Login.jsx           # Login page
    │   ├── NotFound.jsx        # 404 page
    │   ├── Profile.jsx         # User profile page
    │   ├── StudentReport.jsx   # Individual student reports
    │   ├── Students.jsx        # Student management (Admin/Instructor)
    │   ├── TaskDetails.jsx     # Single task view
    │   ├── Tasks.jsx           # Task listing
    │   └── Teams.jsx           # Team management
    ├── routes/
    │   └── AppRoutes.jsx       # All routes + role guards
    ├── services/
    │   ├── api.js              # Axios instance + all API modules
    │   └── socket.js           # Socket.io client singleton
    └── utils/
        ├── constants.js        # App-wide constants
        └── helpers.js          # Utility functions
```

---

## Getting Started

### Prerequisites

- **Node.js** >= 18
- Backend API running on `http://localhost:5000` (see Backend README)

### 1. Install dependencies

```bash
cd Frontend
npm install
```

### 2. Start development server

```bash
npm run dev
```

Opens at **http://localhost:5173**. API requests to `/api/*` are proxied to the backend automatically via Vite.

### 3. Build for production

```bash
npm run build
```

Output goes to `dist/`. Preview with:

```bash
npm run preview
```

---

## Pages & Routing

| Path                     | Page             | Access               |
| ------------------------ | ---------------- | -------------------- |
| `/login`                 | Login            | Public               |
| `/dashboard`             | Dashboard        | All authenticated    |
| `/tasks`                 | Tasks            | All authenticated    |
| `/tasks/create`          | Create Task      | Admin, Instructor, TL|
| `/tasks/:id`             | Task Details     | All authenticated    |
| `/teams`                 | Teams            | All authenticated    |
| `/courses`               | Courses          | All authenticated    |
| `/courses/:id`           | Course Details   | All authenticated    |
| `/cohorts`               | Cohorts          | Admin, Instructor    |
| `/students`              | Students         | Admin, Instructor    |
| `/instructors`           | Instructors      | Admin                |
| `/chat`                  | Chat             | All authenticated    |
| `/attendance`            | Check In/Out     | Student, Team Leader |
| `/reports/daily`         | Daily Reports    | Admin, Instructor    |
| `/reports/student`       | Student Reports  | Admin, Instructor    |
| `/analytics`             | Analytics        | Admin, Instructor    |
| `/profile`               | Profile          | All authenticated    |

---

## Roles

The app supports four roles with cascading access:

| Role            | Key Permissions                                         |
| --------------- | ------------------------------------------------------- |
| **Admin**       | Full access — manage orgs, cohorts, instructors, users  |
| **Instructor**  | Manage courses, tasks, teams, view reports & analytics  |
| **Team Leader** | Create tasks, manage team submissions, check attendance |
| **Student**     | View tasks, submit work, chat, check attendance         |

---

## Features

- **Dashboard** — role-specific stats and recent activity
- **Task Management** — create, assign, track, submit, and review tasks
- **Teams** — create teams within courses, assign members and leaders
- **Real-time Chat** — General, Course, and Team chat rooms via Socket.io
- **Attendance** — daily check-in/check-out tracking
- **Notifications** — in-app notification bell with real-time updates
- **Analytics** — charts and metrics for admins/instructors (Recharts)
- **Dark Mode** — system-aware + manual toggle (Tailwind `class` strategy)
- **Role Guards** — routes and UI elements protected by role
- **Responsive** — mobile-friendly sidebar and layouts

---

## Authentication Flow

1. User logs in with email and password
2. Backend returns a JWT stored in localStorage
3. Token is decoded to extract user info (role, id, name, team)
4. Protected routes check authentication and role via `RoleGuard`
5. Sidebar and navigation adapt based on the user's role

---

## Environment

No `.env` file is needed for the frontend in development. The Vite proxy handles API routing:

```js
// vite.config.js — proxy /api to backend
proxy: {
  '/api': {
    target: 'http://localhost:5000',
    changeOrigin: true,
  },
}
```

For production builds, set `VITE_API_URL` if deploying frontend and backend separately.

---

## Scripts

| Command           | Description                        |
| ----------------- | ---------------------------------- |
| `npm run dev`     | Start Vite dev server (port 5173)  |
| `npm run build`   | Production build to `dist/`        |
| `npm run preview` | Preview production build locally   |
