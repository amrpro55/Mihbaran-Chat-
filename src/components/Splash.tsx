import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Feather, Shield, RefreshCw, Globe, Moon, Sun } from 'lucide-react';
import { Language, translations } from '../i18n';

interface SplashProps {
  onComplete: (lang: Language) => void;
  currentTheme: 'light' | 'dark';
  toggleTheme: () => void;
}

export default function Splash({ onComplete, currentTheme, toggleTheme }: SplashProps) {
  const [loadingText, setLoadingText] = useState('');
  const [progress, setProgress] = useState(0);
  const [showLanguagePicker, setShowLanguagePicker] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<Language | null>(null);

  const stepsAr = [
    'جاري تهيئة خادم التشفير الآمن...',
    'التحقق من حزم الأمان الفيدرالية...',
    'تحميل قائمة جهات الاتصال النشطة...',
    'تجهيز بيئة المراسلة المؤقتة الذكية...',
  ];

  const stepsEn = [
    'Initializing secure encryption server...',
    'Verifying security protocols...',
    'Loading active contact lists...',
    'Configuring secure temporary sandbox...',
  ];

  useEffect(() => {
    // Determine language-appropriate loading steps
    const lang = selectedLanguage || 'ar';
    const steps = lang === 'ar' ? stepsAr : stepsEn;
    
    let currentStep = 0;
    setLoadingText(steps[0]);

    const textInterval = setInterval(() => {
      currentStep++;
      if (currentStep < steps.length) {
        setLoadingText(steps[currentStep]);
      }
    }, 1200);

    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          clearInterval(textInterval);
          
          // Complete splash
          setTimeout(() => {
            if (!selectedLanguage) {
              setShowLanguagePicker(true);
            } else {
              onComplete(selectedLanguage);
            }
          }, 400);
          return 100;
        }
        return prev + 1;
      });
    }, 45);

    return () => {
      clearInterval(textInterval);
      clearInterval(progressInterval);
    };
  }, [selectedLanguage]);

  const handleLanguageSelect = (lang: Language) => {
    setSelectedLanguage(lang);
    onComplete(lang);
  };

  return (
    <div className={`min-h-screen flex flex-col items-center justify-between p-6 transition-colors duration-500 ${
      currentTheme === 'dark' ? 'bg-zinc-950 text-zinc-100' : 'bg-zinc-50 text-zinc-900'
    }`} id="splash_screen">
      
      {/* Top Header Controls */}
      <div className="w-full flex justify-between items-center max-w-md" id="splash_header">
        <div className="flex items-center gap-1.5 text-xs font-mono opacity-60">
          <Shield className="w-4 h-4 text-emerald-500" />
          <span>AES-256 SECURE</span>
        </div>
        
        <button
          onClick={toggleTheme}
          className={`p-2 rounded-full transition-all duration-300 hover:scale-105 cursor-pointer ${
            currentTheme === 'dark' ? 'bg-zinc-900 hover:bg-zinc-800 text-amber-400' : 'bg-white hover:bg-zinc-100 text-zinc-600 shadow-sm'
          }`}
          id="splash_theme_toggle"
          title="Toggle Theme"
        >
          {currentTheme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
      </div>

      {/* Center Branding Content */}
      <div className="flex flex-col items-center text-center max-w-sm my-auto" id="splash_body">
        <AnimatePresence mode="wait">
          {!showLanguagePicker ? (
            <motion.div
              key="logo_view"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="flex flex-col items-center"
              id="splash_branding"
            >
              {/* Outer Glowing Inkwell Icon Container */}
              <div className={`relative w-24 h-24 rounded-3xl flex items-center justify-center mb-6 shadow-2xl transition-all duration-500 ${
                currentTheme === 'dark' 
                  ? 'bg-gradient-to-tr from-emerald-950 to-zinc-800 border border-emerald-500/20 shadow-emerald-950/40' 
                  : 'bg-gradient-to-tr from-emerald-50 to-emerald-200 border border-emerald-100 shadow-emerald-100/60'
              }`} id="splash_logo_glow">
                <Feather className="w-12 h-12 text-emerald-500 transform -rotate-45" />
                <span className="absolute bottom-1 right-2 text-[10px] font-bold tracking-widest text-emerald-600/80 font-mono">MB</span>
              </div>

              {/* Title & Slogan */}
              <h1 className="text-3xl font-bold font-sans tracking-tight mb-2">
                {selectedLanguage === 'en' ? 'Mihbaran Chat' : 'محبران شات'}
              </h1>
              <p className="text-sm opacity-70 px-4 leading-relaxed font-sans">
                {selectedLanguage === 'en' 
                  ? translations.en.appSlogan 
                  : translations.ar.appSlogan}
              </p>

              {/* Loading progress indicator */}
              <div className="w-64 mt-12 flex flex-col items-center gap-3" id="splash_progress_container">
                <div className="flex items-center gap-2 text-xs font-mono opacity-60 text-emerald-500">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span className="animate-pulse">{loadingText}</span>
                </div>
                
                {/* Progress bar outer */}
                <div className="w-full h-1 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <motion.div 
                    className="h-full bg-emerald-500"
                    initial={{ width: '0%' }}
                    animate={{ width: `${progress}%` }}
                    transition={{ ease: 'easeOut' }}
                  />
                </div>
                
                <span className="text-[10px] font-mono opacity-50">{progress}% Connected</span>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="lang_view"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="flex flex-col items-center w-full"
              id="language_picker_container"
            >
              {/* Globe Icon */}
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 mb-6">
                <Globe className="w-8 h-8 animate-pulse" />
              </div>

              <h2 className="text-lg font-medium mb-1 font-sans text-center">
                {translations.ar.chooseLanguage}
              </h2>
              <p className="text-xs opacity-60 mb-8 text-center font-sans">
                اختر لغة واجهة المستخدم للمحبرة للمتابعة
              </p>

              {/* Language Selection Buttons */}
              <div className="flex flex-col gap-3 w-64" id="language_picker_buttons">
                <button
                  onClick={() => handleLanguageSelect('ar')}
                  className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-sans font-medium shadow-md hover:shadow-emerald-600/20 active:scale-[0.98] transition-all cursor-pointer flex items-center justify-between"
                  id="lang_ar_btn"
                >
                  <span>العربية (Arabic)</span>
                  <span className="text-xs opacity-70">←</span>
                </button>
                <button
                  onClick={() => handleLanguageSelect('en')}
                  className="w-full py-3 px-4 rounded-xl font-sans font-medium bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 active:scale-[0.98] transition-all cursor-pointer flex items-center justify-between"
                  id="lang_en_btn"
                >
                  <span>English (الإنجليزية)</span>
                  <span className="text-xs opacity-70">→</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer Branding */}
      <div className="text-center text-[10px] font-mono opacity-40 mt-6" id="splash_footer">
        © 2026 Mihbaran Inc. All rights reserved.
      </div>
    </div>
  );
}
