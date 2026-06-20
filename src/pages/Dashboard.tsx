import { useEffect, useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase, getVisaInfo, getSafetyInfo, getWeather, getElectricalInfo, getTrips, saveTrip, deleteTrip } from '../lib/supabaseClient';
import type { VisaInfo, SafetyInfo, WeatherForecast, ElectricalInfo, Trip } from '../lib/supabaseClient';
import { 
  ShieldCheck, CloudSun, Globe, CheckCircle2, AlertTriangle, 
  Plus, Loader2, Download, ArrowRight, 
  Trash2, Zap, PlaneTakeoff, RefreshCw 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { generateBriefing } from '../utils/generateBriefing';

const DESTINATIONS = [
  "South Africa", "Mozambique", "Madagascar", "Kenya", "Zimbabwe", 
  "Botswana", "USA", "Germany", "Thailand", "Philippines", "Brazil"
];

const CITY_MAPPINGS: Record<string, string[]> = {
  "kenya": ["Nairobi", "Mombasa", "Kisumu"],
  "uganda": ["Kampala", "Entebbe", "Jinja"],
  "france": ["Paris", "Marseille", "Lyon", "Nice"],
  "netherlands": ["Amsterdam", "Rotterdam", "Utrecht"],
  "south africa": ["Cape Town", "Johannesburg", "Durban"],
  "madagascar": ["Antananarivo", "Nosy Be", "Toamasina"],
  "south sudan": ["Juba", "Malakal", "Wau"],
  "uae": ["Dubai", "Abu Dhabi", "Sharjah"],
  "usa": ["New York", "Los Angeles", "Chicago", "Miami"],
  "ethiopia": ["Addis Ababa", "Dire Dawa", "Bahir Dar"],
  "botswana": ["Gaborone", "Francistown"],
  "mozambique": ["Maputo", "Beira", "Nampula"],
};

interface DashboardProps {
  showOnlyTrips?: boolean;
  showOnlyWeather?: boolean;
}

export default function Dashboard({ showOnlyTrips, showOnlyWeather }: DashboardProps) {
  const { user } = useAuth();
  const [destination, setDestination] = useState("South Africa");
  const navigate = useNavigate();
  
  // Widget Data
  const [visa, setVisa] = useState<VisaInfo | null>(null);
  const [safety, setSafety] = useState<SafetyInfo | null>(null);
  const [weather, setWeather] = useState<WeatherForecast | null>(null);
  const [electrical, setElectrical] = useState<ElectricalInfo | null>(null);
  const [currentCity, setCurrentCity] = useState<string>('');
  const [trips, setTrips] = useState<Trip[]>([]);
  const [passportExpiry, setPassportExpiry] = useState<string | undefined>();
  
  // Loading & Error states
  const [loadingWidgets, setLoadingWidgets] = useState(false);
  const [widgetError, setWidgetError] = useState<string | null>(null);
  const [loadingTrips, setLoadingTrips] = useState(false);
  const [savingTrip, setSavingTrip] = useState(false);

  // New Trip form state
  const [startDate, setStartDate] = useState("");
  const [notes, setNotes] = useState("");

  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [freeCredits, setFreeCredits] = useState(0);
  const [activeTrip, setActiveTrip] = useState<Trip | null>(null);

  // Cache & Control
  const widgetCache = useRef<Map<string, { visa: VisaInfo; safety: SafetyInfo; weather: WeatherForecast; electrical: ElectricalInfo }>>(new Map());
  const abortControllerRef = useRef<AbortController | null>(null);

  // Haptic feedback helper
  const triggerHaptic = (intensity = 10) => {
    if ('vibrate' in navigator) navigator.vibrate(intensity);
  };

  // Initialization
  useEffect(() => {
    const isStandAloneMode = ('standalone' in window.navigator && (window.navigator as any).standalone) || window.matchMedia('(display-mode: standalone)').matches;
    setIsStandalone(isStandAloneMode);

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);

    // Offline Hydration
    const cached = localStorage.getItem('travel_assistant_widget_cache');
    if (cached) {
      try {
        const { dest, data } = JSON.parse(cached);
        setDestination(dest);
        setVisa(data.visa);
        setSafety(data.safety);
        setWeather(data.weather);
        setElectrical(data.electrical);
        widgetCache.current.set(dest, data);
      } catch (err) {
        console.error("Cache hydration failed", err);
      }
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    triggerHaptic(20);
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') setDeferredPrompt(null);
    }
  };

  // Fetch Passport Expiry
  useEffect(() => {
    async function loadPassport() {
      if (!user) return;
      try {
        const { data } = await supabase.from('profiles').select('passport_expiry').eq('id', user.id).single();
        if (data?.passport_expiry) setPassportExpiry(data.passport_expiry);
      } catch (err) {
        console.error("Failed to load passport expiry:", err);
      }
    }
    loadPassport();
  }, [user]);

  const fetchWidgets = async (dest: string, overrideExpiry?: string, city?: string, force = false) => {
    // 1. Cancel previous pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    const { signal } = abortControllerRef.current;

    const cityToUse = city || (CITY_MAPPINGS[dest.toLowerCase()] ? CITY_MAPPINGS[dest.toLowerCase()][0] : dest);
    
    // Check Cache (only if not forcing refresh)
    if (!city && !force && widgetCache.current.has(dest)) {
      const cached = widgetCache.current.get(dest)!;
      setVisa(cached.visa);
      setSafety(cached.safety);
      setWeather(cached.weather);
      setElectrical(cached.electrical);
      setCurrentCity(cityToUse);
      return;
    }

    setLoadingWidgets(true);
    setWidgetError(null);
    
    try {
      const expiry = overrideExpiry || passportExpiry;
      
      // Note: getVisaInfo and others should ideally support signals, 
      // but we wrap the state update in the signal check for now.
      const [vData, sData, wData, eData] = await Promise.all([
        getVisaInfo(dest, "ethiopia", expiry),
        getSafetyInfo(dest),
        getWeather(dest, undefined, cityToUse),
        getElectricalInfo(dest)
      ]);

      if (signal.aborted) return; // Ignore stale data

      setVisa(vData);
      setSafety(sData);
      setWeather(wData);
      setElectrical(eData);
      setCurrentCity(cityToUse);
      
      if (!city) {
        widgetCache.current.set(dest, { visa: vData, safety: sData, weather: wData, electrical: eData });
        localStorage.setItem('travel_assistant_widget_cache', JSON.stringify({
          dest,
          data: { visa: vData, safety: sData, weather: wData, electrical: eData }
        }));
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      console.error("Error fetching widgets:", err);
      setWidgetError("Connection error. Using cached data.");
    } finally {
      if (!signal.aborted) setLoadingWidgets(false);
    }
  };

  const handleManualRefresh = async () => {
    triggerHaptic(5);
    setIsRefreshing(true);
    await fetchWidgets(destination, passportExpiry, currentCity, true);
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const fetchTrips = async () => {
    if (!user) return;
    setLoadingTrips(true);
    try {
      const res = await getTrips();
      setTrips(res.trips);
      
      // Load free credits
      const { data: profile } = await supabase.from('profiles').select('free_credits').eq('id', user.id).single();
      if (profile) setFreeCredits(profile.free_credits);

      // Initialize active trip if not set
      if (res.trips.length > 0 && !activeTrip) {
        setActiveTrip(res.trips[0]);
        setDestination(res.trips[0].destination);
      }
    } catch (err) {
      console.error("Error fetching trips:", err);
    }
    setLoadingTrips(false);
  };

  const handleAddTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate) {
      alert("Please select a departure date.");
      return;
    }
    
    const today = new Date().toISOString().split('T')[0];
    if (startDate < today) {
       if (!confirm("This departure date is in the past. Proceed anyway?")) return;
    }

    triggerHaptic(15);
    setSavingTrip(true);
    try {
      await saveTrip({
        destination,
        start_date: startDate || undefined,
        notes: notes || undefined,
      });
      await fetchTrips();
      setStartDate("");
      setNotes("");
    } catch (err) {
      console.error("Failed to save trip", err);
    }
    setSavingTrip(false);
  };

  const handleDeleteTrip = async (tripId: number) => {
    if (!confirm("Are you sure you want to delete this trip?")) return;
    triggerHaptic(20);
    try {
      await deleteTrip(tripId);
      await fetchTrips();
    } catch (err) {
      console.error("Failed to delete trip:", err);
    }
  };

  const handleDownloadBriefing = async () => {
    if (!activeTrip) return;
    triggerHaptic(30);
    try {
      await generateBriefing(activeTrip, visa, safety, weather, electrical);
    } catch (err) {
      console.error("Failed to generate briefing:", err);
      setWidgetError("Briefing generation failed. Intelligence signal weak.");
    }
  };

  useEffect(() => {
    fetchWidgets(destination, passportExpiry);
    return () => {
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, [destination, passportExpiry]);

  useEffect(() => {
    fetchTrips();
  }, []);

  const Skeleton = () => (
    <div className="card-concierge h-[220px] flex flex-col justify-between overflow-hidden relative border-none bg-white">
      <div className="flex justify-between">
        <div className="w-1/3 h-4 skeleton" />
        <div className="w-10 h-10 skeleton rounded-xl" />
      </div>
      <div className="w-1/2 h-8 skeleton" />
      <div className="w-full h-4 skeleton opacity-50" />
    </div>
  );

  const getTripStatus = (start?: string) => {
    if (!start) return { label: 'DREAMING', color: 'bg-gray-100 text-gray-400' };
    
    // Normalize to dates (remove time component)
    const today = new Date();
    today.setHours(0,0,0,0);
    
    const st = new Date(start);
    st.setHours(0,0,0,0);

    if (today.getTime() === st.getTime()) return { label: 'ACTIVE', color: 'bg-green-100 text-green-600' };
    if (today < st) return { label: 'UPCOMING', color: 'bg-blue-100 text-blue-600' };
    return { label: 'PAST', color: 'bg-gray-200 text-gray-500' };
  };

  const renderVisaBadge = () => {
    if (!visa) return null;
    let color = "bg-navy text-white";
    let label = "VISA REQUIRED";
    if (!visa.visaRequired) { color = "bg-safety-yellow text-navy"; label = "NO VISA NEEDED"; }
    else if (visa.visaType === 'voa') { color = "bg-yellow-500 text-white"; label = "VISA ON ARRIVAL"; }
    else if (visa.visaType === 'evisa') { color = "bg-blue-500 text-white"; label = "eVISA AVAILABLE"; }
    
    return <div className={`font-black px-4 py-1 rounded-lg ${color} text-[10px]`}>{label}</div>;
  };

  const todayWeather = weather?.forecast?.[0];

  return (
    <div className="max-w-lg mx-auto px-6 pt-12 pb-32 min-h-screen">
      {/* App Header */}
      <header className="flex justify-between items-center mb-10">
        <div>
           <p className="text-xs font-black text-navy/30 uppercase tracking-[0.2em] mb-1">Travel Concierge</p>
           <h1 className="text-3xl font-black text-navy uppercase tracking-tighter italic">Engine</h1>
        </div>
        <div className="flex items-center gap-4">
           <button 
             onClick={handleManualRefresh}
             disabled={loadingWidgets || isRefreshing}
             className={`p-3 rounded-xl transition-all ${isRefreshing ? 'bg-navy text-white rotate-180' : 'bg-surface text-navy/40 active:scale-95'}`}
           >
             <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
           </button>
           <div className="w-12 h-12 bg-navy rounded-2xl flex items-center justify-center shadow-lg border-2 border-white">
             <PlaneTakeoff className="w-6 h-6 text-safety-yellow" />
           </div>
        </div>
      </header>

      {/* Main View Selector (Only on Dashboard) */}
      {!showOnlyTrips && !showOnlyWeather && (
        <section className="mb-8">
          <div className="bg-navy rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden group active:scale-[0.98] transition-transform">
             <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 -mr-16 -mt-16 rounded-full group-hover:scale-150 transition-transform duration-1000"></div>
             <p className="text-safety-yellow/60 font-black text-[10px] uppercase tracking-[0.3em] mb-2">Current Intelligence Target</p>
             <div className="flex justify-between items-end relative z-10">
                <h2 className="text-4xl font-black text-white uppercase tracking-tighter">{destination}</h2>
                <div className="relative">
                  <select 
                    value={destination}
                    onChange={(e) => {
                      setDestination(e.target.value);
                      fetchWidgets(e.target.value);
                    }}
                    className="absolute inset-0 opacity-0 cursor-pointer z-10 h-full w-full"
                  >
                    {DESTINATIONS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                  <div className="bg-white/10 backdrop-blur-md border border-white/20 px-4 py-2 rounded-xl text-white flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-widest">Change</span>
                    <Globe className="w-4 h-4 opacity-100" />
                  </div>
                </div>
             </div>

             {/* Premium Upgrade Banner */}
             {activeTrip && activeTrip.trip_status !== 'paid' && (
                <div className="mt-8 pt-8 border-t border-white/10 flex flex-col gap-4">
                   <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-safety-yellow rounded-lg flex items-center justify-center shrink-0">
                         <Zap className="text-navy w-4 h-4" />
                      </div>
                      <p className="text-[10px] font-black text-white/80 uppercase tracking-widest leading-tight">
                         Premium protocol restricted. {freeCredits > 0 ? `${freeCredits} Trial Credit Available.` : 'Phase Upgrade Required.'}
                      </p>
                   </div>
                   <button 
                    onClick={() => navigate(`/unlock/${activeTrip.id}`)}
                    className="w-full bg-safety-yellow text-navy font-black py-4 rounded-2xl uppercase tracking-[0.2em] text-[10px] shadow-lg shadow-safety-yellow/10"
                   >
                      Initiate Upgrade Sequence
                   </button>
                </div>
             )}
          </div>
        </section>
      )}

      {/* Content Grid */}
      <div className="grid grid-cols-1 gap-6">
        {loadingWidgets ? (
          <>
            <Skeleton />
            <Skeleton />
            <Skeleton />
          </>
        ) : (
          <>
            {/* 1. VISA (Always on Home) */}
            {!showOnlyTrips && !showOnlyWeather && visa && (
              <div className={`card-concierge h-[220px] flex flex-col justify-between ${visa.visaRequired && visa.visaType === 'embassy' ? 'bg-red-50 border-red-100' : 'bg-white'}`}>
                <div className="flex justify-between items-start">
                  {renderVisaBadge()}
                  <ShieldCheck className={`w-8 h-8 ${visa.visaRequired ? 'text-red-500' : 'text-navy opacity-10'}`} />
                </div>
                <div>
                   <p className="text-lg font-black mb-3 leading-tight tracking-tight uppercase italic">{visa.notes}</p>
                   {visa.requiredDocuments && visa.requiredDocuments.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {visa.requiredDocuments.slice(0, 3).map((doc, i) => (
                        <div key={i} className="px-2 py-1 bg-navy/5 rounded-md text-[8px] font-black uppercase text-navy/40">
                           {doc}
                        </div>
                      ))}
                    </div>
                   ) : (
                     <p className="text-[10px] font-bold text-navy/30 uppercase">Verify exact checklist with official portal.</p>
                   )}
                </div>
                {visa.officialUrl && (
                  <div className="flex gap-4">
                    <a href={visa.officialUrl} target="_blank" rel="noreferrer" className="flex-1 flex items-center justify-center h-10 bg-surface rounded-xl text-[10px] font-black text-navy uppercase tracking-widest">
                      Official Portal <ArrowRight size={10} className="ml-2" />
                    </a>
                    {activeTrip?.trip_status === 'paid' && (
                      <button 
                        onClick={() => navigate(`/visa/${destination}`)}
                        className="flex-1 flex items-center justify-center h-10 bg-navy text-white rounded-xl text-[10px] font-black uppercase tracking-widest"
                      >
                         Smart Companion <Zap size={10} className="ml-2 text-safety-yellow" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* 2. WEATHER (Home & Weather Tab) */}
            {(!showOnlyTrips || showOnlyWeather) && weather && (
              <div className="card-concierge flex flex-col justify-between h-[220px]">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-[10px] font-black opacity-30 uppercase tracking-[0.2em] mb-1">Local Climate</p>
                    <div className="flex items-center gap-2">
                       <h3 className="text-2xl font-black uppercase tracking-tight">{currentCity}</h3>
                       {CITY_MAPPINGS[destination.toLowerCase()] && (
                        <select 
                          value={currentCity}
                          onChange={(e) => fetchWidgets(destination, undefined, e.target.value)}
                          className="bg-navy/5 p-1 rounded-lg text-[10px] font-black uppercase outline-none"
                        >
                          {CITY_MAPPINGS[destination.toLowerCase()].map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                       )}
                    </div>
                  </div>
                  <CloudSun className="w-10 h-10 text-navy opacity-20" />
                </div>
                <div className="mt-2 flex items-end gap-3">
                  <span className="text-6xl font-black text-navy leading-none tracking-tighter">{Math.round(todayWeather?.tempHigh || 0)}°</span>
                  <div className="mb-1">
                    <p className="font-black text-navy opacity-90 uppercase leading-none text-xs">{todayWeather?.condition}</p>
                    <p className="text-[10px] font-bold opacity-30 uppercase mt-1">Forecast: {todayWeather?.condition}</p>
                  </div>
                </div>
                <div className="flex justify-between items-center text-[10px] font-black uppercase opacity-20 mt-4">
                   <span>{todayWeather?.condition} expected</span>
                   <span>Update: {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>
            )}

            {/* 3. SAFETY (Home Only) */}
            {!showOnlyTrips && !showOnlyWeather && safety && (
              <div className="card-concierge relative overflow-hidden h-[220px] flex flex-col justify-between">
                <div className="flex justify-between items-start">
                   <p className="text-[10px] font-black opacity-30 uppercase tracking-[0.2em]">Live Security</p>
                   <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${safety.safetyLevel === 'Low' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                     {safety.safetyLevel} Status
                   </div>
                </div>
                <div>
                   <h3 className="text-2xl font-black uppercase mb-1 tracking-tight">Intelligence Feed</h3>
                   <p className="text-xs font-bold opacity-60 leading-relaxed line-clamp-2 italic">{safety.generalAdvice}</p>
                </div>
                <button onClick={() => { triggerHaptic(5); navigate(`/safety/${destination}`); }} className="flex justify-between items-center w-full p-4 bg-navy/5 rounded-2xl text-[10px] font-black uppercase tracking-widest text-navy/60 hover:text-navy transition-all">
                   Full Threat Report <ArrowRight size={12} />
                </button>
              </div>
            )}

            {/* 4. ELECTRICAL (Home Only) */}
            {!showOnlyTrips && !showOnlyWeather && electrical && (
               <div className="card-concierge bg-navy/5 border-none p-8 flex items-center justify-between mb-4">
                  <div className="flex items-center gap-6">
                     <Zap className="text-navy opacity-20" size={32} />
                     <div>
                       <p className="text-[10px] font-black opacity-40 uppercase tracking-[0.2em] mb-1">Standardized Power</p>
                       <p className="text-2xl font-black text-navy uppercase italic">{electrical.plugType} — {electrical.voltage}</p>
                     </div>
                  </div>
               </div>
            )}

            {/* 5. PREMIUM TOOLS (Home Only) */}
            {!showOnlyTrips && !showOnlyWeather && activeTrip?.trip_status === 'paid' && (
               <div className="space-y-6 animate-in fade-in slide-in-from-bottom-8">
                  <div className="grid grid-cols-1 gap-4">
                     <button 
                       onClick={() => navigate(`/itinerary/${activeTrip.id}`)}
                       className="bg-white p-8 rounded-[2.5rem] border border-gray-100 flex items-center justify-between shadow-sm active:scale-95 transition-all"
                     >
                        <div className="flex items-center gap-6">
                           <div className="w-14 h-14 bg-surface rounded-2xl flex items-center justify-center text-navy/40">
                              <PlaneTakeoff size={24} />
                           </div>
                           <div className="text-left">
                              <p className="text-[10px] font-black opacity-30 uppercase mb-1">Intelligence Module</p>
                              <h4 className="text-lg font-black text-navy uppercase italic">Itinerary Parser</h4>
                           </div>
                        </div>
                        <ArrowRight className="text-navy opacity-20" />
                     </button>

                     <button 
                       onClick={handleDownloadBriefing}
                       className="bg-navy p-10 rounded-[3rem] text-white flex flex-col gap-8 shadow-2xl relative overflow-hidden group active:scale-95 transition-all"
                     >
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 -mr-16 -mt-16 rounded-full group-hover:scale-150 transition-transform duration-1000"></div>
                        <div className="flex justify-between items-start relative z-10">
                           <div className="p-3 bg-white/10 rounded-2xl text-safety-yellow">
                              <Download size={24} />
                           </div>
                           <span className="text-[8px] font-black uppercase tracking-[0.3em] bg-white/10 px-3 py-1 rounded-full">Secure Document</span>
                        </div>
                        <div className="relative z-10 text-left">
                           <h4 className="text-2xl font-black uppercase tracking-tight italic mb-2">Executive Briefing</h4>
                           <p className="text-[10px] font-bold opacity-40 uppercase tracking-widest leading-relaxed">
                              Consolidated PDF with safety intelligence, weather protocols, and flight data.
                           </p>
                        </div>
                     </button>
                  </div>
               </div>
            )}

            {/* 6. TRIPS (Home & Trips Tab) */}
            {(showOnlyTrips || (!showOnlyWeather && !showOnlyTrips)) && (
              <section className="mt-4">
                 <div className="flex justify-between items-center mb-6">
                    <h3 className="text-2xl font-black uppercase tracking-tighter">Expedition Log</h3>
                    {loadingTrips && <Loader2 className="w-5 h-5 animate-spin opacity-20" />}
                 </div>
                 
                 <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm mb-8">
                    <p className="text-[10px] font-black opacity-30 uppercase tracking-[0.3em] mb-4 text-center">New Tracking Protocol</p>
                    <form onSubmit={handleAddTrip} className="space-y-4">
                       <input 
                         type="text" 
                         placeholder="Reference (Flight #, Hotel...)" 
                         value={notes}
                         onChange={e => setNotes(e.target.value)}
                         className="w-full bg-surface border-none h-14 rounded-2xl px-6 font-bold text-sm outline-none focus:ring-2 ring-navy/5 transition-all"
                       />
                       <div className="flex gap-2">
                          <input 
                            type="date" 
                            value={startDate}
                            min={new Date().toISOString().split('T')[0]}
                            onChange={e => setStartDate(e.target.value)}
                            className="flex-1 bg-surface border-none h-14 rounded-2xl px-6 font-black uppercase text-xs outline-none"
                          />
                          <button type="submit" disabled={savingTrip} className="w-14 h-14 bg-navy rounded-2xl flex items-center justify-center text-white active:scale-95 transition-all shadow-lg shadow-navy/20">
                             {savingTrip ? <Loader2 className="animate-spin" /> : <Plus size={24} />}
                          </button>
                       </div>
                    </form>
                 </div>

                 <div className="space-y-4">
                    {trips.length === 0 && !loadingTrips ? (
                      <div className="text-center py-20 bg-navy/5 rounded-[2.5rem] flex flex-col items-center">
                         <Globe className="text-navy/10 mb-4" size={48} />
                         <p className="font-black text-navy opacity-30 uppercase tracking-[0.2em] text-xs">Awaiting First Mission</p>
                      </div>
                    ) : (
                      trips.map(trip => {
                        const status = getTripStatus(trip.start_date ?? undefined);
                        return (
                          <div key={trip.id} className="bg-white p-6 rounded-3xl border border-gray-100 flex justify-between items-center group shadow-sm active:shadow-md transition-all">
                             <div className="flex gap-4">
                                <div className="w-12 h-12 bg-surface rounded-2xl flex items-center justify-center">
                                  <Globe className="text-navy opacity-20" size={20} />
                                </div>
                                <div>
                                   <div className="flex items-center gap-2">
                                      <span className="font-black uppercase tracking-tight text-navy leading-none">{trip.destination}</span>
                                      <span className={`text-[8px] font-black px-2 py-0.5 rounded-full ${status.color}`}>{status.label}</span>
                                   </div>
                                   <p className="text-[10px] font-black opacity-30 uppercase mt-1">
                                      {trip.start_date ? new Date(trip.start_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'Open End'}
                                   </p>
                                </div>
                             </div>
                             <button onClick={() => handleDeleteTrip(trip.id)} className="w-10 h-10 bg-red-50 text-red-500 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 active:scale-95 transition-all">
                                <Trash2 size={18} />
                             </button>
                          </div>
                        );
                      })
                    )}
                 </div>
              </section>
            )}
          </>
        )}
      </div>

      {(deferredPrompt || (isStandalone === false)) && !showOnlyTrips && !showOnlyWeather && (
        <div className="mt-12 bg-navy text-white p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 -mr-12 -mt-12 rounded-full"></div>
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center">
               <Download size={24} className="text-safety-yellow" />
            </div>
            <h4 className="font-black uppercase tracking-widest text-sm">Deploy PWA</h4>
          </div>
          <p className="text-xs opacity-60 leading-relaxed mb-8">Install your private travel control terminal to your home screen for high-performance access.</p>
          <button onClick={handleInstallClick} className="w-full bg-safety-yellow text-navy font-black py-4 rounded-2xl uppercase tracking-[0.2em] text-[10px] shadow-lg shadow-safety-yellow/10 active:scale-95 transition-all">
             Initialize Installation
          </button>
        </div>
      )}

      {widgetError && (
        <div className="fixed bottom-24 left-6 right-6 bg-red-500 text-white p-4 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 shadow-2xl z-[100]">
          <AlertTriangle className="w-5 h-5" />
          <p className="text-sm font-black uppercase tracking-wide">{widgetError}</p>
        </div>
      )}
    </div>
  );
}
