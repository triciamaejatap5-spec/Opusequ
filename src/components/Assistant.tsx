import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, Sparkles, User, Bot, Loader2, X } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
import { db, auth } from '../firebase';
import { collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, limit, doc, updateDoc, getDoc, setDoc } from 'firebase/firestore';
import { AssistantMessage } from '../types';

// Gemini Initialization
const ai = new GoogleGenAI({ 
  apiKey: (import.meta as any).env.VITE_GEMINI_API_KEY || "",
  apiVersion: 'v1'
});

interface AssistantProps {
  onExit?: () => void;
  usageCount: number;
  isPremium?: boolean;
  onLimitReached: (reason: string) => void;
}

export default function Assistant({ onExit, usageCount, isPremium, onLimitReached }: AssistantProps) {
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const q = query(
      collection(db, 'users', user.uid, 'chats'), 
      orderBy('timestamp', 'asc'),
      limit(50)
    );
    
    const unsub = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({
        id: doc.id,
        role: doc.data().role,
        text: doc.data().text,
        timestamp: doc.data().timestamp?.toDate()?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || 'Just now'
      })) as AssistantMessage[];
      
      if (msgs.length === 0) {
        setMessages([
          {
            id: 'welcome',
            role: 'assistant',
            text: "Mabuhay! I am your Opusequ AI Assistant. Need a definition, a concept explained, or a quick fact check from your QCU modules? I'll remember our conversation for you.",
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);
      } else {
        setMessages(msgs);
      }
      setIsInitialLoading(false);
    }, (error) => {
      console.error("Assistant Archive Sync Failure", error);
      setIsInitialLoading(false);
    });

    return () => unsub();
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    if (!isPremium && usageCount >= 3) {
      onLimitReached("Daily AI assistant limit reached");
      return;
    }

    const user = auth.currentUser;
    if (!user) return;

    const currentInput = input;
    setInput('');
    setIsLoading(true);

    try {
      // Increment AI usage
      if (!isPremium) {
        const todayStr = new Date().toLocaleDateString('en-CA');
        const usageRef = doc(db, 'users', user.uid, 'daily_usage', todayStr);
        const usageSnap = await getDoc(usageRef);
        
        if (!usageSnap.exists()) {
          await setDoc(usageRef, { quizzes: 0, uploads: 0, ai: 1, notes: 0 });
        } else {
          await updateDoc(usageRef, { ai: (usageSnap.data().ai || 0) + 1 });
        }
      }

      // Save User Message
      await addDoc(collection(db, 'users', user.uid, 'chats'), {
        userId: user.uid,
        role: 'user',
        text: currentInput,
        timestamp: serverTimestamp()
      });

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: currentInput,
        config: {
          systemInstruction: "You are the Opusequ AI Assistant, the core academic engine for working QCUians. Be exceptionally action-oriented, empathetic, and expert. Use QCU-specific encouragement. Respond concisely so students can back-read easily. Maintain the conversational context.",
        }
      });

      const aiText = response.text || "I couldn't process that. Please try again, student.";

      // Save AI Message
      await addDoc(collection(db, 'users', user.uid, 'chats'), {
        userId: user.uid,
        role: 'assistant',
        text: aiText,
        timestamp: serverTimestamp()
      });

    } catch (error) {
      console.error("Assistant Error:", error);
      await addDoc(collection(db, 'users', user.uid, 'chats'), {
        userId: user.uid,
        role: 'assistant',
        text: "My connection to the QCU archives is currently unstable. Please check your data connection.",
        timestamp: serverTimestamp()
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full p-8 pb-32 space-y-6 max-h-[100vh]">
      <header className="flex justify-between items-center border-b border-border pb-6 shrink-0 text-left">
        <div className="flex items-center gap-3">
          {onExit && (
            <button onClick={onExit} className="p-2 -ml-2 text-text-secondary hover:text-accent transition-colors">
              <X size={20} />
            </button>
          )}
          <div>
            <h2 className="text-3xl italic">AI Assistant</h2>
            <p className="text-text-secondary text-[10px] uppercase tracking-widest mt-1">Real-time Academic Intelligence</p>
          </div>
        </div>
        <div className="p-2 border border-accent text-accent rounded-sm">
          <Sparkles size={20} />
        </div>
      </header>

      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto space-y-6 pr-2 scrollbar-hide"
      >
        <AnimatePresence initial={false}>
          {messages.length > 1 && (
            <div className="text-center py-2 border-b border-border border-dashed mb-6">
              <span className="text-[8px] uppercase tracking-[4px] text-text-secondary opacity-30">Previous Exchanges Sync</span>
            </div>
          )}
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
            >
              <div className={`shrink-0 w-8 h-8 rounded-sm flex items-center justify-center border ${
                msg.role === 'user' ? 'border-accent text-accent' : 'border-border text-text-secondary'
              }`}>
                {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
              </div>
              <div className={`max-w-[80%] space-y-1`}>
                <div className={`p-4 rounded-sm border text-sm leading-relaxed ${
                  msg.role === 'user' 
                    ? 'bg-accent/5 border-accent/20 text-text-primary' 
                    : 'bg-glass border-border text-text-secondary'
                }`}>
                  {msg.text}
                </div>
                <p className={`text-[9px] uppercase tracking-widest opacity-40 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                  {msg.timestamp}
                </p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {isLoading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-4">
            <div className="shrink-0 w-8 h-8 rounded-sm flex items-center justify-center border border-border text-text-secondary">
              <Bot size={16} />
            </div>
            <div className="bg-glass border border-border p-4 rounded-sm">
              <Loader2 size={16} className="animate-spin text-accent" />
            </div>
          </motion.div>
        )}
      </div>

      <div className="shrink-0 pt-4">
        <div className="relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask anything..."
            className="w-full bg-surface border border-border p-5 pr-14 rounded-sm text-sm focus:outline-none focus:border-accent transition-colors"
          />
          <button 
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-accent hover:text-text-primary disabled:opacity-30 p-2 transition-colors"
          >
            <Send size={20} />
          </button>
        </div>
        <div className="flex gap-3 mt-4 overflow-x-auto pb-2 no-scrollbar">
          {['Define Boolean', 'SQL Join types', 'Calculate Osmosis'].map((suggestion) => (
            <button
              key={suggestion}
              onClick={() => setInput(suggestion)}
              className="px-3 py-1.5 border border-border text-[9px] uppercase tracking-widest text-text-secondary hover:border-accent hover:text-accent transition-all whitespace-nowrap"
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
