import React, { useState } from 'react';
import { motion } from 'motion/react';
import { User, Award, Calendar, MessageSquare, Save, ArrowLeft, ShieldAlert } from 'lucide-react';
import { Language, translations } from '../i18n';
import { User as UserType } from '../types';
import { getUsers, saveUsers, MOCK_AVATARS, getChats } from '../db';

interface ProfileProps {
  language: Language;
  currentUser: UserType;
  onUpdateUser: (user: UserType) => void;
  onBack: () => void;
  currentTheme: 'light' | 'dark';
}

export default function Profile({
  language,
  currentUser,
  onUpdateUser,
  onBack,
  currentTheme
}: ProfileProps) {
  const t = translations[language];
  const [name, setName] = useState(currentUser.name);
  const [bio, setBio] = useState(currentUser.bio);
  const [avatar, setAvatar] = useState(currentUser.avatar);
  const [success, setSuccess] = useState(false);

  // Stats helper
  const chatCount = getChats().filter(c => c.participants.includes(currentUser.id)).length;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    
    const users = getUsers();
    const idx = users.findIndex(u => u.id === currentUser.id);
    if (idx !== -1) {
      const updated = {
        ...users[idx],
        name,
        bio,
        avatar
      };
      
      users[idx] = updated;
      saveUsers(users);
      onUpdateUser(updated);

      // Save to local active session
      localStorage.setItem('mihbaran_current_user', JSON.stringify(updated));

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    }
  };

  return (
    <div className={`flex-1 h-full overflow-y-auto p-6 md:p-8 flex flex-col transition-colors duration-300 ${
      currentTheme === 'dark' ? 'bg-zinc-950 text-zinc-100' : 'bg-white text-zinc-900'
    }`} id="profile_view" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      
      {/* Header controls */}
      <div className="flex items-center gap-3 mb-8 shrink-0">
        <button
          onClick={onBack}
          className="p-1.5 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          id="profile_back_btn"
        >
          <ArrowLeft className={`w-5 h-5 ${language === 'en' ? 'transform rotate-180' : ''}`} />
        </button>
        <h2 className="text-xl font-bold font-sans">{t.profileTitle}</h2>
      </div>

      <div className="max-w-md w-full mx-auto space-y-8" id="profile_content">
        
        {/* Success Save Banner */}
        {success && (
          <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-2xl text-xs font-sans text-center animate-bounce">
            {t.saveSuccess}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          {/* Main profile avatar and selection panel */}
          <div className="flex flex-col items-center gap-4" id="profile_avatar_selector">
            <div className="relative group">
              <img
                src={avatar}
                alt={name}
                className="w-24 h-24 rounded-3xl object-cover ring-2 ring-emerald-500/30 shadow-xl"
              />
              {currentUser.isAdmin && (
                <span className="absolute -top-2 -right-2 py-1 px-2.5 rounded-full bg-amber-500 text-white font-mono font-bold text-[9px] uppercase shadow-md flex items-center gap-1">
                  <Award className="w-3 h-3" />
                  {t.adminLabel}
                </span>
              )}
            </div>

            {/* Avatar picker grid */}
            <div className="flex flex-col items-center w-full gap-2">
              <span className="text-[11px] font-sans opacity-60 font-semibold">{t.avatarLabel}</span>
              <div className="flex gap-2.5 overflow-x-auto py-1 max-w-xs justify-center" id="avatar_presets_profile">
                {MOCK_AVATARS.map((av, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => setAvatar(av)}
                    className={`w-10 h-10 rounded-xl overflow-hidden cursor-pointer ring-offset-2 transition-all shrink-0 ${
                      avatar === av ? 'ring-2 ring-emerald-500 scale-105' : 'opacity-70 hover:opacity-100 hover:scale-105'
                    }`}
                  >
                    <img src={av} alt={`Preset ${index}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Form details */}
          <div className="space-y-4" id="profile_form_fields">
            <div>
              <label className="block text-xs font-medium mb-1.5 opacity-70 font-sans">{t.fullNameLabel}</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={`w-full px-4 py-3 rounded-xl border bg-transparent text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500/50 ${
                  currentTheme === 'dark' ? 'border-zinc-800 text-zinc-200' : 'border-zinc-200 text-zinc-800'
                }`}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1.5 opacity-70 font-sans">{t.usernameLabel}</label>
              <div className="relative">
                <span className="absolute top-3 left-3.5 text-sm font-semibold opacity-40">@</span>
                <input
                  type="text"
                  value={currentUser.username}
                  className="w-full pl-8 pr-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 text-sm focus:outline-none opacity-50 cursor-not-allowed"
                  disabled
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1.5 opacity-70 font-sans">{t.bioLabel}</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={3}
                className={`w-full px-4 py-3 rounded-xl border bg-transparent text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500/50 resize-none font-sans ${
                  currentTheme === 'dark' ? 'border-zinc-800 text-zinc-200' : 'border-zinc-200 text-zinc-800'
                }`}
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-sans font-bold transition-all shadow-md cursor-pointer flex items-center justify-center gap-2"
            id="save_profile_btn"
          >
            <Save className="w-4.5 h-4.5" />
            <span>{t.saveChanges}</span>
          </button>
        </form>

        {/* User stats card */}
        <div className={`p-4 rounded-2xl border ${
          currentTheme === 'dark' ? 'bg-zinc-900/60 border-zinc-800' : 'bg-zinc-50 border-zinc-200'
        }`} id="profile_stats_card">
          <h3 className="text-xs font-bold font-sans mb-3.5 opacity-80 uppercase tracking-wider">
            {language === 'ar' ? 'إحصائيات الحساب' : 'Account Statistics'}
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                <MessageSquare className="w-4.5 h-4.5" />
              </div>
              <div>
                <span className="block text-xs opacity-50 font-sans">{t.statsChats}</span>
                <span className="block text-sm font-bold font-mono">{chatCount}</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                <Calendar className="w-4.5 h-4.5" />
              </div>
              <div>
                <span className="block text-xs opacity-50 font-sans">{t.statsJoined}</span>
                <span className="block text-sm font-bold font-mono">{currentUser.joinDate}</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
