import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, Phone, Lock, User as UserIcon, Check, AlertTriangle, ArrowLeft, Image as ImageIcon, Camera, Feather } from 'lucide-react';
import { Language, translations } from '../i18n';
import { User } from '../types';
import { getUsers, saveUsers, checkUsernameAvailable, setCurrentUser, MOCK_AVATARS, incrementDbWrites } from '../db';
import {
  firebaseConfigured,
  loginWithEmail,
  registerWithEmail,
  requestPasswordReset,
} from '../firebase';

interface AuthProps {
  language: Language;
  onAuthComplete: (user: User) => void;
  currentTheme: 'light' | 'dark';
}

type AuthMethod = 'email' | 'phone';
type AuthStep = 'login' | 'register' | 'setup-profile' | 'otp-verify';

export default function Auth({ language, onAuthComplete, currentTheme }: AuthProps) {
  const t = translations[language];
  const [method, setMethod] = useState<AuthMethod>('email');
  const [step, setStep] = useState<AuthStep>('login');
  
  // Form input states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  
  // Registration setup states
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [bio, setBio] = useState('');
  const [avatar, setAvatar] = useState(MOCK_AVATARS[0]);
  
  // Error / helper states
  const [errorMessage, setErrorMessage] = useState('');
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  const [simulatedOtpSent, setSimulatedOtpSent] = useState(false);
  const [tempUserId, setTempUserId] = useState('');

  // Toast alert simulator
  const [toastMessage, setToastMessage] = useState('');

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  const firebaseErrorMessage = (error: unknown) => {
    const code = (error as { code?: string }).code || (error as Error)?.message || '';
    if (code.includes('invalid-credential')) return language === 'ar' ? 'البريد الإلكتروني أو كلمة المرور غير صحيحة.' : 'Incorrect email or password.';
    if (code.includes('email-already-in-use')) return language === 'ar' ? 'هذا البريد مسجل بالفعل.' : 'This email is already registered.';
    if (code.includes('weak-password')) return language === 'ar' ? 'كلمة المرور يجب أن تتكون من 6 أحرف على الأقل.' : 'Password must be at least 6 characters.';
    if (code.includes('too-many-requests')) return language === 'ar' ? 'محاولات كثيرة. حاول لاحقًا.' : 'Too many attempts. Try again later.';
    return language === 'ar' ? 'تعذر الاتصال بخدمة الحسابات. تحقق من إعداد Firebase.' : 'Could not connect to account service. Check Firebase setup.';
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setErrorMessage(language === 'ar' ? 'الرجاء إدخال البريد الإلكتروني أولاً' : 'Please enter your email first');
      return;
    }
    if (!firebaseConfigured) {
      triggerToast(t.resetSentSuccess);
      return;
    }
    try {
      await requestPasswordReset(email.trim());
      triggerToast(t.resetSentSuccess);
    } catch (error) {
      setErrorMessage(firebaseErrorMessage(error));
    }
  };

  const handleUsernameChange = (val: string) => {
    // Allow English & Arabic letters, numbers, and underscores
    const clean = val.replace(/[^\w\u0600-\u06FF]/g, '').toLowerCase();
    setUsername(clean);
    if (!clean) {
      setUsernameStatus('idle');
      return;
    }
    const isAvailable = checkUsernameAvailable(clean);
    setUsernameStatus(isAvailable ? 'available' : 'taken');
  };

  const handleQuickLogin = (usernameVal: string) => {
    setErrorMessage('');
    const users = getUsers();
    const existing = users.find(u => u.username?.toLowerCase() === usernameVal.toLowerCase());
    if (existing) {
      if (existing.isBlocked) {
        setErrorMessage(language === 'ar' ? 'عذرًا، هذا الحساب محظور بسبب مخالفات شروط الخدمة.' : 'Sorry, this account has been blocked for service violations.');
        return;
      }
      onAuthComplete(existing);
      triggerToast(language === 'ar' ? `تم تسجيل الدخول بنجاح كـ ${existing.name}! ✨` : `Logged in successfully as ${existing.name}! ✨`);
    } else {
      setErrorMessage(language === 'ar' ? 'عذرًا، لم يتم العثور على هذا الحساب التجريبي.' : 'Sorry, this demo account was not found.');
    }
  };

  const handleEmailLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    let loginInput = email.trim().toLowerCase();
    if (loginInput.startsWith('@')) {
      loginInput = loginInput.substring(1);
    }

    if (!loginInput || !password) {
      setErrorMessage(language === 'ar' ? 'الرجاء ملء جميع الحقول المطلوبة' : 'Please fill in all fields');
      return;
    }

    if (firebaseConfigured) {
      if (!loginInput.includes('@')) {
        setErrorMessage(language === 'ar' ? 'استخدم البريد الإلكتروني للدخول إلى الحساب السحابي.' : 'Use your email to sign in to the cloud account.');
        return;
      }
      try {
        const cloudUser = await loginWithEmail(loginInput, password);
        if (cloudUser.isBlocked) {
          setErrorMessage(language === 'ar' ? 'هذا الحساب محظور.' : 'This account is blocked.');
          return;
        }
        setCurrentUser(cloudUser);
        onAuthComplete(cloudUser);
      } catch (error) {
        setErrorMessage(firebaseErrorMessage(error));
      }
      return;
    }

    const users = getUsers();
    const existing = users.find(u => 
      u.email?.toLowerCase() === loginInput || 
      u.username?.toLowerCase() === loginInput
    );

    if (existing) {
      if (existing.isBlocked) {
        setErrorMessage(language === 'ar' ? 'عذرًا، هذا الحساب محظور بسبب مخالفات شروط الخدمة.' : 'Sorry, this account has been blocked for service violations.');
        return;
      }
      // Check password if configured on the account
      if (existing.password && existing.password !== password) {
        setErrorMessage(language === 'ar' ? 'كلمة المرور غير صحيحة!' : 'Incorrect password!');
        return;
      }
      onAuthComplete(existing);
    } else {
      // Prompt user to register!
      setStep('register');
      setErrorMessage(language === 'ar' ? 'الحساب غير مسجل، يمكنك إنشاء حساب الآن' : 'Account not registered. Create an account!');
    }
  };

  const handlePhoneSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!phone) {
      setErrorMessage(language === 'ar' ? 'الرجاء إدخال رقم هاتف صحيح' : 'Please enter a valid phone number');
      return;
    }

    setSimulatedOtpSent(true);
    triggerToast(language === 'ar' ? 'تم إرسال رمز OTP تجريبي: 1234' : 'Simulated OTP Code sent: 1234');
    setStep('otp-verify');
  };

  const handleOtpVerifySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (otp !== '1234') {
      setErrorMessage(language === 'ar' ? 'رمز OTP غير صحيح! جرب 1234' : 'Incorrect OTP! Try 1234');
      return;
    }

    const users = getUsers();
    const existing = users.find(u => u.phone === phone);

    if (existing) {
      if (existing.isBlocked) {
        setErrorMessage(language === 'ar' ? 'عذرًا، هذا الحساب محظور.' : 'This account is blocked.');
        return;
      }
      onAuthComplete(existing);
    } else {
      // Go to setup profile
      setStep('setup-profile');
    }
  };

  const handleRegistrationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!email || !password || !fullName) {
      setErrorMessage(language === 'ar' ? 'يرجى إكمال الحقول الأساسية' : 'Please complete basic fields');
      return;
    }

    const users = getUsers();
    const emailExists = users.some(u => u.email?.toLowerCase() === email.trim().toLowerCase());
    if (emailExists) {
      setErrorMessage(language === 'ar' ? 'هذا البريد الإلكتروني مسجل بالفعل! الرجاء تسجيل الدخول أو استخدام بريد آخر.' : 'This email is already registered! Please log in or use a different email.');
      return;
    }

    setStep('setup-profile');
  };

  const handleSetupProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const cleanUsername = username.trim().toLowerCase();
    if (!cleanUsername) {
      setErrorMessage(language === 'ar' ? 'الرجاء إدخال اسم مستخدم صحيحة' : 'Please enter a valid username');
      return;
    }

    const isAvailable = checkUsernameAvailable(cleanUsername);
    if (!isAvailable) {
      setErrorMessage(t.usernameTaken);
      setUsernameStatus('taken');
      return;
    }

    if (!fullName.trim()) {
      setErrorMessage(language === 'ar' ? 'الاسم الكامل مطلوب' : 'Full Name is required');
      return;
    }

    // Create user
    const profile: Omit<User, 'id' | 'password'> = {
      email: email || undefined,
      phone: phone || undefined,
      name: fullName,
      username: username,
      avatar: avatar,
      bio: bio || (language === 'ar' ? 'مستعمل محبران شات المتألق ✨' : 'Proud Mihbaran Chat user ✨'),
      joinDate: new Date().toISOString().split('T')[0],
      isAdmin: username.toLowerCase() === 'admin', // Quick shortcut for admin
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
    };

    if (firebaseConfigured && email) {
      try {
        const cloudUser = await registerWithEmail(email.trim(), password, profile);
        setCurrentUser(cloudUser);
        onAuthComplete(cloudUser);
      } catch (error) {
        setErrorMessage(firebaseErrorMessage(error));
      }
      return;
    }

    const newUser: User = {
      ...profile,
      id: `user_${Date.now()}`,
      password: password || '123456',
    };

    const users = getUsers();
    users.push(newUser);
    saveUsers(users);

    onAuthComplete(newUser);
  };

  return (
    <div className={`min-h-screen flex flex-col justify-center items-center px-4 py-12 transition-colors duration-500 ${
      currentTheme === 'dark' ? 'bg-zinc-950 text-zinc-100' : 'bg-zinc-50 text-zinc-900'
    }`} id="auth_screen" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      
      {/* Absolute Toast */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-6 bg-emerald-600 text-white py-3 px-6 rounded-xl shadow-xl flex items-center gap-2 text-sm z-50 font-sans"
            id="auth_toast"
          >
            <Check className="w-4 h-4" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className={`w-full max-w-md rounded-3xl p-8 border shadow-xl transition-all duration-300 ${
        currentTheme === 'dark' ? 'bg-zinc-900/60 border-zinc-800' : 'bg-white border-zinc-200'
      }`} id="auth_card">
        
        {/* Logo and Slogan */}
        <div className="flex flex-col items-center text-center mb-8" id="auth_header">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 mb-3 border border-emerald-500/20">
            <Feather className="w-7 h-7 transform -rotate-45" />
          </div>
          <h2 className="text-2xl font-bold font-sans tracking-tight">{t.appName}</h2>
          <p className="text-xs opacity-60 mt-1 font-sans">{t.appSlogan}</p>
        </div>

        {/* Global Error Alert */}
        {errorMessage && (
          <div className="mb-5 p-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-xl flex items-center gap-2.5 text-xs font-sans" id="auth_error">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <AnimatePresence mode="wait">
          
          {/* STEP 1: LOGIN VIEW */}
          {step === 'login' && (
            <motion.div
              key="login_step"
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -15 }}
              transition={{ duration: 0.2 }}
            >
              <div className="flex border-b border-zinc-200 dark:border-zinc-800 mb-6" id="auth_tabs">
                <button
                  onClick={() => { setMethod('email'); setErrorMessage(''); }}
                  className={`flex-1 pb-3 text-center text-sm font-medium font-sans border-b-2 transition-all cursor-pointer ${
                    method === 'email' ? 'border-emerald-500 text-emerald-500' : 'border-transparent opacity-60 hover:opacity-100'
                  }`}
                  id="tab_email"
                >
                  {t.loginWithEmail}
                </button>
                <button
                  onClick={() => { setMethod('phone'); setErrorMessage(''); }}
                  className={`flex-1 pb-3 text-center text-sm font-medium font-sans border-b-2 transition-all cursor-pointer ${
                    method === 'phone' ? 'border-emerald-500 text-emerald-500' : 'border-transparent opacity-60 hover:opacity-100'
                  }`}
                  id="tab_phone"
                >
                  {t.loginWithPhone}
                </button>
              </div>

              {method === 'email' ? (
                <form onSubmit={handleEmailLoginSubmit} className="space-y-4" id="email_login_form">
                  <div>
                    <label className="block text-xs font-medium mb-1.5 opacity-70 font-sans">
                      {language === 'ar' ? 'البريد الإلكتروني أو اسم المستخدم' : 'Email or Username'}
                    </label>
                    <div className="relative">
                      <Mail className="absolute top-3.5 left-3.5 w-4.5 h-4.5 opacity-40" />
                      <input
                        type="text"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder={language === 'ar' ? 'you@example.com أو admin' : 'you@example.com or admin'}
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between mb-1.5">
                      <label className="block text-xs font-medium opacity-70 font-sans">{t.passwordLabel}</label>
                      <button
                        type="button"
                        onClick={handleForgotPassword}
                        className="text-xs text-emerald-500 hover:underline cursor-pointer font-sans"
                      >
                        {t.forgotPassword}
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="absolute top-3.5 left-3.5 w-4.5 h-4.5 opacity-40" />
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                        required
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition-all shadow-md cursor-pointer mt-2"
                  >
                    {t.loginTitle}
                  </button>
                </form>
              ) : (
                <form onSubmit={handlePhoneSubmit} className="space-y-4" id="phone_login_form">
                  <div>
                    <label className="block text-xs font-medium mb-1.5 opacity-70 font-sans">{t.phoneLabel}</label>
                    <div className="relative">
                      <Phone className="absolute top-3.5 left-3.5 w-4.5 h-4.5 opacity-40" />
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+966 50 123 4567"
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500/50 text-left"
                        required
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition-all shadow-md cursor-pointer mt-2"
                  >
                    {t.sendOtp}
                  </button>
                </form>
              )}

              {/* Quick Demo Login Section */}
              <div className="mt-6 pt-5 border-t border-zinc-200 dark:border-zinc-800" id="quick_demo_section">
                <div className="text-center mb-3">
                  <span className="px-3 py-1 text-[10px] uppercase tracking-wider font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full font-sans">
                    {language === 'ar' ? 'الدخول السريع كحساب تجريبي' : 'Quick Demo Login'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleQuickLogin('admin')}
                    className="flex items-center gap-2.5 p-2 rounded-xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 hover:bg-emerald-500/10 hover:border-emerald-500/30 transition-all text-right cursor-pointer"
                  >
                    <img src={MOCK_AVATARS[5]} alt="Admin" className="w-8 h-8 rounded-lg object-cover" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold truncate leading-none mb-1">{language === 'ar' ? 'المشرف العام' : 'System Admin'}</p>
                      <p className="text-[10px] opacity-60 truncate leading-none">@admin</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickLogin('ahmad_h')}
                    className="flex items-center gap-2.5 p-2 rounded-xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 hover:bg-emerald-500/10 hover:border-emerald-500/30 transition-all text-right cursor-pointer"
                  >
                    <img src={MOCK_AVATARS[0]} alt="Ahmad" className="w-8 h-8 rounded-lg object-cover" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold truncate leading-none mb-1">{language === 'ar' ? 'أحمد الحربي' : 'Ahmad Al-Harbi'}</p>
                      <p className="text-[10px] opacity-60 truncate leading-none">@ahmad_h</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickLogin('nora_atb')}
                    className="flex items-center gap-2.5 p-2 rounded-xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 hover:bg-emerald-500/10 hover:border-emerald-500/30 transition-all text-right cursor-pointer"
                  >
                    <img src={MOCK_AVATARS[2]} alt="Nora" className="w-8 h-8 rounded-lg object-cover" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold truncate leading-none mb-1">{language === 'ar' ? 'نورا العتيبي' : 'Nora Al-Otaibi'}</p>
                      <p className="text-[10px] opacity-60 truncate leading-none">@nora_atb</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickLogin('dr_khalid')}
                    className="flex items-center gap-2.5 p-2 rounded-xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 hover:bg-emerald-500/10 hover:border-emerald-500/30 transition-all text-right cursor-pointer"
                  >
                    <img src={MOCK_AVATARS[3]} alt="Dr. Khalid" className="w-8 h-8 rounded-lg object-cover" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold truncate leading-none mb-1">{language === 'ar' ? 'د. خالد سليمان' : 'Dr. Khalid'}</p>
                      <p className="text-[10px] opacity-60 truncate leading-none">@dr_khalid</p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Redirect Footer */}
              <div className="mt-6 text-center text-xs opacity-70 font-sans">
                {t.noAccount}{' '}
                <button
                  type="button"
                  onClick={() => { setStep('register'); setErrorMessage(''); }}
                  className="text-emerald-500 hover:underline font-semibold cursor-pointer"
                >
                  {t.registerTitle}
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 2: REGISTER VIEW */}
          {step === 'register' && (
            <motion.div
              key="register_step"
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -15 }}
              transition={{ duration: 0.2 }}
            >
              <button
                onClick={() => { setStep('login'); setErrorMessage(''); }}
                className="inline-flex items-center gap-1.5 text-xs opacity-60 hover:opacity-100 cursor-pointer mb-5 font-sans"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>{t.loginTitle}</span>
              </button>

              <form onSubmit={handleRegistrationSubmit} className="space-y-4" id="email_register_form">
                <div>
                  <label className="block text-xs font-medium mb-1.5 opacity-70 font-sans">{t.fullNameLabel}</label>
                  <div className="relative">
                    <UserIcon className="absolute top-3.5 left-3.5 w-4.5 h-4.5 opacity-40" />
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder={language === 'ar' ? 'أدخل اسمك الحقيقي' : 'Enter your name'}
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1.5 opacity-70 font-sans">{t.emailLabel}</label>
                  <div className="relative">
                    <Mail className="absolute top-3.5 left-3.5 w-4.5 h-4.5 opacity-40" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1.5 opacity-70 font-sans">{t.passwordLabel}</label>
                  <div className="relative">
                    <Lock className="absolute top-3.5 left-3.5 w-4.5 h-4.5 opacity-40" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition-all shadow-md cursor-pointer mt-2"
                >
                  {language === 'ar' ? 'الخطوة التالية (ضبط الملف الشخصي)' : 'Next (Profile Setup)'}
                </button>
              </form>

              <div className="mt-6 text-center text-xs opacity-70 font-sans">
                {t.hasAccount}{' '}
                <button
                  type="button"
                  onClick={() => { setStep('login'); setErrorMessage(''); }}
                  className="text-emerald-500 hover:underline font-semibold cursor-pointer"
                >
                  {t.loginTitle}
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 3: OTP VERIFICATION STEP */}
          {step === 'otp-verify' && (
            <motion.div
              key="otp_step"
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -15 }}
              transition={{ duration: 0.2 }}
            >
              <button
                onClick={() => { setStep('login'); setErrorMessage(''); }}
                className="inline-flex items-center gap-1.5 text-xs opacity-60 hover:opacity-100 cursor-pointer mb-5 font-sans"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>{language === 'ar' ? 'الرجوع لرقم الهاتف' : 'Back to phone'}</span>
              </button>

              <form onSubmit={handleOtpVerifySubmit} className="space-y-4" id="otp_verify_form">
                <div>
                  <p className="text-xs opacity-75 mb-3 leading-relaxed font-sans">
                    {language === 'ar' 
                      ? `تم إرسال رمز التحقق التجريبي إلى رقمك ${phone}. أدخل الكود 1234 للمتابعة.`
                      : `A mock verification code has been sent to ${phone}. Enter 1234 to proceed.`}
                  </p>
                  <label className="block text-xs font-medium mb-1.5 opacity-70 font-sans">{t.otpLabel}</label>
                  <div className="relative">
                    <Lock className="absolute top-3.5 left-3.5 w-4.5 h-4.5 opacity-40" />
                    <input
                      type="text"
                      maxLength={4}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      placeholder="1234"
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500/50 text-center font-mono text-lg tracking-widest"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition-all shadow-md cursor-pointer mt-2"
                >
                  {t.verifyOtp}
                </button>
              </form>
            </motion.div>
          )}

          {/* STEP 4: PROFILE SETUP */}
          {step === 'setup-profile' && (
            <motion.div
              key="setup_profile_step"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2 }}
            >
              <h3 className="text-lg font-bold font-sans mb-1.5">{language === 'ar' ? 'إعداد ملفك الشخصي' : 'Set Up Your Profile'}</h3>
              <p className="text-xs opacity-60 mb-6 font-sans">
                {language === 'ar' ? 'اختر اسم مستخدم فريد وصورة شخصية لتبدأ المراسلة' : 'Choose a unique username and picture to start chatting'}
              </p>

              <form onSubmit={handleSetupProfileSubmit} className="space-y-4" id="profile_setup_form">
                
                {/* Avatar selection grid */}
                <div className="flex flex-col items-center mb-5" id="profile_setup_avatar_picker">
                  <div className="relative group">
                    <img 
                      src={avatar} 
                      alt="Selected Avatar" 
                      className="w-18 h-18 rounded-2xl object-cover ring-2 ring-emerald-500/30 shadow-md"
                    />
                    <div className="absolute inset-0 bg-black/40 rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                      <Camera className="w-5 h-5 text-white" />
                    </div>
                  </div>
                  <span className="text-[11px] font-sans opacity-60 mt-2 mb-3">{t.avatarLabel}</span>
                  
                  {/* Preset avatar list */}
                  <div className="flex gap-2.5 overflow-x-auto py-1 max-w-full" id="preset_avatars">
                    {MOCK_AVATARS.map((av, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => setAvatar(av)}
                        className={`w-9 h-9 rounded-xl overflow-hidden cursor-pointer ring-offset-2 transition-all shrink-0 ${
                          avatar === av ? 'ring-2 ring-emerald-500 scale-105' : 'opacity-70 hover:opacity-100 hover:scale-105'
                        }`}
                      >
                        <img src={av} alt={`Preset ${index}`} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Unique Username Input */}
                <div>
                  <div className="flex justify-between mb-1.5">
                    <label className="block text-xs font-medium opacity-70 font-sans">{t.usernameLabel}</label>
                    <AnimatePresence mode="wait">
                      {usernameStatus === 'checking' && (
                        <span className="text-[10px] text-emerald-500 font-mono animate-pulse">Checking...</span>
                      )}
                      {usernameStatus === 'available' && (
                        <span className="text-[10px] text-emerald-500 font-sans flex items-center gap-0.5">
                          <Check className="w-3 h-3" /> {t.usernameAvailable}
                        </span>
                      )}
                      {usernameStatus === 'taken' && (
                        <span className="text-[10px] text-rose-500 font-sans">{t.usernameTaken}</span>
                      )}
                    </AnimatePresence>
                  </div>
                  <div className="relative">
                    <span className="absolute top-3 left-3.5 text-sm font-semibold opacity-40">@</span>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => handleUsernameChange(e.target.value)}
                      placeholder="e.g. ahmad_warrior"
                      className={`w-full pl-8 pr-4 py-3 rounded-xl border bg-transparent text-sm focus:outline-none focus:ring-1 ${
                        usernameStatus === 'available' ? 'border-emerald-500/50 focus:ring-emerald-500/50' :
                        usernameStatus === 'taken' ? 'border-rose-500/50 focus:ring-rose-500/50' :
                        'border-zinc-200 dark:border-zinc-800 focus:ring-emerald-500/50'
                      }`}
                      required
                    />
                  </div>
                </div>

                {/* Confirm Full Name */}
                <div>
                  <label className="block text-xs font-medium mb-1.5 opacity-70 font-sans">{t.fullNameLabel}</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Ahmad Al-Harbi"
                    className="w-full px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                    required
                  />
                </div>

                {/* Bio text */}
                <div>
                  <label className="block text-xs font-medium mb-1.5 opacity-70 font-sans">{t.bioLabel}</label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder={language === 'ar' ? 'اكتب شيئًا عن نفسك...' : 'Write something about yourself...'}
                    rows={2.5}
                    className="w-full px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500/50 resize-none font-sans"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition-all shadow-md cursor-pointer mt-4"
                >
                  {t.createAccountBtn}
                </button>
              </form>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
