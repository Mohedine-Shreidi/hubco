import { useState, useEffect, useRef, useCallback } from 'react';
import { initializeSocket } from '../services/socket';
import { chatAPI } from '../services/api';
import { useAuth } from './useAuth';

/**
 * Normalize a raw DB message row into the shape ChatBox expects.
 */
const normalizeMsg = (m) => ({
  id: m.id,
  userId: m.sender_id,
  userName: m.sender_name || 'Unknown',
  userAvatar: m.sender_avatar,
  message: m.content,
  timestamp: m.created_at,
});

/**
 * Custom hook for Socket.io + REST chat functionality.
 * - Loads message history from REST API on mount / roomId change.
 * - Maintains real Socket.io connection for real-time typing indicators
 *   and incoming messages from other users.
 * - Persists outgoing messages via REST (which also broadcasts via socket).
 *
 * @param {string} roomId - Chat room UUID from the backend
 * @returns {object} Socket state and methods
 */
export const useSocket = (roomId) => {
  const { user, token } = useAuth();
  const [messages, setMessages] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // ── Load message history from REST whenever roomId changes ──
  useEffect(() => {
    // Always clear old messages immediately when room changes
    setMessages([]);
    if (!roomId) return;
    let cancelled = false;
    chatAPI.getMessages(roomId)
      .then((res) => {
        if (!cancelled && res?.success) setMessages((res.data ?? []).map(normalizeMsg));
      })
      .catch(() => {/* silently fail – socket will still work */});
    return () => { cancelled = true; };
  }, [roomId]);

  // ── Manage real Socket.io connection ────────────────────────
  useEffect(() => {
    if (!user || !token) return;

    const socket = initializeSocket(token);
    socketRef.current = socket;
    socket.connect();

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('connect_error', () => setConnected(false));

    // Incoming messages from other users (own messages are added after REST POST)
    socket.on('receive_message', (msg) => {
      if (msg.sender_id !== user.id) {
        setMessages((prev) => [...prev, normalizeMsg(msg)]);
      }
    });

    socket.on('user_typing', (data) => {
      if (data.userId !== user.id) {
        setTypingUsers((prev) => {
          if (prev.find((u) => u.id === data.userId)) return prev;
          return [...prev, { id: data.userId, name: data.name }];
        });
      }
    });

    socket.on('user_stop_typing', (data) => {
      setTypingUsers((prev) => prev.filter((u) => u.id !== data.userId));
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [user, token]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Join / leave room when roomId changes ───────────────────
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !roomId) return;
    socket.emit('join_room', { roomId });
    return () => socket.emit('leave_room', { roomId });
  }, [roomId]);

  // ── Send message via REST API (which broadcasts via socket) ─
  const sendMessage = useCallback(async (content) => {
    if (!content.trim() || !roomId) return;
    try {
      const res = await chatAPI.sendMessage(roomId, content);
      if (res?.success) {
        setMessages((prev) => [...prev, normalizeMsg(res.data)]);
      }
    } catch (err) {
      console.error('Send message failed:', err);
    }
    stopTyping();
  }, [roomId]); // eslint-disable-line react-hooks/exhaustive-deps

  const stopTyping = useCallback(() => {
    const socket = socketRef.current;
    if (socket && roomId) socket.emit('stop_typing', { roomId });
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
  }, [roomId]);

  /**
   * Send typing indicator
   */
  const startTyping = () => {
    const socket = socketRef.current;
    if (!socket || !roomId) return;
    socket.emit('typing', { roomId });
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => stopTyping(), 3000);
  };

  return {
    messages,
    onlineUsers,
    typingUsers,
    connected,
    sendMessage,
    startTyping,
    stopTyping,
  };
};

export default useSocket;

