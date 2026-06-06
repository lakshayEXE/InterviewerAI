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
  const speechRecognitionRef = useRef<any>(null);

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
      let textTimeout: number | null = null;
      
      geminiServiceRef.current.onTextContent = (text, isFinal) => {
        if (text) currentAiText += text;
        
        if (textTimeout) clearTimeout(textTimeout);
        
        if (isFinal) {
          if (currentAiText.trim()) {
            addTranscriptItem({ id: Date.now().toString(), sender: 'ai', text: currentAiText.trim() });
            currentAiText = '';
          }
        } else {
          textTimeout = setTimeout(() => {
            if (currentAiText.trim()) {
              addTranscriptItem({ id: Date.now().toString(), sender: 'ai', text: currentAiText.trim() });
              currentAiText = '';
            }
          }, 2000); // Save if AI pauses for 2s without sending turnComplete
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
      const systemPrompt = `You are an elite, highly rigorous senior technical interviewer. The candidate's name is ${candidateName}. Greet them briefly, then immediately start Phase 1.
      
INTERVIEW PHASES:
${flowInstructions}

CRITICAL BEHAVIORAL RULES:
1. DO NOT give away the answer under any circumstances.
2. If the candidate gives a wrong answer or writes buggy code, DO NOT say "That's right" or "Good job". Call out the flaw politely but firmly.
3. Cross-question the candidate. If they give an answer, ask "Why?" or probe deeper into their reasoning to make them think.
4. DO NOT give hints on their first attempt. Let them struggle and think. Only provide a tiny, abstract hint if they are completely stuck after multiple attempts.
5. Wait patiently for the candidate to finish speaking or typing code.
6. Keep your responses concise and focused exclusively on evaluating their technical skills.`;
      
      geminiServiceRef.current.connect(systemPrompt);

      audioRecorderRef.current = new AudioRecorder((base64) => {
        geminiServiceRef.current?.sendAudio(base64);
      });

      await audioRecorderRef.current.start();
      setIsRecording(true);

      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        speechRecognitionRef.current = new SpeechRecognition();
        speechRecognitionRef.current.continuous = true;
        speechRecognitionRef.current.interimResults = false;
        
        speechRecognitionRef.current.onresult = (event: any) => {
          let finalTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript;
            }
          }
          if (finalTranscript.trim()) {
            addTranscriptItem({ id: Date.now().toString(), sender: 'user', text: finalTranscript.trim() });
          }
        };

        speechRecognitionRef.current.onend = () => {
          if (audioRecorderRef.current) {
            try { speechRecognitionRef.current?.start(); } catch(e) {}
          }
        };

        try { speechRecognitionRef.current.start(); } catch(e) {}
      }
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
      if (speechRecognitionRef.current) {
        speechRecognitionRef.current.onend = null;
        try { speechRecognitionRef.current.stop(); } catch(e) {}
      }
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
          <AnimatePresence>
            {showCodeEditor && (
              <motion.div 
                initial={{ opacity: 0, x: 20, width: 0 }}
                animate={{ opacity: 1, x: 0, width: '100%' }}
                exit={{ opacity: 0, x: 20, width: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="h-full rounded-3xl overflow-hidden shadow-2xl origin-right flex-1"
              >
                <CodeEditor onCodeChange={(code, lang) => geminiServiceRef.current?.sendCodeContext(code, lang)} />
              </motion.div>
            )}
          </AnimatePresence>

          <motion.div 
            layout
            className={
              showCodeEditor 
                ? "absolute bottom-8 right-8 w-80 h-56 z-50 rounded-3xl border border-white/20 shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden bg-background/90 backdrop-blur-xl"
                : "flex-1 relative flex items-center justify-center bg-surfaceHighlight/30 rounded-3xl border border-gray-800/50 overflow-hidden"
            }
            transition={{ type: "spring", bounce: 0.1, duration: 0.6 }}
          >
             <Visualizer micVolume={micVolume} aiVolume={aiVolume} />
             
             {!isConnected && isRecording && (
               <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm z-20">
                 <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
                 <p className="text-white font-medium">Connecting to Gemini...</p>
               </div>
             )}
          </motion.div>
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
      <AnimatePresence>
        {!showCodeEditor && (
          <motion.div 
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 320, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ type: "spring", bounce: 0, duration: 0.4 }}
            className="shrink-0 h-full border-l border-gray-800 bg-background/50 backdrop-blur-md overflow-hidden"
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
