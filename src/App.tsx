/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { auth } from './firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { 
  Home, 
  Calendar, 
  BookOpen, 
  Zap, 
  Bus,
  Clock,
  LayoutDashboard,
  ArrowRight,
  Sun,
  Moon,
  Flame,
  Award,
  TrendingUp,
  Bell,
  Sparkles
} from 'lucide-react';

// Specialized Components
import Scheduler from './components/Scheduler';
import MicroQuiz from './components/MicroQuiz';
import ModuleRepository from './components/ModuleRepository';
import FocusMode from './components/FocusMode';
import Assistant from './components/Assistant';
import Settings from './components/Settings';
import SignIn from './components/SignIn';
import SignUp from './components/SignUp';
import VerificationScreen from './components/VerificationScreen';

const Dashboard = ({ onNavigate, streak, readiness, quote }: { onNavigate: (tab: string) => void, streak: number, readiness: number, quote: string }) => (
  <motion.div 
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -10 }}
    className="p-8 space-y-10 pb-36"
  >
    <header className="space-y-4 border-b border-border pb-8">
      <div className="flex justify-between items-start">
        <div className="space-y-1">
          <span className="status-pill leading-none py-1.5 h-auto">Coach Active</span>
          <h1 className="text-4xl leading-tight">Mabuhay, Student.</h1>
          <p className="text-text-secondary text-xs uppercase tracking-widest font-medium">BSIT | QCU Student-Worker</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-1.5 bg-accent/10 border border-accent/20 px-3 py-1 rounded-sm">
            <Flame size={14} className="text-accent fill-accent" />
            <span className="text-xs font-bold text-accent">{streak}d Streak</span>
          </div>
          <div className="text-right">
            <span className="text-[10px] uppercase tracking-widest text-text-secondary">Exam Readiness</span>
            <div className="text-3xl font-serif text-accent italic">{readiness}%</div>
          </div>
        </div>
      </div>
      <div className="bg-accent/5 border-l-2 border-accent p-3">
        <p className="text-xs text-text-primary italic font-serif leading-relaxed">
          "{quote}"
        </p>
      </div>
    </header>

    {/* Oracle Quick Search */}
    <div className="bg-surface border border-accent p-5 rounded-sm flex gap-4 items-center group cursor-pointer hover:bg-accent/5 transition-all" onClick={() => onNavigate('oracle')}>
      <div className="p-2 bg-accent text-bg rounded-sm group-hover:scale-110 transition-transform">
        <Sparkles size={18} />
      </div>
      <div className="flex-1">
        <p className="text-[11px] uppercase tracking-widest text-accent font-bold">Ask AI Assistant</p>
        <p className="text-xs text-text-secondary italic">Define a concept or search your modules...</p>
      </div>
      <ArrowRight size={14} className="text-accent opacity-40" />
    </div>

    {/* Golden Study Window Identification */}
    <motion.div 
      whileTap={{ scale: 0.99 }}
      onClick={() => onNavigate('learning')}
      className="bg-glass border border-accent/20 p-6 rounded-sm flex gap-6 items-start cursor-pointer hover:border-accent transition-all group animate-pulse"
    >
      <div className="p-3 border border-border group-hover:border-accent text-accent transition-colors">
        <Zap size={20} fill="currentColor" />
      </div>
      <div className="flex-1 space-y-2">
        <h3 className="text-accent text-xs uppercase tracking-[2px] font-bold">Begin 5-Min Sprint</h3>
        <p className="text-sm text-text-secondary leading-relaxed font-normal italic">
          High-energy gap identified. Maximize your readiness score before your shift.
        </p>
      </div>
    </motion.div>

    {/* Synchronized Tasks Section */}
    <section className="space-y-6">
      <div className="flex justify-between items-baseline">
        <h3 className="text-xs uppercase tracking-[3px] text-text-secondary font-bold">Synchronized Tasks</h3>
        <span className="text-[10px] text-accent font-serif italic">Maintain your Streak</span>
      </div>
      
      <div className="space-y-1">
        {[
          { time: '16:00', title: 'Service Crew Shift (QC)', tag: 'WORK' },
          { time: '21:15', title: 'Exam Prep: SQL Logic', tag: 'READY', featured: true },
          { time: '23:59', title: 'Calculus Submission', tag: 'TASK' },
        ].map((item, i) => (
          <motion.div 
            key={i} 
            whileHover={{ backgroundColor: 'rgba(255,255,255,0.02)' }}
            className={`flex items-center gap-6 p-4 bg-glass border-b border-border/50 group ${item.featured ? 'border-l-2 border-l-accent' : ''}`}
          >
            <div className={`text-xs font-mono transition-colors ${item.featured ? 'text-accent' : 'text-text-secondary'}`}>
              {item.time}
            </div>
            <div className="flex-1">
              <h4 className={`text-sm tracking-tight ${item.featured ? 'text-text-primary font-medium' : 'text-text-secondary'}`}>
                {item.title}
              </h4>
            </div>
            <span className={`type-tag ${item.featured ? 'border-accent text-accent' : ''}`}>
              {item.tag}
            </span>
          </motion.div>
        ))}
      </div>
    </section>

    {/* Smart Reminder Suggestion */}
    <div className="bg-surface border border-border p-5 rounded-sm flex gap-4 items-center shadow-lg">
      <div className="p-2 border border-border text-accent">
        <Bell size={18} />
      </div>
      <div className="flex-1">
        <p className="text-[11px] uppercase tracking-widest text-text-secondary font-bold">Smart Reminder</p>
        <p className="text-xs text-text-primary font-medium">Study Window detected at 14:00.</p>
      </div>
      <button className="text-[10px] uppercase tracking-widest font-bold text-accent bg-accent/10 px-3 py-1.5 rounded-sm active:scale-95">Set Alert</button>
    </div>
  </motion.div>
);

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [activeTab, setActiveTab] = useState('home');
  const [authView, setAuthView] = useState<'signin' | 'signup' | 'verification'>('signin');
  const [verificationEmail, setVerificationEmail] = useState('');
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [streak, setStreak] = useState(12);
  const [readiness, setReadiness] = useState(88);

  const getContextQuote = () => {
    const hour = new Date().getHours();
    if (hour > 17) return "You've worked hard today; now let's invest in your future. QCUian spirit!";
    if (activeTab === 'sprint') return "You've got this, QCUian! Your preparation meets this opportunity.";
    if (readiness < 80) return "One task at a time. Balance is progress. Your readiness is climbing!";
    return "The hustle today is the success of tomorrow, QCUian! Your balance is your strength.";
  };

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (authUser) => {
      if (authUser && !authUser.emailVerified) {
        // Unverified users are signed out immediately.
        // We handle the UI state (showing error or verification screen) in the components.
        auth.signOut();
        return;
      }
      setUser(authUser);
      if (authUser) setActiveTab('home');
    });

    return () => unsubscribe();
  }, []);

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  const onQuizComplete = (score: number) => {
    setReadiness(prev => Math.min(100, parseFloat((prev + (score * 1.5)).toFixed(1))));
    setStreak(prev => prev + 1);
  };

  const renderContent = () => {
    if (!user) {
      if (authView === 'verification') {
        return <VerificationScreen email={verificationEmail} onNavigateToSignIn={() => setAuthView('signin')} />;
      }
      return authView === 'signin' 
        ? <SignIn 
            onSuccess={() => setActiveTab('home')} 
            onNavigateToSignUp={() => setAuthView('signup')} 
          />
        : <SignUp 
            onVerificationSent={(email) => {
              setVerificationEmail(email);
              setAuthView('verification');
            }} 
            onNavigateToSignIn={() => setAuthView('signin')}
            onGoogleSuccess={() => setActiveTab('home')}
          />;
    }

    const handleExit = () => setActiveTab('home');

    switch(activeTab) {
      case 'home': return <Dashboard onNavigate={setActiveTab} streak={streak} readiness={readiness} quote={getContextQuote()} />;
      case 'schedule': return <Scheduler onExit={handleExit} />;
      case 'learning': return <MicroQuiz onComplete={onQuizComplete} onExit={handleExit} />;
      case 'library': return <ModuleRepository onExit={handleExit} />;
      case 'oracle': return <Assistant onExit={handleExit} />;
      case 'settings': return <Settings theme={theme} toggleTheme={toggleTheme} onExit={handleExit} />;
      default: return <Dashboard onNavigate={setActiveTab} streak={streak} readiness={readiness} quote={getContextQuote()} />;
    }
  };

  return (
    <div className="mobile-container overflow-hidden">
      <main className="flex-1 h-full overflow-hidden relative">
        <AnimatePresence mode="wait">
          {renderContent()}
        </AnimatePresence>
      </main>

      {user && (
        <nav className="glass-nav">
          <button onClick={() => setActiveTab('home')} className={`nav-item flex-1 ${activeTab === 'home' ? 'active' : ''}`}>
            <Home size={18} />
            <span>Hub</span>
          </button>
          <button onClick={() => setActiveTab('schedule')} className={`nav-item flex-1 ${activeTab === 'schedule' ? 'active' : ''}`}>
            <Calendar size={18} />
            <span>Schedule</span>
          </button>
          <button onClick={() => setActiveTab('learning')} className={`nav-item flex-1 ${activeTab === 'learning' ? 'active' : ''}`}>
            <Zap size={18} fill={activeTab === 'learning' ? 'currentColor' : 'none'} />
            <span>Sprint</span>
          </button>
          <button onClick={() => setActiveTab('library')} className={`nav-item flex-1 ${activeTab === 'library' ? 'active' : ''}`}>
            <BookOpen size={18} />
            <span>Library</span>
          </button>
          <button onClick={() => setActiveTab('settings')} className={`nav-item flex-1 ${activeTab === 'settings' ? 'active' : ''}`}>
            <LayoutDashboard size={18} />
            <span>Settings</span>
          </button>
        </nav>
      )}
    </div>
  );
}

