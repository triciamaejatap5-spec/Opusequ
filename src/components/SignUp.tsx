import { useState, FormEvent } from 'react';
import { auth } from '../firebase';
import { createUserWithEmailAndPassword, sendEmailVerification, signOut, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { motion } from 'motion/react';
import { Mail, Lock, User, Loader2, Sparkles, Chrome } from 'lucide-react';

interface SignUpProps {
  onVerificationSent: (email: string) => void;
  onNavigateToSignIn: () => void;
  onGoogleSuccess: () => void;
}

export default function SignUp({ onVerificationSent, onNavigateToSignIn, onGoogleSuccess }: SignUpProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'student' | 'admin'>('student');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      if (result.user) {
        onGoogleSuccess();
      }
    } catch (err: any) {
      setError('Google sign-in failed. Please try again.');
      setLoading(false);
    }
  };

  const handleSignUp = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      if (userCredential.user) {
        await sendEmailVerification(userCredential.user);
        await signOut(auth);
        onVerificationSent(email);
      }
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') {
        setError('This email is already registered. Please sign in instead.');
      } else if (err.code === 'auth/weak-password') {
        setError('Password is too weak. Please use at least 6 characters.');
      } else if (err.code === 'auth/invalid-email') {
        setError('Please provide a valid QCU student email address.');
      } else {
        setError('Registration failed: ' + err.message);
      }
      setLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-8 space-y-8 flex flex-col justify-center min-h-screen"
    >
      <div className="space-y-2 text-center">
        <h1 className="text-5xl italic text-accent">Opusequ</h1>
        <p className="text-text-secondary text-[10px] uppercase tracking-[4px] font-bold">SDG 4: Quality Education</p>
      </div>

      <form onSubmit={handleSignUp} className="space-y-5">
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

        <div className="space-y-1">
          <label className="text-[10px] uppercase tracking-widest text-text-secondary font-bold px-1">Your Role</label>
          <div className="flex gap-2">
            <button 
              type="button"
              onClick={() => setRole('student')}
              className={`flex-1 p-4 border transition-all rounded-sm text-[10px] uppercase tracking-widest font-bold flex items-center justify-center gap-2 ${role === 'student' ? 'bg-accent/10 border-accent text-accent' : 'border-border text-text-secondary'}`}
            >
              <User size={14} /> Student
            </button>
            <button 
              type="button"
              onClick={() => setRole('admin')}
              className={`flex-1 p-4 border transition-all rounded-sm text-[10px] uppercase tracking-widest font-bold flex items-center justify-center gap-2 ${role === 'admin' ? 'bg-accent/10 border-accent text-accent' : 'border-border text-text-secondary'}`}
            >
              <Sparkles size={14} /> Admin
            </button>
          </div>
        </div>

        {error && (
          <p className="text-red-500 text-[10px] uppercase tracking-widest font-bold text-center italic">{error}</p>
        )}

        <button 
          type="submit" 
          disabled={loading}
          className="w-full bg-accent text-bg py-4 rounded-sm font-bold uppercase tracking-[4px] flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50 transition-all active:scale-[0.98] mt-4"
        >
          {loading ? <Loader2 size={18} className="animate-spin" /> : 'Register for Aequus'}
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
          <Chrome size={18} /> Register with Google
        </button>
      </form>

      <div className="text-center">
        <button 
          onClick={onNavigateToSignIn}
          className="text-[10px] uppercase tracking-widest text-text-secondary hover:text-accent transition-colors"
        >
          Already have an account? <span className="text-accent font-bold">Sign In</span>
        </button>
      </div>
    </motion.div>
  );
}
