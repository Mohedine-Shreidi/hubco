import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../context/ThemeContext';
import { authAPI } from '../services/api';
import Avatar from '../components/Avatar';
import ThemeToggle from '../components/ThemeToggle';
import {
  User, Mail, Shield, Save, Lock, Eye, EyeOff,
  CheckCircle, AlertCircle, Sun, Moon, Settings, Palette, Camera, Upload
} from 'lucide-react';

/**
 * Profile & Account Settings (merged page)
 * Tabs: Profile Information | Password | Preferences
 * Hides sections irrelevant to certain roles.
 */
const Profile = () => {
  const { user, updateUser, hasRole } = useAuth();
  const { theme, setTheme, isDark } = useTheme();
  const [searchParams] = useSearchParams();

  // Determine initial tab from URL query (?tab=settings → password)
  const initialTab = searchParams.get('tab') === 'settings' ? 'password' : 'profile';
  const [activeTab, setActiveTab] = useState(initialTab);

  // Profile form
  const [profileForm, setProfileForm] = useState({ name: '', email: '', phone: '', bio: '', avatarUrl: '' });
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileError, setProfileError] = useState('');
  const [showAvatarInput, setShowAvatarInput] = useState(false);

  // Password form
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [showCurrentPwd, setShowCurrentPwd] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');

  useEffect(() => {
    if (user) {
      setProfileForm({ name: user.name || '', email: user.email || '', phone: user.phone || '', bio: user.bio || '', avatarUrl: user.avatarUrl || '' });
    }
  }, [user]);

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    if (!profileForm.name.trim() || !profileForm.email.trim()) {
      setProfileError('Name and email are required'); return;
    }
    try {
      setProfileLoading(true); setProfileError('');
      const res = await authAPI.updateProfile(profileForm);
      if (updateUser) updateUser(profileForm);
      setProfileSuccess('Profile updated successfully!');
      setTimeout(() => setProfileSuccess(''), 3000);
    } catch (err) { setProfileError(err.message || 'Failed to update profile'); }
    finally { setProfileLoading(false); }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault(); setPasswordError('');
    if (passwordForm.newPassword.length < 6) { setPasswordError('New password must be at least 6 characters'); return; }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) { setPasswordError('New passwords do not match'); return; }
    try {
      setPasswordLoading(true);
      await authAPI.changePassword(passwordForm.currentPassword, passwordForm.newPassword);
      setPasswordSuccess('Password changed successfully!');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setTimeout(() => setPasswordSuccess(''), 3000);
    } catch (err) { setPasswordError(err.message || 'Failed to change password'); }
    finally { setPasswordLoading(false); }
  };

  const getRoleLabel = (role) => ({ admin: 'Administrator', instructor: 'Instructor', student: 'Student', team_leader: 'Team Leader' }[role] || role);
  const getRoleBadgeColor = (role) => ({
    admin: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    instructor: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    student: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    team_leader: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  }[role] || 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300');

  const tabs = [
    { id: 'profile', label: 'Profile Information', icon: User },
    { id: 'password', label: 'Change Password', icon: Lock },
    { id: 'preferences', label: 'Preferences', icon: Settings },
  ];

  // Input helper class
  const inputCls = 'w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm';
  const labelCls = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5';

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header Card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-soft border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="h-32 bg-gradient-to-r from-primary-500 to-primary-700" />
        <div className="px-6 pb-6">
          <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-12">
            <div className="relative group cursor-pointer" onClick={() => { setActiveTab('profile'); setShowAvatarInput(true); }}>
              <Avatar name={user?.name || 'U'} imageUrl={profileForm.avatarUrl || user?.avatarUrl} size={96} role={user?.role} className="border-4 border-white dark:border-gray-800 shadow-lg" />
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity border-4 border-transparent">
                <Camera className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="flex-1 pt-2">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{user?.name}</h1>
              <div className="flex items-center gap-3 mt-1">
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeColor(user?.role)}`}>
                  <Shield className="w-3 h-3" />
                  {getRoleLabel(user?.role)}
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400">{user?.email}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs + Content */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-soft border border-gray-200 dark:border-gray-700">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-6 py-4 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${activeTab === tab.id
                    ? 'border-primary-600 text-primary-600 dark:text-primary-400 dark:border-primary-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                    }`}
                >
                  <span className="flex items-center gap-2"><Icon className="w-4 h-4" />{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-6">
          {/* ── PROFILE TAB ── */}
          {activeTab === 'profile' && (
            <form onSubmit={handleProfileSubmit} className="space-y-5">
              {profileSuccess && (
                <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-sm text-green-700 dark:text-green-400">
                  <CheckCircle className="w-4 h-4 flex-shrink-0" />{profileSuccess}
                </div>
              )}
              {profileError && (
                <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-400">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />{profileError}
                </div>
              )}

              {showAvatarInput && (
                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
                  <label className={labelCls}>Profile Photo</label>
                  <div className="flex flex-col gap-3">
                    {/* File upload */}
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-2 px-4 py-2 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400 rounded-lg cursor-pointer hover:bg-primary-100 dark:hover:bg-primary-900/30 transition-colors text-sm font-medium border border-primary-200 dark:border-primary-800">
                        <Upload className="w-4 h-4" />
                        Upload Photo
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            if (file.size > 2 * 1024 * 1024) {
                              setProfileError('Image must be smaller than 2MB');
                              return;
                            }
                            const reader = new FileReader();
                            reader.onload = (ev) => {
                              setProfileForm(p => ({ ...p, avatarUrl: ev.target.result }));
                            };
                            reader.readAsDataURL(file);
                          }}
                        />
                      </label>
                      <span className="text-xs text-gray-400">or paste a URL below</span>
                    </div>
                    {/* URL input */}
                    <div className="flex gap-2">
                      <input
                        type="url"
                        value={profileForm.avatarUrl?.startsWith('data:') ? '' : profileForm.avatarUrl}
                        onChange={(e) => setProfileForm(p => ({ ...p, avatarUrl: e.target.value }))}
                        placeholder="https://example.com/your-photo.jpg"
                        className={`${inputCls} flex-1`}
                      />
                      <button type="button" onClick={() => setShowAvatarInput(false)} className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                        Done
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Upload a photo (max 2MB) or paste a link to your profile picture</p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className={labelCls}>Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input type="text" value={profileForm.name} onChange={(e) => setProfileForm(p => ({ ...p, name: e.target.value }))} className={`${inputCls} pl-10`} required />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input type="email" value={profileForm.email} onChange={(e) => setProfileForm(p => ({ ...p, email: e.target.value }))} className={`${inputCls} pl-10`} required />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Phone Number</label>
                  <input type="tel" value={profileForm.phone} onChange={(e) => setProfileForm(p => ({ ...p, phone: e.target.value }))} placeholder="Enter phone number" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Role</label>
                  <input type="text" value={getRoleLabel(user?.role)} disabled className={`${inputCls} bg-gray-50 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed`} />
                </div>
              </div>

              <div>
                <label className={labelCls}>Bio</label>
                <textarea value={profileForm.bio} onChange={(e) => setProfileForm(p => ({ ...p, bio: e.target.value }))} placeholder="Tell us a little about yourself..." rows={3} className={`${inputCls} resize-none`} />
              </div>

              <div className="flex justify-end">
                <button type="submit" disabled={profileLoading} className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 text-sm font-medium transition-colors">
                  <Save className="w-4 h-4" />{profileLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          )}

          {/* ── PASSWORD TAB ── */}
          {activeTab === 'password' && (
            <form onSubmit={handlePasswordSubmit} className="space-y-5 max-w-lg">
              {passwordSuccess && (
                <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-sm text-green-700 dark:text-green-400">
                  <CheckCircle className="w-4 h-4 flex-shrink-0" />{passwordSuccess}
                </div>
              )}
              {passwordError && (
                <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-400">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />{passwordError}
                </div>
              )}

              <div>
                <label className={labelCls}>Current Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input type={showCurrentPwd ? 'text' : 'password'} value={passwordForm.currentPassword} onChange={(e) => setPasswordForm(p => ({ ...p, currentPassword: e.target.value }))} className={`${inputCls} pl-10 pr-10`} required />
                  <button type="button" onClick={() => setShowCurrentPwd(!showCurrentPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                    {showCurrentPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className={labelCls}>New Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input type={showNewPwd ? 'text' : 'password'} value={passwordForm.newPassword} onChange={(e) => setPasswordForm(p => ({ ...p, newPassword: e.target.value }))} placeholder="At least 6 characters" className={`${inputCls} pl-10 pr-10`} required minLength={6} />
                  <button type="button" onClick={() => setShowNewPwd(!showNewPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                    {showNewPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className={labelCls}>Confirm New Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input type={showConfirmPwd ? 'text' : 'password'} value={passwordForm.confirmPassword} onChange={(e) => setPasswordForm(p => ({ ...p, confirmPassword: e.target.value }))} placeholder="Re-enter new password" className={`${inputCls} pl-10 pr-10`} required />
                  <button type="button" onClick={() => setShowConfirmPwd(!showConfirmPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                    {showConfirmPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="flex justify-end">
                <button type="submit" disabled={passwordLoading} className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 text-sm font-medium transition-colors">
                  <Lock className="w-4 h-4" />{passwordLoading ? 'Changing...' : 'Change Password'}
                </button>
              </div>
            </form>
          )}

          {/* ── PREFERENCES TAB ── */}
          {activeTab === 'preferences' && (
            <div className="space-y-6 max-w-lg">
              {/* Theme */}
              <div>
                <h3 className="text-sm font-semibold text-gray-800 dark:text-white mb-3 flex items-center gap-2"><Palette className="w-4 h-4" /> Appearance</h3>
                <div className="space-y-3">
                  {[
                    { value: 'light', label: 'Light', icon: Sun },
                    { value: 'dark', label: 'Dark', icon: Moon },
                  ].map((opt) => {
                    const Icon = opt.icon;
                    return (
                      <label key={opt.value} className={`flex items-center justify-between p-4 rounded-lg border cursor-pointer transition-colors ${theme === opt.value
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                        : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                        }`}>
                        <div className="flex items-center gap-3">
                          <Icon size={20} className={theme === opt.value ? 'text-primary-600 dark:text-primary-400' : 'text-gray-500 dark:text-gray-400'} />
                          <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{opt.label}</span>
                        </div>
                        <input
                          type="radio"
                          name="theme"
                          value={opt.value}
                          checked={theme === opt.value}
                          onChange={() => setTheme(opt.value)}
                          className="accent-primary-600"
                        />
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Admin-only settings placeholder */}
              {hasRole(['admin']) && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-800 dark:text-white mb-3 flex items-center gap-2"><Shield className="w-4 h-4" /> Admin Settings</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">System-level preferences and controls will appear here when connected to the backend.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;
