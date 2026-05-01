import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Flame,
  Zap,
  Bus,
  Plus,
  X,
  Bell,
  Loader2,
  Trash2,
  AlertCircle
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

import { db, auth } from '../firebase';
import { collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, deleteDoc, doc, where } from 'firebase/firestore';

interface Task {
  id: string;
  title: string;
  type: 'work' | 'class' | 'study' | 'deadline';
  time: string;
  date: string; // YYYY-MM-DD
  color: string;
}

interface SchedulerProps {
  onExit: () => void;
}

export default function Scheduler({ onExit }: SchedulerProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [selectedDateDetails, setSelectedDateDetails] = useState<string | null>(null);
  const [newTask, setNewTask] = useState({
    title: '',
    type: 'class' as 'work' | 'class' | 'study' | 'deadline',
    time: '08:00',
    date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const q = query(collection(db, 'users', user.uid, 'schedules'), orderBy('date', 'asc'));
    const unsub = onSnapshot(q, (snapshot) => {
      setTasks(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Task)));
      setIsLoading(false);
    }, (error) => {
      console.error("DIAGNOSTIC: Scheduler Sync Error", error);
      setIsLoading(false);
    });

    return () => unsub();
  }, []);

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user) return;
    
    // Assign color based on type
    const colors = {
      work: 'text-accent',
      class: 'text-blue-400',
      study: 'text-orange-400',
      deadline: 'text-red-400'
    };

    try {
      await addDoc(collection(db, 'users', user.uid, 'schedules'), {
        ...newTask,
        userId: user.uid,
        color: colors[newTask.type as keyof typeof colors],
        createdAt: serverTimestamp(),
        completed: false
      });
      setIsAdding(false);
      setNewTask({ ...newTask, title: '' });
    } catch (e) {
      console.error("DIAGNOSTIC: Task Sync Failure", e);
    }
  };

  const deleteTask = async (id: string) => {
    const user = auth.currentUser;
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'schedules', id));
    } catch (e) {
      console.error("DIAGNOSTIC: Task Deletion Failure", e);
    }
  };

  const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();
  
  const days = daysInMonth(currentDate.getFullYear(), currentDate.getMonth());
  const startDay = firstDayOfMonth(currentDate.getFullYear(), currentDate.getMonth());
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  const selectedDateStr = currentDate.toISOString().split('T')[0];

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="p-8 space-y-8 pb-32 h-screen overflow-y-auto scrollbar-hide bg-bg"
    >
      <header className="flex justify-between items-center border-b border-border pb-6">
        <div className="flex items-center gap-4">
          <button onClick={onExit} className="p-2 hover:bg-glass rounded-sm transition-colors text-text-secondary">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-3xl italic text-accent tracking-tighter">Event Horizon</h1>
            <p className="text-[10px] uppercase tracking-widest text-text-secondary font-bold">Synchronized Schedule</p>
          </div>
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          className="p-3 bg-accent text-bg rounded-sm hover:scale-105 transition-transform"
        >
          <Plus size={20} />
        </button>
      </header>

      <div className="bg-accent/5 border border-accent/20 p-6 rounded-sm space-y-4">
        <div className="flex items-center gap-2 text-accent">
          <Zap size={16} fill="currentColor" />
          <p className="text-[10px] uppercase tracking-[2px] font-bold">Optimal Study Windows (QC Analysis)</p>
        </div>
        <div className="space-y-3">
          {(() => {
            const todayStr = new Date().toISOString().split('T')[0];
            const todayTasks = tasks.filter(t => t.date === todayStr).sort((a, b) => a.time.localeCompare(b.time));
            
            if (todayTasks.length < 2) {
              return <p className="text-[11px] text-text-secondary leading-relaxed italic font-serif">Add more events to your schedule to see the best windows for study.</p>;
            }

            // Simple gap analysis
            const suggestions = [];
            for (let i = 0; i < todayTasks.length - 1; i++) {
              const current = todayTasks[i];
              const next = todayTasks[i+1];
              
              const currentEnd = new Date(`2000-01-01T${current.time}`);
              currentEnd.setHours(currentEnd.getHours() + (current.type === 'work' ? 8 : 1.5)); // Estimate durations
              
              const nextStart = new Date(`2000-01-01T${next.time}`);
              const gapMinutes = (nextStart.getTime() - currentEnd.getTime()) / (1000 * 60);

              if (gapMinutes >= 30) {
                suggestions.push(`You have a ${Math.floor(gapMinutes)} min gap after ${current.title}. Perfect for a micro-learning session.`);
              }
            }

            return suggestions.length > 0 ? (
              suggestions.slice(0, 2).map((s, idx) => (
                <div key={idx} className="flex gap-3 items-start">
                  <div className="w-1 h-1 rounded-full bg-accent mt-1.5 shrink-0" />
                  <p className="text-[11px] text-text-primary leading-tight italic font-serif">{s}</p>
                </div>
              ))
            ) : (
              <p className="text-[11px] text-text-secondary leading-relaxed italic font-serif">Your schedule is full today. Remember to take short breaks when possible.</p>
            );
          })()}
        </div>
      </div>

      <AnimatePresence>
        {isAdding && (
          <motion.div 
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="fixed inset-0 z-50 bg-bg p-8 flex flex-col gap-6"
          >
            <div className="flex justify-between items-center border-b border-border pb-6">
              <h2 className="text-3xl italic">Sync New Event</h2>
              <button onClick={() => setIsAdding(false)} className="p-2 border border-border text-text-secondary rounded-sm">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleAddTask} className="space-y-6">
              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-widest text-accent font-bold px-1">Event Title</label>
                <input 
                  type="text" 
                  required 
                  value={newTask.title}
                  onChange={e => setNewTask({...newTask, title: e.target.value})}
                  className="w-full bg-glass border border-border p-4 rounded-sm outline-none focus:border-accent"
                  placeholder="e.g. Calculus Exam"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-widest text-accent font-bold px-1">Date</label>
                  <input type="date" required value={newTask.date} onChange={e => setNewTask({...newTask, date: e.target.value})} className="w-full bg-glass border border-border p-4 rounded-sm text-sm" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-widest text-accent font-bold px-1">Time</label>
                  <input type="time" required value={newTask.time} onChange={e => setNewTask({...newTask, time: e.target.value})} className="w-full bg-glass border border-border p-4 rounded-sm text-sm" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-widest text-accent font-bold px-1">Category</label>
                <div className="grid grid-cols-2 gap-2">
                  {['class', 'work', 'study', 'deadline'].map(type => (
                    <button 
                      key={type}
                      type="button"
                      onClick={() => setNewTask({...newTask, type: type as any})}
                      className={`py-3 border rounded-sm text-[10px] uppercase tracking-widest font-bold transition-all ${newTask.type === type ? 'bg-accent text-bg border-accent' : 'border-border text-text-secondary'}`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>
              <button type="submit" className="w-full bg-accent text-bg py-5 rounded-sm font-bold uppercase tracking-[4px] mt-4 flex items-center justify-center gap-2">
                <Zap size={18} fill="currentColor" /> Sync Event
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex justify-between items-center bg-surface border border-border p-4 rounded-sm shadow-xl shadow-accent/5">
        <h2 className="text-sm font-bold uppercase tracking-[2px]">{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</h2>
        <div className="flex gap-2">
          <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)))} className="p-2 border border-border hover:border-accent">
            <ChevronLeft size={16} />
          </button>
          <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)))} className="p-2 border border-border hover:border-accent">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-px bg-border border border-border rounded-sm overflow-hidden shadow-2xl shadow-accent/5">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
          <div key={`${day}-${i}`} className="bg-surface p-2 text-center text-[10px] font-bold text-text-secondary uppercase">
            {day}
          </div>
        ))}
        {Array.from({ length: 42 }).map((_, i) => {
          const day = i - startDay + 1;
          const isDate = day > 0 && day <= days;
          const dateStr = `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
          const dayTasks = tasks.filter(t => t.date === dateStr);
          const isToday = day === new Date().getDate() && currentDate.getMonth() === new Date().getMonth();

          return (
            <div 
              key={`day-cell-${i}`} 
              onClick={() => {
                if (isDate) {
                  setCurrentDate(new Date(currentDate.setDate(day)));
                  setSelectedDateDetails(dateStr);
                }
              }}
              className={`min-h-[90px] p-1.5 bg-bg transition-all relative border border-border/10 ${isDate ? 'hover:bg-accent/5 cursor-pointer' : 'opacity-10'} ${selectedDateStr === dateStr ? 'bg-accent/10 border-accent/30' : ''}`}
            >
              {isDate && (
                <>
                  <div className="flex justify-between items-start">
                    <span className={`text-[8px] font-mono ${isToday ? 'bg-accent text-bg px-1 rounded-sm font-bold' : 'text-text-secondary'}`}>
                      {day.toString().padStart(2, '0')}
                    </span>
                  </div>
                  <div className="mt-1 space-y-0.5 overflow-hidden">
                    {dayTasks.map((t) => (
                      <div 
                        key={t.id} 
                        className={`text-[7px] leading-tight font-bold truncate px-1 rounded-sm bg-accent/5 border-l-2 ${t.color.replace('text-', 'border-')} uppercase tracking-tighter`}
                      >
                        {t.title}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>

      <AnimatePresence>
        {selectedDateDetails && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-bg/95 backdrop-blur-sm p-6 sm:p-10 flex items-center justify-center"
          >
            <div className="w-full max-w-md bg-surface border border-accent rounded-sm shadow-2xl p-6 sm:p-8 space-y-8 relative overflow-hidden">
               <div className="absolute top-0 right-0 p-4">
                 <button onClick={() => setSelectedDateDetails(null)} className="p-2 border border-border text-text-secondary hover:text-accent transition-colors">
                   <X size={24} />
                 </button>
               </div>

               <div className="space-y-1">
                 <p className="text-[10px] uppercase tracking-[3px] text-accent font-bold">Detail Horizon</p>
                 <h2 className="text-3xl italic">{selectedDateDetails}</h2>
               </div>

               <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
                 {tasks.filter(t => t.date === selectedDateDetails).length > 0 ? (
                   tasks.filter(t => t.date === selectedDateDetails).map(task => (
                    <div key={task.id} className="p-5 border border-border/50 bg-bg group flex justify-between items-center transition-all hover:border-accent">
                      <div className="flex items-center gap-4">
                        <div className={cn("p-3 border border-border bg-glass", task.color)}>
                          {task.type === 'work' ? <Bus size={18} /> : <CalendarIcon size={18} />}
                        </div>
                        <div>
                          <h4 className="text-sm font-bold uppercase tracking-tight">{task.title}</h4>
                          <div className="flex gap-2 mt-1">
                            <span className="text-[9px] uppercase tracking-widest text-text-secondary font-bold font-mono">{task.time}</span>
                            <span className={cn("text-[9px] uppercase tracking-widest font-bold", task.color)}>{task.type}</span>
                          </div>
                        </div>
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); deleteTask(task.id); }} className="p-2 text-text-secondary hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Trash2 size={16} />
                      </button>
                    </div>
                   ))
                 ) : (
                   <div className="py-10 text-center border border-dashed border-border opacity-30 italic font-serif">
                     No events synced for this date.
                   </div>
                 )}
               </div>

               <button 
                onClick={() => { setSelectedDateDetails(null); setIsAdding(true); }}
                className="w-full py-4 border border-accent text-accent font-bold uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 hover:bg-accent/5 transition-all"
               >
                 <Plus size={14} /> Add Event to this Date
               </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-accent/5 border border-accent/20 p-6 rounded-sm space-y-3">
        <div className="flex items-center gap-2 text-accent">
          <Flame size={16} fill="currentColor" />
          <p className="text-[10px] uppercase tracking-[2px] font-bold">Aequus Reminder</p>
        </div>
        <p className="text-[11px] text-text-secondary leading-relaxed italic font-serif">
          Schedules are monitored 24/7. Upcoming deadlines will trigger automated academic reminders to keep your Aequus score high.
        </p>
      </div>
    </motion.div>
  );
}
