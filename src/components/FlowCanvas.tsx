import React, { useState, useCallback, useEffect } from 'react';
import ReactFlow, {
  Background,
  Controls,
  applyNodeChanges,
  applyEdgeChanges,
  Handle,
  Position
} from 'reactflow';
import type { Node, Edge, NodeChange, EdgeChange } from 'reactflow';
import 'reactflow/dist/style.css';

const CustomNode = ({ data, selected }: any) => {
  return (
    <div className={`px-4 py-2 shadow-lg rounded-md border-2 glass-panel ${data.isActive ? 'border-accent shadow-[0_0_15px_rgba(56,189,248,0.5)] animate-pulse-slow' :
      selected ? 'border-primary' : 'border-gray-700'
      }`}>
      <Handle type="target" position={Position.Top} className="w-2 h-2 bg-accent" />
      <div className="flex items-center">
        <div className="ml-2">
          <div className="text-lg font-bold text-textMain">{data.label}</div>
          <div className="text-xs text-textMuted">{data.description}</div>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="w-2 h-2 bg-accent" />
    </div>
  );
};

const nodeTypes = {
  custom: CustomNode,
};

const initialNodes: Node[] = [
  { id: '1', type: 'custom', position: { x: 250, y: 50 }, data: { label: 'Introduction', description: 'Greeting and ice breakers', isActive: false } },
  { id: '2', type: 'custom', position: { x: 250, y: 150 }, data: { label: 'Background Check', description: 'Past experience details', isActive: false } },
  { id: '3', type: 'custom', position: { x: 250, y: 250 }, data: { label: 'Technical Challenge', description: 'Coding and logic', isActive: false } },
  { id: '4', type: 'custom', position: { x: 250, y: 350 }, data: { label: 'System Design', description: 'Architecture questions', isActive: false } },
  { id: '5', type: 'custom', position: { x: 250, y: 450 }, data: { label: 'Behavioral', description: 'Culture fit & wrap up', isActive: false } },
];

const initialEdges: Edge[] = [
  { id: 'e1-2', source: '1', target: '2', animated: true, style: { stroke: '#38bdf8' } },
  { id: 'e2-3', source: '2', target: '3', animated: true, style: { stroke: '#38bdf8' } },
  { id: 'e3-4', source: '3', target: '4', animated: true, style: { stroke: '#38bdf8' } },
  { id: 'e4-5', source: '4', target: '5', animated: true, style: { stroke: '#38bdf8' } },
];

interface FlowCanvasProps {
  activeNodeId: string;
  onNodeClick: (nodeId: string, nodeData: any) => void;
}

export const FlowCanvas: React.FC<FlowCanvasProps> = ({ activeNodeId, onNodeClick }) => {
  const [nodes, setNodes] = useState<Node[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);

  useEffect(() => {
    setNodes(nds => nds.map(node => {
      if (node.id === activeNodeId) {
        return { ...node, data: { ...node.data, isActive: true } };
      }
      return { ...node, data: { ...node.data, isActive: false } };
    }));
  }, [activeNodeId]);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );
  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );

  const handleNodeClick = (_: React.MouseEvent, node: Node) => {
    onNodeClick(node.id, node.data);
  };

  return (
    <div className="w-full h-full bg-background rounded-2xl overflow-hidden glass-panel">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        nodeTypes={nodeTypes}
        fitView
      >
        <Background color="#222226" gap={16} />
        <Controls className="bg-surfaceHighlight fill-textMain" />
      </ReactFlow>
    </div>
  );
};
