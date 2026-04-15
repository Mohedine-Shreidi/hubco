import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, User, Settings, LogOut, ChevronDown, Shield } from 'lucide-react';
import NotificationBell from './NotificationBell';
import ThemeToggle from './ThemeToggle';
import Avatar from './Avatar';
import { useAuth } from '../hooks/useAuth';

/**
 * Navbar Component
 * Top navigation bar with menu toggle, notifications, theme toggle, and profile dropdown
 */
const Navbar = ({ onMenuClick }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getRoleLabel = (role) => {
    const labels = { admin: 'Administrator', instructor: 'Instructor', student: 'Student', team_leader: 'Team Leader' };
    return labels[role] || role;
  };

  const getRoleBadgeColor = (role) => {
    const colors = { admin: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', instructor: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400', student: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', team_leader: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' };
    return colors[role] || 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
  };

  const handleLogout = () => {
    setProfileOpen(false);
    logout();
  };

  return (
    <nav className="bg-white dark:bg-gray-800 shadow-soft sticky top-0 z-30 border-b border-gray-200 dark:border-gray-700">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left section - Menu toggle */}
          <div className="flex items-center">
            <button
              onClick={onMenuClick}
              className="lg:hidden p-2 rounded-md text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
              aria-label="Toggle menu"
            >
              <Menu size={24} />
            </button>

            {/* Logo for mobile */}
            <div className="lg:hidden ml-3 flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-700 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">H</span>
              </div>
              <span className="text-lg font-bold text-gray-800 dark:text-white">HubConnect</span>
            </div>
          </div>

          {/* Center section - Page title (hidden on mobile) */}
          <div className="hidden lg:block flex-1 ml-8">
            <h1 className="text-xl font-semibold text-gray-800 dark:text-white">
              Welcome back, {user?.name}!
            </h1>
          </div>

          {/* Right section - Theme + Notifications + Profile */}
          <div className="flex items-center space-x-2">
            <ThemeToggle />
            <NotificationBell />

            {/* Profile Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <Avatar name={user?.name || 'U'} imageUrl={user?.avatarUrl} size={36} role={user?.role} />
                <div className="hidden md:block text-left">
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-100 leading-tight">{user?.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 leading-tight capitalize">{user?.role?.replace('_', ' ')}</p>
                </div>
                <ChevronDown className={`w-4 h-4 text-gray-400 dark:text-gray-500 hidden md:block transition-transform ${profileOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown Menu */}
              {profileOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 py-2 z-50">
                  {/* User Info Header */}
                  <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                      <Avatar name={user?.name || 'U'} imageUrl={user?.avatarUrl} size={44} role={user?.role} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{user?.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user?.email}</p>
                        <span className={`inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeColor(user?.role)}`}>
                          <Shield className="w-3 h-3" />
                          {getRoleLabel(user?.role)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Menu Items */}
                  <div className="py-1">
                    <button
                      onClick={() => { setProfileOpen(false); navigate('/profile'); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    > 
                      <User className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                      My Profile
                    </button>
                    <button
                      onClick={() => { setProfileOpen(false); navigate('/profile?tab=settings'); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      <Settings className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                      Account Settings
                    </button>
                  </div>

                  {/* Logout */}
                  <div className="border-t border-gray-100 dark:border-gray-700 pt-1">
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
