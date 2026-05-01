/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { auth, db } from './firebase';
import { onAuthStateChanged, User as FirebaseUser, signOut } from 'firebase/auth';
import { 
  collection, 
  onSnapshot, 
  doc, 
  query, 
  orderBy, 
  limit, 
  where, 
  updateDoc,
  getDocFromServer,
  deleteDoc,
  addDoc,
  serverTimestamp,
  setDoc,
  writeBatch,
  getDocs
} from 'firebase/firestore';
import { 
  Home, 
  Calendar, 
  BookOpen, 
  Zap, 
  LayoutDashboard,
  ArrowRight,
  Sun,
  Moon,
  Flame,
  Award,
  TrendingUp,
  Bell,
  Sparkles,
  X,
  LineChart as LineChartIcon,
  Bus,
  Check,
  User,
  Info,
  Clock,
  AlertCircle,
  Loader2
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  Cell
} from 'recharts';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { isFirebaseConfigured } from './firebase';
import { isGeminiConfigured } from './services/geminiService';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Specialized Components
import Scheduler from './components/Scheduler';
import MicroQuiz from './components/MicroQuiz';
import ModuleRepository from './components/ModuleRepository';
import Assistant from './components/Assistant';
import Settings from './components/Settings';
import SignIn from './components/SignIn';
import SignUp from './components/SignUp';
import IntroPage from './components/IntroPage';
import PremiumModal from './components/PremiumModal';
import AdminPortal from './components/AdminPortal';
import ProgressLog from './components/ProgressLog';
import { sendGmailEmail, formatBriefingEmail, getAccessToken, formatDiagnosticEmail } from './services/gmailService';

const ReadinessCalendar = ({ statsData }: { statsData: any[] }) => {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const getDayColor = (readiness: number | undefined) => {
    if (readiness === undefined) return '#1A1A1A'; // Gray
    if (readiness >= 90) return '#007DFE'; // Blue
    if (readiness >= 75) return '#7ED321'; // Green
    if (readiness >= 50) return '#FFB900'; // Yellow
    return '#FF5252'; // Red
  };

  const dayStats = useMemo(() => {
    const map: Record<string, any> = {};
    statsData.forEach(s => {
      map[s.date] = s;
    });
    return map;
  }, [statsData]);

  const days = Array.from({ length: daysInMonth }, (_, i) => {
    const day = i + 1;
    const dateStr = `${currentYear}-${(currentMonth + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    return {
      day,
      date: dateStr,
      stats: dayStats[dateStr]
    };
  });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
          <div key={`day-header-${i}`} className="text-[8px] font-bold text-center opacity-30">{d}</div>
        ))}
        {days.map((d) => (
          <motion.button
            key={`day-btn-${d.date}`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setSelectedDate(d.date)}
            style={{ backgroundColor: getDayColor(d.stats?.readiness) }}
            className={`aspect-square rounded-[2px] transition-all relative flex items-center justify-center ${selectedDate === d.date ? 'ring-2 ring-white shadow-lg overflow-visible z-10' : ''}`}
          >
            <span className="text-[8px] font-mono opacity-20">{d.day}</span>
          </motion.button>
        ))}
      </div>

      <AnimatePresence>
        {selectedDate && dayStats[selectedDate] && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-glass border border-border p-4 rounded-sm space-y-4 mt-2">
              <div className="flex justify-between items-center border-b border-border/50 pb-2">
                <span className="text-[9px] uppercase tracking-widest text-text-secondary font-bold font-mono">{selectedDate} Summary</span>
                <button onClick={() => setSelectedDate(null)} className="p-1 hover:text-accent transition-colors"><X size={12} /></button>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="text-2xl font-serif italic" style={{ color: getDayColor(dayStats[selectedDate].readiness) }}>
                  {dayStats[selectedDate].readiness}%
                </div>
                <div className="flex-1 text-[10px] text-text-secondary italic">
                  Exam readiness score for this date. Study focus determined by session scores.
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

interface DashboardProps {
  onNavigate: (tab: string) => void;
  streak: number;
  readiness: number;
  quote: string;
  statsData: any[];
  userData: any;
  allTasks: any[];
  onToggleTask: (id: string, completed: boolean) => void;
  recentModules?: any[];
  unfinishedQuizzes?: any[];
  quizAttempts?: any[];
  firestoreCache?: Record<string, any[]>;
}

const Dashboard = ({ 
  onNavigate, 
  streak, 
  readiness, 
  quote, 
  statsData, 
  userData, 
  allTasks, 
  onToggleTask,
  recentModules = [],
  unfinishedQuizzes = [],
  quizAttempts = [],
  firestoreCache = {}
}: DashboardProps) => {
  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(new Date().setDate(new Date().getDate() + 1)).toISOString().split('T')[0];

  const priorityTasks = allTasks.filter(t => 
    t.date === today && 
    (t.type === 'work' || t.type === 'class' || t.type === 'deadline' || t.type === 'study')
  ).sort((a, b) => a.time.localeCompare(b.time));

  const tomorrowTasks = allTasks.filter(t => 
    t.date === tomorrow && 
    (t.type === 'work' || t.type === 'class' || t.type === 'deadline' || t.type === 'study')
  ).sort((a, b) => a.time.localeCompare(b.time));

  const getReadinessColor = (val: number) => {
    if (val >= 90) return '#007DFE'; // Blue
    if (val >= 75) return '#7ED321'; // Green
    if (val >= 50) return '#FFB900'; // Yellow
    return '#FF5252'; // Red
  };

  const currentColor = getReadinessColor(readiness);

  const getCoachNote = (val: number) => {
    if (val >= 90) return "Mastery achieved! You're ready for the exam. Keep this streak alive to maintain your edge!";
    if (val >= 75) return "Great job! You're consistent. A little more focus on the details will get you to Excellent.";
    if (val >= 50) return "Steady progress! You have the basics down, but some core concepts are still tricky. Focus on definitions next time to reach Green.";
    return "Don't be discouraged! You're struggling with recent topics. Try re-reading your QCU modules before your next sprint.";
  };

  const pendingReviews = useMemo(() => {
    return recentModules.filter(m => {
      const quizExists = (quizAttempts || []).some(s => s.moduleId === m.id || s.title === m.title);
      return !quizExists;
    });
  }, [recentModules, quizAttempts]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="p-4 sm:p-8 space-y-8 sm:space-y-10 pb-36 max-w-lg mx-auto"
    >
      <header className="space-y-4 border-b border-border pb-8">
        <div className="flex justify-between items-start">
          <div className="flex gap-4 items-center">
            <div className="w-12 h-12 rounded-full border border-accent overflow-hidden bg-surface shrink-0 relative">
              {userData?.photoURL ? (
                <img src={userData.photoURL} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-text-secondary opacity-30">
                  <User size={24} />
                </div>
              )}
            </div>
            <div className="space-y-1 text-left">
              <span className="status-pill leading-none py-1.5 h-auto">Coach Active</span>
              <h1 className="text-2xl sm:text-3xl leading-tight">Mabuhay, {userData?.displayName?.split(' ')[0] || 'Student'}.</h1>
              <p className="text-text-secondary text-[10px] uppercase tracking-widest font-medium">
                {userData?.major || 'COE'} | {userData?.status || 'QCU Working Student'}
              </p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            <div className="flex items-center gap-1.5 bg-accent/10 border border-accent/20 px-2 sm:px-3 py-1 rounded-sm">
              <Flame size={12} className="text-accent fill-accent" />
              <span className="text-[10px] sm:text-xs font-bold text-accent">{streak}d Streak</span>
            </div>
            <div className="text-right">
              <span className="text-[9px] uppercase tracking-widest text-text-secondary">Exam Readiness</span>
              <div className="text-2xl sm:text-3xl font-serif italic" style={{ color: currentColor }}>{readiness}%</div>
            </div>
          </div>
        </div>
        <div className="bg-accent/5 border-l-2 border-accent p-3">
          <p className="text-[11px] sm:text-xs text-text-primary italic font-serif leading-relaxed">
            "{quote}"
          </p>
        </div>
      </header>

      {/* UNFINISHED SPRINT Alert - HIGH PRIORITY PERSISTENT */}
      {unfinishedQuizzes.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-accent border border-accent p-4 rounded-sm mb-8 flex items-center justify-between shadow-2xl shadow-accent/20"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-bg text-accent rounded-sm shrink-0">
              <Zap size={18} fill="currentColor" className="animate-pulse" />
            </div>
            <div className="text-bg">
              <p className="text-[10px] uppercase font-bold tracking-widest">Active Sprint Detected</p>
              <p className="text-[11px] font-medium leading-tight">
                Mabuhay! You are at {unfinishedQuizzes[0].currentIndex + 1}/{unfinishedQuizzes[0].quizPool?.length}. Don't leave it unfinished—finish your quiz now to update your readiness score!
              </p>
            </div>
          </div>
          <button 
            onClick={() => onNavigate('learning')}
            className="px-4 py-2 bg-bg text-accent text-[9px] uppercase font-bold rounded-sm border border-bg hover:bg-transparent hover:text-bg transition-colors"
          >
            Resume
          </button>
        </motion.div>
      )}

      {/* Monthly Readiness Calendar HEAT MAP */}
      <div className="space-y-4">
        <div className="flex justify-between items-center px-1">
          <h3 className="text-[10px] uppercase tracking-[3px] text-text-secondary font-bold flex items-center gap-2">
            <TrendingUp size={14} style={{ color: currentColor }} /> Readiness Heat Map
          </h3>
          <span className="text-[9px] font-mono opacity-40 uppercase">30-Day Cycle</span>
        </div>
        <div className="bg-surface border border-border p-5 rounded-sm shadow-xl shadow-accent/5">
          <ReadinessCalendar statsData={statsData} />
          
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-6 pt-6 border-t border-border/50">
             {[
               { label: 'Excl', range: '90-100%', color: '#007DFE' },
               { label: 'Good', range: '75-89%', color: '#7ED321' },
               { label: 'Avg', range: '50-74%', color: '#FFB900' },
               { label: 'Focus', range: '<50%', color: '#FF5252' },
               { label: 'Null', range: 'N/A', color: '#1A1A1A' }
             ].map(item => (
               <div key={`legend-item-${item.label}`} className="flex flex-col gap-1 p-2 bg-glass rounded-sm border border-border/10">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-[8px] uppercase text-text-primary font-bold">{item.label}</span>
                  </div>
                  <span className="text-[7px] text-text-secondary font-mono tracking-tight">{item.range}</span>
               </div>
             ))}
          </div>
          
          <div className="mt-4 p-3 bg-accent/5 border border-dashed border-accent/20 rounded-sm">
            <h4 className="text-[8px] uppercase tracking-widest font-bold text-accent mb-1 flex items-center gap-2">
              <Info size={10} /> Performance Basis Legend
            </h4>
            <p className="text-[7px] text-text-secondary leading-normal italic">
              Scores are calculated based on your daily Micro-Quiz performance and engagement consistency. Aim for Excellence to minimize prep time during rigid work shifts.
            </p>
          </div>

          <div className="mt-6 pt-6 border-t border-border/50">
            <div className="flex gap-4 items-start bg-glass p-4 rounded-sm border border-border/30">
              <div className="p-2 bg-bg border border-border rounded-sm shrink-0" style={{ color: currentColor }}>
                <Sparkles size={16} />
              </div>
              <div className="space-y-1">
                <p className="text-[9px] uppercase tracking-widest text-text-secondary font-bold">Coach Note</p>
                <p className="text-[11px] text-text-primary leading-relaxed italic font-serif">
                  "{getCoachNote(readiness)}"
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Dashboard Alert - OLD LOCATION REMOVED */}
      
      {/* PENDING REVIEWS Dashboard Section */}
      <section className="space-y-6">
        <div className="flex justify-between items-center px-1">
          <h3 className="text-[10px] uppercase tracking-[3px] text-text-secondary font-bold">Pending Reviews</h3>
          <span className="text-[9px] font-mono text-accent animate-pulse">{pendingReviews.length} Tasks</span>
        </div>

        <div className="grid grid-cols-1 gap-3">
          {['Major Course', 'Minor Course'].map(cat => (
            <div key={`pending-section-${cat}`} className="space-y-3">
              <h4 className="text-[8px] uppercase tracking-widest text-text-secondary font-bold border-l-2 border-accent pl-2">{cat}s</h4>
              {pendingReviews.filter(m => m.category === cat).length > 0 ? (
                pendingReviews.filter(m => m.category === cat).map((mod, i) => {
                  const draft = unfinishedQuizzes.find(d => d.moduleId === mod.id || d.title === mod.title);
                  return (
                    <motion.button 
                      key={`review-item-${cat}-${mod.id || i}`}
                      initial={{ opacity: 0, x: -5 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      onClick={() => onNavigate('learning')}
                      className={cn(
                        "w-full flex items-center gap-4 p-4 bg-glass border border-border/20 rounded-sm text-left hover:border-accent group",
                        draft && "border-accent/40 bg-accent/5"
                      )}
                    >
                      <div className={cn(
                        "p-2 border border-border group-hover:border-accent/40 rounded-sm text-text-secondary group-hover:text-accent transition-colors",
                        draft && "border-accent text-accent"
                      )}>
                        <BookOpen size={14} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-[11px] font-bold truncate">{mod.title}</h4>
                          {draft && (
                            <span className="text-[7px] uppercase font-bold px-1.5 py-0.5 bg-accent text-bg rounded-sm animate-pulse">
                              In Progress ({draft.currentIndex + 1}/{draft.quizPool?.length})
                            </span>
                          )}
                        </div>
                        <p className="text-[8px] uppercase tracking-widest text-text-secondary opacity-60">
                          {firestoreCache?.[mod.id] ? `${firestoreCache[mod.id].length} Items Pending Verification` : 'Verification Required'}
                        </p>
                      </div>
                      <Zap size={12} className="text-accent opacity-0 group-hover:opacity-100 transition-opacity" />
                    </motion.button>
                  );
                })
              ) : (
                <div className="py-6 text-center border border-dashed border-border/30 rounded-sm opacity-20">
                  <p className="text-[8px] uppercase tracking-widest">No pending {cat.toLowerCase()} reviews.</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Today's Priority Section */}
      <section className="space-y-6">
        <div className="flex justify-between items-baseline px-1">
          <h3 className="text-[10px] uppercase tracking-[3px] text-text-secondary font-bold">Today's Priority</h3>
          <span className="text-[9px] text-accent font-serif italic">Digital Ledger</span>
        </div>
        
        <div className="space-y-2">
          {priorityTasks.length > 0 ? (
            priorityTasks.map((item) => (
              <motion.div 
                key={item.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className={cn(
                  "flex items-center gap-4 p-4 bg-glass border border-border/30 rounded-sm transition-all",
                  item.completed && "opacity-50 grayscale"
                )}
              >
                <button 
                  onClick={() => onToggleTask(item.id, !item.completed)}
                  className={cn(
                    "w-6 h-6 rounded-sm border flex items-center justify-center transition-all",
                    item.completed ? "bg-accent border-accent text-bg" : "border-border text-transparent hover:border-accent"
                  )}
                >
                  <Award size={14} className={item.completed ? "opacity-100" : "opacity-0"} />
                </button>
                <div className="flex-1 min-w-0">
                   <p className="text-[10px] font-mono text-text-secondary leading-none mb-1">{item.time}</p>
                   <h4 className={cn(
                     "text-sm font-bold tracking-tight truncate",
                     item.completed && "line-through text-text-secondary"
                   )}>
                     {item.title}
                   </h4>
                </div>
                <span className={cn(
                  "text-[8px] uppercase tracking-widest px-2 py-1 border rounded-full font-bold",
                  item.completed ? "border-text-secondary text-text-secondary" : "border-accent text-accent"
                )}>
                  {item.type}
                </span>
              </motion.div>
            ))
          ) : (
            <div className="p-10 border-2 border-dashed border-border rounded-sm text-center">
               <p className="text-[10px] uppercase tracking-widest text-text-secondary opacity-40">No priority tasks synced for today.</p>
            </div>
          )}
        </div>
      </section>

      {/* Upcoming Tomorrow Section */}
      <section className="space-y-6">
        <div className="flex justify-between items-baseline px-1">
          <h3 className="text-[10px] uppercase tracking-[3px] text-text-secondary font-bold opacity-60">Upcoming Tomorrow</h3>
          <ArrowRight size={14} className="text-text-secondary opacity-30" />
        </div>
        
        <div className="space-y-2">
          {tomorrowTasks.length > 0 ? (
            tomorrowTasks.map((item) => (
              <div 
                key={item.id}
                className={cn(
                  "flex items-center gap-4 p-4 border border-border/30 bg-accent/5 rounded-sm transition-all",
                  item.completed && "opacity-50 grayscale"
                )}
              >
                <button 
                  onClick={() => onToggleTask(item.id, !item.completed)}
                  className={cn(
                    "w-6 h-6 rounded-sm border flex items-center justify-center transition-all shrink-0",
                    item.completed ? "bg-accent border-accent text-bg" : "border-border text-transparent hover:border-accent"
                  )}
                >
                  <Check size={14} className={item.completed ? "opacity-100" : "opacity-0"} />
                </button>
                <div className="flex-1 min-w-0">
                  <h4 className={cn(
                    "text-[11px] font-bold uppercase tracking-tight truncate",
                    item.completed && "line-through text-text-secondary"
                  )}>{item.title}</h4>
                  <p className="text-[8px] uppercase tracking-widest text-text-secondary font-bold mt-0.5 opacity-60">
                    {item.time} — Tomorrow
                  </p>
                </div>
              </div>
            ))
          ) : (
            <div className="py-6 text-center border border-dashed border-border rounded-sm opacity-20">
               <p className="text-[8px] uppercase tracking-widest font-bold">Aequus logic: clear schedule for tomorrow.</p>
            </div>
          )}
        </div>
      </section>

      {/* Oracle Quick Search */}
      <div className="bg-surface border border-accent p-5 rounded-sm flex gap-4 items-center group cursor-pointer hover:bg-accent/5 transition-all" onClick={() => onNavigate('oracle')}>
        <div className="p-2 bg-accent text-bg rounded-sm group-hover:scale-110 transition-transform">
          <Sparkles size={18} />
        </div>
        <div className="flex-1">
          <p className="text-[10px] sm:text-[11px] uppercase tracking-widest text-accent font-bold">Ask AI Assistant</p>
          <p className="text-xs text-text-secondary italic">Concepts, definitions, or module search...</p>
        </div>
        <ArrowRight size={14} className="text-accent opacity-40 shrink-0" />
      </div>

      {/* Golden Study Window Identification */}
      <motion.div 
        whileTap={{ scale: 0.99 }}
        onClick={() => onNavigate('learning')}
        className="bg-glass border border-accent/20 p-5 sm:p-6 rounded-sm flex gap-4 sm:gap-6 items-start cursor-pointer hover:border-accent transition-all group"
      >
        <div className="p-2 sm:p-3 border border-border group-hover:border-accent text-accent transition-colors shrink-0">
          <Zap className="w-[18px] h-[18px] sm:w-5 sm:h-5" fill="currentColor" />
        </div>
        <div className="flex-1 space-y-2 text-left">
          <h3 className="text-accent text-[10px] sm:text-xs uppercase tracking-[2px] font-bold">Begin 5-Min Sprint</h3>
          <p className="text-xs sm:text-sm text-text-secondary leading-relaxed font-normal italic">
            Maximize your gap. Every second counts toward your Aequus score.
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Added Config Check
  if (!isFirebaseConfigured || !isGeminiConfigured) {
    return (
      <div className="min-h-screen bg-bg flex flex-col items-center justify-center p-6 text-center space-y-4">
        <Sparkles size={40} className="text-accent animate-pulse" />
        <div className="space-y-1">
          <h1 className="text-2xl font-serif italic text-text-primary">Mabuhay!</h1>
          <p className="text-text-secondary text-sm">System is initializing. Please ensure all API keys are properly configured in Settings.</p>
        </div>
        <div className="pt-4 flex gap-2">
           <div className={cn("px-2 py-1 text-[8px] uppercase tracking-tighter border rounded-full font-bold", isFirebaseConfigured ? "border-green-500/30 text-green-500" : "border-red-500/30 text-red-500")}>
             Firebase: {isFirebaseConfigured ? "Ready" : "Missing"}
           </div>
           <div className={cn("px-2 py-1 text-[8px] uppercase tracking-tighter border rounded-full font-bold", isGeminiConfigured ? "border-green-500/30 text-green-500" : "border-red-500/30 text-red-500")}>
             Gemini: {isGeminiConfigured ? "Ready" : "Missing"}
           </div>
        </div>
      </div>
    );
  }
  const [activeTab, setActiveTab] = useState('home'); // home, schedule, learning, progress, assistant, settings
  const [authView, setAuthView] = useState<'intro' | 'signin' | 'signup' | 'verification'>('intro');
  const [verificationEmail, setVerificationEmail] = useState('');
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [streak, setStreak] = useState(0);
  const [readiness, setReadiness] = useState(0);
  const [activeReminders, setActiveReminders] = useState<any[]>([]);
  const [unfinishedQuizzes, setUnfinishedQuizzes] = useState<any[]>([]);
  const [allTasks, setAllTasks] = useState<any[]>([]);
  const [userData, setUserData] = useState<any>(null);
  const [usageData, setUsageData] = useState<any>(null);
  const [statsData, setStatsData] = useState<any[]>([]);
  const [quizAttempts, setQuizAttempts] = useState<any[]>([]);
  const [firestoreCache, setFirestoreCache] = useState<Record<string, any[]>>({});
  const [recentModules, setRecentModules] = useState<any[]>([]);
  const [userRole, setUserRole] = useState<'student' | 'admin' | null>(null);
  const [notification, setNotification] = useState<{ message: string; sub: string } | null>(null);
  const [premiumModal, setPremiumModal] = useState<{ isOpen: boolean, reason?: string }>({ isOpen: false });
  const [isGmailConnected, setIsGmailConnected] = useState(localStorage.getItem('opusequ_gmail_connected') === 'true');
  const briefingSent = useRef(false);

  useEffect(() => {
    if (!user) return;
    
    const purgeMinorCourses = async () => {
    const purged = localStorage.getItem('opusequ_minor_course_purge_v5');
    if (purged === 'true') return;

      try {
        const batch = writeBatch(db);
        const userRef = doc(db, 'users', user.uid);
        
        // 1. Modules
        const modulesQ = query(collection(db, 'users', user.uid, 'modules'), where('category', '==', 'Minor Course'));
        const modulesSnap = await getDocs(modulesQ);
        const minorModuleIds = modulesSnap.docs.map(d => d.id);
        const minorModuleTitles = modulesSnap.docs.map(d => d.data().title);

        if (minorModuleIds.length > 0) {
          modulesSnap.docs.forEach(d => batch.delete(d.ref));
          
          // 2. Storage
          const storageQ = query(collection(db, 'users', user.uid, 'storage'), where('category', '==', 'Minor Course'));
          const storageSnap = await getDocs(storageQ);
          storageSnap.docs.forEach(d => batch.delete(d.ref));

          // 3. Quizzes/Drafts
          for (const id of minorModuleIds) {
            if (id) batch.delete(doc(db, 'users', user.uid, 'cached_quizzes', id));
          }
          for (const title of minorModuleTitles) {
            if (title) batch.delete(doc(db, 'users', user.uid, 'quiz_drafts', title));
          }

          // 4. Attempts
          const attemptsQ = query(collection(db, 'users', user.uid, 'quiz_attempts'));
          const attemptsSnap = await getDocs(attemptsQ);
          attemptsSnap.docs.forEach(d => {
            const data = d.data();
            if (minorModuleIds.includes(data.moduleId) || minorModuleTitles.includes(data.title)) {
              batch.delete(d.ref);
            }
          });

          await batch.commit();
          console.log("Cleanup: Minor Courses Purged Successfully.");
        }
        localStorage.setItem('opusequ_minor_course_purge_v5', 'true');
      } catch (err) {
        console.error("Cleanup Error:", err);
      }
    };

    purgeMinorCourses();
  }, [user]);

  const unsubUserRef = useRef<(() => void) | null>(null);
  const unsubUsageRef = useRef<(() => void) | null>(null);
  const unsubRoleRef = useRef<(() => void) | null>(null);
  const unsubStatsRef = useRef<(() => void) | null>(null);
  const unsubSchedulesRef = useRef<(() => void) | null>(null);
  const unsubModulesRef = useRef<(() => void) | null>(null);
  const unsubDraftsRef = useRef<(() => void) | null>(null);
  const unsubAttemptsRef = useRef<(() => void) | null>(null);
  const unsubCacheRef = useRef<(() => void) | null>(null);
  const lastNotificationCounts = useRef<{ tomorrow: number, pending: number, drafts: number, localDrafts: number }>({ tomorrow: -1, pending: -1, drafts: -1, localDrafts: -1 });

  const connectGmail = async () => {
    try {
      await getAccessToken();
      setIsGmailConnected(true);
      localStorage.setItem('opusequ_gmail_connected', 'true');
      setNotification({
        message: "Mabuhay! Gmail Connected",
        sub: "You will now receive high-priority alerts and daily briefings in your inbox."
      });
    } catch (error: any) {
      console.error("Gmail Connection Error:", error);
      setNotification({
        message: "Connection Failed",
        sub: error.message || "Could not authorize Gmail integration."
      });
    }
  };

  const triggerDailyBriefing = async () => {
    if (!user || !isGmailConnected) return;
    
    // Check if briefing was already sent today
    const today = new Date().toISOString().split('T')[0];
    if (userData?.lastBriefingDate === today || briefingSent.current) return;
    
    try {
      const tomorrow = new Date(new Date().setDate(new Date().getDate() + 1)).toISOString().split('T')[0];
      const tomorrowEvents = allTasks.filter((t: any) => t.date === tomorrow);
      const validModules = recentModules.filter(m => m.id && m.title && m.createdAt);
      const pendingReviews = validModules.filter(m => 
        !quizAttempts.some(s => s.moduleId === m.id || s.title === m.title)
      );
      const draftCount = unfinishedQuizzes.length;

      // Only send if there is data
      if (tomorrowEvents.length > 0 || pendingReviews.length > 0 || draftCount > 0) {
        const { subject, body } = formatBriefingEmail(
          user.email || '',
          userData?.major || 'QCU Student',
          tomorrowEvents,
          pendingReviews,
          draftCount,
          unfinishedQuizzes
        );
        
        await sendGmailEmail({ to: user.email || '', subject, body });
        briefingSent.current = true;
        
        // Persist briefing date
        await updateDoc(doc(db, 'users', user.uid), {
          lastBriefingDate: today
        });

        setNotification({
          message: "Daily Briefing Sent",
          sub: "[Opusequ Alert] Your production goal summary is in your inbox."
        });
      }
    } catch (e) {
      console.error("Daily Briefing Error:", e);
    }
  };

  // CONSOLIDATED NOTIFICATION ENGINE
  useEffect(() => {
    if (!user) return;
    
    const now = new Date();
    const tomorrow = new Date(new Date().setDate(now.getDate() + 1)).toISOString().split('T')[0];
    
    // Calculate Tomorrow Events
    const tomorrowEvents = allTasks.filter((t: any) => t.date === tomorrow);
    
    // Verify Integrity: Filter out invalid/partially deleted modules (Ghost Data Check)
    const validModules = recentModules.filter(m => m.id && m.title && m.createdAt);
    
    // Calculate Pending Reviews (Modules without quiz attempts)
    const pendingReviewsCount = validModules.filter(m => 
      !quizAttempts.some(s => s.moduleId === m.id || s.title === m.title)
    ).length;

    // Calculate Unfinished Sprints
    const draftCount = unfinishedQuizzes.length;

    // Check for Local Study Note Drafts
    const hasLocalDraft = localStorage.getItem('opusequ_note_draft') ? 1 : 0;

    // Only trigger notification if data has actually arrived/changed
    const isFirstRun = lastNotificationCounts.current.tomorrow === -1;
    const countsChanged = 
      tomorrowEvents.length !== lastNotificationCounts.current.tomorrow ||
      pendingReviewsCount !== lastNotificationCounts.current.pending ||
      draftCount !== lastNotificationCounts.current.drafts ||
      hasLocalDraft !== lastNotificationCounts.current.localDrafts;

    if (countsChanged) {
      lastNotificationCounts.current = {
        tomorrow: tomorrowEvents.length,
        pending: pendingReviewsCount,
        drafts: draftCount,
        localDrafts: hasLocalDraft
      };

      // Don't spam immediately if everything is zero on mount
      if (isFirstRun && tomorrowEvents.length === 0 && pendingReviewsCount === 0 && draftCount === 0 && hasLocalDraft === 0) return;

      const parts = [];
      if (tomorrowEvents.length > 0) parts.push(`${tomorrowEvents.length} events tomorrow`);
      if (pendingReviewsCount > 0) parts.push(`${pendingReviewsCount} pending reviews to clear`);
      if (draftCount > 0) parts.push(`${draftCount} unfinished quiz to complete`);
      if (hasLocalDraft > 0) parts.push(`${hasLocalDraft} unsaved study note draft`);

      if (parts.length > 0) {
        // Format sentence: "Mabuhay! You have X, Y, and Z."
        let subText = parts.join(', ');
        const lastCommaIndex = subText.lastIndexOf(', ');
        if (lastCommaIndex !== -1 && parts.length > 1) {
          subText = subText.substring(0, lastCommaIndex) + ' and ' + subText.substring(lastCommaIndex + 2);
        }

        setNotification({
          message: "Mabuhay! Opusequ Status Update",
          sub: `You have ${subText}.`
        });

        // Trigger email for high-priority status updates if connected
        if (isGmailConnected && user) {
          const { subject, body } = formatBriefingEmail(
            user.email || '',
            userData?.major || 'QCU Student',
            tomorrowEvents,
            validModules.filter(m => !quizAttempts.some(s => s.moduleId === m.id || s.title === m.title)),
            draftCount,
            unfinishedQuizzes
          );
          sendGmailEmail({ to: user.email || '', subject, body }).catch(e => console.error("Email sync deferred:", e));
        }
      }
    }
  }, [allTasks, recentModules, quizAttempts, unfinishedQuizzes, user, isGmailConnected, userData]);

  useEffect(() => {
    if (user && isGmailConnected && !briefingSent.current && allTasks.length > 0) {
      const timer = setTimeout(() => {
        triggerDailyBriefing();
      }, 5000); // 5s delay for stability
      return () => clearTimeout(timer);
    }
  }, [user, isGmailConnected, allTasks, recentModules]);

  useEffect(() => {
    if (!user) return;
    
    // Success Toast on initial sync completion
    let initialSyncCount = 0;
    const totalExpectedSyncs = 6; // user, usage, role, stats, schedules, modules
    const checkSyncComplete = () => {
      initialSyncCount++;
      if (initialSyncCount === totalExpectedSyncs) {
        setNotification({
          message: "Mabuhay! System Synchronized",
          sub: "All academic and shift data is currently up to date."
        });
      }
    };

    unsubUserRef.current = onSnapshot(doc(db, 'users', user.uid), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setUserData(data);
        setStreak(data.streak || 0);
        setReadiness(data.readiness || 0);
      }
      checkSyncComplete();
    }, (error) => {
      console.error("User Profile Sync Failure", error);
    });

    const todayStr = new Date().toLocaleDateString('en-CA');
    unsubUsageRef.current = onSnapshot(doc(db, 'users', user.uid, 'daily_usage', todayStr), (snap) => {
      if (snap.exists()) {
        setUsageData(snap.data());
      } else {
        setUsageData({ quizzes: 0, uploads: 0, ai: 0, notes: 0 });
      }
      checkSyncComplete();
    }, (error) => {
      console.error("Usage Sync Failure", error);
    });

    unsubRoleRef.current = onSnapshot(doc(db, 'roles', user.uid), (snap) => {
      if (snap.exists()) {
        setUserRole(snap.data().role);
      } else {
        setUserRole('student');
      }
      checkSyncComplete();
    }, (error) => {
      console.error("Role Sync Failure", error);
    });

    const qStats = query(collection(db, 'users', user.uid, 'stats'), orderBy('date', 'asc'), limit(30));
    unsubStatsRef.current = onSnapshot(qStats, (snapshot) => {
      setStatsData(snapshot.docs.map(doc => ({ 
        id: doc.id,
        ...doc.data(),
        dateShort: (doc.data().date || '').split('-').slice(1).join('/')
      })));
      checkSyncComplete();
    }, (error) => {
      console.error("Stats History Access Failure", error);
    });

    // Listen to quiz attempts for real-time pending review removal
    const qAttempts = query(collection(db, 'users', user.uid, 'quiz_attempts'), orderBy('createdAt', 'desc'));
    unsubAttemptsRef.current = onSnapshot(qAttempts, (snapshot) => {
      setQuizAttempts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const qRecentModules = query(collection(db, 'users', user.uid, 'modules'), orderBy('createdAt', 'desc'), limit(100));
    unsubModulesRef.current = onSnapshot(qRecentModules, (snap) => {
      setRecentModules(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      checkSyncComplete();
    });

    unsubCacheRef.current = onSnapshot(collection(db, 'users', user.uid, 'cached_quizzes'), (snap) => {
      const cache: Record<string, any[]> = {};
      snap.docs.forEach(d => {
        cache[d.id] = d.data().questions;
      });
      setFirestoreCache(cache);
    });

    unsubDraftsRef.current = onSnapshot(collection(db, 'users', user.uid, 'quiz_drafts'), (snapshot) => {
      setUnfinishedQuizzes(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // Add checkSyncComplete for attempts if needed, but it's secondary
    
    unsubSchedulesRef.current = onSnapshot(collection(db, 'users', user.uid, 'schedules'), (snapshot) => {
      const tasks = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setAllTasks(tasks);
      checkSyncComplete();
      
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      const tomorrow = new Date(new Date().setDate(now.getDate() + 1)).toISOString().split('T')[0];
      
      // Real-time reminders for today
      const upcoming = tasks.filter((t: any) => {
        if (t.date !== today) return false;
        const [h, m] = t.time.split(':');
        const taskTime = new Date();
        taskTime.setHours(parseInt(h), parseInt(m), 0, 0);
        const diffMs = taskTime.getTime() - now.getTime();
        const diffMins = diffMs / (1000 * 60);
        
        if (diffMins > 0 && diffMins <= 1 && !t.notified) {
           if (Notification.permission === 'granted') {
             new Notification("Opusequ Reminder", {
                body: `${t.title} starts in 1 minute. Stay agile!`,
                icon: '/favicon.ico'
             });
           }
           updateDoc(doc(db, 'users', user.uid, 'schedules', t.id), { notified: true }).catch(e => console.warn("Sync defer:", e));
        }
        return diffMins > 0 && diffMins <= 60;
      });

      setActiveReminders(upcoming);
    }, (error) => {
      console.error("Schedule Ledger Access Failure", error);
    });

    return () => {
      cleanupListeners();
    };
  }, [user]);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const getContextQuote = () => {
    const hour = new Date().getHours();
    if (hour > 17) return "Shift complete or starting? Either way, QCU excellence never sleeps.";
    if (activeTab === 'sprint') return "A 5-minute gap is an opportunity in disguise. Let's sharpen your readiness.";
    if (readiness < 80) return "Consistency is the key to balancing work and QCU studies. You're getting there.";
    return "Top-tier alignment. Your working-student hustle is paying off. Ready for the challenge!";
  };

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (authUser) => {
      if (authUser) {
        setUser(authUser);
        setActiveTab('home');
      } else {
        setUser(null);
      }
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  const handleQuizComplete = async (score: number, rawScore: number, totalQuestions: number, title: string, moduleId: string) => {
    try {
      if (!user) return;
      
      const statsRef = collection(db, 'users', user.uid, 'quiz_attempts');
      const now = new Date();
      await addDoc(statsRef, {
        moduleId,
        title,
        score,
        rawScore,
        totalQuestions,
        date: now.toISOString().split('T')[0],
        dateShort: now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        createdAt: serverTimestamp()
      });

      // Award readiness increase logic
      const increase = score >= 90 ? 10 : score >= 75 ? 5 : 2;
      setNotification({
        message: `Mabuhay! Readiness synchronized.`,
        sub: `Sprint complete: ${rawScore}/${totalQuestions}. Level increased by ${increase}%.`
      });

      // Send Gmail Notification if connected
      if (isGmailConnected && user.email) {
        try {
          const { subject, body } = formatDiagnosticEmail(
            user.email,
            userData?.major || 'QCU Student',
            title,
            'Micro-Quiz Sprint',
            `${rawScore}/${totalQuestions}`
          );
          await sendGmailEmail({ to: user.email, subject, body });
          console.log("Quiz completion email sent successfully.");
        } catch (emailErr) {
          console.error("Gmail notification failed:", emailErr);
        }
      }

      setActiveTab('home');
    } catch (e) {
      console.error("Sync Failure:", e);
    }
  };

  const saveQuizDraft = async (moduleTitle: string, state: any) => {
    if (!user || !moduleTitle) return;
    await setDoc(doc(db, 'users', user.uid, 'quiz_drafts', moduleTitle), {
      ...state,
      updatedAt: serverTimestamp()
    });
  };

  const deleteQuizDraft = async (moduleTitle: string) => {
    if (!user || !moduleTitle) return;
    await deleteDoc(doc(db, 'users', user.uid, 'quiz_drafts', moduleTitle));
  };

  const toggleTask = (taskId: string, completed: boolean) => {
    if (!user) return;
    updateDoc(doc(db, 'users', user.uid, 'schedules', taskId), { completed });
  };

  const cleanupListeners = () => {
    // This is the "Force-Disconnect" rule implementation
    unsubUserRef.current?.();
    unsubUsageRef.current?.();
    unsubRoleRef.current?.();
    unsubStatsRef.current?.();
    unsubSchedulesRef.current?.();
    unsubModulesRef.current?.();
    unsubDraftsRef.current?.();
    unsubAttemptsRef.current?.();
    unsubCacheRef.current?.();
    
    unsubUserRef.current = null;
    unsubUsageRef.current = null;
    unsubRoleRef.current = null;
    unsubStatsRef.current = null;
    unsubSchedulesRef.current = null;
    unsubModulesRef.current = null;
    unsubDraftsRef.current = null;
    unsubAttemptsRef.current = null;
    unsubCacheRef.current = null;
  };

  const renderContent = () => {
    if (authLoading) {
      return (
        <div className="min-h-screen bg-bg flex flex-col items-center justify-center p-6 text-center space-y-4">
          <Loader2 className="text-accent animate-spin" size={32} />
          <p className="text-[10px] uppercase tracking-[4px] font-bold text-text-secondary">Opusequ Initializing...</p>
        </div>
      );
    }

    if (!user) {
      if (authView === 'intro') {
        return <IntroPage onGetStarted={() => setAuthView('signup')} />;
      }
      return authView === 'signin' 
        ? <SignIn 
            onSuccess={() => setActiveTab('home')} 
            onNavigateToSignUp={() => setAuthView('signup')} 
          />
        : <SignUp 
            onNavigateToSignIn={() => setAuthView('signin')}
            onGoogleSuccess={() => setActiveTab('home')}
          />;
    }

    const handleExit = () => setActiveTab('home');

    if (userRole === 'admin') {
      return <AdminPortal />;
    }

    switch(activeTab) {
      case 'home': return (
        <Dashboard 
          onNavigate={setActiveTab} 
          streak={streak} 
          readiness={readiness} 
          quote={getContextQuote()} 
          statsData={statsData} 
          userData={userData}
          allTasks={allTasks}
          onToggleTask={toggleTask}
          recentModules={recentModules}
          unfinishedQuizzes={unfinishedQuizzes}
          quizAttempts={quizAttempts}
          firestoreCache={firestoreCache}
        />
      );
      case 'schedule': return <Scheduler onExit={handleExit} />;
      case 'learning': return (
        <MicroQuiz 
          onComplete={handleQuizComplete} 
          onExit={handleExit} 
          usageCount={usageData?.quizzes || 0}
          isPremium={true} // DEVELOPER MODE: Unrestricted Access
          allStats={quizAttempts}
          firestoreCache={firestoreCache}
          onDraftSave={saveQuizDraft}
          onDraftDelete={deleteQuizDraft}
          existingDrafts={unfinishedQuizzes}
          onLimitReached={() => setPremiumModal({ isOpen: true, reason: "Daily quiz limit reached" })}
        />
      );
      case 'progress': return (
        <ProgressLog 
          onExit={handleExit}
          quizAttempts={quizAttempts}
          modules={recentModules}
        />
      );
      case 'library': return (
        <ModuleRepository 
          onExit={handleExit} 
          uploadCount={usageData?.uploads || 0}
          noteCount={usageData?.notes || 0}
          isPremium={true} // DEVELOPER MODE: Unrestricted Access
          onLimitReached={(reason) => setPremiumModal({ isOpen: true, reason })}
        />
      );
      case 'oracle': return (
        <Assistant 
          onExit={handleExit} 
          usageCount={usageData?.ai || 0}
          isPremium={true} // DEVELOPER MODE: Unrestricted Access
          onLimitReached={(reason) => setPremiumModal({ isOpen: true, reason: reason || "Daily AI assistant limit reached" })}
        />
      );
      case 'settings': return (
        <Settings 
          theme={theme} 
          toggleTheme={toggleTheme} 
          onExit={handleExit} 
          setNotification={(msg, sub) => setNotification({ message: msg, sub: sub || '' })}
          cleanupListeners={cleanupListeners}
          isGmailConnected={isGmailConnected}
          connectGmail={connectGmail}
        />
      );
      default: return (
        <Dashboard 
          onNavigate={setActiveTab} 
          streak={streak} 
          readiness={readiness} 
          quote={getContextQuote()} 
          statsData={statsData} 
          userData={userData}
          allTasks={allTasks}
          onToggleTask={toggleTask}
        />
      );
    }
  };

  return (
    <div className="mobile-container overflow-hidden">
      <PremiumModal 
        isOpen={premiumModal.isOpen} 
        onClose={() => setPremiumModal({ isOpen: false })} 
        reason={premiumModal.reason}
      />
      <main className="flex-1 h-full overflow-hidden relative">
        <AnimatePresence>
          {activeReminders.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -20 }}
              className="fixed top-4 left-4 right-4 z-[100] bg-accent text-bg p-4 rounded-sm shadow-2xl flex items-center gap-4 border border-bg/10"
            >
              <div className="p-2 bg-bg text-accent rounded-sm shrink-0">
                <Bell size={18} fill="currentColor" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] uppercase tracking-widest font-bold opacity-80">Shift/Class Sync</p>
                <p className="text-xs font-bold truncate">Upcoming: {activeReminders[0].title}</p>
              </div>
              <button 
                onClick={() => setActiveReminders([])}
                className="p-1 hover:bg-bg/10 rounded-sm shrink-0"
              >
                <X size={16} />
              </button>
            </motion.div>
          )}

          {notification && (
            <motion.div 
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              className="fixed bottom-24 left-4 right-4 z-[100] bg-surface border border-accent p-4 rounded-sm shadow-2xl flex items-center gap-4"
            >
              <div className="p-2 bg-accent text-bg rounded-sm shrink-0 animate-bounce">
                <TrendingUp size={18} />
              </div>
              <div className="flex-1">
                <p className="text-xs font-bold text-accent">{notification.message}</p>
                <p className="text-[10px] text-text-secondary italic">{notification.sub}</p>
              </div>
              <button onClick={() => setNotification(null)} className="text-text-secondary p-1">
                <X size={16} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
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
          <button onClick={() => setActiveTab('progress')} className={`nav-item flex-1 ${activeTab === 'progress' ? 'active' : ''}`}>
            <TrendingUp size={18} />
            <span>Progress</span>
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
            {userData?.photoURL ? (
              <div className={cn(
                "w-5 h-5 rounded-full border overflow-hidden shrink-0",
                activeTab === 'settings' ? "border-accent shadow-[0_0_8px_rgba(var(--accent-rgb),0.5)]" : "border-border opacity-50 grayscale"
              )}>
                <img src={userData.photoURL} alt="Settings" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              </div>
            ) : (
              <LayoutDashboard size={18} />
            )}
            <span>Settings</span>
          </button>
        </nav>
      )}
    </div>
  );
}

