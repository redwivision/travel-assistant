import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase, claimPayment, claimTrial } from '../lib/supabaseClient';
import { 
  ShieldCheck, CreditCard, ArrowLeft, Loader2, 
  CheckCircle2, AlertCircle, Zap, ExternalLink 
} from 'lucide-react';

export default function PaymentGate() {
  const { tripId } = useParams<{ tripId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [txnId, setTxnId] = useState('');
  const [freeCredits, setFreeCredits] = useState(0);
  const [isPending, setIsPending] = useState(false);
  const [tripDestination, setTripDestination] = useState('');

  // 100 ETB fixed price
  const PRICE_ETB = 100;

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate('/login'); return; }

      // Get Credits
      const { data: profile } = await supabase.from('profiles').select('free_credits').eq('id', user.id).single();
      if (profile) setFreeCredits(profile.free_credits);

      // Get Trip
      const { data: trip } = await supabase.from('trips').select('destination, trip_status').eq('id', tripId).single();
      if (trip) {
        setTripDestination(trip.destination);
        if (trip.trip_status === 'paid') {
          setSuccess(true);
        } else if (trip.trip_status === 'pending_verification') {
          setIsPending(true);
        }
      }
      setChecking(false);
    }
    init();
  }, [tripId, navigate]);

  const handleUseTrial = async () => {
    if (!tripId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await claimTrial(parseInt(tripId));
      if (res.success) {
        setSuccess(true);
        setTimeout(() => navigate('/dashboard'), 2000);
      }
    } catch (err: any) {
      setError(err.message || "Failed to use trial credit");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tripId || !txnId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await claimPayment(parseInt(tripId), txnId.trim());
      if (res.success) {
        if (res.status === 'paid') {
          setSuccess(true);
          setTimeout(() => navigate('/dashboard'), 2000);
        } else {
          setIsPending(true);
        }
      }
    } catch (err: any) {
      setError(err.message || "Failed to submit reference");
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <Loader2 className="w-10 h-10 text-navy animate-spin" />
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-surface px-6 text-center">
        <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-8 animate-bounce">
          <CheckCircle2 className="w-12 h-12 text-green-600" />
        </div>
        <h2 className="text-3xl font-black text-navy uppercase italic mb-4">Mission Unlocked</h2>
        <p className="text-navy opacity-60 font-bold mb-8 uppercase tracking-widest text-xs">Premium briefing and automation tools are now active.</p>
        <button onClick={() => navigate('/dashboard')} className="w-full max-w-xs bg-navy text-white font-black py-4 rounded-2xl uppercase tracking-[0.2em] text-[10px] shadow-lg shadow-navy/20">
           Enter Control Center
        </button>
      </div>
    );
  }

  if (isPending) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-surface px-8 text-center">
        <div className="w-24 h-24 bg-amber-100 rounded-full flex items-center justify-center mb-8 relative">
          <div className="absolute inset-0 bg-amber-400/20 rounded-full animate-ping"></div>
          <Loader2 className="w-12 h-12 text-amber-600 animate-spin relative z-10" />
        </div>
        <h2 className="text-2xl font-black text-navy uppercase italic mb-4">Protocol Awaiting Confirmation</h2>
        <p className="text-navy opacity-60 font-bold mb-10 uppercase tracking-widest text-[10px] leading-relaxed max-w-xs">
          Your Transaction ID has been logged. We are waiting for the Telebirr SMS verification to arrive. This usually takes 1-5 minutes.
        </p>
        <button onClick={() => navigate('/dashboard')} className="w-full max-w-xs bg-navy text-white font-black py-4 rounded-2xl uppercase tracking-[0.2em] text-[10px]">
           Return to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface pb-32">
       {/* Header */}
       <header className="bg-white border-b border-gray-100 px-6 py-6 sticky top-0 z-50">
        <div className="max-w-lg mx-auto flex items-center gap-4">
          <button onClick={() => navigate('/dashboard')} className="w-12 h-12 bg-surface hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors">
             <ArrowLeft className="w-6 h-6 text-navy" />
          </button>
          <h1 className="text-2xl font-black text-navy leading-none uppercase italic">Unlock Premium</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-6 mt-10">
        <div className="bg-navy rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden mb-8">
           <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 -mr-16 -mt-16 rounded-full"></div>
           <p className="text-safety-yellow/60 font-black text-[10px] uppercase tracking-[0.3em] mb-2">{tripDestination}</p>
           <h2 className="text-4xl font-black uppercase tracking-tighter italic">Phase Upgrade</h2>
           <div className="mt-8 flex items-baseline gap-2">
              <span className="text-xs opacity-50 uppercase font-black">Investment:</span>
              <span className="text-4xl font-black text-safety-yellow italic">{PRICE_ETB} ETB</span>
           </div>
        </div>

        {freeCredits > 0 && (
          <section className="mb-12">
            <div className="bg-white p-8 rounded-[2.5rem] border-2 border-dashed border-navy/10 flex flex-col items-center text-center">
               <div className="w-12 h-12 bg-navy/5 rounded-2xl flex items-center justify-center mb-4">
                  <Zap className="text-navy" />
               </div>
               <h3 className="text-xl font-black text-navy uppercase mb-1">Trial Access Detected</h3>
               <p className="text-xs font-bold text-navy opacity-40 uppercase mb-8">You have {freeCredits} free mission credit available.</p>
               <button 
                onClick={handleUseTrial}
                disabled={loading}
                className="w-full bg-navy text-white font-black py-4 rounded-2xl uppercase tracking-[0.2em] text-[10px] active:scale-95 transition-all"
               >
                 {loading ? <Loader2 className="animate-spin mx-auto" /> : "Initiate Free Upgrade"}
               </button>
            </div>
            <div className="flex items-center gap-4 my-8">
               <div className="h-[1px] flex-1 bg-navy/5"></div>
               <span className="text-[10px] font-black text-navy/20 uppercase tracking-[0.2em]">OR</span>
               <div className="h-[1px] flex-1 bg-navy/5"></div>
            </div>
          </section>
        )}

        <section className="space-y-6">
           <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
              <h3 className="text-lg font-black text-navy uppercase mb-6 flex items-center gap-3">
                 <CreditCard className="w-5 h-5 text-safety-yellow" /> Telebirr Protocol
              </h3>
              
              <div className="space-y-4 mb-10">
                 <div className="p-4 bg-surface rounded-2xl">
                    <p className="text-[8px] font-black opacity-30 uppercase tracking-widest mb-1">Recipient Account</p>
                    <p className="text-xl font-black text-navy italic">0911223344</p>
                 </div>
                 <div className="p-4 bg-surface rounded-2xl">
                    <p className="text-[8px] font-black opacity-30 uppercase tracking-widest mb-1">Price</p>
                    <p className="text-xl font-black text-navy italic">{PRICE_ETB} ETB</p>
                 </div>
              </div>

              <form onSubmit={handleSubmitPayment} className="space-y-4">
                 <div>
                    <label className="text-[10px] font-black text-navy/40 uppercase tracking-widest ml-4 mb-2 block">Transaction ID (from SMS)</label>
                    <input 
                      type="text" 
                      placeholder="e.g. TXN123456789"
                      value={txnId}
                      onChange={(e) => setTxnId(e.target.value.toUpperCase())}
                      className="w-full bg-surface border-none h-14 rounded-2xl px-6 font-black text-navy uppercase text-sm outline-none focus:ring-2 ring-navy/5"
                    />
                 </div>
                 <button 
                  type="submit"
                  disabled={loading || !txnId}
                  className="w-full bg-safety-yellow text-navy font-black py-4 rounded-2xl uppercase tracking-[0.2em] text-[10px] shadow-lg shadow-safety-yellow/10 active:scale-95 disabled:opacity-50 transition-all font-display"
                 >
                   {loading ? <Loader2 className="animate-spin mx-auto" /> : "Verify Telebirr Reference"}
                 </button>
              </form>
           </div>

           <div className="p-6 bg-navy/5 rounded-3xl">
              <div className="flex gap-4">
                 <AlertCircle className="w-5 h-5 text-navy opacity-20 shrink-0" />
                 <p className="text-[10px] font-bold text-navy opacity-40 uppercase leading-relaxed">
                   Once submitted, our engine will automatically match your Transaction ID with the Telebirr network. UNLOCK is usually instant.
                 </p>
              </div>
           </div>
        </section>
      </main>

      {error && (
        <div className="fixed bottom-24 left-6 right-6 bg-red-500 text-white p-4 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 shadow-2xl z-[100]">
          <AlertCircle className="w-5 h-5" />
          <p className="text-sm font-black uppercase tracking-wide">{error}</p>
        </div>
      )}
    </div>
  );
}
