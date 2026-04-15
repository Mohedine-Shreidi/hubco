import { createContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';

// Create Auth Context
export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser]     = useState(null);
  const [token, setToken]   = useState(() => localStorage.getItem('hc_token'));
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // ── Persist helpers ────────────────────────────────────────
  const persistSession = (userObj, jwt) => {
    setUser(userObj);
    setToken(jwt);
    localStorage.setItem('hc_token', jwt);
    localStorage.setItem('hc_user', JSON.stringify(userObj));
  };

  const clearSession = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('hc_token');
    localStorage.removeItem('hc_user');
  };

  // ── Restore session on mount & verify with backend ─────────
  useEffect(() => {
    const restore = async () => {
      const jwt     = localStorage.getItem('hc_token');
      const saved   = localStorage.getItem('hc_user');
      if (!jwt) { setLoading(false); return; }

      // Optimistic restore so UI renders immediately
      if (saved) {
        try { setUser(JSON.parse(saved)); } catch (_) {}
      }

      // Validate token against backend
      try {
        const res = await authAPI.me();
        if (res?.success && res.data) {
          // /auth/me returns { success, data: { user: {...} } }
          const userObj = res.data.user ?? res.data;
          setUser(userObj);
          localStorage.setItem('hc_user', JSON.stringify(userObj));
        } else {
          clearSession();
        }
      } catch (_) {
        // 401 interceptor in api.js already cleared storage + will redirect
        clearSession();
      } finally {
        setLoading(false);
      }
    };
    restore();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Login ──────────────────────────────────────────────────
  const login = useCallback(async (email, password) => {
    try {
      const res = await authAPI.login(email, password);
      if (!res?.success) {
        return { success: false, error: res?.error || 'Login failed.' };
      }
      const { user: userObj, token: jwt } = res.data;
      persistSession(userObj, jwt);

      if (userObj.role === 'admin' || userObj.role === 'instructor') {
        navigate('/dashboard');
      } else {
        navigate('/tasks');
      }
      return { success: true };
    } catch (err) {
      return { success: false, error: err?.error || 'Invalid email or password.' };
    }
  }, [navigate]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Logout ─────────────────────────────────────────────────
  const logout = useCallback(async () => {
    try { await authAPI.logout(); } catch (_) {}
    clearSession();
    navigate('/login');
  }, [navigate]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Role helpers ───────────────────────────────────────────
  const hasRole = useCallback((roles) => {
    if (!user) return false;
    if (Array.isArray(roles)) return roles.includes(user.role);
    return user.role === roles;
  }, [user]);

  const isAuthenticated = useCallback(() => !!user, [user]);

  // ── Update local user state after profile edit ─────────────
  const updateUser = useCallback((updatedData) => {
    setUser((prev) => {
      const next = { ...prev, ...updatedData };
      localStorage.setItem('hc_user', JSON.stringify(next));
      return next;
    });
  }, []);

  const value = {
    user,
    token,
    loading,
    login,
    logout,
    hasRole,
    isAuthenticated,
    updateUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
