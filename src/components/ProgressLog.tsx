import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  TrendingUp, 
  TrendingDown, 
  ChevronRight, 
  ChevronDown, 
  Award, 
  Clock, 
  Calendar,
  BookOpen,
  ArrowLeft,
  Search
} from 'lucide-react';

interface QuizAttempt {
  id: string;
  moduleId: string;
  title: string;
  score: number;
  rawScore?: number;
  totalQuestions?: number;
  date: string;
  dateShort: string;
  createdAt?: any;
}

interface ProgressLogProps {
  onExit: () => void;
  quizAttempts: QuizAttempt[];
  modules: any[];
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}

interface GroupedModule {
  module: any;
  attempts: QuizAttempt[];
}

export default function ProgressLog({ onExit, quizAttempts, modules }: ProgressLogProps) {
  const [activeCategory, setActiveCategory] = useState<'major' | 'minor'>('major');
  const [expandedModule, setExpandedModule] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const groupedData = useMemo(() => {
    const data: Record<string, GroupedModule> = {};
    
    // Initialize with all modules in the category
    modules
      .filter(m => m.category === (activeCategory === 'major' ? 'Major Course' : 'Minor Course'))
      .forEach(m => {
        data[m.id || m.title] = { module: m, attempts: [] };
      });

    // Populate attempts
    quizAttempts.forEach(attempt => {
      const targetId = attempt.moduleId || attempt.title;
      if (data[targetId]) {
        data[targetId].attempts.push(attempt);
      } else {
        const parentModule = modules.find(m => m.id === attempt.moduleId || m.title === attempt.title);
        if (parentModule && parentModule.category === (activeCategory === 'major' ? 'Major Course' : 'Minor Course')) {
          const pid = parentModule.id || parentModule.title;
          if (!data[pid]) {
            data[pid] = { module: parentModule, attempts: [] };
          }
          data[pid].attempts.push(attempt);
        }
      }
    });

    // Sort attempts by date (newest first)
    Object.values(data).forEach((entry: GroupedModule) => {
      entry.attempts.sort((a, b) => {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : new Date(a.date || 0).getTime();
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : new Date(b.date || 0).getTime();
        return dateB - dateA;
      });
    });

    return data;
  }, [quizAttempts, modules, activeCategory]);

  const filteredData = Object.entries(groupedData).filter(([_, entry]) => 
    (entry as GroupedModule).module.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-bg">
      {/* Header */}
      <header className="p-6 border-b border-border flex items-center justify-between bg-surface/50 backdrop-blur-md sticky top-0 z-20">
        <div className="flex items-center gap-4">
          <button onClick={onExit} className="p-2 hover:bg-surface rounded-full transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-lg font-serif italic text-text-primary uppercase tracking-widest">Academic Progress Log</h1>
            <p className="text-[10px] text-text-secondary uppercase tracking-[2px] font-bold">Synchronized Performance Tracking</p>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6 space-y-8 pb-24">
        {/* Category Toggle */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-surface border border-border rounded-sm">
          <button 
            onClick={() => setActiveCategory('major')}
            className={cn(
              "py-3 text-[10px] font-bold uppercase tracking-[2px] transition-all rounded-sm",
              activeCategory === 'major' ? "bg-accent text-bg shadow-lg" : "text-text-secondary hover:text-accent"
            )}
          >
            Major Courses
          </button>
          <button 
            onClick={() => setActiveCategory('minor')}
            className={cn(
              "py-3 text-[10px] font-bold uppercase tracking-[2px] transition-all rounded-sm",
              activeCategory === 'minor' ? "bg-accent text-bg shadow-lg" : "text-text-secondary hover:text-accent"
            )}
          >
            Minor Courses
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary opacity-40" />
          <input 
            type="text" 
            placeholder="Search within academics..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-surface border border-border rounded-sm py-3 pl-10 pr-4 text-[10px] uppercase tracking-widest placeholder:opacity-30 focus:border-accent transition-all outline-none"
          />
        </div>

        {/* Module Progress List */}
        <div className="space-y-4">
          {filteredData.length > 0 ? (
            filteredData.map(([moduleId, entry], i) => {
              const { module, attempts } = entry as GroupedModule;
              const hasAttempts = attempts.length > 0;
              const latestScore = hasAttempts ? attempts[0].score : 0;
              const isExpanded = expandedModule === moduleId;

              return (
                <motion.div 
                  key={`module-${moduleId || i}-${i}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className={cn(
                    "border transition-all duration-300 rounded-sm overflow-hidden",
                    isExpanded ? "border-accent bg-accent/5 ring-1 ring-accent/20" : "border-border/20 bg-glass"
                  )}
                >
                  <button 
                    onClick={() => setExpandedModule(isExpanded ? null : moduleId)}
                    className="w-full p-5 flex items-center justify-between text-left group"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className={cn(
                        "p-2.5 rounded-sm border transition-colors",
                        isExpanded ? "bg-accent border-accent text-bg" : "bg-surface border-border text-text-secondary group-hover:border-accent"
                      )}>
                        <BookOpen size={16} />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-xs font-bold truncate leading-none mb-1.5">{module.title}</h3>
                        <div className="flex items-center gap-3">
                          <span className="text-[8px] uppercase tracking-widest text-text-secondary flex items-center gap-1">
                            <Clock size={8} /> {hasAttempts ? `${attempts.length} Attempts` : 'No attempts recorded'}
                          </span>
                          {hasAttempts && (
                            <span className={cn(
                              "text-[8px] font-bold uppercase py-0.5 px-1.5 rounded-sm",
                              latestScore >= 80 ? "bg-green-500/10 text-green-500" : 
                              latestScore >= 50 ? "bg-yellow-500/10 text-yellow-500" : 
                              "bg-red-500/10 text-red-500"
                            )}>
                              Latest: {attempts[0].rawScore !== undefined ? `${attempts[0].rawScore}/${attempts[0].totalQuestions}` : `${latestScore}%`}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    {isExpanded ? <ChevronDown size={18} className="text-accent" /> : <ChevronRight size={18} className="text-text-secondary opacity-30" />}
                  </button>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="bg-bg/40 border-t border-border/10"
                      >
                        <div className="p-2 space-y-1">
                          {hasAttempts ? (
                            attempts.map((attempt, idx) => {
                              const prevAttempt = attempts[idx + 1];
                              const trend = prevAttempt 
                                ? (attempt.score > prevAttempt.score ? 'up' : attempt.score < prevAttempt.score ? 'down' : 'neutral')
                                : 'new';

                              return (
                                <div key={`${attempt.id}-${idx}`} className="flex items-center justify-between p-4 bg-glass border border-border/10 rounded-sm">
                                  <div className="flex items-center gap-4">
                                    <div className={cn(
                                      "w-12 h-12 flex flex-col items-center justify-center rounded-sm border font-mono",
                                      attempt.score >= 80 ? "border-green-500/30 text-green-500 bg-green-500/5" : 
                                      attempt.score >= 50 ? "border-yellow-500/30 text-yellow-500 bg-yellow-500/5" : 
                                      "border-red-500/30 text-red-500 bg-red-500/5"
                                    )}>
                                      <span className="text-[10px] font-bold">
                                        {attempt.rawScore !== undefined ? `${attempt.rawScore}/${attempt.totalQuestions}` : `${attempt.score}%`}
                                      </span>
                                      {attempt.rawScore !== undefined && (
                                        <span className="text-[7px] opacity-60">
                                          {attempt.score}%
                                        </span>
                                      )}
                                      {trend === 'up' && <TrendingUp size={10} className="text-green-500 mt-0.5" />}
                                      {trend === 'down' && <TrendingDown size={10} className="text-red-500 mt-0.5" />}
                                    </div>
                                    <div>
                                      <div className="flex items-center gap-2 mb-1">
                                        <Calendar size={10} className="text-text-secondary opacity-40" />
                                        <span className="text-[9px] font-mono font-bold">{attempt.dateShort}</span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <Clock size={10} className="text-text-secondary opacity-40" />
                                        <span className="text-[8px] text-text-secondary tracking-widest uppercase">
                                          {attempt.createdAt?.toDate ? attempt.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '12:00 PM'}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                  {attempt.score === 100 && (
                                    <div className="p-2 rounded-full bg-[#FFD700]/10 text-[#FFD700]">
                                      <Award size={16} fill="currentColor" />
                                    </div>
                                  )}
                                </div>
                              );
                            })
                          ) : (
                            <div className="py-8 text-center border border-dashed border-border rounded-sm opacity-30 flex flex-col items-center gap-2">
                               <BookOpen size={20} />
                               <p className="text-[8px] uppercase tracking-widest leading-relaxed">No performance records found.<br/>Complete a Targeted Sprint to begin synchronization.</p>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })
          ) : (
            <div className="py-20 text-center border border-dashed border-border/20 rounded-sm opacity-20 flex flex-col items-center gap-4">
               <BookOpen size={40} className="text-accent" />
               <p className="text-[10px] uppercase tracking-[3px] font-bold">No academic data synchronized.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
