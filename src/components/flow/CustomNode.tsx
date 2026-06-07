import React from 'react';
import { Handle, Position } from 'reactflow';
import { motion } from 'framer-motion';
import { NODE_CATEGORIES } from '../../types/flow';
import type { FlowNodeData } from '../../types/flow';

interface CustomNodeProps {
  data: FlowNodeData & { isActive?: boolean };
  selected: boolean;
}

export const CustomFlowNode: React.FC<CustomNodeProps> = ({ data, selected }) => {
  const meta = NODE_CATEGORIES.find(c => c.category === data.category);
  const color = meta?.color || '#94a3b8';
  const icon = meta?.icon || '📋';

  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={`px-5 py-3 shadow-xl rounded-xl border-2 transition-all min-w-[200px] ${
        data.isActive
          ? 'shadow-[0_0_20px_rgba(56,189,248,0.5)] bg-accent/10'
          : selected
          ? 'bg-surfaceHighlight'
          : 'bg-surface'
      }`}
      style={{
        borderColor: selected || data.isActive ? color : '#1f2937',
      }}
    >
      <Handle type="target" position={Position.Top} className="w-3 h-3 border-2 border-surface" style={{ background: color }} />
      <div className="flex items-center gap-3">
        <span className="text-xl">{icon}</span>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-bold text-textMain truncate">{data.label}</div>
          <div className="text-xs text-textMuted line-clamp-2 mt-0.5">{data.description}</div>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 border-2 border-surface" style={{ background: color }} />
    </motion.div>
  );
};
