import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { checkInAPI } from '../services/api';
import {
  Clock,
  LogIn,
  LogOut,
  CheckCircle,
  AlertCircle,
  Calendar,
  Timer,
  FileText
} from 'lucide-react';

export default function CheckInOut() {
  const { user } = useAuth();
  const [todayStatus, setTodayStatus] = useState(null);
  const [history, setHistory] = useState([]);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [statusRes, historyRes] = await Promise.all([
        checkInAPI.getTodayStatus(),
        checkInAPI.getUserHistory()
      ]);
      setTodayStatus(statusRes.data);
      setHistory(historyRes.data);
    } catch (err) {
      setError('Failed to load attendance data');
    } finally {
      setLoading(false);
    }
  }, [user.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleCheckIn = async () => {
    try {
      setActionLoading(true);
      setError('');
      await checkInAPI.checkIn(notes);
      setSuccess('Checked in successfully!');
      setNotes('');
      await fetchData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to check in');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCheckOut = async () => {
    try {
      setActionLoading(true);
      setError('');
      await checkInAPI.checkOut(notes);
      setSuccess('Checked out successfully!');
      setNotes('');
      await fetchData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to check out');
    } finally {
      setActionLoading(false);
    }
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '--:--';
    return new Date(dateStr).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const calculateHours = (checkIn, checkOut) => {
    if (!checkIn || !checkOut) return '--';
    const diff = new Date(checkOut) - new Date(checkIn);
    const hours = Math.floor(diff / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    return `${hours}h ${mins}m`;
  };

  const isCheckedIn = !!todayStatus && !todayStatus.check_out_time;
  const isCheckedOut = !!todayStatus?.check_out_time;
  const hasNotCheckedIn = !todayStatus;

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
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Daily Attendance</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Check in and out to track your daily attendance</p>
      </div>

      {/* Alerts */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
          <p className="text-green-700 text-sm">{success}</p>
        </div>
      )}

      {/* Live Clock & Status Card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8">
        <div className="text-center">
          {/* Live Clock */}
          <div className="mb-6">
            <div className="text-5xl font-mono font-bold text-gray-900 dark:text-white">
              {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
            </div>
            <p className="text-gray-500 dark:text-gray-400 mt-2">
              {currentTime.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>

          {/* Status Badge */}
          <div className="mb-6">
            {hasNotCheckedIn && (
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-300 text-sm font-medium">
                <Clock className="w-4 h-4" />
                Not checked in yet
              </span>
            )}
            {isCheckedIn && (
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-sm font-medium">
                <CheckCircle className="w-4 h-4" />
                Checked in at {formatTime(todayStatus.check_in_time)}
              </span>
            )}
            {isCheckedOut && (
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-sm font-medium">
                <CheckCircle className="w-4 h-4" />
                Completed — {calculateHours(todayStatus.check_in_time, todayStatus.check_out_time)} today
              </span>
            )}
          </div>

          {/* Notes Input */}
          {!isCheckedOut && (
            <div className="max-w-md mx-auto mb-6">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={hasNotCheckedIn ? "What are you planning to work on today?" : "What did you accomplish today?"}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none text-sm dark:bg-gray-700 dark:text-white"
                rows={2}
              />
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-center gap-4">
            {hasNotCheckedIn && (
              <button
                onClick={handleCheckIn}
                disabled={actionLoading}
                className="inline-flex items-center gap-2 px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-lg"
              >
                <LogIn className="w-5 h-5" />
                {actionLoading ? 'Checking in...' : 'Check In'}
              </button>
            )}
            {isCheckedIn && (
              <button
                onClick={handleCheckOut}
                disabled={actionLoading}
                className="inline-flex items-center gap-2 px-8 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-lg"
              >
                <LogOut className="w-5 h-5" />
                {actionLoading ? 'Checking out...' : 'Check Out'}
              </button>
            )}
            {isCheckedOut && (
              <div className="text-green-600 font-medium flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                You&apos;re all done for today!
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Today's Details */}
      {todayStatus && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <LogIn className="w-5 h-5 text-green-600" />
              </div>
              <span className="text-sm text-gray-500 dark:text-gray-400">Check In</span>
            </div>
            <p className="text-xl font-semibold text-gray-900 dark:text-white">{formatTime(todayStatus.check_in_time)}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                <LogOut className="w-5 h-5 text-red-600" />
              </div>
              <span className="text-sm text-gray-500 dark:text-gray-400">Check Out</span>
            </div>
            <p className="text-xl font-semibold text-gray-900 dark:text-white">
              {todayStatus.check_out_time ? formatTime(todayStatus.check_out_time) : 'In progress...'}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
                <Timer className="w-5 h-5 text-primary-600" />
              </div>
              <span className="text-sm text-gray-500 dark:text-gray-400">Hours</span>
            </div>
            <p className="text-xl font-semibold text-gray-900 dark:text-white">
              {todayStatus.check_out_time
                ? calculateHours(todayStatus.check_in_time, todayStatus.check_out_time)
                : calculateHours(todayStatus.check_in_time, new Date().toISOString())}
            </p>
          </div>
        </div>
      )}

      {/* Notes from today */}
      {todayStatus?.notes && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex items-center gap-2 mb-3">
            <FileText className="w-5 h-5 text-gray-400" />
            <h3 className="font-medium text-gray-900 dark:text-white">Today&apos;s Notes</h3>
          </div>
          <p className="text-gray-600 dark:text-gray-400 text-sm">{todayStatus.notes}</p>
        </div>
      )}

      {/* History */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="p-5 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-gray-400" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Attendance History</h2>
          </div>
        </div>
        <div className="overflow-x-auto">
          {history.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No attendance records yet</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700">
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Check In</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Check Out</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Hours</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {history.map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-5 py-4 text-sm text-gray-900 dark:text-white">{formatDate(record.date)}</td>
                    <td className="px-5 py-4 text-sm text-gray-600 dark:text-gray-400">{formatTime(record.check_in_time)}</td>
                    <td className="px-5 py-4 text-sm text-gray-600 dark:text-gray-400">{record.check_out_time ? formatTime(record.check_out_time) : '--'}</td>
                    <td className="px-5 py-4 text-sm text-gray-600 dark:text-gray-400">{calculateHours(record.check_in_time, record.check_out_time)}</td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${record.check_out_time
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                          : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                        }`}>
                        {record.check_out_time ? 'Complete' : 'In Progress'}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-500 dark:text-gray-400 max-w-xs truncate">{record.notes || '--'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
