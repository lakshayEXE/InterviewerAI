import React from 'react';
import { GripVertical, Layers } from 'lucide-react';
import { NODE_CATEGORIES } from '../../types/flow';
import type { NodeCategoryMeta, NodeCategory } from '../../types/flow';
import { CATEGORY_ICONS } from './categoryIcons';

interface NodePaletteProps {
  onGenerateClick: () => void;
  onAddStage: (category: NodeCategory) => void;
  stageCount?: number;
}

const PaletteItem: React.FC<{ meta: NodeCategoryMeta; onAdd: () => void }> = ({ meta, onAdd }) => {
  const Icon = CATEGORY_ICONS[meta.category];

  const onDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('application/reactflow-category', meta.category);
    e.dataTransfer.effectAllowed = 'move';
  };

  return (
    <button
      type="button"
      draggable
      onDragStart={onDragStart}
      onClick={onAdd}
      title="Drag onto canvas or click to add"
      className="group relative w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border border-white/[0.06] bg-surface/60 hover:bg-surfaceHighlight hover:border-white/10 cursor-grab active:cursor-grabbing transition-all text-left overflow-hidden"
    >
      <span
        className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ background: meta.color }}
      />
      <span
        className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center"
        style={{ background: `${meta.color}1a`, color: meta.color }}
      >
        {Icon && <Icon size={18} />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-textMain group-hover:text-white transition-colors truncate">
          {meta.label}
        </span>
        {meta.shortDesc && (
          <span className="block text-xs text-textMuted truncate">{meta.shortDesc}</span>
        )}
      </span>
      <GripVertical
        size={16}
        className="shrink-0 text-textMuted opacity-0 group-hover:opacity-40 transition-opacity"
      />
    </button>
  );
};

const groups = [
  { key: 'start-end', label: 'Start / End' },
  { key: 'technical', label: 'Technical' },
  { key: 'soft-skills', label: 'Soft Skills' },
  { key: 'other', label: 'Other' },
] as const;

export const NodePalette: React.FC<NodePaletteProps> = ({ onGenerateClick, onAddStage, stageCount }) => {
  return (
    <div className="w-64 h-full flex flex-col border-r border-gray-800 bg-background/80 backdrop-blur-md overflow-hidden">
      <div className="pt-20 px-4 pb-4 border-b border-white/[0.06]">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
            <Layers size={16} />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-white leading-tight">Stage Palette</h3>
            <p className="text-xs text-textMuted">
              {typeof stageCount === 'number' && stageCount > 0
                ? `${stageCount} stage${stageCount === 1 ? '' : 's'} in flow`
                : 'Drag or click to add'}
            </p>
          </div>
        </div>
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
                  <PaletteItem key={meta.category} meta={meta} onAdd={() => onAddStage(meta.category)} />
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
