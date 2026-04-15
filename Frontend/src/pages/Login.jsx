import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { authAPI } from '../services/api';
import { LogIn, Mail, Lock, Loader, ArrowLeft, CheckCircle, KeyRound } from 'lucide-react';

/**
 * Login Page
 * Authentication page with email and password, and forgot password
 */
const Login = () => {
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Forgot password state
  const [forgotMode, setForgotMode] = useState(false); // 'email' | 'code' | 'reset' | 'success'
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState('');
  const [forgotStep, setForgotStep] = useState('email'); // email -> code -> reset -> success

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await login(formData.email, formData.password);
      if (!result.success) {
        setError(result.error);
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Demo credentials
  const demoAccounts = [
    { email: 'admin@hub.com', password: 'admin123', role: 'Admin' },
    { email: 'instructor@hub.com', password: 'inst123', role: 'Instructor' },
    { email: 'student@hub.com', password: 'stud123', role: 'Student' },
    { email: 'leader@hub.com', password: 'lead123', role: 'Team Leader' }
  ];

  const fillDemo = (email, password) => {
    setFormData({ email, password });
    setError('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo and title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl mb-4 shadow-soft-lg">
            <span className="text-white font-bold text-2xl">H</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">HubConnect</h1>
          <p className="text-gray-600 dark:text-gray-400">Centralized Team Management Platform</p>
        </div>

        {/* Login card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-soft-lg p-8 border border-gray-100 dark:border-gray-700">
          <h2 className="text-2xl font-semibold text-gray-800 dark:text-white mb-6">Sign In</h2>

          {/* Error message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          {/* Login form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail
                  size={18}
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="your.email@example.com"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock
                  size={18}
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                />
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Enter your password"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            {/* Forgot Password Link */}
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => { setForgotMode(true); setForgotStep('email'); setForgotError(''); setForgotEmail(formData.email); }}
                className="text-sm text-primary-600 hover:text-primary-700 font-medium"
              >
                Forgot Password?
              </button>
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader size={20} className="animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <LogIn size={20} />
                  <span>Sign In</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Forgot Password Modal */}
        {forgotMode && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md">
              <div className="p-6">
                {/* Header */}
                <div className="flex items-center gap-3 mb-6">
                  {forgotStep !== 'success' && (
                    <button
                      onClick={() => {
                        if (forgotStep === 'email') { setForgotMode(false); }
                        else if (forgotStep === 'code') { setForgotStep('email'); }
                        else if (forgotStep === 'reset') { setForgotStep('code'); }
                      }}
                      className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                    >
                      <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    </button>
                  )}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {forgotStep === 'email' && 'Forgot Password'}
                      {forgotStep === 'code' && 'Verify Code'}
                      {forgotStep === 'reset' && 'Set New Password'}
                      {forgotStep === 'success' && 'Password Reset!'}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {forgotStep === 'email' && 'Enter your email to receive a reset code'}
                      {forgotStep === 'code' && `A code was sent to ${forgotEmail}`}
                      {forgotStep === 'reset' && 'Enter your new password below'}
                      {forgotStep === 'success' && 'Your password has been changed'}
                    </p>
                  </div>
                </div>

                {forgotError && (
                  <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
                    {forgotError}
                  </div>
                )}

                {/* Step: Email */}
                {forgotStep === 'email' && (
                  <div className="space-y-4">
                    <div className="relative">
                      <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="email"
                        value={forgotEmail}
                        onChange={(e) => { setForgotEmail(e.target.value); setForgotError(''); }}
                        placeholder="your.email@example.com"
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        autoFocus
                      />
                    </div>
                    <button
                      onClick={async () => {
                        if (!forgotEmail.trim()) { setForgotError('Please enter your email'); return; }
                        try {
                          setForgotLoading(true); setForgotError('');
                          await authAPI.forgotPassword(forgotEmail);
                          setForgotStep('code');
                        } catch (err) { setForgotError(err.message || 'Failed to send reset code'); }
                        finally { setForgotLoading(false); }
                      }}
                      disabled={forgotLoading}
                      className="w-full py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {forgotLoading ? <Loader size={18} className="animate-spin" /> : <Mail size={18} />}
                      {forgotLoading ? 'Sending...' : 'Send Reset Code'}
                    </button>
                  </div>
                )}

                {/* Step: Code */}
                {forgotStep === 'code' && (
                  <div className="space-y-4">
                    <div className="relative">
                      <KeyRound size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        value={resetCode}
                        onChange={(e) => { setResetCode(e.target.value); setForgotError(''); }}
                        placeholder="Enter 6-digit code"
                        maxLength={6}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-center text-lg tracking-widest font-mono"
                        autoFocus
                      />
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 text-center">For demo, use code: <span className="font-mono font-semibold text-primary-600">123456</span></p>
                    <button
                      onClick={async () => {
                        if (!resetCode.trim()) { setForgotError('Please enter the code'); return; }
                        try {
                          setForgotLoading(true); setForgotError('');
                          await authAPI.verifyResetCode(forgotEmail, resetCode);
                          setForgotStep('reset');
                        } catch (err) { setForgotError(err.message || 'Invalid code'); }
                        finally { setForgotLoading(false); }
                      }}
                      disabled={forgotLoading}
                      className="w-full py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {forgotLoading ? <Loader size={18} className="animate-spin" /> : <CheckCircle size={18} />}
                      {forgotLoading ? 'Verifying...' : 'Verify Code'}
                    </button>
                  </div>
                )}

                {/* Step: New Password */}
                {forgotStep === 'reset' && (
                  <div className="space-y-4">
                    <div className="relative">
                      <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => { setNewPassword(e.target.value); setForgotError(''); }}
                        placeholder="New password (min 6 chars)"
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        autoFocus
                      />
                    </div>
                    <div className="relative">
                      <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => { setConfirmPassword(e.target.value); setForgotError(''); }}
                        placeholder="Confirm new password"
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    </div>
                    <button
                      onClick={async () => {
                        if (newPassword.length < 6) { setForgotError('Password must be at least 6 characters'); return; }
                        if (newPassword !== confirmPassword) { setForgotError('Passwords do not match'); return; }
                        try {
                          setForgotLoading(true); setForgotError('');
                          await authAPI.resetPassword(forgotEmail, resetCode, newPassword);
                          setForgotStep('success');
                        } catch (err) { setForgotError(err.message || 'Failed to reset password'); }
                        finally { setForgotLoading(false); }
                      }}
                      disabled={forgotLoading}
                      className="w-full py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {forgotLoading ? <Loader size={18} className="animate-spin" /> : <Lock size={18} />}
                      {forgotLoading ? 'Resetting...' : 'Reset Password'}
                    </button>
                  </div>
                )}

                {/* Step: Success */}
                {forgotStep === 'success' && (
                  <div className="text-center space-y-4">
                    <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto">
                      <CheckCircle className="w-8 h-8 text-green-600" />
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 text-sm">Your password has been reset successfully. You can now sign in with your new password.</p>
                    <button
                      onClick={() => { setForgotMode(false); setResetCode(''); setNewPassword(''); setConfirmPassword(''); }}
                      className="w-full py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium"
                    >
                      Back to Sign In
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Demo accounts */}
        <div className="mt-6 bg-white dark:bg-gray-800 rounded-2xl shadow-soft-lg p-6 border border-gray-100 dark:border-gray-700">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Demo Accounts</h3>
          <div className="space-y-2">
            {demoAccounts.map((account, index) => (
              <button
                key={index}
                onClick={() => fillDemo(account.email, account.password)}
                className="w-full text-left px-4 py-2 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors text-sm"
                disabled={loading}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-800 dark:text-white">{account.role}</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">{account.email}</span>
                </div>
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-3 text-center">
            Click any account to auto-fill credentials
          </p>
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
          © 2026 HubConnect. All rights reserved.
        </p>
      </div>
    </div>
  );
};

export default Login;
