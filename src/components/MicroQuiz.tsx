import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, XCircle, ArrowRight, Zap, Trophy, Timer, AlertCircle, Sparkles, X } from 'lucide-react';
import { QuizQuestion } from '../types';

const MOCK_QUIZ_POOL: QuizQuestion[] = [
  { 
    id: '1', 
    question: "In Boolean Algebra, what is A OR (NOT A)?", 
    options: ["0", "1", "A", "NOT A"], 
    correctAnswer: 1,
    explanation: "Any value combined with its opposite using OR results in 1 (True)."
  },
  { 
    id: '2', 
    question: "Which data structure follows LIFO?", 
    options: ["Queue", "Linked List", "Stack", "Tree"], 
    correctAnswer: 2,
    explanation: "Stacks operate like a pile of plates; the last one added is the first one removed."
  },
  { 
    id: '3', 
    question: "Decimal equivalent of binary 1010?", 
    options: ["8", "10", "12", "15"], 
    correctAnswer: 1,
    explanation: "1010 represents 2^3 (8) + 2^1 (2), which equals 10."
  },
  { 
    id: '4', 
    question: "Which logic gate is a universal gate?", 
    options: ["AND", "NAND", "OR", "XOR"], 
    correctAnswer: 1,
    explanation: "NAND gates can be configured to recreate any other basic logic gate."
  },
  { 
    id: '5', 
    question: "What does 'CPU' stand for?", 
    options: ["Central Process Unit", "Central Processing Unit", "Core Processing Unit", "Control Power Unit"], 
    correctAnswer: 1,
    explanation: "The Central Processing Unit is the main control center of a computer."
  },
  { 
    id: '6', 
    question: "Memory that is volatile by nature?", 
    options: ["ROM", "RAM", "HDD", "SSD"], 
    correctAnswer: 1,
    explanation: "RAM loses all stored data when the power is turned off."
  },
  { 
    id: '7', 
    question: "Which sorting algorithm has O(n log n) average time complexity?", 
    options: ["Bubble Sort", "Insertion Sort", "Merge Sort", "Selection Sort"], 
    correctAnswer: 2,
    explanation: "Merge Sort uses a divide-and-conquer approach to efficiently sort large datasets."
  }
];

interface MicroQuizProps {
  onComplete: (score: number) => void;
  onExit?: () => void;
}

export default function MicroQuiz({ onComplete, onExit }: MicroQuizProps) {
  const [isSprintStarted, setIsSprintStarted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes in seconds
  const [currentPoolIndex, setCurrentPoolIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [totalAttempted, setTotalAttempted] = useState(0);
  const [quizComplete, setQuizComplete] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isSprintStarted && timeLeft > 0 && !quizComplete) {
      timer = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && !quizComplete) {
      setQuizComplete(true);
      onComplete(score);
    }
    return () => clearInterval(timer);
  }, [isSprintStarted, timeLeft, quizComplete, onComplete, score]);

  const handleOptionSelect = (index: number) => {
    if (isAnswered) return;
    setSelectedOption(index);
    const correct = index === MOCK_QUIZ_POOL[currentPoolIndex].correctAnswer;
    if (correct) setScore(s => s + 1);
    setTotalAttempted(t => t + 1);
    setIsAnswered(true);
  };

  const handleNext = useCallback(() => {
    if (timeLeft <= 0) return;
    setCurrentPoolIndex(prev => (prev + 1) % MOCK_QUIZ_POOL.length);
    setSelectedOption(null);
    setIsAnswered(false);
  }, [timeLeft]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isSprintStarted) {
    return (
      <div className="p-8 h-full flex flex-col items-center justify-center space-y-8 text-center relative">
        {onExit && (
          <button 
            onClick={onExit}
            className="absolute top-8 right-8 p-2 border border-border text-text-secondary hover:text-accent transition-colors rounded-sm"
          >
            <X size={20} />
          </button>
        )}
        <div className="w-24 h-24 border-2 border-accent border-dashed rounded-full flex items-center justify-center animate-[spin_10s_linear_infinite]">
          <Zap size={40} className="text-accent fill-accent" />
        </div>
        <div className="space-y-4">
          <h2 className="text-4xl font-serif italic">5-Min Sprint</h2>
          <p className="text-text-secondary text-sm max-w-xs leading-relaxed">
            Fast-paced micro-learning session. Questions will keep flowing until the 5-minute timer expires. Ready for your Task?
          </p>
        </div>
        <div className="bg-surface border border-accent/20 p-6 rounded-sm w-full space-y-4">
          <div className="flex justify-between items-center text-xs uppercase tracking-widest font-bold">
            <span className="text-text-secondary">Difficulty</span>
            <span className="text-accent">Adaptive</span>
          </div>
          <div className="flex justify-between items-center text-xs uppercase tracking-widest font-bold">
            <span className="text-text-secondary">Expected Impact</span>
            <span className="text-accent">+3% Readiness</span>
          </div>
        </div>
        <button 
          onClick={() => setIsSprintStarted(true)}
          className="w-full bg-accent text-bg py-5 rounded-sm font-bold uppercase tracking-[4px] shadow-[0_10px_30px_rgba(212,175,55,0.2)] active:scale-95 transition-all"
        >
          Begin Sprint
        </button>
      </div>
    );
  }

  if (quizComplete) {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="p-8 text-center space-y-8 h-full flex flex-col justify-center relative"
      >
        {onExit && (
          <button 
            onClick={onExit}
            className="absolute top-8 right-8 p-2 border border-border text-text-secondary hover:text-accent transition-colors rounded-sm"
          >
            <X size={20} />
          </button>
        )}
        <div className="w-20 h-20 border border-accent rounded-full flex items-center justify-center mx-auto">
          <Trophy className="text-accent w-10 h-10" />
        </div>
        <div className="space-y-2">
          <h2 className="text-4xl italic">Sprint Complete!</h2>
          <p className="text-text-secondary text-sm">Excellent focus, Student. Character is built in the hustle. The success of tomorrow starts today, QCUian!</p>
        </div>
        
        <div className="grid grid-cols-2 gap-4 text-left">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-surface border border-border p-6 rounded-sm"
          >
            <p className="text-[10px] uppercase tracking-[3px] font-bold text-accent mb-2">Exam Readiness</p>
            <p className="text-3xl font-serif italic text-text-primary">+{ (score * 1.5).toFixed(1) }%</p>
            <div className="h-1 w-full bg-border mt-3 rounded-full overflow-hidden">
               <div className="h-full bg-accent w-[65%]" />
            </div>
          </motion.div>
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-surface border border-border p-6 rounded-sm"
          >
            <p className="text-[10px] uppercase tracking-[3px] font-bold text-accent mb-2">Study Streak</p>
            <p className="text-3xl font-serif italic text-text-primary">+1 Day</p>
            <p className="text-[9px] text-text-secondary mt-2 uppercase tracking-widest font-bold">5 Day Milestone reached</p>
          </motion.div>
        </div>

        <div className="bg-surface border border-border p-8 rounded-sm text-left">
          <p className="text-[10px] uppercase tracking-[3px] font-bold text-accent mb-4">Sprint Breakdown</p>
          <div className="flex justify-between items-end">
            <div>
               <p className="text-5xl font-serif italic text-text-primary">
                {Math.round((score / totalAttempted) * 100)}%
              </p>
              <p className="text-[10px] text-text-secondary mt-2">{score} correct / {totalAttempted} attempted</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-accent uppercase tracking-widest font-bold mb-1">Consistency</p>
              <div className="flex gap-1 justify-end">
                {[1,2,3,4,5].map(i => <div key={i} className={`w-1.5 h-3 ${i <= score ? 'bg-accent' : 'bg-border'}`} />)}
              </div>
            </div>
          </div>
        </div>
        
        <button 
          onClick={() => window.location.reload()} 
          className="w-full bg-accent text-bg py-5 rounded-sm font-bold uppercase tracking-widest transition-all hover:bg-white"
        >
          Return to Hub
        </button>
      </motion.div>
    );
  }

  const question = MOCK_QUIZ_POOL[currentPoolIndex];

  return (
    <div className="p-8 space-y-8 pb-32 h-full flex flex-col relative">
      <header className="flex justify-between items-center border-b border-border pb-6 shrink-0">
        <div className="flex items-center gap-3">
          {onExit && (
            <button onClick={onExit} className="p-2 -ml-2 text-text-secondary hover:text-accent transition-colors md:hidden">
              <X size={20} />
            </button>
          )}
          <div className="flex items-center gap-3 text-accent font-bold uppercase tracking-widest text-xs">
            <Timer size={20} className={timeLeft < 60 ? 'animate-pulse text-red-500' : ''} />
            <span className={timeLeft < 60 ? 'text-red-500' : ''}>{formatTime(timeLeft)}</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-accent uppercase tracking-widest">Score: {score}</span>
            <div className="w-1 h-5 bg-border" />
            <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">#{totalAttempted}</span>
          </div>
          {onExit && (
            <button onClick={onExit} className="hidden md:flex p-2 border border-border text-text-secondary hover:text-accent transition-colors rounded-sm text-[10px] font-bold uppercase tracking-widest gap-2 items-center">
              <X size={14} /> Exit
            </button>
          )}
        </div>
      </header>

      <div className="flex-1 flex flex-col justify-center space-y-10">
        <div className="space-y-2 text-center">
          <span className="text-[10px] uppercase tracking-[4px] text-accent font-bold opacity-60">Academic Sprint</span>
          <h2 className="text-2xl font-serif italic leading-relaxed text-text-primary">"{question.question}"</h2>
        </div>
        
        <div className="grid gap-3">
          {question.options.map((option, i) => {
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
                key={i}
                disabled={isAnswered}
                onClick={() => handleOptionSelect(i)}
                className={`w-full p-5 text-left rounded-sm border transition-all flex justify-between items-center group ${bgStyle} ${borderStyle}`}
              >
                <div className="flex items-center gap-4">
                  <span className="text-[10px] font-mono opacity-20">{String.fromCharCode(65 + i)}</span>
                  <span className={`text-sm tracking-tight ${isSelected ? 'font-bold' : ''} ${textColor}`}>
                    {option}
                  </span>
                </div>
                {isAnswered && isCorrect && <CheckCircle2 className="text-green-500" size={18} />}
                {isAnswered && isSelected && !isCorrect && <XCircle className="text-red-500" size={18} />}
              </button>
            );
          })}
        </div>
        
        <AnimatePresence>
          {isAnswered && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-accent/5 border border-accent/20 p-5 rounded-sm space-y-3"
            >
              <div className="flex items-center gap-2 text-accent">
                <Sparkles size={14} />
                <span className="text-[10px] uppercase tracking-[2px] font-bold text-accent">Educational Insight</span>
              </div>
              <p className="text-xs text-text-primary leading-relaxed italic pr-4">
                "{question.explanation}"
              </p>
              <button 
                onClick={handleNext}
                className="w-full bg-accent text-bg py-3 rounded-sm font-bold uppercase tracking-widest text-[10px] mt-2 flex items-center justify-center gap-2"
              >
                Next Task <ArrowRight size={14} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {!isAnswered && onExit && (
        <button 
          onClick={onExit}
          className="mt-4 w-full py-4 border border-red-500/20 text-red-500 text-[10px] uppercase tracking-[4px] font-bold hover:bg-red-500/5 transition-all rounded-sm"
        >
          Exit Sprint
        </button>
      )}

      {!isAnswered && (
        <div className="shrink-0 flex items-center justify-center gap-4 text-text-secondary">
          <AlertCircle size={14} className="opacity-40" />
          <span className="text-[9px] uppercase tracking-widest font-medium italic">Sprint mode: Continuous evaluation active</span>
        </div>
      )}
    </div>
  );
}

