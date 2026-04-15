import { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { notificationAPI } from '../services/api';
import AuthContext from './AuthContext';

// Create Notification Context
export const NotificationContext = createContext(null);

/**
 * NotificationProvider component - Manages notifications
 * Provides notification data, unread count, and mark as read functions
 */
export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const { user } = useContext(AuthContext);

  /**
   * Fetch notifications from API
   */
  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await notificationAPI.getNotifications();
      if (res?.success) {
        // Backend returns { success, data: { notifications: [...], unreadCount: N } }
        // Normalize: add .read boolean so components don't need to check .status === 'read'
        const normalized = (res.data?.notifications ?? []).map(n => ({
          ...n,
          read: n.status !== 'unread',
        }));
        setNotifications(normalized);
        setUnreadCount(res.data?.unreadCount ?? 0);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Fetch notifications when user logs in / changes
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Keep unreadCount in sync with local state
  useEffect(() => {
    const count = notifications.filter(n => !n.read).length;
    setUnreadCount(count);
  }, [notifications]);

  /**
   * Mark notification as read
   * @param {string} notificationId - Notification ID
   */
  const markAsRead = async (notificationId) => {
    try {
      await notificationAPI.markAsRead(notificationId);
      setNotifications(prev =>
        prev.map(n =>
          n.id === notificationId ? { ...n, status: 'read', read: true } : n
        )
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  /**
   * Mark all notifications as read
   */
  const markAllAsRead = async () => {
    try {
      await notificationAPI.markAllAsRead();
      setNotifications(prev =>
        prev.map(n => ({ ...n, status: 'read', read: true }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  /**
   * Add new notification (for real-time updates)
   * @param {object} notification - Notification object
   */
  const addNotification = (notification) => {
    setNotifications(prev => [notification, ...prev]);
  };

  /**
   * Clear all notifications
   */
  const clearNotifications = () => {
    setNotifications([]);
  };

  const value = {
    notifications,
    unreadCount,
    loading,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    addNotification,
    clearNotifications
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export default NotificationContext;
