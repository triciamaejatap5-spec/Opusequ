import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';
import { 
  User, 
  Bell, 
  Sun, 
  Moon, 
  Shield, 
  LogOut, 
  ChevronRight, 
  Info,
  Circle,
  X
} from 'lucide-react';

interface SettingsProps {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  onExit?: () => void;
}

export default function Settings({ theme, toggleTheme, onExit }: SettingsProps) {
  const [notifications, setNotifications] = useState(true);
  const [dataSaver, setDataSaver] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);

  const sections = [
    {
      title: 'Profile & Account',
      items: [
        { icon: <User size={18} />, label: 'Student Information', value: 'BSIT | QCU' },
        { 
          icon: <Shield size={18} />, 
          label: 'Data Privacy', 
          value: 'Protected',
          action: () => setShowPrivacy(true)
        },
      ]
    },
    {
      title: 'Preferences',
      items: [
        { 
          icon: theme === 'dark' ? <Moon size={18} /> : <Sun size={18} />, 
          label: 'Interface Theme', 
          value: theme === 'dark' ? 'Dark Mode' : 'Light Mode',
          action: toggleTheme
        },
        { 
          icon: <Bell size={18} />, 
          label: 'Smart Reminders', 
          value: notifications ? 'Active' : 'Muted',
          toggle: () => setNotifications(!notifications),
          isToggled: notifications
        },
        { 
          icon: <Info size={18} />, 
          label: 'Low-Data Mode', 
          value: dataSaver ? 'Enabled' : 'Disabled',
          toggle: () => setDataSaver(!dataSaver),
          isToggled: dataSaver
        }
      ]
    }
  ];

  return (
    <div className="p-8 space-y-10 pb-32 h-full overflow-y-auto scrollbar-hide relative">
      <AnimatePresence>
        {showPrivacy && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-50 bg-bg/95 p-8 flex flex-col justify-center gap-8"
          >
            <div className="flex justify-between items-center border-b border-border pb-6">
              <h2 className="text-3xl italic">Data Privacy</h2>
              <button 
                onClick={() => setShowPrivacy(false)}
                className="p-2 border border-border text-text-secondary rounded-sm"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-6">
              <p className="text-xs text-text-secondary leading-relaxed">
                Student information is encrypted and isolated. We don't sell your data; we use it only to analyze your study habits and suggest the best <span className="text-accent font-bold">Study Windows</span> for your academic success.
              </p>
              
              <div className="bg-glass border border-border p-5 space-y-4">
                <div className="flex items-start gap-4">
                  <div className="p-2 border border-accent/20 text-accent rounded-sm"><Shield size={16} /></div>
                  <div>
                    <h4 className="text-[10px] uppercase tracking-widest font-bold text-text-primary">End-to-End Security</h4>
                    <p className="text-[9px] text-text-secondary leading-normal mt-1 italic">Personal schedules are private to your device.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="p-2 border border-accent/20 text-accent rounded-sm"><Info size={16} /></div>
                  <div>
                    <h4 className="text-[10px] uppercase tracking-widest font-bold text-text-primary">Academic Use ONLY</h4>
                    <p className="text-[9px] text-text-secondary leading-normal mt-1 italic">Data analysis serves goal SDG 4 (Quality Education).</p>
                  </div>
                </div>
              </div>

              <button 
                onClick={() => setShowPrivacy(false)}
                className="w-full bg-accent text-bg py-4 rounded-sm font-bold uppercase tracking-[4px]"
              >
                Acknowledge
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <header className="border-b border-border pb-6 flex justify-between items-end">
        <div className="flex items-center gap-3">
          {onExit && (
            <button onClick={onExit} className="p-2 -ml-2 text-text-secondary hover:text-accent transition-colors">
              <X size={20} />
            </button>
          )}
          <div>
            <h2 className="text-3xl italic">Settings</h2>
            <p className="text-text-secondary text-[10px] uppercase tracking-widest mt-1">Refine your experience</p>
          </div>
        </div>
        {onExit && (
           <button onClick={onExit} className="text-[10px] font-bold uppercase tracking-widest text-text-secondary hover:text-accent transition-colors">
             Exit
           </button>
        )}
      </header>

      <div className="space-y-10">
        {sections.map((section, idx) => (
          <div key={idx} className="space-y-4">
            <h3 className="text-[10px] uppercase tracking-[3px] text-accent font-bold px-1">{section.title}</h3>
            <div className="space-y-1">
              {section.items.map((item, i) => (
                <div 
                  key={i}
                  onClick={item.action}
                  className={`flex items-center gap-4 p-5 bg-glass border-b border-border/50 group transition-all ${item.action ? 'cursor-pointer hover:bg-white/5' : ''}`}
                >
                  <div className="text-accent group-hover:scale-110 transition-transform">
                    {item.icon}
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-bold text-text-primary uppercase tracking-widest">{item.label}</p>
                    <p className="text-[10px] text-text-secondary mt-0.5">{item.value}</p>
                  </div>
                  {item.toggle ? (
                    <button 
                      onClick={(e) => { e.stopPropagation(); item.toggle?.(); }}
                      className={`w-10 h-5 rounded-full relative transition-colors ${item.isToggled ? 'bg-accent' : 'bg-border'}`}
                    >
                      <motion.div 
                        animate={{ x: item.isToggled ? 22 : 2 }}
                        className="w-4 h-4 bg-white rounded-full absolute top-0.5"
                      />
                    </button>
                  ) : (
                    <ChevronRight size={14} className="opacity-20 group-hover:opacity-100 transition-opacity" />
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <button 
        onClick={() => signOut(auth)}
        className="w-full flex items-center justify-center gap-3 p-5 border border-red-500/20 text-red-500 text-[10px] uppercase tracking-[4px] font-bold hover:bg-red-500/5 transition-all"
      >
        <LogOut size={16} />
        Sign Out
      </button>

      <div className="text-center space-y-2 opacity-20 py-10">
        <p className="text-[9px] uppercase tracking-widest font-bold">Opusequ v2.4.0</p>
        <p className="text-[9px] uppercase tracking-widest italic">Designed for QCU Students</p>
      </div>
    </div>
  );
}
