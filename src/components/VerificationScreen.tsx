import { motion } from 'motion/react';
import { Mail, ArrowRight } from 'lucide-react';

interface VerificationScreenProps {
  email: string;
  onNavigateToSignIn: () => void;
}

export default function VerificationScreen({ email, onNavigateToSignIn }: VerificationScreenProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="p-8 space-y-8 flex flex-col justify-center min-h-screen text-center"
    >
      <div className="space-y-4">
        <div className="w-16 h-16 bg-accent/10 border border-accent/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <Mail className="text-accent" size={32} />
        </div>
        <h1 className="text-4xl italic text-accent leading-tight">Verify Your Opus</h1>
        <p className="text-sm text-text-secondary leading-relaxed px-4 italic">
          Check your inbox for a verification email from Opusequ. 
          We have sent a verification link to <span className="text-text-primary font-bold not-italic underline decoration-accent/30">{email}</span>.
        </p>
      </div>

      <div className="pt-8 flex flex-col gap-4">
        <button 
          onClick={onNavigateToSignIn}
          className="w-full bg-accent text-bg py-4 rounded-sm font-bold uppercase tracking-[4px] flex items-center justify-center gap-2 hover:opacity-90 transition-all active:scale-[0.98]"
        >
          Login <ArrowRight size={18} />
        </button>
        
        <p className="text-[10px] uppercase tracking-[3px] text-text-secondary font-bold">
          Quality Education requires discipline.
        </p>
      </div>
    </motion.div>
  );
}
