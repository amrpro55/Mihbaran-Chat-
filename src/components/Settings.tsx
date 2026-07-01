import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, LogOut, Shield, Globe, Moon, Sun, Lock, Eye, Check, Trash2, 
  Volume2, ShieldAlert, Wifi, UserX, AlertOctagon, HelpCircle 
} from 'lucide-react';
import { Language, translations } from '../i18n';
import { User } from '../types';
import { getUsers, saveUsers, logoutUser } from '../db';

interface SettingsProps {
  language: Language;
  onChangeLanguage: (lang: Language) => void;
  currentUser: User;
  onUpdateUser: (user: User) => void;
  onLogout: () => void;
  onBack: () => void;
  currentTheme: 'light' | 'dark';
  toggleTheme: () => void;
}

export default function Settings({
  language,
  onChangeLanguage,
  currentUser,
  onUpdateUser,
  onLogout,
  onBack,
  currentTheme,
  toggleTheme
}: SettingsProps) {
  const t = translations[language];
  const [success, setSuccess] = useState('');
  
  // Local password change states
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  
  // Media auto-download
  const [mediaAutoDownload, setMediaAutoDownload] = useState(true);

  // Confirm delete account
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const triggerSuccess = (text: string) => {
    setSuccess(text);
    setTimeout(() => setSuccess(''), 3000);
  };

  const handleUpdatePrivacy = (key: keyof User, value: any) => {
    const allUsers = getUsers();
    const idx = allUsers.findIndex(u => u.id === currentUser.id);
    if (idx !== -1) {
      const updated = {
        ...allUsers[idx],
        [key]: value
      };
      allUsers[idx] = updated;
      saveUsers(allUsers);
      onUpdateUser(updated);
      
      // Save local active session
      localStorage.setItem('mihbaran_current_user', JSON.stringify(updated));
      triggerSuccess(language === 'ar' ? 'تم تحديث إعدادات الخصوصية!' : 'Privacy settings updated!');
    }
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!oldPassword || !newPassword) return;

    // Simulate password change success
    setOldPassword('');
    setNewPassword('');
    triggerSuccess(language === 'ar' ? 'تم تغيير كلمة المرور بنجاح!' : 'Password changed successfully!');
  };

  const handleDeleteAccount = () => {
    // Delete user from DB
    const allUsers = getUsers().filter(u => u.id !== currentUser.id);
    saveUsers(allUsers);
    
    // Perform log out
    onLogout();
  };

  return (
    <div className={`flex-1 h-full overflow-y-auto p-6 md:p-8 flex flex-col transition-colors duration-300 ${
      currentTheme === 'dark' ? 'bg-zinc-950 text-zinc-100' : 'bg-white text-zinc-900'
    }`} id="settings_view" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      
      {/* Header */}
      <div className="flex items-center gap-3 mb-8 shrink-0">
        <button
          onClick={onBack}
          className="p-1.5 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          id="settings_back_btn"
        >
          <ArrowLeft className={`w-5 h-5 ${language === 'en' ? 'transform rotate-180' : ''}`} />
        </button>
        <h2 className="text-xl font-bold font-sans">{t.settingsTitle}</h2>
      </div>

      <div className="max-w-md w-full mx-auto space-y-8" id="settings_content">
        
        {/* Success Save Banner */}
        <AnimatePresence>
          {success && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-2xl text-xs font-sans text-center"
            >
              {success}
            </motion.div>
          )}
        </AnimatePresence>

        {/* 1. Appearance / General */}
        <div className="space-y-4" id="settings_appearance_section">
          <h3 className="text-xs font-bold font-sans uppercase tracking-wider opacity-60">
            {language === 'ar' ? 'المظهر واللغة' : 'Appearance & Language'}
          </h3>
          
          <div className={`p-4 rounded-2xl border space-y-4 ${
            currentTheme === 'dark' ? 'bg-zinc-900/60 border-zinc-800' : 'bg-zinc-50 border-zinc-200'
          }`}>
            {/* Toggle Theme */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                  {currentTheme === 'dark' ? <Moon className="w-4.5 h-4.5" /> : <Sun className="w-4.5 h-4.5" />}
                </div>
                <div>
                  <span className="block text-xs font-bold font-sans">{t.settingsTheme}</span>
                  <span className="block text-[10px] opacity-50 font-sans">
                    {currentTheme === 'dark' ? 'الوضع الليلي نشط' : 'الوضع المضيء نشط'}
                  </span>
                </div>
              </div>
              <button
                onClick={toggleTheme}
                className="w-12 h-6 rounded-full p-1 bg-emerald-600 cursor-pointer flex transition-all duration-300 items-center justify-end dark:justify-start"
              >
                <span className="w-4 h-4 bg-white rounded-full shadow-md" />
              </button>
            </div>

            {/* Toggle Language */}
            <div className="flex items-center justify-between border-t border-zinc-200 dark:border-zinc-800 pt-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                  <Globe className="w-4.5 h-4.5" />
                </div>
                <div>
                  <span className="block text-xs font-bold font-sans">{t.settingsLanguage}</span>
                  <span className="block text-[10px] opacity-50 font-sans">Choose Arabic or English</span>
                </div>
              </div>
              
              <div className="flex gap-1.5" id="settings_lang_toggles">
                <button
                  onClick={() => onChangeLanguage('ar')}
                  className={`py-1 px-2.5 rounded-lg text-[10px] font-sans font-bold cursor-pointer transition-all ${
                    language === 'ar' ? 'bg-emerald-600 text-white' : 'bg-zinc-200 dark:bg-zinc-800'
                  }`}
                >
                  العربية
                </button>
                <button
                  onClick={() => onChangeLanguage('en')}
                  className={`py-1 px-2.5 rounded-lg text-[10px] font-sans font-bold cursor-pointer transition-all ${
                    language === 'en' ? 'bg-emerald-600 text-white' : 'bg-zinc-200 dark:bg-zinc-800'
                  }`}
                >
                  English
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Privacy Settings */}
        <div className="space-y-4" id="settings_privacy_section">
          <h3 className="text-xs font-bold font-sans uppercase tracking-wider opacity-60">
            {t.privacyTitle}
          </h3>
          
          <div className={`p-4 rounded-2xl border space-y-4 ${
            currentTheme === 'dark' ? 'bg-zinc-900/60 border-zinc-800' : 'bg-zinc-50 border-zinc-200'
          }`}>
            {/* Last Seen & Online Status */}
            <div className="space-y-2">
              <label className="block text-xs font-bold font-sans opacity-80">{t.privacyLastSeen}</label>
              <div className="flex gap-1.5" id="privacy_lastseen_options">
                {['everyone', 'contacts', 'nobody'].map((opt) => (
                  <button
                    key={opt}
                    onClick={() => handleUpdatePrivacy('hideOnlineStatus', opt === 'nobody')}
                    className={`flex-1 py-1.5 rounded-xl text-[10px] font-sans font-bold cursor-pointer transition-all ${
                      (opt === 'nobody' && currentUser.hideOnlineStatus) || (opt !== 'nobody' && !currentUser.hideOnlineStatus)
                        ? 'bg-emerald-600 text-white'
                        : 'bg-zinc-200 dark:bg-zinc-800'
                    }`}
                  >
                    {t[opt as keyof typeof t] || opt}
                  </button>
                ))}
              </div>
            </div>

            {/* Profile Avatar Privacy */}
            <div className="space-y-2 border-t border-zinc-200 dark:border-zinc-800 pt-4">
              <label className="block text-xs font-bold font-sans opacity-80">{t.privacyAvatar}</label>
              <div className="flex gap-1.5" id="privacy_avatar_options">
                {['everyone', 'contacts', 'nobody'].map((opt) => (
                  <button
                    key={opt}
                    onClick={() => handleUpdatePrivacy('avatarPrivacy', opt)}
                    className={`flex-1 py-1.5 rounded-xl text-[10px] font-sans font-bold cursor-pointer transition-all ${
                      currentUser.avatarPrivacy === opt
                        ? 'bg-emerald-600 text-white'
                        : 'bg-zinc-200 dark:bg-zinc-800'
                    }`}
                  >
                    {t[opt as keyof typeof t] || opt}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 3. Media Controls */}
        <div className="space-y-4" id="settings_media_section">
          <h3 className="text-xs font-bold font-sans uppercase tracking-wider opacity-60">
            {language === 'ar' ? 'التحكم بتنزيل الوسائط والشبكة' : 'Media & Data Auto-Download'}
          </h3>
          
          <div className={`p-4 rounded-2xl border space-y-4 ${
            currentTheme === 'dark' ? 'bg-zinc-900/60 border-zinc-800' : 'bg-zinc-50 border-zinc-200'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                  <Wifi className="w-4.5 h-4.5" />
                </div>
                <div>
                  <span className="block text-xs font-bold font-sans">{t.mediaAutoDownload}</span>
                  <span className="block text-[10px] opacity-50 font-sans">{t.mediaAutoDownloadDesc}</span>
                </div>
              </div>
              <button
                onClick={() => setMediaAutoDownload(!mediaAutoDownload)}
                className={`w-12 h-6 rounded-full p-1 cursor-pointer flex transition-all duration-300 items-center ${
                  mediaAutoDownload ? 'bg-emerald-600 justify-end' : 'bg-zinc-400 justify-start'
                }`}
              >
                <span className="w-4 h-4 bg-white rounded-full shadow-md" />
              </button>
            </div>
          </div>
        </div>

        {/* 4. Security Change Password */}
        <div className="space-y-4" id="settings_password_section">
          <h3 className="text-xs font-bold font-sans uppercase tracking-wider opacity-60">
            {t.changePasswordTitle}
          </h3>
          
          <form onSubmit={handleChangePassword} className={`p-4 rounded-2xl border space-y-4 ${
            currentTheme === 'dark' ? 'bg-zinc-900/60 border-zinc-800' : 'bg-zinc-50 border-zinc-200'
          }`}>
            <div>
              <label className="block text-xs font-medium mb-1.5 opacity-70 font-sans">{t.oldPassword}</label>
              <input
                type="password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                placeholder="••••••••"
                className={`w-full px-4 py-2.5 rounded-xl border bg-transparent text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500/50 ${
                  currentTheme === 'dark' ? 'border-zinc-800' : 'border-zinc-200'
                }`}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1.5 opacity-70 font-sans">{t.newPassword}</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className={`w-full px-4 py-2.5 rounded-xl border bg-transparent text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500/50 ${
                  currentTheme === 'dark' ? 'border-zinc-800' : 'border-zinc-200'
                }`}
                required
              />
            </div>

            <button
              type="submit"
              disabled={!oldPassword || !newPassword}
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-sans text-xs font-bold transition-all shadow-md cursor-pointer disabled:opacity-40"
            >
              {t.changePasswordTitle}
            </button>
          </form>
        </div>

        {/* 5. Destructive Area */}
        <div className="space-y-4" id="settings_danger_section">
          <h3 className="text-xs font-bold font-sans uppercase tracking-wider text-rose-500">
            {language === 'ar' ? 'منطقة الخطر والعمليات' : 'Danger Zone'}
          </h3>
          
          <div className="space-y-2">
            {/* Regular Log Out */}
            <button
              onClick={onLogout}
              className="w-full py-3.5 px-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900 font-sans text-xs font-bold text-zinc-500 hover:text-rose-500 cursor-pointer transition-all flex items-center justify-between"
            >
              <span>{t.logout}</span>
              <LogOut className="w-4.5 h-4.5" />
            </button>

            {/* Delete Account */}
            {!showDeleteConfirm ? (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full py-3.5 px-4 rounded-2xl border border-rose-500/10 hover:bg-rose-500/10 font-sans text-xs font-bold text-rose-500 cursor-pointer transition-all flex items-center justify-between"
              >
                <span>{t.deleteAccountBtn}</span>
                <Trash2 className="w-4.5 h-4.5" />
              </button>
            ) : (
              <div className="p-4 border border-rose-500/20 bg-rose-500/5 rounded-2xl space-y-3.5">
                <p className="text-[11px] text-rose-500 leading-relaxed font-sans">
                  {t.deleteAccountConfirm}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handleDeleteAccount}
                    className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-sans text-xs font-bold cursor-pointer transition-all"
                  >
                    {language === 'ar' ? 'نعم، احذف حسابي فوراً' : 'Yes, Delete Permanently'}
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="flex-1 py-2.5 rounded-xl bg-zinc-300 dark:bg-zinc-800 font-sans text-xs font-bold cursor-pointer transition-all"
                  >
                    {t.cancelReply}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
