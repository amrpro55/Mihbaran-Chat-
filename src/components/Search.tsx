import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search as SearchIcon, X, UserPlus, ArrowLeft, MessageSquare, Clock } from 'lucide-react';
import { Language, translations } from '../i18n';
import { User, Chat, Message } from '../types';
import { getUsers, getChats, saveChats, getMessages } from '../db';

interface SearchProps {
  language: Language;
  currentUser: User;
  onSelectChat: (chatId: string) => void;
  onBack: () => void;
  currentTheme: 'light' | 'dark';
}

export default function Search({
  language,
  currentUser,
  onSelectChat,
  onBack,
  currentTheme
}: SearchProps) {
  const t = translations[language];
  const [searchTerm, setSearchTerm] = useState('');
  const [searchInMsgTerm, setSearchInMsgTerm] = useState('');

  // 1. Find global users to start a chat with
  const users = getUsers();
  const matchedUsers = users.filter(u => {
    if (u.id === currentUser.id) return false; // Hide self
    if (u.isBlocked) return false; // Hide blocked users
    const query = searchTerm.toLowerCase().trim();
    if (!query) return false;
    return u.name.toLowerCase().includes(query) || (u.username || '').toLowerCase().includes(query);
  });

  // Start chat helper
  const handleStartChat = (targetUserId: string) => {
    const chats = getChats();
    // Check if chat already exists
    const existing = chats.find(c => 
      c.participants.includes(currentUser.id) && c.participants.includes(targetUserId)
    );

    if (existing) {
      onSelectChat(existing.id);
    } else {
      // Create a brand new chat
      const newChat: Chat = {
        id: `chat_${Date.now()}`,
        participants: [currentUser.id, targetUserId],
        unreadCounts: { [currentUser.id]: 0, [targetUserId]: 0 }
      };
      chats.push(newChat);
      saveChats(chats);
      onSelectChat(newChat.id);
    }
  };

  // 2. Search text within all messages
  const allMessages = getMessages();
  const matchedMessages = allMessages.filter(msg => {
    const query = searchInMsgTerm.toLowerCase().trim();
    if (!query) return false;
    // Must be in one of current user's chats
    const userChats = getChats().filter(c => c.participants.includes(currentUser.id));
    const userChatIds = userChats.map(c => c.id);
    const isMyChat = userChatIds.includes(msg.chatId);
    return isMyChat && msg.text.toLowerCase().includes(query);
  });

  const formatTime = (ts: number) => {
    return new Date(ts).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className={`flex-1 h-full overflow-y-auto p-6 md:p-8 flex flex-col transition-colors duration-300 ${
      currentTheme === 'dark' ? 'bg-zinc-950 text-zinc-100' : 'bg-white text-zinc-900'
    }`} id="search_view" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      
      {/* Header controls */}
      <div className="flex items-center gap-3 mb-8 shrink-0">
        <button
          onClick={onBack}
          className="p-1.5 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          id="search_back_btn"
        >
          <ArrowLeft className={`w-5 h-5 ${language === 'en' ? 'transform rotate-180' : ''}`} />
        </button>
        <h2 className="text-xl font-bold font-sans">{t.searchUsersTitle}</h2>
      </div>

      <div className="max-w-md w-full mx-auto space-y-8" id="search_content">
        
        {/* Module 1: Search Users (Start New Chat) */}
        <div className="space-y-4" id="search_users_module">
          <h3 className="text-xs font-bold font-sans uppercase tracking-wider opacity-60">
            {language === 'ar' ? 'البدء بمحادثة جديدة' : 'Start a New Chat'}
          </h3>

          <div className="relative">
            <SearchIcon className="absolute top-3.5 left-3.5 w-4.5 h-4.5 opacity-40" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t.searchUsersPlaceholder}
              className={`w-full pl-10 pr-4 py-3 text-xs rounded-xl border focus:outline-none focus:ring-1 focus:ring-emerald-500/40 bg-transparent ${
                currentTheme === 'dark' ? 'border-zinc-800' : 'border-zinc-200'
              }`}
            />
          </div>

          <div className="space-y-2 max-h-52 overflow-y-auto" id="search_users_results">
            <AnimatePresence>
              {matchedUsers.length > 0 ? (
                matchedUsers.map((u) => (
                  <motion.div
                    key={u.id}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 5 }}
                    className={`p-3 rounded-2xl border flex items-center justify-between gap-3 ${
                      currentTheme === 'dark' ? 'bg-zinc-900/60 border-zinc-800' : 'bg-zinc-50 border-zinc-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <img src={u.avatar} alt={u.name} className="w-9 h-9 rounded-xl object-cover" />
                      <div>
                        <span className="font-semibold text-xs font-sans block text-zinc-950 dark:text-zinc-100">{u.name}</span>
                        <span className="text-[10px] font-mono opacity-50 block">@{u.username}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleStartChat(u.id)}
                      className="py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-sans text-[10px] font-bold cursor-pointer transition-all flex items-center gap-1"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>{t.getStarted}</span>
                    </button>
                  </motion.div>
                ))
              ) : (
                searchTerm.trim() && (
                  <div className="text-center py-4 text-xs opacity-40 font-sans">
                    {t.noResults}
                  </div>
                )
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Module 2: Search Message content */}
        <div className="space-y-4 border-t border-zinc-200 dark:border-zinc-800 pt-6" id="search_messages_module">
          <h3 className="text-xs font-bold font-sans uppercase tracking-wider opacity-60">
            {t.searchInMessages}
          </h3>

          <div className="relative">
            <SearchIcon className="absolute top-3.5 left-3.5 w-4.5 h-4.5 opacity-40" />
            <input
              type="text"
              value={searchInMsgTerm}
              onChange={(e) => setSearchInMsgTerm(e.target.value)}
              placeholder={t.searchInMessagesPlaceholder}
              className={`w-full pl-10 pr-4 py-3 text-xs rounded-xl border focus:outline-none focus:ring-1 focus:ring-emerald-500/40 bg-transparent ${
                currentTheme === 'dark' ? 'border-zinc-800' : 'border-zinc-200'
              }`}
            />
          </div>

          <div className="space-y-2 max-h-56 overflow-y-auto" id="search_messages_results">
            <AnimatePresence>
              {matchedMessages.length > 0 ? (
                matchedMessages.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => onSelectChat(m.chatId)}
                    className={`w-full p-3.5 rounded-2xl border text-left cursor-pointer transition-all hover:scale-[1.01] block ${
                      currentTheme === 'dark' ? 'bg-zinc-900/40 border-zinc-800 hover:bg-zinc-900' : 'bg-zinc-50 border-zinc-200 hover:bg-zinc-100/50'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-[10px] font-bold text-emerald-500 font-sans">@{m.senderName}</span>
                      <span className="text-[9px] font-mono opacity-40">{formatTime(m.timestamp)}</span>
                    </div>
                    <p className="text-xs font-sans truncate pr-4 opacity-85 leading-relaxed">{m.text}</p>
                  </button>
                ))
              ) : (
                searchInMsgTerm.trim() && (
                  <div className="text-center py-4 text-xs opacity-40 font-sans">
                    {t.noResults}
                  </div>
                )
              )}
            </AnimatePresence>
          </div>
        </div>

      </div>
    </div>
  );
}
