import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { courseAPI, taskAPI } from '../services/api';
import Avatar from '../components/Avatar';
import {
    ArrowLeft, Briefcase, Users, Calendar, Clock, Plus, Crown, UserPlus,
    UserMinus, X, AlertCircle, CheckCircle, ChevronDown, ChevronUp,
    ListTodo, PlusCircle
} from 'lucide-react';

/**
 * CourseDetails Page
 * Shows teams in a course, members, team leader assignment.
 */
const CourseDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user, hasRole } = useAuth();

    const [course, setCourse] = useState(null);
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);

    const [showAddTeam, setShowAddTeam] = useState(false);
    const [teamName, setTeamName] = useState('');
    const [expandedTeam, setExpandedTeam] = useState(null);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Task creation state
    const [showTaskForm, setShowTaskForm] = useState(false);
    const [taskForm, setTaskForm] = useState({ title: '', description: '', priority: 'medium' });

    // Course completion confirmation
    const [showFinishConfirm, setShowFinishConfirm] = useState(false);

    const canManage = hasRole(['admin', 'instructor']);

    const fetchCourse = useCallback(async () => {
        try {
            setLoading(true);
            const res = await courseAPI.getById(id);
            setCourse(res?.data || null);
        } catch (err) {
            console.error('Error fetching course:', err);
            setCourse(null);
        } finally {
            setLoading(false);
        }
    }, [id]);

    const fetchTasks = useCallback(async () => {
        try {
            const res = await courseAPI.getTasks(id);
            setTasks(Array.isArray(res?.data) ? res.data : []);
        } catch (err) {
            console.error('Error fetching tasks:', err);
            setTasks([]);
        }
    }, [id]);

    useEffect(() => {
        fetchCourse();
        fetchTasks();
    }, [fetchCourse, fetchTasks]);

    const showMsg = (msg, isError = false) => {
        if (isError) { setError(msg); setTimeout(() => setError(''), 4000); }
        else { setSuccess(msg); setTimeout(() => setSuccess(''), 3000); }
    };

    const handleAddTeam = async () => {
        if (!teamName.trim()) return;
        try {
            await courseAPI.addTeam(id, { name: teamName.trim() });
            setTeamName('');
            setShowAddTeam(false);
            showMsg('Team added!');
            await fetchCourse();
        } catch (err) {
            showMsg(err?.error || 'Failed to add team', true);
        }
    };

    const handleAssignLeader = async (teamId, memberId) => {
        try {
            await courseAPI.assignLeader(id, teamId, memberId);
            showMsg('Team leader assigned!');
            await fetchCourse();
        } catch (err) {
            showMsg(err?.error || 'Failed to assign leader', true);
        }
    };

    const handleRemoveMember = async (teamId, memberId) => {
        try {
            await courseAPI.removeMember(id, teamId, memberId);
            showMsg('Member removed');
            await fetchCourse();
        } catch (err) {
            showMsg(err?.error || 'Failed to remove member', true);
        }
    };

    const handleFinish = async () => {
        try {
            await courseAPI.finish(id);
            setShowFinishConfirm(false);
            showMsg('Course marked as finished!');
            await fetchCourse();
        } catch (err) {
            showMsg(err?.error || 'Failed to finish course', true);
        }
    };

    const handleCreateTask = async () => {
        if (!taskForm.title.trim()) { showMsg('Task title is required', true); return; }
        try {
            await taskAPI.createTask({
                courseId: id,
                title: taskForm.title.trim(),
                description: taskForm.description.trim(),
                priority: taskForm.priority,
            });
            setTaskForm({ title: '', description: '', priority: 'medium' });
            setShowTaskForm(false);
            showMsg('Task created!');
            await fetchTasks();
        } catch (err) {
            showMsg(err?.error || 'Failed to create task', true);
        }
    };

    const handleUpdateTaskStatus = async (taskId, status) => {
        try {
            await taskAPI.updateTask(taskId, { status });
            await fetchTasks();
        } catch (err) {
            showMsg(err?.error || 'Failed to update task', true);
        }
    };

    const statusBadge = (status) => {
        if (status === 'active') return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
        return 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400';
    };

    const priorityBadge = (p) => {
        const map = {
            high: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
            medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
            low: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
        };
        return map[p] || map.medium;
    };

    const taskStatusBadge = (s) => {
        const map = {
            pending: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
            in_progress: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
            submitted: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
            accepted: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
            rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
        };
        return map[s] || map.pending;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    if (!course) {
        return (
            <div className="text-center py-12">
                <Briefcase size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300">Course not found</h2>
                <button onClick={() => navigate('/courses')} className="mt-4 text-primary-600 hover:underline text-sm">
                    Back to Courses
                </button>
            </div>
        );
    }

    const teams = Array.isArray(course.teams) ? course.teams : [];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <button onClick={() => navigate('/courses')} className="flex items-center gap-1 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 mb-4 text-sm">
                    <ArrowLeft size={16} /> Back to Courses
                </button>
                <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-primary-50 dark:bg-primary-900/20 rounded-xl">
                            <Briefcase size={28} className="text-primary-600 dark:text-primary-400" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">{course.name}</h1>
                            <div className="flex items-center gap-3 mt-1 text-sm text-gray-500 dark:text-gray-400">
                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${statusBadge(course.status)}`}>{course.status}</span>
                                {course.created_at && <span className="flex items-center gap-1"><Calendar size={14} /> Created: {new Date(course.created_at).toLocaleDateString()}</span>}
                                {course.end_date && <span className="flex items-center gap-1"><Clock size={14} /> Ends: {new Date(course.end_date).toLocaleDateString()}</span>}
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        {canManage && course.status === 'active' && (
                            <>
                                <button
                                    onClick={() => setShowAddTeam(true)}
                                    className="inline-flex items-center gap-1.5 px-3 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm font-medium"
                                >
                                    <Plus size={16} /> Add Team
                                </button>
                                <button
                                    onClick={() => setShowFinishConfirm(true)}
                                    className="inline-flex items-center gap-1.5 px-3 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-sm"
                                >
                                    <CheckCircle size={16} /> Mark Finished
                                </button>
                            </>
                        )}
                        {course.status === 'active' && (
                            <button
                                onClick={() => setShowTaskForm(true)}
                                className="inline-flex items-center gap-1.5 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium"
                            >
                                <PlusCircle size={16} /> Create Task
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Messages */}
            {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-400">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
                </div>
            )}
            {success && (
                <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-sm text-green-700 dark:text-green-400">
                    <CheckCircle className="w-4 h-4 flex-shrink-0" />{success}
                </div>
            )}

            {/* Teams */}
            <div>
                <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                    <Users size={20} /> Teams ({teams.length})
                </h2>
                {teams.length === 0 ? (
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8 text-center">
                        <Users size={36} className="mx-auto text-gray-300 dark:text-gray-600 mb-2" />
                        <p className="text-gray-500 dark:text-gray-400 text-sm">No teams yet. {canManage ? 'Add a team to get started.' : ''}</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {teams.map((team) => {
                            const members = Array.isArray(team.members) ? team.members : [];
                            return (
                                <div key={team.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                                    <button
                                        onClick={() => setExpandedTeam(expandedTeam === team.id ? null : team.id)}
                                        className="w-full p-5 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="p-2 bg-primary-50 dark:bg-primary-900/20 rounded-lg">
                                                <Users size={20} className="text-primary-600 dark:text-primary-400" />
                                            </div>
                                            <div className="text-left">
                                                <h3 className="font-semibold text-gray-800 dark:text-white">{team.name}</h3>
                                                <div className="flex items-center gap-4 mt-1 text-xs text-gray-500 dark:text-gray-400">
                                                    <span>{members.length} members</span>
                                                    {team.team_leader_id && (
                                                        <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                                                            <Crown size={12} /> {team.leader_name || 'Leader assigned'}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        {expandedTeam === team.id ? <ChevronUp size={20} className="text-gray-400" /> : <ChevronDown size={20} className="text-gray-400" />}
                                    </button>

                                    {/* Expanded - members */}
                                    {expandedTeam === team.id && (
                                        <div className="border-t border-gray-200 dark:border-gray-700 p-5 space-y-3">
                                            {members.length === 0 ? (
                                                <p className="text-sm text-gray-500 dark:text-gray-400">No members yet.</p>
                                            ) : (
                                                <ul className="space-y-2">
                                                    {members.map((member) => (
                                                        <li key={member.id} className="flex items-center justify-between p-2 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                                                            <div className="flex items-center gap-3">
                                                                <Avatar name={member.full_name || 'Unknown'} size={32} />
                                                                <div>
                                                                    <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{member.full_name || 'Unknown'}</span>
                                                                    {team.team_leader_id === member.id && (
                                                                        <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                                                                            <Crown size={10} /> Leader
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <div className="flex gap-2">
                                                                {canManage && team.team_leader_id !== member.id && (
                                                                    <button
                                                                        onClick={() => handleAssignLeader(team.id, member.id)}
                                                                        className="text-xs px-2 py-1 rounded bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40"
                                                                        title="Assign as team leader"
                                                                    >
                                                                        <Crown size={14} />
                                                                    </button>
                                                                )}
                                                                {canManage && (
                                                                    <button
                                                                        onClick={() => handleRemoveMember(team.id, member.id)}
                                                                        className="text-xs px-2 py-1 rounded bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40"
                                                                        title="Remove member"
                                                                    >
                                                                        <UserMinus size={14} />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Course Tasks */}
            {(tasks.length > 0 || canManage) && (
                <div>
                    <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                        <ListTodo size={20} /> Tasks ({tasks.length})
                    </h2>
                    {tasks.length === 0 ? (
                        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8 text-center">
                            <ListTodo size={36} className="mx-auto text-gray-300 dark:text-gray-600 mb-2" />
                            <p className="text-gray-500 dark:text-gray-400 text-sm">No tasks yet.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {tasks.map((task) => (
                                <div key={task.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
                                    <div className="flex items-start justify-between mb-3">
                                        <h3 className="font-medium text-gray-800 dark:text-white text-sm">{task.title}</h3>
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${priorityBadge(task.priority)}`}>
                                            {task.priority}
                                        </span>
                                    </div>
                                    {task.description && (
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 line-clamp-2">{task.description}</p>
                                    )}
                                    <div className="flex items-center justify-between">
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${taskStatusBadge(task.status)}`}>
                                            {(task.status || '').replace('_', ' ')}
                                        </span>
                                        {canManage && (
                                            <select
                                                value={task.status}
                                                onChange={(e) => handleUpdateTaskStatus(task.id, e.target.value)}
                                                className="text-xs border border-gray-300 dark:border-gray-600 rounded px-1.5 py-0.5 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                                            >
                                                <option value="pending">Pending</option>
                                                <option value="in_progress">In Progress</option>
                                                <option value="submitted">Submitted</option>
                                                <option value="accepted">Accepted</option>
                                                <option value="rejected">Rejected</option>
                                            </select>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Add Team Modal */}
            {showAddTeam && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-sm">
                        <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
                            <h3 className="font-semibold text-gray-900 dark:text-white">Add Team</h3>
                            <button onClick={() => setShowAddTeam(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
                                <X className="w-4 h-4 text-gray-500" />
                            </button>
                        </div>
                        <div className="p-5 space-y-4">
                            <input
                                type="text"
                                value={teamName}
                                onChange={(e) => setTeamName(e.target.value)}
                                placeholder="Team name"
                                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                                autoFocus
                            />
                            <div className="flex justify-end gap-2">
                                <button onClick={() => setShowAddTeam(false)} className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">Cancel</button>
                                <button onClick={handleAddTeam} disabled={!teamName.trim()} className="px-3 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 text-sm font-medium">Add</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Task Create Modal */}
            {showTaskForm && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md">
                        <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
                            <h3 className="font-semibold text-gray-900 dark:text-white">Create Task</h3>
                            <button onClick={() => setShowTaskForm(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
                                <X className="w-4 h-4 text-gray-500" />
                            </button>
                        </div>
                        <div className="p-5 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title *</label>
                                <input
                                    type="text"
                                    value={taskForm.title}
                                    onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                                    placeholder="Task title"
                                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                                    autoFocus
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                                <textarea
                                    value={taskForm.description}
                                    onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                                    placeholder="What needs to be done?"
                                    rows={3}
                                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm resize-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Priority</label>
                                <select
                                    value={taskForm.priority}
                                    onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })}
                                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                                >
                                    <option value="low">Low</option>
                                    <option value="medium">Medium</option>
                                    <option value="high">High</option>
                                </select>
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                                <button onClick={() => setShowTaskForm(false)} className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">Cancel</button>
                                <button onClick={handleCreateTask} className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium">Create Task</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Course Completion Confirmation Modal */}
            {showFinishConfirm && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-sm">
                        <div className="p-6 text-center">
                            <div className="mx-auto w-12 h-12 flex items-center justify-center rounded-full bg-yellow-100 dark:bg-yellow-900/30 mb-4">
                                <CheckCircle size={24} className="text-yellow-600 dark:text-yellow-400" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Mark Course as Finished?</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                                This will mark <strong className="text-gray-700 dark:text-gray-300">{course.name}</strong> as completed.
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                                Students will no longer be able to submit tasks for this course.
                            </p>
                            <div className="flex justify-center gap-3">
                                <button
                                    onClick={() => setShowFinishConfirm(false)}
                                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleFinish}
                                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm font-medium"
                                >
                                    Yes, Mark Finished
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CourseDetails;
