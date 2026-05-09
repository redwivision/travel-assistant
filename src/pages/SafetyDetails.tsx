import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getSafetyInfo } from '../lib/supabaseClient';
import type { SafetyInfo } from '../lib/supabaseClient';
import { ShieldCheck, AlertTriangle, ArrowLeft, Loader2, ExternalLink } from 'lucide-react';

export default function SafetyDetails() {
  const { destination } = useParams<{ destination: string }>();
  const navigate = useNavigate();
  const [safety, setSafety] = useState<SafetyInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (destination) {
      getSafetyInfo(destination).then(data => {
        setSafety(data);
        setLoading(false);
      }).catch(err => {
        console.error(err);
        setLoading(false);
      });
    }
  }, [destination]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <Loader2 className="w-10 h-10 text-navy animate-spin" />
      </div>
    );
  }

  if (!safety) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-surface">
        <p className="text-navy font-bold mb-4">Could not load safety details.</p>
        <button onClick={() => navigate('/')} className="btn-primary py-3 px-6 text-xl">Go Back</button>
      </div>
    );
  }

  const isLowRisk = safety.safetyLevel === 'Low';
  const isHighRisk = safety.safetyLevel === 'High';

  return (
    <div className="min-h-screen bg-surface pb-20">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-6 py-6 sticky top-0 z-50">
        <div className="max-w-3xl mx-auto flex items-center gap-4">
          <button 
            onClick={() => navigate('/')}
            className="w-12 h-12 bg-surface hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors"
          >
             <ArrowLeft className="w-6 h-6 text-navy" />
          </button>
          <div>
            <h1 className="text-2xl font-black text-navy leading-none uppercase">{destination}</h1>
            <p className="text-sm font-bold text-navy opacity-60 uppercase tracking-widest mt-1">Safety Report</p>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 mt-10 space-y-8">
        
        {/* Main Verdict */}
        <div className="bg-white p-8 rounded-3xl border border-gray-200 shadow-sm flex flex-col items-center text-center">
          {isLowRisk ? (
             <ShieldCheck className="w-20 h-20 text-green-600 mb-6" />
          ) : (
             <AlertTriangle className={`w-20 h-20 mb-6 ${isHighRisk ? 'text-red-600' : 'text-safety-yellow'}`} />
          )}
          <h2 className={`text-4xl font-black mb-2 ${
            isLowRisk ? 'text-green-700' : isHighRisk ? 'text-red-700' : 'text-yellow-600'
          }`}>
            {safety.safetyLevel} Risk
          </h2>
          <p className="text-xl font-medium text-navy opacity-80 max-w-lg leading-relaxed">
            {safety.generalAdvice}
          </p>
        </div>

        {/* Detailed Sources */}
        <section>
          <h3 className="text-xl font-bold text-navy uppercase tracking-wider mb-6 flex items-center gap-2">
            <ExternalLink className="w-5 h-5 opacity-50" /> Threat Intelligence Sources
          </h3>
          
          <div className="space-y-4">
            {safety.sources && safety.sources.length > 0 ? (
              safety.sources.map((source, idx) => (
                <div key={idx} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="flex-1">
                     <h4 className="font-black text-xl text-navy uppercase mb-1">{source.name}</h4>
                     <p className="text-sm font-bold text-navy opacity-40 uppercase tracking-widest">
                       Updated: {new Date(source.lastUpdated).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric'})}
                     </p>
                  </div>
                  <div className="bg-navy text-white px-4 py-2 rounded-xl text-center self-start">
                    <span className="block text-xs uppercase opacity-70 mb-1">Advisory</span>
                    <span className="font-black text-lg">{source.rating}</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-navy opacity-50 font-medium">No specific sources available for this region.</p>
            )}
          </div>
        </section>

      </main>
    </div>
  );
}
