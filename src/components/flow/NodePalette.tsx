import React from 'react';
import { NODE_CATEGORIES } from '../../types/flow';
import type { NodeCategoryMeta } from '../../types/flow';

interface NodePaletteProps {
  onGenerateClick: () => void;
}

const PaletteItem: React.FC<{ meta: NodeCategoryMeta }> = ({ meta }) => {
  const onDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('application/reactflow-category', meta.category);
    e.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div
      draggable
      onDragStart={onDragStart}
      className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-gray-800 bg-surface hover:bg-surfaceHighlight hover:border-gray-600 cursor-grab active:cursor-grabbing transition-all group"
    >
      <span className="text-lg">{meta.icon}</span>
      <span className="text-sm font-medium text-textMain group-hover:text-white transition-colors">{meta.label}</span>
      <div className="ml-auto w-2 h-2 rounded-full opacity-60" style={{ background: meta.color }} />
    </div>
  );
};

const groups = [
  { key: 'start-end', label: 'Start / End' },
  { key: 'technical', label: 'Technical' },
  { key: 'soft-skills', label: 'Soft Skills' },
  { key: 'other', label: 'Other' },
] as const;

export const NodePalette: React.FC<NodePaletteProps> = ({ onGenerateClick }) => {
  return (
    <div className="w-64 h-full flex flex-col border-r border-gray-800 bg-background/80 backdrop-blur-md overflow-hidden">
      <div className="pt-20 px-4 pb-4 border-b border-white/[0.06]">
        <h3 className="text-sm font-bold text-white mb-1">Stage Palette</h3>
        <p className="text-xs text-textMuted">Drag stages onto the canvas</p>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {groups.map(group => {
          const items = NODE_CATEGORIES.filter(c => c.group === group.key);
          if (items.length === 0) return null;
          return (
            <div key={group.key}>
              <div className="text-[10px] uppercase tracking-wider text-textMuted font-semibold mb-2 px-1">
                {group.label}
              </div>
              <div className="space-y-1.5">
                {items.map(meta => (
                  <PaletteItem key={meta.category} meta={meta} />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="p-3 border-t border-gray-800">
        <button
          onClick={onGenerateClick}
          className="w-full px-4 py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white text-sm font-semibold rounded-lg transition-all shadow-lg hover:shadow-purple-500/25"
        >
          ✨ Generate with AI
        </button>
      </div>
    </div>
  );
};
