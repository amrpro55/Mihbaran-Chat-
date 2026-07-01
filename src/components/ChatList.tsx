import { useState } from 'react';
import { motion } from 'motion/react';
import { Search, Pin, VolumeX, Archive, Trash2, CheckCheck, Check, MessageSquarePlus, UserPlus, Settings, ShieldAlert, BarChart3, ShieldCheck, Feather } from 'lucide-react';
import { Chat, User, Message } from '../types';
import { Language, translations } from '../i18n';
import { getUsers, getMessages, saveChats, getChats } from '../db';

interface ChatListProps {
  language: Language;
  currentUser: User;
  chats: Chat[];
  onSelectChat: (chatId: string) => void;
  activeChatId?: string;
  onOpenSearchUsers: () => void;
  onOpenSettings: () => void;
  onOpenAdminPanel: () => void;
  currentTheme: 'light' | 'dark';
}

type TabType = 'all' | 'pinned' | 'archived';

export default function ChatList({
  language,
  currentUser,
  chats,
  onSelectChat,
  activeChatId,
  onOpenSearchUsers,
  onOpenSettings,
  onOpenAdminPanel,
  currentTheme
}: ChatListProps) {
  const t = translations[language];
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [contextMenuChatId, setContextMenuChatId] = useState<string | null>(null);

  // Get full participant details
  const users = getUsers();

  const getChatPartner = (chat: Chat): User | undefined => {
    const partnerId = chat.participants.find(p => p !== currentUser.id);
    return users.find(u => u.id === partnerId);
  };

  // Chat preference checkers
  const isPinned = (chatId: string) => currentUser.pinnedChats?.includes(chatId) || false;
  const isArchived = (chatId: string) => currentUser.archivedChats?.includes(chatId) || false;
  const isMuted = (chatId: string) => currentUser.mutedChats?.includes(chatId) || false;

  const handleTogglePreference = (chatId: string, type: 'pin' | 'archive' | 'mute') => {
    const allUsers = getUsers();
    const idx = allUsers.findIndex(u => u.id === currentUser.id);
    if (idx !== -1) {
      const user = allUsers[idx];
      if (type === 'pin') {
        user.pinnedChats = user.pinnedChats?.includes(chatId)
          ? user.pinnedChats.filter(id => id !== chatId)
          : [...(user.pinnedChats || []), chatId];
      } else if (type === 'archive') {
        user.archivedChats = user.archivedChats?.includes(chatId)
          ? user.archivedChats.filter(id => id !== chatId)
          : [...(user.archivedChats || []), chatId];
      } else if (type === 'mute') {
        user.mutedChats = user.mutedChats?.includes(chatId)
          ? user.mutedChats.filter(id => id !== chatId)
          : [...(user.mutedChats || []), chatId];
      }
      
      // Update local storage for active user
      localStorage.setItem('mihbaran_current_user', JSON.stringify(user));
      // Save global database
      allUsers[idx] = user;
      localStorage.setItem('mihbaran_users', JSON.stringify(allUsers));
    }
    setContextMenuChatId(null);
  };

  const handleDeleteChat = (chatId: string) => {
    const allChats = getChats().filter(c => c.id !== chatId);
    saveChats(allChats);
    
    // Delete messages too
    const remainingMessages = getMessages().filter(m => m.chatId !== chatId);
    localStorage.setItem('mihbaran_messages', JSON.stringify(remainingMessages));
    setContextMenuChatId(null);
  };

  // Filter & Search chats
  const filteredChats = chats.filter(chat => {
    const partner = getChatPartner(chat);
    if (!partner) return false;

    // Filter by Archive tab
    const archived = isArchived(chat.id);
    if (activeTab === 'archived' && !archived) return false;
    if (activeTab !== 'archived' && archived) return false;

    // Filter by Pinned tab
    if (activeTab === 'pinned' && !isPinned(chat.id)) return false;

    // Search query match
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const matchName = partner.name.toLowerCase().includes(searchLower);
      const matchUsername = (partner.username || '').toLowerCase().includes(searchLower);
      const matchMessage = chat.lastMessage?.text.toLowerCase().includes(searchLower) || false;
      return matchName || matchUsername || matchMessage;
    }

    return true;
  });

  // Sort: Pinned first, then latest message time
  const sortedChats = [...filteredChats].sort((a, b) => {
    const aPin = isPinned(a.id);
    const bPin = isPinned(b.id);
    if (aPin && !bPin) return -1;
    if (!aPin && bPin) return 1;

    const aTime = a.lastMessage?.timestamp || 0;
    const bTime = b.lastMessage?.timestamp || 0;
    return bTime - aTime;
  });

  const formatMessageTime = (timestamp?: number): string => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  return (
    <div className={`w-full md:w-80 h-full flex flex-col border-r transition-colors duration-300 shrink-0 relative ${
      currentTheme === 'dark' ? 'bg-zinc-950 border-zinc-800' : 'bg-zinc-50 border-zinc-200'
    }`} id="chat_list_sidebar" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      
      {/* Sidebar Header with Brand + Main actions */}
      <div className="p-4 flex flex-col gap-3" id="sidebar_header">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500 border border-emerald-500/10">
              <Feather className="w-4 h-4 transform -rotate-45" />
            </div>
            <h1 className="text-lg font-bold font-sans tracking-tight">{t.appName}</h1>
          </div>

          <div className="flex gap-1.5" id="sidebar_actions">
            {currentUser.isAdmin && (
              <button
                onClick={onOpenAdminPanel}
                className="p-1.5 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-800 text-amber-500 cursor-pointer transition-colors"
                title={t.adminPanelTitle}
                id="admin_panel_trigger"
              >
                <ShieldAlert className="w-5 h-5" />
              </button>
            )}
            <button
              onClick={onOpenSearchUsers}
              className="p-1.5 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-800 text-emerald-500 cursor-pointer transition-colors"
              title={t.searchUsersTitle}
              id="new_chat_trigger"
            >
              <UserPlus className="w-5 h-5" />
            </button>
            <button
              onClick={onOpenSettings}
              className="p-1.5 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-500 cursor-pointer transition-colors"
              title={t.settingsTitle}
              id="settings_trigger"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Quick Search */}
        <div className="relative" id="search_chat_box">
          <Search className="absolute top-3 left-3 w-4 h-4 opacity-40" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={t.searchPlaceholder}
            className={`w-full pl-9 pr-4 py-2.5 text-xs rounded-xl border focus:outline-none focus:ring-1 focus:ring-emerald-500/40 bg-transparent ${
              currentTheme === 'dark' ? 'border-zinc-800 text-zinc-200' : 'border-zinc-200 text-zinc-800'
            }`}
          />
        </div>
      </div>

      {/* Categories / Tabs */}
      <div className="flex border-b border-zinc-200 dark:border-zinc-800 px-2 gap-1" id="chat_tabs">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-3 py-2 text-xs font-semibold font-sans border-b-2 transition-all cursor-pointer ${
            activeTab === 'all' 
              ? 'border-emerald-500 text-emerald-500' 
              : 'border-transparent opacity-60 hover:opacity-100'
          }`}
        >
          {language === 'ar' ? 'جميع الرسائل' : 'All Chats'}
        </button>
        <button
          onClick={() => setActiveTab('pinned')}
          className={`px-3 py-2 text-xs font-semibold font-sans border-b-2 transition-all cursor-pointer ${
            activeTab === 'pinned' 
              ? 'border-emerald-500 text-emerald-500' 
              : 'border-transparent opacity-60 hover:opacity-100'
          }`}
        >
          {language === 'ar' ? 'المثبتة' : 'Pinned'}
        </button>
        <button
          onClick={() => setActiveTab('archived')}
          className={`px-3 py-2 text-xs font-semibold font-sans border-b-2 transition-all cursor-pointer ${
            activeTab === 'archived' 
              ? 'border-emerald-500 text-emerald-500' 
              : 'border-transparent opacity-60 hover:opacity-100'
          }`}
        >
          {language === 'ar' ? 'المؤرشفة' : 'Archived'}
        </button>
      </div>

      {/* Chat List Items container */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5" id="sidebar_chat_items">
        {sortedChats.length > 0 ? (
          sortedChats.map((chat) => {
            const partner = getChatPartner(chat);
            if (!partner) return null;

            const active = activeChatId === chat.id;
            const pinned = isPinned(chat.id);
            const archived = isArchived(chat.id);
            const muted = isMuted(chat.id);
            const unreadCount = chat.unreadCounts?.[currentUser.id] || 0;
            const isTyping = chat.isTyping?.[partner.id] || false;
            const isRecording = chat.isRecording?.[partner.id] || false;

            // Deciding avatar visibility
            const showAvatar = partner.avatarPrivacy === 'everyone' || 
              (partner.avatarPrivacy === 'contacts' && chats.some(c => c.participants.includes(partner.id)));

            return (
              <div
                key={chat.id}
                className="relative group"
                onContextMenu={(e) => {
                  e.preventDefault();
                  setContextMenuChatId(contextMenuChatId === chat.id ? null : chat.id);
                }}
              >
                {/* Chat Item click container */}
                <button
                  onClick={() => {
                    onSelectChat(chat.id);
                    setContextMenuChatId(null);
                  }}
                  className={`w-full flex items-center gap-3 p-3 rounded-2xl text-left cursor-pointer transition-all ${
                    active 
                      ? 'bg-emerald-500/10 border border-emerald-500/25' 
                      : currentTheme === 'dark' 
                        ? 'hover:bg-zinc-900 border border-transparent' 
                        : 'hover:bg-white border border-transparent hover:shadow-sm'
                  }`}
                  id={`chat_item_${chat.id}`}
                >
                  {/* Avatar section with online indicator */}
                  <div className="relative shrink-0">
                    <img
                      src={showAvatar ? partner.avatar : 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80'}
                      alt={partner.name}
                      className="w-11 h-11 rounded-xl object-cover ring-1 ring-zinc-200 dark:ring-zinc-800"
                    />
                    {partner.isOnline && !partner.hideOnlineStatus && (
                      <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white dark:border-zinc-950 rounded-full" />
                    )}
                  </div>

                  {/* Body details */}
                  <div className="flex-1 min-w-0" dir="ltr">
                    <div className="flex justify-between items-baseline mb-1">
                      <span className="font-semibold text-xs tracking-tight truncate max-w-[120px] dark:text-zinc-100 text-zinc-900 block font-sans">
                        {partner.name}
                      </span>
                      <span className="text-[10px] font-mono opacity-50">
                        {formatMessageTime(chat.lastMessage?.timestamp)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-1.5">
                      {/* Last Message preview */}
                      <span className="text-xs truncate block pr-2 opacity-70">
                        {isTyping ? (
                          <span className="text-emerald-500 animate-pulse font-medium">{t.typing}</span>
                        ) : isRecording ? (
                          <span className="text-emerald-500 animate-pulse font-medium">{t.recording}</span>
                        ) : chat.lastMessage ? (
                          <span className="flex items-center gap-1">
                            {chat.lastMessage.senderId === currentUser.id && (
                              chat.lastMessage.isRead ? (
                                <CheckCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                              ) : (
                                <Check className="w-3.5 h-3.5 opacity-40 shrink-0" />
                              )
                            )}
                            <span className="truncate">
                              {chat.lastMessage.mediaType ? (
                                <span className="text-emerald-500 text-[11px] font-medium font-sans">
                                  [{chat.lastMessage.mediaType === 'image' ? t.imageFile : chat.lastMessage.mediaType === 'audio' ? t.audioPreview : t.documentFile}]
                                </span>
                              ) : (
                                chat.lastMessage.text
                              )}
                            </span>
                          </span>
                        ) : (
                          <span className="text-[11px] font-sans italic opacity-40">No messages yet</span>
                        )}
                      </span>

                      {/* Right aligned status badges */}
                      <div className="flex items-center gap-1 shrink-0">
                        {pinned && <Pin className="w-3 h-3 text-emerald-500 transform rotate-45 shrink-0" />}
                        {muted && <VolumeX className="w-3.5 h-3.5 text-zinc-400 shrink-0" />}
                        {unreadCount > 0 && (
                          <span className="bg-emerald-500 text-white font-bold text-[10px] w-4.5 h-4.5 rounded-full flex items-center justify-center shrink-0">
                            {unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>

                {/* Context Right-click Action Overlay */}
                {contextMenuChatId === chat.id && (
                  <div className={`absolute z-20 top-12 left-6 right-6 p-2 rounded-2xl border shadow-2xl space-y-1 ${
                    currentTheme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'
                  }`} id={`chat_context_${chat.id}`}>
                    <button
                      onClick={() => handleTogglePreference(chat.id, 'pin')}
                      className="w-full text-left py-2 px-3 text-xs font-sans font-medium rounded-xl hover:bg-emerald-500 hover:text-white cursor-pointer transition-colors flex items-center justify-between"
                    >
                      <span>{pinned ? t.unpinChat : t.pinChat}</span>
                      <Pin className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleTogglePreference(chat.id, 'archive')}
                      className="w-full text-left py-2 px-3 text-xs font-sans font-medium rounded-xl hover:bg-emerald-500 hover:text-white cursor-pointer transition-colors flex items-center justify-between"
                    >
                      <span>{archived ? t.unarchiveChat : t.archiveChat}</span>
                      <Archive className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleTogglePreference(chat.id, 'mute')}
                      className="w-full text-left py-2 px-3 text-xs font-sans font-medium rounded-xl hover:bg-emerald-500 hover:text-white cursor-pointer transition-colors flex items-center justify-between"
                    >
                      <span>{muted ? t.unmuteChat : t.muteChat}</span>
                      <VolumeX className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteChat(chat.id)}
                      className="w-full text-left py-2 px-3 text-xs font-sans font-medium rounded-xl hover:bg-rose-500 hover:text-white text-rose-500 cursor-pointer transition-colors flex items-center justify-between"
                    >
                      <span>{t.deleteChat}</span>
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="p-8 text-center" id="no_chats_found">
            <p className="text-xs opacity-50 leading-relaxed font-sans">{t.noChats}</p>
          </div>
        )}
      </div>

      {/* User Status bottom bar */}
      <div className={`p-4 border-t flex items-center justify-between ${
        currentTheme === 'dark' ? 'bg-zinc-900/40 border-zinc-800' : 'bg-zinc-100/60 border-zinc-200'
      }`} id="sidebar_user_profile_bar">
        <div className="flex items-center gap-2.5">
          <img
            src={currentUser.avatar}
            alt={currentUser.name}
            className="w-9 h-9 rounded-xl object-cover"
          />
          <div className="min-w-0" dir="ltr">
            <span className="font-semibold text-xs tracking-tight truncate block max-w-[100px] font-sans dark:text-zinc-200">
              {currentUser.name}
            </span>
            <span className="text-[10px] opacity-50 block font-mono">@{currentUser.username}</span>
          </div>
        </div>

        <span className="flex items-center gap-1.5 py-1 px-2.5 rounded-full bg-emerald-500/10 border border-emerald-500/10 text-emerald-500 text-[10px] font-bold">
          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
          {t.online}
        </span>
      </div>
    </div>
  );
}
