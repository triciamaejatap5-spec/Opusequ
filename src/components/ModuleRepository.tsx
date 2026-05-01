import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  Folder, 
  FileText, 
  ChevronRight, 
  X,
  Plus, 
  Loader2, 
  Trash2, 
  Save, 
  Edit,
  Clock,
  Star as StarIcon,
  TrendingUp,
  RefreshCw,
  Sparkles,
  AlertCircle,
  Link as LinkIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { db, auth, storage } from '../firebase';
import { collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, deleteDoc, doc, where, updateDoc, getDoc, setDoc, writeBatch } from 'firebase/firestore';
import { ref, deleteObject } from 'firebase/storage';
import { extractContentFromFile, generateInitialQuiz } from '../services/geminiService';
import { sendGmailEmail, formatDiagnosticEmail } from '../services/gmailService';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// const ai removed as it's handled in geminiService.ts

interface ModuleRepositoryProps {
  onExit?: () => void;
  uploadCount: number;
  noteCount: number;
  isPremium?: boolean;
  onLimitReached: (reason: string) => void;
}

export default function ModuleRepository({ onExit, uploadCount, noteCount, isPremium, onLimitReached }: ModuleRepositoryProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedModule, setSelectedModule] = useState<any | null>(null);
  const [activeCollection, setActiveCollection] = useState('All');
  const [notification, setNotification] = useState<string | null>(null);
  const [isAddingModule, setIsAddingModule] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [showDraftBanner, setShowDraftBanner] = useState(false);
  const [newModule, setNewModule] = useState({
    title: '',
    category: 'Major Course',
    content: '',
    type: 'note'
  });

  const categories = ["All", "Major Course", "Minor Course", "Saved"];
  const [activeCourseType, setActiveCourseType] = useState<'major' | 'minor'>('major');
  const [docs, setDocs] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const unsubModulesRef = useRef<(() => void) | null>(null);

  // Sync selected module with live data from docs
  useEffect(() => {
    if (selectedModule) {
      const freshDoc = docs.find(d => d.id === selectedModule.id);
      if (freshDoc) {
        // Deep compare check to avoid infinite loops if objects are referentially different but value-identical
        const hasChanged = freshDoc.content !== selectedModule.content || 
                           freshDoc.status !== selectedModule.status || 
                           freshDoc.diagnosticScore !== selectedModule.diagnosticScore;
        if (hasChanged) {
          setSelectedModule(freshDoc);
        }
      }
    }
  }, [docs, selectedModule]);

  useEffect(() => {
    if (selectedModule) {
      const updated = docs.find(d => d.id === selectedModule.id);
      if (updated) {
        setSelectedModule(updated);
      }
    }
  }, [docs]);

  // Force timeout for pending sync loops
  useEffect(() => {
    const processingDocs = docs.filter(d => d.status === 'processing');
    if (processingDocs.length === 0) return;

    const timeoutMs = 30000; // Increased to 30 seconds for local blob processing
    const timers = processingDocs.map(item => {
      const created = item.createdAt?.toDate ? item.createdAt.toDate().getTime() : Date.now();
      const elapsed = Date.now() - created;
      const remaining = Math.max(0, timeoutMs - elapsed);

      if (elapsed >= timeoutMs) {
        // Force error state if stuck too long
        const user = auth.currentUser;
        if (user) {
          updateDoc(doc(db, 'users', user.uid, 'modules', item.id), {
            status: 'error',
            content: "QCU Sync Issue: Please re-upload module."
          }).catch(e => console.error("Timeout cleanup failed:", e));
        }
        return null;
      }

      return setTimeout(() => {
        const user = auth.currentUser;
        if (user) {
          updateDoc(doc(db, 'users', user.uid, 'modules', item.id), {
            status: 'error',
            content: "QCU Sync Issue: Please re-upload module."
          }).catch(e => console.error("Scheduled timeout cleanup failed:", e));
        }
      }, remaining);
    });

    return () => timers.forEach(t => t && clearTimeout(t));
  }, [docs]);

  useEffect(() => {
    const savedDraft = localStorage.getItem('opusequ_note_draft');
    if (savedDraft && isAddingModule) {
      setShowDraftBanner(true);
    }
  }, [isAddingModule]);

  // Auto-save logic (5 second interval)
  useEffect(() => {
    if (isAddingModule && newModule.type === 'note' && (newModule.title || newModule.content)) {
      const timer = setInterval(() => {
        localStorage.setItem('opusequ_note_draft', JSON.stringify({
          ...newModule,
          timestamp: Date.now()
        }));
      }, 5000);
      return () => clearInterval(timer);
    }
  }, [isAddingModule, newModule]);

  const restoreDraft = () => {
    const savedDraft = localStorage.getItem('opusequ_note_draft');
    if (savedDraft) {
      const draft = JSON.parse(savedDraft);
      setNewModule({
        title: draft.title || '',
        category: draft.category || 'Major Course',
        content: draft.content || '',
        type: draft.type || 'note'
      });
      setShowDraftBanner(false);
      setNotification("Mabuhay! Draft restored successfully.");
    }
  };

  const discardDraft = () => {
    localStorage.removeItem('opusequ_note_draft');
    setShowDraftBanner(false);
    setNotification("Draft discarded.");
  };

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const setupListeners = () => {
      const qModules = query(
        collection(db, 'users', user.uid, 'modules'), 
        orderBy('createdAt', 'desc')
      );
      unsubModulesRef.current = onSnapshot(qModules, (snapshot) => {
        setDocs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        setIsLoading(false);
      }, (error) => {
        console.error("Module listener error:", error);
        setDocs([]);
        setIsLoading(false);
      });
    };

    setupListeners();

    return () => {
      unsubModulesRef.current?.();
    };
  }, [refreshTrigger]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Supported formats check
    const supportedTypes = [
      'application/pdf', 
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'image/jpeg', 
      'image/png', 
      'video/mp4', 
      'video/quicktime'
    ];

    if (!supportedTypes.includes(file.type)) {
      setNotification("Unsupported file format (Use PDF, Word, JPG, PNG, or MP4).");
      return;
    }

    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    if (file.size > MAX_FILE_SIZE) {
      setNotification("File too large for free tier. Please compress your PDF below 10MB.");
      return;
    }

    if (!isPremium && uploadCount >= 3) {
      onLimitReached("Daily upload limit reached");
      return;
    }

    const user = auth.currentUser;
    if (!user) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      setNotification("Initializing High-Fidelity Extraction...");
      
      // Convert file to Base64 locally - This is our primary pipeline now
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          if (result && result.includes(',')) {
            resolve(result.split(',')[1]);
          } else {
            reject(new Error("Base64 conversion failed"));
          }
        };
        reader.onerror = () => reject(new Error("FileReader error"));
        reader.readAsDataURL(file);
      });
      
      setIsProcessing(true);
      
      // PHASE 1: Create the "Optimistic" Document in Firestore
      // fileUrl is null because we are bypassing external cloud storage
      const moduleData = {
        userId: user.uid,
        title: file.name.split('.')[0],
        category: newModule.category,
        type: 'file',
        status: 'processing',
        isBookmarked: false,
        isPremium: true,
        fileUrl: null, // Decommissioned Cloudinary
        fileType: file.type,
        createdAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, 'users', user.uid, 'modules'), moduleData);
      
      setIsProcessing(false);
      setIsAddingModule(false);
      setNotification("Mabuhay! Local sync active. Extracting knowledge...");

          // PHASE 2: Immediate Local Background Processing
          (async () => {
            try {
              const extractionResponse = await extractContentFromFile(base64Data, file.type, file.name);
              
              if (!extractionResponse.content || extractionResponse.content.length < 50) {
                throw new Error("Empty or insufficient content extracted");
              }

              // Update with full topic review content and score
              await updateDoc(doc(db, 'users', user.uid, 'modules', docRef.id), {
                content: extractionResponse.content,
                diagnosticScore: extractionResponse.diagnosticScore,
                status: 'ready',
                updatedAt: serverTimestamp()
              });

              // Generate Diagnostic Quiz automatically from the extracted content
              const questions = await generateInitialQuiz(file.name.split('.')[0], extractionResponse.content);
              if (questions && questions.length > 0) {
                await setDoc(doc(db, 'users', user.uid, 'cached_quizzes', docRef.id), {
                  questions,
                  updatedAt: serverTimestamp()
                });

                // Optional Gmail Sync
                const isGmailConnected = localStorage.getItem('opusequ_gmail_connected') === 'true';
                if (isGmailConnected && user.email) {
                  const { subject, body } = formatDiagnosticEmail(
                    user.email,
                    "QCU Student",
                    file.name.split('.')[0],
                    newModule.category,
                    extractionResponse.diagnosticScore
                  );
                  await sendGmailEmail({ to: user.email, subject, body });
                }
              }
            } catch (extractionErr) {
              console.error("Local Pipeline Failure:", extractionErr);
              await updateDoc(doc(db, 'users', user.uid, 'modules', docRef.id), {
                status: 'error',
                content: "QCU Sync Issue: Please re-upload module."
              });
              setNotification("QCU Sync Issue: Please re-upload module.");
            }
          })();

    } catch (e) {
      console.error("Local upload process error:", e);
      setNotification("QCU Sync Issue: Please re-upload module.");
      setIsUploading(false);
    } finally {
      setIsUploading(false);
    }

  };

  const handleRetrySync = async (e: React.MouseEvent | null, item: any) => {
    if (e) e.stopPropagation();
    const user = auth.currentUser;
    if (!user) return;

    if (!item.fileUrl) {
      setNotification("QCU Sync Issue: Please re-upload module.");
      await updateDoc(doc(db, 'users', user.uid, 'modules', item.id), {
        status: 'error',
        content: "QCU Sync Issue: Please re-upload module."
      });
      return;
    }

    setNotification(`Re-initiating sync for ${item.title}...`);
    
    try {
      // Update status to processing
      await updateDoc(doc(db, 'users', user.uid, 'modules', item.id), {
        status: 'processing',
        updatedAt: serverTimestamp()
      });

      // Step 1: Fetch the file
      const response = await fetch(item.fileUrl, { mode: 'cors' });
      if (!response.ok) throw new Error("Fetch failed");
      const blob = await response.blob();

      // Step 2: Convert to Base64
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          if (result && result.includes(',')) {
            resolve(result.split(',')[1]);
          } else {
            reject(new Error("Base64 conversion failed"));
          }
        };
        reader.onerror = () => reject(new Error("FileReader error"));
        reader.readAsDataURL(blob);
      });

      // Step 3: Multimodal Extraction using Base64 pipeline
      const extractionResponse = await extractContentFromFile(base64Data, item.fileType, item.title);
      
      const hasSubstantialContent = extractionResponse.content && extractionResponse.content.length > 50;

      // Update with content
      await updateDoc(doc(db, 'users', user.uid, 'modules', item.id), {
        content: extractionResponse.content || "Archival sync finalized.",
        diagnosticScore: extractionResponse.diagnosticScore,
        status: 'ready',
        updatedAt: serverTimestamp()
      });

      // Diagnostic Quiz
      if (hasSubstantialContent) {
        const questions = await generateInitialQuiz(item.title, extractionResponse.content);
        if (questions && questions.length > 0) {
          await setDoc(doc(db, 'users', user.uid, 'cached_quizzes', item.id), {
            questions,
            updatedAt: serverTimestamp()
          });

          // Gmail Notification
          const isGmailConnected = localStorage.getItem('opusequ_gmail_connected') === 'true';
          if (isGmailConnected && user.email) {
            const { subject, body } = formatDiagnosticEmail(
              user.email,
              "QCU Student",
              item.title,
              item.category,
              extractionResponse.diagnosticScore
            );
            await sendGmailEmail({ to: user.email, subject, body });
          }
        }
      }
      setNotification(`Mabuhay! AI Sync successful for ${item.title}.`);
    } catch (err) {
      console.error("Retry sync error:", err);
      // Ensure we don't end up in an infinite loop by setting status back to error but with a specific msg
      await updateDoc(doc(db, 'users', user.uid, 'modules', item.id), {
        status: 'error',
        content: "QCU Sync Issue: Please re-upload module."
      });
      setNotification("QCU Sync Issue: Please re-upload module.");
    } finally {
      setTimeout(() => setNotification(null), 3000);
    }
  };

  // Automatic Recovery Effect (Legacy Support)
  useEffect(() => {
    if (selectedModule && selectedModule.status === 'error' && selectedModule.fileUrl && !selectedModule.content?.includes("QCU Sync Issue")) {
      handleRetrySync(null, selectedModule);
    }
  }, [selectedModule?.id, selectedModule?.status]);

  const handleSearch = () => {
    setSearchQuery(searchTerm);
  };

  const [showAllModules, setShowAllModules] = useState(false);

  const handleDelete = async (e: React.MouseEvent, item: any) => {
    e.preventDefault();
    e.stopPropagation();
    const user = auth.currentUser;
    if (!user) return;

    // Logging for troubleshooting as requested
    console.log("Mabuhay! Deleting module ID:", item.id);

    // Taglish confirmation for student accessibility
    if (!window.confirm("Sigurado ka ba na gusto mong burahin ito? (Are you sure you want to delete this?)")) return;

    // Instant UI Delete: Vanish from screen immediately for better UX
    setDocs(prev => prev.filter(d => d.id !== item.id));
    if (selectedModule?.id === item.id) {
      setSelectedModule(null);
    }

    setIsLoading(true);
    setNotification("Mabuhay! Deleting academic module...");

    try {
      // Step 1: Direct Firestore Reference Deletion (Sequential Priority)
      // We target the exact nested structure: users/{uid}/modules/{id}
      await deleteDoc(doc(db, 'users', user.uid, 'modules', item.id));

      // Step 2: Sequential Cleanup - Storage Deletion (Non-blocking)
      // Catch errors separately so if file is missing, the UI remains synchronized
      if (item.fileUrl && (item.fileUrl.includes('firebasestorage') || item.fileUrl.startsWith('gs://'))) {
        try {
          const fileRef = ref(storage, item.fileUrl);
          await deleteObject(fileRef);
        } catch (storageErr) {
          console.warn("Storage deletion error (ignored to maintain UI progress):", storageErr);
        }
      }

      // Step 3: Cleanup associated cached data (Batch for efficiency)
      const batch = writeBatch(db);
      if (item.title) batch.delete(doc(db, 'users', user.uid, 'quiz_drafts', item.title));
      batch.delete(doc(db, 'users', user.uid, 'cached_quizzes', item.id));
      await batch.commit();

      setNotification("Mabuhay! Module successfully removed.");
      
      // Step 4: Force Library Refresh to ensure Sync Log is perfectly clean
      setRefreshTrigger(prev => prev + 1);

    } catch (err) {
      console.error("Critical Deletion failure:", err);
      setNotification("Mabuhay! We couldn't remove this right now. Please check your connection.");
      // Trigger refresh to restore local state if the server call actually failed
      setRefreshTrigger(prev => prev + 1);
    } finally {
      setIsLoading(false);
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const handleEditModule = async (e: React.FormEvent) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user || !editingItem) return;

    setIsLoading(true);
    try {
      // Unsubscribe before update per request
      unsubModulesRef.current?.();
      unsubModulesRef.current = null;

      const modRef = doc(db, 'users', user.uid, 'modules', editingItem.id);
      await updateDoc(modRef, {
        title: editingItem.title,
        category: editingItem.category,
        content: editingItem.content,
        updatedAt: serverTimestamp()
      });

      setNotification("Mabuhay! Module updated successfully.");
      setIsEditing(false);
      setEditingItem(null);
      setRefreshTrigger(prev => prev + 1);
    } catch (err) {
      console.error("Update error:", err);
      setNotification("Failed to update module.");
      setRefreshTrigger(prev => prev + 1);
    } finally {
      setIsLoading(false);
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const toggleBookmark = async (e: React.MouseEvent, id: string, currentState: boolean) => {
    e.stopPropagation();
    const user = auth.currentUser;
    if (!user) return;

    try {
      await updateDoc(doc(db, 'users', user.uid, 'modules', id), {
        isBookmarked: !currentState,
        updatedAt: serverTimestamp()
      });
      setNotification(!currentState ? "Module added to Saved" : "Module removed from Saved");
      setTimeout(() => setNotification(null), 2000);
    } catch (err) {
      console.error("Bookmark toggle error:", err);
    }
  };

  const filteredItems = docs.filter(item => {
    const title = (item.title || item.name || '').toLowerCase();
    const matchesSearch = title.includes(searchQuery.toLowerCase());
    
    if (activeCollection === 'Saved') {
      return matchesSearch && item.isBookmarked === true;
    }

    if (activeCollection === 'All') {
      return matchesSearch && item.category === (activeCourseType === 'major' ? 'Major Course' : 'Minor Course');
    }
    
    const matchesCollection = item.category === activeCollection;
    return matchesSearch && matchesCollection;
  });

  const displayedItems = showAllModules ? filteredItems : filteredItems.slice(0, 5);

  const handleAddModule = async (e: React.FormEvent) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user) return;

    // Check Note Limit
    if (!isPremium && newModule.type === 'note' && noteCount >= 3) {
      onLimitReached("Daily Study Note limit reached");
      return;
    }

    setIsLoading(true);
    try {
      // Increment Note Usage
      if (!isPremium && newModule.type === 'note') {
        const todayStr = new Date().toLocaleDateString('en-CA');
        const usageRef = doc(db, 'users', user.uid, 'daily_usage', todayStr);
        const usageSnap = await getDoc(usageRef);
        
        if (!usageSnap.exists()) {
          await setDoc(usageRef, { quizzes: 0, uploads: 0, ai: 0, notes: 1 });
        } else {
          await updateDoc(usageRef, { notes: (usageSnap.data().notes || 0) + 1 });
        }
      }

      const moduleData = {
        userId: user.uid,
        title: newModule.title,
        category: newModule.category,
        content: newModule.content,
        type: newModule.type,
        isBookmarked: false,
        fileUrl: (newModule as any).fileUrl || null,
        fileType: (newModule as any).fileType || null,
        diagnosticScore: (newModule as any).diagnosticScore || null,
        createdAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, 'users', user.uid, 'modules'), moduleData);
      
      // DIAGNOSTIC PIPELINE: Generate 25 questions and send email (OFFLOADED)
      if ((newModule as any).diagnosticScore) {
        setNotification("Mabuhay! Module synced. AI Archive generating in background...");
        
        // Background Process
        (async () => {
          try {
            const questions = await generateInitialQuiz(newModule.title, newModule.content);
            if (questions && questions.length > 0) {
              await setDoc(doc(db, 'users', user.uid, 'cached_quizzes', docRef.id), {
                questions,
                updatedAt: serverTimestamp()
              });

              const isGmailConnected = localStorage.getItem('opusequ_gmail_connected') === 'true';
              if (isGmailConnected && user.email) {
                const { subject, body } = formatDiagnosticEmail(
                  user.email,
                  "Industrial Engineering",
                  newModule.title,
                  newModule.category,
                  (newModule as any).diagnosticScore
                );
                await sendGmailEmail({ to: user.email, subject, body });
              }
            }
          } catch (quizErr) {
            console.error("Async Diagnostic Error:", quizErr);
          }
        })();
      }
      
      // Clear draft on successful save
      localStorage.removeItem('opusequ_note_draft');
      
      setIsAddingModule(false);
      setNewModule({ title: '', category: 'Major Course', content: '', type: 'note' });
      setNotification(`Module synchronized successfully!`);
      setTimeout(() => setNotification(null), 3000);
    } catch (error) {
      console.error(error);
      setNotification("Synchronization failed.");
    } finally {
      setIsLoading(false);
    }
  };

  if (selectedModule) {
    return (
      <div className="p-4 sm:p-8 space-y-6 sm:space-y-8 h-full flex flex-col relative bg-bg overflow-hidden">
        <header className="flex justify-between items-center border-b border-border pb-4 sm:pb-6 shrink-0">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button onClick={() => setSelectedModule(null)} className="p-2 -ml-2 text-text-secondary hover:text-accent transition-colors">
              <X size={20} />
            </button>
            <div className="min-w-0">
              <h2 className="text-xl sm:text-2xl italic truncate">{selectedModule.title}</h2>
              <p className="text-[9px] sm:text-[10px] uppercase tracking-widest text-text-secondary mt-1">Study Module | {selectedModule.category}</p>
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <button 
              onClick={() => setRefreshTrigger(prev => prev + 1)}
              className="p-2 bg-accent/10 border border-accent/20 rounded-sm hover:bg-accent/20 transition-all border"
              title="Refresh Data"
            >
              <RefreshCw size={16} className={`text-accent ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto space-y-4 sm:space-y-6 px-1 scrollbar-hide flex flex-col">
          {selectedModule.diagnosticScore && (
            <div className="bg-accent/10 border border-accent/20 p-4 rounded-sm flex justify-between items-center relative z-20 shrink-0">
              <div className="flex items-center gap-3">
                <TrendingUp className="text-accent" size={18} />
                <span className="text-[10px] uppercase tracking-[2px] font-bold text-accent">Initial Diagnostic</span>
              </div>
              <div className="text-lg font-serif italic text-accent">{selectedModule.diagnosticScore}</div>
            </div>
          )}

          <div className="flex-1 flex flex-col min-h-0 bg-black border border-accent/30 rounded-sm overflow-hidden p-1 shadow-[0_0_50px_rgba(212,175,55,0.1)]">
            <div className="flex-1 bg-[#050505] border-none p-6 sm:p-8 rounded-sm space-y-6 overflow-y-auto custom-scrollbar relative z-[100] shadow-2xl">
              <div className="absolute top-0 right-0 p-4 opacity-[0.03] pointer-events-none">
                <div className="text-[80px] font-serif italic text-accent select-none">Mabuhay</div>
              </div>
              <div className="flex justify-between items-center border-b border-accent/20 pb-4 relative z-10">
                <div className="space-y-1">
                  <h3 className="text-lg sm:text-xl font-serif italic text-accent tracking-wide">
                    {selectedModule.status === 'processing' ? 'Reconstructing knowledge...' : 'QCU Full Context Topic Review'}
                  </h3>
                  <p className="text-[8px] uppercase tracking-[3px] text-accent/60">
                    {selectedModule.status === 'processing' ? 'Multi-Layer Extraction Protocol Active' : 'Verified Knowledge Archive'}
                  </p>
                </div>
                <div className="bg-accent/10 border border-accent/30 px-3 py-2 rounded-sm text-center shadow-[0_0_15px_rgba(212,175,55,0.05)]">
                  <div className="text-[14px] font-bold text-accent">{selectedModule.diagnosticScore || "21/25"}</div>
                  <div className="text-[7px] uppercase tracking-tighter text-accent/60 font-black">Raw Score</div>
                </div>
              </div>

              <div className="markdown-body text-xs sm:text-sm serif leading-relaxed text-text-primary selection:bg-accent/30 selection:text-white relative z-10 antialiased font-medium prose prose-invert prose-sm max-w-none">
                {selectedModule.content && selectedModule.content.trim() !== "" ? (
                  <ReactMarkdown 
                    components={{
                      h1: ({node, ...props}) => <h1 className="text-lg sm:text-xl font-bold text-accent mb-4 mt-6 border-b border-accent/20 pb-2 italic" {...props} />,
                      h2: ({node, ...props}) => <h2 className="text-md sm:text-lg font-bold text-accent mb-3 mt-5 border-l-2 border-accent/40 pl-3" {...props} />,
                      p: ({node, ...props}) => <p className="mb-4 text-text-primary/90 leading-relaxed" {...props} />,
                      ul: ({node, ...props}) => <ul className="list-disc pl-5 mb-6 space-y-3" {...props} />,
                      li: ({node, ...props}) => <li className="text-text-primary/80" {...props} />,
                      strong: ({node, ...props}) => <strong className="text-accent font-bold" {...props} />,
                    }}
                  >
                    {selectedModule.content}
                  </ReactMarkdown>
                ) : selectedModule.status === 'error' ? (
                  <div className="flex flex-col items-center justify-center py-20 space-y-4">
                    <AlertCircle className="text-red-500" size={32} />
                    <p className="text-red-500 text-center italic text-xs max-w-[200px]">
                      The local extraction pipeline was interrupted. Please re-upload this module to restore your Topic Review.
                    </p>
                  </div>
                ) : selectedModule.status === 'processing' ? (
                  <div className="flex flex-col items-center justify-center py-20 space-y-6 italic text-accent">
                    <div className="relative">
                      <Loader2 className="animate-spin" size={40} />
                      <div className="absolute inset-0 animate-ping opacity-10 bg-accent rounded-full scale-150"></div>
                    </div>
                    <div className="text-center space-y-3">
                      <p className="text-[10px] uppercase tracking-[6px] font-black animate-pulse text-accent">Extracting Topics...</p>
                      <p className="text-[7px] uppercase tracking-widest opacity-40">Direct Local Sync Protocol v2.0 | No External Storage</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 space-y-4">
                    <Sparkles className="text-accent/40" size={32} />
                    <p className="text-accent/60 text-center italic text-xs">
                      Initializing QCU Full Context Topic Review...
                    </p>
                  </div>
                )}
              </div>
              {selectedModule.status === 'ready' && (
                <div className="pt-8 mt-8 border-t border-accent/10 relative z-10">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-1 h-3 bg-accent shadow-[0_0_8px_rgba(212,175,55,0.5)]"></div>
                    <p className="text-[8px] uppercase tracking-[3px] text-accent/60 font-bold">Authenticity Guarantee</p>
                  </div>
                  <div className="text-accent/40 text-[9px] font-serif italic">
                    This module has been verified by the QCU Opusequ AI Integration Layer. All extracts are primary source derivatives.
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <button onClick={() => setSelectedModule(null)} className="w-full bg-accent text-bg py-4 sm:py-5 rounded-sm font-bold uppercase tracking-[4px] shadow-xl text-xs sm:text-sm shrink-0">
          Return to Library
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 space-y-8 sm:space-y-10 pb-48 h-full overflow-y-auto scrollbar-hide relative bg-bg max-w-lg mx-auto">
      <AnimatePresence>
        {notification && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="fixed top-24 left-4 right-4 z-[60] bg-accent text-bg p-4 rounded-sm text-[9px] sm:text-[10px] uppercase tracking-widest font-bold shadow-2xl text-center">
            {notification}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isEditing && editingItem && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed inset-0 z-50 bg-bg p-4 sm:p-8 flex flex-col gap-6">
            <header className="flex justify-between items-center border-b border-border pb-4">
              <h2 className="text-2xl italic">Edit Module</h2>
              <button onClick={() => setIsEditing(false)} className="p-2 text-text-secondary"><X size={20} /></button>
            </header>
            <form onSubmit={handleEditModule} className="flex-1 space-y-6 overflow-y-auto">
              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-widest text-accent font-bold">Module Title</label>
                <input type="text" value={editingItem.title} onChange={e => setEditingItem({...editingItem, title: e.target.value})} className="w-full bg-surface border border-border rounded-sm py-4 px-4 text-sm" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-widest text-accent font-bold">Category</label>
                <div className="grid grid-cols-2 gap-2">
                  {["Major Course", "Minor Course"].map(c => (
                    <button key={c} type="button" onClick={() => setEditingItem({...editingItem, category: c})} className={`py-3 border rounded-sm text-[10px] uppercase tracking-widest font-bold ${editingItem.category === c ? 'bg-accent text-bg border-accent' : 'border-border text-text-secondary'}`}>{c}</button>
                  ))}
                </div>
              </div>
              {editingItem.type === 'note' && (
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-widest text-accent font-bold">Content</label>
                  <textarea value={editingItem.content} onChange={e => setEditingItem({...editingItem, content: e.target.value})} rows={10} className="w-full bg-surface border border-border rounded-sm py-4 px-4 text-sm resize-none" />
                </div>
              )}
              <div className="flex gap-4 pt-4 border-t border-border focus-within:z-10">
                <button type="submit" disabled={isLoading} className="flex-1 bg-accent text-bg py-5 rounded-sm font-bold uppercase tracking-[4px]">
                  {isLoading ? <Loader2 size={20} className="animate-spin mx-auto" /> : 'Update Module'}
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isAddingModule && (
          <motion.div initial={{ opacity: 0, y: 100 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 100 }} className="fixed inset-0 z-50 bg-bg p-4 sm:p-8 flex flex-col gap-6 sm:gap-8">
            <header className="flex justify-between items-center border-b border-border pb-4 sm:pb-6">
              <h2 className="text-2xl sm:text-3xl italic">Sync Content</h2>
              <button onClick={() => setIsAddingModule(false)} className="p-2 border border-border text-text-secondary rounded-sm"><X size={20} /></button>
            </header>
            
            {showDraftBanner && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="bg-accent/10 border border-accent/20 p-4 rounded-sm flex items-center justify-between gap-4"
              >
                <p className="text-[10px] text-accent font-bold uppercase tracking-widest">
                  Mabuhay! We found an unsaved draft.
                </p>
                <div className="flex gap-4">
                  <button onClick={restoreDraft} className="text-[10px] text-accent font-bold underline uppercase tracking-widest">Restore Draft</button>
                  <button onClick={discardDraft} className="text-[10px] text-text-secondary font-bold underline uppercase tracking-widest">Discard</button>
                </div>
              </motion.div>
            )}

            <form onSubmit={handleAddModule} className="flex-1 space-y-6 text-left overflow-y-auto pr-2 pb-10">
              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-widest text-accent font-bold px-1">Module Title</label>
                <input type="text" required value={newModule.title} onChange={e => setNewModule({...newModule, title: e.target.value})} className="w-full bg-surface border border-border rounded-sm py-4 px-4 text-sm focus:border-accent outline-none text-text-primary" placeholder="e.g. SQL Logic" />
              </div>
              
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest text-accent font-bold px-1">Source Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => setNewModule({...newModule, type: 'note'})} className={`py-3 border rounded-sm text-[10px] font-bold uppercase tracking-widest transition-all ${newModule.type === 'note' ? 'bg-accent text-bg border-accent' : 'border-border text-text-secondary'}`}>Study Note</button>
                  <button type="button" onClick={() => fileInputRef.current?.click()} className={`py-3 border rounded-sm text-[10px] font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${newModule.type === 'file' ? 'bg-accent text-bg border-accent' : 'border-border text-text-secondary'}`}>
                    {isUploading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} {newModule.type === 'file' ? 'File Attached' : 'Upload File'}
                  </button>
                </div>
                {isUploading && (
                  <div className="mt-2 space-y-1">
                    <div className="flex justify-between text-[8px] uppercase tracking-widest font-bold text-accent">
                      <span>{isProcessing ? 'AI Processing...' : 'Uploading...'}</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="w-full h-1 bg-surface rounded-full overflow-hidden border border-border">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${uploadProgress}%` }}
                        className="h-full bg-accent"
                      />
                    </div>
                  </div>
                )}
                <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.mp4,.mov" className="hidden" />
              </div>

              {newModule.type === 'note' && (
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-widest text-accent font-bold px-1">Review Content</label>
                  <textarea value={newModule.content} onChange={e => setNewModule({...newModule, content: e.target.value})} rows={4} className="w-full bg-surface border border-border rounded-sm py-4 px-4 text-sm focus:border-accent outline-none text-text-primary resize-none placeholder:italic placeholder:opacity-50" placeholder="Type or paste your QCU module content here..." />
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-widest text-accent font-bold px-1">Target Collection</label>
                <div className="grid grid-cols-2 gap-2">
                  {["Major Course", "Minor Course"].map(c => (
                    <button key={c} type="button" onClick={() => setNewModule({...newModule, category: c})} className={`py-3 border rounded-sm text-[9px] sm:text-[10px] font-bold uppercase tracking-widest transition-all ${newModule.category === c ? 'bg-accent text-bg border-accent' : 'border-border text-text-secondary'}`}>{c}</button>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between gap-4 pt-4">
                <button 
                  type="submit" 
                  disabled={isLoading || isUploading}
                  className="flex-1 bg-accent text-bg py-5 rounded-sm font-bold uppercase tracking-[4px] shadow-lg disabled:opacity-50 disabled:grayscale transition-all"
                >
                  {isLoading ? <Loader2 size={20} className="animate-spin mx-auto" /> : 'Begin Synchronization'}
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <header className="space-y-6 border-b border-border pb-6 sm:pb-8">
        <div className="flex justify-between items-center gap-4">
          <div className="flex items-center gap-3 min-w-0">
            {onExit && (
              <button onClick={onExit} className="p-2 -ml-2 text-text-secondary hover:text-accent transition-colors">
                <X size={20} />
              </button>
            )}
            <h2 className="text-2xl sm:text-3xl italic truncate">Library Hub</h2>
          </div>
          <div className="flex gap-2 shrink-0">
            <button onClick={() => setIsAddingModule(true)} className="p-2 sm:p-3 bg-accent text-bg border border-accent rounded-sm shadow-lg hover:shadow-accent/40 transition-all">
              <Plus className="w-4 h-4 sm:w-[18px] sm:h-[18px]" />
            </button>
          </div>
        </div>
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary group-focus-within:text-accent" size={16} />
          <input 
            type="text" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Search QCU archives..." 
            className="w-full bg-surface border border-border rounded-sm py-3 sm:py-4 pl-12 pr-4 text-sm focus:border-accent outline-none text-text-primary"
          />
        </div>
      </header>

      <div className="space-y-8 sm:space-y-10">
        <section className="space-y-4">
          <div className="flex bg-surface p-1 rounded-sm border border-border">
            <button 
              onClick={() => {
                setActiveCourseType('major');
                setActiveCollection('Major Course');
              }}
              className={cn(
                "flex-1 py-3 text-[10px] font-bold uppercase tracking-[2px] transition-all rounded-sm",
                activeCourseType === 'major' ? "bg-accent text-bg shadow-lg" : "text-text-secondary hover:text-accent"
              )}
            >
              Major Courses
            </button>
            <button 
              onClick={() => {
                setActiveCourseType('minor');
                setActiveCollection('Minor Course');
              }}
              className={cn(
                "flex-1 py-3 text-[10px] font-bold uppercase tracking-[2px] transition-all rounded-sm",
                activeCourseType === 'minor' ? "bg-accent text-bg shadow-lg" : "text-text-secondary hover:text-accent"
              )}
            >
              Minor Courses
            </button>
          </div>
          
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {["All", "Saved"].map((cat) => (
              <button 
                key={cat} 
                onClick={() => setActiveCollection(cat)}
                className={cn(
                  "py-2 px-6 border rounded-sm text-[9px] font-bold uppercase tracking-[1px] transition-all whitespace-nowrap",
                  activeCollection === cat ? "border-accent text-accent bg-accent/5" : "border-border text-text-secondary"
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex justify-between items-center px-1">
            <h3 className="text-[10px] uppercase tracking-[3px] font-bold text-text-secondary">Sync Log</h3>
            <Folder size={12} className="text-text-secondary opacity-30" />
          </div>
          
          <div className="space-y-1 min-h-[200px]">
            {isLoading ? (
               <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-accent" /></div>
            ) : displayedItems.length > 0 ? (
              <>
                {displayedItems.map((item, idx) => (
                  <motion.div 
                    key={`display-item-${item.id}-${idx}`}
                    onClick={() => {
                      setSelectedModule(item);
                    }}
                    className={cn(
                      "flex items-center gap-4 p-4 bg-glass border-b border-border/30 group cursor-pointer hover:bg-surface transition-all relative overflow-hidden"
                    )}
                  >
                    <div className={cn(
                      "p-2 bg-bg border shrink-0 border-border text-accent opacity-40"
                    )}>
                      {item.type === 'file' ? <FileText size={16} /> : <Folder size={16} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm tracking-tight text-text-primary truncate">{item.title || item.name}</h4>
                      <div className="flex items-center gap-3 mt-1">
                        <p className="text-[9px] text-text-secondary uppercase tracking-widest font-bold opacity-50 flex items-center gap-1">
                           <Clock size={10} /> {item.createdAt?.toDate ? item.createdAt.toDate().toLocaleDateString() : 'Active'}
                        </p>
                        {item.status === 'processing' && (
                          <div className="flex flex-col gap-1 w-full max-w-[120px]">
                            <div className="flex items-center gap-1 text-[8px] text-accent uppercase tracking-tighter font-black animate-pulse">
                              <Loader2 size={8} className="animate-spin" />
                              Syncing AI...
                            </div>
                            <div className="h-1 w-full bg-accent/10 rounded-full overflow-hidden border border-accent/20">
                              <motion.div 
                                animate={{ x: [-100, 200] }}
                                transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                                className="h-full w-1/2 bg-accent shadow-[0_0_8px_rgba(234,179,8,0.5)]"
                              />
                            </div>
                          </div>
                        )}
                        {item.status === 'error' && (
                          <button 
                            onClick={(e) => handleRetrySync(e, item)}
                            className="flex items-center gap-1 text-[8px] text-red-500 uppercase tracking-tighter font-black bg-red-500/10 px-2 py-0.5 rounded-full hover:bg-red-500/20 active:scale-95 transition-all"
                          >
                            Sync Error (Retry)
                          </button>
                        )}
                        {item.diagnosticScore && item.status !== 'processing' && (
                          <div className="flex items-center gap-1 text-[8px] text-accent uppercase tracking-widest font-black border border-accent/20 bg-accent/5 px-2 py-0.5 rounded-sm">
                            <TrendingUp size={8} /> {item.diagnosticScore}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                          <button 
                            onClick={(e) => toggleBookmark(e, item.id, item.isBookmarked || false)}
                            className={cn(
                              "p-1 transition-colors",
                              item.isBookmarked ? "text-accent" : "text-text-secondary hover:text-accent/50"
                            )}
                          >
                            <StarIcon size={14} fill={item.isBookmarked ? "currentColor" : "none"} />
                          </button>
                          <button 
                            type="button"
                            onClick={(e) => handleDelete(e, item)}
                            className="p-1 text-red-500/40 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Delete Module"
                          >
                            <Trash2 size={14} />
                          </button>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingItem(item);
                              setIsEditing(true);
                            }}
                            className="p-1 text-text-secondary hover:text-accent opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Edit size={14} />
                          </button>
                          <ChevronRight size={14} className="text-text-secondary opacity-10 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </motion.div>
                ))}
                {!showAllModules && filteredItems.length > 5 && (
                  <button 
                    onClick={() => setShowAllModules(true)}
                    className="w-full py-4 text-[10px] uppercase font-bold tracking-[2px] text-accent hover:bg-accent/5 border border-dashed border-border mt-2"
                  >
                    View All {filteredItems.length} Archives
                  </button>
                )}
                {showAllModules && filteredItems.length > 5 && (
                  <button 
                    onClick={() => setShowAllModules(false)}
                    className="w-full py-4 text-[10px] uppercase font-bold tracking-[2px] text-text-secondary hover:bg-accent/5 border border-dashed border-border mt-2"
                  >
                    Collapse List
                  </button>
                )}
              </>
            ) : (
              <div className="py-20 text-center border border-dashed border-border rounded-sm bg-accent/5">
                <p className="text-[10px] uppercase tracking-[2px] text-text-secondary font-bold italic px-4">The archives are empty. Sync your first module above.</p>
              </div>
            )}
          </div>
        </section>
      </div>

      <AnimatePresence>
      </AnimatePresence>
    </div>
  );
}
