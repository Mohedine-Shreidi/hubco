import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useCourse } from '../context/CourseContext';
import { useCohort } from '../context/CohortContext';
import { courseAPI } from '../services/api';
import {
    Briefcase, Plus, Calendar, Users, CheckCircle, Clock,
    AlertCircle, X, ChevronRight, Trash2
} from 'lucide-react';

/**
 * Courses Page
 * Lists all courses. Admins/Instructors can create new ones.
 */
const Courses = () => {
    const { user, hasRole } = useAuth();
    const { courses, createCourse, loading } = useCourse();
    const { cohorts } = useCohort();
    const navigate = useNavigate();

    const [showCreate, setShowCreate] = useState(false);
    const [form, setForm] = useState({ name: '', endDate: '', cohortId: '' });
    const [error, setError] = useState('');
    const [creating, setCreating] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState(null);
    const [deleting, setDeleting] = useState(false);

    const canCreate = hasRole(['admin', 'instructor']);

    const handleDelete = async (courseId) => {
        try {
            setDeleting(true);
            await courseAPI.delete(courseId);
            setDeleteConfirm(null);
            // Refresh courses from context
            window.location.reload();
        } catch (err) {
            setError(err?.error || 'Failed to delete course');
            setDeleteConfirm(null);
        } finally {
            setDeleting(false);
        }
    };

    const handleCreate = async () => {
        if (!form.name.trim()) { setError('Name is required'); return; }
        if (!form.endDate) { setError('End date is required'); return; }
        if (!form.cohortId) { setError('Cohort is required'); return; }

        try {
            setCreating(true);
            const cohort = cohorts.find(c => c.id === form.cohortId);
            await createCourse({
                name: form.name.trim(),
                endDate: form.endDate,
                cohortId: form.cohortId,
                organizationId: cohort?.organization_id || user?.organizationId || '',
            });
            setShowCreate(false);
            setForm({ name: '', endDate: '', cohortId: '' });
            setError('');
        } catch (err) {
            setError(err?.error || 'Failed to create course');
        } finally {
            setCreating(false);
        }
    };

    const statusBadge = (status) => {
        if (status === 'active') return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
        return 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400';
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Courses</h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">
                        {canCreate ? 'Create and manage training courses' : 'View your assigned courses'}
                    </p>
                </div>
                {canCreate && (
                    <button
                        onClick={() => { setShowCreate(true); setError(''); }}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium"
                    >
                        <Plus className="w-4 h-4" />
                        New Course
                    </button>
                )}
            </div>

            {/* Course list */}
            {courses.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-soft border border-gray-200 dark:border-gray-700 p-12 text-center">
                    <Briefcase size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                    <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-1">No Courses Yet</h2>
                    <p className="text-gray-500 dark:text-gray-400">
                        {canCreate ? 'Create your first course to get started.' : 'No courses have been assigned.'}
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {courses.map((course) => (
                        <button
                            key={course.id}
                            onClick={() => navigate(`/courses/${course.id}`)}
                            className="bg-white dark:bg-gray-800 rounded-xl shadow-soft border border-gray-200 dark:border-gray-700 p-6 text-left hover:shadow-soft-lg transition-shadow group"
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className="p-2 bg-primary-50 dark:bg-primary-900/20 rounded-lg">
                                    <Briefcase size={24} className="text-primary-600 dark:text-primary-400" />
                                </div>
                                <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${statusBadge(course.status)}`}>
                                    {course.status}
                                </span>
                            </div>

                            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                                {course.name}
                            </h3>

                            <div className="space-y-2 text-sm text-gray-500 dark:text-gray-400">
                                <div className="flex items-center gap-2">
                                    <Calendar size={14} />
                                    <span>Created: {course.created_at ? new Date(course.created_at).toLocaleDateString() : '—'}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Clock size={14} />
                                    <span>Ends: {course.end_date ? new Date(course.end_date).toLocaleDateString() : '—'}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Users size={14} />
                                    <span>{course.team_count ?? 0} team{(course.team_count ?? 0) !== 1 ? 's' : ''}</span>
                                </div>
                            </div>

                            <div className="flex items-center justify-between mt-4">
                                {canCreate && (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setDeleteConfirm(course.id); }}
                                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                        title="Delete course"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                )}
                                <div className="flex items-center text-primary-600 dark:text-primary-400 text-sm font-medium ml-auto">
                                    <span>View details</span>
                                    <ChevronRight size={16} />
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
            )}

            {/* Create Modal */}
            {showCreate && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md">
                        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Create Course</h3>
                            <button onClick={() => setShowCreate(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
                                <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            {error && (
                                <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-400">
                                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                    {error}
                                </div>
                            )}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Course Name</label>
                                <input
                                    type="text"
                                    value={form.name}
                                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                                    placeholder="e.g. Spring 2026 Training"
                                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">End Date</label>
                                <input
                                    type="date"
                                    value={form.endDate}
                                    onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Cohort</label>
                                <select
                                    value={form.cohortId}
                                    onChange={(e) => setForm({ ...form, cohortId: e.target.value })}
                                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                                >
                                    <option value="">Select a cohort</option>
                                    {cohorts.map((c) => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex justify-end gap-3 pt-2">
                                <button
                                    onClick={() => setShowCreate(false)}
                                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleCreate}
                                    disabled={creating}
                                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 text-sm font-medium"
                                >
                                    {creating ? 'Creating...' : 'Create'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {/* Delete Confirmation Modal */}
            {deleteConfirm && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-sm p-6">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Delete Course</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                            Are you sure you want to delete this course? This action cannot be undone.
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setDeleteConfirm(null)}
                                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm"
                                disabled={deleting}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleDelete(deleteConfirm)}
                                disabled={deleting}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 text-sm font-medium"
                            >
                                {deleting ? 'Deleting...' : 'Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Courses;
