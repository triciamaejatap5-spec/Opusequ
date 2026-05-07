import React, { useState, useEffect } from 'react';
import { auth } from '../firebase';
import { sendEmailVerification, signOut, reload } from 'firebase/auth';
import { motion } from 'motion/react';
import { Mail, RefreshCw, LogOut, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';

interface VerificationScreenProps {
  user: any;
  onVerified: () => void;
}

export default function VerificationScreen({ user, onVerified }: VerificationScreenProps) {
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [resent, setResent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleResend = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      await sendEmailVerification(user);
      setResent(true);
      setTimeout(() => setResent(false), 5000);
    } catch (err: any) {
      console.error("Resend Error:", err);
      setError("Failed to resend verification email. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const handleCheckStatus = async () => {
    setChecking(true);
    setError(null);
    try {
      await reload(user);
      if (auth.currentUser?.emailVerified) {
        onVerified();
      } else {
        setError("Email not yet verified. Please check your inbox and click the link.");
      }
    } catch (err: any) {
      console.error("Status Check Error:", err);
      setError("Failed to check verification status.");
    } finally {
      setChecking(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error("Logout Error:", err);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-8 space-y-10 flex flex-col justify-center min-h-screen text-center"
    >
      <div className="space-y-4">
        <div className="mx-auto w-20 h-20 bg-accent/10 rounded-full flex items-center justify-center border border-accent/20">
          <Mail size={40} className="text-accent" />
        </div>
        <h1 className="text-3xl italic text-accent">Verify Your Email</h1>
        <p className="text-text-secondary text-sm leading-relaxed max-w-xs mx-auto">
          We've sent a verification link to <span className="text-text-primary font-bold">{user?.email}</span>. Please verify your account to access the hub.
        </p>
      </div>

      <div className="space-y-4">
        <button
          onClick={handleCheckStatus}
          disabled={checking}
          className="w-full bg-accent text-bg py-4 rounded-sm font-bold uppercase tracking-[4px] flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50 transition-all active:scale-[0.98]"
        >
          {checking ? <Loader2 size={18} className="animate-spin" /> : 'I have verified'}
        </button>

        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={handleResend}
            disabled={loading || resent}
            className="flex items-center justify-center gap-2 py-3 bg-glass border border-border rounded-sm text-[10px] uppercase tracking-widest font-bold hover:bg-glass/80 transition-all disabled:opacity-50"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            {resent ? 'Sent' : 'Resend'}
          </button>
          
          <button
            onClick={handleLogout}
            className="flex items-center justify-center gap-2 py-3 bg-glass border border-border rounded-sm text-[10px] uppercase tracking-widest font-bold hover:bg-glass/80 transition-all"
          >
            <LogOut size={14} />
            Logout
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 justify-center text-red-500 text-[10px] uppercase tracking-widest font-bold">
          <AlertCircle size={14} />
          {error}
        </div>
      )}

      {resent && (
        <div className="flex items-center gap-2 justify-center text-[#7ED321] text-[10px] uppercase tracking-widest font-bold">
          <CheckCircle2 size={14} />
          Verification email resent!
        </div>
      )}

      <div className="pt-10">
        <p className="text-[10px] uppercase tracking-[4px] text-text-secondary font-bold opacity-50">Padayon, Future Engineer!</p>
      </div>
    </motion.div>
  );
}
