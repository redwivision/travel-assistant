import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import SafetyDetails from './pages/SafetyDetails';
import Profile from './pages/Profile';
import PaymentGate from './pages/PaymentGate';
import VisaCompanion from './pages/VisaCompanion';
import ItineraryParser from './pages/ItineraryParser';
import BottomNav from './components/BottomNav';

function AppLayout({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  const isAuthPage = pathname === '/login' || pathname === '/';

  return (
    <div className={`min-h-screen ${!isAuthPage ? 'safe-pb' : ''}`}>
      {children}
      {!isAuthPage && <BottomNav />}
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center font-display text-navy font-bold text-xl uppercase tracking-[0.2em]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-navy border-t-transparent rounded-full animate-spin"></div>
          <span>Syncing Concierge...</span>
        </div>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return <AppLayout>{children}</AppLayout>;
}

export default function App() {
  const { session } = useAuth();

  return (
    <Routes>
      <Route path="/" element={session ? <Navigate to="/dashboard" replace /> : <Landing />} />
      <Route path="/login" element={<Login />} />
      <Route 
        path="/*" 
        element={
          <ProtectedRoute>
            <Routes>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/trips" element={<Dashboard showOnlyTrips />} />
              <Route path="/weather" element={<Dashboard showOnlyWeather />} />
              <Route path="/safety/:destination" element={<SafetyDetails />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/unlock/:tripId" element={<PaymentGate />} />
              <Route path="/visa/:destination" element={<VisaCompanion />} />
              <Route path="/itinerary/:tripId" element={<ItineraryParser />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </ProtectedRoute>
        } 
      />
    </Routes>
  );
}
