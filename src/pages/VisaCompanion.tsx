import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase, getVisaInfo } from '../lib/supabaseClient';
import type { VisaInfo } from '../lib/supabaseClient';
import { 
  ArrowLeft, Copy, CheckCircle2, Globe, 
  ExternalLink, Loader2, ShieldCheck 
} from 'lucide-react';

export default function VisaCompanion() {
  const { destination } = useParams<{ destination: string }>();
  const navigate = useNavigate();
  const [visa, setVisa] = useState<VisaInfo | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);
  const [showIframe, setShowIframe] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate('/login'); return; }

      const [vData, pData] = await Promise.all([
        getVisaInfo(destination || ''),
        supabase.from('profiles').select('*').eq('id', user.id).single()
      ]);

      setVisa(vData);
      setProfile(pData.data);
      setLoading(false);
    }
    load();
  }, [destination, navigate]);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopyStatus(label);
    if ('vibrate' in navigator) navigator.vibrate(10);
    setTimeout(() => setCopyStatus(null), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <Loader2 className="w-10 h-10 text-navy animate-spin" />
      </div>
    );
  }

  const fields = [
    { label: 'Full Name', value: profile?.full_name || 'Not set' },
    { label: 'Nationality', value: profile?.passport_nationality || 'Ethiopia' },
    { label: 'Passport Number', value: 'ENTER IN PROFILE', isPlaceholder: !profile?.passport_number },
    { label: 'Passport Expiry', value: profile?.passport_expiry || 'Not set' },
    { label: 'Destination', value: destination || '' },
    { label: 'Purpose', value: 'Tourism / Business' },
  ];

  return (
    <div className="min-h-screen bg-surface flex flex-col md:flex-row">
      {/* Sidebar Control Panel (Right on Mobile, Left/Right on Desktop - we'll go Right stay consistent) */}
      <aside className="w-full md:w-96 bg-white border-l border-gray-100 flex flex-col h-screen overflow-y-auto sticky top-0 order-2 md:order-2 shadow-2xl">
         <header className="p-6 border-b border-gray-50 flex items-center gap-4">
            <button onClick={() => navigate('/dashboard')} className="w-10 h-10 bg-surface rounded-xl flex items-center justify-center">
               <ArrowLeft size={18} className="text-navy" />
            </button>
            <div>
               <h1 className="text-lg font-black text-navy uppercase italic leading-none">Smart Form Guard</h1>
               <p className="text-[10px] font-bold text-navy opacity-30 uppercase tracking-widest mt-1">Copy-Paste Companion</p>
            </div>
         </header>

         <div className="p-6 space-y-8">
            {/* Status Alert */}
            <div className="bg-navy/5 p-4 rounded-2xl flex gap-3">
               <ShieldCheck className="text-navy shrink-0" size={20} />
               <p className="text-[10px] font-bold text-navy opacity-60 uppercase leading-relaxed">
                  Use this panel to quickly fill the official application. All your encrypted profile data is ready below.
               </p>
            </div>

            {/* Field List */}
            <div className="space-y-4">
               {fields.map((f, i) => (
                 <div key={i} className="group">
                    <label className="text-[9px] font-black text-navy/30 uppercase tracking-widest ml-1 mb-1 block">{f.label}</label>
                    <div className="flex gap-2">
                       <div className="flex-1 bg-surface h-12 rounded-xl px-4 flex items-center overflow-hidden">
                          <span className={`text-xs font-black uppercase truncate ${f.isPlaceholder ? 'opacity-20 italic' : 'text-navy'}`}>
                            {f.value}
                          </span>
                       </div>
                       <button 
                        onClick={() => handleCopy(f.value, f.label)}
                        className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${copyStatus === f.label ? 'bg-green-500 text-white' : 'bg-navy text-white hover:bg-navy/90 active:scale-95'}`}
                       >
                          {copyStatus === f.label ? <CheckCircle2 size={18} /> : <Copy size={18} />}
                       </button>
                    </div>
                 </div>
               ))}
            </div>

            {/* Checklists */}
            <div className="pt-4">
               <h3 className="text-[10px] font-black text-navy opacity-30 uppercase tracking-[0.2em] mb-4">Required Documents</h3>
               <div className="space-y-2">
                  {visa?.requiredDocuments.map((doc, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-3 bg-surface rounded-xl group cursor-pointer hover:bg-navy/5 transition-colors">
                       <div className="w-5 h-5 border-2 border-navy/10 rounded-md flex items-center justify-center group-has-[:checked]:bg-navy group-has-[:checked]:border-navy">
                          <CheckCircle2 size={12} className="text-white opacity-0 group-has-[:checked]:opacity-100" />
                          <input type="checkbox" className="hidden" />
                       </div>
                       <span className="text-[10px] font-bold text-navy uppercase">{doc}</span>
                    </div>
                  ))}
               </div>
            </div>
         </div>
      </aside>

      {/* Official Portal Webview */}
      <main className="flex-1 bg-gray-50 flex flex-col h-screen md:h-screen order-1 md:order-1">
         {showIframe && visa?.officialUrl ? (
            <div className="flex-1 relative flex flex-col">
               <div className="bg-white px-4 py-2 border-b border-gray-100 flex justify-between items-center text-[8px] font-black text-navy/40 uppercase tracking-widest">
                  <span className="flex items-center gap-2"><Globe size={10} /> Secure Connection: {new URL(visa.officialUrl).hostname}</span>
                  <button onClick={() => setShowIframe(false)} className="hover:text-navy hover:underline">Exit Iframe</button>
               </div>
               <iframe 
                src={visa.officialUrl} 
                className="w-full flex-1 border-none shadow-inner"
                title="Official Visa Portal"
                onLoad={() => console.log("Iframe loaded")}
                onError={() => setShowIframe(false)}
               />
            </div>
         ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
               <div className="w-20 h-20 bg-navy/5 rounded-3xl flex items-center justify-center mb-6">
                  <Globe className="text-navy opacity-20" size={40} />
               </div>
               <h2 className="text-2xl font-black text-navy uppercase italic mb-2">Portal Connection Required</h2>
               <p className="text-xs font-bold text-navy opacity-40 uppercase max-w-sm leading-relaxed mb-8">
                  Most official government portals (including {destination}) prevent being embedded for security reasons. Click below to open the portal in a new secure window.
               </p>
               <a 
                href={visa?.officialUrl || '#'} 
                target="_blank" 
                rel="noreferrer"
                className="bg-navy text-white px-8 py-4 rounded-2xl flex items-center gap-3 font-black uppercase tracking-[0.2em] text-[10px] shadow-2xl shadow-navy/20 active:scale-95 transition-all"
               >
                  Launch Official Portal <ExternalLink size={14} />
               </a>
               <p className="mt-8 text-[8px] font-black text-navy/20 uppercase tracking-widest max-w-xs">
                  Your "Smart Form Guard" panel will remain active on the right to assist you with data entry.
               </p>
            </div>
         )}
      </main>
    </div>
  );
}
