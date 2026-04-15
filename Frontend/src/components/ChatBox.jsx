import { useState, useEffect, useRef } from 'react';
import { Send, Users as UsersIcon } from 'lucide-react';
import { useSocket } from '../hooks/useSocket';
import { useAuth } from '../hooks/useAuth';
import { formatDateTime } from '../utils/helpers';
import Avatar from './Avatar';

/**
 * ChatBox Component
 * Real-time chat interface with avatars, timestamps, sender role display, and typing indicators.
 */
const ChatBox = ({ roomId }) => {
  const { user } = useAuth();
  const [message, setMessage] = useState('');
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const {
    messages,
    onlineUsers,
    typingUsers,
    connected,
    sendMessage,
    startTyping,
    stopTyping
  } = useSocket(roomId);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!message.trim()) return;
    sendMessage(message);
    setMessage('');
    inputRef.current?.focus();
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    setMessage(value);
    value.trim() ? startTyping() : stopTyping();
  };

  const handleInputBlur = () => {
    stopTyping();
  };

  const isOwn = (msgUserId) => msgUserId === user.id;

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-800 rounded-lg shadow-soft border border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Chat</h3>
          <div className="flex items-center space-x-1 text-sm text-gray-500 dark:text-gray-400 mt-1">
            <UsersIcon size={14} />
            <span>{onlineUsers.length} online</span>
            {!connected && <span className="text-red-500 ml-2">● Disconnected</span>}
            {connected && <span className="text-green-500 ml-2">● Connected</span>}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 dark:text-gray-400 mt-8">
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${isOwn(msg.userId) ? 'justify-end' : 'justify-start'}`}>
                {/* Avatar (left for others) */}
                {!isOwn(msg.userId) && (
                  <div className="mr-2 mt-auto">
                    <Avatar name={msg.userName || 'U'} size={32} />
                  </div>
                )}
                <div className="max-w-[70%]">
                  {/* Sender name + role */}
                  {!isOwn(msg.userId) && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 ml-2 flex items-center gap-1.5">
                      <span className="font-medium">{msg.userName}</span>
                      {msg.userRole && <span className="text-[10px] capitalize opacity-70">{msg.userRole.replace('_', ' ')}</span>}
                    </p>
                  )}
                  <div className={`px-4 py-2 rounded-2xl ${isOwn(msg.userId)
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-100'
                    }`}>
                    <p className="text-sm break-words">{msg.message}</p>
                  </div>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 ml-2">
                    {formatDateTime(msg.timestamp)}
                  </p>
                </div>
                {/* Avatar (right for own) */}
                {isOwn(msg.userId) && (
                  <div className="ml-2 mt-auto">
                    <Avatar name={user?.name || 'U'} imageUrl={user?.avatarUrl} size={32} />
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </>
        )}

        {/* Typing indicator */}
        {typingUsers.length > 0 && (
          <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400 italic">
            <div className="flex space-x-1">
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></span>
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></span>
            </div>
            <span>
              {typingUsers.length === 1
                ? `${typingUsers[0].name} is typing...`
                : `${typingUsers.length} people are typing...`}
            </span>
          </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSendMessage} className="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-3">
          <input
            ref={inputRef}
            type="text"
            value={message}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            placeholder="Type your message..."
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-full focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            disabled={!connected}
          />
          <button
            type="submit"
            disabled={!message.trim() || !connected}
            className="p-3 bg-primary-600 text-white rounded-full hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Send message"
          >
            <Send size={20} />
          </button>
        </div>
      </form>
    </div>
  );
};

export default ChatBox;
