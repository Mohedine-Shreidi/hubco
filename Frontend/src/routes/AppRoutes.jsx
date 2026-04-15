import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

// Layout
import DashboardLayout from '../layouts/DashboardLayout';

// Pages
import Login from '../pages/Login';
import Dashboard from '../pages/Dashboard';
import Tasks from '../pages/Tasks';
import CreateTask from '../pages/CreateTask';
import TaskDetails from '../pages/TaskDetails';
import Teams from '../pages/Teams';
import Chat from '../pages/Chat';
import Analytics from '../pages/Analytics';
import CheckInOut from '../pages/CheckInOut';
import DailyReports from '../pages/DailyReports';
import StudentReport from '../pages/StudentReport';
import Profile from '../pages/Profile';
import Courses from '../pages/Courses';
import CourseDetails from '../pages/CourseDetails';
import Cohorts from '../pages/Cohorts';
import CohortDetails from '../pages/CohortDetails';
import Students from '../pages/Students';
import Instructors from '../pages/Instructors';
import NotFound from '../pages/NotFound';

// Component
import RoleGuard from '../components/RoleGuard';

/**
 * AppRoutes Component
 * Defines all application routes with role-based access control
 */
const AppRoutes = () => {
  const { isAuthenticated, loading } = useAuth();

  // Show loading while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary-600"></div>
      </div>
    );
  }

  return (
    <Routes>
      {/* Public Routes */}
      <Route
        path="/login"
        element={
          isAuthenticated() ? <Navigate to="/dashboard" replace /> : <Login />
        }
      />

      {/* Protected Routes - Wrapped in DashboardLayout */}
      <Route
        path="/"
        element={
          <RoleGuard>
            <DashboardLayout />
          </RoleGuard>
        }
      >
        {/* Default redirect */}
        <Route index element={<Navigate to="/dashboard" replace />} />

        {/* Dashboard - All authenticated users */}
        <Route path="dashboard" element={<Dashboard />} />

        {/* Tasks - All authenticated users */}
        <Route path="tasks" element={<Tasks />} />

        {/* Create Task - Instructor, Admin, and Team Leader */}
        <Route
          path="tasks/create"
          element={
            <RoleGuard allowedRoles={['instructor', 'admin', 'team_leader']}>
              <CreateTask />
            </RoleGuard>
          }
        />

        {/* Task Details - All authenticated users */}
        <Route path="tasks/:id" element={<TaskDetails />} />

        {/* Profile - All authenticated users */}
        <Route path="profile" element={<Profile />} />

        {/* Teams - All authenticated users */}
        <Route path="teams" element={<Teams />} />

        {/* Cohorts - Admin and Instructor */}
        <Route
          path="cohorts"
          element={
            <RoleGuard allowedRoles={['admin', 'instructor']}>
              <Cohorts />
            </RoleGuard>
          }
        />
        <Route
          path="cohorts/:id"
          element={
            <RoleGuard allowedRoles={['admin', 'instructor']}>
              <CohortDetails />
            </RoleGuard>
          }
        />

        {/* Courses - All authenticated users */}
        <Route path="courses" element={<Courses />} />
        <Route path="courses/:id" element={<CourseDetails />} />

        {/* Students - Admin and Instructor */}
        <Route
          path="students"
          element={
            <RoleGuard allowedRoles={['admin', 'instructor']}>
              <Students />
            </RoleGuard>
          }
        />

        {/* Instructors - Admin only */}
        <Route
          path="instructors"
          element={
            <RoleGuard allowedRoles={['admin']}>
              <Instructors />
            </RoleGuard>
          }
        />

        {/* Check In/Out - Students and Team Leaders */}
        <Route
          path="attendance"
          element={
            <RoleGuard allowedRoles={['student', 'team_leader']}>
              <CheckInOut />
            </RoleGuard>
          }
        />

        {/* Chat - All authenticated users */}
        <Route path="chat" element={<Chat />} />

        {/* Daily Reports - Instructor and Admin only */}
        <Route
          path="reports/daily"
          element={
            <RoleGuard allowedRoles={['instructor', 'admin']}>
              <DailyReports />
            </RoleGuard>
          }
        />

        {/* Student Reports - Instructor and Admin only */}
        <Route
          path="reports/student"
          element={
            <RoleGuard allowedRoles={['instructor', 'admin']}>
              <StudentReport />
            </RoleGuard>
          }
        />
        <Route
          path="reports/student/:id"
          element={
            <RoleGuard allowedRoles={['instructor', 'admin']}>
              <StudentReport />
            </RoleGuard>
          }
        />

        {/* Analytics - Instructor and Admin only */}
        <Route
          path="analytics"
          element={
            <RoleGuard allowedRoles={['instructor', 'admin']}>
              <Analytics />
            </RoleGuard>
          }
        />
      </Route>

      {/* 404 Not Found */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default AppRoutes;
