import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase, parseItinerary } from '../lib/supabaseClient';
import { 
  ArrowLeft, Plane, Hotel, CheckCircle2, 
  Loader2, AlertCircle, Send, ClipboardPaste,
  Clock
} from 'lucide-react';

export default function ItineraryParser() {
  const { tripId } = useParams<{ tripId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [rawText, setRawText] = useState('');
  const [itinerary, setItinerary] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate('/login'); return; }

      const { data: trip } = await supabase.from('trips').select('parsed_itinerary').eq('id', tripId).single();
      if (trip?.parsed_itinerary) {
        setItinerary(trip.parsed_itinerary);
      }
      setChecking(false);
    }
    load();
  }, [tripId, navigate]);

  const handleParse = async () => {
    if (!tripId || !rawText) return;
    setLoading(true);
    setError(null);
    try {
      const res = await parseItinerary(parseInt(tripId), rawText);
      setItinerary(res.itinerary);
    } catch (err: any) {
      setError(err.message || "Failed to parse itinerary. Please try pasting a clearer version.");
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

  return (
    <div className="min-h-screen bg-surface pb-32">
       {/* Header */}
       <header className="bg-white border-b border-gray-100 px-6 py-6 sticky top-0 z-50">
        <div className="max-w-lg mx-auto flex items-center gap-4">
          <button onClick={() => navigate('/dashboard')} className="w-10 h-10 bg-surface rounded-xl flex items-center justify-center">
             <ArrowLeft size={18} className="text-navy" />
          </button>
          <h1 className="text-xl font-black text-navy leading-none uppercase italic">Intelligence Parser</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-6 mt-10">
        {!itinerary ? (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
             <div className="bg-navy rounded-[2.5rem] p-10 text-white shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 -mr-16 -mt-16 rounded-full"></div>
                <h2 className="text-2xl font-black uppercase tracking-tighter italic mb-2">Deploy Scout</h2>
                <p className="text-xs font-bold text-white/50 uppercase leading-relaxed uppercase tracking-widest">
                  Paste your airline confirmation email text. Our engine will map the terminal, seat, and flight protocol automatically.
                </p>
             </div>

             <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
                <textarea 
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  placeholder="Paste your email confirmation here..."
                  className="w-full h-64 bg-surface border-none rounded-2xl p-6 font-bold text-sm text-navy outline-none focus:ring-2 ring-navy/5 resize-none mb-6 placeholder:italic placeholder:opacity-30"
                />
                <button 
                  onClick={handleParse}
                  disabled={loading || !rawText}
                  className="w-full bg-navy text-white font-black py-4 rounded-2xl flex items-center justify-center gap-3 uppercase tracking-[0.2em] text-[10px] shadow-lg shadow-navy/20 active:scale-95 disabled:opacity-50 transition-all font-display"
                >
                  {loading ? <Loader2 className="animate-spin" /> : <><Send size={14} /> Initialize Extraction Scan</>}
                </button>
             </div>
          </div>
        ) : (
          <div className="space-y-6 animate-in zoom-in-95 duration-500">
             {/* Flight Status Card */}
             <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-xl relative overflow-hidden">
                <div className="flex justify-between items-start mb-10">
                   <div className="p-3 bg-navy text-white rounded-2xl">
                      <Plane size={24} className="italic" />
                   </div>
                   <div className="text-right">
                      <p className="text-[10px] font-black opacity-30 uppercase tracking-[0.2em]">Deployment Rank</p>
                      <p className="text-xl font-black text-navy uppercase italic">{itinerary.airline || 'Unknown Air'}</p>
                   </div>
                </div>

                <div className="flex justify-between items-center gap-4 mb-10 relative">
                   <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-[2px] bg-navy/5 -z-0"></div>
                   <div className="z-10 bg-white pr-4">
                      <h3 className="text-4xl font-black text-navy italic uppercase">{itinerary.departureCity || '---'}</h3>
                      <p className="text-[10px] font-black opacity-30 uppercase mt-1">Origin</p>
                   </div>
                   <div className="z-10 bg-white px-2">
                      <div className="w-10 h-10 border-2 border-navy/10 rounded-full flex items-center justify-center bg-white">
                         <Clock size={16} className="text-navy/20" />
                      </div>
                   </div>
                   <div className="z-10 bg-white pl-4 text-right">
                      <h3 className="text-4xl font-black text-navy italic uppercase">{itinerary.arrivalCity || '---'}</h3>
                      <p className="text-[10px] font-black opacity-30 uppercase mt-1">Target</p>
                   </div>
                </div>

                <div className="grid grid-cols-3 gap-4 border-t border-gray-50 pt-8">
                   <div>
                      <p className="text-[8px] font-black opacity-20 uppercase tracking-widest mb-1">Flight</p>
                      <p className="text-sm font-black text-navy italic">{itinerary.flightNumber || '---'}</p>
                   </div>
                   <div className="text-center">
                      <p className="text-[8px] font-black opacity-20 uppercase tracking-widest mb-1">Terminal</p>
                      <p className="text-sm font-black text-navy italic">{itinerary.terminal || '---'}</p>
                   </div>
                   <div className="text-right">
                      <p className="text-[8px] font-black opacity-20 uppercase tracking-widest mb-1">Seat</p>
                      <p className="text-sm font-black text-navy italic">{itinerary.seat || '---'}</p>
                   </div>
                </div>
             </div>

             {/* Hotel Status Card */}
             {itinerary.hotelName && (
               <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-lg">
                  <div className="flex gap-6 items-center">
                     <div className="w-14 h-14 bg-surface rounded-2xl flex items-center justify-center shrink-0">
                        <Hotel className="text-navy" size={24} />
                     </div>
                     <div className="flex-1 overflow-hidden">
                        <p className="text-[8px] font-black opacity-30 uppercase tracking-[0.2em] mb-1">Logistics: Base Camp</p>
                        <h4 className="text-lg font-black text-navy truncate uppercase italic">{itinerary.hotelName}</h4>
                        <p className="text-[10px] font-bold text-navy/40 truncate uppercase">{itinerary.hotelAddress}</p>
                     </div>
                  </div>
               </div>
             )}

             <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => setItinerary(null)}
                  className="bg-navy/5 text-navy font-black py-4 rounded-2xl flex items-center justify-center gap-3 uppercase tracking-[0.2em] text-[10px]"
                >
                  <ClipboardPaste size={14} /> Re-Scan 
                </button>
                <button 
                  onClick={() => navigate('/dashboard')}
                  className="bg-navy text-white font-black py-4 rounded-2xl flex items-center justify-center gap-3 uppercase tracking-[0.2em] text-[10px] shadow-lg shadow-navy/20"
                >
                  Confirm Log <CheckCircle2 size={14} />
                </button>
             </div>
          </div>
        )}
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
