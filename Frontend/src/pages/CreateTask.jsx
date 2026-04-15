import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { taskAPI, courseAPI, teamAPI, cohortAPI, profileAPI } from '../services/api';
import { ArrowLeft, Save, Users, User, Layers, Globe } from 'lucide-react';

// Assignment type options
const ASSIGNMENT_TYPES = [
  { value: 'individual', label: 'Individual', description: 'Assign to specific students', icon: User },
  { value: 'team',       label: 'Team',       description: 'Assign to specific teams', icon: Users },
  { value: 'mixed',      label: 'Mixed',      description: 'Assign to both students and teams', icon: Layers },
  { value: 'cohort',     label: 'Whole Cohort', description: 'Assign to all students in the cohort', icon: Globe },
];

/**
 * CreateTask Page
 * Form to create new tasks (Instructor/Admin only)
 * Supports multi-assignment types: individual | team | mixed | cohort
 */
const CreateTask = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Form fields
  const [title, setTitle]               = useState('');
  const [description, setDescription]   = useState('');
  const [dueDate, setDueDate]           = useState('');
  const [priority, setPriority]         = useState('medium');
  const [cohortId, setCohortId]         = useState('');
  const [courseId, setCourseId]         = useState('');
  const [assignmentType, setAssignmentType] = useState('individual');
  const [githubRepoUrl, setGithubRepoUrl] = useState('');
  // Multi-assignment selections
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [selectedTeams, setSelectedTeams]       = useState([]);

  // Data lists
  const [cohorts, setCohorts]   = useState([]);
  const [courses, setCourses]   = useState([]);
  const [teams, setTeams]       = useState([]);
  const [students, setStudents] = useState([]);

  const [loading, setLoading]     = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError]         = useState('');

  // Load cohorts on mount
  useEffect(() => {
    cohortAPI.getAll()
      .then((res) => setCohorts(Array.isArray(res?.data) ? res.data : []))
      .catch(() => {})
      .finally(() => setDataLoading(false));
  }, []);

  // When cohort changes: reload courses, teams, students
  useEffect(() => {
    if (!cohortId) {
      setCourses([]); setTeams([]); setStudents([]);
      setCourseId(''); setSelectedStudents([]); setSelectedTeams([]);
      return;
    }
    Promise.all([
      courseAPI.getAll({ cohortId }),
      teamAPI.getAllTeams({ cohortId }),
      profileAPI.getStudents({ cohortId, limit: 200 }),
    ]).then(([courseRes, teamRes, studentRes]) => {
      setCourses(Array.isArray(courseRes?.data) ? courseRes.data : []);
      setTeams(Array.isArray(teamRes?.data) ? teamRes.data : []);
      setStudents(Array.isArray(studentRes?.data) ? studentRes.data : []);
    }).catch(() => {});
    setCourseId(''); setSelectedStudents([]); setSelectedTeams([]);
  }, [cohortId]);

  // Toggle helpers for multi-select checkboxes
  const toggleStudent = (id) =>
    setSelectedStudents((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  const toggleTeam = (id) =>
    setSelectedTeams((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  const getMinDate = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!title.trim())       { setError('Title is required'); return; }
    if (!description.trim()) { setError('Description is required'); return; }
    if (!dueDate)            { setError('Due date is required'); return; }
    if (!cohortId)           { setError('Please select a cohort'); return; }
    if (!courseId)           { setError('Please select a course'); return; }

    const deadlineDate = new Date(dueDate);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    if (deadlineDate < today) { setError('Due date must be in the future'); return; }

    if (assignmentType === 'individual' && selectedStudents.length === 0) {
      setError('Select at least one student'); return;
    }
    if (assignmentType === 'team' && selectedTeams.length === 0) {
      setError('Select at least one team'); return;
    }
    if (assignmentType === 'mixed' && selectedStudents.length === 0 && selectedTeams.length === 0) {
      setError('Select at least one student or team'); return;
    }

    try {
      setLoading(true);
      const taskData = {
        title: title.trim(),
        description: description.trim(),
        dueDate: new Date(dueDate).toISOString(),
        priority,
        cohortId,
        courseId,
        assignmentType,
        assignedStudents: assignmentType === 'team'   ? [] : selectedStudents,
        assignedTeams:    assignmentType === 'individual' ? [] : selectedTeams,
      };
      if (githubRepoUrl.trim()) taskData.githubRepoUrl = githubRepoUrl.trim();

      await taskAPI.createTask(taskData);
      navigate('/tasks');
    } catch (err) {
      setError(err?.error || err?.message || 'Failed to create task');
    } finally {
      setLoading(false);
    }
  };

  const cls = 'w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent';

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/tasks')}
          className="flex items-center space-x-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white mb-4"
        >
          <ArrowLeft size={20} />
          <span>Back to Tasks</span>
        </button>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Create New Task</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Fill in the details below to create a new task</p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-soft p-6 border border-gray-100 dark:border-gray-700">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Task Title *</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Enter task title" className={cls} required disabled={loading} />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description *</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} placeholder="Enter detailed task description" className={`${cls} resize-none`} required disabled={loading} />
          </div>

          {/* Cohort */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Cohort *</label>
            <select value={cohortId} onChange={(e) => setCohortId(e.target.value)} className={cls} required disabled={loading || dataLoading}>
              <option value="">{dataLoading ? 'Loading…' : 'Select a cohort'}</option>
              {cohorts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          {/* Course */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Course *</label>
            <select value={courseId} onChange={(e) => setCourseId(e.target.value)} className={cls} required disabled={loading || !cohortId}>
              <option value="">{!cohortId ? 'Select a cohort first' : 'Select a course'}</option>
              {courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          {/* Due Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Due Date *</label>
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} min={getMinDate()} className={cls} required disabled={loading} />
          </div>

          {/* Priority */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Priority</label>
            <select value={priority} onChange={(e) => setPriority(e.target.value)} className={cls} disabled={loading}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>

          {/* Assignment Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Assignment Type *</label>
            <div className="grid grid-cols-2 gap-3">
              {ASSIGNMENT_TYPES.map(({ value, label, description: desc, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => { setAssignmentType(value); setSelectedStudents([]); setSelectedTeams([]); }}
                  disabled={loading}
                  className={`flex items-start gap-3 p-3 rounded-lg border-2 text-left transition-colors ${
                    assignmentType === value
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                      : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                  }`}
                >
                  <Icon size={20} className={assignmentType === value ? 'text-primary-600 mt-0.5' : 'text-gray-400 mt-0.5'} />
                  <div>
                    <p className={`text-sm font-medium ${assignmentType === value ? 'text-primary-700 dark:text-primary-400' : 'text-gray-700 dark:text-gray-300'}`}>{label}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Student selection (individual / mixed) */}
          {(assignmentType === 'individual' || assignmentType === 'mixed') && cohortId && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Select Students {assignmentType === 'individual' ? '*' : '(optional)'}
              </label>
              {students.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">No students found in this cohort.</p>
              ) : (
                <div className="border border-gray-200 dark:border-gray-600 rounded-lg max-h-48 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-700">
                  {students.map((s) => (
                    <label key={s.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedStudents.includes(s.id)}
                        onChange={() => toggleStudent(s.id)}
                        disabled={loading}
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">{s.full_name}</span>
                      {s.email && <span className="text-xs text-gray-400 ml-auto">{s.email}</span>}
                    </label>
                  ))}
                </div>
              )}
              {selectedStudents.length > 0 && (
                <p className="text-xs text-primary-600 mt-1">{selectedStudents.length} student{selectedStudents.length > 1 ? 's' : ''} selected</p>
              )}
            </div>
          )}

          {/* Team selection (team / mixed) */}
          {(assignmentType === 'team' || assignmentType === 'mixed') && cohortId && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Select Teams {assignmentType === 'team' ? '*' : '(optional)'}
              </label>
              {teams.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">No teams found in this cohort.</p>
              ) : (
                <div className="border border-gray-200 dark:border-gray-600 rounded-lg max-h-48 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-700">
                  {teams.map((t) => (
                    <label key={t.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedTeams.includes(t.id)}
                        onChange={() => toggleTeam(t.id)}
                        disabled={loading}
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">{t.name}</span>
                      {t.member_count != null && <span className="text-xs text-gray-400 ml-auto">{t.member_count} members</span>}
                    </label>
                  ))}
                </div>
              )}
              {selectedTeams.length > 0 && (
                <p className="text-xs text-primary-600 mt-1">{selectedTeams.length} team{selectedTeams.length > 1 ? 's' : ''} selected</p>
              )}
            </div>
          )}

          {/* Cohort-wide info */}
          {assignmentType === 'cohort' && cohortId && (
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg text-sm text-blue-700 dark:text-blue-400">
              This task will be assigned to all students currently enrolled in the selected cohort.
            </div>
          )}

          {/* GitHub Repository */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">GitHub Repository (Optional)</label>
            <input type="url" value={githubRepoUrl} onChange={(e) => setGithubRepoUrl(e.target.value)} placeholder="https://github.com/username/repository" className={cls} disabled={loading} />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t dark:border-gray-700">
            <button type="button" onClick={() => navigate('/tasks')} className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors" disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="flex items-center space-x-2 px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" disabled={loading}>
              <Save size={20} />
              <span>{loading ? 'Creating…' : 'Create Task'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateTask;
