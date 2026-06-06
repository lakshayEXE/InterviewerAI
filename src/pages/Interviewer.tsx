import React, { useState, useEffect, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { PhoneCall, LogOut, Loader2, User, Code2, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { TranscriptSidebar } from '../components/TranscriptSidebar';
import { Visualizer } from '../components/Visualizer';
import { CodeEditor } from '../components/CodeEditor';
import { AudioRecorder } from '../services/AudioRecorder';
import { AudioPlayer } from '../services/AudioPlayer';
import { GeminiLiveService } from '../services/GeminiLiveService';
import { useInterviewStore } from '../store/useInterviewStore';
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
  
  const transcript = useInterviewStore(state => state.transcript);
  const addTranscriptItem = useInterviewStore(state => state.addTranscriptItem);
  const clearTranscript = useInterviewStore(state => state.clearTranscript);

  const [isConnected, setIsConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [micVolume, setMicVolume] = useState(0);
  const [aiVolume, setAiVolume] = useState(0);

  const [showCodeEditor, setShowCodeEditor] = useState(false);
  const [strikes, setStrikes] = useState<string[]>([]);

  const audioRecorderRef = useRef<AudioRecorder | null>(null);
  const audioPlayerRef = useRef<AudioPlayer | null>(null);
  const geminiServiceRef = useRef<GeminiLiveService | null>(null);

  let activeNodes: Node[] = storeNodes;
  if (sessionData) {
    try {
      activeNodes = JSON.parse(atob(sessionData));
    } catch (e) {
      console.error("Invalid session data in URL");
    }
  }

  // Anti-Cheat Mechanics
  useEffect(() => {
    if (!isRecording) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        setStrikes(prev => [...prev, `Tab switched away at ${new Date().toLocaleTimeString()}`]);
        toast.error("Anti-Cheat: Tab Switching Detected!");
      }
    };

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        setStrikes(prev => [...prev, `Exited fullscreen at ${new Date().toLocaleTimeString()}`]);
        toast.error("Anti-Cheat: Fullscreen Exited!");
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    document.addEventListener("fullscreenchange", handleFullscreenChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, [isRecording]);

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

      let currentAiText = '';
      geminiServiceRef.current.onTextContent = (text, isFinal) => {
        if (text) currentAiText += text;
        if (isFinal && currentAiText.trim()) {
          addTranscriptItem({ id: Date.now().toString(), sender: 'ai', text: currentAiText });
          currentAiText = '';
        }
      };
    }
    
    return () => {
      audioRecorderRef.current?.stop();
      audioPlayerRef.current?.stop();
      geminiServiceRef.current?.disconnect();
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

  useEffect(() => {
    if (sessionData && location.state?.candidateName && apiKey && !isRecording) {
      startCall();
    }
  }, [sessionData, location.state, apiKey]);

  const startCall = async () => {
    if (!apiKey) {
      toast.error('Missing API Key. Please configure it in settings.');
      return;
    }
    try {
      if (!geminiServiceRef.current) return;

      try {
        await document.documentElement.requestFullscreen();
      } catch (e) {
        console.warn("Fullscreen request failed", e);
      }
      
      audioPlayerRef.current?.init();
      clearTranscript();
      
      const flowInstructions = activeNodes.map((n, i) => `${i+1}. ${n.data.label}: ${n.data.description}`).join('\n');
      const systemPrompt = `You are an elite senior technical recruiter. The candidate's name is ${candidateName}. Greet them by name. Conduct the interview according to the following strict phases:\n\n${flowInstructions}\n\nStart immediately with phase 1. Be concise, interactive, and conversational.`;
      
      geminiServiceRef.current.connect(systemPrompt);

      audioRecorderRef.current = new AudioRecorder((base64) => {
        geminiServiceRef.current?.sendAudio(base64);
      });

      await audioRecorderRef.current.start();
      setIsRecording(true);
    } catch (err) {
      toast.error("Microphone Denied or failed to start call.");
      console.error("Failed to start call", err);
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
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(console.warn);
    }
    navigate('/evaluation');
  };

  const toggleCall = () => {
    if (isRecording) endCall();
    else startCall();
  };

  return (
    <PageTransition className="flex w-full h-full">
      <div className="flex-1 flex flex-col p-6 gap-6 relative">
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
                <span className="text-gray-700">|</span>
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
          <motion.div 
            layout
            className="flex-1 relative flex items-center justify-center bg-surfaceHighlight/30 rounded-3xl border border-gray-800/50 overflow-hidden"
          >
             <Visualizer micVolume={micVolume} aiVolume={aiVolume} />
             
             {!isConnected && isRecording && (
               <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm z-20">
                 <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
                 <p className="text-white font-medium">Connecting to Gemini...</p>
               </div>
             )}
          </motion.div>

          <AnimatePresence>
            {showCodeEditor && (
              <motion.div 
                initial={{ opacity: 0, x: 20, width: 0 }}
                animate={{ opacity: 1, x: 0, width: '50%' }}
                exit={{ opacity: 0, x: 20, width: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="h-full rounded-3xl overflow-hidden shadow-2xl origin-right"
              >
                <CodeEditor onCodeChange={(code, lang) => geminiServiceRef.current?.sendCodeContext(code, lang)} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <AnimatePresence>
          {!isRecording && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="absolute bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-6 z-30"
            >
              <Button
                size="lg"
                onClick={toggleCall}
                disabled={!apiKey}
                className="!p-6 !rounded-full shadow-[0_0_40px_rgba(74,222,128,0.4)] hover:shadow-[0_0_60px_rgba(74,222,128,0.6)]"
              >
                <PhoneCall size={32} className="text-black" />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      <div className="w-80 shrink-0 h-full border-l border-gray-800 bg-background/50 backdrop-blur-md">
        <TranscriptSidebar transcript={transcript} />
      </div>
    </PageTransition>
  );
};
