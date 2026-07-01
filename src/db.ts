import { User, Message, Chat, Report, AdminLog, SystemStats } from './types';

// Storage keys
const USERS_KEY = 'mihbaran_users';
const MESSAGES_KEY = 'mihbaran_messages';
const CHATS_KEY = 'mihbaran_chats';
const REPORTS_KEY = 'mihbaran_reports';
const AUDIT_LOGS_KEY = 'mihbaran_audit_logs';
const STATS_KEY = 'mihbaran_stats';
const CURRENT_USER_KEY = 'mihbaran_current_user';

// Mock Avatars (Unsplash high-quality, friendly faces)
export const MOCK_AVATARS = [
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80", // Female 1
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80", // Male 1
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80", // Female 2
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80", // Male 2
  "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&auto=format&fit=crop&q=80", // Female 3
  "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80"  // Male 3
];

// Helper to seed initial data
export function seedDatabase() {
  const existingUsersJson = localStorage.getItem(USERS_KEY);
  if (existingUsersJson) {
    try {
      const existingUsers = JSON.parse(existingUsersJson) as User[];
      if (!Array.isArray(existingUsers)) {
        throw new Error('Stored users is not an array');
      }
      let updated = false;
      existingUsers.forEach(u => {
        const usernameLower = u.username?.toLowerCase();
        if (usernameLower === 'admin') {
          if (u.password !== 'admin123') {
            u.password = 'admin123';
            updated = true;
          }
          if (!u.isAdmin) {
            u.isAdmin = true;
            updated = true;
          }
        } else if (['ahmad_h', 'nora_atb', 'dr_khalid'].includes(usernameLower)) {
          if (u.password !== '123456') {
            u.password = '123456';
            updated = true;
          }
        } else if (!u.password) {
          u.password = '123456';
          updated = true;
        }
      });
      if (updated) {
        localStorage.setItem(USERS_KEY, JSON.stringify(existingUsers));
      }
      return; // Already seeded and updated
    } catch (e) {
      console.warn("Corrupted or invalid database detected. Resetting to defaults...", e);
      localStorage.removeItem(USERS_KEY);
      localStorage.removeItem(CHATS_KEY);
      localStorage.removeItem(MESSAGES_KEY);
      localStorage.removeItem(REPORTS_KEY);
      localStorage.removeItem(AUDIT_LOGS_KEY);
      localStorage.removeItem(STATS_KEY);
    }
  }

  const now = Date.now();
  const oneHour = 60 * 60 * 1000;
  const twentyFiveHours = 25 * 60 * 60 * 1000;

  // 1. Seed Users
  const seedUsers: User[] = [
    {
      id: 'user_ahmad',
      email: 'ahmad@mihbaran.com',
      phone: '+966501112222',
      password: '123456',
      name: 'أحمد الحربي',
      username: 'ahmad_h',
      avatar: MOCK_AVATARS[1],
      bio: 'مهتم باللغة العربية والخطوط والتقنيات الحديثة 🧑‍💻✍️',
      joinDate: '2026-05-10',
      isAdmin: false,
      isBlocked: false,
      isOnline: true,
      lastSeen: new Date().toISOString(),
      hideLastSeen: false,
      hideOnlineStatus: false,
      avatarPrivacy: 'everyone',
      chatPrivacy: 'everyone',
      blockedUsers: [],
      mutedChats: [],
      pinnedChats: [],
      archivedChats: []
    },
    {
      id: 'user_nora',
      email: 'nora@mihbaran.com',
      phone: '+966502223333',
      password: '123456',
      name: 'نورا العتيبي',
      username: 'nora_atb',
      avatar: MOCK_AVATARS[2],
      bio: 'مصممة واجهات مستخدم متميزة، أسعى دائمًا للابتكار 🎨✨',
      joinDate: '2026-06-01',
      isAdmin: false,
      isBlocked: false,
      isOnline: true,
      lastSeen: new Date().toISOString(),
      hideLastSeen: false,
      hideOnlineStatus: false,
      avatarPrivacy: 'everyone',
      chatPrivacy: 'everyone',
      blockedUsers: [],
      mutedChats: [],
      pinnedChats: [],
      archivedChats: []
    },
    {
      id: 'user_khalid',
      email: 'khalid@mihbaran.com',
      phone: '+966503334444',
      password: '123456',
      name: 'د. خالد سليمان',
      username: 'dr_khalid',
      avatar: MOCK_AVATARS[3],
      bio: 'أستاذ دكتور في اللغويات المقارنة، كاتب وباحث لغوي 📚🖊️',
      joinDate: '2026-06-15',
      isAdmin: false,
      isBlocked: false,
      isOnline: false,
      lastSeen: new Date(now - 3 * oneHour).toISOString(),
      hideLastSeen: false,
      hideOnlineStatus: false,
      avatarPrivacy: 'everyone',
      chatPrivacy: 'everyone',
      blockedUsers: [],
      mutedChats: [],
      pinnedChats: [],
      archivedChats: []
    },
    {
      id: 'user_system_admin',
      email: 'admin@mihbaran.com',
      phone: '+966500000000',
      password: 'admin123',
      name: 'مشرف محبران شات',
      username: 'admin',
      avatar: MOCK_AVATARS[5],
      bio: 'الحساب الرسمي لإدارة وتتبع محبران شات 🔐⚙️',
      joinDate: '2026-01-01',
      isAdmin: true,
      isBlocked: false,
      isOnline: true,
      lastSeen: new Date().toISOString(),
      hideLastSeen: false,
      hideOnlineStatus: false,
      avatarPrivacy: 'everyone',
      chatPrivacy: 'everyone',
      blockedUsers: [],
      mutedChats: [],
      pinnedChats: [],
      archivedChats: []
    }
  ];

  // 2. Seed Chats
  const seedChats: Chat[] = [
    {
      id: 'chat_ahmad_admin',
      participants: ['user_ahmad', 'user_system_admin'],
      unreadCounts: { 'user_system_admin': 0, 'user_ahmad': 0 }
    },
    {
      id: 'chat_nora_admin',
      participants: ['user_nora', 'user_system_admin'],
      unreadCounts: { 'user_system_admin': 1, 'user_nora': 0 }
    }
  ];

  // 3. Seed Messages (Some older than 24h, some newer)
  const seedMessages: Message[] = [
    // Chat Ahmad - Admin
    {
      id: 'msg_1',
      chatId: 'chat_ahmad_admin',
      senderId: 'user_ahmad',
      senderName: 'أحمد الحربي',
      senderAvatar: MOCK_AVATARS[1],
      text: 'مرحبًا يا مدير! هل تم تفعيل خيار الرسائل المؤقتة الـ 24 ساعة؟',
      timestamp: now - twentyFiveHours, // Older than 24h! (will be cleaned up, demonstrating disappearing)
      isSent: true,
      isDelivered: true,
      isRead: true
    },
    {
      id: 'msg_2',
      chatId: 'chat_ahmad_admin',
      senderId: 'user_system_admin',
      senderName: 'مشرف محبران شات',
      senderAvatar: MOCK_AVATARS[5],
      text: 'أهلاً أحمد، نعم! الرسائل المؤقتة تعمل بشكل تلقائي وتُحذف بالكامل بعد 24 ساعة من إرسالها لأمان وخصوصية تامة 🔒',
      timestamp: now - twentyFiveHours + 5 * 60 * 1000, // Older than 24h
      isSent: true,
      isDelivered: true,
      isRead: true
    },
    {
      id: 'msg_3',
      chatId: 'chat_ahmad_admin',
      senderId: 'user_ahmad',
      senderName: 'أحمد الحربي',
      senderAvatar: MOCK_AVATARS[1],
      text: 'رائع جدًا! هذه رسالة جديدة أرسلتها للتو للتجربة.',
      timestamp: now - 10 * 60 * 1000, // 10 mins ago (Safe)
      isSent: true,
      isDelivered: true,
      isRead: true
    },
    // Chat Nora - Admin
    {
      id: 'msg_4',
      chatId: 'chat_nora_admin',
      senderId: 'user_nora',
      senderName: 'نورا العتيبي',
      senderAvatar: MOCK_AVATARS[2],
      text: 'مرحبًا، لقد انتهيت من تصميم واجهة المحادثات الجديدة، سأرفع لك لقطة شاشة للاطلاع عليها.',
      timestamp: now - 2 * oneHour, // 2 hours ago (Safe)
      isSent: true,
      isDelivered: true,
      isRead: false
    },
    {
      id: 'msg_5',
      chatId: 'chat_nora_admin',
      senderId: 'user_nora',
      senderName: 'نورا العتيبي',
      senderAvatar: MOCK_AVATARS[2],
      text: 'صورة الواجهة المقترحة للمحبران',
      mediaUrl: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=800&auto=format&fit=crop&q=80',
      mediaType: 'image',
      mediaName: 'dashboard_concept.jpg',
      mediaSize: '1.4 MB',
      timestamp: now - 2 * oneHour + 10 * 1000, // 2 hours ago
      isSent: true,
      isDelivered: true,
      isRead: false
    }
  ];

  // Set last messages in chats
  seedChats[0].lastMessage = seedMessages[2];
  seedChats[1].lastMessage = seedMessages[4];

  // 4. Seed Reports
  const seedReports: Report[] = [
    {
      id: 'rep_1',
      reporterId: 'user_nora',
      reporterName: 'نورا العتيبي',
      reportedUserId: 'user_khalid',
      reportedUserName: 'د. خالد سليمان',
      reason: 'تجربة الإبلاغ: اختبار إرسال رابط خارجي مشبوه كبلاغ مراجعة.',
      timestamp: now - 4 * oneHour,
      status: 'pending'
    }
  ];

  // 5. Seed Admin Audit Logs
  const seedLogs: AdminLog[] = [
    {
      id: 'log_1',
      action: 'تفعيل نظام الحظر التلقائي والمراقبة الأمنية',
      target: 'جميع الحسابات',
      timestamp: now - 10 * oneHour,
      operator: 'admin'
    },
    {
      id: 'log_2',
      action: 'تهيئة مساحة التخزين المستهلكة الافتراضية',
      target: 'مخزن الوسائط',
      timestamp: now - 9 * oneHour,
      operator: 'admin'
    }
  ];

  // 6. Seed System Stats
  const seedStats: SystemStats = {
    totalUsers: 4,
    totalMessages: 5,
    storageUsageBytes: 1468006, // ~1.4 MB
    dbReads: 42,
    dbWrites: 25
  };

  localStorage.setItem(USERS_KEY, JSON.stringify(seedUsers));
  localStorage.setItem(CHATS_KEY, JSON.stringify(seedChats));
  localStorage.setItem(MESSAGES_KEY, JSON.stringify(seedMessages));
  localStorage.setItem(REPORTS_KEY, JSON.stringify(seedReports));
  localStorage.setItem(AUDIT_LOGS_KEY, JSON.stringify(seedLogs));
  localStorage.setItem(STATS_KEY, JSON.stringify(seedStats));
}

// Read database states
export function getUsers(): User[] {
  incrementDbReads(1);
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
  } catch (e) {
    console.error("Failed to parse users", e);
    return [];
  }
}

export function saveUsers(users: User[]) {
  incrementDbWrites(1);
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

export function getChats(): Chat[] {
  incrementDbReads(1);
  try {
    return JSON.parse(localStorage.getItem(CHATS_KEY) || '[]');
  } catch (e) {
    console.error("Failed to parse chats", e);
    return [];
  }
}

export function saveChats(chats: Chat[]) {
  incrementDbWrites(1);
  localStorage.setItem(CHATS_KEY, JSON.stringify(chats));
}

export function getMessages(): Message[] {
  incrementDbReads(1);
  try {
    return JSON.parse(localStorage.getItem(MESSAGES_KEY) || '[]');
  } catch (e) {
    console.error("Failed to parse messages", e);
    return [];
  }
}

export function saveMessages(messages: Message[]) {
  incrementDbWrites(1);
  localStorage.setItem(MESSAGES_KEY, JSON.stringify(messages));
}

export function getReports(): Report[] {
  incrementDbReads(1);
  try {
    return JSON.parse(localStorage.getItem(REPORTS_KEY) || '[]');
  } catch (e) {
    console.error("Failed to parse reports", e);
    return [];
  }
}

export function saveReports(reports: Report[]) {
  incrementDbWrites(1);
  localStorage.setItem(REPORTS_KEY, JSON.stringify(reports));
}

export function getAuditLogs(): AdminLog[] {
  incrementDbReads(1);
  try {
    return JSON.parse(localStorage.getItem(AUDIT_LOGS_KEY) || '[]');
  } catch (e) {
    console.error("Failed to parse audit logs", e);
    return [];
  }
}

export function saveAuditLogs(logs: AdminLog[]) {
  incrementDbWrites(1);
  localStorage.setItem(AUDIT_LOGS_KEY, JSON.stringify(logs));
}

export function getSystemStats(): SystemStats {
  incrementDbReads(1);
  try {
    return JSON.parse(localStorage.getItem(STATS_KEY) || '{"totalUsers":0,"totalMessages":0,"storageUsageBytes":0,"dbReads":0,"dbWrites":0}');
  } catch (e) {
    return {totalUsers:0,totalMessages:0,storageUsageBytes:0,dbReads:0,dbWrites:0};
  }
}

export function saveSystemStats(stats: SystemStats) {
  localStorage.setItem(STATS_KEY, JSON.stringify(stats));
}

// Increment telemetry
export function incrementDbReads(count: number = 1) {
  const stats = getSystemStats();
  stats.dbReads += count;
  saveSystemStats(stats);
}

export function incrementDbWrites(count: number = 1) {
  const stats = getSystemStats();
  stats.dbWrites += count;
  saveSystemStats(stats);
}

export function addStorageUsage(bytes: number) {
  const stats = getSystemStats();
  stats.storageUsageBytes += bytes;
  saveSystemStats(stats);
}

// Auth operations
export function getCurrentUser(): User | null {
  const userJson = localStorage.getItem(CURRENT_USER_KEY);
  if (!userJson) return null;
  const user = JSON.parse(userJson) as User;
  
  // Keep live status in sync
  const latestUsers = getUsers();
  const found = latestUsers.find(u => u.id === user.id);
  if (found && found.isBlocked) {
    // Force log out if blocked
    logoutUser();
    return null;
  }
  return found || user;
}

export function setCurrentUser(user: User | null) {
  if (user) {
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(CURRENT_USER_KEY);
  }
}

export function logoutUser() {
  const current = getCurrentUser();
  if (current) {
    updateUserStatus(current.id, false);
  }
  localStorage.removeItem(CURRENT_USER_KEY);
}

export function updateUserStatus(userId: string, isOnline: boolean) {
  const users = getUsers();
  const idx = users.findIndex(u => u.id === userId);
  if (idx !== -1) {
    users[idx].isOnline = isOnline;
    users[idx].lastSeen = new Date().toISOString();
    saveUsers(users);
  }
}

// 24 Hours Disappearing Messages Core Logic
export function runDisappearingMessagesCleanup(): { deletedCount: number; deletedSize: number } {
  const messages = getMessages();
  const now = Date.now();
  const expiryThreshold = 24 * 60 * 60 * 1000; // 24 Hours in ms

  let deletedCount = 0;
  let deletedSize = 0;

  const validMessages = messages.filter(msg => {
    const age = now - msg.timestamp;
    const isExpired = age >= expiryThreshold;
    if (isExpired) {
      deletedCount++;
      // If it contains media size, estimate deletion bytes
      if (msg.mediaSize) {
        if (msg.mediaSize.includes('MB')) {
          deletedSize += parseFloat(msg.mediaSize) * 1024 * 1024;
        } else if (msg.mediaSize.includes('KB')) {
          deletedSize += parseFloat(msg.mediaSize) * 1024;
        }
      } else {
        deletedSize += (msg.text.length * 2); // Approximate 2 bytes per char
      }
      return false;
    }
    return true;
  });

  if (deletedCount > 0) {
    saveMessages(validMessages);
    
    // Recalculate chat last messages
    const chats = getChats();
    chats.forEach(chat => {
      const chatMsgs = validMessages.filter(m => m.chatId === chat.id);
      if (chatMsgs.length > 0) {
        chat.lastMessage = chatMsgs[chatMsgs.length - 1];
      } else {
        chat.lastMessage = undefined;
      }
    });
    saveChats(chats);

    // Update system telemetry stats
    const stats = getSystemStats();
    stats.totalMessages = validMessages.length;
    stats.storageUsageBytes = Math.max(0, stats.storageUsageBytes - deletedSize);
    saveSystemStats(stats);

    // Record admin log for automatic system deletion
    const logs = getAuditLogs();
    logs.unshift({
      id: `cleanup_${now}`,
      action: 'تنظيف تلقائي للرسائل المؤقتة المنتهية (24 ساعة)',
      target: `حذف عدد ${deletedCount} رسالة ومرفقاتها`,
      timestamp: now,
      operator: 'نظام محبران التلقائي'
    });
    saveAuditLogs(logs);
  }

  return { deletedCount, deletedSize };
}

// Check username uniqueness
export function checkUsernameAvailable(username: string, excludeUserId?: string): boolean {
  const users = getUsers();
  const lower = username.trim().toLowerCase();
  return !users.some(u => (u.username || '').toLowerCase() === lower && u.id !== excludeUserId);
}

// Auto Bot Replies Simulation
export function simulateBotReplies(chatId: string, userMessageText: string, onNewMessage: () => void) {
  const current = getCurrentUser();
  if (!current) return;

  const chats = getChats();
  const chat = chats.find(c => c.id === chatId);
  if (!chat) return;

  // Find other participant
  const otherId = chat.participants.find(p => p !== current.id);
  if (!otherId) return;

  const users = getUsers();
  const sender = users.find(u => u.id === otherId);
  if (!sender || sender.isBlocked || sender.id === 'user_system_admin') return;

  // Simulate typing status
  setTimeout(() => {
    // Set typing = true
    const updatedChats = getChats();
    const targetChat = updatedChats.find(c => c.id === chatId);
    if (targetChat) {
      if (!targetChat.isTyping) targetChat.isTyping = {};
      targetChat.isTyping[sender.id] = true;
      saveChats(updatedChats);
      onNewMessage();
    }

    // Trigger reply after typing delay
    setTimeout(() => {
      // Clear typing status
      const innerChats = getChats();
      const innerChat = innerChats.find(c => c.id === chatId);
      if (innerChat) {
        if (innerChat.isTyping) innerChat.isTyping[sender.id] = false;
        saveChats(innerChats);
      }

      // Generate funny/professional Arabic-English response
      let replyText = '';
      const textLower = userMessageText.toLowerCase();

      if (textLower.includes('مرحب') || textLower.includes('سلام') || textLower.includes('hello') || textLower.includes('hi')) {
        replyText = `أهلاً بك يا ${current.name}! أسعد الله يومك بالخير والسرور. كيف يمكنني مساعدتك في محبران شات اليوم؟ 🌸`;
      } else if (textLower.includes('كيفك') || textLower.includes('أخبارك') || textLower.includes('how are you')) {
        replyText = 'الحمد لله في أفضل حال، يسرني التواصل معك ومشاركة الأفكار المبدعة! تذكر أن كل رسائلنا آمنة تمامًا ومؤقتة 🔐';
      } else if (textLower.includes('تعديل') || textLower.includes('تصميم') || textLower.includes('design') || textLower.includes('ui')) {
        replyText = 'تصاميم محبران مبنية بدقة وتراعي التفاصيل الجمالية وسرعة التجاوب على كافة الشاشات 🎨✨';
      } else if (textLower.includes('حذف') || textLower.includes('أمان') || textLower.includes('delete') || textLower.includes('security')) {
        replyText = 'نظام الأمان هنا متين؛ تُحذف الرسائل والمرفقات نهائيًا من الخوادم والهواتف بعد 24 ساعة، ولا نترك أي أثر حرصاً على الخصوصية.';
      } else {
        replyText = `رسالتك قيمة ومبهرة: "${userMessageText}". يسعدني جدًا مناقشة هذا الموضوع معك وتطوير محبران شات ليلائم تطلعاتك! 💡✍️`;
      }

      const now = Date.now();
      const newMsg: Message = {
        id: `msg_bot_${now}`,
        chatId: chatId,
        senderId: sender.id,
        senderName: sender.name,
        senderAvatar: sender.avatar,
        text: replyText,
        timestamp: now,
        isSent: true,
        isDelivered: true,
        isRead: false
      };

      const finalMessages = getMessages();
      finalMessages.push(newMsg);
      saveMessages(finalMessages);

      // Update chat last message & unread count
      const finalChats = getChats();
      const finalChat = finalChats.find(c => c.id === chatId);
      if (finalChat) {
        finalChat.lastMessage = newMsg;
        if (!finalChat.unreadCounts) finalChat.unreadCounts = {};
        finalChat.unreadCounts[current.id] = (finalChat.unreadCounts[current.id] || 0) + 1;
        saveChats(finalChats);
      }

      // Increment stats
      const stats = getSystemStats();
      stats.totalMessages += 1;
      saveSystemStats(stats);

      onNewMessage();
    }, 2500);

  }, 1000);
}
