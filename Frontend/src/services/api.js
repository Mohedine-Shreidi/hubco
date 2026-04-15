/* ============================================================
   HubConnect  API layer
   Base URL: VITE_API_URL env var or http://localhost:5000/api
   All methods return the backend JSON body: { success, data, error? }
   ============================================================ */
import axios from 'axios';

// ── Axios instance ────────────────────────────────────────────────────────────
const instance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: false,
});

// Attach JWT from localStorage on every request
instance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('hc_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (err) => Promise.reject(err)
);

// Unwrap axios envelope → return backend body ({ success, data, error })
// On 401 clear storage and redirect to login
instance.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('hc_token');
      localStorage.removeItem('hc_user');
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    // Normalise error to our { success, error } shape
    return Promise.reject(
      error.response?.data ?? { success: false, error: error.message }
    );
  }
);

// ── AUTH API ──────────────────────────────────────────────────────────────────
export const authAPI = {
  register: (data) =>
    instance.post('/auth/register', data),

  login: (email, password) =>
    instance.post('/auth/login', { email, password }),

  logout: () =>
    instance.post('/auth/logout'),

  me: () =>
    instance.get('/auth/me'),

  updateProfile: (data) =>
    instance.put('/auth/profile', data),

  changePassword: (currentPassword, newPassword) =>
    instance.put('/auth/password', { currentPassword, newPassword }),

  forgotPassword: (email) =>
    instance.post('/auth/forgot-password', { email }),

  verifyResetCode: (email, token) =>
    instance.post('/auth/verify-reset', { email, token }),

  resetPassword: (email, token, password) =>
    instance.post('/auth/reset-password', { email, token, password }),
};

// ── TASK API ──────────────────────────────────────────────────────────────────
export const taskAPI = {
  getAllTasks: (params) => instance.get('/tasks', { params }),
  getTaskById: (id) => instance.get(`/tasks/${id}`),
  getMyTasks: () => instance.get('/tasks/my'),
  createTask: (data) => instance.post('/tasks', data),
  updateTask: (id, data) => instance.put(`/tasks/${id}`, data),
  deleteTask: (id) => instance.delete(`/tasks/${id}`),
  /** New structured submit endpoint */
  submitTask: (taskId, data) => instance.post(`/tasks/${taskId}/submit`, data),
};

// ── SUBMISSION API ────────────────────────────────────────────────────────────
export const submissionAPI = {
  getAllSubmissions: (params) => instance.get('/submissions', { params }),
  getSubmissionsByTask: (taskId) => instance.get(`/submissions/task/${taskId}`),
  /** Legacy submit — prefer taskAPI.submitTask */
  submitTask: (taskId, data) => instance.post('/submissions', { taskId, ...data }),
  checkSubmission: (taskId) => instance.get(`/submissions/check/${taskId}`),
  reviewSubmission: (id, data) => instance.put(`/submissions/${id}/review`, data),
  /** Grade a submission: { grade, feedback } */
  assessSubmission: (id, data) => instance.patch(`/submissions/${id}/assess`, data),
};

// ── TEAM API ──────────────────────────────────────────────────────────────────
export const teamAPI = {
  getAllTeams: (params) => instance.get('/teams', { params }),
  getAll: (params) => instance.get('/teams', { params }),
  getTeamById: (id) => instance.get(`/teams/${id}`),
  getTeamMembers: (id) => instance.get(`/teams/${id}/members`),
  createTeam: (data) => instance.post('/teams', data),
  updateTeam: (id, data) => instance.put(`/teams/${id}`, data),
  deleteTeam: (id) => instance.delete(`/teams/${id}`),
  addMember: (id, userId) => instance.post(`/teams/${id}/members`, { userId }),
  removeMember: (id, userId) => instance.delete(`/teams/${id}/members/${userId}`),
  getAllStudents: (params) => instance.get('/profiles/students', { params }),
  /** Get or create a team's dedicated chat room */
  getTeamChatRoom: (teamId) => instance.post(`/chat/rooms/team/${teamId}`),
};

// ── CHECK-IN API ──────────────────────────────────────────────────────────────
export const checkInAPI = {
  checkIn: (notes, date) => instance.post('/attendance/check-in', { ...(notes ? { notes } : {}), ...(date ? { date } : {}) }),
  checkOut: (notes) => instance.post('/attendance/check-out', notes ? { notes } : {}),
  getTodayStatus: () => instance.get('/attendance/today'),
  getByDate: (date) => instance.get('/attendance', { params: { date } }),
  getUserHistory: () => instance.get('/attendance/history'),
  getAll: (date) => instance.get('/attendance/all', date ? { params: { date } } : {}),
};

// ── REPORTS API ───────────────────────────────────────────────────────────────
export const reportsAPI = {
  getDailyReport: (date) => instance.get('/reports/daily', { params: { date } }),
  getDateRangeReport: (start, end) => instance.get('/reports/range', { params: { start, end } }),
  getStudentReport: (id) => instance.get(`/reports/student/${id}`),
  getAllStudentsSummary: () => instance.get('/reports/summary'),
};

// ── ANALYTICS API ─────────────────────────────────────────────────────────────
export const analyticsAPI = {
  getSubmissionStats: (params) => instance.get('/analytics/submission-stats', { params }),
  getSubmissionTimeline: (params) => instance.get('/analytics/timeline', { params }),
  getTeamRankings: (params) => instance.get('/analytics/rankings', { params }),
  getOnTimeLateStats: (params) => instance.get('/analytics/on-time-late', { params }),
};

// ── COURSE API ────────────────────────────────────────────────────────────────
export const courseAPI = {
  getAll: (params) => instance.get('/courses', { params }),
  getById: (id) => instance.get(`/courses/${id}`),
  create: (data) => instance.post('/courses', data),
  update: (id, data) => instance.put(`/courses/${id}`, data),
  delete: (id) => instance.delete(`/courses/${id}`),
  finish: (id) => instance.patch(`/courses/${id}/finish`),
  // Cohort assignment (global template model)
  assignToCohort: (id, cohortId) => instance.post(`/courses/${id}/assign-cohort`, { cohortId }),
  removeFromCohort: (id, cohortId) => instance.delete(`/courses/${id}/assign-cohort/${cohortId}`),
  // Team management inside course
  addTeam: (id, data) => instance.post(`/courses/${id}/teams`, data),
  removeTeam: (id, teamId) => instance.delete(`/courses/${id}/teams/${teamId}`),
  assignLeader: (id, teamId, userId) => instance.post(`/courses/${id}/teams/${teamId}/leader`, { userId }),
  addMember: (id, teamId, userId) => instance.post(`/courses/${id}/teams/${teamId}/members`, { userId }),
  removeMember: (id, teamId, userId) => instance.delete(`/courses/${id}/teams/${teamId}/members/${userId}`),
  getTasks: (id) => instance.get(`/courses/${id}/tasks`),
};

// ── COHORT API ────────────────────────────────────────────────────────────────
export const cohortAPI = {
  getAll: () => instance.get('/cohorts'),
  getById: (id) => instance.get(`/cohorts/${id}`),
  create: (data) => instance.post('/cohorts', data),
  update: (id, data) => instance.put(`/cohorts/${id}`, data),
  delete: (id) => instance.delete(`/cohorts/${id}`),
  assignInstructor: (id, instructorId) => instance.post(`/cohorts/${id}/instructor`, { instructorId }),
  removeInstructor: (id, userId) => instance.delete(`/cohorts/${id}/instructor/${userId}`),
  // Course management
  addCourse: (id, courseId) => instance.post(`/cohorts/${id}/courses`, { courseId }),
  removeCourse: (id, courseId) => instance.delete(`/cohorts/${id}/courses/${courseId}`),
  // Student management
  getStudents: (id, params) => instance.get(`/cohorts/${id}/students`, { params }),
  addStudent: (id, studentId) => instance.post(`/cohorts/${id}/students`, { studentId }),
  bulkAddStudents: (id, studentIds) => instance.post(`/cohorts/${id}/students/bulk`, { studentIds }),
  removeStudent: (id, userId) => instance.delete(`/cohorts/${id}/students/${userId}`),
};

// ── NOTIFICATION API ──────────────────────────────────────────────────────────
export const notificationAPI = {
  getNotifications: () => instance.get('/notifications'),
  markAsRead: (id) => instance.put(`/notifications/${id}/read`),
  markAllAsRead: () => instance.put('/notifications/read-all'),
};

// ── PROFILE API ───────────────────────────────────────────────────────────────
export const profileAPI = {
  getAll: () => instance.get('/profiles'),
  getStudents: (params) => instance.get('/profiles/students', { params }),
  getInstructors: () => instance.get('/profiles/instructors'),
  getById: (id) => instance.get(`/profiles/${id}`),
  update: (id, data) => instance.put(`/profiles/${id}`, data),
};

// ── ORGANIZATION API ──────────────────────────────────────────────────────────
export const organizationAPI = {
  getAll: () => instance.get('/organizations'),
  getById: (id) => instance.get(`/organizations/${id}`),
  create: (data) => instance.post('/organizations', data),
  update: (id, data) => instance.put(`/organizations/${id}`, data),
  getUsers: (id) => instance.get(`/organizations/${id}/users`),
};

// ── FILES API ─────────────────────────────────────────────────────────────────
export const filesAPI = {
  getAll: (params) => instance.get('/files', { params }),
  getById: (id) => instance.get(`/files/${id}`),
  upload: (formData) => instance.post('/files/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  delete: (id) => instance.delete(`/files/${id}`),
};

// ── ACTIVITY LOGS API ─────────────────────────────────────────────────────────
export const activityLogsAPI = {
  getAll: (params) => instance.get('/activity-logs', { params }),
  getByResource: (type, id) => instance.get(`/activity-logs/resource/${type}/${id}`),
  getByUser: (userId) => instance.get(`/activity-logs/user/${userId}`),
};

// ── CHAT API ─────────────────────────────────────────────────────────────────
export const chatAPI = {
  getRooms: () => instance.get('/chat/rooms'),
  createRoom: (data) => instance.post('/chat/rooms', data),
  getMessages: (roomId, params) =>
    instance.get(`/chat/rooms/${roomId}/messages`, { params }),
  sendMessage: (roomId, content) =>
    instance.post(`/chat/rooms/${roomId}/messages`, { content }),
  getUsers: () => instance.get('/chat/users'),
  getOrCreateDM: (userId) => instance.post(`/chat/dm/${userId}`),
  getUnreadDMs: () => instance.get('/chat/dm/unread'),
};

// ── ROLES API ─────────────────────────────────────────────────────────────────
export const rolesAPI = {
  getAll: () => instance.get('/roles'),
  create: (data) => instance.post('/roles', data),
  update: (id, data) => instance.put(`/roles/${id}`, data),
  delete: (id) => instance.delete(`/roles/${id}`),
  getUserRoles: (userId) => instance.get(`/roles/user/${userId}`),
  assign: (data) => instance.post('/roles/assign', data),
};

// ── Default export for backward compatibility ─────────────────────────────────
const api = {
  authAPI,
  taskAPI,
  submissionAPI,
  teamAPI,
  checkInAPI,
  chatAPI,
  reportsAPI,
  analyticsAPI,
  notificationAPI,
  courseAPI,
  cohortAPI,
  profileAPI,
  organizationAPI,
  filesAPI,
  activityLogsAPI,
  rolesAPI,
};
export default api;
