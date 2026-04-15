import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import ChatBox from '../components/ChatBox';
import { chatAPI } from '../services/api';
import Avatar from '../components/Avatar';
import { MessageSquare, Users, Globe, Briefcase, Hash, Loader, Search, ArrowLeft, Mail } from 'lucide-react';

/**
 * Chat Page
 * Tabbed chat: General, Course-level, Team-level.
 * General tab includes a user list for private (DM) messaging.
 * Fetches real room UUIDs from the backend so Socket.io and REST
 * message persistence work correctly.
 */
const Chat = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('general');
  const [rooms, setRooms] = useState([]);
  const [loadingRooms, setLoadingRooms] = useState(true);

  // DM state
  const [dmUsers, setDmUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [activeDM, setActiveDM] = useState(null);       // { userId, name, avatarUrl, roomId }
  const [loadingDMRoom, setLoadingDMRoom] = useState(false);

  // Course chat selector state
  const [selectedCourseRoomId, setSelectedCourseRoomId] = useState(null);

  // Unread DM tracking: Set of user IDs that have unread messages
  const [unreadDMs, setUnreadDMs] = useState(new Set());
  const unreadIntervalRef = useRef(null);

  // Fetch unread DMs from backend (on mount + poll every 10s)
  const fetchUnreadDMs = () => {
    chatAPI.getUnreadDMs()
      .then((res) => {
        if (res?.success) setUnreadDMs(new Set(res.data ?? []));
      })
      .catch(() => { });
  };

  useEffect(() => {
    fetchUnreadDMs();
    unreadIntervalRef.current = setInterval(fetchUnreadDMs, 10000);
    return () => clearInterval(unreadIntervalRef.current);
  }, []);

  const tabs = [
    { id: 'general', label: 'General', icon: Globe },
    { id: 'course', label: 'Course', icon: Briefcase },
    { id: 'team', label: 'Team', icon: Hash },
  ];

  // Fetch all accessible rooms from the backend
  useEffect(() => {
    chatAPI.getRooms()
      .then((res) => { if (res?.success) setRooms(res.data ?? []); })
      .catch(() => { })
      .finally(() => setLoadingRooms(false));
  }, []);

  // Fetch available DM users when on general tab
  useEffect(() => {
    if (activeTab === 'general') {
      setLoadingUsers(true);
      chatAPI.getUsers()
        .then((res) => { if (res?.success) setDmUsers(res.data ?? []); })
        .catch(() => { })
        .finally(() => setLoadingUsers(false));
    }
  }, [activeTab]);

  // Resolve the real room UUID for the currently active tab
  const getRoomId = () => {
    // If user selected a DM conversation, use that room
    if (activeTab === 'general' && activeDM?.roomId) {
      return activeDM.roomId;
    }
    if (activeTab === 'general') {
      return rooms.find((r) => r.room_type === 'general')?.id ?? null;
    }
    if (activeTab === 'course') {
      return selectedCourseRoomId ?? null;
    }
    if (activeTab === 'team') {
      const teamId = user?.teamId;
      if (!teamId) return null;
      return rooms.find((r) => r.room_type === 'team' && r.team_id === teamId)?.id ?? null;
    }
    return null;
  };

  const roomId = getRoomId();

  // Open DM with a specific user
  const openDM = async (targetUser) => {
    try {
      setLoadingDMRoom(true);
      const res = await chatAPI.getOrCreateDM(targetUser.id);
      if (res?.success) {
        setActiveDM({
          userId: targetUser.id,
          name: targetUser.full_name,
          avatarUrl: targetUser.avatar_url,
          roomId: res.data.id,
        });
        // Clear unread for this user
        setUnreadDMs((prev) => {
          const next = new Set(prev);
          next.delete(targetUser.id);
          return next;
        });
      }
    } catch (err) {
      console.error('Failed to open DM:', err);
    } finally {
      setLoadingDMRoom(false);
    }
  };

  // Go back to general chat from DM
  const backToGeneral = () => {
    setActiveDM(null);
  };

  // Filter users by search
  const filteredUsers = dmUsers.filter((u) =>
    u.full_name?.toLowerCase().includes(userSearch.toLowerCase())
  );

  const noRoomMessage = () => {
    if (loadingRooms) return null;
    if (activeTab === 'course') return null; // handled inline
    if (activeTab === 'team' && !user?.teamId) {
      return { title: 'No Team Assigned', desc: 'You need to be part of a team to access team chat.' };
    }
    if (!roomId) {
      return { title: 'No Chat Room Found', desc: 'A chat room for this channel has not been created yet.' };
    }
    return null;
  };

  const msg = noRoomMessage();

  // Reset DM and course selection when switching tabs
  const handleTabSwitch = (tabId) => {
    setActiveTab(tabId);
    setActiveDM(null);
    setSelectedCourseRoomId(null);
  };

  const courseRooms = rooms.filter((r) => r.room_type === 'course');

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Chat</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Communicate with your peers in real-time</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg w-fit">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabSwitch(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === tab.id
                ? 'bg-white dark:bg-gray-700 text-primary-700 dark:text-primary-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                }`}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Chat area */}
      {loadingRooms ? (
        <div className="flex gap-4 h-[calc(100vh-12rem)]">
          {/* Skeleton sidebar */}
          <div className="w-72 flex-shrink-0 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-4">
            <div className="h-5 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3.5 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                  <div className="h-2.5 w-16 bg-gray-100 dark:bg-gray-600 rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
          {/* Skeleton chat area */}
          <div className="flex-1 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 flex flex-col">
            <div className="h-6 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-4" />
            <div className="flex-1 space-y-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
                  <div className="flex gap-2 max-w-[60%]">
                    {i % 2 === 0 && <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse mt-auto" />}
                    <div className="space-y-1">
                      <div className={`h-10 rounded-2xl animate-pulse ${i % 2 === 0 ? 'w-48 bg-gray-200 dark:bg-gray-700' : 'w-36 bg-primary-200 dark:bg-primary-900/30'}`} />
                      <div className="h-2.5 w-16 bg-gray-100 dark:bg-gray-600 rounded animate-pulse" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse mt-4" />
          </div>
        </div>
      ) : msg ? (
        <div className="flex items-center justify-center h-[calc(100vh-12rem)]">
          <div className="text-center">
            <Users size={64} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-2">{msg.title}</h2>
            <p className="text-gray-600 dark:text-gray-400">{msg.desc}</p>
          </div>
        </div>
      ) : activeTab === 'general' ? (
        /* General tab: user list sidebar + chat */
        <div className="flex gap-4 h-[calc(100vh-12rem)]">
          {/* User list sidebar */}
          <div className="w-72 flex-shrink-0 bg-white dark:bg-gray-800 rounded-lg shadow-soft border border-gray-200 dark:border-gray-700 flex flex-col">
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-semibold text-gray-800 dark:text-white flex items-center gap-2">
                <Users size={16} />
                Users
              </h3>
              {/* Search bar */}
              <div className="relative mt-2">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Search users..."
                  className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* General chat button */}
            <button
              onClick={backToGeneral}
              className={`flex items-center gap-3 px-4 py-3 text-sm w-full text-left transition-colors border-b border-gray-100 dark:border-gray-700 ${!activeDM
                ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 font-medium'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
            >
              <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/50 flex items-center justify-center">
                <Globe size={16} className="text-primary-600 dark:text-primary-400" />
              </div>
              <div className="truncate">
                <p className="font-medium">General Chat</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Everyone</p>
              </div>
            </button>

            {/* User list */}
            <div className="flex-1 overflow-y-auto">
              {loadingUsers ? (
                <div className="flex items-center justify-center py-8">
                  <Loader size={20} className="animate-spin text-primary-500" />
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="text-center py-8 text-sm text-gray-500 dark:text-gray-400">
                  No users found
                </div>
              ) : (
                filteredUsers.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => openDM(u)}
                    disabled={loadingDMRoom}
                    className={`flex items-center gap-3 px-4 py-2.5 text-sm w-full text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-700 ${activeDM?.userId === u.id
                      ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400'
                      : 'text-gray-700 dark:text-gray-300'
                      }`}
                  >
                    <div className="relative">
                      <Avatar name={u.full_name || 'U'} imageUrl={u.avatar_url} size={32} />
                      {unreadDMs.has(u.id) && (
                        <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-blue-500 rounded-full border-2 border-white dark:border-gray-800" />
                      )}
                    </div>
                    <div className="truncate flex-1">
                      <p className={`font-medium truncate ${unreadDMs.has(u.id) ? 'text-gray-900 dark:text-white' : ''}`}>{u.full_name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{u.role?.replace('_', ' ') || 'User'}</p>
                    </div>
                    {unreadDMs.has(u.id) ? (
                      <span className="w-2.5 h-2.5 bg-blue-500 rounded-full flex-shrink-0 animate-pulse" />
                    ) : (
                      <Mail size={14} className="text-gray-400 flex-shrink-0" />
                    )}
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Chat area */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* DM header (back button + user info) */}
            {activeDM && (
              <div className="flex items-center gap-3 mb-2 px-2">
                <button
                  onClick={backToGeneral}
                  className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 transition-colors"
                >
                  <ArrowLeft size={18} />
                </button>
                <Avatar name={activeDM.name || 'U'} imageUrl={activeDM.avatarUrl} size={28} />
                <span className="font-medium text-gray-800 dark:text-white text-sm">{activeDM.name}</span>
              </div>
            )}
            {loadingDMRoom ? (
              <div className="flex-1 flex items-center justify-center">
                <Loader size={32} className="animate-spin text-primary-500" />
              </div>
            ) : (
              <div className="flex-1 min-h-0">
                <ChatBox key={roomId} roomId={roomId} />
              </div>
            )}
          </div>
        </div>
      ) : activeTab === 'course' ? (
        <div className="flex gap-4 h-[calc(100vh-12rem)]">
          {/* Course list sidebar */}
          <div className="w-72 flex-shrink-0 bg-white dark:bg-gray-800 rounded-lg shadow-soft border border-gray-200 dark:border-gray-700 flex flex-col">
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-semibold text-gray-800 dark:text-white flex items-center gap-2">
                <Briefcase size={16} />
                Courses
              </h3>
            </div>
            <div className="flex-1 overflow-y-auto">
              {courseRooms.length === 0 ? (
                <div className="text-center py-8 text-sm text-gray-500 dark:text-gray-400">
                  No course chat rooms available
                </div>
              ) : (
                courseRooms.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => setSelectedCourseRoomId(r.id)}
                    className={`flex items-center gap-3 px-4 py-3 text-sm w-full text-left transition-colors ${selectedCourseRoomId === r.id
                        ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                  >
                    <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center flex-shrink-0">
                      <Briefcase size={16} className="text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="truncate">
                      <p className="font-medium truncate">{r.course_name || r.room_name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Course Chat</p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
          {/* Chat area */}
          <div className="flex-1 flex flex-col min-w-0">
            {selectedCourseRoomId ? (
              <>
                <div className="flex items-center gap-2 mb-2 px-2">
                  <button
                    onClick={() => setSelectedCourseRoomId(null)}
                    className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 transition-colors"
                  >
                    <ArrowLeft size={18} />
                  </button>
                  <span className="font-medium text-gray-800 dark:text-white text-sm">
                    {courseRooms.find((r) => r.id === selectedCourseRoomId)?.course_name || 'Course Chat'}
                  </span>
                </div>
                <div className="flex-1 min-h-0">
                  <ChatBox key={selectedCourseRoomId} roomId={selectedCourseRoomId} />
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-center">
                <div>
                  <Briefcase size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                  <p className="text-gray-500 dark:text-gray-400">Select a course to start chatting</p>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="h-[calc(100vh-12rem)]">
          <ChatBox key={roomId} roomId={roomId} />
        </div>
      )}

      {/* Guidelines */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <MessageSquare size={20} className="text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800 dark:text-blue-300">
            <p className="font-medium mb-1">Chat Guidelines</p>
            <ul className="list-disc list-inside space-y-1 text-blue-700 dark:text-blue-400">
              <li>Be respectful and professional</li>
              <li>Keep conversations relevant to your channel</li>
              <li>Messages are visible to all members of this channel</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chat;
