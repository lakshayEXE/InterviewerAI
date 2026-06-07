import React from 'react';
import { motion } from 'framer-motion';
import { X, Building2 } from 'lucide-react';
import { Card } from '../ui/Card';
import type { CompanyInfo } from '../../types/flow';

interface CompanyConfigPanelProps {
  companyInfo: CompanyInfo;
  onChange: (info: CompanyInfo) => void;
  onClose: () => void;
}

export const CompanyConfigPanel: React.FC<CompanyConfigPanelProps> = ({ companyInfo, onChange, onClose }) => {
  const update = (field: keyof CompanyInfo, value: string | string[]) => {
    onChange({ ...companyInfo, [field]: value });
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
            <Building2 size={18} className="text-primary" />
            <h3 className="text-base font-bold text-white">Company Info</h3>
          </div>
          <button
            onClick={onClose}
            className="text-textMuted hover:text-white transition-colors bg-background p-2 rounded-full"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-5 flex-1 bg-surfaceHighlight/50">
          <p className="text-xs text-textMuted">
            This info is injected into the AI context so it never hallucinates about the company.
          </p>

          <div>
            <label className="block text-sm font-semibold text-textMuted mb-2">Company Name</label>
            <input
              type="text"
              value={companyInfo.name}
              onChange={e => update('name', e.target.value)}
              className="w-full bg-background border border-gray-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
              placeholder="e.g. Acme Corp"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-textMuted mb-2">Role Title</label>
            <input
              type="text"
              value={companyInfo.roleTitle}
              onChange={e => update('roleTitle', e.target.value)}
              className="w-full bg-background border border-gray-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
              placeholder="e.g. Senior Frontend Engineer"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-textMuted mb-2">Tech Stack (comma-separated)</label>
            <input
              type="text"
              value={companyInfo.techStack.join(', ')}
              onChange={e => update('techStack', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
              className="w-full bg-background border border-gray-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
              placeholder="e.g. React, Node.js, PostgreSQL"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-textMuted mb-2">Company Description</label>
            <textarea
              value={companyInfo.description}
              onChange={e => update('description', e.target.value)}
              className="w-full bg-background border border-gray-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all min-h-[80px] resize-none"
              placeholder="Brief description of what the company does..."
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-textMuted mb-2">Additional Context</label>
            <textarea
              value={companyInfo.additionalContext}
              onChange={e => update('additionalContext', e.target.value)}
              className="w-full bg-background border border-gray-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all min-h-[80px] resize-none"
              placeholder="Any extra notes about the role, team, or expectations..."
            />
          </div>
        </div>
      </Card>
    </motion.div>
  );
};
