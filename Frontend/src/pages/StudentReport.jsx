import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { reportsAPI, teamAPI, cohortAPI } from '../services/api';
import { ROLES } from '../utils/constants';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend
} from 'recharts';
import {
  ArrowLeft,
  User,
  Calendar,
  Clock,
  Award,
  CheckCircle,
  XCircle,
  TrendingUp,
  FileText,
  Download,
  Users,
  AlertCircle,
  ChevronRight,
  Filter,
  Search
} from 'lucide-react';

const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

function StudentReportDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchReport = async () => {
      try {
        setLoading(true);
        const res = await reportsAPI.getStudentReport(id);
        setReport(res.data);
      } catch (err) {
        setError('Failed to load student report');
      } finally {
        setLoading(false);
      }
    };
    fetchReport();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="text-center py-16">
        <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
        <p className="text-gray-500 dark:text-gray-400">{error || 'Report not found'}</p>
        <button onClick={() => navigate(-1)} className="mt-4 text-primary-600 hover:text-primary-700 font-medium text-sm">
          Go Back
        </button>
      </div>
    );
  }

  const { student, attendance, tasks, performanceScore, dailyHours } = report;

  const attendancePieData = [
    { name: 'Present', value: attendance.daysPresent },
    { name: 'Absent', value: attendance.totalDays - attendance.daysPresent }
  ];

  const tasksPieData = [
    { name: 'On Time', value: tasks.onTime },
    { name: 'Late', value: tasks.late },
    { name: 'Pending', value: tasks.pending }
  ];

  const getScoreColor = (score) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 75) return 'text-blue-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreLabel = (score) => {
    if (score >= 90) return 'Excellent';
    if (score >= 75) return 'Good';
    if (score >= 60) return 'Average';
    return 'Needs Improvement';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Student Report</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">End-of-program performance report</p>
        </div>
      </div>

      {/* Student Info & Score */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center">
              <span className="text-primary-700 font-bold text-2xl">{student.name.charAt(0)}</span>
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">{student.name}</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">{student.email}</p>
              <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-700 capitalize">
                {student.role?.replace('_', ' ')}
              </span>
            </div>
          </div>
          <div className="border-t border-gray-100 dark:border-gray-700 pt-4 space-y-2">
            <p className="text-sm"><span className="text-gray-500 dark:text-gray-400">Team:</span> <span className="font-medium text-gray-900 dark:text-white">{student.teamName || '--'}</span></p>
            <p className="text-sm"><span className="text-gray-500 dark:text-gray-400">Program Duration:</span> <span className="font-medium text-gray-900 dark:text-white">{attendance.totalDays} days</span></p>
          </div>
        </div>

        {/* Performance Score */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 flex flex-col items-center justify-center">
          <Award className="w-8 h-8 text-yellow-500 mb-2" />
          <h3 className="text-sm text-gray-500 dark:text-gray-400 mb-3">Overall Performance Score</h3>
          <div className={`text-6xl font-bold ${getScoreColor(performanceScore)}`}>
            {performanceScore}
          </div>
          <p className={`text-sm font-medium mt-2 ${getScoreColor(performanceScore)}`}>
            {getScoreLabel(performanceScore)}
          </p>
          <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-3 mt-4">
            <div
              className={`h-3 rounded-full transition-all ${performanceScore >= 90 ? 'bg-green-500' :
                performanceScore >= 75 ? 'bg-blue-500' :
                  performanceScore >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                }`}
              style={{ width: `${performanceScore}%` }}
            />
          </div>
        </div>

        {/* Quick Stats */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 space-y-4">
          <h3 className="font-semibold text-gray-900 dark:text-white">Quick Summary</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
                <Calendar className="w-4 h-4" /> Attendance Rate
              </span>
              <span className="font-semibold text-gray-900 dark:text-white">{attendance.attendanceRate}%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
                <Clock className="w-4 h-4" /> Total Hours
              </span>
              <span className="font-semibold text-gray-900 dark:text-white">{attendance.totalHours}h</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
                <Clock className="w-4 h-4" /> Avg Daily Hours
              </span>
              <span className="font-semibold text-gray-900 dark:text-white">{attendance.avgDailyHours}h</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
                <CheckCircle className="w-4 h-4" /> Tasks Completed
              </span>
              <span className="font-semibold text-gray-900 dark:text-white">{tasks.submitted}/{tasks.total}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" /> On-Time Rate
              </span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {tasks.submitted > 0 ? Math.round((tasks.onTime / tasks.submitted) * 100) : 0}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Attendance Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Attendance Breakdown</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={attendancePieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {attendancePieData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-6 mt-2">
            {attendancePieData.map((entry, i) => (
              <div key={entry.name} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                <span className="text-sm text-gray-600 dark:text-gray-400">{entry.name} ({entry.value})</span>
              </div>
            ))}
          </div>
        </div>

        {/* Tasks Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Task Performance</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={tasksPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {tasksPieData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-6 mt-2">
            {tasksPieData.map((entry, i) => (
              <div key={entry.name} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                <span className="text-sm text-gray-600 dark:text-gray-400">{entry.name} ({entry.value})</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Daily Hours Trend */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Daily Hours Trend</h3>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={dailyHours}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="hours" stroke="#2563eb" strokeWidth={2} dot={{ r: 4 }} name="Hours Worked" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Detailed Attendance Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="p-5 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-gray-400" />
            <h3 className="font-semibold text-gray-900 dark:text-white">Detailed Attendance Log</h3>
          </div>
        </div>
        <div className="overflow-x-auto">
          {report.attendanceLog && report.attendanceLog.length > 0 ? (
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700">
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Date</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Check In</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Check Out</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Hours</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {report.attendanceLog.map((log, i) => (
                  <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-5 py-4 text-sm text-gray-900 dark:text-white">
                      {new Date(log.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-600 dark:text-gray-400">
                      {log.check_in_time ? new Date(log.check_in_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '--'}
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-600 dark:text-gray-400">
                      {log.check_out_time ? new Date(log.check_out_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '--'}
                    </td>
                    <td className="px-5 py-4 text-sm font-medium text-gray-900 dark:text-white">{log.hours ? `${log.hours}h` : '--'}</td>
                    <td className="px-5 py-4 text-sm text-gray-500 dark:text-gray-400">{log.notes || '--'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-8 text-center text-gray-400">No attendance records found</div>
          )}
        </div>
      </div>
    </div>
  );
}

function StudentReportsList() {
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [cohorts, setCohorts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [cohortFilter, setCohortFilter] = useState('all');
  const [scoreFilter, setScoreFilter] = useState('all');

  useEffect(() => {
    const fetch = async () => {
      try {
        setLoading(true);
        const [res, cohortRes] = await Promise.all([
          reportsAPI.getAllStudentsSummary(),
          cohortAPI.getAll()
        ]);
        // Deduplicate by student id in case the API returns a student in multiple cohorts
        const seen = new Set();
        const unique = (res.data ?? []).filter(s => {
          if (seen.has(s.id)) return false;
          seen.add(s.id);
          return true;
        });
        setStudents(unique);
        setCohorts(Array.isArray(cohortRes?.data) ? cohortRes.data : []);
      } catch (err) {
        setError('Failed to load student summaries');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  const filteredStudents = students.filter((s) => {
    if (search && !(s.name ?? '').toLowerCase().includes(search.toLowerCase())) return false;
    if (cohortFilter !== 'all' && (s.cohortName ?? '') !== cohortFilter) return false;
    if (scoreFilter === 'excellent' && (s.performanceScore ?? 0) < 90) return false;
    if (scoreFilter === 'good' && ((s.performanceScore ?? 0) < 75 || (s.performanceScore ?? 0) >= 90)) return false;
    if (scoreFilter === 'average' && ((s.performanceScore ?? 0) < 60 || (s.performanceScore ?? 0) >= 75)) return false;
    if (scoreFilter === 'low' && (s.performanceScore ?? 0) >= 60) return false;
    return true;
  });

  const getScoreBadge = (score) => {
    if (score >= 90) return 'bg-green-100 text-green-700';
    if (score >= 75) return 'bg-blue-100 text-blue-700';
    if (score >= 60) return 'bg-yellow-100 text-yellow-700';
    return 'bg-red-100 text-red-700';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Student Reports</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">End-of-program performance reports for all students</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500" />
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search students..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
        <select
          value={cohortFilter}
          onChange={(e) => setCohortFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500"
        >
          <option value="all">All Cohorts</option>
          {cohorts.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
        </select>
        <select
          value={scoreFilter}
          onChange={(e) => setScoreFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500"
        >
          <option value="all">All Scores</option>
          <option value="excellent">Excellent (90+)</option>
          <option value="good">Good (75-89)</option>
          <option value="average">Average (60-74)</option>
          <option value="low">Needs Improvement (&lt;60)</option>
        </select>
      </div>

      {/* Student Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredStudents.map((s) => (
          <button
            key={s.id}
            onClick={() => navigate(`/reports/student/${s.id}`)}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5 text-left hover:shadow-md hover:border-primary-200 transition-all group"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center">
                  <span className="text-primary-700 font-bold text-lg">{s.name.charAt(0)}</span>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">{s.name}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{s.teamName || 'No Team'}</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-primary-500 transition-colors" />
            </div>

            <div className="mt-4 grid grid-cols-3 gap-3">
              <div className="text-center">
                <p className="text-xs text-gray-500 dark:text-gray-400">Score</p>
                <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-sm font-bold ${getScoreBadge(s.performanceScore)}`}>
                  {s.performanceScore}
                </span>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-500 dark:text-gray-400">Attendance</p>
                <p className="text-sm font-bold text-gray-900 dark:text-white mt-1">{s.attendanceRate}%</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-500 dark:text-gray-400">Tasks</p>
                <p className="text-sm font-bold text-gray-900 dark:text-white mt-1">{s.tasksCompleted}/{s.totalTasks}</p>
              </div>
            </div>

            <div className="mt-3 w-full bg-gray-100 dark:bg-gray-600 rounded-full h-2">
              <div
                className={`h-2 rounded-full ${s.performanceScore >= 90 ? 'bg-green-500' :
                  s.performanceScore >= 75 ? 'bg-blue-500' :
                    s.performanceScore >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                style={{ width: `${s.performanceScore}%` }}
              />
            </div>
          </button>
        ))}
      </div>

      {filteredStudents.length === 0 && !error && (
        <div className="text-center py-16">
          <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400">No student data available</p>
        </div>
      )}
    </div>
  );
}

export default function StudentReport() {
  const { id } = useParams();
  const { user } = useAuth();

  const isAdmin = user.role === ROLES.ADMIN || user.role === ROLES.INSTRUCTOR;

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400">You don&apos;t have permission to view reports.</p>
        </div>
      </div>
    );
  }

  if (id) {
    return <StudentReportDetail />;
  }

  return <StudentReportsList />;
}
