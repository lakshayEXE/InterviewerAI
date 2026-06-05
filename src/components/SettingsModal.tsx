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
        className="p-3 bg-surfaceHighlight hover:bg-gray-700 rounded-full transition-colors border border-gray-700"
      >
        <Settings size={24} className="text-textMuted hover:text-textMain" />
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-surface border border-gray-800 p-6 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-textMain">Settings</h2>
              <button onClick={() => setIsOpen(false)} className="text-textMuted hover:text-white">
                <X size={24} />
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
                  className="w-full bg-surfaceHighlight border border-gray-700 text-textMain rounded-lg px-4 py-2 focus:outline-none focus:border-accent"
                  placeholder="AIzaSy..."
                />
              </div>
              
              <button
                onClick={handleSave}
                className="w-full bg-primary hover:bg-green-500 text-black font-bold py-3 rounded-xl transition-colors mt-4"
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
