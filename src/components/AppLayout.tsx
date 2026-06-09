import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { TopNav } from './TopNav';

export const AppLayout: React.FC = () => {
  const location = useLocation();
  const isDashboard = location.pathname === '/';

  return (
    <div className="h-screen bg-background text-textMain overflow-hidden font-sans relative">
      <Toaster
        position="top-right"
        toastOptions={{
          className: '!bg-surface !text-textMain !border !border-white/[0.08] !shadow-xl !backdrop-blur-xl',
          style: { background: '#1d1b18', color: '#faf9f5', border: '1px solid rgba(250,249,245,0.08)' },
        }}
      />

      <TopNav />

      <main className={`h-full w-full ${isDashboard ? 'overflow-y-auto overflow-x-hidden scroll-smooth' : 'overflow-hidden'}`}>
        <Outlet />
      </main>
    </div>
  );
};
