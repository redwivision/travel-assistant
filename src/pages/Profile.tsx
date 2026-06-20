import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import { 
  Key, Save, Loader2, 
  LogOut 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Profile() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [nationality, setNationality] = useState('Ethiopia');
  const [expiry, setExpiry] = useState('');
  const [message, setMessage] = useState('');
  
  // Password state
  const [newPassword, setNewPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState('');

  // Haptic feedback helper
  const triggerHaptic = (intensity = 10) => {
    if ('vibrate' in navigator) navigator.vibrate(intensity);
  };

  useEffect(() => {
    async function loadProfile() {
      if (!user) return;
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('passport_nationality, passport_expiry')
          .eq('id', user.id)
          .single();

        if (error) throw error;
        if (data) {
          if (data.passport_nationality) setNationality(data.passport_nationality);
          if (data.passport_expiry) setExpiry(data.passport_expiry);
        }
      } catch (err) {
        console.error('Error loading profile:', err);
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    triggerHaptic(15);
    setSaving(true);
    setMessage('');

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          passport_nationality: nationality,
          passport_expiry: expiry || null,
        })
        .eq('id', user.id);

      if (error) throw error;
      setMessage('Profile updated successfully!');
    } catch (err) {
      console.error('Error saving profile:', err);
      setMessage('Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword) return;
    
    triggerHaptic(15);
    setPasswordSaving(true);
    setPasswordMessage('');

    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setPasswordMessage('Password updated successfully!');
      setNewPassword('');
    } catch (err) {
      console.error('Error updating password:', err);
      setPasswordMessage('Failed to update password.');
    } finally {
      setPasswordSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-navy/20" />
      </div>
    );
  }

  const userName = user?.user_metadata?.full_name || "Traveler";

  return (
    <div className="max-w-lg mx-auto px-6 pt-12 pb-32 min-h-screen">
      {/* Profile Header */}
      <header className="flex flex-col items-center mb-10 text-center">
        <div className="w-24 h-24 bg-navy rounded-3xl flex items-center justify-center shadow-2xl border-4 border-white mb-4 italic">
           <span className="text-white font-black text-4xl uppercase tracking-tighter">
             {userName.split(' ').map((n: string) => n[0]).join('')}
           </span>
        </div>
        <h1 className="text-3xl font-black text-navy uppercase tracking-tighter">{userName}</h1>
        <p className="text-[10px] font-black opacity-30 uppercase tracking-[0.2em] mt-2">Verified Elite Account</p>
      </header>

      <div className="space-y-8">
        {/* Passport Section */}
        <section>
          <p className="text-[10px] font-black opacity-30 uppercase tracking-[0.3em] ml-4 mb-3">Identity Document</p>
          <div className="card-concierge bg-white border-none shadow-sm">
             <form onSubmit={handleSave} className="space-y-6">
                <div>
                   <label className="block text-[10px] font-black opacity-30 uppercase tracking-widest mb-2 ml-1">Nationality</label>
                   <input
                     type="text"
                     value={nationality}
                     disabled
                     className="w-full bg-navy/5 border-none h-14 rounded-2xl px-6 font-black uppercase text-navy/40"
                   />
                   <p className="mt-2 ml-1 text-[8px] font-bold text-navy/30 uppercase tracking-tight">
                     * This engine is currently optimized for Ethiopian passport holders.
                   </p>
                </div>
                <div>
                   <label className="block text-[10px] font-black opacity-30 uppercase tracking-widest mb-2 ml-1">Passport Expiry</label>
                   <input
                     type="date"
                     value={expiry}
                     onChange={(e) => setExpiry(e.target.value)}
                     className="w-full bg-white border-2 border-gray-50 h-14 rounded-2xl px-6 font-black uppercase text-navy focus:border-navy transition-all outline-none"
                   />
                </div>
                {message && (
                  <p className={`text-[10px] font-black uppercase text-center ${message.includes('success') ? 'text-green-600' : 'text-red-500'}`}>
                    {message}
                  </p>
                )}
                <button type="submit" disabled={saving} className="btn-primary w-full shadow-navy/10 active:scale-95 transition-all">
                  {saving ? <Loader2 className="animate-spin" /> : <Save size={20} />}
                  Save Details
                </button>
             </form>
          </div>
        </section>

        {/* Security Section */}
        <section>
          <p className="text-[10px] font-black opacity-30 uppercase tracking-[0.3em] ml-4 mb-3">Cloud Security</p>
          <div className="card-concierge bg-white border-none shadow-sm">
             <form onSubmit={handlePasswordUpdate} className="space-y-6">
                <div>
                   <label className="block text-[10px] font-black opacity-30 uppercase tracking-widest mb-2 ml-1">New Password</label>
                   <input
                     type="password"
                     placeholder="••••••••"
                     value={newPassword}
                     onChange={(e) => setNewPassword(e.target.value)}
                     className="w-full bg-white border-2 border-gray-50 h-14 rounded-2xl px-6 font-black text-navy focus:border-navy transition-all outline-none"
                   />
                </div>
                {passwordMessage && (
                  <p className={`text-[10px] font-black uppercase text-center ${passwordMessage.includes('success') ? 'text-green-600' : 'text-red-500'}`}>
                    {passwordMessage}
                  </p>
                )}
                <button type="submit" disabled={passwordSaving || !newPassword} className="w-full bg-navy/5 text-navy h-14 rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 active:bg-red-50 active:text-red-600 transition-all">
                   {passwordSaving ? <Loader2 className="animate-spin" /> : <Key size={18} />}
                   Update Security Key
                </button>
             </form>
          </div>
        </section>

        {/* Global Actions */}
        <section className="pt-4">
           <button 
             onClick={async () => { triggerHaptic(20); await signOut(); navigate('/login'); }}
             className="w-full h-20 bg-red-50 rounded-3xl flex items-center gap-6 px-8 group active:scale-150 transition-all overflow-hidden"
           >
              <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center group-active:bg-red-500 transition-colors">
                <LogOut className="text-red-500 group-active:text-white" size={20} />
              </div>
              <div className="text-left">
                <p className="text-sm font-black text-red-600 uppercase tracking-tight">Sign Out</p>
                <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest">End Session</p>
              </div>
           </button>
        </section>
      </div>
    </div>
  );
}
