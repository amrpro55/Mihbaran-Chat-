import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Send, Smile, Paperclip, Mic, Phone, Video, Trash2, Reply, Copy, Forward, 
  Check, CheckCheck, X, Image as ImageIcon, FileText, Play, Pause, ChevronLeft, 
  MoreVertical, ShieldAlert, ArrowRight, Star, Settings, ShieldCheck, CheckSquare, 
  Square, VolumeX, AlertOctagon, RefreshCw
} from 'lucide-react';
import { Chat, Message, User, Report } from '../types';
import { Language, translations } from '../i18n';
import { getUsers, getMessages, saveMessages, getChats, saveChats, simulateBotReplies, getReports, saveReports, getSystemStats, saveSystemStats, incrementDbWrites } from '../db';

interface ChatRoomProps {
  language: Language;
  currentUser: User;
  chatId: string;
  onBack: () => void;
  currentTheme: 'light' | 'dark';
}

const PRESET_EMOJIS = ['😊', '😂', '😍', '👍', '🔥', '🌸', '✨', '💡', '⚡', '🤖', '🎉', '❤️', '🙌', '😎', '✍️', '🔒'];

export default function ChatRoom({
  language,
  currentUser,
  chatId,
  onBack,
  currentTheme
}: ChatRoomProps) {
  const t = translations[language];
  const [inputText, setInputText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  
  // Multiple selection states
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [selectedMsgIds, setSelectedMsgIds] = useState<string[]>([]);
  
  // Forward state
  const [showForwardDialog, setShowForwardDialog] = useState(false);
  const [forwardTargetChatId, setForwardTargetChatId] = useState('');

  // Report Abuse states
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [reportReason, setReportReason] = useState('');

  // Audio recording simulation
  const [isRecording, setIsRecording] = useState(false);
  const [recordDuration, setRecordDuration] = useState(0);
  const [recordingWaves, setRecordingWaves] = useState<number[]>([]);
  const recordingTimer = useRef<NodeJS.Timeout | null>(null);

  // Simulated audio playback map (msgId -> isPlaying)
  const [playingAudios, setPlayingAudios] = useState<{ [msgId: string]: boolean }>({});
  
  // Reference for scrolling
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Feed from DB
  const [allMessages, setAllMessages] = useState<Message[]>([]);
  const [chat, setChat] = useState<Chat | null>(null);
  const [partner, setPartner] = useState<User | null>(null);

  const loadData = () => {
    const msgs = getMessages().filter(m => m.chatId === chatId);
    setAllMessages(msgs);

    const activeChat = getChats().find(c => c.id === chatId);
    if (activeChat) {
      setChat(activeChat);
      
      // Load partner profile
      const partnerId = activeChat.participants.find(p => p !== currentUser.id);
      if (partnerId) {
        const u = getUsers().find(user => user.id === partnerId);
        setPartner(u || null);
      }

      // Mark all incoming messages in this chat as Read
      let changed = false;
      const globalMsgs = getMessages();
      const updatedGlobal = globalMsgs.map(m => {
        if (m.chatId === chatId && m.senderId !== currentUser.id && !m.isRead) {
          m.isRead = true;
          changed = true;
        }
        return m;
      });

      if (changed) {
        saveMessages(updatedGlobal);
        // Reset unread count for current user
        const globalChats = getChats();
        const activeIdx = globalChats.findIndex(c => c.id === chatId);
        if (activeIdx !== -1) {
          globalChats[activeIdx].unreadCounts[currentUser.id] = 0;
          saveChats(globalChats);
        }
      }
    }
  };

  useEffect(() => {
    loadData();
    scrollToBottom();
  }, [chatId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Toast message simulator
  const [toastText, setToastText] = useState('');
  const triggerToast = (text: string) => {
    setToastText(text);
    setTimeout(() => setToastText(''), 3000);
  };

  const handleSendMessage = (textToSend = inputText, attachment?: { type: 'image' | 'file' | 'audio', url: string, name: string, size: string }) => {
    if (!textToSend.trim() && !attachment) return;

    const now = Date.now();
    const newMsg: Message = {
      id: `msg_${now}`,
      chatId: chatId,
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderAvatar: currentUser.avatar,
      text: textToSend,
      timestamp: now,
      isSent: true,
      isDelivered: true,
      isRead: false
    };

    if (attachment) {
      newMsg.mediaType = attachment.type;
      newMsg.mediaUrl = attachment.url;
      newMsg.mediaName = attachment.name;
      newMsg.mediaSize = attachment.size;
    }

    if (replyingTo) {
      newMsg.replyTo = {
        id: replyingTo.id,
        text: replyingTo.text,
        senderName: replyingTo.senderName
      };
      setReplyingTo(null);
    }

    // Save Message
    const globalMessages = getMessages();
    globalMessages.push(newMsg);
    saveMessages(globalMessages);

    // Update Chat last message
    const globalChats = getChats();
    const chatIdx = globalChats.findIndex(c => c.id === chatId);
    if (chatIdx !== -1) {
      globalChats[chatIdx].lastMessage = newMsg;
      saveChats(globalChats);
    }

    // Update stats
    const stats = getSystemStats();
    stats.totalMessages += 1;
    if (attachment) {
      // Add estimated sizes
      if (attachment.size.includes('MB')) {
        stats.storageUsageBytes += parseFloat(attachment.size) * 1024 * 1024;
      } else {
        stats.storageUsageBytes += parseFloat(attachment.size) * 1024;
      }
    }
    saveSystemStats(stats);

    setInputText('');
    setShowEmojiPicker(false);
    loadData();
    setTimeout(scrollToBottom, 50);

    // Simulate Bot reply!
    simulateBotReplies(chatId, textToSend, () => {
      loadData();
      setTimeout(scrollToBottom, 50);
    });
  };

  // Simulated Voice recording
  const startRecordingSim = () => {
    setIsRecording(true);
    setRecordDuration(0);
    setRecordingWaves(Array.from({ length: 15 }, () => Math.floor(Math.random() * 24) + 4));

    // Signal recording to chat partner
    const globalChats = getChats();
    const chatIdx = globalChats.findIndex(c => c.id === chatId);
    if (chatIdx !== -1) {
      if (!globalChats[chatIdx].isRecording) globalChats[chatIdx].isRecording = {};
      globalChats[chatIdx].isRecording[currentUser.id] = true;
      saveChats(globalChats);
    }

    recordingTimer.current = setInterval(() => {
      setRecordDuration(prev => prev + 1);
      setRecordingWaves(Array.from({ length: 15 }, () => Math.floor(Math.random() * 24) + 4));
    }, 1000);
  };

  const stopRecordingSim = (send = true) => {
    if (recordingTimer.current) clearInterval(recordingTimer.current);
    setIsRecording(false);

    // Clear signal recording
    const globalChats = getChats();
    const chatIdx = globalChats.findIndex(c => c.id === chatId);
    if (chatIdx !== -1) {
      if (globalChats[chatIdx].isRecording) {
        globalChats[chatIdx].isRecording[currentUser.id] = false;
        saveChats(globalChats);
      }
    }

    if (send && recordDuration > 0) {
      const minutes = Math.floor(recordDuration / 60);
      const seconds = recordDuration % 60;
      const formattedDuration = `${minutes}:${seconds.toString().padStart(2, '0')}`;
      
      handleSendMessage(`تسجيل صوتي (${formattedDuration})`, {
        type: 'audio',
        url: '#', // Simulate audio play
        name: `audio_record_${Date.now()}.ogg`,
        size: `${(recordDuration * 12).toFixed(1)} KB`
      });
    }
    setRecordDuration(0);
  };

  // Attachment simulations
  const handleTriggerUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      triggerToast(t.mediaLimit);
      return;
    }

    const isImg = file.type.startsWith('image/');
    const type = isImg ? 'image' : 'file';
    const fakeUrl = isImg 
      ? URL.createObjectURL(file) 
      : 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=150'; // standard thumb

    // Compress simulation text
    const kbSize = (file.size / 1024).toFixed(1);
    const displaySize = parseFloat(kbSize) > 1024 
      ? `${(parseFloat(kbSize) / 1024).toFixed(1)} MB`
      : `${kbSize} KB`;

    triggerToast(language === 'ar' ? `جاري ضغط ورفع: ${file.name}` : `Compressing & uploading: ${file.name}`);

    setTimeout(() => {
      handleSendMessage(file.name, {
        type: type,
        url: fakeUrl,
        name: file.name,
        size: displaySize
      });
    }, 1200);
  };

  // Single message options
  const handleCopyMessage = (msg: Message) => {
    navigator.clipboard.writeText(msg.text);
    triggerToast(t.copied);
  };

  const handleDeleteMessage = (msgId: string) => {
    const global = getMessages().filter(m => m.id !== msgId);
    saveMessages(global);

    // Recheck chat last messages
    const globalChats = getChats();
    const chatIdx = globalChats.findIndex(c => c.id === chatId);
    if (chatIdx !== -1) {
      const remainingMsgs = global.filter(m => m.chatId === chatId);
      globalChats[chatIdx].lastMessage = remainingMsgs[remainingMsgs.length - 1];
      saveChats(globalChats);
    }
    loadData();
    triggerToast(language === 'ar' ? 'تم حذف الرسالة' : 'Message deleted');
  };

  // Multiple selection handlers
  const handleToggleBulkSelect = (msgId: string) => {
    setSelectedMsgIds(prev => 
      prev.includes(msgId) ? prev.filter(id => id !== msgId) : [...prev, msgId]
    );
  };

  const handleDeleteBulkSelected = () => {
    if (selectedMsgIds.length === 0) return;
    const global = getMessages().filter(m => !selectedMsgIds.includes(m.id));
    saveMessages(global);

    // Update chats
    const globalChats = getChats();
    const chatIdx = globalChats.findIndex(c => c.id === chatId);
    if (chatIdx !== -1) {
      const remainingMsgs = global.filter(m => m.chatId === chatId);
      globalChats[chatIdx].lastMessage = remainingMsgs[remainingMsgs.length - 1];
      saveChats(globalChats);
    }

    setIsBulkMode(false);
    setSelectedMsgIds([]);
    loadData();
    triggerToast(language === 'ar' ? 'تم حذف الرسائل المحددة للجميع' : 'Deleted selected messages for everyone');
  };

  // Forwarding simulation
  const handleForwardMessages = () => {
    if (selectedMsgIds.length === 0) return;
    setShowForwardDialog(true);
  };

  const handleConfirmForward = () => {
    if (!forwardTargetChatId) return;

    // Grab original messages
    const msgsToForward = allMessages.filter(m => selectedMsgIds.includes(m.id));
    const global = getMessages();
    const now = Date.now();

    msgsToForward.forEach((m, idx) => {
      const newFwd: Message = {
        id: `fwd_${now}_${idx}`,
        chatId: forwardTargetChatId,
        senderId: currentUser.id,
        senderName: currentUser.name,
        senderAvatar: currentUser.avatar,
        text: `${language === 'ar' ? '🔄 معاد توجيهها:' : '🔄 Forwarded:'} ${m.text}`,
        mediaType: m.mediaType,
        mediaUrl: m.mediaUrl,
        mediaName: m.mediaName,
        mediaSize: m.mediaSize,
        timestamp: now + idx,
        isSent: true,
        isDelivered: true,
        isRead: false
      };
      global.push(newFwd);

      // Set last message in target chat
      const globalChats = getChats();
      const targetIdx = globalChats.findIndex(c => c.id === forwardTargetChatId);
      if (targetIdx !== -1) {
        globalChats[targetIdx].lastMessage = newFwd;
        saveChats(globalChats);
      }
    });

    saveMessages(global);
    setIsBulkMode(false);
    setSelectedMsgIds([]);
    setShowForwardDialog(false);
    triggerToast(language === 'ar' ? 'تمت إعادة التوجيه بنجاح' : 'Forwarded successfully');
  };

  // Submit Abuse Report
  const handleSubmitAbuseReport = () => {
    if (!reportReason.trim() || !partner) return;

    const reports = getReports();
    const newReport: Report = {
      id: `rep_${Date.now()}`,
      reporterId: currentUser.id,
      reporterName: currentUser.name,
      reportedUserId: partner.id,
      reportedUserName: partner.name,
      reason: reportReason,
      timestamp: Date.now(),
      status: 'pending'
    };

    reports.unshift(newReport);
    saveReports(reports);
    incrementDbWrites(1);

    setReportReason('');
    setShowReportDialog(false);
    triggerToast(t.reportAbuseSuccess);
  };

  const formatTime = (ts: number) => {
    return new Date(ts).toLocaleTimeString(language === 'ar' ? 'ar-EG' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <div className={`flex-1 h-full flex flex-col transition-colors duration-300 relative ${
      currentTheme === 'dark' ? 'bg-zinc-950 text-zinc-100' : 'bg-white text-zinc-900'
    }`} id="chat_room_view" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      
      {/* Toast Alert Banner */}
      <AnimatePresence>
        {toastText && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-18 left-1/2 transform -translate-x-1/2 z-50 py-2.5 px-5 rounded-full bg-emerald-600 text-white font-sans text-xs shadow-xl flex items-center gap-2"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>{toastText}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 1. ROOM HEADER */}
      {partner && (
        <div className={`p-4 border-b flex items-center justify-between shrink-0 ${
          currentTheme === 'dark' ? 'bg-zinc-900/60 border-zinc-800' : 'bg-zinc-50 border-zinc-200'
        }`} id="chatroom_header">
          <div className="flex items-center gap-3">
            {/* Mobile Back Button */}
            <button
              onClick={onBack}
              className="p-1 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              id="chat_room_back_btn"
            >
              <ArrowRight className={`w-5 h-5 ${language === 'en' ? 'transform rotate-180' : ''}`} />
            </button>

            {/* Avatar block with profile details preview toggle */}
            <div className="relative shrink-0">
              <img
                src={partner.avatar}
                alt={partner.name}
                className="w-10 h-10 rounded-xl object-cover ring-1 ring-zinc-200 dark:ring-zinc-800"
              />
              {partner.isOnline && !partner.hideOnlineStatus && (
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white dark:border-zinc-900 rounded-full" />
              )}
            </div>

            <div className="min-w-0" dir="ltr">
              <h2 className="font-semibold text-xs truncate dark:text-zinc-100 font-sans block max-w-[150px] text-zinc-900">
                {partner.name}
              </h2>
              <span className="text-[10px] opacity-60 font-sans block text-left">
                {partner.isOnline && !partner.hideOnlineStatus ? (
                  <span className="text-emerald-500 font-bold">{t.online}</span>
                ) : partner.hideLastSeen ? (
                  <span>{t.offline}</span>
                ) : (
                  <span>{t.lastSeen} {partner.lastSeen ? formatTime(new Date(partner.lastSeen).getTime()) : ''}</span>
                )}
              </span>
            </div>
          </div>

          {/* Action Row */}
          <div className="flex items-center gap-2" id="room_header_actions">
            <button
              onClick={() => setShowReportDialog(true)}
              className="p-1.5 rounded-lg hover:bg-rose-500/10 text-rose-500 cursor-pointer transition-colors"
              title={t.reportAbuseBtn}
              id="report_abuse_trigger"
            >
              <ShieldAlert className="w-5 h-5" />
            </button>
            <button
              onClick={() => setIsBulkMode(!isBulkMode)}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                isBulkMode ? 'bg-emerald-500/20 text-emerald-500' : 'hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-500'
              }`}
              title={t.selectMany}
            >
              <CheckSquare className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* 2. TEMPORARY MESSAGES WARNING BANNER */}
      <div className="py-2.5 px-4 bg-emerald-500/10 border-b border-emerald-500/10 text-[11px] text-emerald-600 dark:text-emerald-500 font-sans flex items-center gap-2 shrink-0 justify-center text-center">
        <AlertOctagon className="w-4 h-4 shrink-0 animate-pulse" />
        <span>{t.disappearingInfo}</span>
      </div>

      {/* 3. MESSAGES SCROLL CONTAINER */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4" id="chatroom_messages_scroll">
        {allMessages.length > 0 ? (
          allMessages.map((msg) => {
            const isMe = msg.senderId === currentUser.id;
            const isSelected = selectedMsgIds.includes(msg.id);

            return (
              <div
                key={msg.id}
                className={`flex items-end gap-2.5 ${isMe ? 'justify-end' : 'justify-start'}`}
                id={`msg_card_${msg.id}`}
              >
                {/* Bulk Select Checkbox */}
                {isBulkMode && (
                  <button
                    onClick={() => handleToggleBulkSelect(msg.id)}
                    className="p-1 text-emerald-500 cursor-pointer"
                  >
                    {isSelected ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5 opacity-40" />}
                  </button>
                )}

                {/* Receiver Avatar */}
                {!isMe && (
                  <img
                    src={msg.senderAvatar}
                    alt={msg.senderName}
                    className="w-8 h-8 rounded-lg object-cover ring-1 ring-zinc-200 dark:ring-zinc-800"
                  />
                )}

                {/* Message Bubble container */}
                <div className="flex flex-col max-w-[70%]">
                  <div className={`relative px-4 py-3 rounded-2xl text-xs leading-relaxed shadow-sm transition-all group ${
                    isMe 
                      ? 'bg-emerald-600 text-white rounded-br-none' 
                      : currentTheme === 'dark' 
                        ? 'bg-zinc-900 text-zinc-200 rounded-bl-none border border-zinc-800' 
                        : 'bg-zinc-100 text-zinc-800 rounded-bl-none'
                  }`}>
                    
                    {/* Reply metadata preview */}
                    {msg.replyTo && (
                      <div className={`mb-2 p-1.5 rounded-lg border-l-2 text-[10px] truncate ${
                        isMe ? 'bg-emerald-700/50 border-emerald-300 text-emerald-100' : 'bg-zinc-800/40 border-emerald-500 text-zinc-400'
                      }`}>
                        <span className="font-bold block font-sans">@{msg.replyTo.senderName}</span>
                        <span className="italic block truncate font-sans">{msg.replyTo.text}</span>
                      </div>
                    )}

                    {/* Media render blocks */}
                    {msg.mediaType === 'image' && (
                      <div className="mb-2.5 rounded-xl overflow-hidden border border-black/10">
                        <img 
                          src={msg.mediaUrl} 
                          alt={msg.mediaName} 
                          className="w-full max-h-60 object-cover cursor-pointer hover:opacity-90"
                          referrerPolicy="no-referrer"
                        />
                        <div className="p-1.5 bg-black/20 text-[10px] flex justify-between font-mono text-zinc-300">
                          <span>{msg.mediaName}</span>
                          <span>{msg.mediaSize}</span>
                        </div>
                      </div>
                    )}

                    {msg.mediaType === 'file' && (
                      <div className={`mb-2.5 p-3 rounded-xl flex items-center justify-between gap-3 text-xs border ${
                        isMe ? 'bg-emerald-700/40 border-emerald-500/20' : 'bg-zinc-800/50 border-zinc-700'
                      }`}>
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="w-5 h-5 shrink-0 text-emerald-400" />
                          <div className="min-w-0">
                            <span className="block font-bold truncate font-sans">{msg.mediaName}</span>
                            <span className="block text-[10px] font-mono opacity-50">{msg.mediaSize}</span>
                          </div>
                        </div>
                        <a 
                          href="#"
                          onClick={(e) => { e.preventDefault(); triggerToast(language === 'ar' ? 'بدء تنظيف المرفق المحمي...' : 'Initiating secured download...'); }}
                          className="text-[10px] font-bold py-1 px-2.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500 text-emerald-400 hover:text-white transition-all"
                        >
                          OPEN
                        </a>
                      </div>
                    )}

                    {msg.mediaType === 'audio' && (
                      <div className={`mb-2.5 p-3 rounded-xl flex items-center gap-3 text-xs border ${
                        isMe ? 'bg-emerald-700/40 border-emerald-500/20' : 'bg-zinc-800/50 border-zinc-700'
                      }`}>
                        <button
                          onClick={() => setPlayingAudios(prev => ({ ...prev, [msg.id]: !prev[msg.id] }))}
                          className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center cursor-pointer hover:scale-105 transition-all"
                        >
                          {playingAudios[msg.id] ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                        </button>
                        <div className="flex-1">
                          {/* Simulated audio waveform */}
                          <div className="flex items-center gap-0.5 h-6">
                            {Array.from({ length: 12 }).map((_, i) => (
                              <span 
                                key={i} 
                                style={{ height: `${playingAudios[msg.id] ? Math.floor(Math.random() * 16) + 4 : 6}px` }}
                                className={`w-0.5 rounded-full transition-all duration-300 ${
                                  playingAudios[msg.id] ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-400'
                                }`} 
                              />
                            ))}
                          </div>
                          <span className="text-[9px] font-mono block opacity-50 mt-1">{msg.mediaSize}</span>
                        </div>
                      </div>
                    )}

                    {/* Text block */}
                    <p className="font-sans font-medium select-text">{msg.text}</p>

                    {/* Info & Micro action controls overlay on hover */}
                    <div className="absolute -top-7 right-0 scale-0 group-hover:scale-100 transition-all flex items-center gap-1.5 p-1 rounded-lg border shadow-xl bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
                      <button 
                        onClick={() => setReplyingTo(msg)}
                        className="p-1 hover:bg-emerald-500/10 text-zinc-500 hover:text-emerald-500 rounded cursor-pointer"
                        title={language === 'ar' ? 'رد' : 'Reply'}
                      >
                        <Reply className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={() => handleCopyMessage(msg)}
                        className="p-1 hover:bg-emerald-500/10 text-zinc-500 hover:text-emerald-500 rounded cursor-pointer"
                        title={language === 'ar' ? 'نسخ' : 'Copy'}
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={() => handleDeleteMessage(msg.id)}
                        className="p-1 hover:bg-rose-500/10 text-rose-500 rounded cursor-pointer"
                        title={language === 'ar' ? 'حذف للجميع' : 'Delete'}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Bottom Timestamp & Delivery state indicators */}
                    <div className="flex justify-end items-center gap-1 mt-1 text-[9px] opacity-60 font-mono">
                      <span>{formatTime(msg.timestamp)}</span>
                      {isMe && (
                        msg.isRead ? (
                          <CheckCheck className="w-3 h-3 text-emerald-300" />
                        ) : (
                          <Check className="w-3 h-3 text-white" />
                        )
                      )}
                    </div>

                  </div>
                </div>

              </div>
            );
          })
        ) : (
          <div className="h-full flex flex-col items-center justify-center p-8 opacity-50" id="chatroom_empty">
            <ShieldCheck className="w-12 h-12 text-emerald-500 mb-2.5 animate-pulse" />
            <p className="text-xs font-sans text-center">أهلاً بك! كافة البيانات والمراسلات هنا آمنة ومؤقتة ومحذوفة تلقائياً بعد 24 ساعة.</p>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Bulk actions bottom bar */}
      {isBulkMode && (
        <div className={`p-3.5 border-t flex justify-between items-center shrink-0 ${
          currentTheme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-zinc-100 border-zinc-200'
        }`}>
          <span className="text-xs font-sans font-bold">
            {language === 'ar' ? `محدد: ${selectedMsgIds.length} رسائل` : `Selected: ${selectedMsgIds.length} messages`}
          </span>
          <div className="flex gap-2">
            <button
              onClick={handleForwardMessages}
              disabled={selectedMsgIds.length === 0}
              className="py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-sans text-xs font-semibold cursor-pointer"
            >
              {t.forwardSelected}
            </button>
            <button
              onClick={handleDeleteBulkSelected}
              disabled={selectedMsgIds.length === 0}
              className="py-1.5 px-3 rounded-lg bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white font-sans text-xs font-semibold cursor-pointer"
            >
              {t.deleteSelected}
            </button>
            <button
              onClick={() => { setIsBulkMode(false); setSelectedMsgIds([]); }}
              className="py-1.5 px-3 rounded-lg bg-zinc-400 hover:bg-zinc-500 text-white font-sans text-xs cursor-pointer"
            >
              {t.cancelReply}
            </button>
          </div>
        </div>
      )}

      {/* 4. ACTIVE TYPING INDICATOR AREA */}
      {chat && partner && (
        <div className="px-4 shrink-0" id="live_indicators_area">
          {chat.isTyping?.[partner.id] && (
            <div className="flex items-center gap-1.5 py-1.5 text-xs text-emerald-500 animate-pulse font-sans">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce" />
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce [animation-delay:0.2s]" />
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce [animation-delay:0.4s]" />
              <span className="ml-1">{partner.name} {t.typing}</span>
            </div>
          )}
          {chat.isRecording?.[partner.id] && (
            <div className="flex items-center gap-1.5 py-1.5 text-xs text-emerald-500 animate-pulse font-sans">
              <Mic className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
              <span>{partner.name} {t.recording}</span>
            </div>
          )}
        </div>
      )}

      {/* 5. REPLY TARGET BLOCK PREVIEW */}
      {replyingTo && (
        <div className={`px-4 py-2 border-t flex justify-between items-center shrink-0 ${
          currentTheme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-zinc-100 border-zinc-200'
        }`} id="replying_container_preview">
          <div className="border-l-2 border-emerald-500 pl-3 min-w-0">
            <span className="text-[10px] font-bold block text-emerald-500">@{replyingTo.senderName}</span>
            <span className="text-xs truncate block opacity-70 font-sans">{replyingTo.text}</span>
          </div>
          <button
            onClick={() => setReplyingTo(null)}
            className="p-1 rounded-full hover:bg-zinc-300 dark:hover:bg-zinc-800 cursor-pointer"
          >
            <X className="w-4 h-4 opacity-50" />
          </button>
        </div>
      )}

      {/* 6. INPUT CONTROL FORM */}
      <div className={`p-4 border-t flex flex-col gap-2 shrink-0 ${
        currentTheme === 'dark' ? 'bg-zinc-900/60 border-zinc-800' : 'bg-zinc-50 border-zinc-200'
      }`} id="chatroom_input_bar">
        
        {/* Emoji selection grid overlay */}
        {showEmojiPicker && (
          <div className={`p-3 border rounded-2xl flex flex-wrap gap-2.5 max-w-sm mb-1 shadow-xl animate-fade-in ${
            currentTheme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'
          }`} id="emoji_picker_panel">
            {PRESET_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => setInputText(prev => prev + emoji)}
                className="text-lg hover:scale-125 transition-transform p-1 cursor-pointer"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2.5">
          {/* File Attachment Triggers */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2.5 rounded-xl hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors text-zinc-500 cursor-pointer shrink-0"
            title={language === 'ar' ? 'إرفاق صور أو ملفات' : 'Attach images or files'}
          >
            <Paperclip className="w-5 h-5" />
          </button>
          
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleTriggerUpload}
            className="hidden"
            accept="image/*,application/pdf,application/msword,text/plain"
          />

          {/* Text Input Block */}
          <div className="flex-1 relative">
            <input
              type="text"
              value={inputText}
              onChange={(e) => {
                setInputText(e.target.value);
                // Signal typing status
                const globalChats = getChats();
                const chatIdx = globalChats.findIndex(c => c.id === chatId);
                if (chatIdx !== -1) {
                  if (!globalChats[chatIdx].isTyping) globalChats[chatIdx].isTyping = {};
                  globalChats[chatIdx].isTyping[currentUser.id] = e.target.value.length > 0;
                  saveChats(globalChats);
                }
              }}
              placeholder={t.inputPlaceholder}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSendMessage();
              }}
              className={`w-full px-4 py-3 text-xs rounded-xl border focus:outline-none focus:ring-1 focus:ring-emerald-500/40 bg-transparent ${
                currentTheme === 'dark' ? 'border-zinc-800 text-zinc-200' : 'border-zinc-200 text-zinc-800'
              }`}
            />
            
            <button
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="absolute right-3.5 top-3 text-zinc-500 hover:text-emerald-500 cursor-pointer"
            >
              <Smile className="w-5 h-5" />
            </button>
          </div>

          {/* Recording & Sending controls */}
          {inputText.trim() ? (
            <button
              onClick={() => handleSendMessage()}
              className="p-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-md active:scale-95 cursor-pointer shrink-0 transition-all"
              id="send_msg_btn"
            >
              <Send className={`w-5 h-5 ${language === 'ar' ? 'transform rotate-180' : ''}`} />
            </button>
          ) : (
            <div className="flex items-center gap-1.5 shrink-0">
              {isRecording ? (
                <div className="flex items-center gap-2 px-3 py-2 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-xl text-xs">
                  <span className="w-2 h-2 bg-rose-500 rounded-full animate-ping shrink-0" />
                  <span className="font-bold">{recordDuration}s</span>
                  
                  {/* Cancel Recording */}
                  <button
                    onClick={() => stopRecordingSim(false)}
                    className="p-1 rounded hover:bg-rose-500/20 cursor-pointer"
                    title="Cancel"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>

                  {/* Send audio */}
                  <button
                    onClick={() => stopRecordingSim(true)}
                    className="p-1 rounded bg-rose-500 text-white cursor-pointer"
                    title="Send"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={startRecordingSim}
                  className="p-3 rounded-xl bg-zinc-200 dark:bg-zinc-800 text-zinc-500 hover:text-emerald-500 shadow-sm active:scale-95 cursor-pointer shrink-0 transition-all"
                  title={t.micHold}
                >
                  <Mic className="w-5 h-5" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 7. DIALOG: REPORT ABUSE MODAL */}
      <AnimatePresence>
        {showReportDialog && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`w-full max-w-sm p-6 rounded-3xl shadow-2xl border ${
                currentTheme === 'dark' ? 'bg-zinc-900 border-zinc-800 text-zinc-100' : 'bg-white border-zinc-200 text-zinc-900'
              }`}
            >
              <h3 className="text-lg font-bold font-sans mb-1">{t.reportAbuseBtn}</h3>
              <p className="text-xs opacity-60 mb-4 font-sans">
                {language === 'ar' ? 'سيتم رفع هذا الإبلاغ وسجل المحادثة للمشرفين للتحقق والتعامل مع المخالفات.' : 'This report & chat log will be sent to the administration team for investigation.'}
              </p>

              <textarea
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                placeholder={t.reportAbuseReason}
                rows={3.5}
                className="w-full px-3.5 py-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent text-xs focus:outline-none focus:ring-1 focus:ring-rose-500/50 resize-none font-sans mb-4"
              />

              <div className="flex gap-2">
                <button
                  onClick={handleSubmitAbuseReport}
                  disabled={!reportReason.trim()}
                  className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white text-xs font-sans font-bold cursor-pointer transition-all"
                >
                  {language === 'ar' ? 'إرسال البلاغ' : 'Submit Report'}
                </button>
                <button
                  onClick={() => { setShowReportDialog(false); setReportReason(''); }}
                  className="flex-1 py-2 rounded-xl bg-zinc-300 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-xs font-sans font-bold cursor-pointer transition-all"
                >
                  {t.cancelReply}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 8. DIALOG: FORWARD MESSAGE MODAL */}
      <AnimatePresence>
        {showForwardDialog && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`w-full max-w-sm p-6 rounded-3xl shadow-2xl border ${
                currentTheme === 'dark' ? 'bg-zinc-900 border-zinc-800 text-zinc-100' : 'bg-white border-zinc-200 text-zinc-900'
              }`}
            >
              <h3 className="text-lg font-bold font-sans mb-3">{t.forwardTitle}</h3>

              <div className="space-y-2.5 max-h-60 overflow-y-auto mb-5" id="forward_chats_list">
                {getChats().map((c) => {
                  const pId = c.participants.find(p => p !== currentUser.id);
                  const u = getUsers().find(usr => usr.id === pId);
                  if (!u) return null;

                  return (
                    <button
                      key={c.id}
                      onClick={() => setForwardTargetChatId(c.id)}
                      className={`w-full p-3 rounded-2xl flex items-center gap-3 border text-left cursor-pointer transition-all ${
                        forwardTargetChatId === c.id 
                          ? 'bg-emerald-500/10 border-emerald-500/30' 
                          : 'border-transparent hover:bg-zinc-100 dark:hover:bg-zinc-800'
                      }`}
                    >
                      <img src={u.avatar} alt={u.name} className="w-8 h-8 rounded-lg object-cover" />
                      <span className="text-xs font-semibold block font-sans">{u.name}</span>
                    </button>
                  );
                })}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleConfirmForward}
                  disabled={!forwardTargetChatId}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-sans font-bold cursor-pointer transition-all"
                >
                  {language === 'ar' ? 'تأكيد الإرسال' : 'Confirm Send'}
                </button>
                <button
                  onClick={() => { setShowForwardDialog(false); setForwardTargetChatId(''); }}
                  className="flex-1 py-2.5 rounded-xl bg-zinc-300 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-xs font-sans font-bold cursor-pointer transition-all"
                >
                  {t.cancelReply}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
