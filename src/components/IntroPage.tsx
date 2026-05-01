import React from 'react';
import { motion } from 'motion/react';
import { Sparkles, Zap, Calendar, ArrowRight } from 'lucide-react';

interface IntroPageProps {
  onGetStarted: () => void;
}

export default function IntroPage({ onGetStarted }: IntroPageProps) {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="p-8 h-full flex flex-col justify-between bg-bg text-text-primary overflow-y-auto"
    >
      <div className="space-y-12 pt-12">
        {/* Hero Section */}
        <header className="space-y-4">
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <h1 className="text-6xl font-bold italic text-accent tracking-tighter">Opusequ</h1>
            <p className="text-text-secondary text-xs uppercase tracking-[3px] font-bold mt-2">
              SDG 4: Quality Education
            </p>
          </motion.div>
          <motion.p 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-sm font-serif italic text-text-secondary leading-relaxed border-l-2 border-accent pl-4"
          >
            Balancing Task and Balance for the QCU Student-Worker.
          </motion.p>
        </header>

        {/* Purpose Statement */}
        <motion.section 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="space-y-4"
        >
          <h2 className="text-[10px] uppercase tracking-[4px] text-text-secondary font-bold">Our Mission</h2>
          <p className="text-sm leading-relaxed serif">
            Opusequ is designed to help you synchronize rigid work shifts with academic goals through micro-learning, automated scheduling, and exam readiness tracking.
          </p>
        </motion.section>

        {/* Feature Preview Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5 }}
          className="space-y-6 pt-4"
        >
          <h2 className="text-[10px] uppercase tracking-[4px] text-accent font-bold">Empower Your Hustle</h2>
          <div className="space-y-4">
            <div className="flex items-start gap-4 p-4 border border-border bg-accent/5 rounded-sm">
              <Zap className="text-accent shrink-0 mt-1" size={20} />
              <div className="space-y-1">
                <h3 className="text-xs font-bold uppercase tracking-widest">Bite-Sized Quizzes</h3>
                <p className="text-[10px] text-text-secondary italic leading-relaxed">Quick, high-impact 5-minute study sprints designed for busy shifts.</p>
              </div>
            </div>
            
            <div className="flex items-start gap-4 p-4 border border-border bg-accent/5 rounded-sm">
              <Sparkles className="text-accent shrink-0 mt-1" size={20} />
              <div className="space-y-1">
                <h3 className="text-xs font-bold uppercase tracking-widest">AI Assistant</h3>
                <p className="text-[10px] text-text-secondary italic leading-relaxed">24/7 academic support to explain complex concepts instantly.</p>
              </div>
            </div>
          </div>
        </motion.section>

        {/* Value Propositions */}
        <div className="grid grid-cols-1 gap-4">
          <motion.div 
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="p-6 border border-border bg-glass rounded-sm space-y-3 group hover:border-accent transition-colors"
          >
            <div className="flex items-center gap-3 text-accent">
              <Calendar size={20} />
              <h3 className="text-xs uppercase tracking-widest font-bold">Task (Opus)</h3>
            </div>
            <p className="text-[11px] text-text-secondary italic">
              Stay organized with synchronized work-study calendars. Never miss a deadline or a shift.
            </p>
          </motion.div>

          <motion.div 
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="p-6 border border-border bg-glass rounded-sm space-y-3 group hover:border-accent transition-colors"
          >
            <div className="flex items-center gap-3 text-accent">
              <Sparkles size={20} />
              <h3 className="text-xs uppercase tracking-widest font-bold">Balance (Aequus)</h3>
            </div>
            <p className="text-[11px] text-text-secondary italic">
              Achieve academic success without the burnout. Smart algorithms suggest the best study windows.
            </p>
          </motion.div>
        </div>
      </div>

      {/* Call to Action */}
      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.7 }}
        className="pb-8 pt-12"
      >
        <button 
          onClick={onGetStarted}
          className="w-full bg-accent text-bg py-5 rounded-sm font-bold uppercase tracking-[4px] flex items-center justify-center gap-3 group transition-all active:scale-[0.98] shadow-lg shadow-accent/10"
        >
          Get Started
          <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
        </button>
        <div className="mt-4 text-center">
            <span className="text-[9px] uppercase tracking-widest text-text-secondary opacity-40 font-bold">
                Optimized for Quezon City University Students
            </span>
        </div>
      </motion.div>
    </motion.div>
  );
}
