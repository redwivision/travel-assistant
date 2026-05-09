import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase, getVisaInfo, getSafetyInfo, getWeather, getTrips, saveTrip } from '../lib/supabaseClient';
import type { VisaInfo, SafetyInfo, WeatherForecast, Trip } from '../lib/supabaseClient';
import { ShieldCheck, CloudSun, Globe, CheckCircle2, AlertTriangle, Plus, Loader2, Download, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const DESTINATIONS = [
  "France", "Kenya", "Uganda", "Netherlands", "South Africa", 
  "Madagascar", "South Sudan", "UAE", "USA", "Ethiopia"
];

export default function Dashboard() {
  const { user } = useAuth();
  const [destination, setDestination] = useState("France");
  
  // Widget Data
  const [visa, setVisa] = useState<VisaInfo | null>(null);
  const [safety, setSafety] = useState<SafetyInfo | null>(null);
  const [weather, setWeather] = useState<WeatherForecast | null>(null);
  const [trips, setTrips] = useState<Trip[]>([]);
  
  // Loading states
  const [loadingWidgets, setLoadingWidgets] = useState(false);
  const [loadingTrips, setLoadingTrips] = useState(false);
  const [savingTrip, setSavingTrip] = useState(false);

  // New Trip form state
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const navigate = useNavigate();
  
  // PWA states
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    // Detect if already installed (standalone mode)
    const isStandAloneMode = ('standalone' in window.navigator && (window.navigator as any).standalone) || window.matchMedia('(display-mode: standalone)').matches;
    setIsStandalone(isStandAloneMode);

    // Listen for beforeinstallprompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    }
  };

  const fetchWidgets = async (dest: string) => {
    setLoadingWidgets(true);
    try {
      // Parallel fetch for speed
      const [vData, sData, wData] = await Promise.all([
        getVisaInfo(dest),
        getSafetyInfo(dest),
        getWeather(dest)
      ]);
      setVisa(vData);
      setSafety(sData);
      setWeather(wData);
    } catch (err) {
      console.error("Error fetching widgets:", err);
    }
    setLoadingWidgets(false);
  };

  const fetchTrips = async () => {
    setLoadingTrips(true);
    try {
      const res = await getTrips();
      setTrips(res.trips);
    } catch (err) {
      console.error("Error fetching trips:", err);
    }
    setLoadingTrips(false);
  };

  const handleAddTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingTrip(true);
    try {
      await saveTrip({
        destination,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
      });
      // Refresh trips list
      await fetchTrips();
      setStartDate("");
      setEndDate("");
    } catch (err) {
      console.error("Failed to save trip", err);
    }
    setSavingTrip(false);
  };

  // Run on mount and when destination changes
  useEffect(() => {
    fetchWidgets(destination);
  }, [destination]);

  // Run only on mount
  useEffect(() => {
    fetchTrips();
  }, []);

  const todayWeather = weather?.forecast?.[0];
  const userName = user?.user_metadata?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || "Traveler";

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-6 py-6 sticky top-0 z-50">
        <div className="max-w-2xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-navy rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-xl">{userName.charAt(0).toUpperCase()}</span>
            </div>
            <div>
              <h1 className="text-2xl font-black text-navy leading-none uppercase">{destination}</h1>
              <p className="text-sm font-bold text-navy opacity-60 uppercase tracking-widest mt-1">Concierge</p>
            </div>
          </div>
          <button 
            onClick={() => supabase.auth.signOut()}
            className="text-sm font-bold text-navy opacity-40 hover:opacity-100"
          >
            Sign Out
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 mt-8 space-y-8">
        
        {/* Welcome & Global Destination Selector */}
        <section>
          {!isStandalone && (
            <div className="mb-6">
              {deferredPrompt ? (
                 <button 
                  onClick={handleInstallClick}
                  className="w-full bg-navy text-white py-4 rounded-xl flex justify-center items-center gap-3 font-bold shadow-lg active:scale-95 transition-transform"
                 >
                   <Download className="w-6 h-6 text-safety-yellow" /> INSTALL ASSISTANT APP
                 </button>
              ) : (
                 <div className="w-full bg-blue-50 border-2 border-blue-200 p-4 rounded-xl flex flex-col items-center justify-center text-navy font-bold text-sm text-center">
                   <p className="mb-2 uppercase tracking-wide opacity-50">App Installation</p>
                   <div>
                     {isIOS ? (
                       <>Tap the <span className="inline-block bg-white shadow-sm p-1 rounded"><Download className="w-4 h-4 inline" /> Share</span> button in Safari, then select "Add to Home Screen"</>
                     ) : (
                       <>Open this page in a mobile browser (Chrome/Safari) to install the app directly to your phone!</>
                     )}
                   </div>
                 </div>
              )}
            </div>
          )}

          <p className="text-xl font-bold text-navy opacity-50 mb-2">Welcome, {userName}.</p>
          <div className="flex flex-col sm:flex-row sm:items-end gap-4 mt-4">
             <div className="flex-1">
                <label className="block text-sm font-bold text-navy uppercase tracking-wider mb-2">
                  Select Destination
                </label>
                <select 
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  className="w-full px-4 py-4 rounded-xl border-2 border-gray-200 bg-white focus:border-navy text-xl font-black text-navy uppercase"
                >
                  {DESTINATIONS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
             </div>
             {loadingWidgets && <Loader2 className="w-8 h-8 text-navy animate-spin mb-4" />}
          </div>
        </section>

        {/* Visa Status Block (Always visible) */}
        {visa && (
          <div className={`card-concierge border-0 ${visa.visaRequired ? 'bg-red-50' : 'bg-navy text-white'}`}>
            <div className="flex items-start gap-4 mb-4">
              <div className={`mt-1 font-black px-4 py-1 rounded-lg ${visa.visaRequired ? 'bg-red-500 text-white' : 'bg-safety-yellow text-navy'}`}>
                {visa.visaRequired ? 'VISA REQUIRED' : 'NO VISA NEEDED'}
              </div>
            </div>
            <p className={`text-lg mb-4 opacity-90 ${visa.visaRequired ? 'font-bold' : ''}`}>
              {visa.notes}
            </p>
            {visa.requiredDocuments.length > 0 && (
              <div className="space-y-2 mt-4 opacity-80 text-sm font-medium">
                <p className="font-bold uppercase tracking-wider mb-2">Checklist:</p>
                {visa.requiredDocuments.map((doc, i) => (
                  <p key={i} className="flex items-center gap-2">
                    <CheckCircle2 className={`w-5 h-5 ${visa.visaRequired ? 'text-red-500' : 'text-safety-yellow'}`} /> 
                    {doc}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Weather and Safety Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Weather Card */}
          <div className="card-concierge flex flex-col justify-between min-h-[200px]">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-black text-navy opacity-40 uppercase tracking-widest mb-1">Weather</p>
                <h3 className="text-2xl font-bold truncate max-w-[150px]">{destination}</h3>
              </div>
              <CloudSun className="w-10 h-10 text-navy opacity-20" />
            </div>
            <div className="mt-4 flex items-end gap-3">
              <span className="text-6xl font-black text-navy">{todayWeather?.tempHigh || '--'}°</span>
              <div className="mb-2">
                <p className="font-bold text-lg leading-none">{todayWeather?.condition || 'Loading...'}</p>
                <p className="text-sm font-bold text-navy opacity-50">Low: {todayWeather?.tempLow || '--'}°</p>
              </div>
            </div>
          </div>

          {/* Safety Card */}
          <div className="card-concierge flex flex-col justify-between min-h-[200px] relative overflow-hidden bg-white">
            <div className="flex justify-between items-start z-10">
              <div>
                <p className="text-sm font-black text-navy opacity-40 uppercase tracking-widest mb-1">Safety</p>
                <h3 className="text-2xl font-bold truncate max-w-[150px]">{destination}</h3>
              </div>
              {safety?.safetyLevel === 'Low' ? (
                 <ShieldCheck className="w-10 h-10 text-green-600" />
              ) : (
                 <AlertTriangle className={`w-10 h-10 ${safety?.safetyLevel === 'High' ? 'text-red-600' : 'text-safety-yellow'}`} />
              )}
            </div>
            <div className="mt-4 z-10">
              <p className={`text-2xl font-black ${
                safety?.safetyLevel === 'Low' ? 'text-green-700' : 
                safety?.safetyLevel === 'High' ? 'text-red-700' : 'text-yellow-600'
              }`}>
                Risk: {safety?.safetyLevel || '...'}
              </p>
              <p className="mt-2 text-sm font-bold text-navy opacity-60 leading-tight line-clamp-3">
                {safety?.generalAdvice || 'Loading advice...'}
              </p>

              {safety?.sources && safety.sources.length > 0 && (
                <div className="mt-4 border-t border-gray-100 pt-3">
                  <button 
                    onClick={() => navigate(`/safety/${destination}`)}
                    className="flex justify-between items-center w-full text-sm font-bold opacity-50 hover:opacity-100 transition-opacity"
                  >
                    <span>Read Full Safety Report</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Trips Section */}
        <section className="pt-6 border-t border-gray-200">
           <div className="flex justify-between items-end mb-6">
              <h3 className="text-2xl font-black text-navy uppercase">My Trips</h3>
              {loadingTrips && <Loader2 className="w-5 h-5 animate-spin text-navy opacity-40" />}
           </div>

           {/* Add Trip Form Inline */}
           <form onSubmit={handleAddTrip} className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm mb-6 flex flex-col sm:flex-row gap-4 items-end">
             <div className="w-full sm:w-auto flex-1">
                <label className="block text-xs font-bold text-navy opacity-50 uppercase mb-1">Target Date (Opt)</label>
                <input 
                  type="date" 
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-surface border border-gray-100 rounded-xl px-4 py-3 font-medium text-navy" 
                />
             </div>
             <button 
                type="submit" 
                disabled={savingTrip}
                className="w-full sm:w-auto bg-navy text-safety-yellow font-black px-6 py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-navy-light transition disabled:opacity-50"
              >
                {savingTrip ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                Track {destination}
              </button>
           </form>

           {/* Trips List */}
           <div className="space-y-4">
             {trips.length === 0 && !loadingTrips ? (
               <p className="text-center font-bold text-navy opacity-40 py-8 bg-surface rounded-3xl">No trips tracked yet.</p>
             ) : (
               trips.map(trip => (
                 <div key={trip.id} className="flex items-center justify-between p-5 bg-white border border-gray-100 rounded-2xl">
                    <div className="flex items-center gap-4">
                       <div className="w-12 h-12 bg-surface rounded-xl flex items-center justify-center">
                         <Globe className="w-6 h-6 text-navy opacity-30" />
                       </div>
                       <div>
                         <p className="font-black text-lg text-navy uppercase">{trip.destination}</p>
                         <p className="text-sm font-bold text-navy opacity-40">
                           {trip.start_date ? new Date(trip.start_date).toLocaleDateString() : 'No date set'}
                         </p>
                       </div>
                    </div>
                 </div>
               ))
             )}
           </div>
        </section>

      </main>
    </div>
  );
}
