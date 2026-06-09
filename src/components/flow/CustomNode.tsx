import React from 'react';
import { Handle, Position } from 'reactflow';
import { NODE_CATEGORIES } from '../../types/flow';
import type { FlowNodeData } from '../../types/flow';
import { CATEGORY_ICONS } from './categoryIcons';

interface CustomNodeProps {
  data: FlowNodeData & { isActive?: boolean };
  selected: boolean;
}

export const CustomFlowNode: React.FC<CustomNodeProps> = ({ data, selected }) => {
  const meta = NODE_CATEGORIES.find(c => c.category === data.category);
  const color = meta?.color || '#94a3b8';
  const Icon = CATEGORY_ICONS[data.category];

  const stateClasses = data.isActive
    ? 'shadow-[0_0_20px_rgba(56,189,248,0.45)] bg-accent/10 border-accent/40'
    : selected
    ? 'bg-surfaceHighlight border-white/15'
    : 'bg-surface border-white/[0.06]';

  return (
    <div className={`group relative w-64 rounded-xl border shadow-xl transition-all overflow-hidden ${stateClasses}`}>
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 border-2 border-surface"
        style={{ background: color }}
      />

      <span
        className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full transition-opacity"
        style={{ background: color, opacity: selected || data.isActive ? 1 : 0.55 }}
      />

      <div className="flex items-center gap-3 pl-4 pr-3 py-3">
        <span
          className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center"
          style={{ background: `${color}1a`, color }}
        >
          {Icon ? <Icon size={18} /> : <span className="text-lg">{meta?.icon}</span>}
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-bold text-textMain truncate">{data.label}</div>
          {data.description && data.description.trim() && data.description !== data.label && (
            <div className="text-xs text-textMuted line-clamp-2 mt-0.5 leading-snug">
              {data.description}
            </div>
          )}
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 border-2 border-surface"
        style={{ background: color }}
      />
    </div>
  );
};
