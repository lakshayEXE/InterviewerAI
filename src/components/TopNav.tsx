import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, Network, Mic2, Building2, Link2, Sparkles, UserCog } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { SettingsModal } from './SettingsModal';
import { useInterviewStore } from '../store/useInterviewStore';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/flow', icon: Network, label: 'Flow Builder' },
  { to: '/session', icon: Mic2, label: 'Live Session' },
];

export const TopNav: React.FC = () => {
  const setApiKey = useInterviewStore((state) => state.setApiKey);
  const apiKey = useInterviewStore((state) => state.apiKey);
  const isSessionActive = useInterviewStore((state) => state.isSessionActive);
  const flowNavActions = useInterviewStore((state) => state.flowNavActions);
  const location = useLocation();

  const isActive = (to: string) =>
    to === '/' ? location.pathname === '/' : location.pathname.startsWith(to);

  const onSessionPage = location.pathname.startsWith('/session');
  const onFlowPage = location.pathname.startsWith('/flow');

  // Auto-hide the nav during an active interview session (immersive + anti-cheat safe)
  if (onSessionPage && isSessionActive) {
    return null;
  }

  return (
    <>
      {/* Left anchor: logo */}
      <div className="fixed top-5 left-5 z-50 flex items-center gap-3">
        <div className="flex items-center gap-2.5 px-4 h-12 rounded-full glass-panel">
          <div className="w-6 h-6 rounded-md bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0">
            <div className="w-2.5 h-2.5 rounded-full bg-primary shadow-[0_0_8px_rgba(204,120,92,0.6)]" />
          </div>
          <span className="text-sm font-semibold text-textMain tracking-tight hidden sm:block">
            InterviewAI
          </span>
        </div>
      </div>

      {/* Bottom anchor: contextual Flow Builder actions */}
      <AnimatePresence>
        {onFlowPage && flowNavActions && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1.5 px-2 h-14 rounded-full glass-panel shadow-2xl"
          >
            <button
              onClick={flowNavActions.onCompanyInfo}
              className="flex items-center gap-2 px-4 py-2.5 rounded-full text-textMuted hover:text-textMain hover:bg-white/[0.06] transition-colors"
              title="Company Info"
            >
              <Building2 size={17} className="shrink-0" />
              <span className="text-sm font-medium hidden sm:block">Company</span>
            </button>
            <button
              onClick={flowNavActions.onInterviewerConfig}
              className="flex items-center gap-2 px-4 py-2.5 rounded-full text-textMuted hover:text-textMain hover:bg-white/[0.06] transition-colors"
              title="Interviewer Persona & Voice"
            >
              <UserCog size={17} className="shrink-0" />
              <span className="text-sm font-medium hidden sm:block">Interviewer</span>
            </button>
            <button
              onClick={flowNavActions.onGenerateAI}
              className="flex items-center gap-2 px-4 py-2.5 rounded-full text-textMuted hover:text-textMain hover:bg-white/[0.06] transition-colors"
              title="Generate with AI"
            >
              <Sparkles size={17} className="shrink-0" />
              <span className="text-sm font-medium hidden sm:block">AI</span>
            </button>
            <div className="w-px h-7 bg-white/10 mx-0.5" />
            <button
              onClick={flowNavActions.onGenerateLink}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary/15 border border-primary/30 text-primary hover:bg-primary/25 transition-colors"
              title="Generate Interview Link"
            >
              <Link2 size={17} className="shrink-0" />
              <span className="text-sm font-medium">Link</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Center anchor: nav links (always centered, never shifts) */}
      <nav className="fixed top-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1 px-1.5 h-12 rounded-full glass-panel">
        {navItems.map(({ to, icon: Icon, label }) => {
          const active = isActive(to);
          return (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className="relative flex items-center gap-2 px-3.5 py-2 rounded-full transition-colors duration-200"
            >
              {active && (
                <motion.div
                  layoutId="nav-active-pill"
                  className="absolute inset-0 rounded-full bg-primary/15 border border-primary/30"
                  transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                />
              )}
              <Icon
                size={17}
                className={`relative z-10 shrink-0 transition-colors ${active ? 'text-primary' : 'text-textMuted'}`}
              />
              <span
                className={`relative z-10 text-sm font-medium hidden md:block transition-colors ${active ? 'text-primary' : 'text-textMuted'}`}
              >
                {label}
              </span>
            </NavLink>
          );
        })}
      </nav>

      {/* Right anchor: settings + status (always fixed right, never shifts) */}
      <div className="fixed top-5 right-5 z-50 flex items-center gap-2 px-2 h-12 rounded-full glass-panel">
        <span
          className={`w-2 h-2 rounded-full ${apiKey ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]' : 'bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.6)]'}`}
          title={apiKey ? 'API key configured' : 'API key missing'}
        />
        <SettingsModal onSave={setApiKey} />
      </div>
    </>
  );
};
