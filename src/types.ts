export interface User {
  id: string;
  email?: string;
  phone?: string;
  password?: string; // Auth password
  name: string;
  username: string;
  avatar: string;
  bio: string;
  joinDate: string;
  isAdmin: boolean;
  isBlocked: boolean;
  isOnline: boolean;
  lastSeen: string;
  // Privacy Settings
  hideLastSeen: boolean;
  hideOnlineStatus: boolean;
  avatarPrivacy: 'everyone' | 'contacts' | 'nobody';
  chatPrivacy: 'everyone' | 'contacts';
  blockedUsers: string[]; // List of user IDs
  // Chat preferences
  mutedChats: string[]; // list of chatIds
  pinnedChats: string[]; // list of chatIds
  archivedChats: string[]; // list of chatIds
}

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  text: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'file' | 'audio';
  mediaName?: string;
  mediaSize?: string;
  timestamp: number;
  isSent: boolean;
  isDelivered: boolean;
  isRead: boolean;
  replyTo?: {
    id: string;
    text: string;
    senderName: string;
  };
}

export interface Chat {
  id: string;
  participants: string[]; // User IDs
  lastMessage?: Message;
  unreadCounts: { [userId: string]: number };
  isTyping?: { [userId: string]: boolean };
  isRecording?: { [userId: string]: boolean };
}

export interface Report {
  id: string;
  reporterId: string;
  reporterName: string;
  reportedUserId: string;
  reportedUserName: string;
  reason: string;
  timestamp: number;
  status: 'pending' | 'resolved' | 'dismissed';
}

export interface AdminLog {
  id: string;
  action: string;
  target: string;
  timestamp: number;
  operator: string;
}

export interface SystemStats {
  totalUsers: number;
  totalMessages: number;
  storageUsageBytes: number;
  dbReads: number;
  dbWrites: number;
}
