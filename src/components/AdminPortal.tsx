import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { db, auth } from '../firebase';
import { 
  Users, 
  ShieldCheck, 
  CreditCard, 
  LogOut, 
  Search, 
  ChevronRight, 
  Crown,
  CheckCircle2,
  AlertCircle,
  Building2,
  Lock,
  Unlock
} from 'lucide-react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  updateDoc, 
  setDoc,
  getDoc,
  getDocs,
  arrayUnion,
  arrayRemove,
  increment
} from 'firebase/firestore';

const DEPARTMENTS = [
  'COE',
  'CCS',
  'COB',
  'COA',
  'CEd'
];

export default function AdminPortal() {
  const [activeTab, setActiveTab] = useState<'students' | 'billing'>('students');
  const [selectedDept, setSelectedDept] = useState<string | null>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [adminSub, setAdminSub] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  const user = auth.currentUser;

  useEffect(() => {
    if (!user) return;

    // Listen to Admin Subscription
    const unsubSub = onSnapshot(doc(db, 'admin_subscriptions', user.uid), (snap) => {
      if (snap.exists()) {
        setAdminSub(snap.data());
      } else {
        setAdminSub(null);
      }
      setIsLoading(false);
    });

    return () => unsubSub();
  }, [user]);

  useEffect(() => {
    if (!selectedDept) return;

    // Query students in this department/major
    // In our system, 'major' is the field for students
    // We might need to map our DEPARTMENTS list to user majors
    const q = query(collection(db, 'users'), where('major', '==', selectedDept));
    const unsubStudents = onSnapshot(q, (snap) => {
      setStudents(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => unsubStudents();
  }, [selectedDept]);

  const handleSponsor = async (studentId: string, isPremium: boolean) => {
    if (!user || !adminSub || adminSub.status !== 'active') return;
    
    if (!isPremium && adminSub.seatsUsed >= adminSub.maxSeats) {
      alert("Bundle limit reached (30/30). Please upgrade or remove another student.");
      return;
    }

    setIsProcessing(true);
    try {
      // Toggle Premium
      await updateDoc(doc(db, 'users', studentId), { isPremium: !isPremium });

      // Update Admin Sub seats
      await updateDoc(doc(db, 'admin_subscriptions', user.uid), {
        students: !isPremium ? arrayUnion(studentId) : arrayRemove(studentId),
        seatsUsed: increment(!isPremium ? 1 : -1)
      });
    } catch (error) {
      console.error("Error sponsoring student:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBuyBundle = async () => {
    if (!user) return;
    setIsProcessing(true);
    try {
      // Simulate B2G Transaction
      await setDoc(doc(db, 'admin_subscriptions', user.uid), {
        adminId: user.uid,
        status: 'active',
        seatsUsed: 0,
        maxSeats: 30,
        students: [],
        createdAt: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error buying bundle:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredStudents = students.filter(s => 
    s.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-bg text-text-primary flex flex-col font-sans">
      {/* Header */}
      <header className="p-6 border-b border-border bg-glass backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-accent text-bg rounded-sm shadow-lg shadow-accent/20">
              <ShieldCheck size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Admin Portal</h1>
              <p className="text-[10px] uppercase tracking-widest text-text-secondary font-bold">Institutional Control Center</p>
            </div>
          </div>
          <button 
            onClick={() => auth.signOut()}
            className="p-2 hover:text-accent transition-colors opacity-60 hover:opacity-100"
          >
            <LogOut size={20} />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6 max-w-4xl mx-auto w-full space-y-8 pb-32">
        {/* Admin Plan Alert */}
        {!adminSub && !isLoading && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-6 bg-accent/5 border border-accent rounded-sm space-y-4"
          >
            <div className="flex gap-4">
              <Building2 className="text-accent shrink-0" size={32} />
              <div className="space-y-1">
                <h2 className="text-lg font-bold">B2G Institutional Bundle</h2>
                <p className="text-sm text-text-secondary leading-relaxed">
                  Unlock Opusequ for your entire department. One bundle covers <span className="font-bold text-accent">30 students</span> for ₱5,000/month. Bypass all freemium limits for your scholars.
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <button 
                onClick={handleBuyBundle}
                disabled={isProcessing}
                className="flex-1 bg-accent text-bg py-4 px-6 rounded-sm font-bold uppercase tracking-widest flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
              >
                <CreditCard size={18} />
                Activate GCash (₱5,000)
              </button>
              <button 
                onClick={handleBuyBundle}
                disabled={isProcessing}
                className="flex-1 border border-accent text-accent py-4 px-6 rounded-sm font-bold uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-accent/5 transition-all disabled:opacity-50"
              >
                Activate Maya (₱5,000)
              </button>
            </div>
          </motion.div>
        )}

        {adminSub && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-6 border border-border bg-glass rounded-sm space-y-2">
              <p className="text-[10px] uppercase tracking-widest text-text-secondary font-bold">Subscription Status</p>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-accent" />
                <span className="font-bold uppercase tracking-tight">Active Plan</span>
              </div>
            </div>
            <div className="p-6 border border-border bg-glass rounded-sm space-y-2">
              <p className="text-[10px] uppercase tracking-widest text-text-secondary font-bold">Seats Used</p>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold tracking-tighter">{adminSub.seatsUsed} / {adminSub.maxSeats}</span>
                <div className="w-24 h-2 bg-bg rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-accent transition-all duration-500" 
                    style={{ width: `${(adminSub.seatsUsed / adminSub.maxSeats) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Department Switcher */}
        <section className="space-y-4">
          <h2 className="text-[10px] uppercase tracking-[4px] text-text-secondary font-bold">Departmental Management</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {DEPARTMENTS.map(dept => (
              <button
                key={dept}
                onClick={() => setSelectedDept(dept)}
                className={`p-4 text-left border rounded-sm transition-all text-[11px] font-bold uppercase tracking-wider leading-tight h-full flex flex-col justify-between group ${
                  selectedDept === dept ? 'border-accent bg-accent/5 text-accent' : 'border-border bg-glass hover:border-accent/40'
                }`}
              >
                {dept}
                <ChevronRight size={14} className={`mt-4 transform transition-transform ${selectedDept === dept ? 'translate-x-1' : 'opacity-0'}`} />
              </button>
            ))}
          </div>
        </section>

        {/* Student List */}
        {selectedDept ? (
          <motion.section 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-[11px] uppercase tracking-widest font-bold">{selectedDept} Students</h2>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
                <input 
                  type="text" 
                  placeholder="Filter students..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-surface border border-border rounded-sm py-2 pl-9 pr-4 text-xs focus:border-accent outline-none w-full sm:w-64"
                />
              </div>
            </div>

            <div className="border border-border rounded-sm divide-y divide-border bg-glass overflow-hidden">
              {filteredStudents.length > 0 ? (
                filteredStudents.map(student => (
                  <div key={student.id} className="p-4 flex items-center justify-between group">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-surface border border-border flex items-center justify-center text-text-secondary overflow-hidden">
                        {student.photoURL ? (
                          <img src={student.photoURL} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <Users size={20} />
                        )}
                      </div>
                      <div className="space-y-0.5">
                        <p className="font-bold text-sm leading-none">{student.displayName}</p>
                        <p className="text-[10px] text-text-secondary font-mono tracking-tighter">{student.email}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      {student.isPremium && (
                        <div className="hidden sm:flex items-center gap-1 text-[9px] uppercase tracking-widest font-bold text-accent">
                          <Crown size={12} fill="currentColor" />
                          Premium
                        </div>
                      )}
                      
                      <button 
                        onClick={() => handleSponsor(student.id, student.isPremium)}
                        disabled={isProcessing || (!adminSub && !student.isPremium)}
                        className={`p-2 rounded-sm transition-all border ${
                          student.isPremium 
                            ? 'bg-accent/10 border-accent text-accent hover:bg-accent/20' 
                            : 'border-border text-text-secondary hover:border-accent hover:text-accent'
                        } disabled:opacity-30`}
                        title={student.isPremium ? "Remove Sponsor" : "Sponsor Student"}
                      >
                        {student.isPremium ? <Unlock size={18} /> : <Lock size={18} />}
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-12 text-center text-text-secondary space-y-2">
                  <AlertCircle size={32} className="mx-auto opacity-20" />
                  <p className="text-xs italic leading-tight">No students found in this department yet.</p>
                </div>
              )}
            </div>
          </motion.section>
        ) : (
          <div className="p-12 text-center border border-dashed border-border rounded-sm opacity-40">
             <p className="text-[10px] uppercase tracking-[4px] font-bold">Select a department to view scholars</p>
          </div>
        )}
      </main>

      {/* Nav Hint */}
      <footer className="fixed bottom-0 left-0 right-0 p-6 bg-glass backdrop-blur-lg border-t border-border z-40">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
           <div className="w-8 h-8 rounded-full bg-accent/20 text-accent flex items-center justify-center shrink-0">
             <Building2 size={16} />
           </div>
           <p className="text-[10px] text-text-secondary font-medium tracking-wide">
             Institutional mode active. You are viewing student data under QC security protocols.
           </p>
        </div>
      </footer>
    </div>
  );
}
