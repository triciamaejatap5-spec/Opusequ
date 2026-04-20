import { motion } from 'motion/react';
import { 
  Zap,
  WifiOff, 
  Headphones, 
  ArrowRight,
  ShieldCheck,
  Coffee,
  Clock
} from 'lucide-react';

export default function FocusMode() {
  return (
    <div className="p-8 space-y-10 pb-32">
      <header className="space-y-4 border-b border-border pb-8">
        <div className="flex items-center gap-3 text-accent font-bold uppercase tracking-[4px] text-xs">
          <Zap size={18} fill="currentColor" />
          <span>Transit Focus</span>
        </div>
        <h2 className="text-3xl italic leading-tight">Golden Study Window</h2>
        <p className="text-text-secondary text-[11px] uppercase tracking-widest leading-relaxed">
          Optimized for your current 25-minute transit period.
        </p>
      </header>

      {/* Connectivity Status */}
      <div className="flex gap-2">
        <div className="flex-1 bg-glass border border-border p-3 rounded-sm flex items-center justify-center gap-3 transition-colors hover:border-accent group">
          <ShieldCheck size={14} className="text-accent opacity-60 group-hover:opacity-100" />
          <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest group-hover:text-text-primary">Offline Ready</span>
        </div>
        <div className="flex-1 bg-glass border border-border p-3 rounded-sm flex items-center justify-center gap-3 transition-colors hover:border-accent group">
          <WifiOff size={14} className="text-accent opacity-60 group-hover:opacity-100" />
          <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest group-hover:text-text-primary">Low Data</span>
        </div>
      </div>

      {/* Transit Recommendations */}
      <section className="space-y-6">
        <h3 className="text-[10px] uppercase tracking-[3px] font-bold text-text-secondary">Quick Progress Cards</h3>
        
        <div className="space-y-6">
          <motion.div 
            whileTap={{ scale: 0.99 }}
            className="p-8 bg-surface border border-accent/30 rounded-sm space-y-6 relative overflow-hidden group"
          >
            <div className="flex justify-between items-start relative z-10">
              <div className="p-3 border border-border text-accent">
                <Headphones size={24} />
              </div>
              <span className="status-pill leading-none text-[9px]">Audio Summary</span>
            </div>
            <div className="relative z-10">
              <h4 className="text-2xl font-serif italic text-text-primary leading-tight">Discrete Math: Sets Review</h4>
              <p className="text-xs text-text-secondary mt-2 opacity-60 uppercase tracking-widest">8 minutes • Text-to-Speech</p>
            </div>
            <button className="w-full bg-accent text-bg py-4 rounded-sm font-bold text-xs uppercase tracking-[3px] flex items-center justify-center gap-3 transition-all hover:bg-white relative z-10">
              Listen Now <ArrowRight size={16} />
            </button>
            <Zap className="absolute -right-10 -bottom-10 w-40 h-40 text-accent opacity-[0.03] rotate-12" />
          </motion.div>

          <div className="grid grid-cols-2 gap-2">
            <div className="bg-glass border border-border p-6 rounded-sm space-y-4 hover:border-accent transition-all cursor-pointer">
              <div className="p-2 border border-border text-accent w-fit">
                <Zap size={16} fill="currentColor" />
              </div>
              <h4 className="font-bold text-xs uppercase tracking-widest leading-tight">3-Min Quiz</h4>
              <p className="text-[11px] text-text-secondary italic serif font-light">Boolean Algebra Refresher.</p>
            </div>
            <div className="bg-glass border border-border p-6 rounded-sm space-y-4 hover:border-accent transition-all cursor-pointer">
              <div className="p-2 border border-border text-accent w-fit">
                <Coffee size={16} />
              </div>
              <h4 className="font-bold text-xs uppercase tracking-widest leading-tight">Micro-Task</h4>
              <p className="text-[11px] text-text-secondary italic serif font-light">Outline your next submission.</p>
            </div>
          </div>
        </div>
      </section>

      <div className="p-8 border-t border-border text-center">
        <div className="flex items-center justify-center gap-2 mb-4">
          <Clock size={14} className="text-accent" />
          <span className="text-[10px] uppercase tracking-widest text-text-secondary">Next Work Shift: 16:00 (4h remaining)</span>
        </div>
        <p className="text-sm font-serif italic text-text-secondary opacity-60">"Quality is not an act, it is a habit." Keep your study window active.</p>
      </div>
    </div>
  );
}
