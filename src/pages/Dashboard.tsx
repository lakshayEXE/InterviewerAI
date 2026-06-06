import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Network, Mic2, KeyRound } from 'lucide-react';
import { useInterviewStore } from '../store/useInterviewStore';
import { PageTransition } from '../components/ui/PageTransition';
import { Card } from '../components/ui/Card';
import { motion, Variants } from 'framer-motion';

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const apiKey = useInterviewStore(state => state.apiKey);
  const nodes = useInterviewStore(state => state.nodes);

  return (
    <PageTransition>
      <div className="p-8 h-full flex flex-col items-center justify-center gap-10">
        <motion.div 
          initial={{ opacity: 0, y: -20, filter: 'blur(10px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="text-center max-w-2xl"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-6 border border-primary/20">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            Gemini Live Native
          </div>
          <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-white mb-6">
            AI Voice <span className="bg-gradient-to-r from-accent to-primary bg-clip-text text-transparent">Interviewer</span>
          </h1>
          <p className="text-lg text-textMuted mb-8 leading-relaxed">
            Architect custom behavioral and technical interview pipelines visually. Launch low-latency multimodal voice sessions instantly.
          </p>
        </motion.div>

        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl"
        >
          <motion.div variants={itemVariants}>
            <Card hoverEffect className="cursor-pointer group" onClick={() => navigate('/flow')}>
              <div className="flex flex-col gap-6">
                <div className="w-14 h-14 rounded-2xl bg-surface flex items-center justify-center text-accent group-hover:bg-accent/10 transition-colors">
                  <Network size={28} />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-textMain mb-2">Flow Builder</h2>
                  <p className="text-textMuted leading-relaxed">Design your interview stages. You currently have <strong className="text-accent">{nodes.length}</strong> active stages configured.</p>
                </div>
              </div>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Card hoverEffect className="cursor-pointer group" onClick={() => navigate('/session')}>
              <div className="flex flex-col gap-6">
                <div className="w-14 h-14 rounded-2xl bg-surface flex items-center justify-center text-primary group-hover:bg-primary/10 transition-colors">
                  <Mic2 size={28} />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-textMain mb-2">Live Session</h2>
                  <p className="text-textMuted leading-relaxed">Start the real-time AI interview based on your visual flow configuration.</p>
                </div>
              </div>
            </Card>
          </motion.div>
        </motion.div>

        {!apiKey && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mt-4 flex items-center gap-3 px-6 py-4 bg-red-500/10 border border-red-500/30 text-red-400 rounded-2xl shadow-[0_0_20px_rgba(239,68,68,0.1)]"
          >
            <KeyRound size={20} />
            <span className="font-medium">API Key missing. Please configure it in the sidebar settings to begin.</span>
          </motion.div>
        )}
      </div>
    </PageTransition>
  );
};
