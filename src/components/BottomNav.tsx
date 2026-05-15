import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Plane, CloudSun, User } from 'lucide-react';

export default function BottomNav() {
  const tabs = [
    { to: '/dashboard', icon: <LayoutDashboard size={24} />, label: 'Home' },
    { to: '/trips', icon: <Plane size={24} />, label: 'Trips' },
    { to: '/weather', icon: <CloudSun size={24} />, label: 'Weather' },
    { to: '/profile', icon: <User size={24} />, label: 'Profile' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-2xl border-t border-gray-100 px-6 pb-[env(safe-area-inset-bottom)] shadow-[0_-1px_20px_rgba(0,0,0,0.05)]">
      <div className="flex justify-between items-center h-20 max-w-lg mx-auto">
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={({ isActive }) => `
              flex flex-col items-center gap-1 transition-all
              ${isActive ? 'text-navy scale-110' : 'text-navy/40 hover:text-navy/60'}
            `}
          >
            <div className={`p-1 rounded-xl transition-colors ${tab.to === '/dashboard' ? '' : ''}`}>
              {tab.icon}
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest">{tab.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
