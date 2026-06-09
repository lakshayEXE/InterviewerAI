import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { X, Loader2, Sparkles, Upload } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '../ui/Button';
import { extractPdfText } from '../../utils/pdfParser';

interface GenerateFlowModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (jd: string, resume: string) => Promise<void>;
}

export const GenerateFlowModal: React.FC<GenerateFlowModalProps> = ({ isOpen, onClose, onGenerate }) => {
  const [jd, setJd] = useState('');
  const [resume, setResume] = useState('');
  const [loading, setLoading] = useState(false);
  const [isParsingResume, setIsParsingResume] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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
      setResume(text);
      toast.success(`Loaded ${file.name}`);
    } catch (err) {
      console.error('Resume parse failed', err);
      toast.error('Failed to read the PDF');
    } finally {
      setIsParsingResume(false);
    }
  };

  if (!isOpen) return null;

  const handleGenerate = async () => {
    if (!jd.trim()) return;
    setLoading(true);
    try {
      await onGenerate(jd, resume);
      onClose();
    } catch {
      // Error handled by parent
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-2xl mx-4 bg-surface border border-gray-800 rounded-2xl shadow-2xl overflow-hidden"
      >
        <div className="p-5 border-b border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-600/20 rounded-lg">
              <Sparkles size={20} className="text-purple-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Generate Interview Flow</h2>
              <p className="text-xs text-textMuted">Paste the JD and resume to auto-create stages</p>
            </div>
          </div>
          <button onClick={onClose} className="text-textMuted hover:text-white transition-colors p-2 rounded-full hover:bg-background">
            <X size={20} />
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
          <div>
            <label className="block text-sm font-semibold text-textMuted mb-2">Job Description *</label>
            <textarea
              value={jd}
              onChange={e => setJd(e.target.value)}
              className="w-full bg-background border border-gray-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all min-h-[150px] resize-none text-sm"
              placeholder="Paste the full job description here..."
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-semibold text-textMuted">Candidate Resume (optional)</label>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isParsingResume}
                className="flex items-center gap-1.5 text-xs font-semibold text-purple-400 hover:text-purple-300 disabled:opacity-50 transition-colors"
              >
                {isParsingResume ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
                {isParsingResume ? 'Reading…' : 'Upload PDF'}
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf,.pdf"
              className="hidden"
              onChange={e => handleResumeFile(e.target.files?.[0])}
            />
            <textarea
              value={resume}
              onChange={e => setResume(e.target.value)}
              onDragOver={e => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={e => {
                e.preventDefault();
                setIsDragging(false);
                handleResumeFile(e.dataTransfer.files?.[0]);
              }}
              className={`w-full bg-background border text-white rounded-xl px-4 py-3 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all min-h-[150px] resize-none text-sm ${
                isDragging ? 'border-purple-500 ring-1 ring-purple-500' : 'border-gray-700'
              }`}
              placeholder="Paste the candidate's resume text, or drag &amp; drop a PDF here…"
            />
          </div>
        </div>

        <div className="p-5 border-t border-gray-800 flex justify-end gap-3">
          <Button variant="secondary" size="md" onClick={onClose}>
            Cancel
          </Button>
          <button
            onClick={handleGenerate}
            disabled={loading || !jd.trim()}
            className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-all shadow-lg hover:shadow-purple-500/25 flex items-center gap-2"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
            {loading ? 'Generating...' : 'Generate Flow'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};
