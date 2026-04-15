import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import Avatar from './Avatar';
import {
  LayoutDashboard,
  ListTodo,
  Users,
  MessageSquare,
  BarChart3,
  PlusCircle,
  LogOut,
  Clock,
  FileText,
  GraduationCap,
  Briefcase,
  BookOpen,
  Shield,
  User,
} from 'lucide-react';

/**
 * Sidebar Component
 * Grouped navigation sidebar with role-based menu items.
 *
 * Groups:
 *   • Overview          – Dashboard
 *   • Academic          – Cohorts → Courses → Teams → Tasks (+ Create Task)
 *   • Users             – Students, Instructors  (admin / instructor)
 *   • Activity          – Check In/Out, Chat
 *   • Reports & Insights– Daily Reports, Student Reports, Analytics
 */
const Sidebar = ({ isOpen, onClose }) => {
  const { user, logout, hasRole } = useAuth();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  /**
   * Build grouped nav sections.
   * Each section = { label, items[] }.  Items without matching role are filtered out.
   */
  const getSections = () => {
    const sections = [];

    /* ── Overview ──────────────────────────────────────────── */
    sections.push({
      label: null, // no heading for top-level dashboard
      items: [
        { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, roles: ['admin', 'instructor', 'student', 'team_leader'] },
      ],
    });

    /* ── Academic ──────────────────────────────────────────── */
    const academicItems = [];

    // Cohorts – admin & instructor
    if (hasRole(['admin', 'instructor'])) {
      academicItems.push({ name: 'Cohorts', path: '/cohorts', icon: GraduationCap, roles: ['admin', 'instructor'] });
    }

    academicItems.push(
      { name: 'Courses', path: '/courses', icon: BookOpen, roles: ['admin', 'instructor', 'student', 'team_leader'] },
      { name: 'Teams', path: '/teams', icon: Users, roles: ['admin', 'instructor', 'student', 'team_leader'] },
      { name: 'Tasks', path: '/tasks', icon: ListTodo, roles: ['admin', 'instructor', 'student', 'team_leader'], end: true },
    );

    sections.push({ label: 'Academic', items: academicItems });

    /* ── Users ─────────────────────────────────────────────── */
    if (hasRole(['admin', 'instructor'])) {
      const userItems = [
        { name: 'Students', path: '/students', icon: User, roles: ['admin', 'instructor'] },
      ];
      // Only admin sees the Instructors list
      if (hasRole('admin')) {
        userItems.push({ name: 'Instructors', path: '/instructors', icon: Shield, roles: ['admin'] });
      }
      sections.push({ label: 'Users', items: userItems });
    }

    /* ── Activity ──────────────────────────────────────────── */
    const activityItems = [];

    if (hasRole(['student', 'team_leader'])) {
      activityItems.push({ name: 'Check In/Out', path: '/attendance', icon: Clock, roles: ['student', 'team_leader'] });
    }

    activityItems.push({ name: 'Chat', path: '/chat', icon: MessageSquare, roles: ['admin', 'instructor', 'student', 'team_leader'] });

    sections.push({ label: 'Activity', items: activityItems });

    /* ── Reports & Insights ────────────────────────────────── */
    if (hasRole(['admin', 'instructor'])) {
      sections.push({
        label: 'Reports',
        items: [
          { name: 'Daily Reports', path: '/reports/daily', icon: FileText, roles: ['admin', 'instructor'] },
          { name: 'Student Reports', path: '/reports/student', icon: GraduationCap, roles: ['admin', 'instructor'] },
          { name: 'Analytics', path: '/analytics', icon: BarChart3, roles: ['admin', 'instructor'] },
        ],
      });
    }

    // Filter items within each section by current user role
    return sections
      .map((s) => ({
        ...s,
        items: s.items.filter((i) => i.roles.includes(user?.role)),
      }))
      .filter((s) => s.items.length > 0);
  };

  const sections = getSections();

  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = () => {
    logout();
    onClose();
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-50 h-screen w-64 bg-white dark:bg-gray-800 shadow-soft-lg border-r border-gray-200 dark:border-gray-700 transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-700 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">H</span>
              </div>
              <span className="text-xl font-bold text-gray-800 dark:text-white">HubConnect</span>
            </div>
          </div>

          {/* User info */}
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-3">
              <Avatar name={user?.name || 'U'} imageUrl={user?.avatarUrl} size={40} role={user?.role} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">
                  {user?.name}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 capitalize truncate">
                  {user?.role?.replace('_', ' ')}
                  {user?.teamName && ` · ${user.teamName}`}
                </p>
              </div>
            </div>
          </div>

          {/* Navigation — grouped sections */}
          <nav className="flex-1 overflow-y-auto px-3 py-3">
            {sections.map((section, sIdx) => (
              <div key={sIdx} className={sIdx > 0 ? 'mt-4' : ''}>
                {section.label && (
                  <p className="px-3 mb-1 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                    {section.label}
                  </p>
                )}
                <ul className="space-y-0.5">
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    return (
                      <li key={item.path}>
                        <NavLink
                          to={item.path}
                          end={item.end || false}
                          onClick={onClose}
                          className={({ isActive }) =>
                            `flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors text-[13px] ${isActive
                              ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 font-medium'
                              : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                            }`
                          }
                        >
                          <Icon size={18} />
                          <span>{item.name}</span>
                        </NavLink>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>

          {/* Logout button */}
          <div className="p-3 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={handleLogout}
              className="flex items-center space-x-3 px-3 py-2.5 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 w-full transition-colors text-[13px]"
            >
              <LogOut size={18} />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-sm w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Confirm Logout</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-5">Are you sure you want to log out of HubConnect?</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={confirmLogout}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Sidebar;
