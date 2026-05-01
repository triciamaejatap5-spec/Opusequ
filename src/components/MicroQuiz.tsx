import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, XCircle, ArrowRight, Zap, Trophy, Timer, AlertCircle, Sparkles, X, BookOpen, Loader2, Home, Award, Clock } from 'lucide-react';
import { QuizQuestion } from '../types';
import { GoogleGenAI } from '@google/genai';
import { db, auth } from '../firebase';
import { collection, getDocs, doc, updateDoc, getDoc, serverTimestamp, query, where, limit, setDoc } from 'firebase/firestore';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const ai = new GoogleGenAI({ 
  apiKey: process.env.GEMINI_API_KEY
});

const generateQuizWithRetry = async (module: any, usedQuestions: Set<string>, retryCount = 0): Promise<any[]> => {
  try {
    const prompt = `Generate 5 rapid multiple-choice questions for: "${module.title}". 
    Content to analyze: ${module.content || 'Key concepts regarding ' + module.title}
    
    Previous Questions avoided: ${Array.from(usedQuestions).join(' | ')}
    
    CONSTRAINTS:
    1. Concise questions (definitions or short phrases).
    2. Choices must be single words or short phrases, NOT sentences.
    3. Error on the side of Industrial Engineering context if applicable.
    4. Keep the question pool fresh.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        systemInstruction: `You are an expert QCU academic coach. Your goal is to generate zero-friction, interactive multiple-choice questions for working students.
        Strictly base questions on the provided study material.
        Format: Return a JSON array of objects with keys: question, options (array of 4 strings), correctAnswer (index 0-3), explanation.`
      }
    });

    const text = response.text;
    const parsed = JSON.parse(text || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    if (retryCount < 2) {
      console.warn(`Gemini v1 Retry ${retryCount + 1}...`, err);
      await new Promise(r => setTimeout(r, 2000));
      return generateQuizWithRetry(module, usedQuestions, retryCount + 1);
    }
    throw err;
  }
};

interface MicroQuizProps {
  onComplete: (score: number, rawScore: number, totalQuestions: number, title: string, moduleId: string) => void;
  onExit: () => void;
  usageCount: number;
  isPremium?: boolean;
  onLimitReached: (reason: string) => void;
  cachedQuizzes?: QuizQuestion[];
  firestoreCache?: Record<string, QuizQuestion[]>;
  allStats?: any[];
  onDraftSave?: (moduleTitle: string, state: any) => void;
  onDraftDelete?: (moduleTitle: string) => void;
  existingDrafts?: any[];
}

export default function MicroQuiz({ 
  onComplete, 
  onExit, 
  usageCount, 
  isPremium, 
  onLimitReached, 
  allStats = [],
  firestoreCache = {},
  onDraftSave,
  onDraftDelete,
  existingDrafts = []
}: MicroQuizProps) {
  const [step, setStep] = useState<'topic' | 'intro' | 'quiz' | 'result'>('topic');
  const [modules, setModules] = useState<any[]>([]);
  const [selectedModule, setSelectedModule] = useState<any | null>(null);
  const [isLoadingModules, setIsLoadingModules] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [quizPool, setQuizPool] = useState<QuizQuestion[]>([]);
  const [usedQuestions, setUsedQuestions] = useState<Set<string>>(new Set());
  const [cachedQuizzes, setCachedQuizzes] = useState<QuizQuestion[]>([]);
  const [isPreFetching, setIsPreFetching] = useState(false);
  
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [totalAttempted, setTotalAttempted] = useState(0);

  const [activeCourseType, setActiveCourseType] = useState<'major' | 'minor'>('major');

  useEffect(() => {
    // Load cached quizzes on mount
    const saved = localStorage.getItem('opusequ_quiz_cache');
    if (saved) {
      try {
        setCachedQuizzes(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse quiz cache", e);
      }
    }
  }, []);

  const saveToCache = (newQuestions: QuizQuestion[]) => {
    setCachedQuizzes(prev => {
      const combined = [...newQuestions, ...prev].slice(0, 50); // Keep last 50
      localStorage.setItem('opusequ_quiz_cache', JSON.stringify(combined));
      return combined;
    });
  };

  const startCachedSprint = () => {
    if (cachedQuizzes.length === 0) return;
    
    // Select 10 random questions from cache
    const shuffled = [...cachedQuizzes].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, 10);
    
    setQuizPool(selected);
    setCurrentIndex(0);
    setStep('intro');
    setSelectedModule({ title: 'Cached Archive' });
  };

  useEffect(() => {
    const fetchModulesAndPreCache = async () => {
      const user = auth.currentUser;
      if (!user) return;
      try {
        const q = query(collection(db, 'users', user.uid, 'modules'));
        const snapshot = await getDocs(q);
        const fetchedModules = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        setModules(fetchedModules);
      } catch (e) {
        console.error("MicroQuiz Module Fetch Error:", e);
        setModules([]);
      } finally {
        setIsLoadingModules(false);
      }
    };
    fetchModulesAndPreCache();
  }, []);

  const saveToFirestoreCache = async (moduleId: string, questions: QuizQuestion[]) => {
    const user = auth.currentUser;
    if (!user) return;
    try {
      const cacheRef = doc(db, 'users', user.uid, 'cached_quizzes', moduleId);
      await setDoc(cacheRef, {
        questions,
        updatedAt: serverTimestamp()
      });
    } catch (e) {
      console.error("Firestore Cache Save Error:", e);
    }
  };

  const generateQuiz = async (module: any, isInitial = true) => {
    if (isInitial && !isPremium && usageCount >= 3) {
      onLimitReached("Daily quiz limit reached");
      return;
    }

    // INSTANT START: Check Firestore Cache
    if (isInitial && firestoreCache[module.id]) {
      setQuizPool(firestoreCache[module.id]);
      setCurrentIndex(0);
      setStep('intro');
      setSelectedModule(module); 
      return;
    }
    
    setIsGenerating(true);
    try {
      const parsed = await generateQuizWithRetry(module, usedQuestions);
      
      const randomized = parsed.map((q: any) => {
        const optionsWithMeta = q.options.map((opt: string, i: number) => ({ 
          text: opt, 
          isCorrect: i === q.correctAnswer 
        }));
        
        // Fisher-Yates for perfect pattern-free randomization
        const shuffled = [...optionsWithMeta];
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        
        const correctIdx = shuffled.findIndex(o => o.isCorrect);
        return {
          id: Math.random().toString(36).substr(2, 9),
          question: q.question,
          options: shuffled.map(o => o.text),
          correctAnswer: correctIdx,
          explanation: q.explanation || "No additional logic required."
        };
      });

      if (isInitial) {
        setQuizPool(randomized);
        saveToCache(randomized); // Keep local backup
        saveToFirestoreCache(module.id, randomized); // Persistence Cache
        setCurrentIndex(0);
        setStep('intro');
        
        // Increment usage count in Firestore (subcollection pattern)
        const user = auth.currentUser;
        if (user && !isPremium) {
           const todayStr = new Date().toLocaleDateString('en-CA');
           const usageRef = doc(db, 'users', user.uid, 'daily_usage', todayStr);
           const usageSnap = await getDoc(usageRef);
           
           if (!usageSnap.exists()) {
             await setDoc(usageRef, { quizzes: 1, uploads: 0, ai: 0, notes: 0 });
           } else {
             await updateDoc(usageRef, { quizzes: (usageSnap.data().quizzes || 0) + 1 });
           }
        }
      } else {
        setQuizPool(prev => [...prev, ...randomized]);
      }
      
      setUsedQuestions(prev => {
        const next = new Set(prev);
        randomized.forEach((r: any) => next.add(r.question));
        return next;
      });
    } catch (e) {
      console.error("Quiz Gen Error:", e);
      // Reset generating state is handled by finally, but let's clear the processing view
      setSelectedModule(null);
      alert("Failed to synchronize AI Quiz. QCU servers may be Busy (404/500). Please retry in 30s.");
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (step === 'quiz' && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && step === 'quiz') {
      handleFinish();
    }
    return () => clearInterval(timer);
  }, [step, timeLeft]);

  const handleFinish = async () => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      const userRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userRef);
      const userData = userDoc.data();
      
      const currentStreak = userData?.streak || 0;
      const lastDate = userData?.lastQuizDate || '';
      const today = new Date().toISOString().split('T')[0];
      
      let newStreak = currentStreak;
      if (lastDate !== today) {
        newStreak += 1;
      }

      const currentReadiness = userData?.readiness || 0;
      const quizPerformance = (score / (totalAttempted || 1)) * 100;
      
      // Readiness logic: first quiz of the day defines the primary jump, 
      // but session updates sync to Heat Map immediately.
      let newReadiness = currentReadiness;
      
      if (lastDate !== today) {
        newReadiness = Math.round((currentReadiness * 0.7) + (quizPerformance * 0.3));
      } else {
        // Subsequent quizzes: smaller adjustments to keep it dynamic
        newReadiness = Math.round((currentReadiness * 0.95) + (quizPerformance * 0.05));
      }

      // Sync to Stats collection with fixed ID per date for immediate heat map update
      const statsDocRef = doc(db, 'users', user.uid, 'stats', today);
      await setDoc(statsDocRef, {
        userId: user.uid,
        readiness: Math.min(100, newReadiness),
        performance: Math.round(quizPerformance),
        streak: newStreak,
        date: today,
        timestamp: serverTimestamp()
      }, { merge: true });

      await updateDoc(userRef, {
        streak: newStreak,
        readiness: Math.min(100, newReadiness),
        lastQuizDate: today,
        totalQuizzes: (userData?.totalQuizzes || 0) + 1,
        totalScore: (userData?.totalScore || 0) + score
      });
      
      // Clean up the draft upon successful completion
      if (onDraftDelete && selectedModule) {
        onDraftDelete(selectedModule.title);
      }

      setStep('result');
      onComplete?.(
        Math.round((score / quizPool.length) * 100), 
        score,
        quizPool.length,
        selectedModule?.title || 'Quick Quiz', 
        selectedModule?.id || ''
      );
    } catch (e) {
      console.error("Quiz Finish Error:", e);
      setStep('result');
    }
  };

  const handleOptionSelect = (index: number) => {
    if (isAnswered) return;
    setSelectedOption(index);
    const correct = index === quizPool[currentIndex].correctAnswer;
    const newScore = correct ? score + 1 : score;
    if (correct) setScore(s => s + 1);
    setTotalAttempted(t => t + 1);
    setIsAnswered(true);

    // Save draft state to Firestore 
    if (onDraftSave && selectedModule) {
      onDraftSave(selectedModule.title, {
        moduleId: selectedModule.id,
        currentIndex: currentIndex,
        score: newScore,
        totalAttempted: totalAttempted + 1,
        quizPool: quizPool,
        title: selectedModule.title
      });
    }

    // ZERO-FRICTION: Pre-fetch next batch in background when 4 questions remain in current pool
    if (currentIndex >= quizPool.length - 4 && !isGenerating && timeLeft > 0) {
      generateQuiz(selectedModule, false);
    }
  };

  const handleNext = useCallback(() => {
    const isAtEnd = currentIndex === quizPool.length - 1;
    
    if (!isAtEnd) {
      setCurrentIndex(prev => prev + 1);
      setSelectedOption(null);
      setIsAnswered(false);
    } else {
      // If we're at the end but the next batch isn't ready, show a small loader 
      // instead of a 15-second gap. If it IS ready, it continues instantly.
      if (timeLeft > 0) {
        if (isGenerating) {
          // This should rarely happen with pre-fetching
          // We can just wait or set a small local state to trigger once isGenerating finishes
        } else {
          // Batch should already be appended to quizPool
          if (currentIndex < quizPool.length - 1) {
            setCurrentIndex(prev => prev + 1);
            setSelectedOption(null);
            setIsAnswered(false);
          } else {
            // Edge case: generation failed or was extremely slow
            generateQuiz(selectedModule, false);
          }
        }
      } else {
        handleFinish();
      }
    }
  }, [currentIndex, quizPool, timeLeft, selectedModule, isGenerating]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (step === 'topic') {
    return (
      <div className="p-8 h-full flex flex-col space-y-8 overflow-y-auto pb-32">
        <header className="flex justify-between items-center shrink-0">
          <div>
            <h2 className="text-3xl italic">Select Module</h2>
            <p className="text-text-secondary text-[10px] uppercase tracking-widest mt-1">Quiz Generation Source</p>
          </div>
          {onExit && (
            <button onClick={onExit} className="p-2 border border-border text-text-secondary rounded-sm">
              <X size={20} />
            </button>
          )}
        </header>

        {existingDrafts.length > 0 && (
          <div className="space-y-4">
            <div className="flex justify-between items-center px-1">
              <h3 className="text-[10px] uppercase tracking-[3px] text-accent font-bold">Active Sprints</h3>
              <Sparkles size={12} className="text-accent animate-pulse" />
            </div>
            <div className="grid gap-3">
              {existingDrafts.map(draft => (
                <button
                  key={draft.id}
                  onClick={() => {
                    const mod = modules.find(m => m.id === draft.moduleId || m.title === draft.title) || { id: draft.moduleId, title: draft.title };
                    setQuizPool(draft.quizPool);
                    setCurrentIndex(draft.currentIndex + 1);
                    setScore(draft.score);
                    setTotalAttempted(draft.totalAttempted);
                    setSelectedModule(mod);
                    setSelectedOption(null);
                    setIsAnswered(false);
                    setStep('quiz');
                  }}
                  className="p-5 border border-accent bg-accent/5 rounded-sm text-left hover:bg-accent/10 transition-all flex justify-between items-center group"
                >
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-accent truncate">{draft.title}</h3>
                    <p className="text-[8px] uppercase tracking-widest text-text-secondary mt-1">
                      Resume at {draft.currentIndex + 1} / {draft.quizPool?.length} — Score: {draft.score}
                    </p>
                  </div>
                  <ArrowRight size={14} className="text-accent" />
                </button>
              ))}
            </div>
          </div>
        )}

        {cachedQuizzes.length > 0 && (
          <button
            onClick={startCachedSprint}
            className="w-full bg-surface/50 border border-border/30 py-4 px-5 rounded-sm flex items-center justify-between group overflow-hidden relative"
          >
            <div className="flex gap-4 items-center">
              <div className="p-2 bg-accent text-bg rounded-full">
                <Zap size={16} />
              </div>
              <div className="text-left">
                <h3 className="text-xs uppercase tracking-widest font-bold text-accent">Cached Sprint</h3>
                <p className="text-[10px] text-text-secondary">Start quiz using {cachedQuizzes.length} cached questions</p>
              </div>
            </div>
          </button>
        )}

        {isLoadingModules ? (
          <div className="flex-1 flex items-center justify-center"><Loader2 className="animate-spin text-accent" /></div>
        ) : (
          <div className="space-y-6">
            <div className="flex bg-surface p-1 rounded-sm border border-border">
              <button 
                onClick={() => setActiveCourseType('major')}
                className={cn(
                  "flex-1 py-3 text-[10px] font-bold uppercase tracking-[2px] transition-all rounded-sm",
                  activeCourseType === 'major' ? "bg-accent text-bg shadow-lg" : "text-text-secondary hover:text-accent"
                )}
              >
                Major Courses
              </button>
              <button 
                onClick={() => setActiveCourseType('minor')}
                className={cn(
                  "flex-1 py-3 text-[10px] font-bold uppercase tracking-[2px] transition-all rounded-sm",
                  activeCourseType === 'minor' ? "bg-accent text-bg shadow-lg" : "text-text-secondary hover:text-accent"
                )}
              >
                Minor Courses
              </button>
            </div>

            <div className="grid gap-3">
               {modules.filter(m => m.category === (activeCourseType === 'major' ? 'Major Course' : 'Minor Course')).length === 0 ? (
                 <div className="p-10 border-2 border-dashed border-border rounded-sm text-center space-y-4">
                    <BookOpen className="mx-auto text-text-secondary opacity-20" size={40} />
                    <p className="text-sm text-text-secondary serif italic">No {activeCourseType} courses found. Synchronize modules in your Library first.</p>
                 </div>
               ) : (
                 modules.filter(m => m.category === (activeCourseType === 'major' ? 'Major Course' : 'Minor Course')).map((mod, i) => {
                   const modStats = allStats.filter(s => s.title === mod.title);
                   const lastAttempt = modStats.length > 0 ? modStats.sort((a,b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime())[0] : null;
                   const isReady = firestoreCache[mod.id];

                   return (
                    <button
                      key={`module-card-${mod.id || i}`}
                      onClick={() => {
                        const draft = existingDrafts.find(d => d.moduleId === mod.id || d.title === mod.title);
                        if (draft) {
                          setQuizPool(draft.quizPool);
                          // If currentIndex was finished, move to next
                          setCurrentIndex(draft.currentIndex + 1);
                          setScore(draft.score);
                          setTotalAttempted(draft.totalAttempted);
                          setSelectedModule(mod);
                          setSelectedOption(null);
                          setIsAnswered(false);
                          setStep('quiz');
                        } else {
                          setSelectedModule(mod);
                          generateQuiz(mod);
                        }
                      }}
                      disabled={isGenerating}
                      className="p-5 border border-border bg-glass rounded-sm text-left hover:border-accent transition-all group relative overflow-hidden flex justify-between items-center"
                    >
                      {isGenerating && selectedModule?.id === mod.id && (
                        <div className="absolute inset-0 bg-accent text-bg flex items-center justify-center gap-3 z-10">
                          <Loader2 size={16} className="animate-spin" />
                          <span className="text-[10px] uppercase tracking-widest font-bold">Analyzing Content...</span>
                        </div>
                      )}
                      
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-serif italic text-text-primary group-hover:text-accent transition-colors truncate">{mod.title}</h3>
                        <div className="flex items-center gap-3 mt-1">
                          {isReady ? (
                             <div className="flex items-center gap-1 text-accent">
                               <Sparkles size={10} />
                               <span className="text-[8px] uppercase font-bold tracking-widest">Ready</span>
                             </div>
                          ) : mod.status === 'error' ? (
                             <div className="flex items-center gap-1 text-red-500">
                               <AlertCircle size={10} />
                               <span className="text-[8px] uppercase font-bold tracking-widest">Sync Error (Retry)</span>
                             </div>
                          ) : mod.status === 'processing' ? (
                             <div className="flex items-center gap-1 text-accent animate-pulse">
                               <Loader2 size={10} className="animate-spin" />
                               <span className="text-[8px] uppercase font-bold tracking-widest">Verification Loop...</span>
                             </div>
                          ) : (
                             <span className="text-[8px] uppercase tracking-widest text-text-secondary opacity-40">Verification Loop Pending</span>
                          )}
                          {lastAttempt && (
                            <div className="flex items-center gap-1 text-text-secondary border-l border-border/30 pl-3">
                              <Trophy size={10} className="text-accent" />
                              <span className="text-[8px] uppercase font-bold tracking-widest">
                                Last: {lastAttempt.score}% {lastAttempt.rawScore !== undefined && `(${lastAttempt.rawScore}/${lastAttempt.totalQuestions})`}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {isReady && <ArrowRight size={14} className="text-accent opacity-0 group-hover:opacity-100 transition-opacity" />}
                    </button>
                   );
                })
               )}
            </div>

            {/* PERFORMANCE HISTORY INTEGRATION (Motivation Fix) */}
            <div className="pt-8 border-t border-border/20 space-y-4">
              <div className="flex justify-between items-center px-1">
                <h3 className="text-[10px] uppercase tracking-[3px] text-text-secondary font-bold">Recent Benchmarks</h3>
                <Trophy size={12} className="text-accent opacity-30" />
              </div>
              <div className="space-y-2">
                {allStats.slice(0, 3).map((stat, i) => (
                  <div key={`stat-${stat.id || i}`} className="flex items-center justify-between p-3 bg-surface/40 border border-border/10 rounded-sm">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-8 text-center font-mono text-[8px] font-bold py-0.5 rounded-sm border",
                        stat.score >= 80 ? "border-green-500/30 text-green-500 bg-green-500/5" : 
                        stat.score >= 50 ? "border-yellow-500/30 text-yellow-500 bg-yellow-500/5" : 
                        "border-red-500/30 text-red-500 bg-red-500/5"
                      )}>
                        {stat.score}%
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold truncate max-w-[150px]">{stat.title}</p>
                        <p className="text-[7px] text-text-secondary font-mono">{stat.dateShort}</p>
                      </div>
                    </div>
                    {stat.score === 100 && <Award size={10} className="text-[#FFD700]" fill="currentColor" />}
                  </div>
                ))}
                {allStats.length === 0 && (
                  <div className="py-6 text-center border border-dashed border-border/20 rounded-sm opacity-20">
                    <p className="text-[8px] uppercase tracking-widest italic">Performance data sync pending...</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (step === 'intro') {
    return (
      <div className="p-8 h-full flex flex-col items-center justify-center space-y-8 text-center relative animate-in fade-in zoom-in">
        {onExit && (
          <button onClick={onExit} className="absolute top-8 right-8 p-2 border border-border text-text-secondary rounded-sm">
            <X size={20} />
          </button>
        )}
        <div className="w-24 h-24 border-2 border-accent border-dashed rounded-full flex items-center justify-center animate-[spin_10s_linear_infinite]">
          <Zap size={40} className="text-accent fill-accent" />
        </div>
        <div className="space-y-4">
          <h2 className="text-3xl font-serif italic">{selectedModule?.title} Sprint</h2>
          <p className="text-text-secondary text-sm max-w-xs leading-relaxed">
            AI has formulated 10 targeted questions from your module. You have 5 minutes. Ready to verify your knowledge?
          </p>
        </div>
        <button 
          onClick={() => setStep('quiz')}
          className="w-full bg-accent text-bg py-5 rounded-sm font-bold uppercase tracking-[4px] shadow-lg active:scale-95 transition-all"
        >
          Begin Targeted Sprint
        </button>

        {/* YOUR PERFORMANCE HISTORY */}
        <div className="w-full space-y-4 pt-8 border-t border-border/30">
          <div className="flex justify-between items-center px-1">
            <h3 className="text-[10px] uppercase tracking-[3px] text-text-secondary font-bold">Previous Benchmarks</h3>
            <Clock size={12} className="text-text-secondary opacity-30" />
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto pr-2 scrollbar-hide">
            {allStats.filter(s => s.title === selectedModule?.title).length > 0 ? (
              allStats
                .filter(s => s.title === selectedModule?.title)
                .sort((a,b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime())
                .map((attempt, i) => (
                  <div key={`history-${attempt.id || i}`} className="flex items-center justify-between p-3 bg-glass border border-border/10 rounded-sm">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-10 text-center font-mono text-[9px] font-bold py-1 rounded-sm border",
                        attempt.score >= 80 ? "border-green-500/30 text-green-500 bg-green-500/5" : 
                        attempt.score >= 50 ? "border-yellow-500/30 text-yellow-500 bg-yellow-500/5" : 
                        "border-red-500/30 text-red-500 bg-red-500/5"
                      )}>
                        {attempt.score}%
                        {attempt.rawScore !== undefined && (
                          <div className="text-[6px] opacity-60 leading-none mt-0.5">
                            {attempt.rawScore}/{attempt.totalQuestions}
                          </div>
                        )}
                      </div>
                      <div className="text-[9px] text-text-secondary font-mono">
                        {attempt.dateShort}
                      </div>
                    </div>
                  </div>
                ))
            ) : (
              <div className="py-8 text-center border border-dashed border-border rounded-sm opacity-30">
                 <p className="text-[8px] uppercase tracking-widest">Initial assessment pending.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (step === 'result') {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-8 text-center space-y-8 h-full flex flex-col justify-center relative overflow-y-auto">
        <div className="w-20 h-20 border border-accent rounded-full flex items-center justify-center mx-auto">
          <Trophy className="text-accent w-10 h-10" />
        </div>
        <div className="space-y-2">
          <h2 className="text-4xl italic">Sprint Complete!</h2>
          <p className="text-text-secondary text-sm">Targeted review concluded. Your readiness has been synchronized with the archive.</p>
        </div>
        
        <div className="grid grid-cols-2 gap-4 text-left">
          <div className="bg-glass border border-border p-6 rounded-sm">
            <p className="text-[10px] uppercase tracking-[3px] font-bold text-accent mb-2">Sprint Score</p>
            <p className="text-3xl font-serif italic text-text-primary">{score}/{totalAttempted}</p>
          </div>
          <div className="bg-glass border border-border p-6 rounded-sm">
            <p className="text-[10px] uppercase tracking-[3px] font-bold text-accent mb-2">Readiness</p>
            <p className="text-3xl font-serif italic text-accent">Synced</p>
          </div>
        </div>

        <button 
          onClick={() => onExit?.()} 
          className="w-full bg-accent text-bg py-5 rounded-sm font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-3 active:scale-95 shadow-xl shadow-accent/10"
        >
          <Home size={18} /> Return to Dashboard
        </button>
      </motion.div>
    );
  }

  const question = quizPool[currentIndex];

  return (
    <div className="p-8 space-y-8 pb-32 h-full flex flex-col relative overflow-y-auto">
      <header className="flex justify-between items-center border-b border-border pb-6 shrink-0">
        <div className="flex items-center gap-3 font-bold uppercase tracking-widest text-xs text-accent">
          <Timer size={20} className={timeLeft < 60 ? 'animate-pulse text-red-500' : ''} />
          <span className={timeLeft < 60 ? 'text-red-500' : ''}>{formatTime(timeLeft)}</span>
        </div>
        <div className="text-[10px] font-bold text-text-secondary uppercase tracking-[2px]">
          Q{currentIndex + 1} / {quizPool.length}
        </div>
      </header>

      <div className="flex-1 flex flex-col justify-center space-y-10">
        <div className="space-y-2 text-center px-2">
          <span className="text-[9px] uppercase tracking-[4px] text-accent font-bold opacity-60">{selectedModule?.title}</span>
          <h2 className="text-xl font-serif italic leading-relaxed text-text-primary">"{question?.question}"</h2>
        </div>
        
        <div className="grid gap-3">
          {question?.options.map((option, i) => {
            const isSelected = selectedOption === i;
            const isCorrect = i === question.correctAnswer;
            
            let bgStyle = "bg-glass";
            let borderStyle = "border-border";
            let textColor = "text-text-secondary";
            
            if (isAnswered) {
              if (isCorrect) {
                  bgStyle = "bg-green-500/10";
                  borderStyle = "border-green-500/50";
                  textColor = "text-green-500";
              } else if (isSelected) {
                  bgStyle = "bg-red-500/10";
                  borderStyle = "border-red-500/50";
                  textColor = "text-red-500";
              }
            } else if (isSelected) {
              borderStyle = "border-accent";
              textColor = "text-text-primary";
            }

            return (
              <button
                key={`${question?.id || 'q'}-opt-${i}`}
                disabled={isAnswered}
                onClick={() => handleOptionSelect(i)}
                className={`w-full p-4 text-left rounded-sm border transition-all flex justify-between items-center ${bgStyle} ${borderStyle}`}
              >
                <div className="flex items-center gap-4">
                  <span className="text-[10px] font-mono opacity-20">{String.fromCharCode(65 + i)}</span>
                  <span className={`text-sm tracking-tight ${isSelected ? 'font-bold' : ''} ${textColor}`}>
                    {option}
                  </span>
                </div>
                {isAnswered && isCorrect && <CheckCircle2 className="text-green-500" size={16} />}
                {isAnswered && isSelected && !isCorrect && <XCircle className="text-red-500" size={16} />}
              </button>
            );
          })}
        </div>
        
        <AnimatePresence>
          {isAnswered && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-accent/5 border border-accent/20 p-5 rounded-sm space-y-4">
              <p className="text-xs text-text-primary leading-relaxed italic border-l border-accent pl-4">
                "{question?.explanation}"
              </p>
              <button 
                onClick={handleNext}
                className="w-full bg-accent text-bg py-3 rounded-sm font-bold uppercase tracking-widest text-[10px] flex items-center justify-center gap-2"
              >
                {currentIndex < quizPool.length - 1 ? 'Next Challenge' : 'Complete Sprint'} <ArrowRight size={14} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

