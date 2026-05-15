import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { PlaneTakeoff, ShieldCheck, CloudSun, Zap, Globe, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useEffect } from 'react';

export default function Landing() {
  const { session } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (session) {
      navigate('/', { replace: true });
    }
  }, [session, navigate]);

  return (
    <div className="min-h-screen bg-navy overflow-hidden font-display selection:bg-safety-yellow selection:text-navy">
      {/* Navigation */}
      <nav className="fixed w-full z-50 px-6 py-8">
        <div className="max-w-7xl mx-auto flex justify-between items-center bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl px-8 py-4 shadow-2xl">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-navy rounded-xl flex items-center justify-center shadow-inner">
               <PlaneTakeoff className="w-6 h-6 text-safety-yellow" />
             </div>
             <span className="text-xl font-black text-white uppercase tracking-tighter leading-none">Travel<br/><span className="text-safety-yellow">Concierge</span></span>
          </div>
          <button 
            onClick={() => navigate('/login')}
            className="px-6 py-2.5 bg-safety-yellow text-navy font-black rounded-xl hover:scale-105 transition-transform uppercase text-sm tracking-widest"
          >
            Access Portal
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-48 pb-32 px-6 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full pointer-events-none">
           <div className="absolute top-[10%] left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-sky-400/20 rounded-full blur-[120px] opacity-50"></div>
           <div className="absolute top-[20%] left-[20%] w-[400px] h-[400px] bg-safety-yellow/10 rounded-full blur-[100px] opacity-30"></div>
        </div>

        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-20 items-center relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-full mb-8 backdrop-blur-md">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
              <span className="text-xs font-bold text-white/60 tracking-widest uppercase">Now powering 11 destinations</span>
            </div>
            <h1 className="text-6xl md:text-8xl font-black text-white leading-[0.9] uppercase tracking-tighter mb-8">
              The Engine <br/>
              Behind <br/>
              <span className="text-safety-yellow italic">Elite Travel</span>
            </h1>
            <p className="text-xl text-white/60 font-medium max-w-lg mb-10 leading-relaxed italic">
              Experience the first specialized intelligence engine for Ethiopian travelers. Real-time visa, safety, and power standards at your fingertips.
            </p>
            <div className="flex flex-col sm:flex-row gap-5">
               <button 
                 onClick={() => navigate('/login')}
                 className="px-10 py-5 bg-safety-yellow text-navy font-black text-xl rounded-2xl flex items-center justify-center gap-3 hover:gap-5 transition-all uppercase group"
               >
                 Get Started <ArrowRight className="w-6 h-6 transition-all" />
               </button>
               <button 
                 onClick={() => {
                   document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
                 }}
                 className="px-10 py-5 bg-white/5 border border-white/10 text-white font-black text-xl rounded-2xl backdrop-blur-md hover:bg-white/10 transition-all uppercase"
               >
                 Explore Features
               </button>
            </div>
          </div>

          <div className="relative group">
            {/* Visual Representation of Dashboard */}
            <div className="relative z-10 bg-white/10 backdrop-blur-3xl border border-white/20 rounded-[2.5rem] shadow-[0_0_100px_rgba(0,0,0,0.5)] p-4 sm:p-8 transform rotate-3 group-hover:rotate-0 transition-all duration-700">
               <div className="grid grid-cols-2 gap-4">
                  <div className="aspect-square bg-white/5 rounded-3xl border border-white/10 flex flex-col items-center justify-center p-6 text-white">
                     <ShieldCheck className="w-12 h-12 text-green-400 mb-4" />
                     <p className="font-black uppercase text-xs tracking-widest opacity-40">Visa Verified</p>
                  </div>
                  <div className="aspect-square bg-white/5 rounded-3xl border border-white/10 flex flex-col items-center justify-center p-6 text-white">
                     <CloudSun className="w-12 h-12 text-sky-400 mb-4" />
                     <p className="font-black uppercase text-xs tracking-widest opacity-40">Live Weather</p>
                  </div>
                  <div className="aspect-square bg-white/5 rounded-3xl border border-white/10 flex flex-col items-center justify-center p-6 text-white">
                     <Zap className="w-12 h-12 text-safety-yellow mb-4" />
                     <p className="font-black uppercase text-xs tracking-widest opacity-40">Grid Match</p>
                  </div>
                  <div className="aspect-square bg-white/5 rounded-3xl border border-white/10 flex flex-col items-center justify-center p-6 text-white">
                     <Globe className="w-12 h-12 text-purple-400 mb-4" />
                     <p className="font-black uppercase text-xs tracking-widest opacity-40">11+ Countries</p>
                  </div>
               </div>
               <div className="mt-4 bg-white/5 rounded-3xl border border-white/10 p-6">
                  <div className="flex justify-between items-center mb-4">
                    <p className="text-white font-black uppercase text-xs tracking-widest">Upcoming Trip</p>
                    <span className="bg-sky-400/20 text-sky-400 text-[10px] px-2 py-0.5 rounded-full font-black">TRACKING</span>
                  </div>
                  <div className="flex items-center gap-4">
                     <div className="w-10 h-10 bg-white/5 rounded-xl border border-white/10"></div>
                     <div className="flex-1">
                        <div className="h-2 bg-white/20 rounded-full w-full mb-2"></div>
                        <div className="h-2 bg-white/10 rounded-full w-2/3"></div>
                     </div>
                  </div>
               </div>
            </div>
            {/* Background elements for depth */}
            <div className="absolute top-10 right-10 w-full h-full bg-safety-yellow/20 rounded-[2.5rem] blur-2xl -z-10 animate-pulse"></div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-32 px-6 bg-white relative">
        <div className="max-w-7xl mx-auto">
          <div className="mb-20 text-center">
            <h2 className="text-sm font-black text-navy opacity-30 uppercase tracking-[0.3em] mb-4">Precision Intelligence</h2>
            <p className="text-5xl md:text-7xl font-black text-navy uppercase tracking-tighter">Everything You Need <br/> <span className="text-navy/20 italic">For The Journey.</span></p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {[
              { icon: <ShieldCheck />, title: "Visa Mastery", desc: "Instantly check requirements for Ethiopian passport holders. eVisas, VOA, and required docs." },
              { icon: <CloudSun />, title: "Live Forecasts", desc: "Real-time weather data for every destination. Plan your packing with precision." },
              { icon: <Zap />, title: "Power Standards", desc: "Never be without a charge. We track plug types and voltages globally." },
              { icon: <Globe />, title: "Safety Audits", desc: "Official safety ratings from UK and US intelligence sources updated daily." },
              { icon: <CheckCircle2 />, title: "Trip Tracking", desc: "Save your favorite destinations and track your upcoming journeys with badges." },
              { icon: <PlaneTakeoff />, title: "Offline Support", desc: "Built as a PWA. Access your last viewed destination even in the middle of flight." },
            ].map((f, i) => (
              <div key={i} className="group p-8 rounded-[2rem] bg-surface border border-gray-100 hover:shadow-2xl hover:shadow-navy/5 transition-all">
                <div className="w-14 h-14 bg-navy text-safety-yellow rounded-2xl flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 transition-transform">
                  {f.icon}
                </div>
                <h3 className="text-2xl font-black text-navy uppercase mb-4 tracking-tight">{f.title}</h3>
                <p className="text-navy/60 font-medium leading-relaxed italic">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof / Call to Action */}
      <section className="py-32 px-6 relative overflow-hidden bg-navy">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full opacity-10 pointer-events-none uppercase font-black text-[30vw] whitespace-nowrap text-white/5 select-none tracking-tighter leading-none">
           ADVENTURE
        </div>
        
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <h2 className="text-5xl md:text-8xl font-black text-white uppercase tracking-tighter mb-10">
            Ready To <br/> <span className="text-safety-yellow">Take Flight?</span>
          </h2>
          <p className="text-xl text-white/60 font-medium mb-12 italic">Join hundreds of travelers who never leave home without their concierge.</p>
          <button 
             onClick={() => navigate('/login')}
             className="inline-flex items-center gap-4 px-12 py-6 bg-safety-yellow text-navy font-black text-2xl rounded-2xl hover:bg-white transition-colors uppercase"
          >
            Create Your Account <ArrowRight className="w-8 h-8" />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-white/5 bg-navy text-white/40">
        <div className="max-w-7xl mx-auto flex flex-col md:row justify-between items-center gap-8">
          <div className="flex items-center gap-3 grayscale opacity-50">
             <PlaneTakeoff className="w-5 h-5" />
             <span className="font-black uppercase tracking-widest text-sm">Travel Concierge</span>
          </div>
          <p className="text-xs font-bold uppercase tracking-widest">© 2026 Concierge Engine. Built with Passion for the World.</p>
        </div>
      </footer>
    </div>
  );
}
