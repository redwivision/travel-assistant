import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import { ArrowLeft, Save, Loader2, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Profile() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [nationality, setNationality] = useState('Ethiopia');
  const [expiry, setExpiry] = useState('');
  const [message, setMessage] = useState('');

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

  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-navy" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20">
      <header className="bg-white border-b border-gray-100 px-6 py-4 sticky top-0 z-50">
        <div className="max-w-2xl mx-auto flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <ArrowLeft className="w-6 h-6 text-navy" />
          </button>
          <div>
            <h1 className="text-2xl font-black text-navy leading-none uppercase">Settings</h1>
            <p className="text-sm font-bold text-navy opacity-60 uppercase tracking-widest mt-1">Travel Profile</p>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 mt-8">
        <div className="card-concierge bg-white border-0">
          <div className="flex items-center gap-3 mb-6">
            <AlertCircle className="w-6 h-6 text-safety-yellow" />
            <h2 className="text-xl font-bold text-navy uppercase">Passport Information</h2>
          </div>
          
          <p className="text-sm text-navy/70 mb-6 font-medium">
            Your passport information is used to provide accurate visa requirements and border entry advice securely and privately.
          </p>

          <form onSubmit={handleSave} className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-navy uppercase tracking-wider mb-2">
                Passport Nationality
              </label>
              <input
                type="text"
                value={nationality}
                onChange={(e) => setNationality(e.target.value)}
                className="w-full px-4 py-4 rounded-xl border-2 border-gray-200 bg-white focus:border-navy text-lg font-bold text-navy uppercase"
                disabled
              />
              <p className="text-xs text-navy/50 font-bold mt-2">Currently locked for MVP.</p>
            </div>

            <div>
              <label className="block text-sm font-bold text-navy uppercase tracking-wider mb-2">
                Passport Expiry Date
              </label>
              <input
                type="date"
                value={expiry}
                onChange={(e) => setExpiry(e.target.value)}
                className="w-full px-4 py-4 rounded-xl border-2 border-gray-200 bg-white focus:border-navy text-lg font-bold text-navy uppercase"
                required
              />
            </div>

            {message && (
              <p className={`font-bold text-sm ${message.includes('success') ? 'text-green-600' : 'text-red-600'}`}>
                {message}
              </p>
            )}

            <button
              type="submit"
              disabled={saving}
              className="w-full bg-navy text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-opacity-90 transition-all active:scale-95"
            >
              {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              {saving ? 'SAVING...' : 'SAVE PROFILE'}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
