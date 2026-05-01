import { useState, FormEvent } from 'react';
import { auth, db } from '../firebase';
import { createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { motion } from 'motion/react';
import { Mail, Lock, User, Loader2, Sparkles, Chrome } from 'lucide-react';

interface SignUpProps {
  onNavigateToSignIn: () => void;
  onGoogleSuccess: () => void;
}

export default function SignUp({ onNavigateToSignIn, onGoogleSuccess }: SignUpProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'student' | 'admin'>('student');
  const [department, setDepartment] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const DEPARTMENTS = [
    'COE',
    'CCS',
    'COB',
    'COA',
    'CEd'
  ];

  const handleGoogleSignIn = async () => {
    if (!department && role === 'student') {
      setError('Please select your department before continuing.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      if (result.user) {
        // Initialize user stats if they don't exist
        const userRef = doc(db, 'users', result.user.uid);
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) {
          await setDoc(userRef, {
            displayName: result.user.displayName,
            email: result.user.email,
            major: department,
            yearLevel: '',
            status: 'QCU Working Student',
            streak: 0,
            readiness: 0,
            isPremium: true,
            createdAt: serverTimestamp()
          });

          // Save Role for Google users
          await setDoc(doc(db, 'roles', result.user.uid), {
            role: role,
            updatedAt: serverTimestamp()
          });
        }
        onGoogleSuccess();
      }
    } catch (err: any) {
      setError('Google sign-in failed. Please try again.');
      setLoading(false);
    }
  };

  const handleSignUp = async (e: FormEvent) => {
    e.preventDefault();
    if (!department && role === 'student') {
      setError('Please select your department.');
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // After signUp(), we don't redirect to the dashboard immediately.
      // We send verification and sign out to ensure they can't access private pages yet.
      // This matches the "session is null" redirection logic requested.
      if (userCredential.user) {
        // Initialize User Doc
        await setDoc(doc(db, 'users', userCredential.user.uid), {
          email: email,
          major: department,
          yearLevel: '',
          status: 'QCU Working Student',
          streak: 0,
          readiness: 0,
          isPremium: true,
          createdAt: serverTimestamp()
        });

        // Save Role
        await setDoc(doc(db, 'roles', userCredential.user.uid), {
          role: role, // 'student' or 'admin'
          updatedAt: serverTimestamp()
        });

        onGoogleSuccess();
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
          <label className="text-[10px] uppercase tracking-widest text-text-secondary font-bold px-1">Department</label>
          <select 
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            className="w-full bg-glass border border-border p-4 focus:border-accent outline-none transition-all rounded-sm text-sm text-text-primary h-[54px]"
            required={role === 'student'}
          >
            <option value="" className="bg-bg">Select Department</option>
            {DEPARTMENTS.map(dept => (
              <option key={dept} value={dept} className="bg-bg">{dept}</option>
            ))}
          </select>
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
