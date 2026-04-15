import { jwtDecode } from 'jwt-decode';

/**
 * Format date to readable string
 * @param {string|Date} date - Date to format
 * @returns {string} Formatted date string
 */
export const formatDate = (date) => {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

/**
 * Format date with time
 * @param {string|Date} date - Date to format
 * @returns {string} Formatted date with time
 */
export const formatDateTime = (date) => {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

/**
 * Check if a date is past current date
 * @param {string|Date} date - Date to check
 * @returns {boolean} True if date is in the past
 */
export const isPastDeadline = (date) => {
  if (!date) return false;
  return new Date(date) < new Date();
};

/**
 * Calculate days remaining until deadline
 * @param {string|Date} deadline - Deadline date
 * @returns {number} Days remaining (negative if past)
 */
export const getDaysRemaining = (deadline) => {
  if (!deadline) return 0;
  const now = new Date();
  const end = new Date(deadline);
  const diff = end - now;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

/**
 * Decode JWT token and extract user info
 * @param {string} token - JWT token
 * @returns {object|null} Decoded token or null if invalid
 */
export const decodeToken = (token) => {
  if (!token) return null;
  try {
    return jwtDecode(token);
  } catch (error) {
    console.error('Error decoding token:', error);
    return null;
  }
};

/**
 * Get user role from token
 * @param {string} token - JWT token
 * @returns {string|null} User role or null
 */
export const getUserRole = (token) => {
  const decoded = decodeToken(token);
  return decoded?.role || null;
};

/**
 * Get user ID from token
 * @param {string} token - JWT token
 * @returns {string|null} User ID or null
 */
export const getUserId = (token) => {
  const decoded = decodeToken(token);
  return decoded?.id || null;
};

/**
 * Truncate text to specified length
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} Truncated text
 */
export const truncateText = (text, maxLength = 100) => {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

/**
 * Generate random color for avatar
 * @param {string} name - User name
 * @returns {string} Hex color code
 */
export const getAvatarColor = (name) => {
  const colors = [
    '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b',
    '#10b981', '#06b6d4', '#6366f1', '#f43f5e'
  ];
  const index = name.charCodeAt(0) % colors.length;
  return colors[index];
};

/**
 * Get initials from name
 * @param {string} name - Full name
 * @returns {string} Initials (max 2 characters)
 */
export const getInitials = (name) => {
  if (!name) return '';
  const parts = name.trim().split(' ');
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid
 */
export const isValidEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

/**
 * Get status badge color
 * @param {string} status - Status string
 * @returns {string} Tailwind color class
 */
export const getStatusColor = (status) => {
  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800',
    in_progress: 'bg-blue-100 text-blue-800',
    submitted: 'bg-green-100 text-green-800',
    late: 'bg-red-100 text-red-800',
    on_time: 'bg-green-100 text-green-800',
    not_submitted: 'bg-gray-100 text-gray-800'
  };
  return statusColors[status] || 'bg-gray-100 text-gray-800';
};
