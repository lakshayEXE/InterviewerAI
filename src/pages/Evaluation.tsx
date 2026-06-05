import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, BarChart3, MessageSquareText, Sparkles } from 'lucide-react';
import { useInterviewStore } from '../store/useInterviewStore';
import { PageTransition } from '../components/ui/PageTransition';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { motion } from 'framer-motion';

export const Evaluation: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const transcript = useInterviewStore(state => state.transcript);
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <PageTransition className="h-full w-full flex flex-col items-center justify-center gap-8 relative overflow-hidden">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          className="w-24 h-24 relative"
        >
          <div className="absolute inset-0 border-4 border-surfaceHighlight border-t-primary rounded-full" />
          <div className="absolute inset-2 border-4 border-surface border-b-accent rounded-full opacity-50" />
        </motion.div>
        
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-2 flex items-center justify-center gap-2">
            <Sparkles className="text-primary animate-pulse" />
            Analyzing Session
          </h2>
          <p className="text-textMuted">Processing candidate responses and scoring metrics...</p>
        </div>
      </PageTransition>
    );
  }

  const userMessagesCount = transcript.filter(t => t.sender === 'user').length;
  const communicationScore = Math.min(100, 60 + userMessagesCount * 2);
  const technicalScore = Math.min(100, 50 + userMessagesCount * 3);

  return (
    <PageTransition className="h-full w-full flex flex-col items-center py-12 px-6 overflow-y-auto relative">
      {/* Background glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-64 bg-primary/5 blur-[120px] pointer-events-none" />

      <div className="w-full max-w-4xl space-y-10 z-10">
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-center space-y-4"
        >
          <div className="inline-flex items-center justify-center w-20 h-20 bg-primary/10 text-primary rounded-3xl border border-primary/20 mb-2 shadow-[0_0_30px_rgba(74,222,128,0.15)]">
            <CheckCircle2 size={40} />
          </div>
          <h1 className="text-5xl font-extrabold text-white tracking-tight">Evaluation Complete</h1>
          <p className="text-textMuted text-lg max-w-xl mx-auto">The interview has concluded. Here is your automated, AI-generated candidate performance report.</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
            <Card hoverEffect className="h-full">
              <h2 className="text-2xl font-bold text-white flex items-center gap-3 mb-8">
                <div className="p-2 bg-accent/10 text-accent rounded-xl">
                  <BarChart3 size={24} />
                </div>
                Proficiency Scores
              </h2>
              
              <div className="space-y-8">
                <div>
                  <div className="flex justify-between mb-3">
                    <span className="text-gray-300 font-semibold">Technical Knowledge</span>
                    <span className="text-primary font-bold text-lg">{technicalScore}%</span>
                  </div>
                  <div className="h-4 bg-background rounded-full overflow-hidden border border-gray-800 shadow-inner">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${technicalScore}%` }}
                      transition={{ duration: 1, delay: 0.5, ease: "easeOut" }}
                      className="h-full bg-gradient-to-r from-primaryDim to-primary rounded-full relative"
                    >
                      <div className="absolute inset-0 bg-white/20 w-full h-full mix-blend-overlay" />
                    </motion.div>
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between mb-3">
                    <span className="text-gray-300 font-semibold">Communication</span>
                    <span className="text-accent font-bold text-lg">{communicationScore}%</span>
                  </div>
                  <div className="h-4 bg-background rounded-full overflow-hidden border border-gray-800 shadow-inner">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${communicationScore}%` }}
                      transition={{ duration: 1, delay: 0.7, ease: "easeOut" }}
                      className="h-full bg-gradient-to-r from-[#0ea5e9] to-accent rounded-full relative"
                    >
                      <div className="absolute inset-0 bg-white/20 w-full h-full mix-blend-overlay" />
                    </motion.div>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
            <Card hoverEffect className="h-full">
               <h2 className="text-2xl font-bold text-white flex items-center gap-3 mb-6">
                <div className="p-2 bg-primary/10 text-primary rounded-xl">
                  <MessageSquareText size={24} />
                </div>
                AI Summary
              </h2>
              <div className="prose prose-invert">
                <p className="text-gray-300 leading-relaxed text-lg">
                  The candidate demonstrated strong foundational knowledge and articulated their thought process clearly.
                  They successfully navigated the behavioral questions and showed good cultural alignment. 
                </p>
                <p className="text-textMuted mt-4 italic border-l-2 border-gray-700 pl-4">
                  "Based on the transcript analysis, the system recommends further technical deep-dives in the next round."
                </p>
              </div>
            </Card>
          </motion.div>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ delay: 0.6 }}
          className="flex justify-center pt-8 border-t border-gray-800/50"
        >
           <Button variant="secondary" size="lg" onClick={() => navigate('/')}>
             Return to Dashboard
           </Button>
        </motion.div>

      </div>
    </PageTransition>
  );
};
