import React from 'react';
import type { Node } from 'reactflow';
import { X, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { Card } from '../ui/Card';
import type { FlowNodeData } from '../../types/flow';
import { FUNDAMENTALS_SUBJECTS, DSA_TOPICS, BEHAVIORAL_AREAS, NODE_CATEGORIES } from '../../types/flow';

interface NodeConfigPanelProps {
  node: Node;
  onUpdate: (id: string, data: Partial<FlowNodeData>) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

const TagSelector: React.FC<{
  label: string;
  options: string[];
  selected: string[];
  onChange: (val: string[]) => void;
}> = ({ label, options, selected, onChange }) => (
  <div>
    <label className="block text-sm font-semibold text-textMuted mb-2">{label}</label>
    <div className="flex flex-wrap gap-1.5">
      {options.map(opt => {
        const isSelected = selected.includes(opt);
        return (
          <button
            key={opt}
            onClick={() => onChange(isSelected ? selected.filter(s => s !== opt) : [...selected, opt])}
            className={`px-2.5 py-1 text-xs rounded-md border transition-all ${
              isSelected
                ? 'bg-primary/20 border-primary text-primary font-medium'
                : 'bg-background border-gray-700 text-textMuted hover:border-gray-500'
            }`}
          >
            {opt}
          </button>
        );
      })}
    </div>
  </div>
);

const SelectField: React.FC<{
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (val: string) => void;
}> = ({ label, value, options, onChange }) => (
  <div>
    <label className="block text-sm font-semibold text-textMuted mb-2">{label}</label>
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-full bg-background border border-gray-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
    >
      {options.map(o => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  </div>
);

const ToggleField: React.FC<{
  label: string;
  checked: boolean;
  onChange: (val: boolean) => void;
}> = ({ label, checked, onChange }) => (
  <div className="flex items-center justify-between">
    <label className="text-sm font-semibold text-textMuted">{label}</label>
    <button
      onClick={() => onChange(!checked)}
      className={`w-10 h-5 rounded-full transition-all relative ${checked ? 'bg-primary' : 'bg-gray-700'}`}
    >
      <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all ${checked ? 'left-5.5' : 'left-0.5'}`} />
    </button>
  </div>
);

function CategoryFields({ data, onUpdate, nodeId }: { data: FlowNodeData; onUpdate: (id: string, d: Partial<FlowNodeData>) => void; nodeId: string }) {
  switch (data.category) {
    case 'greeting':
      return (
        <>
          <SelectField
            label="Tone"
            value={data.tone}
            options={[{ value: 'formal', label: 'Formal' }, { value: 'casual', label: 'Casual' }]}
            onChange={v => onUpdate(nodeId, { tone: v as 'formal' | 'casual' } as any)}
          />
          <div>
            <label className="block text-sm font-semibold text-textMuted mb-2">Duration Hint</label>
            <input
              type="text"
              value={data.durationHint}
              onChange={e => onUpdate(nodeId, { durationHint: e.target.value } as any)}
              className="w-full bg-background border border-gray-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
              placeholder="e.g. 2-3 min"
            />
          </div>
        </>
      );

    case 'fundamentals':
      return (
        <>
          <TagSelector
            label="Subjects"
            options={FUNDAMENTALS_SUBJECTS}
            selected={data.subjects}
            onChange={v => onUpdate(nodeId, { subjects: v } as any)}
          />
          <SelectField
            label="Depth"
            value={data.depth}
            options={[
              { value: 'basic', label: 'Basic' },
              { value: 'intermediate', label: 'Intermediate' },
              { value: 'advanced', label: 'Advanced' },
            ]}
            onChange={v => onUpdate(nodeId, { depth: v } as any)}
          />
        </>
      );

    case 'dsa':
      return (
        <>
          <TagSelector
            label="Topics"
            options={DSA_TOPICS}
            selected={data.topics}
            onChange={v => onUpdate(nodeId, { topics: v } as any)}
          />
          <SelectField
            label="Difficulty"
            value={data.difficulty}
            options={[
              { value: 'easy', label: 'Easy' },
              { value: 'medium', label: 'Medium' },
              { value: 'hard', label: 'Hard' },
            ]}
            onChange={v => onUpdate(nodeId, { difficulty: v } as any)}
          />
          <ToggleField
            label="Allow Hints"
            checked={data.allowHints}
            onChange={v => onUpdate(nodeId, { allowHints: v } as any)}
          />
        </>
      );

    case 'coding':
      return (
        <>
          <div>
            <label className="block text-sm font-semibold text-textMuted mb-2">Preferred Language</label>
            <input
              type="text"
              value={data.language}
              onChange={e => onUpdate(nodeId, { language: e.target.value } as any)}
              className="w-full bg-background border border-gray-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
              placeholder="e.g. Python, JavaScript (leave blank for any)"
            />
          </div>
          <SelectField
            label="Problem Type"
            value={data.problemType}
            options={[
              { value: 'implement', label: 'Implement from scratch' },
              { value: 'debug', label: 'Find & fix bugs' },
              { value: 'optimize', label: 'Optimize existing code' },
            ]}
            onChange={v => onUpdate(nodeId, { problemType: v } as any)}
          />
        </>
      );

    case 'system-design':
      return (
        <>
          <SelectField
            label="Scope"
            value={data.scope}
            options={[
              { value: 'HLD', label: 'High-Level Design' },
              { value: 'LLD', label: 'Low-Level Design' },
              { value: 'both', label: 'Both HLD & LLD' },
            ]}
            onChange={v => onUpdate(nodeId, { scope: v } as any)}
          />
          <div>
            <label className="block text-sm font-semibold text-textMuted mb-2">Example Systems (comma-separated)</label>
            <input
              type="text"
              value={data.exampleSystems.join(', ')}
              onChange={e => onUpdate(nodeId, { exampleSystems: e.target.value.split(',').map(s => s.trim()).filter(Boolean) } as any)}
              className="w-full bg-background border border-gray-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
              placeholder="e.g. URL Shortener, Chat App"
            />
          </div>
        </>
      );

    case 'behavioral':
      return (
        <TagSelector
          label="Focus Areas"
          options={BEHAVIORAL_AREAS}
          selected={data.focusAreas}
          onChange={v => onUpdate(nodeId, { focusAreas: v } as any)}
        />
      );

    case 'custom':
      return (
        <div>
          <label className="block text-sm font-semibold text-textMuted mb-2">Custom Instructions</label>
          <textarea
            value={data.instructions}
            onChange={e => onUpdate(nodeId, { instructions: e.target.value } as any)}
            className="w-full bg-background border border-gray-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all min-h-[120px] resize-none"
            placeholder="Write detailed instructions for this stage..."
          />
        </div>
      );

    case 'wrapup':
      return (
        <ToggleField
          label="Allow Candidate Questions"
          checked={data.allowCandidateQuestions}
          onChange={v => onUpdate(nodeId, { allowCandidateQuestions: v } as any)}
        />
      );

    default:
      return null;
  }
}

export const NodeConfigPanel: React.FC<NodeConfigPanelProps> = ({ node, onUpdate, onDelete, onClose }) => {
  const data = node.data as FlowNodeData;
  const meta = NODE_CATEGORIES.find(c => c.category === data.category);

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
            <span className="text-lg">{meta?.icon}</span>
            <h3 className="text-base font-bold text-white">Configure Stage</h3>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onDelete(node.id)}
              className="text-red-400 hover:text-red-300 transition-colors bg-background p-2 rounded-full"
              title="Delete stage"
            >
              <Trash2 size={16} />
            </button>
            <button
              onClick={onClose}
              className="text-textMuted hover:text-white transition-colors bg-background p-2 rounded-full"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="p-5 space-y-5 flex-1 bg-surfaceHighlight/50">
          <div>
            <label className="block text-sm font-semibold text-textMuted mb-2">Stage Name</label>
            <input
              type="text"
              value={data.label}
              onChange={e => onUpdate(node.id, { label: e.target.value })}
              className="w-full bg-background border border-gray-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-textMuted mb-2">Description</label>
            <textarea
              value={data.description}
              onChange={e => onUpdate(node.id, { description: e.target.value })}
              className="w-full bg-background border border-gray-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all min-h-[80px] resize-none"
              placeholder="Brief description of this stage..."
            />
          </div>

          <div className="border-t border-gray-800 pt-4">
            <div className="text-[10px] uppercase tracking-wider text-textMuted font-semibold mb-3">
              Category Settings
            </div>
            <div className="space-y-4">
              <CategoryFields data={data} onUpdate={onUpdate} nodeId={node.id} />
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
};
