import { io } from 'socket.io-client';

const SOCKET_URL = 'http://localhost:5000';

// Mock messages storage
const mockMessages = {};
const mockUsers = {};

/**
 * Initialize Socket.io connection
 * @param {string} token - JWT token for authentication
 * @returns {object} Socket instance
 */
export const initializeSocket = (token) => {
  const socket = io(SOCKET_URL, {
    auth: { token },
    autoConnect: false
  });

  // Connection events
  socket.on('connect', () => {
    console.log('Socket connected:', socket.id);
  });

  socket.on('disconnect', () => {
    console.log('Socket disconnected');
  });

  socket.on('error', (error) => {
    console.error('Socket error:', error);
  });

  return socket;
};

/**
 * Mock socket for development without backend
 */
export class MockSocket {
  constructor(userId, userName) {
    this.userId = userId;
    this.userName = userName;
    this.connected = false;
    this.currentRoom = null;
    this.listeners = {};
  }

  connect() {
    this.connected = true;
    this.emit('connect');
    return this;
  }

  disconnect() {
    this.connected = false;
    if (this.currentRoom) {
      this.leaveRoom(this.currentRoom);
    }
    this.emit('disconnect');
  }

  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  off(event, callback) {
    if (!this.listeners[event]) return;
    if (callback) {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    } else {
      delete this.listeners[event];
    }
  }

  emit(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(callback => {
        // Simulate async behavior
        setTimeout(() => callback(data), 50);
      });
    }

    // Handle specific events
    if (event === 'join_room') {
      this.joinRoom(data.roomId);
    } else if (event === 'leave_room') {
      this.leaveRoom(data.roomId);
    } else if (event === 'send_message') {
      this.sendMessage(data);
    } else if (event === 'typing') {
      this.handleTyping(data);
    } else if (event === 'stop_typing') {
      this.handleStopTyping(data);
    }
  }

  joinRoom(roomId) {
    this.currentRoom = roomId;
    
    // Add user to room
    if (!mockUsers[roomId]) {
      mockUsers[roomId] = [];
    }
    if (!mockUsers[roomId].find(u => u.id === this.userId)) {
      mockUsers[roomId].push({
        id: this.userId,
        name: this.userName,
        online: true
      });
    }

    // Notify room joined
    this.emit('room_joined', {
      roomId,
      users: mockUsers[roomId],
      messages: mockMessages[roomId] || []
    });

    // Notify others
    this.emit('user_online', {
      userId: this.userId,
      userName: this.userName
    });
  }

  leaveRoom(roomId) {
    // Remove user from room
    if (mockUsers[roomId]) {
      mockUsers[roomId] = mockUsers[roomId].filter(u => u.id !== this.userId);
    }

    this.emit('user_offline', {
      userId: this.userId,
      userName: this.userName
    });

    this.currentRoom = null;
  }

  sendMessage(data) {
    const { roomId, message } = data;
    
    // Store message
    if (!mockMessages[roomId]) {
      mockMessages[roomId] = [];
    }

    const newMessage = {
      id: Date.now(),
      roomId,
      userId: this.userId,
      userName: this.userName,
      message,
      timestamp: new Date().toISOString()
    };

    mockMessages[roomId].push(newMessage);

    // Emit to all listeners
    setTimeout(() => {
      this.emit('receive_message', newMessage);
    }, 100);
  }

  handleTyping(data) {
    const { roomId } = data;
    this.emit('user_typing', {
      userId: this.userId,
      userName: this.userName,
      roomId
    });
  }

  handleStopTyping(data) {
    const { roomId } = data;
    this.emit('user_stop_typing', {
      userId: this.userId,
      userName: this.userName,
      roomId
    });
  }

  // Get online users in room
  getOnlineUsers(roomId) {
    return mockUsers[roomId] || [];
  }

  // Get messages for room
  getMessages(roomId) {
    return mockMessages[roomId] || [];
  }
}

export default initializeSocket;
