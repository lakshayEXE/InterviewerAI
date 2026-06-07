import React from 'react';
import { motion } from 'framer-motion';
import { X, UserCog, Check } from 'lucide-react';
import { Card } from '../ui/Card';
import type { InterviewerConfig, InterviewerDemeanor } from '../../types/flow';
import { DEMEANOR_PRESETS, INTERVIEWER_VOICES, VOICE_LANGUAGES } from '../../types/flow';

interface InterviewerConfigPanelProps {
  config: InterviewerConfig;
  onChange: (config: InterviewerConfig) => void;
  onClose: () => void;
}

export const InterviewerConfigPanel: React.FC<InterviewerConfigPanelProps> = ({ config, onChange, onClose }) => {
  const update = <K extends keyof InterviewerConfig>(field: K, value: InterviewerConfig[K]) => {
    onChange({ ...config, [field]: value });
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 50 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="w-full md:w-96 shrink-0 h-full overflow-y-auto"
    >
      <Card className="h-full flex flex-col !p-0">
        <div className="pt-20 px-4 pb-4 border-b border-white/[0.06] flex justify-between items-center bg-surface">
          <div className="flex items-center gap-2">
            <UserCog size={18} className="text-primary" />
            <h3 className="text-base font-bold text-white">Interviewer</h3>
          </div>
          <button
            onClick={onClose}
            className="text-textMuted hover:text-white transition-colors bg-background p-2 rounded-full"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-6 flex-1 bg-surfaceHighlight/50">
          <p className="text-xs text-textMuted">
            Controls how the AI interviewer behaves and sounds. Applies to every session and is embedded in invite links.
          </p>

          <div>
            <label className="block text-sm font-semibold text-textMuted mb-3">Demeanor</label>
            <div className="space-y-2.5">
              {DEMEANOR_PRESETS.map((preset) => {
                const active = config.demeanor === preset.id;
                return (
                  <button
                    key={preset.id}
                    onClick={() => update('demeanor', preset.id as InterviewerDemeanor)}
                    className={`w-full text-left p-3.5 rounded-xl border transition-all ${
                      active
                        ? 'bg-primary/15 border-primary/40 ring-1 ring-primary/30'
                        : 'bg-background border-gray-700 hover:border-gray-600'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-white flex items-center gap-2">
                        <span>{preset.icon}</span>
                        {preset.label}
                      </span>
                      {active && <Check size={16} className="text-primary" />}
                    </div>
                    <p className="text-xs text-textMuted leading-relaxed">{preset.description}</p>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-textMuted mb-2">Voice</label>
            <select
              value={config.voiceName}
              onChange={(e) => update('voiceName', e.target.value)}
              className="w-full bg-background border border-gray-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
            >
              <optgroup label="Female">
                {INTERVIEWER_VOICES.filter((v) => v.gender === 'female').map((v) => (
                  <option key={v.name} value={v.name}>{v.label}</option>
                ))}
              </optgroup>
              <optgroup label="Male">
                {INTERVIEWER_VOICES.filter((v) => v.gender === 'male').map((v) => (
                  <option key={v.name} value={v.name}>{v.label}</option>
                ))}
              </optgroup>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-textMuted mb-2">Accent / Language</label>
            <select
              value={config.languageCode}
              onChange={(e) => update('languageCode', e.target.value)}
              className="w-full bg-background border border-gray-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
            >
              {VOICE_LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>{l.label}</option>
              ))}
            </select>
            <p className="text-xs text-textMuted mt-2">
              Indian English (en-IN) with a female voice gives the warm Indian-lady sound.
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-textMuted mb-2">Custom Instructions</label>
            <textarea
              value={config.customInstructions}
              onChange={(e) => update('customInstructions', e.target.value)}
              className="w-full bg-background border border-gray-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all min-h-[100px] resize-none"
              placeholder="Anything extra about how the interviewer should behave, e.g. 'Speak slowly', 'Be extra encouraging with junior candidates'..."
            />
          </div>
        </div>
      </Card>
    </motion.div>
  );
};
