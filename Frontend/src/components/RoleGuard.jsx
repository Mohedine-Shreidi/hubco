import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

/**
 * RoleGuard Component
 * Protects routes based on user roles
 * Redirects unauthorized users to appropriate pages
 * 
 * @param {object} props - Component props
 * @param {React.ReactNode} props.children - Child components to render if authorized
 * @param {string[]} props.allowedRoles - Array of allowed roles
 * @param {string} props.redirectTo - Path to redirect if unauthorized
 */
const RoleGuard = ({ children, allowedRoles = [], redirectTo = '/login' }) => {
  const { user, loading, isAuthenticated } = useAuth();

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  // Check if user has required role
  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    // Redirect based on user role
    if (user.role === 'admin' || user.role === 'instructor') {
      return <Navigate to="/dashboard" replace />;
    } else {
      return <Navigate to="/tasks" replace />;
    }
  }

  // User is authorized, render children
  return children;
};

export default RoleGuard;
