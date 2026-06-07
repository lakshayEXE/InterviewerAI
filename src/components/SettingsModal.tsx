import React, { useState, useEffect } from 'react';
import { Settings, X } from 'lucide-react';

interface SettingsModalProps {
  onSave: (apiKey: string) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ onSave }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [apiKey, setApiKey] = useState('');

  useEffect(() => {
    const storedKey = localStorage.getItem('GEMINI_API_KEY') || import.meta.env.VITE_GEMINI_API_KEY || '';
    setApiKey(storedKey);
    if (!storedKey) {
      setIsOpen(true);
    }
  }, []);

  const handleSave = () => {
    localStorage.setItem('GEMINI_API_KEY', apiKey);
    onSave(apiKey);
    setIsOpen(false);
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/[0.06] transition-colors group"
        title="Settings"
      >
        <Settings size={17} className="text-textMuted group-hover:text-textMain transition-colors" />
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100]">
          <div className="bg-surface border border-white/[0.08] p-6 rounded-2xl w-full max-w-md shadow-2xl mx-4">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-serif font-semibold text-textMain">Settings</h2>
              <button onClick={() => setIsOpen(false)} className="text-textMuted hover:text-textMain transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-textMuted mb-2">
                  Gemini API Key
                </label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="w-full bg-surfaceHighlight border border-white/[0.08] text-textMain rounded-lg px-4 py-2.5 focus:outline-none focus:border-primary/50 transition-colors"
                  placeholder="AIzaSy..."
                />
              </div>

              <button
                onClick={handleSave}
                className="w-full bg-primary hover:bg-primaryDim text-white font-semibold py-3 rounded-xl transition-colors mt-4"
              >
                Save Configuration
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
