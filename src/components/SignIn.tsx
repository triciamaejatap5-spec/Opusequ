import { useState, FormEvent } from 'react';
import { auth } from '../firebase';
import { signInWithEmailAndPassword, signOut, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { motion } from 'motion/react';
import { Mail, Lock, Loader2, ArrowRight, Chrome } from 'lucide-react';

interface SignInProps {
  onSuccess: () => void;
  onNavigateToSignUp: () => void;
}

export default function SignIn({ onSuccess, onNavigateToSignUp }: SignInProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      if (result.user) {
        onSuccess();
      }
    } catch (err: any) {
      setError('Google sign-in failed. Please try again.');
      setLoading(false);
    }
  };

  const handleSignIn = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      if (userCredential.user) {
        if (!userCredential.user.emailVerified) {
          setError('Please verify your email before logging in. Check your inbox!');
          await signOut(auth);
          setLoading(false);
        } else {
          onSuccess();
        }
      }
    } catch (err: any) {
      setError('Email or password is incorrect');
      setLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-8 space-y-10 flex flex-col justify-center min-h-screen"
    >
      <div className="space-y-2 text-center">
        <h1 className="text-5xl italic text-accent">Opusequ</h1>
        <p className="text-text-secondary text-[10px] uppercase tracking-[4px] font-bold">Balance your Hustle</p>
      </div>

      <form onSubmit={handleSignIn} className="space-y-6">
        <div className="space-y-1">
          <label className="text-[10px] uppercase tracking-widest text-text-secondary font-bold px-1">Email</label>
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary" size={16} />
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-glass border border-border p-4 pl-12 focus:border-accent outline-none transition-all rounded-sm text-sm"
              placeholder="student@qcu.edu.ph"
              required
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] uppercase tracking-widest text-text-secondary font-bold px-1">Password</label>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary" size={16} />
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-glass border border-border p-4 pl-12 focus:border-accent outline-none transition-all rounded-sm text-sm"
              placeholder="••••••••"
              required
            />
          </div>
        </div>

        {error && (
          <p className="text-red-500 text-[10px] uppercase tracking-widest font-bold text-center italic">{error}</p>
        )}

        <button 
          type="submit" 
          disabled={loading}
          className="w-full bg-accent text-bg py-4 rounded-sm font-bold uppercase tracking-[4px] flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50 transition-all active:scale-[0.98]"
        >
          {loading ? <Loader2 size={18} className="animate-spin" /> : 'Enter Hub'}
          {!loading && <ArrowRight size={16} />}
        </button>

        <div className="relative py-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border"></div>
          </div>
          <div className="relative flex justify-center">
            <span className="bg-bg px-4 text-[10px] uppercase tracking-[3px] text-text-secondary font-bold">OR</span>
          </div>
        </div>

        <button 
          type="button"
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full bg-glass border border-border py-4 rounded-sm font-bold uppercase tracking-[4px] flex items-center justify-center gap-2 hover:bg-glass/80 disabled:opacity-50 transition-all text-sm"
        >
          <Chrome size={18} /> Continue with Google
        </button>
      </form>

      <div className="text-center">
        <button 
          onClick={onNavigateToSignUp}
          className="text-[10px] uppercase tracking-widest text-text-secondary hover:text-accent transition-colors"
        >
          New QCU student? <span className="text-accent font-bold">Register here</span>
        </button>
      </div>
    </motion.div>
  );
}
