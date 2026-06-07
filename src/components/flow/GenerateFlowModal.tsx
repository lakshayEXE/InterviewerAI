import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Loader2, Sparkles } from 'lucide-react';
import { Button } from '../ui/Button';

interface GenerateFlowModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (jd: string, resume: string) => Promise<void>;
}

export const GenerateFlowModal: React.FC<GenerateFlowModalProps> = ({ isOpen, onClose, onGenerate }) => {
  const [jd, setJd] = useState('');
  const [resume, setResume] = useState('');
  const [loading, setLoading] = useState(false);

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
            <label className="block text-sm font-semibold text-textMuted mb-2">Candidate Resume (optional)</label>
            <textarea
              value={resume}
              onChange={e => setResume(e.target.value)}
              className="w-full bg-background border border-gray-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all min-h-[150px] resize-none text-sm"
              placeholder="Paste the candidate's resume text here..."
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
