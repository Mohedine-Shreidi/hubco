// User roles
export const ROLES = {
  ADMIN: 'admin',
  INSTRUCTOR: 'instructor',
  STUDENT: 'student',
  TEAM_LEADER: 'team_leader'
};

// Task status
export const TASK_STATUS = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  SUBMITTED: 'submitted',
  LATE: 'late'
};

// Submission status
export const SUBMISSION_STATUS = {
  NOT_SUBMITTED: 'not_submitted',
  ON_TIME: 'on_time',
  LATE: 'late'
};

// API endpoints (mock)
export const API_ENDPOINTS = {
  LOGIN: '/api/auth/login',
  LOGOUT: '/api/auth/logout',
  TASKS: '/api/tasks',
  SUBMISSIONS: '/api/submissions',
  TEAMS: '/api/teams',
  ANALYTICS: '/api/analytics',
  NOTIFICATIONS: '/api/notifications'
};

// Socket events
export const SOCKET_EVENTS = {
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  JOIN_ROOM: 'join_room',
  LEAVE_ROOM: 'leave_room',
  SEND_MESSAGE: 'send_message',
  RECEIVE_MESSAGE: 'receive_message',
  TYPING: 'typing',
  STOP_TYPING: 'stop_typing',
  USER_ONLINE: 'user_online',
  USER_OFFLINE: 'user_offline'
};

// Routes
export const ROUTES = {
  LOGIN: '/login',
  DASHBOARD: '/dashboard',
  TASKS: '/tasks',
  CREATE_TASK: '/tasks/create',
  TASK_DETAILS: '/tasks/:id',
  TEAMS: '/teams',
  CHAT: '/chat',
  ANALYTICS: '/analytics',
  CHECK_IN_OUT: '/attendance',
  DAILY_REPORTS: '/reports/daily',
  STUDENT_REPORT: '/reports/student/:id',
  COHORTS: '/cohorts',
  COURSES: '/courses',
  COURSE_DETAILS: '/courses/:id',
  STUDENTS: '/students',
  INSTRUCTORS: '/instructors',
  PROFILE: '/profile'
};
