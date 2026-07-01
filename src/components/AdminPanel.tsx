import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, Users, ShieldAlert, BarChart3, Activity, ShieldCheck, 
  UserX, Check, Trash2, Ban, Volume2, Send, Database, HardDrive, 
  FileText, ArrowUpRight, Search, Clock
} from 'lucide-react';
import { Language, translations } from '../i18n';
import { User, Chat, Report, AdminLog, SystemStats, Message } from '../types';
import { 
  getUsers, saveUsers, getReports, saveReports, getAuditLogs, 
  saveAuditLogs, getSystemStats, saveSystemStats, getMessages, 
  saveMessages, getChats, saveChats, incrementDbWrites 
} from '../db';

interface AdminPanelProps {
  language: Language;
  currentUser: User;
  onBack: () => void;
  currentTheme: 'light' | 'dark';
}

type AdminSubTab = 'users' | 'reports' | 'stats' | 'logs';

export default function AdminPanel({
  language,
  currentUser,
  onBack,
  currentTheme
}: AdminPanelProps) {
  const t = translations[language];
  const [activeTab, setActiveTab] = useState<AdminSubTab>('stats');
  const [success, setSuccess] = useState('');

  // Global states fed from DB
  const [users, setUsers] = useState<User[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [auditLogs, setAuditLogs] = useState<AdminLog[]>([]);
  const [stats, setStats] = useState<SystemStats | null>(null);

  // Search inside User Management
  const [userSearchTerm, setUserSearchTerm] = useState('');

  // Broadcast state
  const [broadcastText, setBroadcastText] = useState('');

  const loadAdminData = () => {
    setUsers(getUsers());
    setReports(getReports());
    setAuditLogs(getAuditLogs());
    setStats(getSystemStats());
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  const triggerSuccess = (text: string) => {
    setSuccess(text);
    setTimeout(() => setSuccess(''), 3000);
  };

  // 1. User management actions
  const handleToggleBlockUser = (targetUser: User) => {
    const allUsers = getUsers();
    const idx = allUsers.findIndex(u => u.id === targetUser.id);
    if (idx !== -1) {
      const isBlockingNow = !allUsers[idx].isBlocked;
      allUsers[idx].isBlocked = isBlockingNow;
      saveUsers(allUsers);

      // Save admin audit log
      const logs = getAuditLogs();
      logs.unshift({
        id: `log_${Date.now()}`,
        action: isBlockingNow ? 'حظر حساب مستخدم نهائياً' : 'إلغاء حظر حساب مستخدم',
        target: `@${targetUser.username} (${targetUser.name})`,
        timestamp: Date.now(),
        operator: currentUser.name
      });
      saveAuditLogs(logs);

      // Increment stats
      incrementDbWrites(2);
      loadAdminData();
      triggerSuccess(language === 'ar' ? 'تم تحديث حالة الحظر للمستخدم!' : 'User block status updated!');
    }
  };

  const handleDeleteViolatingUser = (targetUser: User) => {
    const allUsers = getUsers().filter(u => u.id !== targetUser.id);
    saveUsers(allUsers);

    // Save admin log
    const logs = getAuditLogs();
    logs.unshift({
      id: `log_${Date.now()}`,
      action: 'حذف حساب مستخدم مخالف بالكامل ومسح بياناته',
      target: `@${targetUser.username} (${targetUser.name})`,
      timestamp: Date.now(),
      operator: currentUser.name
    });
    saveAuditLogs(logs);

    // Remove his chats & messages
    const allChats = getChats().filter(c => !c.participants.includes(targetUser.id));
    saveChats(allChats);

    // Increment stats
    const st = getSystemStats();
    st.totalUsers = allUsers.length;
    saveSystemStats(st);
    incrementDbWrites(3);

    loadAdminData();
    triggerSuccess(language === 'ar' ? 'تم حذف الحساب المخالف وتطهير محادثاته!' : 'Violating user deleted & chats purged!');
  };

  // 2. Report resolution actions
  const handleResolveReport = (reportId: string, action: 'resolve' | 'dismiss') => {
    const allReports = getReports();
    const idx = allReports.findIndex(r => r.id === reportId);
    if (idx !== -1) {
      const rep = allReports[idx];
      rep.status = action === 'resolve' ? 'resolved' : 'dismissed';
      saveReports(allReports);

      // Audit Log
      const logs = getAuditLogs();
      logs.unshift({
        id: `log_${Date.now()}`,
        action: action === 'resolve' ? 'إغلاق وحل بلاغ إساءة' : 'تجاهل بلاغ مقدم',
        target: `بلاغ رقم #${reportId.slice(-4)} ضد @${rep.reportedUserName}`,
        timestamp: Date.now(),
        operator: currentUser.name
      });
      saveAuditLogs(logs);

      incrementDbWrites(2);
      loadAdminData();
      triggerSuccess(action === 'resolve' ? t.resolveReport : t.dismissReport);
    }
  };

  // 3. Global Notification Broadcast
  const handleBroadcastNotification = (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastText.trim()) return;

    // Simulate sending FCM notification message inside all users chats
    const activeChats = getChats();
    const allMessagesList = getMessages();
    const now = Date.now();

    // Create system notification inside every chat
    activeChats.forEach((chat, index) => {
      const sysMsg: Message = {
        id: `sys_broadcast_${now}_${index}`,
        chatId: chat.id,
        senderId: currentUser.id, // Admin id
        senderName: `📢 إعلان من الإدارة / Broadcast`,
        senderAvatar: currentUser.avatar,
        text: broadcastText,
        timestamp: now + index,
        isSent: true,
        isDelivered: true,
        isRead: false
      };
      allMessagesList.push(sysMsg);
      chat.lastMessage = sysMsg;

      // Increment target unread
      const pId = chat.participants.find(p => p !== currentUser.id);
      if (pId) {
        chat.unreadCounts[pId] = (chat.unreadCounts[pId] || 0) + 1;
      }
    });

    saveMessages(allMessagesList);
    saveChats(activeChats);

    // Audit Log
    const logs = getAuditLogs();
    logs.unshift({
      id: `log_${Date.now()}`,
      action: 'إرسال بث وإعلان جماعي لكافة المستخدمين',
      target: broadcastText.slice(0, 30) + '...',
      timestamp: now,
      operator: currentUser.name
    });
    saveAuditLogs(logs);

    // Increment stats
    const st = getSystemStats();
    st.totalMessages += activeChats.length;
    saveSystemStats(st);
    incrementDbWrites(activeChats.length + 1);

    setBroadcastText('');
    loadAdminData();
    triggerSuccess(t.broadcastSuccess);
  };

  // Search filter
  const filteredUsers = users.filter(u => {
    if (u.id === currentUser.id) return false; // Hide self
    const query = userSearchTerm.toLowerCase();
    return u.name.toLowerCase().includes(query) || (u.username || '').toLowerCase().includes(query);
  });

  const formatSize = (bytes: number) => {
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    return `${(bytes / 1024).toFixed(2)} KB`;
  };

  const formatTime = (ts: number) => {
    return new Date(ts).toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <div className={`flex-1 h-full overflow-y-auto p-6 md:p-8 flex flex-col transition-colors duration-300 ${
      currentTheme === 'dark' ? 'bg-zinc-950 text-zinc-100' : 'bg-white text-zinc-900'
    }`} id="admin_panel_view" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      
      {/* Top Header Controls */}
      <div className="flex items-center gap-3 mb-6 shrink-0 justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-1.5 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            id="admin_back_btn"
          >
            <ArrowLeft className={`w-5 h-5 ${language === 'en' ? 'transform rotate-180' : ''}`} />
          </button>
          <h2 className="text-xl font-bold font-sans flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-amber-500 shrink-0" />
            <span>{t.adminPanelTitle}</span>
          </h2>
        </div>

        <span className="text-[10px] font-mono py-1 px-3.5 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-full font-bold">
          ADMIN ACCOUNT ACTIVE
        </span>
      </div>

      {/* Admin Panel Tabs */}
      <div className="flex border-b border-zinc-200 dark:border-zinc-800 gap-1.5 mb-6 shrink-0" id="admin_tabs">
        <button
          onClick={() => setActiveTab('stats')}
          className={`px-4 py-2 text-xs font-bold font-sans border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'stats' ? 'border-amber-500 text-amber-500' : 'border-transparent opacity-60 hover:opacity-100'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>{t.adminStats}</span>
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 text-xs font-bold font-sans border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'users' ? 'border-amber-500 text-amber-500' : 'border-transparent opacity-60 hover:opacity-100'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>{t.adminUsers}</span>
        </button>
        <button
          onClick={() => setActiveTab('reports')}
          className={`px-4 py-2 text-xs font-bold font-sans border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'reports' ? 'border-amber-500 text-amber-500' : 'border-transparent opacity-60 hover:opacity-100'
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          <span>{t.adminReports} ({reports.filter(r => r.status === 'pending').length})</span>
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          className={`px-4 py-2 text-xs font-bold font-sans border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'logs' ? 'border-amber-500 text-amber-500' : 'border-transparent opacity-60 hover:opacity-100'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>{t.adminAudit}</span>
        </button>
      </div>

      {/* Success Save Banner */}
      <AnimatePresence>
        {success && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mb-6 p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-xl text-xs text-center font-bold font-sans"
          >
            {success}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1" id="admin_tab_content_area">
        
        {/* TAB 1: TELEMETRY STATS & SYSTEM BROADCAST */}
        {activeTab === 'stats' && stats && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            {/* System Grid Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" id="telemetry_stats_grid">
              
              <div className={`p-4 rounded-2xl border ${
                currentTheme === 'dark' ? 'bg-zinc-900/60 border-zinc-800' : 'bg-zinc-50 border-zinc-200'
              }`}>
                <div className="flex justify-between items-start mb-2">
                  <Users className="w-5 h-5 text-blue-500 shrink-0" />
                  <span className="text-[10px] font-mono opacity-50">STABLE</span>
                </div>
                <span className="block text-xs opacity-50 font-sans">{t.totalUsers}</span>
                <span className="block text-xl font-bold font-mono mt-1">{stats.totalUsers}</span>
              </div>

              <div className={`p-4 rounded-2xl border ${
                currentTheme === 'dark' ? 'bg-zinc-900/60 border-zinc-800' : 'bg-zinc-50 border-zinc-200'
              }`}>
                <div className="flex justify-between items-start mb-2">
                  <Clock className="w-5 h-5 text-emerald-500 shrink-0 animate-pulse" />
                  <span className="text-[10px] font-mono opacity-50">EXPIRING 24H</span>
                </div>
                <span className="block text-xs opacity-50 font-sans">{t.totalMessages}</span>
                <span className="block text-xl font-bold font-mono mt-1">{stats.totalMessages}</span>
              </div>

              <div className={`p-4 rounded-2xl border ${
                currentTheme === 'dark' ? 'bg-zinc-900/60 border-zinc-800' : 'bg-zinc-50 border-zinc-200'
              }`}>
                <div className="flex justify-between items-start mb-2">
                  <Database className="w-5 h-5 text-violet-500 shrink-0" />
                  <span className="text-[10px] font-mono opacity-50">LOCAL DB</span>
                </div>
                <span className="block text-xs opacity-50 font-sans">{t.dbReads} reads / {stats.dbWrites} writes</span>
                <span className="block text-xl font-bold font-mono mt-1 text-emerald-500">Live Telemetry</span>
              </div>

              <div className={`p-4 rounded-2xl border ${
                currentTheme === 'dark' ? 'bg-zinc-900/60 border-zinc-800' : 'bg-zinc-50 border-zinc-200'
              }`}>
                <div className="flex justify-between items-start mb-2">
                  <HardDrive className="w-5 h-5 text-amber-500 shrink-0 animate-pulse" />
                  <span className="text-[10px] font-mono opacity-50">COMPRESSED</span>
                </div>
                <span className="block text-xs opacity-50 font-sans">{t.storageUsage}</span>
                <span className="block text-xl font-bold font-mono mt-1">{formatSize(stats.storageUsageBytes)}</span>
              </div>

            </div>

            {/* Broadcast Form */}
            <div className={`p-6 rounded-2xl border ${
              currentTheme === 'dark' ? 'bg-zinc-900/40 border-zinc-800' : 'bg-zinc-100/40 border-zinc-200'
            }`} id="broadcast_panel_block">
              <h3 className="text-xs font-bold font-sans opacity-80 uppercase tracking-wider mb-2 flex items-center gap-1.5 text-amber-500">
                <Send className="w-4 h-4" />
                <span>{t.broadcastTitle}</span>
              </h3>
              <p className="text-[11px] opacity-60 leading-relaxed mb-4 font-sans">
                سيؤدي الضغط على الإرسال إلى بث رسالتك وإظهارها فورًا لكافة المستخدمين النشطين في نظام محبران شات وتحديث سجل إحصاءات الإرسال.
              </p>

              <form onSubmit={handleBroadcastNotification} className="space-y-3.5">
                <textarea
                  value={broadcastText}
                  onChange={(e) => setBroadcastText(e.target.value)}
                  placeholder={t.broadcastPlaceholder}
                  rows={3}
                  className={`w-full px-4 py-3 rounded-xl border text-xs focus:outline-none focus:ring-1 focus:ring-amber-500/50 resize-none font-sans bg-transparent ${
                    currentTheme === 'dark' ? 'border-zinc-800' : 'border-zinc-200'
                  }`}
                  required
                />
                <button
                  type="submit"
                  className="py-2.5 px-6 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-sans text-xs font-bold transition-all shadow-md hover:shadow-amber-600/10 cursor-pointer flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{t.broadcastBtn}</span>
                </button>
              </form>
            </div>

          </motion.div>
        )}

        {/* TAB 2: USER MANAGEMENT */}
        {activeTab === 'users' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {/* Search inside User Mgmt */}
            <div className="relative max-w-sm mb-4" id="admin_users_search_box">
              <Search className="absolute top-3 left-3 w-4 h-4 opacity-40" />
              <input
                type="text"
                value={userSearchTerm}
                onChange={(e) => setUserSearchTerm(e.target.value)}
                placeholder={language === 'ar' ? 'البحث باسم المستخدم والاسم...' : 'Search by username or name...'}
                className={`w-full pl-9 pr-4 py-2 text-xs rounded-xl border focus:outline-none focus:ring-1 focus:ring-amber-500/40 bg-transparent ${
                  currentTheme === 'dark' ? 'border-zinc-800' : 'border-zinc-200'
                }`}
              />
            </div>

            <div className="space-y-2.5" id="admin_users_list_block">
              {filteredUsers.length > 0 ? (
                filteredUsers.map((u) => (
                  <div
                    key={u.id}
                    className={`p-4 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all ${
                      currentTheme === 'dark' ? 'bg-zinc-900/60 border-zinc-800 hover:bg-zinc-900' : 'bg-zinc-50 border-zinc-200 hover:bg-zinc-100/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <img src={u.avatar} alt={u.name} className="w-10 h-10 rounded-xl object-cover" />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-xs font-sans block text-zinc-900 dark:text-zinc-100">{u.name}</span>
                          <span className="text-[10px] font-mono opacity-50 block">@{u.username}</span>
                        </div>
                        <span className="block text-[10px] font-sans opacity-50 truncate max-w-xs">{u.bio}</span>
                      </div>
                    </div>

                    <div className="flex gap-2 shrink-0">
                      {/* Block/Unblock Button */}
                      <button
                        onClick={() => handleToggleBlockUser(u)}
                        className={`py-1.5 px-3 rounded-xl font-sans text-[10px] font-bold cursor-pointer transition-all flex items-center gap-1 ${
                          u.isBlocked 
                            ? 'bg-emerald-600/10 text-emerald-500 hover:bg-emerald-600/20' 
                            : 'bg-amber-500/10 text-amber-500 hover:bg-amber-500/20'
                        }`}
                      >
                        <Ban className="w-3.5 h-3.5" />
                        <span>{u.isBlocked ? t.unblockUser : t.blockUser}</span>
                      </button>

                      {/* Hard Delete Account */}
                      <button
                        onClick={() => handleDeleteViolatingUser(u)}
                        className="py-1.5 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 font-sans text-[10px] font-bold cursor-pointer transition-all flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>{t.deleteUser}</span>
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center opacity-40 text-xs font-sans">
                  {t.noResults}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* TAB 3: REVIEW ABUSE REPORTS */}
        {activeTab === 'reports' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className="space-y-3" id="admin_reports_list_block">
              {reports.length > 0 ? (
                reports.map((rep) => (
                  <div
                    key={rep.id}
                    className={`p-5 rounded-2xl border transition-all ${
                      currentTheme === 'dark' ? 'bg-zinc-900/60 border-zinc-800' : 'bg-zinc-50 border-zinc-200'
                    }`}
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-zinc-200 dark:border-zinc-800 pb-3 mb-3.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-amber-500 font-mono">#{rep.id.slice(-4)}</span>
                        <span className="text-xs font-medium font-sans opacity-60">
                          {t.reportedBy} <span className="font-bold dark:text-zinc-200 text-zinc-900">@{rep.reporterName}</span>
                        </span>
                      </div>
                      <span className={`text-[9px] font-bold uppercase font-mono py-0.5 px-2 rounded-full ${
                        rep.status === 'pending' ? 'bg-amber-500/20 text-amber-500' :
                        rep.status === 'resolved' ? 'bg-emerald-500/20 text-emerald-500' :
                        'bg-zinc-500/20 text-zinc-400'
                      }`}>
                        {rep.status}
                      </span>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <span className="block text-[10px] font-bold opacity-40 font-sans">{language === 'ar' ? 'المستخدم المبلغ عنه' : 'Reported Accused'}</span>
                        <span className="text-xs font-bold font-sans dark:text-zinc-200 text-zinc-900">@{rep.reportedUserName}</span>
                      </div>

                      <div>
                        <span className="block text-[10px] font-bold opacity-40 font-sans">{t.reportedReason}</span>
                        <p className="text-xs leading-relaxed font-sans">{rep.reason}</p>
                      </div>

                      {rep.status === 'pending' && (
                        <div className="flex gap-2 pt-2.5">
                          <button
                            onClick={() => handleResolveReport(rep.id, 'resolve')}
                            className="py-1.5 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-sans text-[10px] font-bold cursor-pointer transition-all flex items-center gap-1"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>{t.resolveReport}</span>
                          </button>
                          <button
                            onClick={() => handleResolveReport(rep.id, 'dismiss')}
                            className="py-1.5 px-3.5 rounded-xl bg-zinc-300 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 font-sans text-[10px] font-bold cursor-pointer transition-all flex items-center gap-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>{t.dismissReport}</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center opacity-40 text-xs font-sans">
                  {t.noReports}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* TAB 4: AUDIT LOGS */}
        {activeTab === 'logs' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-2.5"
          >
            <div className="space-y-2 max-h-[450px] overflow-y-auto pr-1" id="admin_audit_logs_block">
              {auditLogs.length > 0 ? (
                auditLogs.map((log) => (
                  <div
                    key={log.id}
                    className={`p-3.5 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs leading-relaxed ${
                      currentTheme === 'dark' ? 'bg-zinc-900/40 border-zinc-800/80' : 'bg-zinc-50 border-zinc-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
                        <Activity className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="block font-bold font-sans text-zinc-950 dark:text-zinc-100">{log.action}</span>
                        <span className="block text-[10px] opacity-60 font-sans">الهدف: {log.target}</span>
                      </div>
                    </div>

                    <div className="flex flex-col items-end text-right shrink-0">
                      <span className="text-[10px] font-bold text-amber-500 font-sans">بواسطة: {log.operator}</span>
                      <span className="text-[9px] font-mono opacity-40">{formatTime(log.timestamp)}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center opacity-40 text-xs font-sans">
                  لا توجد عمليات مسجلة حاليًا.
                </div>
              )}
            </div>
          </motion.div>
        )}

      </div>
    </div>
  );
}
