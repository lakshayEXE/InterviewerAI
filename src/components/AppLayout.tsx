import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, Network, Mic2 } from 'lucide-react';
import { Toaster } from 'react-hot-toast';
import { SettingsModal } from './SettingsModal';
import { useInterviewStore } from '../store/useInterviewStore';

export const AppLayout: React.FC = () => {
  const setApiKey = useInterviewStore((state) => state.setApiKey);

  return (
    <div className="flex h-screen bg-background text-textMain overflow-hidden font-sans">
      <Toaster position="top-right" toastOptions={{ className: 'glass-panel text-white' }} />
      
      {/* Sidebar Navigation */}
      <nav className="w-20 md:w-64 flex flex-col bg-surfaceHighlight border-r border-gray-800 p-4 shrink-0 transition-all">
        <div className="flex items-center gap-4 mb-10 px-2">
          <div className="w-8 h-8 rounded-full bg-primary animate-pulse shrink-0" />
          <h1 className="text-xl font-bold bg-gradient-to-r from-accent to-primary bg-clip-text text-transparent hidden md:block">
            Recruiter AI
          </h1>
        </div>

        <div className="flex flex-col gap-2 flex-1">
          <NavLink to="/" className={({ isActive }) => `flex items-center gap-4 p-3 rounded-xl transition-all ${isActive ? 'bg-surface border border-accent text-accent shadow-[0_0_15px_rgba(56,189,248,0.2)]' : 'hover:bg-surface text-textMuted hover:text-white'}`}>
            <LayoutDashboard size={24} className="shrink-0" />
            <span className="hidden md:block font-medium">Dashboard</span>
          </NavLink>
          <NavLink to="/flow" className={({ isActive }) => `flex items-center gap-4 p-3 rounded-xl transition-all ${isActive ? 'bg-surface border border-accent text-accent shadow-[0_0_15px_rgba(56,189,248,0.2)]' : 'hover:bg-surface text-textMuted hover:text-white'}`}>
            <Network size={24} className="shrink-0" />
            <span className="hidden md:block font-medium">Flow Builder</span>
          </NavLink>
          <NavLink to="/session" className={({ isActive }) => `flex items-center gap-4 p-3 rounded-xl transition-all ${isActive ? 'bg-surface border border-primary text-primary shadow-[0_0_15px_rgba(74,222,128,0.2)]' : 'hover:bg-surface text-textMuted hover:text-white'}`}>
            <Mic2 size={24} className="shrink-0" />
            <span className="hidden md:block font-medium">Live Session</span>
          </NavLink>
        </div>

        <div className="mt-auto flex justify-center md:justify-start px-2">
          <SettingsModal onSave={setApiKey} />
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        <Outlet />
      </main>
    </div>
  );
};
