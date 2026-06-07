import React, { useState, useEffect, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { PhoneCall, LogOut, Loader2, User, Code2, AlertTriangle, Maximize } from 'lucide-react';
import toast from 'react-hot-toast';
import { TranscriptSidebar } from '../components/TranscriptSidebar';
import { Visualizer } from '../components/Visualizer';
import { CodeEditor } from '../components/CodeEditor';
import { AudioRecorder } from '../services/AudioRecorder';
import { AudioPlayer } from '../services/AudioPlayer';
import { GeminiLiveService } from '../services/GeminiLiveService';
import { FaceProctor } from '../services/FaceProctor';
import { confirmFrame } from '../services/ProctorVisionService';
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

  const transcript = useInterviewStore(state => state.transcript);
  const addTranscriptItem = useInterviewStore(state => state.addTranscriptItem);
  const clearTranscript = useInterviewStore(state => state.clearTranscript);
  const setSessionActive = useInterviewStore(state => state.setSessionActive);
  const setEvaluation = useInterviewStore(state => state.setEvaluation);
  const setSessionNodes = useInterviewStore(state => state.setSessionNodes);
  const addProctorEvent = useInterviewStore(state => state.addProctorEvent);
  const clearProctorEvents = useInterviewStore(state => state.clearProctorEvents);

  const [isConnected, setIsConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [micVolume, setMicVolume] = useState(0);
  const [aiVolume, setAiVolume] = useState(0);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showCodeEditor, setShowCodeEditor] = useState(false);
  const [alerts, setAlerts] = useState<{ id: string; label: string; severity: string }[]>([]);

  const audioRecorderRef = useRef<AudioRecorder | null>(null);
  const audioPlayerRef = useRef<AudioPlayer | null>(null);
  const geminiServiceRef = useRef<GeminiLiveService | null>(null);
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

    // Cost-controlled Gemini snapshot confirmation for ML-flagged events
    if (source === 'ml' && (meta.severity === 'medium' || meta.severity === 'high')) {
      const now = Date.now();
      if (now - lastEscalationRef.current > 25000) {
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

      const systemPrompt = buildSystemPrompt(activeNodes, candidateName, session.companyInfo, session.config);
      clearTranscript();
      setEvaluation(null);
      clearProctorEvents();
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
  }, []);

  const handlePaste = React.useCallback((length: number) => {
    // Ignore trivial pastes; flag meaningful chunks of code.
    if (length >= 40) reportProctorEvent('paste', 'behavioral');
  }, [reportProctorEvent]);

  return (
    <PageTransition className="flex w-full h-full">
      <div className="flex-1 flex flex-col pt-20 px-6 pb-6 gap-6 relative">
        <Card className="!p-4 flex justify-between items-center z-10 shrink-0">
          <div className="flex items-center gap-4">
            <div className="relative flex h-3 w-3">
              {isConnected && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>}
              <span className={`relative inline-flex rounded-full h-3 w-3 ${isConnected ? 'bg-primary' : 'bg-red-500'}`}></span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">
                Live Session
              </h1>
              <div className="text-xs text-textMuted font-medium flex items-center gap-2 mt-1">
                <User size={12} /> {candidateName}
                <span className="text-white/20">|</span>
                <span>{activeNodes.length} Stages</span>
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" size="sm" onClick={() => setShowCodeEditor(!showCodeEditor)}>
              <Code2 size={16} />
              <span className="hidden sm:inline">{showCodeEditor ? 'Hide IDE' : 'Show IDE'}</span>
            </Button>
            <Button variant="danger" size="sm" onClick={endCall}>
              <LogOut size={16} />
              <span className="hidden sm:inline">End Session</span>
            </Button>
          </div>
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
                className="h-full rounded-3xl overflow-hidden shadow-2xl origin-right flex-1"
              >
                <CodeEditor onCodeChange={handleCodeChange} onPaste={handlePaste} />
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
            <Visualizer micVolume={micVolume} aiVolume={aiVolume} />

            {/* Speaking-state label (full-size only) */}
            {!showCodeEditor && isConnected && isRecording && (
              <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2.5 px-4 py-2 rounded-full glass-panel">
                <span className="relative flex h-2 w-2">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${aiVolume >= micVolume ? 'bg-primary' : 'bg-sky-400'}`} />
                  <span className={`relative inline-flex rounded-full h-2 w-2 ${aiVolume >= micVolume ? 'bg-primary' : 'bg-sky-400'}`} />
                </span>
                <span className="text-sm font-medium text-textMain">
                  {aiVolume >= micVolume ? 'AI speaking' : 'Listening'}
                </span>
              </div>
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
          <div className="relative w-44 h-32 rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-black/60">
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover -scale-x-100" />
            <span className="absolute top-1.5 left-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-500/80 text-white flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> REC
            </span>
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
