import { useEffect, useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase, getVisaInfo, getSafetyInfo, getWeather, getElectricalInfo, getTrips, saveTrip, deleteTrip } from '../lib/supabaseClient';
import type { VisaInfo, SafetyInfo, WeatherForecast, ElectricalInfo, Trip } from '../lib/supabaseClient';
import { ShieldCheck, CloudSun, Globe, CheckCircle2, AlertTriangle, Plus, Loader2, Download, ArrowRight, Settings, ExternalLink, Trash2, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

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

export default function Dashboard() {
  const { user } = useAuth();
  const [destination, setDestination] = useState("South Africa");
  
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
  const [endDate, setEndDate] = useState("");
  const [notes, setNotes] = useState("");
  const navigate = useNavigate();
  
  // PWA states
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  const widgetCache = useRef<Map<string, { visa: VisaInfo; safety: SafetyInfo; weather: WeatherForecast; electrical: ElectricalInfo }>>(new Map());

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

    // F5: Offline Hydration
    const cached = localStorage.getItem('travel_assistant_widget_cache');
    if (cached) {
      try {
        const { dest, data } = JSON.parse(cached);
        setDestination(dest);
        setVisa(data.visa);
        setSafety(data.safety);
        setWeather(data.weather);
        setElectrical(data.electrical);
        // Pre-populate in-memory cache too
        widgetCache.current.set(dest, data);
      } catch (err) {
        console.error("Cache hydration failed", err);
      }
    }

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

  // Fetch Passport Expiry ONCE
  useEffect(() => {
    async function loadPassport() {
      if (!user) return;
      try {
        const { data } = await supabase.from('profiles').select('passport_expiry').eq('id', user.id).single();
        if (data?.passport_expiry) {
          setPassportExpiry(data.passport_expiry);
        }
      } catch (err) {
        console.error("Failed to load passport expiry:", err);
      }
    }
    loadPassport();
  }, [user]);

  const fetchWidgets = async (dest: string, overrideExpiry?: string, city?: string) => {
    const cityToUse = city || (CITY_MAPPINGS[dest.toLowerCase()] ? CITY_MAPPINGS[dest.toLowerCase()][0] : dest);
    
    if (!city && widgetCache.current.has(dest)) {
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
      const [vData, sData, wData, eData] = await Promise.all([
        getVisaInfo(dest, "ethiopia", expiry),
        getSafetyInfo(dest),
        getWeather(dest, undefined, cityToUse),
        getElectricalInfo(dest)
      ]);
      setVisa(vData);
      setSafety(sData);
      setWeather(wData);
      setElectrical(eData);
      setCurrentCity(cityToUse);
      
      if (!city) {
        widgetCache.current.set(dest, { visa: vData, safety: sData, weather: wData, electrical: eData });
        
        // F5: Persist last destination for offline use
        localStorage.setItem('travel_assistant_widget_cache', JSON.stringify({
          dest,
          data: { visa: vData, safety: sData, weather: wData, electrical: eData }
        }));
      }
    } catch (err) {
      console.error("Error fetching widgets:", err);
      setWidgetError("Could not load data. Please check your connection.");
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
        notes: notes || undefined,
      });
      // Refresh trips list
      await fetchTrips();
      setStartDate("");
      setEndDate("");
      setNotes("");
    } catch (err) {
      console.error("Failed to save trip", err);
    }
    setSavingTrip(false);
  };

  const handleDeleteTrip = async (tripId: number) => {
    if (!confirm("Are you sure you want to delete this trip?")) return;
    try {
      await deleteTrip(tripId);
      await fetchTrips();
    } catch (err) {
      console.error("Failed to delete trip:", err);
    }
  };

  const getTripStatus = (start?: string, end?: string) => {
    if (!start) return { label: 'DREAMING', color: 'bg-gray-100 text-gray-400' };
    const now = new Date();
    const st = new Date(start);
    const en = end ? new Date(end) : new Date(st.getTime() + 86400000); // default 1 day

    if (now < st) return { label: 'UPCOMING', color: 'bg-blue-100 text-blue-600' };
    if (now >= st && now <= en) return { label: 'ACTIVE', color: 'bg-green-100 text-green-600' };
    return { label: 'PAST', color: 'bg-gray-200 text-gray-500' };
  };

  const renderVisaBadge = () => {
    if (!visa) return null;
    if (!visa.visaRequired) return <div className="mt-1 font-black px-4 py-1 rounded-lg bg-safety-yellow text-navy">NO VISA NEEDED</div>;
    
    switch (visa.visaType) {
      case 'voa':
        return <div className="mt-1 font-black px-4 py-1 rounded-lg bg-yellow-500 text-white shadow-sm">VISA ON ARRIVAL</div>;
      case 'evisa':
        return <div className="mt-1 font-black px-4 py-1 rounded-lg bg-blue-500 text-white shadow-sm">eVISA AVAILABLE</div>;
      case 'embassy':
      default:
        return <div className="mt-1 font-black px-4 py-1 rounded-lg bg-red-500 text-white shadow-sm">VISA REQUIRED</div>;
    }
  };

  useEffect(() => {
    widgetCache.current.clear();
  }, [passportExpiry]);

  // Run when destination or passportExpiry changes (so user setting expiry immediately applies it)
  useEffect(() => {
    fetchWidgets(destination, passportExpiry);
  }, [destination, passportExpiry]);

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
              <h1 className="text-2xl font-black text-navy leading-none uppercase">Hi, {userName}</h1>
              <p className="text-sm font-bold text-navy opacity-60 uppercase tracking-widest mt-1">Travel Concierge</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate('/profile')}
              className="p-1 hover:bg-gray-100 rounded-full transition-colors"
            >
              <Settings className="w-6 h-6 text-navy opacity-40 hover:opacity-100" />
            </button>
            <button 
              onClick={() => supabase.auth.signOut()}
              className="text-sm font-bold text-navy opacity-40 hover:opacity-100"
            >
              Sign Out
            </button>
          </div>
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
                  className="w-full bg-navy text-white py-5 rounded-2xl flex justify-center items-center gap-3 font-bold shadow-xl active:scale-[0.98] transition-all hover:bg-opacity-90"
                 >
                   <Download className="w-6 h-6 text-safety-yellow" /> 
                   <span className="uppercase tracking-tight">Personal Assistant App — Install Now</span>
                 </button>
              ) : (
                 <div className="w-full bg-navy/5 border-2 border-navy/10 p-6 rounded-2xl flex flex-col items-center text-center">
                   <div className="w-12 h-12 bg-navy rounded-xl flex items-center justify-center mb-4 shadow-lg">
                     <Download className="w-6 h-6 text-safety-yellow" />
                   </div>
                   <h2 className="text-navy font-black text-lg mb-2 uppercase italic">Instant Access Required?</h2>
                   <div className="text-sm font-bold text-navy/70 max-w-[280px] leading-relaxed">
                     {isIOS ? (
                       <div className="space-y-3">
                         <p className="bg-safety-yellow/20 text-navy p-2 rounded-lg text-xs">⚠️ MUST USE SAFARI ON IPHONE/IPAD</p>
                         <p>1. Tap the <span className="inline-block bg-white shadow-sm px-2 py-0.5 rounded border border-gray-100">Share</span> button below</p>
                         <p>2. Select <span className="font-black text-navy uppercase italic">"Add to Home Screen"</span></p>
                       </div>
                     ) : (
                       <p>Please open this site in <span className="text-navy font-black italic">Chrome</span> or <span className="text-navy font-black italic">Safari</span> to unlock the 1-click App Installation.</p>
                     )}
                   </div>
                 </div>
              )}
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:items-end gap-4 mt-4">
             <div className="flex-1">
                <label className="block text-sm font-bold text-navy uppercase tracking-wider mb-2">
                  Showing Results For
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

        {widgetError && (
          <div className="bg-red-50 text-red-600 p-6 rounded-2xl border-2 border-red-100 flex items-center justify-center gap-3 font-bold text-center">
            <AlertTriangle className="w-6 h-6" />
            <p>{widgetError}</p>
          </div>
        )}

        {/* Visa Status Block (Always visible unless error) */}
        {!widgetError && visa && (
          <div className={`card-concierge border-0 ${visa.visaRequired && visa.visaType === 'embassy' ? 'bg-red-50' : 'bg-navy text-white'}`}>
            <div className="flex items-start gap-4 mb-4">
              {renderVisaBadge()}
            </div>
            
            {visa.passportAlert && (
              <div className="bg-red-600 text-white p-4 rounded-xl mb-4 font-bold text-sm shadow-sm flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                <p>{visa.passportAlert}</p>
              </div>
            )}
            
            <p className={`text-lg mb-4 opacity-90 ${visa.visaRequired ? 'font-bold' : ''}`}>
              {visa.notes}
            </p>
            
            {visa.officialUrl && (
              <a 
                href={visa.officialUrl} 
                target="_blank" 
                rel="noreferrer"
                className="inline-flex items-center gap-2 bg-white text-navy px-4 py-2 rounded-lg font-bold text-sm mb-4 hover:bg-gray-100 transition-colors shadow-sm"
              >
                <ExternalLink className="w-4 h-4" /> Official Portal
              </a>
            )}

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

            {visa.disclaimer && (
              <p className="text-xs opacity-50 mt-6 italic font-medium leading-relaxed">
                {visa.disclaimer}
              </p>
            )}
          </div>
        )}

        {/* Weather and Safety Grid */}
        {!widgetError && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Weather Card */}
            <div className="card-concierge flex flex-col justify-between min-h-[200px]">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-black text-navy opacity-40 uppercase tracking-widest mb-1">Weather</p>
                <div className="flex items-center gap-2">
                  <h3 className="text-2xl font-bold truncate max-w-[120px]">{currentCity || destination}</h3>
                  {CITY_MAPPINGS[destination.toLowerCase()] && (
                    <select 
                      value={currentCity}
                      onChange={(e) => fetchWidgets(destination, undefined, e.target.value)}
                      className="text-[10px] font-black uppercase bg-navy/5 border-none rounded-lg px-2 py-1 outline-none text-navy/60 hover:text-navy transition-colors cursor-pointer"
                    >
                      {CITY_MAPPINGS[destination.toLowerCase()].map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
              <CloudSun className="w-10 h-10 text-navy opacity-20" />
            </div>
            <div className="mt-4 flex items-end gap-3">
              <span className="text-6xl font-black text-navy">{todayWeather?.tempHigh !== undefined ? Math.round(todayWeather.tempHigh) : '--'}°</span>
              <div className="mb-2">
                <p className="font-bold text-lg leading-none">{todayWeather?.condition || 'Loading...'}</p>
                <p className="text-sm font-bold text-navy opacity-50">Low: {todayWeather?.tempLow !== undefined ? Math.round(todayWeather.tempLow) : '--'}°</p>
              </div>
            </div>
            <p className="text-[10px] text-navy opacity-30 mt-2 italic flex justify-between items-center">
               <span>Real-time data available.</span>
               <span className="font-black opacity-60">OPENWEATHER®</span>
            </p>
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
      )}

      {/* Third Row: Electrical Info & Additional Tips (Future) */}
      {!widgetError && electrical && (
          <div className="card-concierge bg-white border-2 border-gray-100 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-5">
               <div className="w-14 h-14 bg-navy/5 rounded-2xl flex items-center justify-center">
                 <Zap className="w-8 h-8 text-navy opacity-40" />
               </div>
               <div>
                  <p className="text-sm font-black text-navy opacity-40 uppercase tracking-widest mb-1">Power Standards</p>
                  <div className="flex gap-4">
                    <div>
                       <p className="text-xs font-bold text-navy opacity-40 uppercase">Plug Type</p>
                       <p className="text-lg font-black text-navy uppercase italic">{electrical.plugType}</p>
                    </div>
                    <div className="border-l border-gray-100 pl-4">
                       <p className="text-xs font-bold text-navy opacity-40 uppercase">Voltage</p>
                       <p className="text-lg font-black text-navy uppercase italic">{electrical.voltage}</p>
                    </div>
                    <div className="border-l border-gray-100 pl-4">
                       <p className="text-xs font-bold text-navy opacity-40 uppercase">Freq</p>
                       <p className="text-lg font-black text-navy uppercase italic">{electrical.frequency}</p>
                    </div>
                  </div>
               </div>
            </div>
          </div>
        )}

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
              <div className="w-full sm:w-auto flex-1">
                <label className="block text-xs font-bold text-navy opacity-50 uppercase mb-1">Notes (Opt)</label>
                <input 
                  type="text" 
                  placeholder="Flight #, Hotel..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
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
                          <div className="flex items-center gap-2">
                            <p className="font-black text-lg text-navy uppercase">{trip.destination}</p>
                            {(() => {
                              const status = getTripStatus(trip.start_date ?? undefined, trip.end_date ?? undefined);
                              return <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${status.color}`}>{status.label}</span>;
                            })()}
                          </div>
                          <p className="text-sm font-bold text-navy opacity-40">
                             {trip.start_date ? new Date(trip.start_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'No date set'}
                          </p>
                          {trip.notes && (
                            <p className="text-xs font-medium text-navy opacity-60 mt-1 italic line-clamp-1 max-w-[200px]">
                              "{trip.notes}"
                            </p>
                          )}
                        </div>
                    </div>
                    <button 
                      onClick={() => handleDeleteTrip(trip.id)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                      title="Delete Trip"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                 </div>
               ))
             )}
           </div>
        </section>

      </main>
    </div>
  );
}
