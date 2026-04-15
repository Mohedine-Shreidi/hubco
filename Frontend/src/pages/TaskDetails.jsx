import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { taskAPI, submissionAPI } from '../services/api';
import SubmissionModal from '../components/SubmissionModal';
import {
  ArrowLeft,
  Calendar,
  Clock,
  Users,
  Trash2,
  User,
  Github,
  Upload,
  CheckCircle,
  AlertCircle,
  Star,
  MessageSquare,
  XCircle,
  RotateCcw,
} from 'lucide-react';
import { formatDate, formatDateTime, getDaysRemaining, getStatusColor } from '../utils/helpers';

/**
 * TaskDetails Page
 * Displays detailed task information and submission interface
 */
const TaskDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, hasRole } = useAuth();
  const [task, setTask] = useState(null);
  const [submission, setSubmission] = useState(null);          // student's own submission
  const [allSubmissions, setAllSubmissions] = useState([]);     // all submissions (instructor/admin)
  const [loading, setLoading] = useState(true);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Per-submission grading state (keyed by submission id)
  const [gradeForms, setGradeForms] = useState({});
  const [gradingId, setGradingId] = useState(null);
  const [gradeErrors, setGradeErrors] = useState({});
  const [gradeSuccesses, setGradeSuccesses] = useState({});

  // Per-submission review state
  const [reviewingId, setReviewingId] = useState(null);

  useEffect(() => {
    fetchTaskDetails();
  }, [id]);

  const fetchTaskDetails = async () => {
    try {
      setLoading(true);

      // Fetch task (enriched with assignedStudents + assignedTeams)
      const taskResponse = await taskAPI.getTaskById(id);
      setTask(taskResponse.data);

      const isStaff = hasRole(['instructor', 'admin']);

      if (isStaff) {
        // Instructor / Admin → fetch ALL submissions for this task
        try {
          const subsResponse = await submissionAPI.getSubmissionsByTask(id);
          const subs = Array.isArray(subsResponse.data) ? subsResponse.data : [];
          setAllSubmissions(subs);
          setSubmission(subs.length > 0 ? subs[0] : null); // keep backward compat

          // Initialise grade forms from existing data
          const forms = {};
          subs.forEach((s) => {
            forms[s.id] = {
              grade: s.grade != null ? s.grade : '',
              feedback: s.feedback || '',
            };
          });
          setGradeForms(forms);
        } catch {
          setAllSubmissions([]);
          setSubmission(null);
        }
      } else {
        // Student → check own submission
        try {
          const submissionResponse = await submissionAPI.checkSubmission(id);
          setSubmission(submissionResponse.data || null);
        } catch {
          setSubmission(null);
        }
      }
    } catch (error) {
      console.error('Error fetching task details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenSubmitModal = () => {
    setShowSubmitModal(true);
  };

  const handleCloseSubmitModal = () => {
    setShowSubmitModal(false);
  };

  const handleSubmitSuccess = () => {
    fetchTaskDetails();
  };

  const handleBack = () => {
    navigate('/tasks');
  };

  const handleDeleteTask = async () => {
    try {
      setDeleting(true);
      await taskAPI.deleteTask(id);
      navigate('/tasks');
    } catch (err) {
      console.error('Failed to delete task:', err);
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="text-center py-12">
        <AlertCircle size={64} className="mx-auto text-gray-300 mb-4" />
        <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">Task not found</h2>
        <button
          onClick={handleBack}
          className="text-primary-600 hover:text-primary-700 font-medium"
        >
          Return to tasks
        </button>
      </div>
    );
  }

  const daysRemaining = getDaysRemaining(task.due_date);
  const isOverdue = daysRemaining < 0;
  // Any student or team member can submit (not just team leader)
  const canSubmit = hasRole(['student', 'team_leader']) && !submission;
  const isStaff = hasRole(['instructor', 'admin']);

  /* ── Assess a specific submission ──────────────────────────────────── */
  const handleAssess = async (e, subId) => {
    e.preventDefault();
    setGradeErrors((prev) => ({ ...prev, [subId]: '' }));
    setGradeSuccesses((prev) => ({ ...prev, [subId]: '' }));
    const form = gradeForms[subId] || {};
    const gradeNum = Number(form.grade);
    if (isNaN(gradeNum) || gradeNum < 0 || gradeNum > 100) {
      setGradeErrors((prev) => ({ ...prev, [subId]: 'Grade must be between 0 and 100' }));
      return;
    }
    try {
      setGradingId(subId);
      await submissionAPI.assessSubmission(subId, {
        grade: gradeNum,
        feedback: form.feedback,
      });
      setGradeSuccesses((prev) => ({ ...prev, [subId]: 'Assessment saved successfully' }));
      await fetchTaskDetails();
    } catch (err) {
      setGradeErrors((prev) => ({ ...prev, [subId]: err?.error || 'Failed to save assessment' }));
    } finally {
      setGradingId(null);
    }
  };

  /* ── Review (accept / reject / request revision) ───────────────────── */
  const handleReview = async (subId, status) => {
    try {
      setReviewingId(subId);
      await submissionAPI.reviewSubmission(subId, { status });
      await fetchTaskDetails();
    } catch (err) {
      console.error('Review failed:', err);
    } finally {
      setReviewingId(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={handleBack}
          className="flex items-center space-x-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white mb-4"
        >
          <ArrowLeft size={20} />
          <span>Back to Tasks</span>
        </button>
      </div>

      {/* Main content */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-soft border border-gray-100 dark:border-gray-700">
        {/* Header section */}
        <div className="p-6 border-b">
          <div className="flex items-start justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white flex-1 pr-4">
              {task.title}
            </h1>
            <div className="flex items-center gap-2">
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                  task.status
                )}`}
              >
                {task.status.replace('_', ' ').toUpperCase()}
              </span>
              {isStaff && (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                  title="Delete task"
                >
                  <Trash2 size={18} />
                </button>
              )}
            </div>
          </div>

          {/* Meta information */}
          <div className="flex flex-wrap gap-4 text-sm">
            {/* Deadline */}
            <div className="flex items-center space-x-2">
              <Calendar size={16} className="text-gray-400" />
              <span className="text-gray-600 dark:text-gray-400">Due: {formatDate(task.due_date)}</span>
            </div>

            {/* Days remaining */}
            <div className="flex items-center space-x-2">
              <Clock size={16} className="text-gray-400" />
              <span className={isOverdue ? 'text-red-600' : 'text-gray-600 dark:text-gray-400'}>
                {isOverdue
                  ? `${Math.abs(daysRemaining)} days overdue`
                  : `${daysRemaining} days remaining`}
              </span>
            </div>

            {/* Assignment type */}
            <div className="flex items-center space-x-2">
              {task.assignment_type === 'cohort' ? (
                <>
                  <Users size={16} className="text-gray-400" />
                  <span className="text-gray-600 dark:text-gray-400">Whole Cohort</span>
                </>
              ) : task.assigned_teams?.length > 0 ? (
                <>
                  <Users size={16} className="text-gray-400" />
                  <span className="text-gray-600 dark:text-gray-400">{task.assigned_teams.map(t => t.name).join(', ')}</span>
                </>
              ) : task.assigned_students?.length > 0 ? (
                <>
                  <User size={16} className="text-gray-400" />
                  <span className="text-gray-600 dark:text-gray-400">{task.assigned_students.map(s => s.full_name).join(', ')}</span>
                </>
              ) : (
                <>
                  <User size={16} className="text-gray-400" />
                  <span className="text-gray-600 dark:text-gray-400">Individual Task</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-3">Description</h2>
          <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
            {task.description}
          </p>
        </div>

        {/* GitHub Repository */}
        {task.github_repo_url && (
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-3">
              GitHub Repository
            </h2>
            <a
              href={task.github_repo_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-2 text-primary-600 hover:text-primary-700 font-medium"
            >
              <Github size={20} />
              <span>{task.github_repo_url}</span>
            </a>
          </div>
        )}

        {/* ────────────────────────────────────────────────────────────────
             Submission section — different views for student vs staff
             ──────────────────────────────────────────────────────────────── */}
        <div className="p-6">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-3">
            {isStaff ? `Submissions (${allSubmissions.length})` : 'Submission'}
          </h2>

          {/* ── INSTRUCTOR / ADMIN VIEW ────────────────────────────────────── */}
          {isStaff ? (
            allSubmissions.length > 0 ? (
              <div className="space-y-6">
                {allSubmissions.map((sub) => {
                  const form = gradeForms[sub.id] || { grade: '', feedback: '' };
                  const isGradingThis = gradingId === sub.id;
                  const isReviewingThis = reviewingId === sub.id;

                  return (
                    <div
                      key={sub.id}
                      className="bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg p-5 space-y-4"
                    >
                      {/* Submission header */}
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 rounded-full flex items-center justify-center font-bold text-sm">
                            {(sub.submitted_by_name || 'S')[0]}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-800 dark:text-white">
                              {sub.submitted_by_name || 'Unknown Student'}
                            </p>
                            {sub.team_name && (
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                Team: {sub.team_name}
                              </p>
                            )}
                          </div>
                        </div>
                        <span
                          className={`px-2 py-1 text-xs rounded font-medium ${sub.status === 'accepted'
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                              : sub.status === 'rejected'
                                ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                                : sub.status === 'revision_requested'
                                  ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                                  : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                            }`}
                        >
                          {(sub.status || 'submitted').replace(/_/g, ' ').toUpperCase()}
                        </span>
                      </div>

                      {/* Submission details */}
                      <div className="grid sm:grid-cols-2 gap-2 text-sm text-gray-600 dark:text-gray-300">
                        <p>
                          <span className="font-medium">Submitted:</span>{' '}
                          {formatDateTime(sub.submitted_at)}
                        </p>
                        {sub.github_link && (
                          <p>
                            <span className="font-medium">GitHub:</span>{' '}
                            <a
                              href={sub.github_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary-600 hover:underline"
                            >
                              {sub.github_link}
                            </a>
                          </p>
                        )}
                        {sub.comment && (
                          <p className="sm:col-span-2">
                            <span className="font-medium">Comment:</span> {sub.comment}
                          </p>
                        )}
                        {sub.grade != null && (
                          <p className="flex items-center gap-1">
                            <Star size={14} className="text-yellow-500" />
                            <span className="font-medium">Grade:</span>{' '}
                            <strong>{sub.grade}/100</strong>
                          </p>
                        )}
                      </div>

                      {/* Review buttons */}
                      <div className="flex flex-wrap gap-2">
                        {sub.status !== 'accepted' && (
                          <button
                            onClick={() => handleReview(sub.id, 'accepted')}
                            disabled={isReviewingThis}
                            className="flex items-center gap-1 px-3 py-1.5 text-sm bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50"
                          >
                            <CheckCircle size={14} /> Accept
                          </button>
                        )}
                        {sub.status !== 'rejected' && (
                          <button
                            onClick={() => handleReview(sub.id, 'rejected')}
                            disabled={isReviewingThis}
                            className="flex items-center gap-1 px-3 py-1.5 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50"
                          >
                            <XCircle size={14} /> Reject
                          </button>
                        )}
                        {sub.status !== 'revision_requested' && (
                          <button
                            onClick={() => handleReview(sub.id, 'revision_requested')}
                            disabled={isReviewingThis}
                            className="flex items-center gap-1 px-3 py-1.5 text-sm bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg transition-colors disabled:opacity-50"
                          >
                            <RotateCcw size={14} /> Request Revision
                          </button>
                        )}
                      </div>

                      {/* Grading form */}
                      <form
                        onSubmit={(e) => handleAssess(e, sub.id)}
                        className="border-t border-gray-200 dark:border-gray-600 pt-4 space-y-3"
                      >
                        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-1">
                          <Star size={14} className="text-yellow-500" /> Assessment
                        </h4>

                        {gradeErrors[sub.id] && (
                          <p className="text-sm text-red-600 dark:text-red-400">
                            {gradeErrors[sub.id]}
                          </p>
                        )}
                        {gradeSuccesses[sub.id] && (
                          <p className="text-sm text-green-600 dark:text-green-400 flex items-center gap-1">
                            <CheckCircle size={14} /> {gradeSuccesses[sub.id]}
                          </p>
                        )}

                        <div className="flex flex-col sm:flex-row gap-3">
                          <div className="sm:w-32">
                            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                              Grade (0–100)
                            </label>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={form.grade}
                              onChange={(e) =>
                                setGradeForms((prev) => ({
                                  ...prev,
                                  [sub.id]: { ...prev[sub.id], grade: e.target.value },
                                }))
                              }
                              placeholder="85"
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                              required
                              disabled={isGradingThis}
                            />
                          </div>
                          <div className="flex-1">
                            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                              Feedback
                            </label>
                            <textarea
                              value={form.feedback}
                              onChange={(e) =>
                                setGradeForms((prev) => ({
                                  ...prev,
                                  [sub.id]: { ...prev[sub.id], feedback: e.target.value },
                                }))
                              }
                              rows={2}
                              placeholder="Write feedback…"
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                              disabled={isGradingThis}
                            />
                          </div>
                        </div>

                        <div className="flex justify-end">
                          <button
                            type="submit"
                            disabled={isGradingThis}
                            className="flex items-center gap-1 px-4 py-2 text-sm bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg transition-colors disabled:opacity-50"
                          >
                            <Star size={14} />
                            {isGradingThis ? 'Saving…' : 'Save Grade'}
                          </button>
                        </div>
                      </form>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <p className="text-gray-600 dark:text-gray-400">
                  No students have submitted this task yet.
                </p>
              </div>
            )
          ) : (
            /* ── STUDENT VIEW ────────────────────────────────────────────── */
            <>
              {submission ? (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <CheckCircle size={24} className="text-green-600 flex-shrink-0 mt-1" />
                    <div className="flex-1">
                      <h3 className="font-semibold text-green-800 dark:text-green-400 mb-2">
                        Task Submitted
                      </h3>
                      <div className="space-y-2 text-sm text-green-700 dark:text-green-400">
                        <p>
                          <span className="font-medium">Submitted at:</span>{' '}
                          {formatDateTime(submission.submitted_at)}
                        </p>
                        {submission.github_link && (
                          <p>
                            <span className="font-medium">GitHub:</span>{' '}
                            <a
                              href={submission.github_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="underline hover:text-green-900"
                            >
                              {submission.github_link}
                            </a>
                          </p>
                        )}
                        {submission.comment && (
                          <p>
                            <span className="font-medium">Comment:</span>{' '}
                            {submission.comment}
                          </p>
                        )}
                        <p>
                          <span className="font-medium">Status:</span>{' '}
                          <span
                            className={`inline-block px-2 py-1 rounded ${submission.status === 'accepted'
                                ? 'bg-green-200 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                : submission.status === 'rejected'
                                  ? 'bg-red-200 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                                  : 'bg-blue-200 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                              }`}
                          >
                            {(submission.status || 'submitted').replace(/_/g, ' ').toUpperCase()}
                          </span>
                        </p>
                        {submission.grade != null && (
                          <p className="flex items-center gap-1">
                            <Star size={14} className="text-yellow-500" />
                            <span className="font-medium">Grade:</span>{' '}
                            <strong>{submission.grade}/100</strong>
                          </p>
                        )}
                        {submission.feedback && (
                          <p>
                            <span className="font-medium">Instructor Feedback:</span>{' '}
                            {submission.feedback}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  {canSubmit ? (
                    <div className="space-y-4">
                      <p className="text-gray-600 dark:text-gray-400">
                        This task has not been submitted yet. Click below to submit your work.
                      </p>
                      <button
                        onClick={handleOpenSubmitModal}
                        className="flex items-center space-x-2 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                      >
                        <Upload size={20} />
                        <span>Submit Task</span>
                      </button>
                    </div>
                  ) : (
                    <div className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                      <p className="text-gray-600 dark:text-gray-400">
                        This task has not been submitted yet.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Delete Task</h3>
            {allSubmissions.length > 0 ? (
              <div className="mb-4">
                <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg text-sm text-yellow-700 dark:text-yellow-400 mb-3">
                  <strong>Warning:</strong> This task has {allSubmissions.length} submission{allSubmissions.length > 1 ? 's' : ''}. Deleting it will remove all associated submissions and grades.
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Are you sure you want to delete &quot;{task.title}&quot;? This action cannot be undone.</p>
              </div>
            ) : (
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Are you sure you want to delete &quot;{task.title}&quot;? This action cannot be undone.
              </p>
            )}
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteTask}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                disabled={deleting}
              >
                {deleting ? 'Deleting...' : 'Delete Task'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Submission Modal */}
      {showSubmitModal && (
        <SubmissionModal
          task={task}
          isOpen={showSubmitModal}
          onClose={handleCloseSubmitModal}
          onSuccess={handleSubmitSuccess}
        />
      )}
    </div>
  );
};

export default TaskDetails;
