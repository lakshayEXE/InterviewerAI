import React, { useState, useEffect, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { PhoneCall, LogOut, Loader2, User, Code2, AlertTriangle, Maximize, Circle, Eye, EyeOff, Bot } from 'lucide-react';
import toast from 'react-hot-toast';
import { TranscriptSidebar } from '../components/TranscriptSidebar';
import { Visualizer } from '../components/Visualizer';
import { CodeEditor } from '../components/CodeEditor';
import { AudioRecorder } from '../services/AudioRecorder';
import { AudioPlayer } from '../services/AudioPlayer';
import { GeminiLiveService } from '../services/GeminiLiveService';
import { FaceProctor } from '../services/FaceProctor';
import { confirmFrame, isVisionBackedOff } from '../services/ProctorVisionService';
import { useInterviewStore } from '../store/useInterviewStore';
import { buildSystemPrompt } from '../utils/promptBuilder';
import { decodeSessionPayload } from '../utils/sessionPayload';
import type { Node } from 'reactflow';
import type { ProctorEventType, ProctorSource } from '../types/proctor';
import { PROCTOR_EVENT_META } from '../types/proctor';

const NUDGE_PHRASE: Partial<Record<ProctorEventType, string>> = {
  'looking-away': 'the candidate appeared to look away from the screen for several seconds',
  'no-face': 'the candidate may have stepped away from the camera',
};

// Map common language aliases from the model to the editor's supported language ids.
const LANGUAGE_ALIASES: Record<string, string> = {
  js: 'javascript', node: 'javascript', nodejs: 'javascript',
  ts: 'typescript',
  py: 'python', python3: 'python',
  'c++': 'cpp', cplusplus: 'cpp',
  golang: 'go',
};
const SUPPORTED_EDITOR_LANGUAGES = ['javascript', 'typescript', 'python', 'java', 'cpp', 'go', 'rust'];
function normalizeLanguage(language: string): string {
  const lower = (language || '').trim().toLowerCase();
  if (SUPPORTED_EDITOR_LANGUAGES.includes(lower)) return lower;
  return LANGUAGE_ALIASES[lower] || 'javascript';
}

// Sentence openers that signal an interviewer question/prompt even without a "?".
const QUESTION_STARTERS = /^(how|what|why|when|where|which|who|can|could|would|will|do|does|did|is|are|should|tell me|walk me|give me|describe|explain|write|implement|design|solve|build|create|compute|calculate|derive|prove|optimize|debug|find|return|given|suppose|consider|let'?s|imagine)\b/i;
const LEADING_FILLER = /^(so|now|okay|alright|right|and|well|ok),\s+/i;

// Pull just the (last) question out of an AI turn, stripping acknowledgments/feedback.
// Returns '' when the turn contains no detectable question, so callers can keep the
// previously pinned question on screen instead of replacing it with filler.
function extractLatestQuestion(text: string): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (!clean) return '';
  const sentences = clean.match(/[^.!?]+[.!?]*/g);
  if (!sentences) return '';

  let last = '';
  for (const raw of sentences) {
    const sentence = raw.trim();
    if (!sentence) continue;
    if (sentence.endsWith('?') || QUESTION_STARTERS.test(sentence)) {
      last = sentence;
    }
  }
  if (!last) return '';

  const cleaned = last.replace(LEADING_FILLER, '').trim();
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

const formatElapsed = (ms: number): string => {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
};
import { PageTransition } from '../components/ui/PageTransition';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { motion, AnimatePresence } from 'framer-motion';

export const Interviewer: React.FC = () => {
  const { sessionData } = useParams<{ sessionData: string }>();
  const location = useLocation();
  const navigate = useNavigate();

  const candidateName = location.state?.candidateName || 'Candidate';
  const apiKey = useInterviewStore(state => state.apiKey);
  const storeNodes = useInterviewStore(state => state.nodes);
  const companyInfo = useInterviewStore(state => state.companyInfo);
  const interviewerConfig = useInterviewStore(state => state.interviewerConfig);

  const resumeText = useInterviewStore(state => state.resumeText);
  const transcript = useInterviewStore(state => state.transcript);
  const addTranscriptItem = useInterviewStore(state => state.addTranscriptItem);
  const clearTranscript = useInterviewStore(state => state.clearTranscript);
  const setCandidateCode = useInterviewStore(state => state.setCandidateCode);
  const clearCandidateCode = useInterviewStore(state => state.clearCandidateCode);
  const setOriginalCode = useInterviewStore(state => state.setOriginalCode);
  const clearOriginalCode = useInterviewStore(state => state.clearOriginalCode);
  const setSessionActive = useInterviewStore(state => state.setSessionActive);
  const setEvaluation = useInterviewStore(state => state.setEvaluation);
  const setSessionNodes = useInterviewStore(state => state.setSessionNodes);
  const addProctorEvent = useInterviewStore(state => state.addProctorEvent);
  const clearProctorEvents = useInterviewStore(state => state.clearProctorEvents);
  const proctorEvents = useInterviewStore(state => state.proctorEvents);

  const [isConnected, setIsConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [micVolume, setMicVolume] = useState(0);
  const [aiVolume, setAiVolume] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showCodeEditor, setShowCodeEditor] = useState(false);
  const [alerts, setAlerts] = useState<{ id: string; label: string; severity: string }[]>([]);
  // Current question reported by the model via the set_current_question tool (authoritative).
  const [toolQuestion, setToolQuestion] = useState('');
  // Starter code the model loads into the editor via the set_editor_code tool (debug/optimize).
  const [injectedCode, setInjectedCode] = useState<string | undefined>(undefined);
  const [injectedLanguage, setInjectedLanguage] = useState<string | undefined>(undefined);

  const audioRecorderRef = useRef<AudioRecorder | null>(null);
  const audioPlayerRef = useRef<AudioPlayer | null>(null);
  const geminiServiceRef = useRef<GeminiLiveService | null>(null);
  const sessionStartRef = useRef<number | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const faceProctorRef = useRef<FaceProctor | null>(null);
  const lastNudgeRef = useRef<number>(0);
  const lastEscalationRef = useRef<number>(0);

  const session = React.useMemo(() => {
    if (sessionData) {
      const decoded = decodeSessionPayload(sessionData);
      if (decoded) {
        return {
          nodes: decoded.nodes,
          config: decoded.config ?? interviewerConfig,
          companyInfo: decoded.companyInfo ?? companyInfo,
        };
      }
    }
    return { nodes: storeNodes, config: interviewerConfig, companyInfo };
  }, [sessionData, storeNodes, interviewerConfig, companyInfo]);

  const activeNodes: Node[] = session.nodes;

  const pid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  const captureFrame = (): string | null => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0) return null;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0);
    return canvas.toDataURL('image/jpeg', 0.6).split(',')[1] || null;
  };

  const reportProctorEvent = React.useCallback((type: ProctorEventType, source: ProctorSource) => {
    const meta = PROCTOR_EVENT_META[type];
    const id = pid();

    addProctorEvent({
      id,
      type,
      severity: meta.severity,
      source,
      message: meta.label,
      timestamp: Date.now(),
    });

    // Transient on-screen banner
    setAlerts(prev => [...prev, { id, label: meta.label, severity: meta.severity }]);
    setTimeout(() => setAlerts(prev => prev.filter(a => a.id !== id)), 4000);

    // Casual, rate-limited verbal check-in for soft/ambiguous events
    if (meta.soft) {
      const now = Date.now();
      if (now - lastNudgeRef.current > 30000) {
        lastNudgeRef.current = now;
        geminiServiceRef.current?.sendProctorNudge(NUDGE_PHRASE[type] ?? 'the candidate may be distracted');
      }
    }

    // Cost-controlled Gemini snapshot confirmation for ML-flagged events.
    // Vision is "nice to have" — the ML event itself is already stored in the
    // integrity report. Keep the cadence loose to stay well under free-tier quota.
    if (source === 'ml' && (meta.severity === 'medium' || meta.severity === 'high')) {
      const now = Date.now();
      const VISION_INTERVAL_MS = 90_000;
      if (now - lastEscalationRef.current > VISION_INTERVAL_MS && !isVisionBackedOff()) {
        lastEscalationRef.current = now;
        const key = useInterviewStore.getState().apiKey;
        const jpeg = captureFrame();
        if (key && jpeg) {
          confirmFrame(key, jpeg, type).then(({ confirmed, note }) => {
            if (confirmed) {
              addProctorEvent({
                id: pid(),
                type,
                severity: meta.severity,
                source: 'gemini',
                message: note || `Confirmed: ${meta.label}`,
                timestamp: Date.now(),
                confirmed: true,
              });
            }
          });
        }
      }
    }
  }, [addProctorEvent]);

  const startProctoring = async () => {
    // Camera is best-effort: if it fails, the session still runs with behavioral signals only.
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      cameraStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }

      faceProctorRef.current = new FaceProctor();
      faceProctorRef.current.onEvent = (type) => reportProctorEvent(type, 'ml');
      faceProctorRef.current.onError = () => {
        toast('Face monitoring unavailable on this device', { icon: '⚠️' });
      };
      if (videoRef.current) {
        faceProctorRef.current.start(videoRef.current);
      }
    } catch {
      toast('Camera off — proctoring will use activity signals only', { icon: '📷' });
    }

    // Multi-monitor check (Window Management API, where supported)
    try {
      const screenApi = window as unknown as { getScreenDetails?: () => Promise<{ screens?: unknown[] }> };
      if (screenApi.getScreenDetails) {
        const details = await screenApi.getScreenDetails();
        if ((details?.screens?.length ?? 0) > 1) reportProctorEvent('multi-monitor', 'behavioral');
      }
    } catch {
      // permission denied / unsupported — ignore
    }
  };

  const stopProctoring = () => {
    faceProctorRef.current?.stop();
    faceProctorRef.current = null;
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach(t => t.stop());
      cameraStreamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
  };

  // Track fullscreen state
  useEffect(() => {
    const handleFullscreenChange = () => {
      const inFullscreen = !!document.fullscreenElement;
      setIsFullscreen(inFullscreen);

      if (!inFullscreen && isRecording) {
        reportProctorEvent('fullscreen-exit', 'behavioral');
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, [isRecording, reportProctorEvent]);

  // Anti-Cheat: tab visibility + window focus
  useEffect(() => {
    if (!isRecording) return;

    const handleVisibilityChange = () => {
      if (document.hidden) reportProctorEvent('tab-hidden', 'behavioral');
    };
    const handleBlur = () => reportProctorEvent('window-blur', 'behavioral');

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleBlur);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleBlur);
    };
  }, [isRecording, reportProctorEvent]);

  const enterFullscreen = async () => {
    try {
      // Request mic permission NOW while in windowed mode (prompt can display properly).
      // This prevents the deadlock that occurs when getUserMedia shows a prompt in fullscreen.
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(t => t.stop());

      await document.documentElement.requestFullscreen();
    } catch (err: any) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        toast.error("Microphone permission is required for the interview.");
      } else {
        toast.error("Could not enter fullscreen.");
      }
    }
  };

  useEffect(() => {
    clearTranscript();
    clearProctorEvents();
    clearCandidateCode();
    clearOriginalCode();
    setEvaluation(null);
    setToolQuestion('');
    setInjectedCode(undefined);
    setInjectedLanguage(undefined);

    if (apiKey) {
      geminiServiceRef.current = new GeminiLiveService(apiKey);
      audioPlayerRef.current = new AudioPlayer();

      geminiServiceRef.current.onConnectionStateChange = (connected) => {
        setIsConnected(connected);
        if (connected) toast.success('Connected to Gemini Live API');
        else toast.error('Disconnected');
      };

      geminiServiceRef.current.onAudioData = (base64) => {
        audioPlayerRef.current?.playChunk(base64);
      };

      geminiServiceRef.current.onTranscript = (sender, text) => {
        const clean = text.trim();
        if (!clean) return;
        addTranscriptItem({
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          sender,
          text: clean,
          timestamp: Date.now(),
        });
      };

      geminiServiceRef.current.onQuestion = (question) => {
        setToolQuestion(question);
      };

      geminiServiceRef.current.onEditorCode = (code, language) => {
        const normalized = normalizeLanguage(language);
        setInjectedCode(code);
        setInjectedLanguage(normalized);
        setOriginalCode(code, normalized);
        setShowCodeEditor(true);
      };
    }

    return () => {
      audioRecorderRef.current?.stop();
      audioPlayerRef.current?.stop();
      geminiServiceRef.current?.disconnect();
      stopProctoring();
      setSessionActive(false);
    };
  }, [apiKey]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (audioRecorderRef.current) {
        setMicVolume(audioRecorderRef.current.getVolume());
      }
      if (audioPlayerRef.current) {
        setAiVolume(audioPlayerRef.current.getVolume());
      }
    }, 50);
    return () => clearInterval(interval);
  }, []);

  // Elapsed-time ticker: runs only while the session is live
  useEffect(() => {
    if (!isRecording) return;
    const tick = () => {
      if (sessionStartRef.current) {
        setElapsedMs(Date.now() - sessionStartRef.current);
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [isRecording]);

  // Removed auto-start useEffect to respect browser AudioContext user gesture policies.
  // The user must explicitly click the Call button to begin.

  const startCall = async () => {
    if (!apiKey) {
      toast.error('Missing API Key. Please configure it in settings.');
      return;
    }
    try {
      if (!geminiServiceRef.current) return;

      // Clean up any existing instances
      audioRecorderRef.current?.stop();
      audioPlayerRef.current?.stop();

      audioPlayerRef.current?.init();

      audioRecorderRef.current = new AudioRecorder((base64) => {
        geminiServiceRef.current?.sendAudio(base64);
      });

      await audioRecorderRef.current.start();
      setIsRecording(true);
      setSessionActive(true);
      sessionStartRef.current = Date.now();
      setElapsedMs(0);

      const systemPrompt = buildSystemPrompt(activeNodes, candidateName, session.companyInfo, session.config, resumeText);
      clearTranscript();
      setEvaluation(null);
      clearProctorEvents();
      clearCandidateCode();
      clearOriginalCode();
      setToolQuestion('');
      setInjectedCode(undefined);
      setInjectedLanguage(undefined);
      setSessionNodes(activeNodes);
      geminiServiceRef.current.connect(systemPrompt, {
        voiceName: session.config.voiceName,
        languageCode: session.config.languageCode,
      });

      startProctoring();

    } catch (err) {
      toast.error("Microphone Denied or failed to start call.");
      console.error("Failed to start call", err);
      audioRecorderRef.current?.stop();
      geminiServiceRef.current?.disconnect();
      setIsRecording(false);
      setSessionActive(false);
    }
  };

  const endCall = () => {
    if (isRecording) {
      audioRecorderRef.current?.stop();
      audioPlayerRef.current?.stop();
      geminiServiceRef.current?.disconnect();
      stopProctoring();
      setIsRecording(false);
      toast('Call ended', { icon: '📞' });
    }
    setSessionActive(false);
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(console.warn);
    }
    navigate('/evaluation');
  };

  const toggleCall = () => {
    if (isRecording) endCall();
    else startCall();
  };

  const handleCodeChange = React.useCallback((code: string, lang: string) => {
    geminiServiceRef.current?.sendCodeContext(code, lang);
    setCandidateCode(code, lang);
  }, [setCandidateCode]);

  const handlePaste = React.useCallback((length: number) => {
    // Ignore trivial pastes; flag meaningful chunks of code.
    if (length >= 40) reportProctorEvent('paste', 'behavioral');
  }, [reportProctorEvent]);

  // Conversational state machine
  type SpeakerState = 'speaking' | 'listening' | 'your-turn' | 'thinking';
  const VOL_THRESHOLD = 5;
  const speakerState: SpeakerState = (() => {
    if (aiVolume > VOL_THRESHOLD && aiVolume >= micVolume) return 'speaking';
    if (micVolume > VOL_THRESHOLD) return 'listening';
    const last = transcript[transcript.length - 1];
    if (!last) return 'thinking';
    return last.sender === 'ai' ? 'your-turn' : 'thinking';
  })();
  const speakerMeta: Record<SpeakerState, { label: string; dot: string; ring: string; text: string }> = {
    speaking:  { label: 'AI speaking',  dot: 'bg-primary',   ring: 'bg-primary',   text: 'text-textMain' },
    listening: { label: 'Listening',    dot: 'bg-sky-400',   ring: 'bg-sky-400',   text: 'text-textMain' },
    'your-turn': { label: 'Your turn',  dot: 'bg-emerald-400', ring: 'bg-emerald-400', text: 'text-textMain' },
    thinking:  { label: 'Thinking…',    dot: 'bg-amber-400', ring: 'bg-amber-400', text: 'text-textMuted' },
  };

  // Heuristic fallback: scan backward for the last AI turn that contains a detectable
  // question. Used only until the model reports a question via the set_current_question tool.
  const heuristicQuestion = React.useMemo(() => {
    for (let i = transcript.length - 1; i >= 0; i--) {
      const item = transcript[i];
      if (item.sender !== 'ai') continue;
      const question = extractLatestQuestion(item.text);
      if (question) return question;
    }
    return '';
  }, [transcript]);

  // Prefer the authoritative tool-reported question; fall back to the heuristic when the
  // model hasn't called the tool yet. Shown above the IDE so the candidate can re-read it.
  const currentQuestion = toolQuestion || heuristicQuestion;
  const speaker = speakerMeta[speakerState];

  // Face health: warn if a recent ML event (no-face/looking-away) was raised
  type FaceHealth = 'ok' | 'warn';
  const [faceHealth, setFaceHealth] = useState<FaceHealth>('ok');
  useEffect(() => {
    const compute = () => {
      const now = Date.now();
      const warn = proctorEvents.some(
        e => e.source === 'ml'
          && (e.type === 'no-face' || e.type === 'looking-away')
          && now - e.timestamp < 6000
      );
      setFaceHealth(warn ? 'warn' : 'ok');
    };
    compute();
    const id = setInterval(compute, 1000);
    return () => clearInterval(id);
  }, [proctorEvents]);

  return (
    <PageTransition className="flex w-full h-full">
      <div className="flex-1 flex flex-col pt-20 px-6 pb-6 gap-6 relative">
        {/* Ambient slow-drifting gradient backdrop */}
        <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
          <motion.div
            aria-hidden
            className="absolute -top-32 -left-32 w-[520px] h-[520px] rounded-full"
            style={{
              background: 'radial-gradient(circle at center, rgba(56, 189, 248, 0.18), rgba(56, 189, 248, 0) 65%)',
              filter: 'blur(40px)',
            }}
            animate={{ x: [0, 80, -40, 0], y: [0, 60, 30, 0] }}
            transition={{ duration: 38, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            aria-hidden
            className="absolute -bottom-40 -right-32 w-[560px] h-[560px] rounded-full"
            style={{
              background: 'radial-gradient(circle at center, rgba(167, 139, 250, 0.16), rgba(167, 139, 250, 0) 65%)',
              filter: 'blur(50px)',
            }}
            animate={{ x: [0, -70, 30, 0], y: [0, -50, -20, 0] }}
            transition={{ duration: 46, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            aria-hidden
            className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[420px] h-[420px] rounded-full"
            style={{
              background: 'radial-gradient(circle at center, rgba(74, 222, 128, 0.10), rgba(74, 222, 128, 0) 65%)',
              filter: 'blur(60px)',
            }}
            animate={{ x: [-30, 30, -10, -30], y: [-20, 20, 0, -20] }}
            transition={{ duration: 52, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>

        <Card className="!p-4 z-10 shrink-0 relative">
          <div className="flex items-center justify-between gap-4">
            {/* LEFT: status + identity */}
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-[0.14em] border shrink-0 ${
                  isConnected
                    ? 'bg-primary/10 text-primary border-primary/25'
                    : isRecording
                    ? 'bg-amber-400/10 text-amber-400 border-amber-400/25'
                    : 'bg-red-500/10 text-red-400 border-red-500/25'
                }`}
              >
                <span className="relative flex h-1.5 w-1.5">
                  <span
                    className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                      isConnected ? 'bg-primary' : isRecording ? 'bg-amber-400' : 'bg-red-500'
                    }`}
                  />
                  <span
                    className={`relative inline-flex rounded-full h-1.5 w-1.5 ${
                      isConnected ? 'bg-primary' : isRecording ? 'bg-amber-400' : 'bg-red-500'
                    }`}
                  />
                </span>
                {isConnected ? 'Live' : isRecording ? 'Connecting' : 'Offline'}
              </div>

              <div className="shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-primary/25 to-accent/25 border border-white/10 flex items-center justify-center text-sm font-bold text-white shadow-inner">
                {(candidateName || 'C').charAt(0).toUpperCase()}
              </div>

              <div className="min-w-0">
                <div className="text-base font-bold text-white truncate leading-tight">
                  {candidateName || 'Candidate'}
                </div>
                <div className="text-[11px] text-textMuted font-medium flex items-center gap-1.5 mt-0.5">
                  <User size={11} />
                  <span>{activeNodes.length}-stage interview</span>
                  {session.companyInfo?.name && (
                    <>
                      <span className="text-white/15">•</span>
                      <span className="truncate">{session.companyInfo.name}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* CENTER: elapsed timer (only while live) */}
            <div className="hidden md:flex flex-col items-center px-5 border-l border-r border-white/[0.06] self-stretch justify-center min-w-[110px]">
              <span className="text-[9px] text-textMuted uppercase tracking-[0.22em] font-semibold">
                {isRecording ? 'Elapsed' : 'Ready'}
              </span>
              <span
                className={`text-2xl font-mono font-semibold tabular-nums tracking-tight leading-tight ${
                  isRecording ? 'text-white' : 'text-textMuted/60'
                }`}
              >
                {isRecording ? formatElapsed(elapsedMs) : '00:00'}
              </span>
            </div>

            {/* RIGHT: actions */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => setShowCodeEditor(!showCodeEditor)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-textMain hover:text-white bg-surface/60 hover:bg-surfaceHighlight border border-white/[0.06] hover:border-white/15 transition-all"
              >
                <Code2 size={15} />
                <span className="hidden sm:inline">{showCodeEditor ? 'Hide IDE' : 'Show IDE'}</span>
              </button>
              <button
                type="button"
                onClick={endCall}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-red-400/80 hover:text-red-300 hover:bg-red-500/10 border border-transparent hover:border-red-500/25 transition-all"
              >
                <LogOut size={15} />
                <span className="hidden sm:inline">End session</span>
              </button>
            </div>
          </div>

          {/* Subtle elapsed-time progress strip (assumes ~5 min per stage as a soft target) */}
          {isRecording && (
            <div className="absolute -bottom-4 -left-4 -right-4 h-[2px] bg-white/[0.04]">
              <motion.div
                className="h-full bg-gradient-to-r from-primary via-accent to-sky-400"
                initial={{ width: 0 }}
                animate={{
                  width: `${Math.min(100, (elapsedMs / Math.max(1, activeNodes.length * 5 * 60 * 1000)) * 100)}%`,
                }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
              />
            </div>
          )}
        </Card>

        {alerts.length > 0 && (
          <div className="absolute top-24 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 pointer-events-none">
            <AnimatePresence>
              {alerts.map((alert) => {
                const isHigh = alert.severity === 'high';
                return (
                  <motion.div
                    key={alert.id}
                    initial={{ opacity: 0, y: -20, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className={`text-white px-5 py-3 rounded-xl font-semibold flex items-center gap-3 backdrop-blur-md border ${
                      isHigh
                        ? 'bg-red-500/90 border-red-400 shadow-[0_0_30px_rgba(239,68,68,0.4)]'
                        : 'bg-amber-500/90 border-amber-400 shadow-[0_0_30px_rgba(245,158,11,0.35)]'
                    }`}
                  >
                    <AlertTriangle size={18} className="animate-pulse" />
                    {alert.label}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}

        <div className="flex-1 relative flex gap-6 overflow-hidden">
          <AnimatePresence>
            {showCodeEditor && (
              <motion.div
                initial={{ opacity: 0, x: 20, width: 0 }}
                animate={{ opacity: 1, x: 0, width: '100%' }}
                exit={{ opacity: 0, x: 20, width: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="h-full origin-right flex-1 flex flex-col gap-3 min-w-0"
              >
                {currentQuestion && (
                  <div className="shrink-0 rounded-2xl border border-primary/20 bg-surface/80 backdrop-blur-sm px-4 py-3 shadow-lg">
                    <div className="flex items-center gap-2 mb-1.5">
                      <Bot size={14} className="text-primary shrink-0" />
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-primary">Current question</span>
                    </div>
                    <p className="text-sm leading-relaxed text-textMain/90 max-h-24 overflow-y-auto">
                      {currentQuestion}
                    </p>
                  </div>
                )}
                <div className="flex-1 min-h-0 rounded-3xl overflow-hidden shadow-2xl">
                  <CodeEditor onCodeChange={handleCodeChange} onPaste={handlePaste} injectedCode={injectedCode} injectedLanguage={injectedLanguage} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.div
            layout
            className={
              showCodeEditor
                ? "absolute bottom-8 right-8 w-80 h-56 z-50 rounded-3xl border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden bg-surface/90 backdrop-blur-xl"
                : "flex-1 relative flex items-center justify-center bg-surface/30 rounded-3xl border border-white/[0.06] overflow-hidden"
            }
            transition={{ type: "spring", bounce: 0.1, duration: 0.6 }}
          >
            {/* Audio-reactive aura: softly breathes with the AI's voice */}
            {!showCodeEditor && (
              <div
                className="pointer-events-none absolute inset-0 flex items-center justify-center transition-opacity duration-200"
                style={{ opacity: 0.35 + Math.min(0.55, aiVolume * 0.012) }}
              >
                <div
                  className="rounded-full transition-[width,height,filter] duration-200"
                  style={{
                    width: `${340 + Math.min(140, aiVolume * 2.4)}px`,
                    height: `${340 + Math.min(140, aiVolume * 2.4)}px`,
                    background: 'radial-gradient(circle at center, rgba(56, 189, 248, 0.35), rgba(56, 189, 248, 0) 70%)',
                    filter: `blur(${36 + Math.min(28, aiVolume * 0.5)}px)`,
                  }}
                />
              </div>
            )}

            <Visualizer micVolume={micVolume} aiVolume={aiVolume} />

            {/* Conversational state pill (full-size only) */}
            {!showCodeEditor && isConnected && isRecording && (
              <AnimatePresence mode="wait">
                <motion.div
                  key={speakerState}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.2 }}
                  className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2.5 px-4 py-2 rounded-full glass-panel"
                >
                  <span className="relative flex h-2 w-2">
                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${speaker.ring}`} />
                    <span className={`relative inline-flex rounded-full h-2 w-2 ${speaker.dot}`} />
                  </span>
                  <span className={`text-sm font-medium ${speaker.text}`}>
                    {speaker.label}
                  </span>
                </motion.div>
              </AnimatePresence>
            )}

            {!isConnected && isRecording && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm z-20">
                <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
                <p className="text-textMain font-medium">Connecting to Gemini...</p>
              </div>
            )}
          </motion.div>
        </div>

        {/* Self-view PiP (kept mounted so the face detector always has a video element) */}
        <div className={`absolute bottom-6 left-6 z-40 transition-opacity duration-300 ${isRecording ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
          <div className="relative">
            {/* Mic-reactive accent ring: scales softly with the candidate's voice */}
            <div
              className="absolute -inset-1 rounded-[1.75rem] pointer-events-none transition-[box-shadow,opacity] duration-150"
              style={{
                boxShadow: `0 0 ${Math.min(40, micVolume * 0.8)}px ${Math.min(8, micVolume * 0.18)}px rgba(56, 189, 248, ${Math.min(0.55, micVolume * 0.012)})`,
                opacity: micVolume > 2 ? 1 : 0,
              }}
            />
            <div className="relative w-52 h-36 rounded-3xl overflow-hidden border border-white/10 shadow-[0_10px_40px_rgba(0,0,0,0.55)] bg-black/60">
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover -scale-x-100" />

              {/* REC chip */}
              <span className="absolute top-2 left-2 inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full bg-black/55 text-white backdrop-blur-md border border-white/10">
                <Circle size={8} className="fill-red-500 text-red-500 animate-pulse" />
                REC
              </span>

              {/* Face-detection health dot */}
              <span
                className="absolute top-2 right-2 inline-flex items-center gap-1.5 text-[10px] font-semibold px-2 py-1 rounded-full bg-black/55 backdrop-blur-md border border-white/10"
                style={{ color: faceHealth === 'ok' ? '#4ade80' : '#fbbf24' }}
                title={faceHealth === 'ok' ? 'Face detected' : 'Face not visible'}
              >
                {faceHealth === 'ok' ? (
                  <>
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
                    </span>
                    <Eye size={10} />
                  </>
                ) : (
                  <>
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-400" />
                    </span>
                    <EyeOff size={10} />
                  </>
                )}
              </span>

              {/* Bottom gradient + label */}
              <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-black/70 to-transparent pointer-events-none" />
              <span className="absolute bottom-1.5 left-2 text-[10px] font-medium text-white/80 tracking-wide">
                You
              </span>
            </div>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {!isRecording && !isFullscreen && (
            <motion.div
              key="fullscreen-prompt"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3 z-30"
            >
              <p className="text-sm text-textMuted">Enter fullscreen to begin the interview</p>
              <Button
                size="lg"
                onClick={enterFullscreen}
                className="!px-8 !py-4 !rounded-full"
              >
                <Maximize size={22} className="text-white mr-2" />
                <span className="text-white font-semibold">Enter Fullscreen</span>
              </Button>
            </motion.div>
          )}
          {!isRecording && isFullscreen && (
            <motion.div
              key="call-prompt"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3 z-30"
            >
              <p className="text-sm text-textMuted">Ready — start the interview call</p>
              <Button
                size="lg"
                onClick={toggleCall}
                disabled={!apiKey}
                className="!p-6 !rounded-full"
              >
                <PhoneCall size={32} className="text-white" />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <AnimatePresence>
        {!showCodeEditor && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 320, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ type: "spring", bounce: 0, duration: 0.4 }}
            className="shrink-0 h-full bg-background/50 backdrop-blur-md overflow-hidden"
          >
            <div className="w-80 h-full">
              <TranscriptSidebar transcript={transcript} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </PageTransition>
  );
};
