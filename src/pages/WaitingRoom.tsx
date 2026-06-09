import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FileText, Loader2, Mic, User, Video, VideoOff, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { PageTransition } from '../components/ui/PageTransition';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { motion, AnimatePresence } from 'framer-motion';
import { extractPdfText } from '../utils/pdfParser';
import { useInterviewStore } from '../store/useInterviewStore';

export const WaitingRoom: React.FC = () => {
  const { sessionData } = useParams<{ sessionData: string }>();
  const navigate = useNavigate();
  const setResumeText = useInterviewStore((state) => state.setResumeText);
  const clearResumeText = useInterviewStore((state) => state.clearResumeText);
  const [candidateName, setCandidateName] = useState('');
  const [micVolume, setMicVolume] = useState(0);
  const [hasMicPermission, setHasMicPermission] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState(false);
  const [resumeName, setResumeName] = useState<string | null>(null);
  const [isParsingResume, setIsParsingResume] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    let animationFrame: number;

    const initMic = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: { facingMode: 'user' } });
        streamRef.current = stream;
        setHasMicPermission(true);
        setHasCameraPermission(stream.getVideoTracks().length > 0);

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }

        const ctx = new window.AudioContext();
        audioContextRef.current = ctx;
        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        analyserRef.current = analyser;

        const updateVolume = () => {
          if (analyserRef.current) {
            const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
            analyserRef.current.getByteFrequencyData(dataArray);
            const sum = dataArray.reduce((a, b) => a + b, 0);
            setMicVolume(sum / dataArray.length);
          }
          animationFrame = requestAnimationFrame(updateVolume);
        };
        updateVolume();

      } catch (err) {
        toast.error("Camera & microphone permission denied. Please allow them to proceed.");
        console.error(err);
      }
    };

    initMic();

    return () => {
      cancelAnimationFrame(animationFrame);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  // Start each waiting-room visit with a clean slate so a previous candidate's
  // resume never leaks into a new session.
  useEffect(() => {
    clearResumeText();
  }, [clearResumeText]);

  const handleResumeFile = async (file: File | undefined) => {
    if (!file) return;
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      toast.error('Please upload a PDF file');
      return;
    }
    setIsParsingResume(true);
    try {
      const text = await extractPdfText(file);
      if (!text.trim()) {
        toast.error("Couldn't read any text from that PDF");
        return;
      }
      setResumeText(text);
      setResumeName(file.name);
      toast.success('Resume attached');
    } catch (err) {
      console.error('Resume parse failed', err);
      toast.error('Failed to read the PDF');
    } finally {
      setIsParsingResume(false);
    }
  };

  const removeResume = () => {
    clearResumeText();
    setResumeName(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleStart = () => {
    if (!candidateName.trim()) {
      toast.error('Please enter your name');
      return;
    }
    if (!hasMicPermission) {
      toast.error('Microphone permission required');
      return;
    }
    if (!hasCameraPermission) {
      toast.error('Camera permission required for this interview');
      return;
    }
    navigate(`/session/${sessionData}`, { state: { candidateName } });
  };

  return (
    <PageTransition className="flex items-center justify-center bg-background relative overflow-hidden">
      {/* Decorative breathing background */}
      <motion.div 
        animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.5, 0.3] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        className="absolute w-[800px] h-[800px] bg-primary/10 blur-[150px] rounded-full top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none" 
      />
      
      <Card hoverEffect className="z-10 w-full max-w-md !p-10 flex flex-col gap-10">
        <div className="text-center">
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", damping: 15 }}
            className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-6 text-primary border border-primary/30"
          >
            <Mic size={32} />
          </motion.div>
          <h1 className="text-3xl font-extrabold text-white mb-2">Join Interview</h1>
          <p className="text-textMuted text-sm">Please verify your hardware and enter your name before joining the session.</p>
        </div>

        <div className="space-y-6">
          <div className="bg-background p-3 rounded-2xl border border-gray-800 shadow-inner">
            <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-black/40">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover -scale-x-100"
              />
              {!hasCameraPermission && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-textMuted">
                  <VideoOff size={28} />
                  <span className="text-xs">Waiting for camera...</span>
                </div>
              )}
              <span className={`absolute top-2 right-2 text-[10px] font-bold px-2 py-1 rounded-md flex items-center gap-1 ${hasCameraPermission ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                <Video size={11} /> {hasCameraPermission ? 'Camera on' : 'Off'}
              </span>
            </div>
            <p className="text-[11px] text-textMuted mt-2 px-1 leading-relaxed">
              This interview is proctored. Your camera stays on for the session to monitor for academic integrity.
            </p>
          </div>

          <div className="bg-background p-5 rounded-2xl border border-gray-800 shadow-inner">
            <div className="flex justify-between items-center mb-4">
              <span className="text-sm font-semibold text-textMain flex items-center gap-2">
                Microphone
              </span>
              <span className={`text-xs font-bold px-2 py-1 rounded-md ${hasMicPermission ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                {hasMicPermission ? 'Connected' : 'Waiting...'}
              </span>
            </div>
            
            <div className="h-3 bg-surfaceHighlight rounded-full overflow-hidden relative shadow-inner">
              <motion.div 
                className="absolute left-0 top-0 h-full bg-gradient-to-r from-primaryDim to-primary"
                animate={{ width: `${Math.min(100, micVolume * 2)}%` }}
                transition={{ type: "tween", duration: 0.1 }}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-textMuted mb-2 pl-1">Your Full Name</label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-textMuted" size={20} />
              <input
                type="text"
                value={candidateName}
                onChange={(e) => setCandidateName(e.target.value)}
                placeholder="e.g. John Doe"
                className="w-full bg-background border border-gray-700 text-white font-medium rounded-xl py-4 pl-12 pr-4 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all shadow-inner"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-textMuted mb-2 pl-1">
              Resume <span className="font-normal text-textMuted/70">(optional, PDF)</span>
            </label>

            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf,.pdf"
              className="hidden"
              onChange={(e) => handleResumeFile(e.target.files?.[0])}
            />

            <AnimatePresence mode="wait">
              {resumeName ? (
                <motion.div
                  key="attached"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="flex items-center gap-3 bg-background border border-primary/40 rounded-xl py-3 px-4 shadow-inner"
                >
                  <FileText size={18} className="text-primary shrink-0" />
                  <span className="text-sm text-white font-medium truncate flex-1">{resumeName}</span>
                  <button
                    type="button"
                    onClick={removeResume}
                    className="text-textMuted hover:text-white transition-colors"
                    aria-label="Remove resume"
                  >
                    <X size={16} />
                  </button>
                </motion.div>
              ) : (
                <motion.button
                  key="dropzone"
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    handleResumeFile(e.dataTransfer.files?.[0]);
                  }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className={`w-full flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed py-6 px-4 transition-all shadow-inner ${
                    isDragging
                      ? 'border-primary bg-primary/10'
                      : 'border-gray-700 bg-background hover:border-primary/60'
                  }`}
                >
                  {isParsingResume ? (
                    <>
                      <Loader2 size={22} className="text-primary animate-spin" />
                      <span className="text-xs text-textMuted">Reading your resume…</span>
                    </>
                  ) : (
                    <>
                      <FileText size={22} className="text-textMuted" />
                      <span className="text-sm text-textMain font-medium">
                        Drag &amp; drop your resume here
                      </span>
                      <span className="text-[11px] text-textMuted">or click to browse · PDF only</span>
                    </>
                  )}
                </motion.button>
              )}
            </AnimatePresence>
            <p className="text-[11px] text-textMuted mt-2 px-1 leading-relaxed">
              Your resume stays in your browser and helps the interviewer ask personalized questions.
            </p>
          </div>
        </div>

        <Button
          variant="primary"
          size="lg"
          onClick={handleStart}
          disabled={!hasMicPermission || !hasCameraPermission || !candidateName.trim()}
          className="w-full shadow-primary/30"
        >
          Enter Waiting Room
        </Button>
      </Card>
    </PageTransition>
  );
};
