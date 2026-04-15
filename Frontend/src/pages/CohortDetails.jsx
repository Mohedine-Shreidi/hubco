import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { cohortAPI, profileAPI, courseAPI } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import Avatar from '../components/Avatar';
import {
    ArrowLeft, GraduationCap, Calendar, Users, Shield, User,
    BookOpen, Mail, AlertCircle, Plus, X, Trash2
} from 'lucide-react';

/**
 * CohortDetails Page
 * Full-page detail view for a single cohort showing instructors, students, and courses.
 */
const CohortDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { hasRole } = useAuth();

    const [cohort, setCohort] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Instructor + course modal state
    const [showAddInstructor, setShowAddInstructor] = useState(false);
    const [allInstructors, setAllInstructors] = useState([]);
    const [selectedInstructor, setSelectedInstructor] = useState('');
    const [addInstLoading, setAddInstLoading] = useState(false);
    const [addInstError, setAddInstError] = useState('');

    const [showAddCourse, setShowAddCourse] = useState(false);
    const [allCourses, setAllCourses] = useState([]);
    const [selectedCourse, setSelectedCourse] = useState('');
    const [addCourseLoading, setAddCourseLoading] = useState(false);
    const [addCourseError, setAddCourseError] = useState('');

    useEffect(() => {
        const fetchCohort = async () => {
            try {
                setLoading(true);
                setError('');
                const [res, instRes, courseRes] = await Promise.all([
                    cohortAPI.getById(id),
                    profileAPI.getInstructors(),
                    courseAPI.getAll(),
                ]);
                setCohort(res?.data || null);
                setAllInstructors(Array.isArray(instRes?.data) ? instRes.data : []);
                setAllCourses(Array.isArray(courseRes?.data) ? courseRes.data : []);
            } catch (err) {
                console.error('Error fetching cohort:', err);
                setError('Failed to load cohort details.');
            } finally {
                setLoading(false);
            }
        };
        fetchCohort();
    }, [id]);

    const formatDate = (d) => {
        if (!d) return '—';
        try { return new Date(d).toLocaleDateString(); } catch { return d; }
    };

    const statusBadge = (isActive) => {
        if (isActive) return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
        return 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400';
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600" />
            </div>
        );
    }

    if (error || !cohort) {
        return (
            <div className="max-w-3xl mx-auto space-y-4">
                <button
                    onClick={() => navigate('/cohorts')}
                    className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white transition-colors"
                >
                    <ArrowLeft size={20} />
                    <span>Back to Cohorts</span>
                </button>
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-soft border border-gray-200 dark:border-gray-700 p-12 text-center">
                    <AlertCircle size={48} className="mx-auto text-red-400 mb-4" />
                    <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-1">Cohort Not Found</h2>
                    <p className="text-gray-500 dark:text-gray-400">{error || 'The cohort you are looking for does not exist.'}</p>
                </div>
            </div>
        );
    }

    const instructors = (cohort.members || []).filter(m => m.role === 'instructor');
    const students = (cohort.members || []).filter(m => m.role === 'student');
    const courses = cohort.courses || [];

    const handleAddInstructor = async () => {
        if (!selectedInstructor) { setAddInstError('Please select an instructor'); return; }
        try {
            setAddInstLoading(true);
            await cohortAPI.assignInstructor(id, selectedInstructor);
            setShowAddInstructor(false);
            setSelectedInstructor('');
            const res = await cohortAPI.getById(id);
            setCohort(res?.data || null);
        } catch (err) {
            setAddInstError(err?.response?.data?.error || 'Failed to add instructor');
        } finally {
            setAddInstLoading(false);
        }
    };

    const handleRemoveInstructor = async (userId) => {
        try {
            await cohortAPI.removeInstructor(id, userId);
            const res = await cohortAPI.getById(id);
            setCohort(res?.data || null);
        } catch (err) { console.error(err); }
    };

    const handleAddCourse = async () => {
        if (!selectedCourse) { setAddCourseError('Please select a course'); return; }
        try {
            setAddCourseLoading(true);
            await cohortAPI.addCourse(id, selectedCourse);
            setShowAddCourse(false);
            setSelectedCourse('');
            const res = await cohortAPI.getById(id);
            setCohort(res?.data || null);
        } catch (err) {
            setAddCourseError(err?.response?.data?.error || 'Failed to add course');
        } finally {
            setAddCourseLoading(false);
        }
    };

    const handleRemoveCourse = async (courseId) => {
        try {
            await cohortAPI.removeCourse(id, courseId);
            const res = await cohortAPI.getById(id);
            setCohort(res?.data || null);
        } catch (err) { console.error(err); }
    };

    // prettier-ignore
    const addInstructorModal = showAddInstructor && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full">
                <div className="flex items-center justify-between p-5 border-b dark:border-gray-700">
                    <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Add Instructor</h2>
                    <button onClick={() => setShowAddInstructor(false)} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"><X size={20} /></button>
                </div>
                <div className="p-5 space-y-4">
                    {addInstError && <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 rounded-lg text-sm text-red-600">{addInstError}</div>}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Select Instructor</label>
                        <select
                            value={selectedInstructor}
                            onChange={(e) => setSelectedInstructor(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500"
                        >
                            <option value="">Choose instructor...</option>
                            {allInstructors
                                .filter(i => !instructors.some(ci => ci.id === i.id))
                                .map(i => <option key={i.id} value={i.id}>{i.full_name} ({i.email})</option>)
                            }
                        </select>
                    </div>
                    <div className="flex justify-end gap-3 pt-2">
                        <button onClick={() => setShowAddInstructor(false)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 text-sm" disabled={addInstLoading}>Cancel</button>
                        <button onClick={handleAddInstructor} className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 text-sm font-medium" disabled={addInstLoading || !selectedInstructor}>
                            {addInstLoading ? 'Adding...' : 'Add Instructor'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );

    // prettier-ignore
    const addCourseModal = showAddCourse && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full">
                <div className="flex items-center justify-between p-5 border-b dark:border-gray-700">
                    <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Add Course to Cohort</h2>
                    <button onClick={() => setShowAddCourse(false)} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"><X size={20} /></button>
                </div>
                <div className="p-5 space-y-4">
                    {addCourseError && <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 rounded-lg text-sm text-red-600">{addCourseError}</div>}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Select Course</label>
                        <select
                            value={selectedCourse}
                            onChange={(e) => setSelectedCourse(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500"
                        >
                            <option value="">Choose course...</option>
                            {allCourses
                                .filter(c => !courses.some(cc => cc.id === c.id))
                                .map(c => <option key={c.id} value={c.id}>{c.name}</option>)
                            }
                        </select>
                    </div>
                    <div className="flex justify-end gap-3 pt-2">
                        <button onClick={() => setShowAddCourse(false)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 text-sm" disabled={addCourseLoading}>Cancel</button>
                        <button onClick={handleAddCourse} className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 text-sm font-medium" disabled={addCourseLoading || !selectedCourse}>
                            {addCourseLoading ? 'Adding...' : 'Add Course'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            {/* Back button */}
            <button
                onClick={() => navigate('/cohorts')}
                className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white transition-colors"
            >
                <ArrowLeft size={20} />
                <span>Back to Cohorts</span>
            </button>

            {/* Header Card */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-soft border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="h-28 bg-gradient-to-r from-primary-500 to-primary-700" />
                <div className="px-6 pb-6">
                    <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-10">
                        <div className="p-4 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
                            <GraduationCap size={36} className="text-primary-600 dark:text-primary-400" />
                        </div>
                        <div className="flex-1 pt-2">
                            <div className="flex items-center gap-3 flex-wrap">
                                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{cohort.name}</h1>
                                <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${statusBadge(cohort.is_active)}`}>
                                    {cohort.is_active ? 'Active' : 'Inactive'}
                                </span>
                            </div>
                            <div className="flex items-center gap-5 mt-2 text-sm text-gray-500 dark:text-gray-400">
                                <span className="flex items-center gap-1.5">
                                    <Calendar size={14} />
                                    {formatDate(cohort.start_date)} — {formatDate(cohort.end_date)}
                                </span>
                                <span className="flex items-center gap-1.5">
                                    <Users size={14} />
                                    {students.length} student{students.length !== 1 ? 's' : ''}
                                </span>
                                <span className="flex items-center gap-1.5">
                                    <GraduationCap size={14} />
                                    {instructors.length} instructor{instructors.length !== 1 ? 's' : ''}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Instructors */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-soft border border-gray-200 dark:border-gray-700 p-6">
                    <h2 className="text-base font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                        <Shield size={18} className="text-purple-500" />
                        Instructors
                        <span className="ml-auto text-xs font-normal text-gray-400">{instructors.length}</span>
                        {hasRole('admin') && (
                            <button
                                onClick={() => { setShowAddInstructor(true); setAddInstError(''); setSelectedInstructor(''); }}
                                className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors"
                                title="Add instructor"
                            >
                                <Plus size={14} />
                            </button>
                        )}
                    </h2>
                    {instructors.length === 0 ? (
                        <p className="text-sm text-gray-400 dark:text-gray-500 py-4 text-center">No instructors assigned</p>
                    ) : (
                        <div className="space-y-3">
                            {instructors.map(inst => (
                                <div key={inst.id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg group">
                                    <Avatar name={inst.full_name || 'Unknown'} size={36} role="instructor" imageUrl={inst.avatar_url} />
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-medium text-gray-800 dark:text-white truncate">{inst.full_name || 'Unknown'}</p>
                                        <p className="text-xs text-gray-400 dark:text-gray-500 truncate flex items-center gap-1">
                                            <Mail size={10} />{inst.email}
                                        </p>
                                    </div>
                                    {hasRole('admin') && (
                                        <button
                                            onClick={() => handleRemoveInstructor(inst.id)}
                                            className="opacity-0 group-hover:opacity-100 p-1 text-red-400 hover:text-red-600 transition-all"
                                            title="Remove instructor"
                                        >
                                            <X size={14} />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Students */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-soft border border-gray-200 dark:border-gray-700 p-6">
                    <h2 className="text-base font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                        <User size={18} className="text-green-500" />
                        Students
                        <span className="ml-auto text-xs font-normal text-gray-400">{students.length}</span>
                    </h2>
                    {students.length === 0 ? (
                        <p className="text-sm text-gray-400 dark:text-gray-500 py-4 text-center">No students enrolled</p>
                    ) : (
                        <div className="space-y-3 max-h-96 overflow-y-auto">
                            {students.map(stu => (
                                <div key={stu.id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                    <Avatar name={stu.full_name || 'Unknown'} size={36} role="student" imageUrl={stu.avatar_url} />
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-medium text-gray-800 dark:text-white truncate">{stu.full_name || 'Unknown'}</p>
                                        <p className="text-xs text-gray-400 dark:text-gray-500 truncate flex items-center gap-1">
                                            <Mail size={10} />{stu.email}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Courses */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-soft border border-gray-200 dark:border-gray-700 p-6">
                    <h2 className="text-base font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                        <BookOpen size={18} className="text-primary-500" />
                        Courses
                        <span className="ml-auto text-xs font-normal text-gray-400">{courses.length}</span>
                        {hasRole('admin') && (
                            <button
                                onClick={() => { setShowAddCourse(true); setAddCourseError(''); setSelectedCourse(''); }}
                                className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
                                title="Add course"
                            >
                                <Plus size={14} />
                            </button>
                        )}
                    </h2>
                    {courses.length === 0 ? (
                        <p className="text-sm text-gray-400 dark:text-gray-500 py-4 text-center">No courses in this cohort</p>
                    ) : (
                        <div className="space-y-3">
                            {courses.map(course => (
                                <div
                                    key={course.id}
                                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600/50 transition-colors group"
                                >
                                    <div
                                        onClick={() => navigate(`/courses/${course.id}`)}
                                        className="flex items-center gap-2.5 flex-1 cursor-pointer"
                                    >
                                        <BookOpen size={16} className="text-primary-500 flex-shrink-0" />
                                        <span className="text-sm font-medium text-gray-800 dark:text-white">{course.name}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${course.status === 'active'
                                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                            : course.status === 'completed'
                                                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                                : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                                            }`}>
                                            {course.status || 'active'}
                                        </span>
                                        {hasRole('admin') && (
                                            <button
                                                onClick={() => handleRemoveCourse(course.id)}
                                                className="opacity-0 group-hover:opacity-100 p-1 text-red-400 hover:text-red-600 transition-all"
                                                title="Remove course"
                                            >
                                                <X size={14} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
            {addInstructorModal}
            {addCourseModal}
        </div>
    );
};

export default CohortDetails;
