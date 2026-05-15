import { useEffect, useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase, getVisaInfo, getSafetyInfo, getWeather, getElectricalInfo, getTrips, saveTrip, deleteTrip } from '../lib/supabaseClient';
import type { VisaInfo, SafetyInfo, WeatherForecast, ElectricalInfo, Trip } from '../lib/supabaseClient';
import { 
  ShieldCheck, CloudSun, Globe, CheckCircle2, AlertTriangle, 
  Plus, Loader2, Download, ArrowRight, Settings, 
  ExternalLink, Trash2, Zap, PlaneTakeoff 
} from 'lucide-react';
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
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  const widgetCache = useRef<Map<string, { visa: VisaInfo; safety: SafetyInfo; weather: WeatherForecast; electrical: ElectricalInfo }>>(new Map());

  // Initialization
  useEffect(() => {
    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

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
        localStorage.setItem('travel_assistant_widget_cache', JSON.stringify({
          dest,
          data: { visa: vData, safety: sData, weather: wData, electrical: eData }
        }));
      }
    } catch (err) {
      console.error("Error fetching widgets:", err);
      setWidgetError("Connection error. Using cached data.");
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
    try {
      await deleteTrip(tripId);
      await fetchTrips();
    } catch (err) {
      console.error("Failed to delete trip:", err);
    }
  };

  useEffect(() => {
    fetchWidgets(destination, passportExpiry);
  }, [destination, passportExpiry]);

  useEffect(() => {
    fetchTrips();
  }, []);

  const Skeleton = () => (
    <div className="card-concierge h-48 flex flex-col justify-between overflow-hidden relative">
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
    const now = new Date();
    const st = new Date(start);
    if (now < st) return { label: 'UPCOMING', color: 'bg-blue-100 text-blue-600' };
    return { label: 'PAST', color: 'bg-gray-200 text-gray-500' };
  };

  const renderVisaBadge = () => {
    if (!visa) return null;
    let color = "bg-navy text-white";
    let label = "VISA REQUIRED";
    if (!visa.visaRequired) { color = "bg-safety-yellow text-navy"; label = "NO VISA NEEDED"; }
    else if (visa.visaType === 'voa') { color = "bg-yellow-500 text-white"; label = "VISA ON ARRIVAL"; }
    else if (visa.visaType === 'evisa') { color = "bg-blue-500 text-white"; label = "eVISA AVAILABLE"; }
    
    return <div className={`font-black px-4 py-1 rounded-lg ${color}`}>{label}</div>;
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
           {loadingWidgets && <Loader2 className="w-5 h-5 animate-spin text-navy/20" />}
           <div className="w-12 h-12 bg-navy rounded-2xl flex items-center justify-center shadow-lg border-2 border-white">
             <PlaneTakeoff className="w-6 h-6 text-safety-yellow" />
           </div>
        </div>
      </header>

      {/* Main View Selector (Only on Dashboard) */}
      {!showOnlyTrips && !showOnlyWeather && (
        <section className="mb-8">
          <div className="bg-navy rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden group">
             <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 -mr-16 -mt-16 rounded-full group-hover:scale-150 transition-transform duration-1000"></div>
             <p className="text-safety-yellow/60 font-black text-xs uppercase tracking-widest mb-2">Current Focus</p>
             <div className="flex justify-between items-end">
                <h2 className="text-4xl font-black text-white uppercase tracking-tighter">{destination}</h2>
                <div className="relative">
                  <select 
                    value={destination}
                    onChange={(e) => {
                      setDestination(e.target.value);
                      fetchWidgets(e.target.value);
                    }}
                    className="absolute inset-0 opacity-0 cursor-pointer z-10"
                  >
                    {DESTINATIONS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                  <div className="bg-white/10 backdrop-blur-md border border-white/20 p-2 rounded-xl text-white">
                    <Globe className="w-5 h-5" />
                  </div>
                </div>
             </div>
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
              <div className={`card-concierge ${visa.visaRequired && visa.visaType === 'embassy' ? 'bg-red-50 border-red-100' : 'bg-white'}`}>
                <div className="flex justify-between items-start mb-6">
                  {renderVisaBadge()}
                  <ShieldCheck className={`w-8 h-8 ${visa.visaRequired ? 'text-red-500' : 'text-navy opacity-10'}`} />
                </div>
                <p className="text-xl font-black mb-4 leading-tight">{visa.notes}</p>
                {visa.requiredDocuments.length > 0 && (
                  <div className="space-y-2 mb-6">
                    {visa.requiredDocuments.slice(0, 3).map((doc, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm font-bold opacity-60">
                         <CheckCircle2 className="w-4 h-4 text-green-500" /> {doc}
                      </div>
                    ))}
                  </div>
                )}
                {visa.officialUrl && (
                  <a href={visa.officialUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm font-black text-navy uppercase tracking-widest">
                    Portal <ArrowRight size={14} />
                  </a>
                )}
              </div>
            )}

            {/* 2. WEATHER (Home & Weather Tab) */}
            {(!showOnlyTrips || showOnlyWeather) && weather && (
              <div className="card-concierge flex flex-col justify-between min-h-[220px]">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs font-black opacity-30 uppercase tracking-widest mb-1">Climate</p>
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
                <div className="mt-6 flex items-end gap-3">
                  <span className="text-6xl font-black text-navy">{Math.round(todayWeather?.tempHigh || 0)}°</span>
                  <div className="mb-2">
                    <p className="font-black text-navy opacity-90 uppercase leading-none">{todayWeather?.condition}</p>
                    <p className="text-xs font-bold opacity-40 uppercase mt-1">Low: {Math.round(todayWeather?.tempLow || 0)}°</p>
                  </div>
                </div>
                <p className="text-[10px] font-black opacity-20 uppercase mt-4 text-right">Powered by OpenWeather</p>
              </div>
            )}

            {/* 3. SAFETY (Home Only) */}
            {!showOnlyTrips && !showOnlyWeather && safety && (
              <div className="card-concierge relative overflow-hidden">
                <div className="flex justify-between mb-4">
                   <p className="text-xs font-black opacity-30 uppercase tracking-widest">Security</p>
                   <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${safety.safetyLevel === 'Low' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                     {safety.safetyLevel} Risk
                   </div>
                </div>
                <h3 className="text-2xl font-black uppercase mb-2 tracking-tight">Vigilance Required</h3>
                <p className="text-sm font-medium opacity-60 leading-relaxed mb-6">{safety.generalAdvice}</p>
                <button onClick={() => navigate(`/safety/${destination}`)} className="flex justify-between items-center w-full p-4 bg-navy/5 rounded-2xl text-xs font-black uppercase tracking-widest text-navy/60 hover:text-navy transition-all">
                   Full Report <ArrowRight size={14} />
                </button>
              </div>
            )}

            {/* 4. ELECTRICAL (Home Only) */}
            {!showOnlyTrips && !showOnlyWeather && electrical && (
               <div className="card-concierge bg-navy/5 border-none p-8 flex items-center justify-between">
                  <div className="flex items-center gap-6">
                     <Zap className="text-navy opacity-20" size={32} />
                     <div>
                       <p className="text-[10px] font-black opacity-40 uppercase tracking-[0.2em] mb-1">Power System</p>
                       <p className="text-2xl font-black text-navy uppercase italic">{electrical.plugType} — {electrical.voltage}</p>
                     </div>
                  </div>
               </div>
            )}

            {/* 5. TRIPS (Home & Trips Tab) */}
            {(showOnlyTrips || (!showOnlyWeather && !showOnlyTrips)) && (
              <section className="mt-8">
                 <div className="flex justify-between items-center mb-6">
                    <h3 className="text-2xl font-black uppercase tracking-tighter">My Expeditions</h3>
                    {loadingTrips && <Loader2 className="w-5 h-5 animate-spin opacity-20" />}
                 </div>
                 
                 <form onSubmit={handleAddTrip} className="mb-6 flex gap-2">
                    <input 
                      type="text" 
                      placeholder="Notes (Flight #, Hotel...)" 
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      className="flex-1 bg-white border border-gray-100 h-14 rounded-2xl px-4 font-bold text-sm outline-none focus:border-navy transition-all shadow-sm"
                    />
                    <button type="submit" className="w-14 h-14 bg-navy rounded-2xl flex items-center justify-center text-white active:scale-95 transition-all shadow-lg">
                       <Plus size={24} />
                    </button>
                 </form>

                 <div className="space-y-4">
                    {trips.length === 0 && !loadingTrips ? (
                      <p className="text-center font-bold text-navy opacity-40 py-12 bg-white rounded-3xl border border-gray-100 uppercase tracking-widest text-xs">No Expeditions Logged</p>
                    ) : (
                      trips.map(trip => {
                        const status = getTripStatus(trip.start_date ?? undefined);
                        return (
                          <div key={trip.id} className="bg-white p-5 rounded-3xl border border-gray-100 flex justify-between items-center group shadow-sm active:shadow-md transition-all">
                             <div className="flex gap-4">
                                <div className="w-12 h-12 bg-surface rounded-2xl flex items-center justify-center">
                                  <Globe className="text-navy opacity-20" size={20} />
                                </div>
                                <div>
                                   <div className="flex items-center gap-2">
                                      <span className="font-black uppercase tracking-tight text-navy leading-none">{trip.destination}</span>
                                      <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full ${status.color}`}>{status.label}</span>
                                   </div>
                                   <p className="text-[10px] font-black opacity-30 uppercase mt-1">
                                      {trip.start_date ? new Date(trip.start_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'No date set'}
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

      {(deferredPrompt || isIOS) && !isStandalone && !showOnlyTrips && !showOnlyWeather && (
        <div className="mt-12 bg-navy text-white p-6 rounded-[2.5rem] shadow-2xl">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
               <Download size={20} className="text-safety-yellow" />
            </div>
            <h4 className="font-black uppercase tracking-widest text-sm">Install App</h4>
          </div>
          <p className="text-sm opacity-60 leading-relaxed mb-6">Add to Home Screen for the most premium, full-screen concierge experience.</p>
          {isIOS ? (
            <div className="text-xs font-black text-safety-yellow uppercase tracking-widest">
              Tap Share + 'Add to Home Screen'
            </div>
          ) : (
            <button onClick={handleInstallClick} className="w-full bg-safety-yellow text-navy font-black py-3 rounded-xl uppercase tracking-widest text-xs">
              Install Personal Portal
            </button>
          )}
        </div>
      )}

      {widgetError && (
        <div className="fixed bottom-24 left-6 right-6 bg-red-500 text-white p-4 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 shadow-2xl">
          <AlertTriangle className="w-5 h-5" />
          <p className="text-sm font-black uppercase tracking-wide">{widgetError}</p>
        </div>
      )}
    </div>
  );
}
