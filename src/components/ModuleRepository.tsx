import React, { useState } from 'react';
import { Search, Folder, FileText, ChevronRight, Headphones, Play, Pause, SkipForward, X, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ModuleRepositoryProps {
  onExit?: () => void;
}

export default function ModuleRepository({ onExit }: ModuleRepositoryProps) {
  const [audioMode, setAudioMode] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeAudio, setActiveAudio] = useState<string | null>(null);
  const [selectedModule, setSelectedModule] = useState<any | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeCollection, setActiveCollection] = useState('All');
  const [notification, setNotification] = useState<string | null>(null);
  const [isAddingModule, setIsAddingModule] = useState(false);
  const [newModule, setNewModule] = useState({
    title: '',
    category: 'Core Subjects',
    type: 'note'
  });

  const categories = ["All", "Core Subjects", "General Education", "Work Training", "Self-Growth"];
  const [docs, setDocs] = useState([
    { id: '1', title: "Discrete Math - Sets", category: "Core Subjects", size: "1.2 MB", date: "2d ago", duration: "12:45" },
    { id: '2', title: "Database Systems 101", category: "Core Subjects", size: "2.4 MB", date: "5d ago", duration: "18:20" },
    { id: '3', title: "7-Eleven Safety Protocols", category: "Work Training", size: "800 KB", date: "1w ago", duration: "05:10" },
    { id: '4', title: "Ethics in IT", category: "General Education", size: "1.5 MB", date: "2w ago", duration: "14:30" },
    { id: '5', title: "Time Management for Students", category: "Self-Growth", size: "900 KB", date: "3w ago", duration: "08:15" },
  ]);

  const handleSearch = () => {
    setSearchQuery(searchTerm);
    if (searchTerm) {
      setNotification(`Searching for "${searchTerm}"... Matching module ready.`);
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const handleNextAudio = () => {
    const currentIndex = docs.findIndex(doc => doc.title === activeAudio);
    const nextIndex = (currentIndex + 1) % docs.length;
    setActiveAudio(docs[nextIndex].title);
    setIsPlaying(true);
    setNotification(`Advancing to next module: ${docs[nextIndex].title}`);
    setTimeout(() => setNotification(null), 3000);
  };

  const filteredDocuments = docs.filter(doc => {
    const matchesSearch = doc.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCollection = activeCollection === 'All' || doc.category === activeCollection;
    return matchesSearch && matchesCollection;
  });

  const selectCollection = (cat: string) => {
    setActiveCollection(cat);
    setNotification(`Accessing ${cat} collection...`);
    setTimeout(() => setNotification(null), 3000);
  };

  const handleAddModule = (e: React.FormEvent) => {
    e.preventDefault();
    const module = {
      id: Math.random().toString(36).substr(2, 9),
      title: newModule.title,
      category: newModule.category,
      size: "Self-Added",
      date: "Just now",
      duration: "05:00"
    };
    setDocs([module, ...docs]);
    setIsAddingModule(false);
    setNewModule({ title: '', category: 'Core Subjects', type: 'note' });
    setNotification(`Module synced to ${newModule.category}! Available for self-directed learning.`);
    setTimeout(() => setNotification(null), 4000);
  };

  const suggestedMaterials = docs.filter(doc => !filteredDocuments.includes(doc)).slice(0, 2);

  if (selectedModule) {
    return (
      <div className="p-8 space-y-8 h-full flex flex-col relative bg-bg">
        <header className="flex justify-between items-center border-b border-border pb-6">
          <div className="flex items-center gap-3">
            <button onClick={() => setSelectedModule(null)} className="p-2 -ml-2 text-text-secondary hover:text-accent transition-colors">
              <X size={24} />
            </button>
            <div>
              <h2 className="text-2xl italic">{selectedModule.title}</h2>
              <p className="text-[10px] uppercase tracking-widest text-text-secondary mt-1">Module Contents</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => { setAudioMode(true); setActiveAudio(selectedModule.title); setIsPlaying(true); setSelectedModule(null); }}
              className="p-3 border border-accent text-accent rounded-sm flex items-center gap-2"
            >
              <Headphones size={18} />
              <span className="text-[10px] uppercase tracking-widest font-bold">Listen</span>
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto space-y-6 serif leading-relaxed text-sm text-text-primary px-2">
           <div className="bg-glass border border-border p-6 rounded-sm space-y-4">
              <h3 className="text-lg font-serif italic text-accent underline decoration-accent/20">Learning Objectives</h3>
              <p>By the end of this module, the student will be able to define core concepts of {selectedModule.title.split(' - ')[0]} and apply them to standard academic problems.</p>
           </div>
           
           <div className="space-y-4">
              <p>This study material is optimized for mobile-first readability. The content is broken down into concise sections to facilitate rapid review during work breaks or commutes.</p>
              <p>Focusing on high-impact definitions and visual charts to reinforce memory retention.</p>
              <div className="h-40 bg-accent/5 border border-dashed border-accent/20 flex items-center justify-center text-[10px] uppercase tracking-widest text-accent font-bold">
                 Visual Reference Diagram Loading...
              </div>
              <p>The "Task-Balance" approach ensures that even 5 minutes of focused reading contributes to your overall Exam Readiness score.</p>
           </div>
        </div>

        <button 
          onClick={() => setSelectedModule(null)}
          className="w-full bg-accent text-bg py-5 rounded-sm font-bold uppercase tracking-[4px]"
        >
          Close Module
        </button>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-10 pb-48 h-full overflow-y-auto scrollbar-hide relative">
      <AnimatePresence>
        {notification && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-24 left-8 right-8 z-[60] bg-accent text-bg p-4 rounded-sm text-[10px] uppercase tracking-widest font-bold shadow-2xl"
          >
            {notification}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isAddingModule && (
          <motion.div 
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="fixed inset-0 z-50 bg-bg/95 p-8 flex flex-col justify-center gap-8"
          >
            <div className="flex justify-between items-center border-b border-border pb-6">
              <h2 className="text-3xl italic">Add Module</h2>
              <button 
                onClick={() => setIsAddingModule(false)}
                className="p-2 border border-border text-text-secondary rounded-sm"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddModule} className="space-y-6 text-left">
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest text-accent font-bold px-1">Content Title</label>
                <input 
                  type="text" 
                  autoFocus
                  required
                  value={newModule.title}
                  onChange={e => setNewModule({...newModule, title: e.target.value})}
                  placeholder="e.g. My Study Notes"
                  className="w-full bg-surface border border-border rounded-sm py-4 px-4 text-sm focus:border-accent outline-none text-text-primary"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest text-accent font-bold px-1">Target Collection</label>
                <select 
                  value={newModule.category}
                  onChange={e => setNewModule({...newModule, category: e.target.value})}
                  className="w-full bg-surface border border-border rounded-sm py-4 px-4 text-sm focus:border-accent outline-none text-text-primary appearance-none"
                >
                  {categories.filter(c => c !== 'All').map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest text-accent font-bold px-1">Resource Type</label>
                <div className="grid grid-cols-2 gap-2">
                   {['note', 'link'].map(t => (
                     <button
                       key={t}
                       type="button"
                       onClick={() => setNewModule({...newModule, type: t})}
                       className={`py-3 rounded-sm border text-[10px] uppercase tracking-widest font-bold transition-all ${newModule.type === t ? 'bg-accent text-bg border-accent' : 'border-border text-text-secondary'}`}
                     >
                       {t}
                     </button>
                   ))}
                </div>
              </div>

              <button 
                type="submit"
                className="w-full bg-accent text-bg py-5 rounded-sm font-bold uppercase tracking-[4px] shadow-lg shadow-accent/10 mt-8"
              >
                Sync to Library
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <header className="space-y-6 border-b border-border pb-8">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            {onExit && (
              <button onClick={onExit} className="p-2 -ml-2 text-text-secondary hover:text-accent transition-colors">
                <X size={20} />
              </button>
            )}
            <h2 className="text-3xl italic">Knowledge Base</h2>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => setIsAddingModule(true)}
              className="p-3 border border-accent text-accent rounded-sm hover:bg-accent/10 transition-all flex items-center gap-2"
            >
              <Plus size={18} />
              <span className="text-[10px] uppercase tracking-widest font-bold hidden xs:block">Add Module</span>
            </button>
            <button 
              onClick={() => setAudioMode(!audioMode)}
              className={`p-3 border rounded-sm transition-all flex items-center gap-2 ${audioMode ? 'bg-accent text-bg border-accent shadow-[0_0_20px_rgba(212,175,55,0.2)]' : 'border-border text-text-secondary'}`}
            >
              <Headphones size={18} />
              <span className="text-[10px] uppercase tracking-widest font-bold hidden xs:block">{audioMode ? 'Audio ON' : 'Audio Mode'}</span>
            </button>
          </div>
        </div>
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary group-focus-within:text-accent transition-colors" size={16} />
          <input 
            type="text" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Search documents..." 
            className="w-full bg-surface border border-border rounded-sm py-4 pl-12 pr-28 text-sm focus:border-accent outline-none text-text-primary placeholder:text-text-secondary/50 transition-all font-sans"
          />
          <button 
            onClick={handleSearch}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-accent text-bg px-4 py-2 rounded-sm text-[10px] font-bold uppercase tracking-widest hover:bg-white transition-colors"
          >
            Enter
          </button>
        </div>
        <div className="bg-accent/5 border border-accent/20 p-2 text-[10px] uppercase tracking-widest text-accent text-center font-bold">
           Tap the Plus icon to upload new study materials
        </div>
      </header>

      <div className="space-y-10">
        <section className="space-y-4">
          <h3 className="text-[10px] uppercase tracking-[3px] font-bold text-text-secondary">Collections</h3>
          <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide">
            {categories.map((cat, i) => (
              <button 
                key={i} 
                onClick={() => selectCollection(cat)}
                className={`whitespace-nowrap bg-bg border px-6 py-3 rounded-sm text-[11px] font-bold uppercase tracking-widest transition-all ${
                  activeCollection === cat ? 'border-accent text-accent bg-accent/5 shadow-sm' : 'border-border text-text-secondary hover:text-accent hover:border-accent'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-6">
          <div className="flex justify-between items-center px-1">
            <h3 className="text-[10px] uppercase tracking-[3px] font-bold text-text-secondary">Recent Repository</h3>
            <Folder size={14} className="text-text-secondary opacity-40" />
          </div>
          
          <div className="space-y-1">
            {filteredDocuments.length > 0 ? (
              filteredDocuments.map((doc) => (
                <motion.div 
                  key={doc.id}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => {
                    if (audioMode) {
                      setActiveAudio(doc.title);
                      setIsPlaying(true);
                    } else {
                      setSelectedModule(doc);
                    }
                  }}
                  className={`flex items-center gap-6 p-5 bg-glass border-b border-border/50 group cursor-pointer hover:bg-surface transition-all ${activeAudio === doc.title ? 'border-l-2 border-l-accent bg-accent/5' : ''}`}
                >
                  <div className={`p-3 bg-bg border transition-all ${activeAudio === doc.title ? 'border-accent text-accent animate-pulse' : 'border-border text-accent group-hover:border-accent'}`}>
                    {audioMode ? <Play size={18} fill={isPlaying && activeAudio === doc.title ? 'currentColor' : 'none'} /> : <FileText size={18} />}
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm tracking-tight text-text-primary">{doc.title}</h4>
                    <p className="text-[10px] text-text-secondary uppercase tracking-widest font-medium mt-1 opacity-60">
                      {audioMode ? `Length: ${doc.duration}` : `${doc.size} • ${doc.date}`}
                    </p>
                  </div>
                  <ChevronRight size={16} className="text-text-secondary opacity-20 group-hover:opacity-100 group-hover:text-accent transition-all" />
                </motion.div>
              ))
            ) : (
              <div className="space-y-6">
                <div className="p-10 text-center border-2 border-dashed border-border rounded-sm">
                  <p className="text-xs text-text-secondary font-medium serif italic">No documents found for "{searchQuery}". Press Enter to retry or check suggestions below.</p>
                </div>
                
                <div className="space-y-4">
                  <h4 className="text-[10px] uppercase tracking-widest text-accent font-bold px-2">Suggested Materials</h4>
                  <div className="space-y-1">
                    {suggestedMaterials.map(doc => (
                      <div 
                        key={doc.id}
                        onClick={() => setSelectedModule(doc)}
                        className="flex items-center gap-6 p-4 bg-surface border-b border-border/50 cursor-pointer hover:bg-glass transition-all"
                      >
                         <FileText size={18} className="text-text-secondary opacity-40" />
                         <span className="text-sm text-text-secondary">{doc.title}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        <div className="border border-accent/20 p-6 rounded-sm bg-accent/5">
          <h4 className="text-[10px] uppercase tracking-[3px] text-accent font-bold mb-2 italic">Audio Learning Optimization</h4>
          <p className="text-xs text-text-secondary leading-relaxed serif italic">
            Commute-ready summaries. Audio mode allows hands-free review while transit or working shifts. 
          </p>
        </div>
        {onExit && (
          <button 
            onClick={onExit}
            className="w-full py-4 border border-border text-[10px] uppercase tracking-[4px] font-bold hover:text-accent hover:border-accent transition-all rounded-sm bg-surface"
          >
            Hit the Exit button to return to the dashboard
          </button>
        )}
      </div>

      {/* Floating Audio Player */}
      <AnimatePresence>
        {activeAudio && (
          <motion.div 
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            className="fixed bottom-24 left-4 right-4 bg-surface border border-accent p-6 rounded-sm shadow-2xl z-50 flex items-center gap-6"
          >
            <div className="p-3 bg-accent text-bg rounded-sm animate-[spin_8s_linear_infinite]">
              <Headphones size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[9px] uppercase tracking-widest text-accent font-bold truncate">Now Playing</p>
              <h4 className="text-sm font-bold text-text-primary truncate">{activeAudio}</h4>
              <div className="w-full bg-border h-1 mt-3 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: isPlaying ? '100%' : '30%' }}
                  transition={{ duration: 120, ease: 'linear' }}
                  className="bg-accent h-full"
                />
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setIsPlaying(!isPlaying)}
                className="p-2 border border-border text-text-primary hover:border-accent transition-all"
              >
                {isPlaying ? <Pause size={18} /> : <Play size={18} />}
              </button>
              <button 
                onClick={handleNextAudio}
                className="p-2 border border-border text-text-secondary hover:text-accent transition-all"
                title="Next Module"
              >
                <SkipForward size={18} />
              </button>
              <button 
                onClick={() => setActiveAudio(null)}
                className="p-2 border border-border text-text-secondary hover:text-red-500 transition-all"
              >
                <X size={18} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
