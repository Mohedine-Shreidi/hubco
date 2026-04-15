import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { teamAPI, courseAPI, cohortAPI } from '../services/api';
import { ROLES } from '../utils/constants';
import {
  Users, Mail, Shield, User, Crown, Plus, Pencil, Trash2, UserPlus, UserMinus,
  X, Check, AlertCircle, CheckCircle, ChevronDown
} from 'lucide-react';
import { getInitials, getAvatarColor } from '../utils/helpers';

/**
 * Teams Page
 * Displays team information and members
 * Admin/Instructor can create, edit and delete teams, and manage members
 */
const Teams = () => {
  const { user } = useAuth();
  const [teams, setTeams] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [teamMembers, setTeamMembers] = useState([]);
  const [allStudents, setAllStudents] = useState([]);
  const [allCourses, setAllCourses] = useState([]);
  const [allCohorts, setAllCohorts] = useState([]);
  const [cohortFilter, setCohortFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMembers, setLoadingMembers] = useState(false);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);

  // Form state
  const [teamName, setTeamName] = useState('');
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [selectedCohortId, setSelectedCohortId] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const canEdit = user.role === ROLES.ADMIN || user.role === ROLES.INSTRUCTOR;

  const fetchTeams = useCallback(async () => {
    try {
      setLoading(true);
      const params = cohortFilter ? { cohortId: cohortFilter } : {};
      const response = await teamAPI.getAllTeams(params);
      const teamsData = Array.isArray(response?.data) ? response.data : [];
      setTeams(teamsData);

      if (selectedTeam) {
        const updated = teamsData.find((t) => t.id === selectedTeam.id);
        if (updated) setSelectedTeam(updated);
        else if (teamsData.length > 0) setSelectedTeam(teamsData[0]);
        else setSelectedTeam(null);
      } else if (user?.teamId) {
        const userTeam = teamsData.find((t) => t.id === user.teamId);
        setSelectedTeam(userTeam || teamsData[0] || null);
      } else {
        setSelectedTeam(teamsData[0] || null);
      }
    } catch (err) {
      console.error('Error fetching teams:', err);
      setTeams([]);
    } finally {
      setLoading(false);
    }
  }, [user?.teamId, cohortFilter]);

  useEffect(() => {
    fetchTeams();
    if (canEdit) {
      teamAPI.getAllStudents().then(res => setAllStudents(Array.isArray(res?.data) ? res.data : [])).catch(() => { });
      courseAPI.getAll().then(res => setAllCourses(Array.isArray(res?.data) ? res.data : [])).catch(() => { });
      cohortAPI.getAll().then(res => setAllCohorts(Array.isArray(res?.data) ? res.data : [])).catch(() => { });
    }
  }, [fetchTeams, canEdit]);

  useEffect(() => {
    if (selectedTeam) {
      fetchTeamMembers(selectedTeam.id);
    } else {
      setTeamMembers([]);
    }
  }, [selectedTeam]);

  const fetchTeamMembers = async (teamId) => {
    try {
      setLoadingMembers(true);
      const response = await teamAPI.getTeamMembers(teamId);
      setTeamMembers(Array.isArray(response?.data) ? response.data : []);
    } catch (err) {
      console.error('Error fetching team members:', err);
      setTeamMembers([]);
    } finally {
      setLoadingMembers(false);
    }
  };

  const showMessage = (msg, isError = false) => {
    if (isError) { setError(msg); setTimeout(() => setError(''), 4000); }
    else { setSuccess(msg); setTimeout(() => setSuccess(''), 3000); }
  };

  const handleCreateTeam = async () => {
    if (!teamName.trim() || !selectedCourseId || !selectedCohortId) return;
    try {
      setActionLoading(true);
      await teamAPI.createTeam({
        name: teamName.trim(),
        courseId: selectedCourseId,
        cohortId: selectedCohortId,
        organizationId: user?.organizationId || '',
      });
      setShowCreateModal(false);
      setTeamName('');
      setSelectedCourseId('');
      setSelectedCohortId('');
      showMessage('Team created successfully!');
      await fetchTeams();
    } catch (err) {
      showMessage(err?.error || 'Failed to create team', true);
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditTeam = async () => {
    if (!teamName.trim() || !selectedTeam) return;
    try {
      setActionLoading(true);
      await teamAPI.updateTeam(selectedTeam.id, { name: teamName.trim() });
      setShowEditModal(false);
      setTeamName('');
      showMessage('Team updated successfully!');
      await fetchTeams();
    } catch (err) {
      showMessage('Failed to update team', true);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteTeam = async () => {
    if (!selectedTeam) return;
    try {
      setActionLoading(true);
      await teamAPI.deleteTeam(selectedTeam.id);
      setShowDeleteModal(false);
      setSelectedTeam(null);
      showMessage('Team deleted successfully!');
      await fetchTeams();
    } catch (err) {
      showMessage('Failed to delete team', true);
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddMember = async (userId) => {
    if (!selectedTeam) return;
    try {
      await teamAPI.addMember(selectedTeam.id, userId);
      showMessage('Member added!');
      await fetchTeams();
      await fetchTeamMembers(selectedTeam.id);
      refreshStudents();
    } catch (err) {
      showMessage('Failed to add member', true);
    }
  };

  const handleRemoveMember = async (userId) => {
    if (!selectedTeam) return;
    try {
      await teamAPI.removeMember(selectedTeam.id, userId);
      showMessage('Member removed');
      await fetchTeams();
      await fetchTeamMembers(selectedTeam.id);
      refreshStudents();
    } catch (err) {
      showMessage('Failed to remove member', true);
    }
  };

  const refreshStudents = (cohortId) => {
    const params = { limit: 500 };
    if (cohortId) params.cohortId = cohortId;
    else if (selectedTeam?.cohort_id) params.cohortId = selectedTeam.cohort_id;
    teamAPI.getAllStudents(params)
      .then(res => setAllStudents(Array.isArray(res?.data) ? res.data : []))
      .catch(() => { });
  };

  const openAddMemberModal = () => {
    refreshStudents(selectedTeam?.cohort_id);
    setShowAddMemberModal(true);
  };

  const getRoleBadge = (role) => {
    const badges = {
      admin: { color: 'bg-red-100 text-red-800', icon: Shield, label: 'Admin' },
      instructor: { color: 'bg-purple-100 text-purple-800', icon: Shield, label: 'Instructor' },
      team_leader: { color: 'bg-blue-100 text-blue-800', icon: Crown, label: 'Team Leader' },
      student: { color: 'bg-green-100 text-green-800', icon: User, label: 'Student' }
    };
    return badges[role] || badges.student;
  };

  // Unassigned students (not in any team within the same course)
  const memberUserIds = teamMembers.map(m => m.user_id);
  const unassignedStudents = allStudents.filter(s => {
    // Already a member of this team
    if (memberUserIds.includes(s.id)) return false;
    // If the team is course-scoped, exclude students already in another team for the same course
    if (selectedTeam?.course_id && s.team_id) {
      const studentTeam = teams.find(t => t.id === s.team_id);
      if (studentTeam && studentTeam.course_id === selectedTeam.course_id) return false;
    }
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Teams</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {canEdit ? 'Manage teams and their members' : 'View team members and their information'}
          </p>
        </div>
        {canEdit && (
          <button
            onClick={() => { setTeamName(''); setShowCreateModal(true); }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            Create Team
          </button>
        )}
      </div>

      {/* Alerts */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-red-700 dark:text-red-400 text-sm">{error}</p>
        </div>
      )}
      {success && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
          <p className="text-green-700 dark:text-green-400 text-sm">{success}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Teams list */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-soft p-4 border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-white">All Teams</h2>
              {canEdit && allCohorts.length > 0 && (
                <select
                  value={cohortFilter}
                  onChange={(e) => setCohortFilter(e.target.value)}
                  className="text-xs px-2 py-1.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="">All Cohorts</option>
                  {allCohorts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              )}
            </div>
            {teams.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <Users size={36} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">No teams yet</p>
                {canEdit && <p className="text-xs mt-1">Create a team to get started</p>}
              </div>
            ) : (
              <div className="space-y-2">
                {teams.map((team) => (
                  <button
                    key={team.id}
                    onClick={() => setSelectedTeam(team)}
                    className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${selectedTeam?.id === team.id
                      ? 'bg-primary-50 border-2 border-primary-500'
                      : 'bg-gray-50 dark:bg-gray-700 border-2 border-transparent hover:bg-gray-100 dark:hover:bg-gray-600'
                      }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-semibold"
                        style={{ backgroundColor: getAvatarColor(team.name) }}
                      >
                        <Users size={20} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-800 dark:text-white truncate">
                          {team.name}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {team.member_count ?? 0} members
                        </p>
                      </div>
                      {user.teamId === team.id && (
                        <span className="px-2 py-1 bg-primary-100 text-primary-700 text-xs font-medium rounded">
                          Your Team
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Team details */}
        <div className="lg:col-span-2">
          {selectedTeam ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-soft border border-gray-100 dark:border-gray-700">
              {/* Team header */}
              <div className="p-6 border-b bg-gradient-to-r from-primary-50 to-primary-100 dark:from-gray-700 dark:to-gray-800 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div
                      className="w-16 h-16 rounded-xl flex items-center justify-center text-white font-bold text-2xl"
                      style={{ backgroundColor: getAvatarColor(selectedTeam.name) }}
                    >
                      <Users size={32} />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
                        {selectedTeam.name}
                      </h2>
                      <p className="text-gray-600 dark:text-gray-400">
                        {selectedTeam.member_count ?? 0} team members
                      </p>
                    </div>
                  </div>
                  {canEdit && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => { setTeamName(selectedTeam.name); setShowEditModal(true); }}
                        className="p-2 text-gray-600 dark:text-gray-400 hover:bg-white/60 rounded-lg transition-colors"
                        title="Edit team"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setShowDeleteModal(true)}
                        className="p-2 text-red-500 hover:bg-white/60 rounded-lg transition-colors"
                        title="Delete team"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Team members */}
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
                    Team Members
                  </h3>
                  {canEdit && (
                    <button
                      onClick={openAddMemberModal}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-primary-50 text-primary-700 rounded-lg hover:bg-primary-100 transition-colors font-medium"
                    >
                      <UserPlus className="w-4 h-4" />
                      Add Member
                    </button>
                  )}
                </div>

                {loadingMembers ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                  </div>
                ) : teamMembers.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Users size={48} className="mx-auto mb-3 text-gray-300" />
                    <p>No members found</p>
                    {canEdit && <p className="text-sm mt-1 text-gray-400">Add members to this team</p>}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {teamMembers.map((member) => {
                      const badge = getRoleBadge(member.role);
                      const BadgeIcon = badge.icon;
                      const memberName = member.full_name || member.name || 'Unknown';
                      const memberId = member.user_id || member.id;

                      return (
                        <div
                          key={memberId}
                          className="flex items-center space-x-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                        >
                          {/* Avatar */}
                          <div
                            className="w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold"
                            style={{
                              backgroundColor: getAvatarColor(memberName)
                            }}
                          >
                            {getInitials(memberName)}
                          </div>

                          {/* Member info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 mb-1">
                              <p className="font-semibold text-gray-800 dark:text-white truncate">
                                {memberName}
                              </p>
                              {memberId === user.id && (
                                <span className="px-2 py-0.5 bg-primary-100 text-primary-700 text-xs font-medium rounded">
                                  You
                                </span>
                              )}
                            </div>
                            <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                              <Mail size={14} />
                              <span>{member.email}</span>
                            </div>
                          </div>

                          {/* Role badge */}
                          <div
                            className={`flex items-center space-x-1 px-3 py-1.5 rounded-full ${badge.color}`}
                          >
                            <BadgeIcon size={14} />
                            <span className="text-xs font-medium">
                              {badge.label}
                            </span>
                          </div>

                          {/* Remove button */}
                          {canEdit && (
                            <button
                              onClick={() => handleRemoveMember(memberId)}
                              className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                              title="Remove from team"
                            >
                              <UserMinus className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-soft p-12 text-center">
              <Users size={64} className="mx-auto text-gray-300 mb-4" />
              <p className="text-gray-600 dark:text-gray-400">Select a team to view details</p>
            </div>
          )}
        </div>
      </div>

      {/* ============== MODALS ============== */}

      {/* Create Team Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Create New Team</h3>
                <button onClick={() => setShowCreateModal(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-600 rounded">
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Team Name</label>
                <input
                  type="text"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="Enter team name"
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Cohort *</label>
                <select
                  value={selectedCohortId}
                  onChange={(e) => setSelectedCohortId(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                >
                  <option value="">Select a cohort</option>
                  {allCohorts.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Course *</label>
                <select
                  value={selectedCourseId}
                  onChange={(e) => setSelectedCourseId(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                >
                  <option value="">Select a course</option>
                  {allCourses.map((c) => (
                    <option key={c.id} value={c.id}>{c.name || c.title}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-600 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-500 text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateTeam}
                disabled={!teamName.trim() || !selectedCourseId || !selectedCohortId || actionLoading}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 text-sm font-medium"
              >
                {actionLoading ? 'Creating...' : 'Create Team'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Team Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Edit Team</h3>
                <button onClick={() => setShowEditModal(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-600 rounded">
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>
            </div>
            <div className="p-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Team Name</label>
              <input
                type="text"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="Enter team name"
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                autoFocus
              />
            </div>
            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-600 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-500 text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleEditTeam}
                disabled={!teamName.trim() || actionLoading}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 text-sm font-medium"
              >
                {actionLoading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Team Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-red-100 dark:bg-red-900/20 rounded-full">
                  <Trash2 className="w-6 h-6 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Delete Team</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">This action cannot be undone.</p>
                </div>
              </div>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Are you sure you want to delete <strong>{selectedTeam?.name}</strong>?
                All {selectedTeam?.member_count || 0} member(s) will be unassigned.
              </p>
            </div>
            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-600 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-500 text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteTeam}
                disabled={actionLoading}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 text-sm font-medium"
              >
                {actionLoading ? 'Deleting...' : 'Delete Team'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Member Modal */}
      {showAddMemberModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md max-h-[80vh] flex flex-col">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Add Member to {selectedTeam?.name}</h3>
                <button onClick={() => setShowAddMemberModal(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-600 rounded">
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>
            </div>
            <div className="p-6 flex-1 overflow-y-auto">
              {unassignedStudents.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <Users className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">All students are already assigned to teams</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">Select students to add to this team:</p>
                  {unassignedStudents.map((s) => (
                    <div key={s.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-semibold"
                          style={{ backgroundColor: getAvatarColor(s.full_name || s.name || '') }}
                        >
                          {getInitials(s.full_name || s.name || '')}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-800 dark:text-white">{s.full_name || s.name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{s.email}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleAddMember(s.id)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-primary-600 text-white rounded-lg text-xs font-medium hover:bg-primary-700"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setShowAddMemberModal(false)}
                className="w-full px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-600 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-500 text-sm font-medium"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Teams;
