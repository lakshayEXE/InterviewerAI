import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Network } from 'lucide-react';
import { useInterviewStore } from '../store/useInterviewStore';
import { PageTransition } from '../components/ui/PageTransition';
import { motion } from 'framer-motion';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const apiKey = useInterviewStore(state => state.apiKey);
  const nodes = useInterviewStore(state => state.nodes);

  return (
    <PageTransition>
      <div className="relative h-full flex flex-col items-center justify-center overflow-hidden px-6">
        {/* Restrained warm background */}
        <div className="absolute inset-0 bg-warm-grain opacity-50" />
        <div className="absolute inset-0 bg-warm-radial" />

        <div className="relative z-10 w-full max-w-3xl mx-auto text-center">
          {/* Eyebrow */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 mb-8"
          >
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary" />
            </span>
            <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-textMuted">
              Powered by Gemini Live
            </span>
          </motion.div>

          {/* Serif headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20, filter: 'blur(8px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="text-serif text-5xl md:text-7xl font-light text-textMain leading-[1.05] mb-6"
          >
            Interviews,
            <br />
            conducted by <span className="italic text-primary">AI</span>.
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg text-textMuted max-w-xl mx-auto leading-relaxed mb-10 font-light"
          >
            Design intelligent interview flows and launch real-time voice sessions.
            Rigorous, autonomous technical interviews, built visually.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.35 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-3"
          >
            <button
              onClick={() => navigate('/flow')}
              className="group inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-primary hover:bg-primaryDim text-white font-medium text-sm transition-all duration-200 shadow-[0_4px_20px_rgba(204,120,92,0.25)] hover:shadow-[0_4px_28px_rgba(204,120,92,0.4)] w-full sm:w-auto"
            >
              Build a flow
              <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
            </button>
            <button
              onClick={() => navigate('/session')}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-white/[0.04] hover:bg-white/[0.08] text-textMain font-medium text-sm border border-white/[0.08] hover:border-white/[0.15] transition-all duration-200 w-full sm:w-auto"
            >
              Start a session
            </button>
          </motion.div>

          {/* Slim stat row */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="mt-14 flex items-center justify-center gap-8 text-sm"
          >
            <div className="flex items-center gap-2 text-textMuted">
              <Network size={15} className="text-textDim" />
              <span><strong className="text-textMain font-semibold">{nodes.length}</strong> stages configured</span>
            </div>
            <div className="w-px h-4 bg-white/10" />
            <div className="flex items-center gap-2 text-textMuted">
              <span className={`w-1.5 h-1.5 rounded-full ${apiKey ? 'bg-emerald-400' : 'bg-red-400'}`} />
              <span>{apiKey ? 'API connected' : 'API key missing'}</span>
            </div>
          </motion.div>
        </div>
      </div>
    </PageTransition>
  );
};
