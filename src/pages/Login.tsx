import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { PlaneTakeoff, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error: authError } = isSignUp
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password });

    if (authError) {
      setError(authError.message);
    } else {
      // If sign in is successful, the AuthContext will update, triggering App.tsx redirect.
      // But we can also force navigate if needed.
      navigate('/');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-surface flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md flex flex-col items-center">
        <div className="w-16 h-16 bg-navy rounded-2xl flex items-center justify-center shadow-lg mb-6">
          <PlaneTakeoff className="w-8 h-8 text-safety-yellow" />
        </div>
        <h2 className="text-center text-4xl font-black text-navy uppercase tracking-tight">
          {isSignUp ? 'Create Account' : 'Welcome Back'}
        </h2>
        <p className="mt-2 text-center text-lg text-navy opacity-60 font-medium">
          Travel Concierge Portal
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl shadow-navy/5 sm:rounded-3xl sm:px-10 border border-gray-100">
          <form className="space-y-6" onSubmit={handleAuth}>
            <div>
              <label className="block text-sm font-bold text-navy uppercase tracking-wider mb-2">
                Email
              </label>
              <input
                type="email"
                required
                className="w-full px-4 py-4 rounded-xl border-2 border-gray-100 focus:border-navy focus:ring-0 transition-colors text-lg"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-navy uppercase tracking-wider mb-2">
                Password
              </label>
              <input
                type="password"
                required
                className="w-full px-4 py-4 rounded-xl border-2 border-gray-100 focus:border-navy focus:ring-0 transition-colors text-lg"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 p-4 rounded-xl font-medium text-sm">
                {error}
                {isSignUp && error.includes("User already registered") && " Try logging in instead."}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-navy text-white font-bold py-4 rounded-xl hover:bg-navy-light disabled:opacity-50 transition-all flex justify-center items-center gap-2 text-lg"
            >
              {loading && <Loader2 className="w-5 h-5 animate-spin" />}
              {isSignUp ? 'Sign Up' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-navy opacity-60 hover:opacity-100 font-bold transition-opacity"
            >
              {isSignUp
                ? 'Already have an account? Sign in'
                : "Don't have an account? Sign up"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
