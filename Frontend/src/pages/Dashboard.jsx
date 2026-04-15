import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import {
  taskAPI,
  submissionAPI,
  analyticsAPI,
  teamAPI,
  cohortAPI,
  checkInAPI,
  reportsAPI,
} from '../services/api';
import {
  CheckCircle,
  Clock,
  AlertCircle,
  TrendingUp,
  ListTodo,
  Users,
  ArrowRight,
  PlusCircle,
  BarChart3,
  FileText,
  GraduationCap,
  MessageSquare,
  CalendarCheck,
  Trophy,
  UserCheck,
  Target,
  Activity,
  Shield,
} from 'lucide-react';

/* ──────────────────────────────────────────────────────────
   Shared helpers
   ────────────────────────────────────────────────────────── */

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
};

const Loader = () => (
  <div className="flex items-center justify-center h-64">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
  </div>
);

const StatCard = ({ title, value, icon: Icon, bgColor, textColor }) => (
  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-soft p-6 border border-gray-100 dark:border-gray-700 hover:shadow-soft-lg transition-shadow">
    <div className="flex items-center justify-between mb-4">
      <div className={`p-3 rounded-lg ${bgColor}`}>
        <Icon size={24} className={textColor} />
      </div>
    </div>
    <p className="text-gray-600 dark:text-gray-400 text-sm mb-1">{title}</p>
    <p className="text-3xl font-bold text-gray-800 dark:text-white">{value}</p>
  </div>
);

const QuickAction = ({ label, icon: Icon, color, onClick }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center justify-between p-4 bg-gradient-to-r ${color} dark:from-gray-700 dark:to-gray-700 dark:hover:from-gray-600 dark:hover:to-gray-600 rounded-lg transition-colors group`}
  >
    <div className="flex items-center space-x-3">
      <div className={`p-2 rounded-lg ${color.includes('blue') ? 'bg-blue-500' : color.includes('green') ? 'bg-green-500' : color.includes('purple') ? 'bg-purple-500' : color.includes('orange') ? 'bg-orange-500' : color.includes('indigo') ? 'bg-indigo-500' : color.includes('teal') ? 'bg-teal-500' : 'bg-gray-500'}`}>
        <Icon size={20} className="text-white" />
      </div>
      <span className="font-medium text-gray-800 dark:text-gray-200">{label}</span>
    </div>
    <ArrowRight size={20} className="text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300" />
  </button>
);

const TaskItem = ({ task, onClick }) => (
  <div
    onClick={onClick}
    className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg hover:border-primary-300 hover:bg-primary-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
  >
    <div className="flex items-start justify-between mb-2">
      <h3 className="font-medium text-gray-800 dark:text-white flex-1 pr-2">{task.title}</h3>
      <span
        className={`px-2 py-1 rounded text-xs font-medium ${task.status === 'submitted'
          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
          : task.status === 'in_progress'
            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
            : task.status === 'late'
              ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
              : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
          }`}
      >
        {task.status.replace('_', ' ')}
      </span>
    </div>
    <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{task.description}</p>
  </div>
);

/* ══════════════════════════════════════════════════════════
   ADMIN DASHBOARD
   ══════════════════════════════════════════════════════════ */
const AdminDashboard = ({ user }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({});
  const [teamRankings, setTeamRankings] = useState([]);
  const [recentSubmissions, setRecentSubmissions] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const [subStats, cohorts, students, submissions, rankings] = await Promise.all([
          analyticsAPI.getSubmissionStats(),
          cohortAPI.getAll(),
          teamAPI.getAllStudents(),
          submissionAPI.getAllSubmissions(),
          analyticsAPI.getTeamRankings(),
        ]);
        setStats({
          totalStudents: students.data.length,
          totalCohorts: (cohorts.data ?? []).length,
          totalTasks: subStats.data.totalTasks,
          submissionRate: subStats.data.submissionRate,
          totalSubmissions: subStats.data.submittedTasks,
          pendingTasks: subStats.data.pendingTasks,
        });
        setTeamRankings(rankings.data.slice(0, 5));
        setRecentSubmissions(submissions.data.slice(0, 5));
      } catch (e) {
        console.error('Admin dashboard error:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <Loader />;

  const statCards = [
    { title: 'Total Students', value: stats.totalStudents, icon: GraduationCap, bgColor: 'bg-blue-50', textColor: 'text-blue-600' },
    { title: 'Total Cohorts', value: stats.totalCohorts, icon: Users, bgColor: 'bg-purple-50', textColor: 'text-purple-600' },
    { title: 'Total Tasks', value: stats.totalTasks, icon: ListTodo, bgColor: 'bg-indigo-50', textColor: 'text-indigo-600' },
    { title: 'Submission Rate', value: `${stats.submissionRate}%`, icon: TrendingUp, bgColor: 'bg-green-50', textColor: 'text-green-600' },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="bg-gradient-to-r from-gray-800 to-gray-900 rounded-2xl shadow-soft-lg p-8 text-white">
        <div className="flex items-center space-x-3 mb-2">
          <Shield size={28} />
          <span className="text-sm font-medium bg-white/20 px-3 py-1 rounded-full">Admin Panel</span>
        </div>
        <h1 className="text-3xl font-bold mb-2">{getGreeting()}, {user?.name}! 👋</h1>
        <p className="text-gray-300 text-lg">Here&apos;s your system overview.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((s, i) => <StatCard key={i} {...s} />)}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Team Rankings */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-soft p-6 border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Team Rankings</h2>
            <button onClick={() => navigate('/analytics')} className="text-primary-600 hover:text-primary-700 text-sm font-medium flex items-center space-x-1">
              <span>View analytics</span><ArrowRight size={16} />
            </button>
          </div>
          {teamRankings.length === 0 ? (
            <p className="text-center py-8 text-gray-500 dark:text-gray-400">No team data yet</p>
          ) : (
            <div className="space-y-3">
              {teamRankings.map((team, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <span className={`w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold ${idx === 0 ? 'bg-yellow-100 text-yellow-700' : idx === 1 ? 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200' : idx === 2 ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-400'}`}>
                      {idx + 1}
                    </span>
                    <span className="font-medium text-gray-800 dark:text-white">{team.teamName}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-semibold text-primary-600">{team.score}%</span>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{team.submissions} submissions</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-soft p-6 border border-gray-100 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <QuickAction label="Create New Task" icon={PlusCircle} color="from-green-50 to-green-100 hover:from-green-100 hover:to-green-200" onClick={() => navigate('/tasks/create')} />
            <QuickAction label="View Analytics" icon={BarChart3} color="from-indigo-50 to-indigo-100 hover:from-indigo-100 hover:to-indigo-200" onClick={() => navigate('/analytics')} />
            <QuickAction label="Daily Reports" icon={FileText} color="from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200" onClick={() => navigate('/reports/daily')} />
            <QuickAction label="Manage Teams" icon={Users} color="from-purple-50 to-purple-100 hover:from-purple-100 hover:to-purple-200" onClick={() => navigate('/teams')} />
            <QuickAction label="Student Reports" icon={GraduationCap} color="from-orange-50 to-orange-100 hover:from-orange-100 hover:to-orange-200" onClick={() => navigate('/reports/student')} />
          </div>
        </div>
      </div>

      {/* Recent Submissions */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-soft p-6 border border-gray-100 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Recent Submissions</h2>
        {recentSubmissions.length === 0 ? (
          <p className="text-center py-8 text-gray-500 dark:text-gray-400">No submissions yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 dark:text-gray-400 border-b dark:border-gray-700">
                  <th className="pb-3 font-medium">Task ID</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium">Submitted At</th>
                  <th className="pb-3 font-medium">GitHub</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {recentSubmissions.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="py-3 font-medium text-gray-800 dark:text-white">{s.task_id?.slice(0, 8)}…</td>
                    <td className="py-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${s.status === 'on_time' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {s.status === 'on_time' ? 'On Time' : 'Late'}
                      </span>
                    </td>
                    <td className="py-3 text-gray-600 dark:text-gray-400">{new Date(s.submitted_at).toLocaleDateString()}</td>
                    <td className="py-3">
                      {s.github_link ? <a href={s.github_link} target="_blank" rel="noreferrer" className="text-primary-600 hover:underline">View</a> : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════
   INSTRUCTOR DASHBOARD
   ══════════════════════════════════════════════════════════ */
const InstructorDashboard = ({ user }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({});
  const [recentTasks, setRecentTasks] = useState([]);
  const [onTimeLate, setOnTimeLate] = useState({ onTime: 0, late: 0 });

  useEffect(() => {
    (async () => {
      try {
        const [subStats, tasks, otl] = await Promise.all([
          analyticsAPI.getSubmissionStats(),
          taskAPI.getAllTasks(),
          analyticsAPI.getOnTimeLateStats(),
        ]);
        setStats({
          tasksCreated: tasks.data.length,
          submissionsReceived: subStats.data.submittedTasks,
          pendingReviews: subStats.data.pendingTasks,
          onTimeRate: otl.data[0]?.percentage || 0,
        });
        setRecentTasks(tasks.data.slice(0, 5));
        setOnTimeLate({ onTime: otl.data[0]?.value || 0, late: otl.data[1]?.value || 0 });
      } catch (e) {
        console.error('Instructor dashboard error:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <Loader />;

  const statCards = [
    { title: 'Tasks Created', value: stats.tasksCreated, icon: ListTodo, bgColor: 'bg-blue-50', textColor: 'text-blue-600' },
    { title: 'Submissions', value: stats.submissionsReceived, icon: CheckCircle, bgColor: 'bg-green-50', textColor: 'text-green-600' },
    { title: 'Pending', value: stats.pendingReviews, icon: Clock, bgColor: 'bg-orange-50', textColor: 'text-orange-600' },
    { title: 'On-Time Rate', value: `${stats.onTimeRate}%`, icon: Target, bgColor: 'bg-purple-50', textColor: 'text-purple-600' },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-2xl shadow-soft-lg p-8 text-white">
        <div className="flex items-center space-x-3 mb-2">
          <GraduationCap size={28} />
          <span className="text-sm font-medium bg-white/20 px-3 py-1 rounded-full">Instructor</span>
        </div>
        <h1 className="text-3xl font-bold mb-2">{getGreeting()}, {user?.name}! 👋</h1>
        <p className="text-primary-100 text-lg">Monitor student progress and manage tasks.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((s, i) => <StatCard key={i} {...s} />)}
      </div>

      {/* On-time vs Late bar */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-soft p-6 border border-gray-100 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Submission Punctuality</h2>
        <div className="flex items-center space-x-4">
          <div className="flex-1">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-green-600 font-medium">On Time ({onTimeLate.onTime})</span>
              <span className="text-red-600 font-medium">Late ({onTimeLate.late})</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-4 overflow-hidden">
              <div
                className="bg-green-500 h-4 rounded-l-full transition-all"
                style={{ width: `${(onTimeLate.onTime + onTimeLate.late) > 0 ? (onTimeLate.onTime / (onTimeLate.onTime + onTimeLate.late)) * 100 : 50}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Tasks */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-soft p-6 border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Recent Tasks</h2>
            <button onClick={() => navigate('/tasks')} className="text-primary-600 hover:text-primary-700 text-sm font-medium flex items-center space-x-1">
              <span>View all</span><ArrowRight size={16} />
            </button>
          </div>
          {recentTasks.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400"><ListTodo size={48} className="mx-auto mb-3 text-gray-300 dark:text-gray-500" /><p>No tasks created yet</p></div>
          ) : (
            <div className="space-y-3">
              {recentTasks.map((t) => <TaskItem key={t.id} task={t} onClick={() => navigate(`/tasks/${t.id}`)} />)}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-soft p-6 border border-gray-100 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <QuickAction label="Create New Task" icon={PlusCircle} color="from-green-50 to-green-100 hover:from-green-100 hover:to-green-200" onClick={() => navigate('/tasks/create')} />
            <QuickAction label="Daily Reports" icon={FileText} color="from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200" onClick={() => navigate('/reports/daily')} />
            <QuickAction label="Student Reports" icon={GraduationCap} color="from-orange-50 to-orange-100 hover:from-orange-100 hover:to-orange-200" onClick={() => navigate('/reports/student')} />
            <QuickAction label="View Analytics" icon={BarChart3} color="from-indigo-50 to-indigo-100 hover:from-indigo-100 hover:to-indigo-200" onClick={() => navigate('/analytics')} />
            <QuickAction label="Manage Teams" icon={Users} color="from-purple-50 to-purple-100 hover:from-purple-100 hover:to-purple-200" onClick={() => navigate('/teams')} />
          </div>
        </div>
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════
   STUDENT DASHBOARD
   ══════════════════════════════════════════════════════════ */
const StudentDashboard = ({ user }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({});
  const [recentTasks, setRecentTasks] = useState([]);
  const [attendance, setAttendance] = useState(null);
  const [upcomingDeadlines, setUpcomingDeadlines] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const [tasksRes, attendanceRes] = await Promise.all([
          taskAPI.getMyTasks(user.id, user.role, user.teamId),
          checkInAPI.getTodayStatus(user.id),
        ]);
        const tasks = tasksRes.data;
        const submitted = tasks.filter((t) => t.status === 'submitted').length;
        const pending = tasks.filter((t) => t.status === 'pending' || t.status === 'in_progress').length;

        // Upcoming deadlines (tasks with future deadlines, sorted)
        const upcoming = tasks
          .filter((t) => t.due_date && new Date(t.due_date) > new Date() && t.status !== 'submitted')
          .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))
          .slice(0, 3);

        setStats({
          totalTasks: tasks.length,
          completed: submitted,
          pending,
          completionRate: tasks.length > 0 ? Math.round((submitted / tasks.length) * 100) : 0,
        });
        setRecentTasks(tasks.slice(0, 3));
        setAttendance(attendanceRes.data);
        setUpcomingDeadlines(upcoming);
      } catch (e) {
        console.error('Student dashboard error:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  if (loading) return <Loader />;

  const statCards = [
    { title: 'My Tasks', value: stats.totalTasks, icon: ListTodo, bgColor: 'bg-blue-50', textColor: 'text-blue-600' },
    { title: 'Completed', value: stats.completed, icon: CheckCircle, bgColor: 'bg-green-50', textColor: 'text-green-600' },
    { title: 'Pending', value: stats.pending, icon: Clock, bgColor: 'bg-orange-50', textColor: 'text-orange-600' },
    { title: 'Completion Rate', value: `${stats.completionRate}%`, icon: TrendingUp, bgColor: 'bg-purple-50', textColor: 'text-purple-600' },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl shadow-soft-lg p-8 text-white">
        <h1 className="text-3xl font-bold mb-2">{getGreeting()}, {user?.name}! 👋</h1>
        <p className="text-blue-100 text-lg">Stay on track — here&apos;s your personal summary.</p>
        {/* Attendance badge */}
        <div className="mt-4 inline-flex items-center space-x-2 bg-white/20 px-4 py-2 rounded-lg">
          <CalendarCheck size={18} />
          <span className="text-sm font-medium">
            {attendance
              ? attendance.check_out_time
                ? `Checked out`
                : `Checked in at ${new Date(attendance.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
              : 'Not checked in today'}
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((s, i) => <StatCard key={i} {...s} />)}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Deadlines */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-soft p-6 border border-gray-100 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">⏰ Upcoming Deadlines</h2>
          {upcomingDeadlines.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <CheckCircle size={48} className="mx-auto mb-3 text-green-300" />
              <p>All caught up! No upcoming deadlines.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingDeadlines.map((task) => {
                const daysLeft = Math.ceil((new Date(task.due_date) - new Date()) / (1000 * 60 * 60 * 24));
                return (
                  <div
                    key={task.id}
                    onClick={() => navigate(`/tasks/${task.id}`)}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${daysLeft <= 1 ? 'border-red-300 bg-red-50 hover:bg-red-100' : daysLeft <= 3 ? 'border-yellow-300 bg-yellow-50 hover:bg-yellow-100' : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium text-gray-800 dark:text-white">{task.title}</h3>
                      <span className={`text-xs font-bold px-2 py-1 rounded ${daysLeft <= 1 ? 'bg-red-200 text-red-800' : daysLeft <= 3 ? 'bg-yellow-200 text-yellow-800' : 'bg-blue-100 text-blue-800'}`}>
                        {daysLeft <= 0 ? 'Due today!' : `${daysLeft}d left`}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{new Date(task.due_date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-soft p-6 border border-gray-100 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <QuickAction label="View My Tasks" icon={ListTodo} color="from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200" onClick={() => navigate('/tasks')} />
            <QuickAction label="Check In / Out" icon={CalendarCheck} color="from-green-50 to-green-100 hover:from-green-100 hover:to-green-200" onClick={() => navigate('/attendance')} />
            <QuickAction label="Team Chat" icon={MessageSquare} color="from-orange-50 to-orange-100 hover:from-orange-100 hover:to-orange-200" onClick={() => navigate('/chat')} />
            <QuickAction label="My Team" icon={Users} color="from-purple-50 to-purple-100 hover:from-purple-100 hover:to-purple-200" onClick={() => navigate('/teams')} />
          </div>
        </div>
      </div>

      {/* Recent Tasks */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-soft p-6 border border-gray-100 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Recent Tasks</h2>
          <button onClick={() => navigate('/tasks')} className="text-primary-600 hover:text-primary-700 text-sm font-medium flex items-center space-x-1">
            <span>View all</span><ArrowRight size={16} />
          </button>
        </div>
        {recentTasks.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400"><ListTodo size={48} className="mx-auto mb-3 text-gray-300 dark:text-gray-500" /><p>No tasks assigned yet</p></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {recentTasks.map((t) => <TaskItem key={t.id} task={t} onClick={() => navigate(`/tasks/${t.id}`)} />)}
          </div>
        )}
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════
   TEAM LEADER DASHBOARD
   ══════════════════════════════════════════════════════════ */
const TeamLeaderDashboard = ({ user }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({});
  const [recentTasks, setRecentTasks] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [attendance, setAttendance] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const [tasksRes, attendanceRes, membersRes] = await Promise.all([
          taskAPI.getMyTasks(user.id, user.role, user.teamId),
          checkInAPI.getTodayStatus(user.id),
          user.teamId ? teamAPI.getTeamMembers(user.teamId) : Promise.resolve({ data: [] }),
        ]);
        const tasks = tasksRes.data;
        const submitted = tasks.filter((t) => t.status === 'submitted').length;
        const pending = tasks.filter((t) => t.status === 'pending' || t.status === 'in_progress').length;

        setStats({
          teamTasks: tasks.length,
          submitted,
          pending,
          completionRate: tasks.length > 0 ? Math.round((submitted / tasks.length) * 100) : 0,
          teamSize: membersRes.data.length,
        });
        setRecentTasks(tasks.slice(0, 4));
        setTeamMembers(membersRes.data.slice(0, 5));
        setAttendance(attendanceRes.data);
      } catch (e) {
        console.error('Team leader dashboard error:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  if (loading) return <Loader />;

  const statCards = [
    { title: 'Team Tasks', value: stats.teamTasks, icon: ListTodo, bgColor: 'bg-blue-50', textColor: 'text-blue-600' },
    { title: 'Submitted', value: stats.submitted, icon: CheckCircle, bgColor: 'bg-green-50', textColor: 'text-green-600' },
    { title: 'Pending', value: stats.pending, icon: Clock, bgColor: 'bg-orange-50', textColor: 'text-orange-600' },
    { title: 'Team Size', value: stats.teamSize, icon: Users, bgColor: 'bg-purple-50', textColor: 'text-purple-600' },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 rounded-2xl shadow-soft-lg p-8 text-white">
        <div className="flex items-center space-x-3 mb-2">
          <Trophy size={28} />
          <span className="text-sm font-medium bg-white/20 px-3 py-1 rounded-full">Team Leader</span>
        </div>
        <h1 className="text-3xl font-bold mb-2">{getGreeting()}, {user?.name}! 👋</h1>
        <p className="text-indigo-100 text-lg">Lead your team to success — here&apos;s the team overview.</p>
        {/* Attendance badge */}
        <div className="mt-4 inline-flex items-center space-x-2 bg-white/20 px-4 py-2 rounded-lg">
          <CalendarCheck size={18} />
          <span className="text-sm font-medium">
            {attendance
              ? attendance.check_out_time
                ? `Checked out`
                : `Checked in at ${new Date(attendance.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
              : 'Not checked in today'}
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((s, i) => <StatCard key={i} {...s} />)}
      </div>

      {/* Team completion progress */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-soft p-6 border border-gray-100 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-3">Team Completion Progress</h2>
        <div className="flex items-center space-x-4">
          <div className="flex-1">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600 dark:text-gray-400">Progress</span>
              <span className="font-semibold text-primary-600">{stats.completionRate}%</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-4 overflow-hidden">
              <div className="bg-primary-500 h-4 rounded-full transition-all" style={{ width: `${stats.completionRate}%` }} />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Team Members */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-soft p-6 border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Team Members</h2>
            <button onClick={() => navigate('/teams')} className="text-primary-600 hover:text-primary-700 text-sm font-medium flex items-center space-x-1">
              <span>View team</span><ArrowRight size={16} />
            </button>
          </div>
          {teamMembers.length === 0 ? (
            <p className="text-center py-8 text-gray-500 dark:text-gray-400">No members found</p>
          ) : (
            <div className="space-y-3">
              {teamMembers.map((member) => (
                <div key={member.id} className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-semibold text-sm">
                    {(member.full_name || member.name)?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                  <div>
                    <p className="font-medium text-gray-800 dark:text-white">{member.full_name || member.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{member.role === 'team_leader' ? 'Team Leader' : 'Student'}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-soft p-6 border border-gray-100 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <QuickAction label="View Team Tasks" icon={ListTodo} color="from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200" onClick={() => navigate('/tasks')} />
            <QuickAction label="Check In / Out" icon={CalendarCheck} color="from-green-50 to-green-100 hover:from-green-100 hover:to-green-200" onClick={() => navigate('/attendance')} />
            <QuickAction label="Team Chat" icon={MessageSquare} color="from-orange-50 to-orange-100 hover:from-orange-100 hover:to-orange-200" onClick={() => navigate('/chat')} />
            <QuickAction label="View Team" icon={Users} color="from-purple-50 to-purple-100 hover:from-purple-100 hover:to-purple-200" onClick={() => navigate('/teams')} />
          </div>
        </div>
      </div>

      {/* Recent Tasks */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-soft p-6 border border-gray-100 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Recent Team Tasks</h2>
          <button onClick={() => navigate('/tasks')} className="text-primary-600 hover:text-primary-700 text-sm font-medium flex items-center space-x-1">
            <span>View all</span><ArrowRight size={16} />
          </button>
        </div>
        {recentTasks.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400"><ListTodo size={48} className="mx-auto mb-3 text-gray-300 dark:text-gray-500" /><p>No team tasks yet</p></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recentTasks.map((t) => <TaskItem key={t.id} task={t} onClick={() => navigate(`/tasks/${t.id}`)} />)}
          </div>
        )}
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════
   MAIN DASHBOARD — role router
   ══════════════════════════════════════════════════════════ */
const Dashboard = () => {
  const { user, hasRole } = useAuth();

  if (!user) return <Loader />;

  if (hasRole('admin')) return <AdminDashboard user={user} />;
  if (hasRole('instructor')) return <InstructorDashboard user={user} />;
  if (hasRole('team_leader')) return <TeamLeaderDashboard user={user} />;
  return <StudentDashboard user={user} />;
};

export default Dashboard;
