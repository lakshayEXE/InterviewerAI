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
import { useInterviewStore } from '../store/useInterviewStore';
import { buildSystemPrompt } from '../utils/promptBuilder';
import { decodeSessionPayload } from '../utils/sessionPayload';
import type { Node } from 'reactflow';
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

  const [isConnected, setIsConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [micVolume, setMicVolume] = useState(0);
  const [aiVolume, setAiVolume] = useState(0);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showCodeEditor, setShowCodeEditor] = useState(false);
  const [strikes, setStrikes] = useState<string[]>([]);

  const audioRecorderRef = useRef<AudioRecorder | null>(null);
  const audioPlayerRef = useRef<AudioPlayer | null>(null);
  const geminiServiceRef = useRef<GeminiLiveService | null>(null);

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

  // Track fullscreen state
  useEffect(() => {
    const handleFullscreenChange = () => {
      const inFullscreen = !!document.fullscreenElement;
      setIsFullscreen(inFullscreen);

      if (!inFullscreen && isRecording) {
        setStrikes(prev => [...prev, `Exited fullscreen at ${new Date().toLocaleTimeString()}`]);
        toast.error("Anti-Cheat: Fullscreen Exited!");
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, [isRecording]);

  // Anti-Cheat: tab visibility
  useEffect(() => {
    if (!isRecording) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        setStrikes(prev => [...prev, `Tab switched away at ${new Date().toLocaleTimeString()}`]);
        toast.error("Anti-Cheat: Tab Switching Detected!");
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [isRecording]);

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
      setSessionNodes(activeNodes);
      geminiServiceRef.current.connect(systemPrompt, {
        voiceName: session.config.voiceName,
        languageCode: session.config.languageCode,
      });

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

        {strikes.length > 0 && (
          <div className="absolute top-24 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 pointer-events-none">
            {strikes.map((strike, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: -20, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className="bg-red-500/90 text-white px-5 py-3 rounded-xl font-bold shadow-[0_0_30px_rgba(239,68,68,0.4)] flex items-center gap-3 backdrop-blur-md border border-red-400"
              >
                <AlertTriangle size={20} className="animate-pulse" />
                {strike}
              </motion.div>
            ))}
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
                <CodeEditor onCodeChange={handleCodeChange} />
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
