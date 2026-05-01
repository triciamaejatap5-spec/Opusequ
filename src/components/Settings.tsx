import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { auth, db } from '../firebase';
import { signOut, deleteUser, updateProfile } from 'firebase/auth';
import { doc, getDoc, updateDoc, deleteDoc, collection, getDocs, query, where, writeBatch } from 'firebase/firestore';
import { 
  User, 
  Bell, 
  Sun, 
  Moon, 
  Shield, 
  LogOut, 
  ChevronRight, 
  Info,
  X,
  Camera,
  Trash2,
  Save,
  Loader2,
  GraduationCap,
  Wifi,
  RefreshCw,
  AlertTriangle,
  Mail
} from 'lucide-react';
import { terminate } from 'firebase/firestore';

interface SettingsProps {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  onExit?: () => void;
  setNotification: (message: string, sub?: string) => void;
  cleanupListeners: () => void;
  isGmailConnected: boolean;
  connectGmail: () => void;
}

export default function Settings({ theme, toggleTheme, onExit, setNotification, cleanupListeners, isGmailConnected, connectGmail }: SettingsProps) {
  const [notifications, setNotifications] = useState(true);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showProfileEdit, setShowProfileEdit] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [profileData, setProfileData] = useState({
    displayName: '',
    yearLevel: '',
    major: '',
    status: '',
    photoURL: ''
  });

  useEffect(() => {
    const fetchProfile = async () => {
      const user = auth.currentUser;
      if (!user) return;
      const snap = await getDoc(doc(db, 'users', user.uid));
      if (snap.exists()) {
        const data = snap.data();
        setProfileData({
          displayName: data.displayName || user.displayName || '',
          yearLevel: data.yearLevel || '',
          major: data.major || '',
          status: data.status || 'QCU Working Student',
          photoURL: data.photoURL || user.photoURL || ''
        });
      }
    };
    fetchProfile();
  }, []);

  const DEPARTMENTS = [
    'COE',
    'CCS',
    'COB',
    'COA',
    'CEd'
  ];

  const STATUS_OPTIONS = [
    'QCU Working Student',
    'QCU Full-Time Student',
    'QCU Alumni'
  ];

  const handleSaveProfile = async () => {
    const user = auth.currentUser;
    if (!user) return;
    setIsLoading(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        displayName: profileData.displayName,
        yearLevel: profileData.yearLevel,
        major: profileData.major,
        status: profileData.status,
        photoURL: profileData.photoURL
      });
      await updateProfile(user, {
        displayName: profileData.displayName,
        photoURL: profileData.photoURL
      });
      setNotification("Profile Updated Successfully!", "Mabuhay! Your academic identity is synced.");
      setShowProfileEdit(false);
    } catch (e) {
      console.error(e);
      setNotification("Error", "Failed to synchronize profile settings.");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const user = auth.currentUser;
    if (!user) return;
    
    setIsLoading(true);
    setUploadProgress(0);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', 'fvfp8zeu');
      formData.append('folder', 'profiles');
      formData.append('public_id', `profile_${user.uid}`);

      const xhr = new XMLHttpRequest();
      xhr.open('POST', 'https://api.cloudinary.com/v1_1/deqy7bn3n/upload', true);

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const progress = (event.loaded / event.total) * 100;
          setUploadProgress(Math.round(progress));
        }
      };

      xhr.onload = async () => {
        if (xhr.status === 200) {
          const response = JSON.parse(xhr.responseText);
          const downloadURL = response.secure_url;
          
          // Force update local and global state
          setProfileData(prev => ({ ...prev, photoURL: downloadURL }));
          await updateDoc(doc(db, 'users', user.uid), { photoURL: downloadURL });
          await updateProfile(user, { photoURL: downloadURL });

          setIsLoading(false);
          setUploadProgress(0);
          setNotification("Identity Sync Complete", "Your profile photo is now active via Cloudinary.");
        } else {
          console.error("Cloudinary upload failed", xhr.responseText);
          setNotification("Upload Failed", "Cloudinary gateway error.");
          setIsLoading(false);
        }
      };

      xhr.onerror = () => {
        setIsLoading(false);
        setNotification("Upload Failed", "Network error during Cloudinary sync.");
      };

      xhr.send(formData);

    } catch (e) {
      console.error("Upload process error:", e);
      setIsLoading(false);
      setNotification("Upload Failed", "An unexpected error occurred during sync.");
    }
  };

  const handleDeleteAccount = async () => {
    const user = auth.currentUser;
    if (!user) return;
    if (window.confirm("CRITICAL WARNING: This action is irreversible. All academic progress and study modules will be permanently purged. Proceed?")) {
      setIsLoading(true);
      try {
        // Step 1: Force Disconnect
        cleanupListeners();
        
        // Step 2: Delete Data
        await deleteDoc(doc(db, 'users', user.uid));
        
        // Step 3: Delete Auth (might require re-auth)
        await deleteUser(user);
        setNotification("Account Purged", "Your data has been erased from Opusequ.");
      } catch (e: any) {
        console.error(e);
        if (e.code === 'auth/requires-recent-login') {
          alert("For security, please re-authenticate before deleting your account.");
          signOut(auth);
        } else {
          setNotification("Purge Failed", "Critical error during data disposal.");
        }
      } finally {
        setIsLoading(false);
      }
    }
  };

  const sections = [
    {
      title: 'Profile & Account',
      items: [
        { 
          icon: <User size={18} />, 
          label: 'Personal Information', 
          value: `${profileData.displayName || 'No Name'} | ${profileData.major || 'No Major'}`,
          action: () => setShowProfileEdit(true)
        },
        { 
          icon: <Shield size={18} />, 
          label: 'Data Privacy', 
          value: 'Protected',
          action: () => setShowPrivacy(true)
        },
      ]
    },
    {
      title: 'Integrations',
      items: [
        { 
          icon: <Mail size={18} className={isGmailConnected ? "text-accent" : "text-text-secondary"} />, 
          label: 'Gmail Notifications', 
          value: isGmailConnected ? 'Connected & Synced' : 'Sync your Gmail for high-priority alerts',
          action: connectGmail
        },
      ]
    },
    {
      title: 'Preferences',
      items: [
        { 
          icon: theme === 'dark' ? <Moon size={18} /> : <Sun size={18} />, 
          label: 'Interface Theme', 
          value: theme === 'dark' ? 'Dark Mode' : 'Light Mode',
          action: toggleTheme
        },
        { 
          icon: <Bell size={18} />, 
          label: 'Smart Reminders', 
          value: notifications ? 'Active' : 'Muted',
          toggle: () => setNotifications(!notifications),
          isToggled: notifications
        }
      ]
    }
  ];

  return (
    <div className="p-8 space-y-10 pb-32 h-full overflow-y-auto scrollbar-hide relative bg-bg">
      <AnimatePresence>
        {showProfileEdit && (
          <motion.div 
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="fixed inset-0 z-50 bg-bg p-8 flex flex-col gap-8 overflow-y-auto"
          >
            <div className="flex justify-between items-center border-b border-border pb-6">
              <h2 className="text-3xl italic">Edit Profile</h2>
              <button onClick={() => setShowProfileEdit(false)} className="p-2 border border-border text-text-secondary rounded-sm">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-8 pb-20">
              <div className="flex flex-col items-center gap-4">
                <div className="relative group">
                  <div className="w-24 h-24 rounded-full border-2 border-accent overflow-hidden bg-surface flex items-center justify-center">
                    {profileData.photoURL ? (
                      <img src={profileData.photoURL} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <User size={40} className="text-text-secondary opacity-20" />
                    )}
                  </div>
                  <label className="absolute bottom-0 right-0 p-2 bg-accent text-bg rounded-full cursor-pointer hover:scale-110 transition-transform">
                    {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
                    <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} disabled={isLoading} />
                  </label>
                </div>
                {isLoading && (
                  <div className="w-full max-w-[100px] space-y-1">
                    <div className="flex justify-between text-[7px] uppercase tracking-widest font-bold text-accent">
                      <span>Syncing...</span>
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
                {profileData.photoURL && (
                  <button 
                    onClick={async () => {
                      const user = auth.currentUser;
                      if (!user) return;
                      setIsLoading(true);
                      try {
                        setProfileData(prev => ({ ...prev, photoURL: '' }));
                        await updateDoc(doc(db, 'users', user.uid), { photoURL: '' });
                        await updateProfile(user, { photoURL: '' });
                        setNotification("Photo Removed", "Your profile returned to default.");
                      } catch (e) {
                        console.error(e);
                      } finally {
                        setIsLoading(false);
                      }
                    }}
                    className="text-[9px] uppercase tracking-widest text-red-500 font-bold"
                  >
                    Remove Photo
                  </button>
                )}
              </div>

              <div className="space-y-6">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-widest text-accent font-bold px-1">Full Name</label>
                  <input 
                    type="text" 
                    value={profileData.displayName}
                    onChange={e => setProfileData(prev => ({ ...prev, displayName: e.target.value }))}
                    className="w-full bg-glass border border-border p-4 focus:border-accent outline-none rounded-sm text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-widest text-accent font-bold px-1">Academic Year</label>
                  <select 
                    value={profileData.yearLevel}
                    onChange={e => setProfileData(prev => ({ ...prev, yearLevel: e.target.value }))}
                    className="w-full bg-glass border border-border p-4 focus:border-accent outline-none rounded-sm text-sm"
                  >
                    <option value="">Select Year</option>
                    <option value="1st Year">1st Year</option>
                    <option value="2nd Year">2nd Year</option>
                    <option value="3rd Year">3rd Year</option>
                    <option value="4th Year">4th Year</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-widest text-accent font-bold px-1">College Department</label>
                  <select 
                    value={profileData.major}
                    onChange={e => setProfileData(prev => ({ ...prev, major: e.target.value }))}
                    className="w-full bg-glass border border-border p-4 focus:border-accent outline-none rounded-sm text-sm text-text-primary h-[54px]"
                  >
                    <option value="" className="bg-bg">Select College</option>
                    {DEPARTMENTS.map(dept => (
                      <option key={dept} value={dept} className="bg-bg">{dept}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-widest text-accent font-bold px-1">Student/Work Status</label>
                  <select 
                    value={profileData.status}
                    onChange={e => setProfileData(prev => ({ ...prev, status: e.target.value }))}
                    className="w-full bg-glass border border-border p-4 focus:border-accent outline-none rounded-sm text-sm text-text-primary h-[54px]"
                  >
                    {STATUS_OPTIONS.map(status => (
                      <option key={status} value={status} className="bg-bg">{status}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-10 space-y-4">
                <button 
                  onClick={handleSaveProfile}
                  disabled={isLoading}
                  className="w-full bg-accent text-bg py-5 rounded-sm font-bold uppercase tracking-[4px] flex items-center justify-center gap-3 transition-all hover:opacity-90 disabled:opacity-50"
                >
                  {isLoading ? <Loader2 size={18} className="animate-spin" /> : <><Save size={18} /> Save Changes</>}
                </button>

                <button 
                  onClick={handleDeleteAccount}
                  className="w-full border border-red-500/20 text-red-500 py-4 rounded-sm text-[10px] uppercase tracking-[4px] font-bold flex items-center justify-center gap-2 hover:bg-red-500/5 transition-all"
                >
                  <Trash2 size={16} /> Delete Account
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {showPrivacy && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-50 bg-bg/95 p-8 flex flex-col justify-center gap-8"
          >
            <div className="flex justify-between items-center border-b border-border pb-6">
              <h2 className="text-3xl italic">Data Privacy</h2>
              <button 
                onClick={() => setShowPrivacy(false)}
                className="p-2 border border-border text-text-secondary rounded-sm"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-6">
              <p className="text-xs text-text-secondary leading-relaxed">
                Student information is encrypted and isolated. We don't sell your data; we use it only to analyze your study habits and suggest the best <span className="text-accent font-bold">Study Windows</span> for your academic success.
              </p>
              
              <div className="bg-glass border border-border p-5 space-y-4">
                <div className="flex items-start gap-4">
                  <div className="p-2 border border-accent/20 text-accent rounded-sm"><Shield size={16} /></div>
                  <div>
                    <h4 className="text-[10px] uppercase tracking-widest font-bold text-text-primary">End-to-End Security</h4>
                    <p className="text-[9px] text-text-secondary leading-normal mt-1 italic">Personal schedules are private to your device.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="p-2 border border-accent/20 text-accent rounded-sm"><Info size={16} /></div>
                  <div>
                    <h4 className="text-[10px] uppercase tracking-widest font-bold text-text-primary">Academic Use ONLY</h4>
                    <p className="text-[9px] text-text-secondary leading-normal mt-1 italic">Data analysis serves goal SDG 4 (Quality Education).</p>
                  </div>
                </div>
              </div>

              <button 
                onClick={() => setShowPrivacy(false)}
                className="w-full bg-accent text-bg py-4 rounded-sm font-bold uppercase tracking-[4px]"
              >
                Acknowledge
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <header className="border-b border-border pb-6 flex justify-between items-end">
        <div className="flex items-center gap-3">
          {onExit && (
            <button onClick={onExit} className="p-2 -ml-2 text-text-secondary hover:text-accent transition-colors">
              <X size={20} />
            </button>
          )}
          <div>
            <h2 className="text-3xl italic">Settings</h2>
            <p className="text-text-secondary text-[10px] uppercase tracking-widest mt-1">Refine your experience</p>
          </div>
        </div>
        {onExit && (
           <button onClick={onExit} className="text-[10px] font-bold uppercase tracking-widest text-text-secondary hover:text-accent transition-colors">
             Exit
           </button>
        )}
      </header>

      <div className="space-y-10">
        {sections.map((section, idx) => (
          <div key={idx} className="space-y-4">
            <h3 className="text-[10px] uppercase tracking-[3px] text-accent font-bold px-1">{section.title}</h3>
            <div className="space-y-1">
              {section.items.map((item, i) => (
                <div 
                  key={i}
                  onClick={item.action}
                  className={`flex items-center gap-4 p-5 bg-glass border-b border-border/50 group transition-all ${item.action ? 'cursor-pointer hover:bg-white/5' : ''}`}
                >
                  <div className="text-accent group-hover:scale-110 transition-transform">
                    {item.icon}
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-bold text-text-primary uppercase tracking-widest">{item.label}</p>
                    <p className="text-[10px] text-text-secondary mt-0.5">{item.value}</p>
                  </div>
                  {item.toggle ? (
                    <button 
                      onClick={(e) => { e.stopPropagation(); item.toggle?.(); }}
                      className={`w-10 h-5 rounded-full relative transition-colors ${item.isToggled ? 'bg-accent' : 'bg-border'}`}
                    >
                      <motion.div 
                        animate={{ x: item.isToggled ? 22 : 2 }}
                        className="w-4 h-4 bg-white rounded-full absolute top-0.5"
                      />
                    </button>
                  ) : (
                    <ChevronRight size={14} className="opacity-20 group-hover:opacity-100 transition-opacity" />
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <button 
        onClick={() => signOut(auth)}
        className="w-full flex items-center justify-center gap-3 p-5 border border-red-500/20 text-red-500 text-[10px] uppercase tracking-[4px] font-bold hover:bg-red-500/5 transition-all"
      >
        <LogOut size={16} />
        Sign Out
      </button>

      <div className="text-center space-y-2 opacity-20 py-10">
        <p className="text-[9px] uppercase tracking-widest font-bold">Opusequ v2.4.0</p>
        <p className="text-[9px] uppercase tracking-widest italic">Designed for QCU Students</p>
      </div>
    </div>
  );
}
