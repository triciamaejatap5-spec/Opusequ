import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { db, auth } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { 
  Crown, 
  Check, 
  X, 
  CreditCard, 
  Zap, 
  ShieldCheck,
  Smartphone,
  QrCode,
  Loader2
} from 'lucide-react';

interface PremiumModalProps {
  isOpen: boolean;
  onClose: () => void;
  reason?: string;
}

export default function PremiumModal({ isOpen, onClose, reason }: PremiumModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const plans = [
    {
      name: 'Monthly Sprint',
      price: '₱99.00',
      period: '/month',
      features: ['Unlimited Quizzes', 'Unlimited Module Uploads', 'Unlimited AI Assistant', 'Unlimited Study Notes'],
      tag: 'Flexible',
      highlight: false
    },
    {
      name: 'Yearly Excellence',
      price: '₱999.00',
      period: '/year',
      features: ['All Premium Features', 'Custom Study Roadmap', 'Priority Gmail Alerts', 'Save ₱189/year'],
      tag: 'Best Value',
      highlight: true
    }
  ];

  const [showQR, setShowQR] = useState(false);

  const handleSimulatePayment = async () => {
    const user = auth.currentUser;
    if (!user) return;
    
    setIsLoading(true);
    try {
      // PROTOTYPE LOGIC: Direct Firestore update to simulate successful payment
      await updateDoc(doc(db, 'users', user.uid), {
        isPremium: true
      });
      // Small Delay for feedback
      setTimeout(() => {
        setIsLoading(false);
        onClose();
        // Skip page reload, just update local state if possible or keep reload for simplicity
        window.location.reload(); 
      }, 1500);
    } catch (e) {
      console.error(e);
      setIsLoading(false);
    }
  };

  const handlePaymentClick = (provider: 'GCash' | 'Maya') => {
    setShowQR(true);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-bg/95 backdrop-blur-md"
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className="w-full max-w-sm bg-surface border border-accent/20 rounded-sm shadow-2xl overflow-hidden flex flex-col max-h-[85vh] relative"
          >
            <AnimatePresence mode="wait">
              {showQR ? (
                <motion.div 
                  key="qr-view"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="p-8 space-y-6 flex flex-col items-center text-center"
                >
                  <div className="flex justify-between items-center w-full mb-2">
                    <button onClick={() => setShowQR(false)} className="text-[9px] uppercase tracking-widest text-text-secondary font-bold hover:text-accent flex items-center gap-2">
                      <Smartphone size={12} /> Change Method
                    </button>
                    <button 
                      onClick={onClose}
                      className="p-1 text-text-secondary hover:text-accent transition-colors"
                    >
                      <X size={18} />
                    </button>
                  </div>
                  
                  <div className="mx-auto w-14 h-14 bg-accent text-bg rounded-full flex items-center justify-center mb-2">
                    <QrCode size={28} />
                  </div>
                  
                  <div className="space-y-1">
                    <h2 className="text-xl italic">Opusequ Upgrade</h2>
                    <p className="text-[9px] uppercase tracking-widest text-text-secondary font-bold">Secure Local Payment Gateway</p>
                  </div>
                  
                  <div className="p-3 bg-white rounded-sm border-4 border-accent shadow-xl">
                    <div className="w-40 h-40 bg-bg flex flex-col items-center justify-center text-text-secondary italic text-[8px] border border-border/50 gap-2">
                       <QrCode size={40} className="opacity-20" />
                       <span className="opacity-40">[SIMULATED_GATEWAY_V2]</span>
                    </div>
                  </div>
                  
                  <p className="text-[10px] text-text-secondary italic max-w-[200px] leading-relaxed">
                    Scan with GCash/Maya to finalize your subscription and unlock unlimited academic tools.
                  </p>
                  
                  <div className="pt-4 w-full">
                    <button 
                      disabled={isLoading}
                      onClick={handleSimulatePayment}
                      className="w-full bg-accent text-bg py-4 rounded-sm font-bold uppercase tracking-[4px] text-[10px] flex items-center justify-center gap-3 transition-all hover:scale-[1.02] active:scale-95"
                    >
                      {isLoading ? <Loader2 size={16} className="animate-spin" /> : "Verify Payment"}
                    </button>
                  </div>
                </motion.div>
              ) : (
                <motion.div 
                  key="pricing-view"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="flex flex-col flex-1 overflow-hidden"
                >
                   <div className="relative p-8 text-center bg-accent/5">
                      <Crown size={80} className="absolute -top-4 -right-4 text-accent opacity-5 rotate-12" />
                      
                      <button 
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 text-text-secondary hover:text-accent transition-colors"
                      >
                        <X size={20} />
                      </button>

                      <div className="mx-auto w-12 h-12 bg-accent text-bg rounded-full flex items-center justify-center mb-4 shadow-lg shadow-accent/20">
                        <Crown size={24} fill="currentColor" />
                      </div>

                      <h2 className="text-2xl font-serif italic mb-1 text-text-primary">Unlock Unlimited</h2>
                      <div className="bg-accent text-bg text-[10px] uppercase tracking-[3px] font-bold py-2 px-4 rounded-sm inline-block mb-3 animate-pulse">
                         3-3-3-3 Trial Capacity Reached
                      </div>
                      <p className="text-[12px] text-text-primary font-bold italic leading-relaxed max-w-[220px] mx-auto mb-2 px-4">
                        {reason || "You've reached the free tier limit for this feature."}
                      </p>
                      <p className="text-[10px] text-text-secondary leading-relaxed max-w-[220px] mx-auto opacity-70 italic">
                        Achieve balance between your rigid work shifts and QC academic demands without limits.
                      </p>
                   </div>

                  <div className="p-6 space-y-6 overflow-y-auto scrollbar-hide">
                    <div className="grid gap-3">
                      {plans.map((plan) => (
                        <div 
                          key={plan.name}
                          onClick={() => handlePaymentClick('GCash')}
                          className={`p-4 border cursor-pointer transition-all hover:scale-[1.02] ${plan.highlight ? 'border-accent bg-accent/5 ring-1 ring-accent/10' : 'border-border bg-glass'}`}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              {plan.tag && (
                                <span className="text-[7px] uppercase tracking-widest bg-accent text-bg px-2 py-0.5 rounded-full font-bold mb-1 inline-block">
                                  {plan.tag}
                                </span>
                              )}
                              <h3 className="text-[11px] font-bold text-text-primary uppercase tracking-tight">{plan.name}</h3>
                            </div>
                            <div className="text-right">
                              <span className="text-xl font-serif italic text-accent">{plan.price}</span>
                              <span className="text-[8px] text-text-secondary block opacity-60">{plan.period}</span>
                            </div>
                          </div>
                          <ul className="space-y-1.5">
                            {plan.features.map(f => (
                              <li key={f} className="flex items-center gap-2 text-[9px] text-text-secondary opacity-80">
                                <Check size={10} className="text-accent shrink-0" /> {f}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>

                    <div className="pt-4 border-t border-border space-y-4">
                       <p className="text-[9px] uppercase tracking-[3px] text-center text-text-secondary font-bold">Pay via GCash or Maya</p>
                       <div className="grid grid-cols-2 gap-2">
                          <button 
                            onClick={() => handlePaymentClick('GCash')}
                            className="flex flex-col items-center justify-center gap-1.5 py-4 border border-border bg-glass rounded-sm hover:border-accent transition-all group relative overflow-hidden"
                          >
                            <div className="w-10 h-6 bg-[#007DFE] rounded-xs flex items-center justify-center shadow-lg">
                              <span className="text-[7px] text-white font-black italic tracking-tighter">GCASH</span>
                            </div>
                            <span className="text-[10px] font-bold text-text-secondary group-hover:text-accent">Open GCash</span>
                          </button>
                          <button 
                            onClick={() => handlePaymentClick('Maya')}
                            className="flex flex-col items-center justify-center gap-1.5 py-4 border border-border bg-glass rounded-sm hover:border-accent transition-all group relative overflow-hidden"
                          >
                            <div className="w-10 h-6 bg-[#2ECC71] rounded-xs flex items-center justify-center shadow-lg">
                              <span className="text-[7px] text-white font-black italic tracking-tighter">MAYA</span>
                            </div>
                            <span className="text-[10px] font-bold text-text-secondary group-hover:text-accent">Open Maya</span>
                          </button>
                       </div>
                    </div>

                    <div className="text-center pt-2">
                       <button 
                         onClick={onClose}
                         className="text-[9px] uppercase tracking-widest text-text-secondary hover:text-accent transition-all font-medium border-b border-transparent hover:border-accent"
                       >
                         Keep exploring Free
                       </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
