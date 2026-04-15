import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { reportsAPI, checkInAPI, teamAPI } from '../services/api';
import { ROLES } from '../utils/constants';
import {
  Calendar,
  Clock,
  Users,
  Download,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  XCircle,
  AlertCircle,
  Timer,
  BarChart3,
  Filter
} from 'lucide-react';

export default function DailyReports() {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [viewMode, setViewMode] = useState('daily'); // daily | weekly | monthly
  const [report, setReport] = useState(null);
  const [teams, setTeams] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [weeklyData, setWeeklyData] = useState([]);
  const [monthlyData, setMonthlyData] = useState([]);

  const isAdmin = user.role === ROLES.ADMIN || user.role === ROLES.INSTRUCTOR;

  const fetchReport = useCallback(async () => {
    if (!isAdmin) return;
    try {
      setLoading(true);
      setError('');

      if (viewMode === 'daily') {
        const [reportRes, teamsRes] = await Promise.all([
          reportsAPI.getDailyReport(selectedDate),
          teamAPI.getAll()
        ]);
        setReport(reportRes.data);
        setTeams(teamsRes.data);
      } else if (viewMode === 'weekly') {
        // Fetch 7 days of data
        const d = new Date(selectedDate);
        const dayOfWeek = d.getDay();
        const startOfWeek = new Date(d);
        startOfWeek.setDate(d.getDate() - dayOfWeek);
        const promises = [];
        for (let i = 0; i < 7; i++) {
          const dd = new Date(startOfWeek);
          dd.setDate(startOfWeek.getDate() + i);
          const dateStr = dd.toISOString().split('T')[0];
          promises.push(
            reportsAPI.getDailyReport(dateStr).then(r => ({ date: dateStr, data: r.data })).catch(() => ({ date: dateStr, data: null }))
          );
        }
        const [teamsRes, ...rest] = await Promise.all([teamAPI.getAll(), ...promises]);
        setTeams(teamsRes.data);
        setWeeklyData(rest);
        setReport(null);
      } else {
        // Monthly - fetch current month
        const d = new Date(selectedDate);
        const year = d.getFullYear();
        const month = d.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const promises = [];
        for (let i = 1; i <= daysInMonth; i++) {
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
          promises.push(
            reportsAPI.getDailyReport(dateStr).then(r => ({ date: dateStr, data: r.data })).catch(() => ({ date: dateStr, data: null }))
          );
        }
        const [teamsRes, ...rest] = await Promise.all([teamAPI.getAll(), ...promises]);
        setTeams(teamsRes.data);
        setMonthlyData(rest);
        setReport(null);
      }
    } catch (err) {
      setError('Failed to load report');
    } finally {
      setLoading(false);
    }
  }, [selectedDate, isAdmin, viewMode]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const changeDate = (days) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '--:--';
    return new Date(dateStr).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const calculateHours = (checkIn, checkOut) => {
    if (!checkIn || !checkOut) return null;
    const diff = new Date(checkOut) - new Date(checkIn);
    return (diff / 3600000).toFixed(1);
  };

  const filteredRecords = report?.attendance?.records?.filter(r => {
    if (selectedTeam === 'all') return true;
    return String(r.team_id) === selectedTeam;
  }) || [];

  const stats = {
    total: filteredRecords.length,
    checkedOut: filteredRecords.filter(r => r.check_out_time).length,
    stillIn: filteredRecords.filter(r => !r.check_out_time).length,
    avgHours: (() => {
      const completed = filteredRecords.filter(r => r.check_out_time);
      if (completed.length === 0) return 0;
      const total = completed.reduce((sum, r) => {
        return sum + (parseFloat(calculateHours(r.check_in_time, r.check_out_time)) || 0);
      }, 0);
      return (total / completed.length).toFixed(1);
    })()
  };

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Attendance Reports</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">View daily, weekly, and monthly check-in records</p>
        </div>

        <button
          onClick={() => {
            const csv = [
              ['Name', 'Team', 'Check In', 'Check Out', 'Hours', 'Notes'].join(','),
              ...filteredRecords.map(r => [
                r.full_name,
                r.team_name || '--',
                formatTime(r.check_in_time),
                r.check_out_time ? formatTime(r.check_out_time) : '--',
                calculateHours(r.check_in_time, r.check_out_time) || '--',
                `"${(r.notes || '').replace(/"/g, '""')}"`
              ].join(','))
            ].join('\n');
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `daily-report-${selectedDate}.csv`;
            a.click();
            URL.revokeObjectURL(url);
          }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      {/* View Mode Tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg w-fit">
        {['daily', 'weekly', 'monthly'].map((mode) => (
          <button
            key={mode}
            onClick={() => setViewMode(mode)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors capitalize ${viewMode === mode
                ? 'bg-white dark:bg-gray-700 text-primary-700 dark:text-primary-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
              }`}
          >
            {mode}
          </button>
        ))}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500" />
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {/* Date Selector & Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 flex items-center gap-3">
          <button onClick={() => changeDate(-1)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
            <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary-600" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="border-0 text-sm font-medium text-gray-900 dark:text-white focus:ring-0 p-0 dark:bg-gray-800"
            />
          </div>
          <button onClick={() => changeDate(1)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
            <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
          <button
            onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
            className="text-xs text-primary-600 hover:text-primary-700 font-medium ml-2"
          >
            Today
          </button>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 flex items-center gap-3">
          <Filter className="w-5 h-5 text-gray-400" />
          <select
            value={selectedTeam}
            onChange={(e) => setSelectedTeam(e.target.value)}
            className="border-0 text-sm font-medium text-gray-900 dark:text-white focus:ring-0 p-0 dark:bg-gray-800"
          >
            <option value="all">All Teams</option>
            {teams.map(team => (
              <option key={team.id} value={String(team.id)}>{team.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Stats Cards */}
      {viewMode === 'daily' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
                <Users className="w-5 h-5 text-primary-600" />
              </div>
              <span className="text-sm text-gray-500 dark:text-gray-400">Total Check-ins</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <span className="text-sm text-gray-500 dark:text-gray-400">Completed</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.checkedOut}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                <Clock className="w-5 h-5 text-yellow-600" />
              </div>
              <span className="text-sm text-gray-500 dark:text-gray-400">Still Working</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.stillIn}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Timer className="w-5 h-5 text-blue-600" />
              </div>
              <span className="text-sm text-gray-500 dark:text-gray-400">Avg. Hours</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.avgHours}h</p>
          </div>
        </div>
      )}

      {/* Daily Records Table */}
      {viewMode === 'daily' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-5 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-gray-400" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Attendance Records</h2>
            <span className="text-sm text-gray-400 ml-2">({filteredRecords.length} records)</span>
          </div>
          <div className="overflow-x-auto">
            {filteredRecords.length === 0 ? (
              <div className="p-12 text-center text-gray-400">
                <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="font-medium">No records for this date</p>
                <p className="text-sm mt-1">No one has checked in on {new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-700">
                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Student</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Team</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Check In</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Check Out</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Hours</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredRecords.map((record) => {
                    const hours = calculateHours(record.check_in_time, record.check_out_time);
                    return (
                      <tr key={record.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                              <span className="text-primary-700 font-medium text-sm">
                                {record.full_name?.charAt(0) || '?'}
                              </span>
                            </div>
                            <span className="text-sm font-medium text-gray-900 dark:text-white">{record.full_name}</span>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-sm text-gray-600 dark:text-gray-400">{record.team_name || '--'}</td>
                        <td className="px-5 py-4 text-sm text-gray-600 dark:text-gray-400">{formatTime(record.check_in_time)}</td>
                        <td className="px-5 py-4 text-sm text-gray-600 dark:text-gray-400">
                          {record.check_out_time ? formatTime(record.check_out_time) : '--'}
                        </td>
                        <td className="px-5 py-4 text-sm text-gray-600 dark:text-gray-400 font-medium">
                          {hours ? `${hours}h` : '--'}
                        </td>
                        <td className="px-5 py-4">
                          {record.check_out_time ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                              <CheckCircle className="w-3 h-3" />
                              Complete
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400">
                              <Clock className="w-3 h-3" />
                              Working
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-4 text-sm text-gray-500 dark:text-gray-400 max-w-xs truncate">
                          {record.notes || '--'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Weekly View */}
      {viewMode === 'weekly' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-5 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Weekly Overview</h2>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-7 gap-2 mb-6">
              {weeklyData.map((day) => {
                const count = day.data?.attendance?.records?.length || 0;
                const isToday = day.date === new Date().toISOString().split('T')[0];
                const hasActivity = count > 0;
                return (
                  <button
                    key={day.date}
                    onClick={() => { setSelectedDate(day.date); setViewMode('daily'); }}
                    className={`p-3 rounded-lg text-center transition-colors border-2 ${isToday ? 'border-primary-500' : 'border-transparent'
                      } ${hasActivity
                        ? 'bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30'
                        : 'bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600'
                      }`}
                  >
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}
                    </p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white mt-1">
                      {new Date(day.date).getDate()}
                    </p>
                    {hasActivity && (
                      <span className="inline-block mt-1 w-2 h-2 bg-green-500 rounded-full" />
                    )}
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{count} check-ins</p>
                  </button>
                );
              })}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-700">
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Day</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Check-ins</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Completed</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Avg Hours</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {weeklyData.map((day) => {
                    const records = day.data?.attendance?.records || [];
                    const completed = records.filter(r => r.check_out_time).length;
                    const avgH = completed > 0 ? (records.filter(r => r.check_out_time).reduce((s, r) => s + (parseFloat(calculateHours(r.check_in_time, r.check_out_time)) || 0), 0) / completed).toFixed(1) : '0';
                    return (
                      <tr key={day.date} className={`hover:bg-gray-50 dark:hover:bg-gray-700 ${records.length > 0 ? 'bg-green-50/50 dark:bg-green-900/10' : ''}`}>
                        <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                          {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                          {records.length > 0 && <span className="ml-2 w-2 h-2 bg-green-500 rounded-full inline-block" />}
                        </td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{records.length}</td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{completed}</td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{avgH}h</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Monthly View */}
      {viewMode === 'monthly' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-5 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Monthly Overview — {new Date(selectedDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </h2>
          </div>
          <div className="p-5">
            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                <div key={d} className="text-center text-xs font-medium text-gray-500 dark:text-gray-400 py-1">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {(() => {
                const d = new Date(selectedDate);
                const firstDay = new Date(d.getFullYear(), d.getMonth(), 1).getDay();
                const blanks = Array.from({ length: firstDay }, (_, i) => (
                  <div key={`blank-${i}`} />
                ));
                const days = monthlyData.map((day) => {
                  const count = day.data?.attendance?.records?.length || 0;
                  const isToday = day.date === new Date().toISOString().split('T')[0];
                  return (
                    <button
                      key={day.date}
                      onClick={() => { setSelectedDate(day.date); setViewMode('daily'); }}
                      className={`p-2 rounded-lg text-center text-sm transition-colors ${isToday ? 'ring-2 ring-primary-500' : ''
                        } ${count > 0
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 font-semibold hover:bg-green-200'
                          : 'bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-100'
                        }`}
                    >
                      <span>{new Date(day.date).getDate()}</span>
                      {count > 0 && (
                        <div className="text-[10px] mt-0.5">{count}</div>
                      )}
                    </button>
                  );
                });
                return [...blanks, ...days];
              })()}
            </div>
            {/* Monthly summary table */}
            <div className="mt-6 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-700">
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Metric</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  <tr>
                    <td className="px-4 py-3 text-gray-900 dark:text-white font-medium">Active Days</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{monthlyData.filter(d => (d.data?.attendance?.records?.length || 0) > 0).length}</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-gray-900 dark:text-white font-medium">Total Check-ins</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{monthlyData.reduce((s, d) => s + (d.data?.attendance?.records?.length || 0), 0)}</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-gray-900 dark:text-white font-medium">Total Hours</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                      {monthlyData.reduce((s, d) => {
                        const records = d.data?.attendance?.records || [];
                        return s + records.reduce((rs, r) => rs + (parseFloat(calculateHours(r.check_in_time, r.check_out_time)) || 0), 0);
                      }, 0).toFixed(1)}h
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
