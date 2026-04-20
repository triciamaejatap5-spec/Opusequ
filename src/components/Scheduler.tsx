import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Trash2, 
  MapPin, 
  Clock, 
  AlertCircle,
  Briefcase,
  GraduationCap,
  CheckCircle2,
  Zap,
  Calendar,
  X
} from 'lucide-react';
import { Task } from '../types';

interface SchedulerProps {
  onExit?: () => void;
}

export default function Scheduler({ onExit }: SchedulerProps) {
  const [view, setView] = useState<'week' | 'month' | 'list'>('week');
  const [isAdding, setIsAdding] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    time: '',
    date: 'April 19',
    type: 'study' as 'study' | 'work',
    alert: 'none'
  });
  const [alertConfirmation, setAlertConfirmation] = useState<string | null>(null);
  const [tasks, setTasks] = useState<Task[]>([
    { id: '1', title: 'Calculus III Deadline', type: 'study', time: '11:59 PM', date: 'April 20', completed: false, priority: 'high' },
    { id: '2', title: 'Service Crew Shift (QC)', type: 'work', time: '16:00 - 00:00', date: 'April 16', completed: false, priority: 'high' },
    { id: '3', title: 'Review Database Modules', type: 'study', time: '08:00 - 10:00', date: 'April 17', completed: true, priority: 'medium' },
  ]);

  const toggleComplete = (id: string) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const deleteTask = (id: string) => {
    setNotification(`Syncing views... Removing task from all schedules.`);
    setTasks(tasks.filter(t => t.id !== id));
    setTimeout(() => setNotification(null), 2000);
  };

  const [notification, setNotification] = useState<string | null>(null);

  const daysLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  const datesWeek = Array.from({ length: 7 }, (_, i) => 14 + i);
  const monthDates = Array.from({ length: 30 }, (_, i) => i + 1);
  const monthStartPadding = Array.from({ length: 3 }, (_, i) => null); // April 2026 starts on Wed

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.title || !newTask.time) return;
    
    const task: Task = {
      id: Math.random().toString(36).substr(2, 9),
      title: newTask.title,
      time: newTask.time,
      date: newTask.date,
      type: newTask.type,
      completed: false,
      priority: 'medium'
    };
    
    setTasks([...tasks, task]);
    setIsAdding(false);
    
    if (newTask.alert !== 'none') {
      setAlertConfirmation(`Syncing to calendar... Custom alert set for ${newTask.date}. I’ll notify you at ${newTask.time} so you can switch from student mode to work mode.`);
      setTimeout(() => setAlertConfirmation(null), 5000);
    }
    
    setNewTask({ title: '', time: '', date: 'April 19', type: 'study', alert: 'none' });
  };

  return (
    <div className="p-8 space-y-8 pb-32 h-full overflow-y-auto scrollbar-hide relative">
      <AnimatePresence>
        {notification && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-24 left-8 right-8 z-[60] bg-accent text-bg p-4 rounded-sm text-[10px] uppercase tracking-widest font-bold shadow-2xl flex items-center gap-3 italic"
          >
            <Zap size={16} fill="currentColor" />
            {notification}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {alertConfirmation && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-24 left-8 right-8 z-[60] bg-accent text-bg p-4 rounded-sm text-[10px] uppercase tracking-widest font-bold shadow-2xl flex items-center gap-3"
          >
            <AlertCircle size={16} />
            {alertConfirmation}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isAdding && (
          <motion.div 
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="fixed inset-0 z-50 bg-bg/95 p-8 flex flex-col justify-center gap-8"
          >
            <div className="flex justify-between items-center border-b border-border pb-6">
              <h2 className="text-3xl italic">Add Task</h2>
              <button 
                onClick={() => setIsAdding(false)}
                className="p-2 border border-border text-text-secondary rounded-sm"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddTask} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest text-accent font-bold">Task Name</label>
                <input 
                  type="text" 
                  autoFocus
                  required
                  value={newTask.title}
                  onChange={e => setNewTask({...newTask, title: e.target.value})}
                  placeholder="e.g. Calculus Shift"
                  className="w-full bg-surface border border-border rounded-sm py-4 px-4 text-sm focus:border-accent outline-none text-text-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest text-accent font-bold">Time</label>
                  <input 
                    type="text" 
                    required
                    value={newTask.time}
                    onChange={e => setNewTask({...newTask, time: e.target.value})}
                    placeholder="e.g. 14:00"
                    className="w-full bg-surface border border-border rounded-sm py-4 px-4 text-sm focus:border-accent outline-none text-text-primary"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest text-accent font-bold">Planned Date</label>
                  <input 
                    type="text" 
                    required
                    value={newTask.date}
                    onChange={e => setNewTask({...newTask, date: e.target.value})}
                    placeholder="e.g. April 20"
                    className="w-full bg-surface border border-border rounded-sm py-4 px-4 text-sm focus:border-accent outline-none text-text-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest text-accent font-bold">Category</label>
                  <select 
                    value={newTask.type}
                    onChange={e => setNewTask({...newTask, type: e.target.value as any})}
                    className="w-full bg-surface border border-border rounded-sm py-4 px-4 text-sm focus:border-accent outline-none text-text-primary appearance-none"
                  >
                    <option value="study">Academic (Study)</option>
                    <option value="work">Job (Shift)</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest text-accent font-bold">Alert Setup</label>
                  <select 
                    value={newTask.alert}
                    onChange={e => setNewTask({...newTask, alert: e.target.value})}
                    className="w-full bg-surface border border-border rounded-sm py-4 px-4 text-sm focus:border-accent outline-none text-text-primary appearance-none"
                  >
                    <option value="none">No Alert</option>
                    <option value="5min">5 minutes before</option>
                    <option value="15min">15 minutes before</option>
                    <option value="30min">30 minutes before</option>
                    <option value="custom">Custom Time</option>
                  </select>
                </div>
              </div>

              <button 
                type="submit"
                className="w-full bg-accent text-bg py-5 rounded-sm font-bold uppercase tracking-[4px] shadow-lg shadow-accent/10 mt-8"
              >
                Schedule Task
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <header className="flex justify-between items-center border-b border-border pb-6 shrink-0 relative">
        <div className="flex items-center gap-3">
          {onExit && (
            <button onClick={onExit} className="p-2 -ml-2 text-text-secondary hover:text-accent transition-colors">
              <X size={20} />
            </button>
          )}
          <div>
            <h2 className="text-3xl italic">Work-Study Map</h2>
            <p className="text-text-secondary text-[10px] uppercase tracking-widest mt-1">Synchronized Task Schedule</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-glass border border-border p-1 rounded-sm">
            {['week', 'month', 'list'].map((v) => (
              <button
                key={v}
                onClick={() => setView(v as any)}
                className={`px-3 py-1.5 text-[9px] uppercase tracking-widest font-bold rounded-sm transition-all ${view === v ? 'bg-accent text-bg shadow-sm' : 'text-text-secondary hover:text-text-primary'}`}
              >
                {v}
              </button>
            ))}
          </div>
          <button 
            onClick={() => setIsAdding(true)}
            className="p-2 border border-accent text-accent hover:bg-accent/10 transition-colors rounded-sm shadow-[0_0_15px_rgba(212,175,55,0.1)]"
          >
            <Plus size={20} />
          </button>
        </div>
      </header>

      <div className="bg-accent/5 border border-accent/20 p-3 rounded-sm text-[10px] uppercase tracking-widest text-accent text-center font-bold">
        Tap the Plus icon to add your shift or class
      </div>

      {view === 'week' && (
        <section className="space-y-6">
          <div className="grid grid-cols-7 gap-1">
            {daysLabels.map((d, i) => <div key={i} className="text-[10px] text-center text-text-secondary font-bold py-2">{d}</div>)}
            {datesWeek.map(d => (
              <div 
                key={d} 
                className={`aspect-square flex items-center justify-center text-xs border rounded-sm transition-all ${d === 17 ? 'bg-accent text-bg border-accent font-bold' : 'border-border text-text-secondary'}`}
              >
                {d}
              </div>
            ))}
          </div>
          
          <div className="space-y-4">
            <h4 className="text-[10px] uppercase tracking-widest text-text-secondary font-bold">Visual Allocation (Today)</h4>
            <div className="h-6 w-full bg-border rounded-full overflow-hidden flex">
              <div className="h-full bg-blue-500 w-[40%]" title="Work Shift" />
              <div className="h-full bg-accent/20 w-[10%]" title="Transit" />
              <div className="h-full bg-accent w-[30%]" title="Study Sessions" />
              <div className="h-full bg-border w-[20%]" title="Rest" />
            </div>
            <div className="flex gap-4">
              <div className="flex items-center gap-1.5 text-[9px] text-text-secondary uppercase tracking-widest">
                <div className="w-2 h-2 bg-blue-500 rounded-full" /> Work
              </div>
              <div className="flex items-center gap-1.5 text-[9px] text-text-secondary uppercase tracking-widest">
                <div className="w-2 h-2 bg-accent rounded-full" /> Study
              </div>
              <div className="flex items-center gap-1.5 text-[9px] text-text-secondary uppercase tracking-widest">
                <div className="w-2 h-2 bg-border rounded-full border border-accent/20" /> Gap
              </div>
            </div>
          </div>
        </section>
      )}

      {view === 'month' && (
        <section className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-[11px] font-serif italic text-text-primary underline decoration-accent/30 decoration-2">April 2026</h3>
            <div className="flex gap-2">
              <div className="flex items-center gap-1 text-[8px] uppercase tracking-widest text-text-secondary"><div className="w-1.5 h-1.5 bg-blue-500 rounded-full" /> Shift</div>
              <div className="flex items-center gap-1 text-[8px] uppercase tracking-widest text-text-secondary"><div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" /> Class</div>
              <div className="flex items-center gap-1 text-[8px] uppercase tracking-widest text-accent font-bold"><div className="w-3 h-1.5 bg-accent/20 border border-accent/30 rounded-full" /> Double Duty</div>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-1">
            {daysLabels.map((d, i) => <div key={i} className="text-[10px] text-center text-text-secondary font-bold opacity-40">{d}</div>)}
            {monthStartPadding.map((_, i) => <div key={`pad-${i}`} className="aspect-square opacity-0" />)}
            {monthDates.map(d => {
              const dayString = `April ${d}`;
              const dayTasks = tasks.filter(t => t.date === dayString);
              const dayHasWork = dayTasks.some(t => t.type === 'work');
              const dayHasClass = dayTasks.some(t => t.type === 'study');
              const double = dayHasWork && dayHasClass;

              return (
                <div 
                  key={d} 
                  className={`aspect-square flex flex-col items-center justify-center text-[10px] border rounded-sm relative transition-all ${
                    d === 19 ? 'border-accent bg-accent/5 font-bold' : 
                    double ? 'bg-accent/20 border-accent/40 shadow-[0_0_10px_rgba(212,175,55,0.1)]' : 'border-border text-text-secondary'
                  }`}
                >
                  <span className={double ? 'text-accent' : ''}>{d}</span>
                  <div className="flex gap-0.5 mt-1">
                    {dayHasWork && <div className="w-1 h-1 bg-blue-500 rounded-full" />}
                    {dayHasClass && <div className="w-1 h-1 bg-emerald-500 rounded-full" />}
                  </div>
                  {double && <div className="absolute top-0.5 right-0.5 w-1 h-1 bg-accent rounded-full animate-pulse" />}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {view === 'list' && (
        <div className="space-y-2">
          {tasks.map((task) => (
            <motion.div 
              layout
              key={task.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className={`flex items-center gap-6 p-5 border border-border/50 rounded-sm transition-all shadow-sm ${
                task.completed ? 'opacity-30' : 'bg-glass hover:border-accent/30'
              }`}
            >
              <div className="text-[10px] font-mono text-accent w-16 shrink-0 font-bold">{task.date.replace('April ', '04/')}</div>
              <div className="flex-1 min-w-0">
                <h4 className={`text-sm tracking-tight truncate ${task.completed ? 'line-through' : 'text-text-primary font-medium'}`}>{task.title}</h4>
                <div className="flex items-center gap-3 mt-1">
                  <p className="text-[9px] text-text-secondary uppercase tracking-widest">{task.time}</p>
                  <div className={`w-1 h-1 rounded-full ${task.type === 'work' ? 'bg-blue-500' : 'bg-emerald-500'}`} />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => toggleComplete(task.id)}
                  className={`p-2 transition-colors ${task.completed ? 'text-accent' : 'text-border hover:text-accent'}`}
                >
                  <CheckCircle2 size={18} />
                </button>
                <button 
                  onClick={() => deleteTask(task.id)}
                  className="p-2 text-border hover:text-red-500 transition-colors"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </motion.div>
          ))}
          {tasks.length === 0 && (
            <div className="p-12 text-center border border-dashed border-border rounded-sm bg-surface/50">
               <p className="text-xs text-text-secondary italic serif">No scheduled tasks. Your balance is clear.</p>
            </div>
          )}
        </div>
      )}

      {/* Golden Study Window Identification */}
      <div className="bg-glass border border-accent/20 p-4 rounded-sm flex gap-4 relative overflow-hidden group">
        <Zap className="text-accent shrink-0" size={18} fill="currentColor" />
        <div className="space-y-1">
          <h4 className="text-[10px] uppercase tracking-widest text-accent font-bold">Smart study window suggested</h4>
          <p className="text-xs text-text-secondary leading-relaxed">
            Your gap at <span className="text-text-primary font-bold">14:00</span> is safe for a Quick Quiz. Readiness boost expected: <span className="text-accent">+2%</span>.
          </p>
        </div>
      </div>

      <div className="border border-border p-6 rounded-sm bg-surface relative">
        <h3 className="text-xs uppercase tracking-[3px] text-accent font-bold mb-3 italic">Exam Readiness Tracker</h3>
        <p className="text-xs text-text-secondary leading-relaxed serif italic">
          Maintaining your streak and completing daily quizzes improves your Exam Readiness by an average of 1.5% daily. You are currently in the <span className="text-accent font-bold">Top 15%</span> of QCU student-workers.
        </p>
        {onExit && (
          <button 
            onClick={onExit}
            className="mt-6 w-full py-3 border border-border text-[10px] uppercase tracking-widest text-text-secondary hover:text-accent hover:border-accent transition-all font-bold"
          >
            Hit the Exit button to return to the dashboard
          </button>
        )}
      </div>
    </div>
  );
}
