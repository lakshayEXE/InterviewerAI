import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Network,
  Mic2,
  ShieldCheck,
  BarChart3,
  ChevronDown,
  Sparkles,
  Link2,
  Monitor,
  Eye,
  Brain,
} from 'lucide-react';
import { useInterviewStore } from '../store/useInterviewStore';
import {
  motion,
  useMotionValue,
  useTransform,
  animate,
  useInView,
} from 'framer-motion';
import type { Variants } from 'framer-motion';
import { NODE_CATEGORIES, DEMEANOR_PRESETS, INTERVIEWER_VOICES, VOICE_LANGUAGES } from '../types/flow';
import { PROCTOR_EVENT_META, PROCTOR_SEVERITY_PENALTY } from '../types/proctor';
import type { ProctorEventType } from '../types/proctor';
import { RECOMMENDATION_META } from '../types/evaluation';

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
};

const SEVERITY_COLORS: Record<string, string> = {
  low: '#4ade80',
  medium: '#facc15',
  high: '#f87171',
};

/* ─── Animated counter hook ─── */
function useCountUp(target: number, inView: boolean, duration = 1.5) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (v) => Math.round(v));
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const controls = animate(count, target, { duration, ease: 'easeOut' });
    return controls.stop;
  }, [inView, target, duration, count]);

  useEffect(() => {
    const unsubscribe = rounded.on('change', (v) => setDisplay(v));
    return unsubscribe;
  }, [rounded]);

  return display;
}

/* ─── Typewriter hook ─── */
function useTypewriter(lines: { sender: string; text: string }[], inView: boolean) {
  const [visibleLines, setVisibleLines] = useState<{ sender: string; text: string; done: boolean }[]>([]);
  const [cursorLineIdx, setCursorLineIdx] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    if (!inView || started.current) return;
    started.current = true;

    let lineIdx = 0;
    let charIdx = 0;

    const typeNext = () => {
      if (lineIdx >= lines.length) {
        setCursorLineIdx(-1);
        return;
      }

      const line = lines[lineIdx];
      charIdx++;
      setCursorLineIdx(lineIdx);

      setVisibleLines((prev) => {
        const updated = [...prev];
        updated[lineIdx] = {
          sender: line.sender,
          text: line.text.slice(0, charIdx),
          done: charIdx >= line.text.length,
        };
        return updated;
      });

      if (charIdx >= line.text.length) {
        lineIdx++;
        charIdx = 0;
        setTimeout(typeNext, 400);
      } else {
        setTimeout(typeNext, 18);
      }
    };

    setVisibleLines(lines.map((l) => ({ sender: l.sender, text: '', done: false })));
    setTimeout(typeNext, 600);
  }, [inView, lines]);

  return { visibleLines, cursorLineIdx };
}

/* ═══════════════════════════════ HERO ═══════════════════════════════ */

const ORBIT_DOTS = [
  { ring: 0, size: 6, color: '#cc785c', glow: true, offset: 0 },
  { ring: 0, size: 3, color: '#faf9f5', glow: false, offset: 120 },
  { ring: 0, size: 3, color: '#faf9f5', glow: false, offset: 240 },
  { ring: 1, size: 4, color: '#d97757', glow: true, offset: 45 },
  { ring: 1, size: 3, color: '#faf9f5', glow: false, offset: 180 },
  { ring: 2, size: 5, color: '#60a5fa', glow: true, offset: 90 },
  { ring: 2, size: 3, color: '#faf9f5', glow: false, offset: 200 },
  { ring: 2, size: 3, color: '#faf9f5', glow: false, offset: 320 },
];

const RING_RADII = [140, 210, 280];
const RING_CLASSES = ['orbit-1', 'orbit-2', 'orbit-3'];

const HeroSection: React.FC = () => {
  const navigate = useNavigate();
  const apiKey = useInterviewStore((s) => s.apiKey);
  const nodes = useInterviewStore((s) => s.nodes);

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden px-6">
      <div className="absolute inset-0 bg-warm-grain opacity-40" />
      <div className="absolute inset-0 bg-warm-radial" />

      {/* Orbit rings */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
        <svg width="600" height="600" viewBox="0 0 600 600" className="opacity-40">
          {RING_RADII.map((r, i) => (
            <circle
              key={i}
              cx="300" cy="300" r={r}
              fill="none"
              stroke="rgba(250,249,245,0.04)"
              strokeWidth="1"
              strokeDasharray="4 6"
            />
          ))}
        </svg>
        {ORBIT_DOTS.map((dot, i) => {
          const r = RING_RADII[dot.ring];
          return (
            <div
              key={i}
              className={`absolute top-1/2 left-1/2 ${RING_CLASSES[dot.ring]}`}
              style={{
                width: r * 2,
                height: r * 2,
                marginLeft: -r,
                marginTop: -r,
              }}
            >
              <div
                className="absolute rounded-full"
                style={{
                  width: dot.size,
                  height: dot.size,
                  backgroundColor: dot.color,
                  top: 0,
                  left: '50%',
                  marginLeft: -dot.size / 2,
                  marginTop: -dot.size / 2,
                  transform: `rotate(${dot.offset}deg) translateY(${r}px)`,
                  transformOrigin: `${dot.size / 2}px ${r + dot.size / 2}px`,
                  boxShadow: dot.glow ? `0 0 12px ${dot.color}, 0 0 4px ${dot.color}` : 'none',
                }}
              />
            </div>
          );
        })}
      </div>

      <div className="relative z-10 w-full max-w-4xl mx-auto text-center">
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

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 24, filter: 'blur(12px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="text-serif text-6xl md:text-8xl font-light text-textMain leading-[1.02] mb-6"
        >
          Interviews,
          <br />
          conducted by <span className="italic gradient-text">AI</span>.
        </motion.h1>

        {/* Subtitle -- animated phrase pills */}
        <div className="mb-12">
          <CyclingSubtitle />
        </div>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.35 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-3"
        >
          <button
            onClick={() => navigate('/flow')}
            className="group inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-full bg-primary hover:bg-primaryDim text-white font-medium text-sm transition-all duration-200 shadow-[0_4px_24px_rgba(204,120,92,0.3)] hover:shadow-[0_4px_32px_rgba(204,120,92,0.45)] w-full sm:w-auto"
          >
            Build a flow
            <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
          </button>
          <button
            onClick={() => navigate('/session')}
            className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-full bg-white/[0.04] hover:bg-white/[0.08] text-textMain font-medium text-sm border border-white/[0.08] hover:border-white/[0.15] transition-all duration-200 w-full sm:w-auto"
          >
            Start a session
          </button>
        </motion.div>

        {/* Stat pills */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.55 }}
          className="mt-16 flex flex-wrap items-center justify-center gap-3"
        >
          {[
            { label: `${nodes.length} stages configured`, dot: 'bg-blue-400', icon: <Network size={13} /> },
            { label: apiKey ? 'API connected' : 'API key missing', dot: apiKey ? 'bg-emerald-400' : 'bg-red-400' },
            { label: `${INTERVIEWER_VOICES.length} AI voices`, dot: 'bg-purple-400' },
          ].map((pill) => (
            <div key={pill.label} className="flex items-center gap-2 px-4 py-2 rounded-full glass-panel text-xs text-textMuted">
              {pill.icon || <span className={`w-1.5 h-1.5 rounded-full ${pill.dot}`} />}
              <span>{pill.label}</span>
            </div>
          ))}
        </motion.div>
      </div>

      {/* Scroll cue */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1"
      >
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-textDim">Explore</span>
        <motion.div animate={{ y: [0, 6, 0] }} transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}>
          <ChevronDown size={16} className="text-textDim" />
        </motion.div>
      </motion.div>
    </section>
  );
};

/* Cycling subtitle phrases */
const PHRASE_ITEMS = [
  { text: 'Design flows', icon: Network, color: '#4ade80' },
  { text: 'Launch sessions', icon: Mic2, color: '#60a5fa' },
  { text: 'Score candidates', icon: BarChart3, color: '#fb923c' },
  { text: 'Detect cheating', icon: ShieldCheck, color: '#a78bfa' },
];

const CyclingSubtitle: React.FC = () => {
  const [visibleCount, setVisibleCount] = useState(0);
  const allDone = visibleCount >= PHRASE_ITEMS.length;

  useEffect(() => {
    if (allDone) return;
    const timer = setTimeout(() => setVisibleCount((c) => c + 1), 800 + visibleCount * 400);
    return () => clearTimeout(timer);
  }, [visibleCount, allDone]);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex flex-wrap justify-center gap-2.5">
        {PHRASE_ITEMS.map((item, i) => {
          const visible = i < visibleCount;
          return (
            <motion.div
              key={item.text}
              initial={{ opacity: 0, scale: 0.8, y: 10 }}
              animate={visible ? { opacity: 1, scale: 1, y: 0 } : {}}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-medium transition-all ${
                visible ? '' : 'opacity-0'
              }`}
              style={visible ? {
                backgroundColor: `${item.color}08`,
                borderColor: `${item.color}25`,
                color: item.color,
              } : {
                backgroundColor: 'transparent',
                borderColor: 'transparent',
                color: 'transparent',
              }}
            >
              <item.icon size={14} />
              <span>{item.text}</span>
            </motion.div>
          );
        })}
      </div>

      <motion.span
        initial={{ opacity: 0, y: 8 }}
        animate={allDone ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.5, delay: 0.2 }}
        className={`text-lg text-textMuted font-light ${allDone ? '' : 'opacity-0'}`}
      >
        All autonomous. All in real time.
      </motion.span>
    </div>
  );
};

/* ═══════════════════ HOW IT WORKS -- VERTICAL TIMELINE ═══════════════════ */

const STEPS = [
  { num: '01', icon: Network, title: 'Design Your Flow', desc: 'Drag-and-drop interview stages: greetings, DSA, coding, system design, behavioral, and more.', color: '#4ade80' },
  { num: '02', icon: Mic2, title: 'AI Runs the Call', desc: 'Gemini Live voice session with real-time speech, adaptive follow-ups, and deep probing.', color: '#60a5fa' },
  { num: '03', icon: ShieldCheck, title: 'Integrity Monitoring', desc: 'On-device face tracking and browser signals detect cheating attempts in real time.', color: '#a78bfa' },
  { num: '04', icon: BarChart3, title: 'AI Scores & Reports', desc: 'Stage-by-stage scores, a calibrated hiring recommendation, and a full integrity report.', color: '#fb923c' },
];

const HowItWorks: React.FC = () => {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <section className="section-spacing px-6" ref={ref}>
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-20"
        >
          <span className="font-mono text-xs uppercase tracking-[0.3em] text-primary">How it works</span>
          <h2 className="text-serif text-4xl md:text-5xl font-light text-textMain mt-4">
            From flow to feedback in four steps.
          </h2>
        </motion.div>

        <div className="relative">
          {/* Central timeline line */}
          <div className="absolute left-1/2 top-0 bottom-0 w-px -translate-x-1/2 hidden md:block">
            <motion.div
              initial={{ scaleY: 0 }}
              animate={inView ? { scaleY: 1 } : {}}
              transition={{ duration: 1.5, ease: 'easeOut' }}
              className="w-full h-full bg-gradient-to-b from-primary/40 via-primary/20 to-transparent origin-top glow-line"
            />
          </div>

          <div className="space-y-16 md:space-y-24">
            {STEPS.map((step, i) => {
              const isLeft = i % 2 === 0;
              return (
                <motion.div
                  key={step.num}
                  initial={{ opacity: 0, x: isLeft ? -40 : 40 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: '-80px' }}
                  transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
                  className={`relative flex items-center gap-8 md:gap-16 ${
                    isLeft ? 'md:flex-row' : 'md:flex-row-reverse'
                  } flex-col md:flex-row`}
                >
                  {/* Content card */}
                  <div className={`flex-1 ${isLeft ? 'md:text-right' : 'md:text-left'}`}>
                    <div className="bento-card p-6 md:p-8 inline-block w-full">
                      <span className="font-mono text-4xl font-extralight leading-none" style={{ color: `${step.color}20` }}>
                        {step.num}
                      </span>
                      <div className="flex items-center gap-3 mt-3 mb-2" style={{ justifyContent: isLeft ? 'flex-end' : 'flex-start' }}>
                        <div
                          className="w-9 h-9 rounded-lg flex items-center justify-center"
                          style={{ backgroundColor: `${step.color}15`, border: `1px solid ${step.color}30` }}
                        >
                          <step.icon size={18} style={{ color: step.color }} />
                        </div>
                        <h3 className="text-lg font-semibold text-textMain">{step.title}</h3>
                      </div>
                      <p className="text-sm text-textMuted leading-relaxed">{step.desc}</p>
                    </div>
                  </div>

                  {/* Center node on timeline */}
                  <div className="hidden md:flex items-center justify-center shrink-0 z-10">
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center font-mono text-sm font-bold border-2"
                      style={{
                        borderColor: step.color,
                        color: step.color,
                        backgroundColor: '#141413',
                        boxShadow: `0 0 20px ${step.color}40, 0 0 6px ${step.color}20`,
                      }}
                    >
                      {step.num}
                    </div>
                  </div>

                  {/* Spacer for the other side */}
                  <div className="flex-1 hidden md:block" />
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};

/* ═══════════════════ FLOW BUILDER BENTO ═══════════════════ */

const MINI_FLOW_NODES = NODE_CATEGORIES.slice(0, 4);

const FlowBuilderSection: React.FC = () => {
  const navigate = useNavigate();

  return (
    <section className="section-spacing px-6">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="font-mono text-xs uppercase tracking-[0.3em] text-primary">Flow Builder</span>
          <h2 className="text-serif text-4xl md:text-5xl font-light text-textMain mt-4">
            Design your interview, visually.
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Main text card */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="bento-card p-8 md:col-span-2 md:row-span-2 flex flex-col justify-between"
          >
            <div>
              <h3 className="text-serif text-3xl font-light text-textMain mb-4 leading-snug">
                Build interview pipelines<br />with drag and drop.
              </h3>
              <p className="text-textMuted leading-relaxed max-w-lg">
                Each node is a stage — configure difficulty, topics, duration, and AI behavior.
                Connect them to define the interview order. Inject company context, set the interviewer's
                personality, or let AI generate the entire flow from a job description.
              </p>
            </div>
            <button
              onClick={() => navigate('/flow')}
              className="group inline-flex items-center gap-2 mt-8 text-primary text-sm font-medium hover:underline underline-offset-4"
            >
              Open Flow Builder <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
            </button>
          </motion.div>

          {/* Mini flow diagram */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="bento-card p-6"
          >
            <h4 className="font-mono text-xs uppercase tracking-[0.2em] text-textDim mb-5">Live Preview</h4>
            <MiniFlowDiagram />
          </motion.div>

          {/* Personas card */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="bento-card p-6"
          >
            <h4 className="font-mono text-xs uppercase tracking-[0.2em] text-textDim mb-4">Interviewer Personas</h4>
            <div className="space-y-2.5">
              {DEMEANOR_PRESETS.map((p) => (
                <div key={p.id} className="flex items-start gap-3">
                  <span className="text-lg leading-none mt-0.5">{p.icon}</span>
                  <div>
                    <span className="text-sm font-medium text-gray-200">{p.label}</span>
                    <p className="text-xs text-textDim leading-snug mt-0.5">{p.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* AI gen + share links */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="bento-card p-6 flex items-start gap-4"
          >
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0">
              <Sparkles size={18} className="text-purple-400" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-gray-200">AI Generate from JD</h4>
              <p className="text-xs text-textMuted mt-1">Paste a job description and resume — get a full interview flow in seconds.</p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.25 }}
            className="bento-card p-6 flex items-start gap-4"
          >
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center shrink-0">
              <Link2 size={18} className="text-sky-400" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-gray-200">Shareable Invite Links</h4>
              <p className="text-xs text-textMuted mt-1">Generate a link for candidates with the flow, company context, and interviewer config baked in.</p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

/* Animated mini flow diagram */
const MiniFlowDiagram: React.FC = () => {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true });

  return (
    <div ref={ref} className="space-y-0">
      {MINI_FLOW_NODES.map((node, i) => (
        <React.Fragment key={node.category}>
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ delay: i * 0.15, duration: 0.5 }}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-background/50 border border-white/[0.04]"
            style={{ borderLeftWidth: 3, borderLeftColor: node.color }}
          >
            <span className="text-sm">{node.icon}</span>
            <span className="text-xs font-medium text-gray-300">{node.label}</span>
          </motion.div>
          {i < MINI_FLOW_NODES.length - 1 && (
            <motion.div
              initial={{ scaleY: 0 }}
              animate={inView ? { scaleY: 1 } : {}}
              transition={{ delay: i * 0.15 + 0.1, duration: 0.3 }}
              className="flex justify-center"
            >
              <div className="w-px h-5 border-l border-dashed border-white/10" />
            </motion.div>
          )}
        </React.Fragment>
      ))}
      <motion.p
        initial={{ opacity: 0 }}
        animate={inView ? { opacity: 1 } : {}}
        transition={{ delay: 0.7 }}
        className="text-[11px] text-textDim mt-3 text-center font-mono"
      >
        ...and {NODE_CATEGORIES.length - 4} more stage types
      </motion.p>
    </div>
  );
};

/* ═══════════════════ LIVE INTERVIEW -- TYPING TRANSCRIPT ═══════════════════ */

const MOCK_TRANSCRIPT = [
  { sender: 'ai', text: 'Tell me about a time you had to debug a critical production outage.' },
  { sender: 'user', text: 'We had a memory leak in our Redis cluster causing cascading timeouts. I started by checking the metrics dashboard...' },
  { sender: 'ai', text: 'How did you isolate that it was specifically Redis and not the application layer?' },
  { sender: 'user', text: 'I correlated the error timestamps with our Redis slow-log and found that KEYS commands were blocking the event loop...' },
];

const LiveInterviewSection: React.FC = () => {
  const termRef = useRef<HTMLDivElement>(null);
  const termInView = useInView(termRef, { once: true, margin: '-100px' });
  const { visibleLines, cursorLineIdx } = useTypewriter(MOCK_TRANSCRIPT, termInView);

  return (
    <section className="section-spacing px-6">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="font-mono text-xs uppercase tracking-[0.3em] text-primary">Live Session</span>
          <h2 className="text-serif text-4xl md:text-5xl font-light text-textMain mt-4">
            Real-time. Voice-first. Autonomous.
          </h2>
        </motion.div>

        {/* Terminal mockup */}
        <motion.div
          ref={termRef}
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-3xl mx-auto mb-12"
        >
          <div className="rounded-2xl border border-white/[0.08] bg-[#0d0d0c] overflow-hidden shadow-2xl">
            {/* Title bar */}
            <div className="flex items-center gap-2 px-5 py-3.5 border-b border-white/[0.06]">
              <span className="w-3 h-3 rounded-full bg-red-500/70" />
              <span className="w-3 h-3 rounded-full bg-yellow-500/70" />
              <span className="w-3 h-3 rounded-full bg-green-500/70" />
              <span className="ml-3 font-mono text-xs text-textDim">Live Interview Session</span>
              <div className="ml-auto flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span className="font-mono text-[10px] text-red-400">REC</span>
              </div>
            </div>

            {/* Typing transcript */}
            <div className="p-6 space-y-5 min-h-[220px]">
              {visibleLines.map((line, i) => {
                if (!line.text && i !== 0) return null;
                const isAi = line.sender === 'ai';
                return (
                  <div key={i} className="flex gap-4">
                    <div className={`w-0.5 shrink-0 rounded-full ${isAi ? 'bg-primary' : 'bg-white/20'}`} />
                    <div>
                      <span className={`font-mono text-[10px] uppercase tracking-wider ${isAi ? 'text-primary' : 'text-textDim'}`}>
                        {isAi ? 'Interviewer' : 'Candidate'}
                      </span>
                      <p className="text-sm text-gray-300 mt-1 leading-relaxed">
                        {line.text}
                        {cursorLineIdx === i && !line.done && (
                          <span className="cursor-blink text-primary ml-0.5 font-mono">|</span>
                        )}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Waveform */}
            <div className="px-6 pb-5">
              <motion.div
                animate={cursorLineIdx === -1 ? { opacity: [0.5, 1, 0.5] } : {}}
                transition={cursorLineIdx === -1 ? { duration: 2, repeat: Infinity } : {}}
                className="h-8 rounded-lg bg-background/60 border border-white/[0.04] flex items-center justify-center overflow-hidden px-4"
              >
                <svg viewBox="0 0 200 24" className="w-full h-full" preserveAspectRatio="none">
                  <path
                    d="M0,12 Q10,4 20,12 T40,12 T60,12 Q70,2 80,12 T100,12 T120,12 Q130,6 140,12 T160,12 T180,12 Q190,8 200,12"
                    fill="none" stroke="url(#waveGradient)" strokeWidth="1.5" strokeLinecap="round"
                  />
                  <defs>
                    <linearGradient id="waveGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#cc785c" stopOpacity="0.6" />
                      <stop offset="50%" stopColor="#d97757" stopOpacity="0.8" />
                      <stop offset="100%" stopColor="#cc785c" stopOpacity="0.6" />
                    </linearGradient>
                  </defs>
                </svg>
              </motion.div>
            </div>
          </div>
        </motion.div>

        {/* Feature badges */}
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06 } } }}
          className="flex flex-wrap justify-center gap-2.5 mb-8"
        >
          {[
            'Voice-First',
            `${INTERVIEWER_VOICES.length} AI Voices`,
            `${VOICE_LANGUAGES.length} Languages`,
            'Live Code Editor',
            'Stage-Aware Follow-ups',
            'Real-time Transcription',
          ].map((label) => (
            <motion.div key={label} variants={fadeUp} className="px-4 py-2 rounded-full glass-panel text-xs text-textMuted font-medium">
              {label}
            </motion.div>
          ))}
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className="text-center font-mono text-[11px] text-textDim tracking-wide"
        >
          Powered by Gemini 3.1 Flash Live &mdash; bidirectional audio over WebSocket
        </motion.p>
      </div>
    </section>
  );
};

/* ═══════════════════ CHEATING DETECTION -- RADAR ═══════════════════ */

const LAYERS = [
  {
    num: 1, title: 'Behavioral Signals', color: '#4ade80', icon: Monitor,
    items: ['Fullscreen exit', 'Tab switch / minimize', 'Window blur', 'Paste detection (40+ chars)', 'Multi-monitor detection'],
    detail: 'Browser-event-based, instant detection',
  },
  {
    num: 2, title: 'On-Device ML', color: '#60a5fa', icon: Eye,
    items: ['No face detected', 'Multiple faces detected', 'Head pose tracking (yaw/pitch)'],
    detail: 'MediaPipe FaceLandmarker at ~4fps, 2.5s debounce',
  },
  {
    num: 3, title: 'AI Vision Confirmation', color: '#a78bfa', icon: Brain,
    items: ['JPEG frame sent to Gemini 2.5 Flash', 'Conservative confirmation only', 'Rate-limited with 120s backoff'],
    detail: 'Triggered by soft ML flags (no-face, looking-away)',
  },
];

const CheatingDetectionSection: React.FC = () => (
  <section className="section-spacing px-6 relative overflow-hidden">
    {/* Radar sweep background */}
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-[0.04]">
      <svg width="700" height="700" viewBox="0 0 700 700">
        <circle cx="350" cy="350" r="100" fill="none" stroke="#4ade80" strokeWidth="0.5" />
        <circle cx="350" cy="350" r="200" fill="none" stroke="#4ade80" strokeWidth="0.5" />
        <circle cx="350" cy="350" r="300" fill="none" stroke="#4ade80" strokeWidth="0.5" />
        <line x1="350" y1="350" x2="350" y2="50" stroke="#4ade80" strokeWidth="1" className="radar-sweep" style={{ transformOrigin: '350px 350px' }} />
      </svg>
      <div
        className="absolute top-0 left-0 w-full h-full radar-sweep"
        style={{
          background: 'conic-gradient(from 0deg at 50% 50%, transparent 0deg, rgba(74,222,128,0.08) 30deg, transparent 60deg)',
          transformOrigin: 'center',
        }}
      />
    </div>

    <div className="max-w-6xl mx-auto relative z-10">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="text-center mb-16"
      >
        <span className="font-mono text-xs uppercase tracking-[0.3em] text-primary">Integrity Monitor</span>
        <h2 className="text-serif text-4xl md:text-5xl font-light text-textMain mt-4">
          Three layers of cheat detection.
        </h2>
        <p className="text-textMuted mt-4 max-w-xl mx-auto">
          On-device ML. Browser signals. AI vision. Working together to maintain interview integrity without compromising candidate experience.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Detection layers with pulsing borders */}
        <div className="lg:col-span-2 space-y-4">
          {LAYERS.map((layer, i) => (
            <motion.div
              key={layer.num}
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.12, duration: 0.6 }}
              className="bento-card p-6 border-l-[3px] border-pulse"
              style={{
                '--pulse-color': `${layer.color}40`,
                '--pulse-color-bright': layer.color,
              } as React.CSSProperties}
            >
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${layer.color}15`, border: `1px solid ${layer.color}30` }}
                >
                  <layer.icon size={16} style={{ color: layer.color }} />
                </div>
                <div>
                  <span className="font-mono text-[10px] text-textDim">LAYER {layer.num}</span>
                  <h4 className="text-sm font-semibold text-gray-200 leading-none">{layer.title}</h4>
                </div>
              </div>
              <ul className="space-y-1.5 mb-3">
                {layer.items.map((item) => (
                  <li key={item} className="flex items-center gap-2 text-xs text-textMuted">
                    <span className="w-1 h-1 rounded-full shrink-0" style={{ backgroundColor: layer.color }} />
                    {item}
                  </li>
                ))}
              </ul>
              <p className="font-mono text-[10px] text-textDim">{layer.detail}</p>
            </motion.div>
          ))}
        </div>

        {/* Event types grid with scan hover */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.15, duration: 0.6 }}
          className="lg:col-span-3 bento-card p-6"
        >
          <h4 className="font-mono text-xs uppercase tracking-[0.2em] text-textDim mb-5">8 Event Types Tracked</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(Object.entries(PROCTOR_EVENT_META) as [ProctorEventType, typeof PROCTOR_EVENT_META[ProctorEventType]][]).map(
              ([type, meta]) => {
                const penalty = PROCTOR_SEVERITY_PENALTY[meta.severity];
                const sevColor = SEVERITY_COLORS[meta.severity];
                return (
                  <div
                    key={type}
                    className="scan-card flex items-center gap-3 px-4 py-3 rounded-xl bg-background/50 border border-white/[0.04] hover:border-white/[0.1] transition-all duration-200"
                  >
                    <span className="text-lg relative z-10">{meta.icon}</span>
                    <div className="flex-1 min-w-0 relative z-10">
                      <span className="text-sm text-gray-300 font-medium">{meta.label}</span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: sevColor }} />
                        <span className="text-[10px] uppercase font-medium tracking-wide" style={{ color: sevColor }}>
                          {meta.severity}
                        </span>
                      </div>
                    </div>
                    <span className="font-mono text-xs text-textDim bg-background/80 px-2 py-1 rounded-md border border-white/[0.04] relative z-10">
                      -{penalty}pts
                    </span>
                  </div>
                );
              }
            )}
          </div>
        </motion.div>
      </div>

      {/* AI nudge callout */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.2, duration: 0.6 }}
        className="mt-4 bento-card p-6 flex items-start gap-4"
      >
        <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
          <ShieldCheck size={18} className="text-primary" />
        </div>
        <div>
          <p className="text-sm text-gray-300 leading-relaxed">
            <span className="text-textMain font-medium">Conversational integrity.</span>{' '}
            When soft flags are raised, the AI interviewer casually checks in with the candidate —
            "Everything okay?" — without ever accusing them of cheating or mentioning that monitoring is active.
          </p>
        </div>
      </motion.div>
    </div>
  </section>
);

/* ═══════════════════ SCORING -- COUNT-UP ═══════════════════ */

const PIPELINE_STEPS = [
  'Capture Transcript',
  'Segment by Stage',
  'Score 0–100',
  'Generate Recommendation',
  'Integrity Audit',
];

const EXAMPLE_STAGES = [
  { label: 'Technical Screening', score: 82, color: '#4ade80' },
  { label: 'System Design', score: 71, color: '#60a5fa' },
  { label: 'Behavioral', score: 85, color: '#4ade80' },
];

const TIER_ORDER = ['strong_no_hire', 'no_hire', 'lean_hire', 'hire', 'strong_hire'] as const;
const ACTIVE_TIER_INDEX = 3; // "hire" lights up

const ScoringSection: React.FC = () => {
  const scoreRef = useRef<HTMLDivElement>(null);
  const scoreInView = useInView(scoreRef, { once: true, margin: '-100px' });
  const overallScore = useCountUp(78, scoreInView);
  const stage1 = useCountUp(82, scoreInView, 1.8);
  const stage2 = useCountUp(71, scoreInView, 1.8);
  const stage3 = useCountUp(85, scoreInView, 1.8);
  const stageDisplays = [stage1, stage2, stage3];

  return (
    <section className="section-spacing px-6">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="font-mono text-xs uppercase tracking-[0.3em] text-primary">Evaluation</span>
          <h2 className="text-serif text-4xl md:text-5xl font-light text-textMain mt-4">
            AI-powered, stage-by-stage scoring.
          </h2>
        </motion.div>

        {/* Pipeline strip */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="bento-card p-6 mb-6 overflow-x-auto"
        >
          <h4 className="font-mono text-xs uppercase tracking-[0.2em] text-textDim mb-5">Evaluation Pipeline</h4>
          <div className="flex items-center gap-2 min-w-max">
            {PIPELINE_STEPS.map((step, i) => (
              <React.Fragment key={step}>
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1, duration: 0.4 }}
                  className="px-4 py-2.5 rounded-xl bg-background/60 border border-white/[0.06] text-xs font-medium text-gray-300 whitespace-nowrap"
                >
                  {step}
                </motion.div>
                {i < PIPELINE_STEPS.length - 1 && (
                  <ArrowRight size={14} className="text-textDim shrink-0" />
                )}
              </React.Fragment>
            ))}
          </div>
        </motion.div>

        <div ref={scoreRef} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Score ring with count-up */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="bento-card p-8 flex flex-col items-center justify-center"
          >
            <div className="relative w-40 h-40 mb-6">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
                <motion.circle
                  cx="60" cy="60" r="52" fill="none"
                  stroke="#60a5fa" strokeWidth="8" strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 52}
                  initial={{ strokeDashoffset: 2 * Math.PI * 52 }}
                  animate={scoreInView ? { strokeDashoffset: 2 * Math.PI * 52 * (1 - 78 / 100) } : {}}
                  transition={{ duration: 1.5, ease: 'easeOut', delay: 0.3 }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-bold text-textMain tabular-nums">{overallScore}</span>
                <span className="text-[10px] uppercase tracking-wider text-textDim font-mono">Overall</span>
              </div>
            </div>

            {/* Stage bars with count-up scores */}
            <div className="w-full space-y-3">
              {EXAMPLE_STAGES.map((s, i) => (
                <div key={s.label}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-textMuted">{s.label}</span>
                    <span className="text-xs font-semibold tabular-nums" style={{ color: s.color }}>{stageDisplays[i]}</span>
                  </div>
                  <div className="h-1.5 bg-background rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={scoreInView ? { width: `${s.score}%` } : {}}
                      transition={{ duration: 0.9, delay: 0.5 + i * 0.1, ease: 'easeOut' }}
                      className="h-full rounded-full"
                      style={{ backgroundColor: s.color }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <p className="font-mono text-[10px] text-textDim mt-5 text-center">
              Calibrated: average candidate scores ~60. Scores grounded in specific candidate statements.
            </p>
          </motion.div>

          {/* Recommendation tiers with meter fill + integrity */}
          <div className="space-y-4">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1, duration: 0.6 }}
              className="bento-card p-6"
            >
              <h4 className="font-mono text-xs uppercase tracking-[0.2em] text-textDim mb-4">5 Recommendation Tiers</h4>
              <div className="space-y-2">
                {TIER_ORDER.map((key, i) => {
                  const meta = RECOMMENDATION_META[key];
                  const isActive = i <= ACTIVE_TIER_INDEX;
                  return (
                    <motion.div
                      key={key}
                      initial={{ opacity: 0.3 }}
                      animate={scoreInView ? { opacity: isActive ? 1 : 0.3 } : {}}
                      transition={{ delay: 0.8 + i * 0.12, duration: 0.4 }}
                      className="flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all"
                      style={{ backgroundColor: isActive ? `${meta.color}12` : 'transparent' }}
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0 transition-all"
                        style={{
                          backgroundColor: isActive ? meta.color : 'rgba(255,255,255,0.1)',
                          boxShadow: isActive ? `0 0 8px ${meta.color}40` : 'none',
                        }}
                      />
                      <span
                        className="text-sm font-medium transition-colors"
                        style={{ color: isActive ? meta.color : 'rgba(255,255,255,0.2)' }}
                      >
                        {meta.label}
                      </span>
                      {i === ACTIVE_TIER_INDEX && (
                        <motion.span
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={scoreInView ? { opacity: 1, scale: 1 } : {}}
                          transition={{ delay: 1.5, duration: 0.3 }}
                          className="ml-auto font-mono text-[10px] px-2 py-0.5 rounded-full border"
                          style={{ color: meta.color, borderColor: `${meta.color}40`, backgroundColor: `${meta.color}15` }}
                        >
                          MATCH
                        </motion.span>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="bento-card p-6"
            >
              <h4 className="font-mono text-xs uppercase tracking-[0.2em] text-textDim mb-4">Integrity Score Formula</h4>
              <div className="bg-background/60 rounded-xl border border-white/[0.04] p-4 font-mono text-sm text-gray-300 mb-4">
                <span className="text-primary">integrity</span> = 100 - <span className="text-textDim">SUM</span>(penalties)
              </div>
              <div className="flex items-center gap-4">
                {(['low', 'medium', 'high'] as const).map((sev) => (
                  <div key={sev} className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: SEVERITY_COLORS[sev] }} />
                    <span className="text-xs text-textMuted capitalize">{sev}</span>
                    <span className="font-mono text-xs text-textDim">-{PROCTOR_SEVERITY_PENALTY[sev]}pts</span>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-textDim mt-4 leading-relaxed">
                Integrity is scored separately from competency. AI-confirmed events are excluded from double-counting.
              </p>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
};

/* ═══════════════════ FOOTER CTA -- FLOATING PARTICLES ═══════════════════ */

const PARTICLES = [
  { x: '15%', y: '20%', size: 4, delay: 0, dur: 6 },
  { x: '75%', y: '30%', size: 3, delay: 1.5, dur: 8 },
  { x: '40%', y: '70%', size: 5, delay: 0.8, dur: 7 },
  { x: '85%', y: '65%', size: 3, delay: 2.2, dur: 9 },
  { x: '25%', y: '80%', size: 4, delay: 3, dur: 5 },
];

const FooterCTA: React.FC = () => {
  const navigate = useNavigate();

  return (
    <section className="section-spacing px-6">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
        >
          <div className="p-px rounded-2xl bg-gradient-to-r from-primary/50 via-accent/30 to-primary/50">
            <div className="rounded-2xl bg-background p-12 text-center relative overflow-hidden">
              {/* Floating particles */}
              {PARTICLES.map((p, i) => (
                <motion.div
                  key={i}
                  className="absolute rounded-full bg-primary/40"
                  style={{ left: p.x, top: p.y, width: p.size, height: p.size }}
                  animate={{
                    y: [0, -20, -10, -30, 0],
                    x: [0, 10, -5, 15, 0],
                    opacity: [0.2, 0.7, 0.4, 0.8, 0.2],
                  }}
                  transition={{
                    duration: p.dur,
                    repeat: Infinity,
                    delay: p.delay,
                    ease: 'easeInOut',
                  }}
                />
              ))}

              <h2 className="text-serif text-3xl md:text-4xl font-light text-textMain mb-4 relative z-10">
                Ready to run your first AI interview?
              </h2>
              <p className="text-textMuted mb-8 max-w-lg mx-auto relative z-10">
                Design a flow, launch a session, and get a full evaluation report — in under 10 minutes.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 relative z-10">
                <button
                  onClick={() => navigate('/flow')}
                  className="group inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-full bg-primary hover:bg-primaryDim text-white font-medium text-sm transition-all duration-200 shadow-[0_4px_24px_rgba(204,120,92,0.3)] hover:shadow-[0_4px_32px_rgba(204,120,92,0.45)] w-full sm:w-auto"
                >
                  Build a flow
                  <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
                </button>
                <button
                  onClick={() => navigate('/session')}
                  className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-full bg-white/[0.04] hover:bg-white/[0.08] text-textMain font-medium text-sm border border-white/[0.08] hover:border-white/[0.15] transition-all duration-200 w-full sm:w-auto"
                >
                  Start a session
                </button>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className="flex items-center justify-center gap-3 mt-10 mb-4"
        >
          {['Gemini Live', 'MediaPipe', 'Monaco Editor', 'React Flow'].map((tech, i) => (
            <React.Fragment key={tech}>
              <span className="font-mono text-[11px] text-textDim">{tech}</span>
              {i < 3 && <span className="text-textDim/30">&middot;</span>}
            </React.Fragment>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

/* ═══════════════════ MAIN DASHBOARD ═══════════════════ */

export const Dashboard: React.FC = () => (
  <div className="relative">
    <div className="absolute inset-0 bg-warm-grain opacity-30 pointer-events-none" />
    <HeroSection />
    <HowItWorks />
    <FlowBuilderSection />
    <LiveInterviewSection />
    <CheatingDetectionSection />
    <ScoringSection />
    <FooterCTA />
  </div>
);
