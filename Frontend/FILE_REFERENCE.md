# 📂 Project File Reference - HubConnect

## 📁 Root Configuration Files

### package.json

- Project dependencies and scripts
- React, Vite, Tailwind, Router, Axios, Socket.io, Recharts
- Scripts: dev, build, preview

### vite.config.js

- Vite configuration
- React plugin setup
- Dev server on port 3000

### tailwind.config.js

- Tailwind CSS configuration
- Custom color palette (primary blue shades)
- Content paths for purging

### postcss.config.js

- PostCSS configuration for Tailwind

### index.html

- Root HTML file
- Loads main.jsx script

## 🎯 Core Application Files

### src/main.jsx

- Application entry point
- Renders App component with BrowserRouter

### src/App.jsx

- Main app component
- Wraps with AuthProvider and NotificationProvider
- Renders AppRoutes

### src/index.css

- Global CSS styles
- Tailwind directives
- Custom scrollbar styles
- Shadow utilities

## 🔐 Context & State Management

### src/context/AuthContext.jsx

**Purpose**: Global authentication state

- User login/logout
- Token management (localStorage)
- Role checking functions
- Authentication status

**Methods**:

- `login(email, password)` - Authenticate user
- `logout()` - Clear session
- `hasRole(roles)` - Check user role
- `isAuthenticated()` - Check if logged in

### src/context/NotificationContext.jsx

**Purpose**: Global notification state

- Fetch and display notifications
- Mark as read functionality
- Unread count tracking
- Real-time notification updates

**Methods**:

- `fetchNotifications()` - Get user notifications
- `markAsRead(id)` - Mark single as read
- `markAllAsRead()` - Mark all as read
- `addNotification(notification)` - Add new notification

### src/context/ThemeContext.jsx

**Purpose**: Light/Dark theme management

- Theme state (light/dark)
- localStorage persistence
- System preference detection
- Theme toggle functionality

**Methods**:

- `toggleTheme()` - Switch between light/dark
- `setTheme(theme)` - Set specific theme
- Provides: `theme`, `isDark`, `toggleTheme`, `setTheme`

### src/context/InternshipContext.jsx

**Purpose**: Internship/Semester isolation

- Filter users and tasks by active internship
- Student visibility restrictions
- Multi-semester support

**Methods**:

- `isStudentVisible(studentId)` - Check if student in current internship
- `filterByInternship(users)` - Filter users by active internship
- Provides: `currentInternship`, `internships`

### src/context/WorkspaceContext.jsx

**Purpose**: Workspace management (CRUD + teams + tasks)

- Create, update, finish workspaces
- Team management per workspace
- Team Leader assignment (per workspace, not global)
- Task management within workspaces
- Instructor single active workspace validation
- Student single team per workspace validation

**Methods**:

- `createWorkspace(name, endDate)` - Create new workspace
- `updateWorkspace(id, data)` - Update workspace
- `finishWorkspace(id)` - Mark workspace as finished
- `addTeamToWorkspace(wsId, teamId)` - Add team
- `assignTeamLeader(wsId, teamId, userId)` - Make user team leader
- `addMemberToTeam(wsId, teamId, userId)` - Add team member
- `removeMemberFromTeam(wsId, teamId, userId)` - Remove member
- `addTaskToWorkspace(wsId, task)` - Create task in workspace
- `updateTaskInWorkspace(wsId, taskId, updates)` - Update task
- `getLeadingTeam(wsId)` - Get team led by current user
- `isTeamLeaderInWorkspace(wsId)` - Check if user is team leader

## 🪝 Custom Hooks

### src/hooks/useAuth.js

**Purpose**: Easy access to AuthContext

- Returns authentication context
- Provides user, token, login, logout, etc.

### src/hooks/useSocket.js

**Purpose**: Socket.io connection management

- Manages chat connection
- Sends/receives messages
- Typing indicators
- Online users tracking

**Returns**:

- `messages` - Array of messages
- `onlineUsers` - Array of online users
- `typingUsers` - Array of typing users
- `sendMessage(message)` - Send message
- `startTyping()` - Send typing indicator
- `stopTyping()` - Stop typing indicator

## 🛣️ Routing

### src/routes/AppRoutes.jsx

**Purpose**: Application routing configuration

- Public routes (Login)
- Protected routes (Dashboard, Tasks, etc.)
- Role-based route guards
- 404 handling

**Routes**:

- `/login` - Login page
- `/dashboard` - Dashboard (all roles)
- `/tasks` - Tasks list (all roles)
- `/tasks/create` - Create task (instructor/admin)
- `/tasks/:id` - Task details (all roles)
- `/teams` - Teams page (all roles)
- `/workspaces` - Workspaces list (all roles)
- `/workspaces/:id` - Workspace details (all roles)
- `/chat` - Team chat (all roles)
- `/profile` - User profile & settings (all roles)
- `/attendance` - Check in/out (student/team_leader)
- `/reports/daily` - Daily reports (instructor/admin)
- `/reports/student` - Student reports (instructor/admin)
- `/analytics` - Analytics (instructor/admin)

## 🎨 Layout Components

### src/layouts/DashboardLayout.jsx

**Purpose**: Main dashboard layout wrapper

- Contains Sidebar and Navbar
- Wraps all dashboard pages
- Responsive layout with sidebar toggle

## 🧩 Shared Components

### src/components/Avatar.jsx

**Purpose**: Reusable user avatar component

- Display user image or initials fallback
- Role-colored ring indicator
- Flexible sizes (24-96px)
- Image error handling

**Props**:

- `name` - User name (for initials)
- `imageUrl` - User image URL
- `size` - Avatar size (24, 32, 40, 48, 56, 64, 80, 96)
- `role` - User role (for ring color)
- `className` - Additional CSS classes

### src/components/ThemeToggle.jsx

**Purpose**: Light/Dark theme switcher

- Sun/Moon icon button
- Toggles between light and dark modes
- Integrated with ThemeContext

**Usage**: Appears in Navbar

### src/components/Sidebar.jsx

**Purpose**: Navigation sidebar

- Role-based menu items
- User profile display with Avatar
- Logout button
- Responsive (collapsible on mobile)
- Workspaces link (all roles)
- Chat available to all roles (not just student/team_leader)

**Features**:

- Auto-generates menu based on role
- Active route highlighting (with `end` prop fix)
- Mobile overlay click-to-close
- Avatar integration

### src/components/Navbar.jsx

**Purpose**: Top navigation bar

- Menu toggle button (mobile)
- Avatar component display
- ThemeToggle button
- User greeting
- Account Settings link (routes to Profile with ?tab=settings)
- Notification bell
- Dark mode support

### src/components/RoleGuard.jsx

**Purpose**: Route protection by role

- Checks authentication
- Validates user role
- Redirects unauthorized users
- Dark mode loading spinner

**Props**:

- `children` - Content to protect
- `allowedRoles` - Array of allowed roles
- `redirectTo` - Redirect path if unauthorized

### src/components/NotificationBell.jsx

**Purpose**: Notification dropdown

- Shows unread count badge
- Notification list dropdown
- Mark as read functionality
- Auto-closes on outside click
- Dark mode support

### src/components/TaskCard.jsx

**Purpose**: Task display card

- Shows task info (title, description, deadline)
- Status badge
- Days remaining indicator
- Click to view details
- Dark mode support

**Props**:

- `task` - Task object

### src/components/SubmissionModal.jsx

**Purpose**: Task submission modal

- File upload (mock)
- GitHub link input
- Comment textarea
- Submission validation
- Dark mode support

**Props**:

- `task` - Task to submit
- `isOpen` - Modal visibility
- `onClose` - Close handler
- `onSuccess` - Success callback

### src/components/ChatBox.jsx

**Purpose**: Real-time chat interface

- Message list with auto-scroll
- Send message form
- Typing indicators
- Avatar display for each message
- Sender role indicators
- Online users count
- Dark mode support

**Props**:

- `roomId` - Chat room ID

## 📄 Page Components

### src/pages/Login.jsx

**Purpose**: Authentication page

- Email/password form
- Demo account buttons
- Forgot password modal (multi-step)
- Error handling
- Redirects on successful login
- Dark mode support

### src/pages/Dashboard.jsx

**Purpose**: Main dashboard overview

- Role-specific views (Admin, Instructor, Student, Team Leader)
- Statistics cards (total, submitted, pending, rate)
- Recent tasks list
- Quick action buttons
- Upcoming deadlines (Student)
- Team info (Team Leader)
- Dark mode support with role-specific gradients

### src/pages/Tasks.jsx

**Purpose**: Tasks list page

- All tasks grid
- Search functionality
- Status filter
- Create task button (instructor/admin)
- Dark mode support

### src/pages/CreateTask.jsx

**Purpose**: Task creation form

- Title, description, deadline inputs
- Team/individual assignment
- GitHub repo link
- Form validation
- Dark mode support

**Access**: Instructor and Admin only

### src/pages/TaskDetails.jsx

**Purpose**: Single task details

- Full task information
- Deadline and status
- GitHub repo link
- Submission interface (team leader)
- Submission status display
- Dark mode support

### src/pages/Teams.jsx

**Purpose**: Team management

- Team list sidebar
- Team member details
- Role badges
- CRUD operations (create, edit, delete teams)
- Add/remove members functionality
- Dark mode support

### src/pages/Workspaces.jsx

**Purpose**: Workspaces list and creation

- All workspaces grid with status badges
- Workspace cards show: name, status, dates, team count
- Create workspace modal (admin/instructor only)
- Validates active workspace limits
- Navigate to workspace details on click
- Dark mode support

### src/pages/WorkspaceDetails.jsx

**Purpose**: Workspace management and task creation

- Workspace header with status, dates, action buttons
- Teams section with expandable accordion
- Team members display with add/remove
- Team Leader assignment (crown icon)
- Team Tasks section with Jira-like cards
- Team Leader can create tasks (modal)
- Task status dropdown
- Full dark mode support

**Access**: All authenticated users (task creation for Team Leaders)

### src/pages/Chat.jsx

**Purpose**: Team chat with multiple channels

- Tabbed interface: General | Workspace | Team
- Room ID logic based on tab selection
- Empty states for missing workspace/team
- Renders ChatBox component
- Dark mode support

**Access**: All authenticated users (Student/Team Leader previously, now all)

### src/pages/Profile.jsx

**Purpose**: User profile with merged settings

- Three tabs:
  1. **Profile Information** - Edit name, email, phone, bio
  2. **Change Password** - Update password with visibility toggles
  3. **Preferences** - Theme selector (Light/Dark), Admin-only settings placeholder
- Avatar header with role badge
- Role-based section visibility
- Responds to ?tab=settings query param
- Dark mode support

### src/pages/Analytics.jsx

**Purpose**: Performance analytics

- Statistics overview cards
- Submission timeline (BarChart)
- On-time vs Late (PieChart)
- Team rankings (BarChart)
- Detailed rankings table
- Dark mode support

**Access**: Instructor and Admin only

### src/pages/CheckInOut.jsx

**Purpose**: Attendance tracking

- Check-in / Check-out buttons
- Today's status display
- History/calendar view
- Dark mode support

**Access**: Student and Team Leader

### src/pages/DailyReports.jsx

**Purpose**: Daily attendance reports

- Date picker
- Team filter
- Attendance records table
- On-time/status indicators
- Dark mode support

**Access**: Instructor and Admin only

### src/pages/StudentReport.jsx

**Purpose**: Student performance reports

- Student list with progress stats
- Submission tracking
- Performance metrics
- Dark mode support

**Access**: Instructor and Admin only

### src/pages/NotFound.jsx

**Purpose**: 404 error page

- Friendly error message
- Navigation buttons
- Go back / Go home options
- Dark mode support

## 🔧 Services

### src/services/api.js

**Purpose**: API communication layer

- Axios instance with interceptors
- Mock data for development
- All API endpoints

**API Methods**:

**authAPI**:

- `login(email, password)` - User login
- `logout()` - User logout
- `updateProfile(userId, data)` - Update user profile
- `changePassword(userId, data)` - Change password
- `forgotPassword(email)` - Initiate password reset
- `verifyResetCode(email, code)` - Verify reset code
- `resetPassword(email, code, password)` - Reset password

**taskAPI**:

- `getAllTasks()` - Get all tasks
- `getTaskById(id)` - Get single task
- `getMyTasks(userId, role, teamId)` - Get user's tasks
- `createTask(taskData)` - Create new task
- `updateTask(id, taskData)` - Update task
- `deleteTask(id)` - Delete task

**submissionAPI**:

- `getAllSubmissions()` - Get all submissions
- `getSubmissionsByTask(taskId)` - Get task submissions
- `submitTask(submissionData)` - Submit task
- `checkSubmission(taskId, teamId)` - Check if submitted

**teamAPI**:

- `getAllTeams()` - Get all teams
- `getTeamById(id)` - Get team details
- `getTeamMembers(teamId)` - Get team members
- `createTeam(teamData)` - Create new team
- `updateTeam(id, data)` - Update team
- `deleteTeam(id)` - Delete team
- `addMember(teamId, userId)` - Add member to team
- `removeMember(teamId, userId)` - Remove member from team

**workspaceAPI** (NEW):

- `getAll()` - Get all workspaces
- `getById(id)` - Get workspace details
- `create(data)` - Create new workspace
- `update(id, data)` - Update workspace
- `finish(id)` - Mark workspace as finished
- `addTeam(wsId, teamId)` - Add team to workspace
- `removeTeam(wsId, teamId)` - Remove team from workspace
- `assignLeader(wsId, teamId, userId)` - Assign team leader
- `addMember(wsId, teamId, userId)` - Add team member
- `removeMember(wsId, teamId, userId)` - Remove team member
- `getTasks(wsId)` - Get workspace tasks
- `createTask(wsId, task)` - Create task in workspace
- `updateTask(wsId, taskId, data)` - Update workspace task

**analyticsAPI**:

- `getSubmissionStats()` - Get statistics
- `getSubmissionTimeline()` - Get timeline data
- `getTeamRankings()` - Get team rankings
- `getOnTimeLateStats()` - Get on-time/late data

**notificationAPI**:

- `getNotifications(userId)` - Get user notifications
- `markAsRead(notificationId)` - Mark as read
- `markAllAsRead(userId)` - Mark all as read

### src/services/socket.js

**Purpose**: Socket.io connection

- MockSocket class for development
- Chat room management
- Message handling
- Typing indicators

**Methods**:

- `connect()` - Connect to socket
- `disconnect()` - Disconnect
- `emit(event, data)` - Send event
- `on(event, callback)` - Listen to event
- `joinRoom(roomId)` - Join chat room
- `sendMessage(data)` - Send message

## 🛠️ Utilities

### src/utils/constants.js

**Purpose**: Application constants

- User roles enum
- Task status enum
- Submission status enum
- API endpoints
- Socket events
- Route paths

### src/utils/helpers.js

**Purpose**: Helper functions

- `formatDate(date)` - Format date to string
- `formatDateTime(date)` - Format date with time
- `isPastDeadline(date)` - Check if past deadline
- `getDaysRemaining(deadline)` - Calculate days left
- `decodeToken(token)` - Decode JWT
- `getUserRole(token)` - Get role from token
- `getUserId(token)` - Get ID from token
- `truncateText(text, maxLength)` - Truncate text
- `getAvatarColor(name)` - Generate color for avatar
- `getInitials(name)` - Get initials from name
- `isValidEmail(email)` - Validate email
- `getStatusColor(status)` - Get Tailwind color class

## 📊 Component Tree

```
App
├── ThemeProvider           # NEW
│   └── AuthProvider
│       ├── NotificationProvider
│       │   ├── InternshipProvider     # NEW
│       │   │   ├── WorkspaceProvider  # NEW
│       │   │   │   └── AppRoutes
│       │   │   │       ├── Login (public)
│       │   │   │       └── DashboardLayout (protected)
│       │   │   │           ├── Sidebar
│       │   │   │           │   └── Avatar (NEW)
│       │   │   │           ├── Navbar
│       │   │   │           │   ├── Avatar (NEW)
│       │   │   │           │   ├── ThemeToggle (NEW)
│       │   │   │           │   └── NotificationBell
│       │   │   │           └── Outlet (page content)
│       │   │   │               ├── Dashboard
│       │   │   │               ├── Tasks
│       │   │   │               │   └── TaskCard (multiple)
│       │   │   │               ├── CreateTask
│       │   │   │               ├── TaskDetails
│       │   │   │               │   └── SubmissionModal
│       │   │   │               ├── Teams
│       │   │   │               ├── Workspaces (NEW)
│       │   │   │               ├── WorkspaceDetails (NEW)
│       │   │   │               ├── Chat
│       │   │   │               │   └── ChatBox + Avatar (NEW)
│       │   │   │               ├── Profile (ENHANCED)
│       │   │   │               ├── CheckInOut
│       │   │   │               ├── DailyReports
│       │   │   │               ├── StudentReport
│       │   │   │               ├── Analytics
│       │   │   │               └── NotFound
```

## 🎯 Key Design Patterns

1. **Context API** for global state (Theme, Auth, Notifications, Workspace, Internship)
2. **Custom Hooks** for reusable logic (useAuth, useSocket)
3. **Component Composition** for layouts and pages
4. **Protected Routes** with RoleGuard component
5. **Mock API** with simulated delays
6. **Responsive Design** with Tailwind breakpoints
7. **Avatar Component** reused across Navbar, Sidebar, Chat, Profile
8. **Theme Persistence** with localStorage + system preference fallback
9. **Workspace Isolation** for team-based project management
10. **Role Scoping** - Team Leader assigned per workspace (not globally)

## 🔄 Data Flow

1. User logs in → AuthContext stores user & token
2. Routes check AuthContext for authentication
3. Components use useAuth hook to access user
4. API calls use token from localStorage
5. Notifications fetched and stored in NotificationContext
6. Chat uses MockSocket for real-time updates

## 📚 External Dependencies

- **react** - UI library
- **react-dom** - DOM rendering
- **react-router-dom** - Routing
- **axios** - HTTP client
- **socket.io-client** - Real-time communication
- **recharts** - Charts and graphs
- **jwt-decode** - JWT token decoding
- **lucide-react** - Icon library
- **tailwindcss** - CSS framework

---

**Total Files**: 36 JavaScript/JSX files (added 8 new files)
**Lines of Code**: ~6,500+
**Components**: 11 (original) + 2 new = 13 total

- Shared: Sidebar, Navbar, Avatar (NEW), ThemeToggle (NEW), RoleGuard, NotificationBell, TaskCard, SubmissionModal, ChatBox
  **Pages**: 9 (original) + 2 new = 11 total
- Dashboard, Tasks, CreateTask, TaskDetails, Teams, Workspaces (NEW), WorkspaceDetails (NEW), Chat, Profile, CheckInOut, DailyReports, StudentReport, Analytics, NotFound
  **Contexts**: 2 (original) + 3 new = 5 total
- AuthContext, NotificationContext, ThemeContext (NEW), InternshipContext (NEW), WorkspaceContext (NEW)
  **Utilities**: 2 (constants.js, helpers.js)
  **Services**: 2 (api.js with workspaceAPI NEW, socket.js)
  **Hooks**: 2 (useAuth.js, useSocket.js)

## ✨ Recent Enhancements (Latest Implementation)

- ✅ Light/Dark theme system with ThemeContext and ThemeToggle component
- ✅ Reusable Avatar component integrated across app
- ✅ Workspace management system (CRUD + team management)
- ✅ Internship/Semester isolation context
- ✅ Team Leader role scoped per workspace
- ✅ Jira-like task creation in WorkspaceDetails
- ✅ Tabbed Chat Interface (General/Workspace/Team)
- ✅ Full dark mode applied to all 13+ pages and components
- ✅ Merged Profile page with preferences tab
- ✅ Avatar display in Navbar, Sidebar, Chat, and Profile
