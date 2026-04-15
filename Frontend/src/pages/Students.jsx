import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useCohort } from '../context/CohortContext';
import { authAPI, profileAPI } from '../services/api';
import Avatar from '../components/Avatar';
import {
    Users, Search, Mail, Shield, User, Crown, Filter,
    ChevronDown, GraduationCap, Plus, X, Pencil, Save
} from 'lucide-react';

/**
 * Students Page
 * Admin/Instructor can view all students, filter by cohort, edit details.
 */

const DEFAULT_PASSWORD = '123456789';

const Students = () => {
    const { user, hasRole } = useAuth();
    const { cohorts } = useCohort();
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [cohortFilter, setCohortFilter] = useState('');
    const [page, setPage] = useState(1);
    const [meta, setMeta] = useState({ total: 0, pages: 1 });
    const LIMIT = 20;

    // Create modal state
    const [showCreate, setShowCreate] = useState(false);
    const [createForm, setCreateForm] = useState({ name: '', password: DEFAULT_PASSWORD, cohortId: '' });
    const [createLoading, setCreateLoading] = useState(false);
    const [error, setError] = useState('');

    // Edit modal state
    const [showEdit, setShowEdit] = useState(null);
    const [editForm, setEditForm] = useState({ full_name: '', email: '', bio: '', phone_number: '' });
    const [editLoading, setEditLoading] = useState(false);
    const [editError, setEditError] = useState('');

    const fetchStudents = async (pageNum = page) => {
        try {
            setLoading(true);
            const params = { page: pageNum, limit: LIMIT };
            if (search.trim()) params.search = search.trim();
            if (cohortFilter) params.cohortId = cohortFilter;
            const res = await profileAPI.getStudents(params);
            setStudents(Array.isArray(res?.data) ? res.data : []);
            if (res?.meta) setMeta(res.meta);
        } catch (err) {
            console.error('Error fetching students:', err);
            setStudents([]);
        } finally {
            setLoading(false);
        }
    };

    // Re-fetch when filter or page changes
    useEffect(() => { fetchStudents(page); }, [cohortFilter, page]);

    // Debounced search — reset to page 1 when search text changes
    useEffect(() => {
        const t = setTimeout(() => { setPage(1); fetchStudents(1); }, 400);
        return () => clearTimeout(t);
    }, [search]);

    const handleCreateSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (!createForm.name.trim()) {
            setError('Name is required');
            return;
        }
        if (!createForm.cohortId) {
            setError('Please select a cohort');
            return;
        }
        try {
            setCreateLoading(true);
            await authAPI.register({
                name: createForm.name.trim(),
                password: createForm.password || DEFAULT_PASSWORD,
                role: 'student',
                cohortId: createForm.cohortId,
            });
            setShowCreate(false);
            setCreateForm({ name: '', password: DEFAULT_PASSWORD, cohortId: '' });
            await fetchStudents();
        } catch (err) {
            setError(err?.response?.data?.error || err.message || 'Failed to create student');
        } finally {
            setCreateLoading(false);
        }
    };

    const filtered = students; // filtering is handled server-side

    const getRoleBadge = (role) => {
        if (role === 'team_leader') return { color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', label: 'Team Leader', icon: Crown };
        return { color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', label: 'Student', icon: User };
    };

    const openEditModal = (student) => {
        setEditForm({
            full_name: student.full_name || '',
            email: student.email || '',
            bio: student.bio || '',
            phone_number: student.phone_number || '',
        });
        setShowEdit(student.id);
        setEditError('');
    };

    const handleEditSubmit = async (e) => {
        e.preventDefault();
        setEditError('');
        if (!editForm.full_name.trim()) { setEditError('Name is required'); return; }
        try {
            setEditLoading(true);
            await profileAPI.update(showEdit, editForm);
            setShowEdit(null);
            await fetchStudents();
        } catch (err) {
            setEditError(err?.error || err?.message || 'Failed to update student');
        } finally {
            setEditLoading(false);
        }
    };

    if (loading && !students.length) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Students</h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                    View and manage all enrolled students
                </p>
            </div>

            <button
                onClick={() => { setShowCreate(true); setError(''); }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium"
            >
                <Plus className="w-4 h-4" />
                New Student
            </button>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search by name or email..."
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                    />
                </div>
                <div className="relative">
                    <select
                        value={cohortFilter}
                        onChange={(e) => { setCohortFilter(e.target.value); setPage(1); }}
                        className="appearance-none pl-4 pr-10 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm min-w-[180px]"
                    >
                        <option value="">All Cohorts</option>
                        {cohorts.map((c) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                    <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
            </div>

            {/* Stats bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Total</p>
                    <p className="text-2xl font-bold text-gray-800 dark:text-white">{meta.total || filtered.length}</p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                    <p className="text-sm text-gray-500 dark:text-gray-400">In Teams</p>
                    <p className="text-2xl font-bold text-green-600">{filtered.filter((s) => s.team_id).length}</p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Team Leaders</p>
                    <p className="text-2xl font-bold text-blue-600">{filtered.filter((s) => s.role === 'team_leader').length}</p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Unassigned</p>
                    <p className="text-2xl font-bold text-orange-600">{filtered.filter((s) => !s.team_id).length}</p>
                </div>
            </div>

            {/* Students table */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-soft border border-gray-200 dark:border-gray-700 overflow-hidden">
                {filtered.length === 0 ? (
                    <div className="p-12 text-center">
                        <Users size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                        <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-1">No Students Found</h2>
                        <p className="text-gray-500 dark:text-gray-400">Try adjusting your search or filter criteria.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Student</th>
                                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Role</th>
                                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Cohort</th>
                                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Team</th>
                                    <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {filtered.map((student) => {
                                    const badge = getRoleBadge(student.role);
                                    const BadgeIcon = badge.icon;
                                    return (
                                        <tr key={student.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                            <td className="py-3 px-4">
                                                <div className="flex items-center gap-3">
                                                    <Avatar name={student.full_name || 'Unknown'} size={36} role={student.role} />
                                                    <div>
                                                        <p className="font-medium text-gray-800 dark:text-white text-sm">{student.full_name || 'Unknown'}</p>
                                                        <p className="text-xs text-gray-500 dark:text-gray-400">{student.email}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-3 px-4">
                                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${badge.color}`}>
                                                    <BadgeIcon size={12} />{badge.label}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                                                {student.cohort_name || '—'}
                                            </td>
                                            <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                                                {student.team_name || 'Unassigned'}
                                            </td>
                                            <td className="py-3 px-4 text-right">
                                                <button
                                                    onClick={() => openEditModal(student)}
                                                    className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
                                                    title="Edit student"
                                                >
                                                    <Pencil size={14} />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Pagination */}
            {meta.pages > 1 && (
                <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Showing {students.length} of {meta.total} students
                    </p>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            disabled={page <= 1 || loading}
                            className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                        >
                            Previous
                        </button>
                        <span className="text-sm text-gray-600 dark:text-gray-400 px-2">
                            Page {page} of {meta.pages}
                        </span>
                        <button
                            onClick={() => setPage((p) => Math.min(meta.pages, p + 1))}
                            disabled={page >= meta.pages || loading}
                            className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}

            {/* Create Student Modal */}
            {showCreate && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full">
                        <div className="flex items-center justify-between p-5 border-b dark:border-gray-700">
                            <h2 className="text-lg font-semibold text-gray-800 dark:text-white">New Student</h2>
                            <button onClick={() => setShowCreate(false)} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleCreateSubmit} className="p-5 space-y-4">
                            {error && (
                                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">{error}</div>
                            )}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Full Name *</label>
                                <input type="text" value={createForm.name} onChange={(e) => setCreateForm(f => ({ ...f, name: e.target.value }))} required placeholder="Enter full name"
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm" />
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 -mt-2">Email will be generated automatically from the name</p>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Cohort *</label>
                                <select value={createForm.cohortId} onChange={(e) => setCreateForm(f => ({ ...f, cohortId: e.target.value }))} required
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm">
                                    <option value="">Select a cohort...</option>
                                    {cohorts.map((c) => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password</label>
                                <input type="text" value={createForm.password} onChange={(e) => setCreateForm(f => ({ ...f, password: e.target.value }))}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm" />
                                <p className="text-xs text-gray-400 mt-1">Default: {DEFAULT_PASSWORD}</p>
                            </div>
                            <div className="flex justify-end gap-3 pt-2">
                                <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm" disabled={createLoading}>Cancel</button>
                                <button type="submit" className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 text-sm font-medium" disabled={createLoading}>
                                    {createLoading ? 'Creating...' : 'Create Student'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Student Modal */}
            {showEdit && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full">
                        <div className="flex items-center justify-between p-5 border-b dark:border-gray-700">
                            <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Edit Student</h2>
                            <button onClick={() => setShowEdit(null)} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleEditSubmit} className="p-5 space-y-4">
                            {editError && (
                                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">{editError}</div>
                            )}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Full Name *</label>
                                <input type="text" value={editForm.full_name} onChange={(e) => setEditForm(f => ({ ...f, full_name: e.target.value }))} required
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                                <input type="email" value={editForm.email} onChange={(e) => setEditForm(f => ({ ...f, email: e.target.value }))}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone Number</label>
                                <input type="tel" value={editForm.phone_number} onChange={(e) => setEditForm(f => ({ ...f, phone_number: e.target.value }))} placeholder="Enter phone number"
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Bio</label>
                                <textarea value={editForm.bio} onChange={(e) => setEditForm(f => ({ ...f, bio: e.target.value }))} placeholder="Brief bio..." rows={3}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm resize-none" />
                            </div>
                            <div className="flex justify-end gap-3 pt-2">
                                <button type="button" onClick={() => setShowEdit(null)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm" disabled={editLoading}>Cancel</button>
                                <button type="submit" className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 text-sm font-medium" disabled={editLoading}>
                                    <Save size={14} />{editLoading ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Students;
