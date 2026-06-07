import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, BarChart3, Sparkles, AlertTriangle, RefreshCw, ShieldCheck } from 'lucide-react';
import { useInterviewStore } from '../store/useInterviewStore';
import { PageTransition } from '../components/ui/PageTransition';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { motion } from 'framer-motion';
import { evaluateInterview } from '../services/EvaluationService';
import { RECOMMENDATION_META } from '../types/evaluation';
import { NODE_CATEGORIES } from '../types/flow';
import { PROCTOR_EVENT_META, PROCTOR_SEVERITY_PENALTY } from '../types/proctor';
import type { ProctorEvent } from '../types/proctor';

function scoreColor(score: number): string {
  if (score >= 75) return '#4ade80';
  if (score >= 55) return '#60a5fa';
  if (score >= 35) return '#facc15';
  return '#f87171';
}

function categoryMeta(category: string) {
  return NODE_CATEGORIES.find((c) => c.category === category);
}

function computeIntegrityScore(events: ProctorEvent[]): number {
  // Gemini events only confirm an existing ML flag, so exclude them to avoid double penalty.
  const penalty = events
    .filter((e) => e.source !== 'gemini')
    .reduce((sum, e) => sum + PROCTOR_SEVERITY_PENALTY[e.severity], 0);
  return Math.max(0, 100 - penalty);
}

function integrityColor(score: number): string {
  if (score >= 85) return '#4ade80';
  if (score >= 60) return '#facc15';
  return '#f87171';
}

export const Evaluation: React.FC = () => {
  const navigate = useNavigate();
  const transcript = useInterviewStore((state) => state.transcript);
  const sessionNodes = useInterviewStore((state) => state.sessionNodes);
  const storeNodes = useInterviewStore((state) => state.nodes);
  const companyInfo = useInterviewStore((state) => state.companyInfo);
  const apiKey = useInterviewStore((state) => state.apiKey);
  const evaluation = useInterviewStore((state) => state.evaluation);
  const setEvaluation = useInterviewStore((state) => state.setEvaluation);
  const proctorEvents = useInterviewStore((state) => state.proctorEvents);

  const [loading, setLoading] = useState(!evaluation);
  const [error, setError] = useState<string | null>(null);
  const hasRun = useRef(false);

  const runEvaluation = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const nodes = sessionNodes.length > 0 ? sessionNodes : storeNodes;
      const result = await evaluateInterview(apiKey, nodes, transcript, 'The candidate', companyInfo);
      setEvaluation(result);
    } catch (err: any) {
      setError(err?.message || 'Failed to evaluate the interview.');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiKey, sessionNodes, storeNodes, transcript, companyInfo]);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;
    if (evaluation) {
      setLoading(false);
      return;
    }
    runEvaluation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <PageTransition className="h-full w-full flex flex-col items-center justify-center gap-8 relative overflow-hidden">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
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
          <p className="text-textMuted">Scoring the candidate stage by stage...</p>
        </div>
      </PageTransition>
    );
  }

  if (error || !evaluation) {
    return (
      <PageTransition className="h-full w-full flex flex-col items-center justify-center gap-6 px-6 text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-red-500/10 text-red-400 rounded-3xl border border-red-500/20">
          <AlertTriangle size={40} />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Couldn't generate the report</h1>
          <p className="text-textMuted max-w-md mx-auto">{error || 'No evaluation is available for this session.'}</p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => navigate('/')}>Return to Dashboard</Button>
          {transcript.length > 0 && (
            <Button onClick={runEvaluation}>
              <RefreshCw size={16} className="mr-2" /> Retry
            </Button>
          )}
        </div>
      </PageTransition>
    );
  }

  const rec = RECOMMENDATION_META[evaluation.recommendation];

  return (
    <PageTransition className="h-full w-full flex flex-col items-center py-12 px-6 overflow-y-auto relative">
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
          <p className="text-textMuted text-lg max-w-xl mx-auto">
            AI-generated, stage-by-stage performance report based on the full interview transcript.
          </p>
        </motion.div>

        {/* Overall score + recommendation */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card hoverEffect>
            <div className="flex flex-col sm:flex-row items-center gap-8">
              <div className="relative flex items-center justify-center w-36 h-36 shrink-0">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                  <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" />
                  <motion.circle
                    cx="60" cy="60" r="52" fill="none"
                    stroke={scoreColor(evaluation.overallScore)}
                    strokeWidth="10" strokeLinecap="round"
                    strokeDasharray={2 * Math.PI * 52}
                    initial={{ strokeDashoffset: 2 * Math.PI * 52 }}
                    animate={{ strokeDashoffset: 2 * Math.PI * 52 * (1 - evaluation.overallScore / 100) }}
                    transition={{ duration: 1.2, ease: 'easeOut', delay: 0.4 }}
                  />
                </svg>
                <div className="absolute flex flex-col items-center">
                  <span className="text-4xl font-extrabold text-white">{evaluation.overallScore}</span>
                  <span className="text-xs text-textMuted uppercase tracking-wider">Overall</span>
                </div>
              </div>

              <div className="flex-1 text-center sm:text-left space-y-3">
                <div>
                  <span className="text-sm text-textMuted uppercase tracking-wider font-semibold">Recommendation</span>
                  <div
                    className="inline-flex items-center gap-2 px-4 py-1.5 mt-1 rounded-full font-bold text-lg border"
                    style={{ color: rec.color, borderColor: `${rec.color}40`, backgroundColor: `${rec.color}1a` }}
                  >
                    {rec.label}
                  </div>
                </div>
                <p className="text-gray-300 leading-relaxed">{evaluation.summary}</p>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Stage-by-stage scores */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card>
            <h2 className="text-2xl font-bold text-white flex items-center gap-3 mb-8">
              <div className="p-2 bg-accent/10 text-accent rounded-xl">
                <BarChart3 size={24} />
              </div>
              Stage-by-Stage Breakdown
            </h2>

            <div className="space-y-7">
              {evaluation.stages.map((stage, i) => {
                const meta = categoryMeta(stage.category);
                const color = scoreColor(stage.score);
                return (
                  <div key={stage.stageId}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-gray-200 font-semibold flex items-center gap-2">
                        {meta?.icon && <span>{meta.icon}</span>}
                        {stage.label}
                      </span>
                      <span className="font-bold text-lg" style={{ color }}>{stage.score}</span>
                    </div>
                    <div className="h-3 bg-background rounded-full overflow-hidden border border-gray-800 shadow-inner">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${stage.score}%` }}
                        transition={{ duration: 0.9, delay: 0.5 + i * 0.1, ease: 'easeOut' }}
                        className="h-full rounded-full"
                        style={{ backgroundColor: color }}
                      />
                    </div>
                    <p className="text-sm text-textMuted mt-2 leading-relaxed">{stage.feedback}</p>
                  </div>
                );
              })}
            </div>
          </Card>
        </motion.div>

        {/* Integrity / proctoring report */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>
          <Card>
            <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
              <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                <div className="p-2 bg-sky-400/10 text-sky-400 rounded-xl">
                  <ShieldCheck size={24} />
                </div>
                Integrity &amp; Proctoring
              </h2>
              {(() => {
                const score = computeIntegrityScore(proctorEvents);
                const color = integrityColor(score);
                return (
                  <div
                    className="flex items-center gap-2 px-4 py-1.5 rounded-full font-bold border"
                    style={{ color, borderColor: `${color}40`, backgroundColor: `${color}1a` }}
                  >
                    Integrity score: {score}
                  </div>
                );
              })()}
            </div>

            {proctorEvents.length === 0 ? (
              <div className="flex items-center gap-3 text-textMuted">
                <CheckCircle2 size={20} className="text-green-400" />
                No integrity flags were raised during this session.
              </div>
            ) : (
              <>
                {/* Counts by type */}
                <div className="flex flex-wrap gap-3 mb-8">
                  {Object.entries(
                    proctorEvents.reduce<Record<string, number>>((acc, e) => {
                      acc[e.type] = (acc[e.type] || 0) + 1;
                      return acc;
                    }, {})
                  ).map(([type, count]) => {
                    const meta = PROCTOR_EVENT_META[type as keyof typeof PROCTOR_EVENT_META];
                    return (
                      <div
                        key={type}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-background border border-gray-800 text-sm text-gray-300"
                      >
                        <span>{meta?.icon}</span>
                        <span>{meta?.label ?? type}</span>
                        <span className="font-bold text-white">×{count}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Timeline */}
                <div className="space-y-2">
                  {[...proctorEvents]
                    .sort((a, b) => a.timestamp - b.timestamp)
                    .map((ev) => {
                      const meta = PROCTOR_EVENT_META[ev.type];
                      const sevColor =
                        ev.severity === 'high' ? '#f87171' : ev.severity === 'medium' ? '#facc15' : '#94a3b8';
                      return (
                        <div
                          key={ev.id}
                          className="flex items-center gap-3 px-3 py-2 rounded-xl bg-background/60 border border-gray-800/60"
                        >
                          <span className="text-lg">{meta?.icon}</span>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm text-gray-200 truncate">{ev.message}</div>
                            <div className="text-[11px] text-textMuted">
                              {new Date(ev.timestamp).toLocaleTimeString()}
                            </div>
                          </div>
                          {ev.confirmed && (
                            <span className="text-[10px] font-bold px-2 py-1 rounded-md bg-red-500/15 text-red-400 border border-red-500/30 shrink-0">
                              Confirmed by AI
                            </span>
                          )}
                          <span
                            className="text-[10px] font-semibold uppercase tracking-wide shrink-0"
                            style={{ color: sevColor }}
                          >
                            {ev.severity}
                          </span>
                        </div>
                      );
                    })}
                </div>

                <p className="text-xs text-textMuted mt-6 leading-relaxed">
                  Integrity signals are informational and kept separate from the competency scoring above.
                  Camera analysis runs on-device; only flagged moments may be sent to the AI for confirmation.
                </p>
              </>
            )}
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="flex justify-center gap-3 pt-8 border-t border-gray-800/50"
        >
          <Button variant="secondary" size="lg" onClick={() => navigate('/')}>Return to Dashboard</Button>
          <Button size="lg" onClick={runEvaluation}>
            <RefreshCw size={18} className="mr-2" /> Re-run Analysis
          </Button>
        </motion.div>
      </div>
    </PageTransition>
  );
};
