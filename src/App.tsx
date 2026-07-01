import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { translations, Language } from './i18n';
import { User, Chat } from './types';
import { 
  seedDatabase, getCurrentUser, setCurrentUser, getChats, 
  runDisappearingMessagesCleanup, incrementDbReads 
} from './db';

// Import newly created modular components
import Splash from './components/Splash';
import Auth from './components/Auth';
import ChatList from './components/ChatList';
import ChatRoom from './components/ChatRoom';
import Profile from './components/Profile';
import Settings from './components/Settings';
import AdminPanel from './components/AdminPanel';
import Search from './components/Search';
import { logoutFirebase } from './firebase';

type ActiveView = 'chat' | 'profile' | 'settings' | 'admin' | 'search';

export default function App() {
  const [loading, setLoading] = useState(true);
  const [language, setLanguage] = useState<Language>('ar');
  const [currentUser, setSessionUser] = useState<User | null>(null);
  
  // Layout views
  const [activeView, setActiveView] = useState<ActiveView>('chat');
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string | undefined>(undefined);
  
  // Theme Manager: default to safe high-contrast light or dark theme
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');

  // Seed and initial check
  useEffect(() => {
    seedDatabase();
    
    // Check saved language
    const savedLang = localStorage.getItem('mihbaran_lang') as Language;
    if (savedLang) {
      setLanguage(savedLang);
    }

    // Check session
    const user = getCurrentUser();
    if (user) {
      setSessionUser(user);
    }

    // Finish loading animation after short delay
    const timer = setTimeout(() => {
      setLoading(false);
    }, 2800);

    return () => clearTimeout(timer);
  }, []);

  // Set up background timers for 24 hours disappearing messages cleanup & chats updater
  useEffect(() => {
    if (!currentUser) return;

    // Load active chats immediately
    const loadChats = () => {
      incrementDbReads(1);
      const allChats = getChats();
      // Only load chats that current user is participating in
      const filtered = allChats.filter(c => c.participants.includes(currentUser.id));
      setChats(filtered);
    };

    loadChats();

    // Background Scheduler: Runs every 15 seconds to check & prune expired 24h messages
    const cleanupInterval = setInterval(() => {
      const { deletedCount } = runDisappearingMessagesCleanup();
      if (deletedCount > 0) {
        loadChats();
      }
    }, 15000);

    // Live Simulator Checker: Refreshes chats view state for typing/message updates
    const liveUpdateInterval = setInterval(() => {
      loadChats();
    }, 1500);

    return () => {
      clearInterval(cleanupInterval);
      clearInterval(liveUpdateInterval);
    };
  }, [currentUser]);

  const handleSplashComplete = (lang: Language) => {
    setLanguage(lang);
    localStorage.setItem('mihbaran_lang', lang);
    
    // Check if user session already exists
    const user = getCurrentUser();
    if (user) {
      setSessionUser(user);
    }
  };

  const handleAuthComplete = (user: User) => {
    setCurrentUser(user);
    setSessionUser(user);
    setActiveView('chat');
    setSelectedChatId(undefined);
  };

  const handleLogout = async () => {
    await logoutFirebase();
    setCurrentUser(null);
    setSessionUser(null);
    setSelectedChatId(undefined);
  };

  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  const handleLanguageChange = (lang: Language) => {
    setLanguage(lang);
    localStorage.setItem('mihbaran_lang', lang);
  };

  // Render Loading Splash
  if (loading) {
    return (
      <Splash 
        onComplete={handleSplashComplete} 
        currentTheme={theme} 
        toggleTheme={toggleTheme} 
      />
    );
  }

  // Render Auth Portal
  if (!currentUser) {
    return (
      <Auth 
        language={language} 
        onAuthComplete={handleAuthComplete} 
        currentTheme={theme} 
      />
    );
  }

  return (
    <div className={`min-h-screen flex items-center justify-center p-0 md:p-4 transition-colors duration-500 ${
      theme === 'dark' ? 'bg-zinc-950' : 'bg-zinc-100'
    }`} id="main_app_wrapper">
      
      {/* Central High-Fidelity Tablet/Desktop Mock Frame */}
      <div className={`w-full h-screen md:h-[650px] md:max-w-4xl md:rounded-3xl border shadow-2xl overflow-hidden flex transition-all duration-300 ${
        theme === 'dark' 
          ? 'bg-zinc-950 border-zinc-800 shadow-zinc-950/60' 
          : 'bg-white border-zinc-200 shadow-zinc-200/40'
      }`} id="app_frame">
        
        {/* SIDEBAR OR LIST SECTION (Hidden on mobile if chatroom is open) */}
        <div className={`w-full md:w-80 h-full shrink-0 ${
          selectedChatId ? 'hidden md:flex' : 'flex'
        }`} id="app_sidebar_container">
          <ChatList
            language={language}
            currentUser={currentUser}
            chats={chats}
            onSelectChat={(id) => {
              setSelectedChatId(id);
              setActiveView('chat');
            }}
            activeChatId={selectedChatId}
            onOpenSearchUsers={() => setActiveView('search')}
            onOpenSettings={() => setActiveView('settings')}
            onOpenAdminPanel={() => setActiveView('admin')}
            currentTheme={theme}
          />
        </div>

        {/* WORKSPACE AREA: Dynamic Sub-views rendering */}
        <div className={`flex-1 h-full ${
          !selectedChatId && (activeView === 'chat') ? 'hidden md:flex' : 'flex'
        }`} id="app_workspace_container">
          
          <AnimatePresence mode="wait">
            
            {/* 1. CHAT ROOM VIEW */}
            {activeView === 'chat' && (
              selectedChatId ? (
                <motion.div
                  key={`chatroom_${selectedChatId}`}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="w-full h-full"
                >
                  <ChatRoom
                    language={language}
                    currentUser={currentUser}
                    chatId={selectedChatId}
                    onBack={() => setSelectedChatId(undefined)}
                    currentTheme={theme}
                  />
                </motion.div>
              ) : (
                <div className={`w-full h-full flex flex-col items-center justify-center text-center p-8 ${
                  theme === 'dark' ? 'bg-zinc-900/10' : 'bg-zinc-50/50'
                }`} id="chat_placeholder_desktop">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 mb-4 animate-pulse">
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <h3 className="font-bold text-sm font-sans mb-1.5">
                    {language === 'ar' ? 'مرحبًا بك في محبران شات' : 'Welcome to Mihbaran Chat'}
                  </h3>
                  <p className="text-xs opacity-50 max-w-xs leading-relaxed font-sans">
                    {language === 'ar' 
                      ? 'حدد محادثة من القائمة الجانبية أو ابدأ محادثة جديدة للبدء بالمراسلة الآمنة والمؤقتة.' 
                      : 'Select a chat from the sidebar or search for a user to begin secure, temporary messaging.'}
                  </p>
                </div>
              )
            )}

            {/* 2. PROFILE VIEW */}
            {activeView === 'profile' && (
              <motion.div
                key="profile_view_animate"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="w-full h-full"
              >
                <Profile
                  language={language}
                  currentUser={currentUser}
                  onUpdateUser={(updated) => setSessionUser(updated)}
                  onBack={() => setActiveView('chat')}
                  currentTheme={theme}
                />
              </motion.div>
            )}

            {/* 3. SETTINGS VIEW */}
            {activeView === 'settings' && (
              <motion.div
                key="settings_view_animate"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="w-full h-full"
              >
                <Settings
                  language={language}
                  onChangeLanguage={handleLanguageChange}
                  currentUser={currentUser}
                  onUpdateUser={(updated) => setSessionUser(updated)}
                  onLogout={handleLogout}
                  onBack={() => {
                    setActiveView('chat');
                    // Sync loaded state
                    setSessionUser(getCurrentUser());
                  }}
                  currentTheme={theme}
                  toggleTheme={toggleTheme}
                />
              </motion.div>
            )}

            {/* 4. ADMIN TELEMETRY PANEL VIEW */}
            {activeView === 'admin' && (
              <motion.div
                key="admin_view_animate"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="w-full h-full"
              >
                <AdminPanel
                  language={language}
                  currentUser={currentUser}
                  onBack={() => setActiveView('chat')}
                  currentTheme={theme}
                />
              </motion.div>
            )}

            {/* 5. SEARCH GLOBAL USERS VIEW */}
            {activeView === 'search' && (
              <motion.div
                key="search_view_animate"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="w-full h-full"
              >
                <Search
                  language={language}
                  currentUser={currentUser}
                  onSelectChat={(id) => {
                    setSelectedChatId(id);
                    setActiveView('chat');
                  }}
                  onBack={() => setActiveView('chat')}
                  currentTheme={theme}
                />
              </motion.div>
            )}

          </AnimatePresence>

        </div>

      </div>
    </div>
  );
}
