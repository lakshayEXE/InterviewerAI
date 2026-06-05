import React, { useCallback, useState } from 'react';
import ReactFlow, { 
  Background, 
  Controls, 
  applyNodeChanges,
  applyEdgeChanges,
  addEdge
} from 'reactflow';
import type { Node, NodeChange, EdgeChange, Connection } from 'reactflow';
import 'reactflow/dist/style.css';
import { useInterviewStore } from '../store/useInterviewStore';
import { Handle, Position } from 'reactflow';
import { Link2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { PageTransition } from '../components/ui/PageTransition';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { motion, AnimatePresence } from 'framer-motion';

const CustomNode = ({ data, selected }: any) => {
  return (
    <motion.div 
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={`px-5 py-3 shadow-xl rounded-xl border-2 glass-panel transition-all ${
      data.isActive ? 'border-accent shadow-[0_0_20px_rgba(56,189,248,0.5)] bg-accent/10' : 
      selected ? 'border-primary bg-surfaceHighlight' : 'border-gray-800 bg-surface'
    }`}>
      <Handle type="target" position={Position.Top} className="w-3 h-3 bg-accent border-2 border-surface" />
      <div className="flex items-center">
        <div className="ml-2 max-w-[220px]">
          <div className="text-base font-bold text-textMain truncate">{data.label}</div>
          <div className="text-xs text-textMuted line-clamp-2 mt-1">{data.description}</div>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-accent border-2 border-surface" />
    </motion.div>
  );
};
const nodeTypes = { custom: CustomNode };

export const FlowBuilder: React.FC = () => {
  const nodes = useInterviewStore(state => state.nodes);
  const edges = useInterviewStore(state => state.edges);
  const setNodes = useInterviewStore(state => state.setNodes);
  const setEdges = useInterviewStore(state => state.setEdges);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => setNodes((nds) => applyNodeChanges(changes, nds)),
    [setNodes]
  );
  
  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    [setEdges]
  );

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge({ ...params, animated: true, style: { stroke: '#38bdf8', strokeWidth: 2 } }, eds)),
    [setEdges]
  );

  const onNodeClick = (_: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  };

  const updateNodeData = (id: string, label: string, description: string) => {
    setNodes(nds => nds.map(n => {
      if (n.id === id) {
        return { ...n, data: { ...n.data, label, description } };
      }
      return n;
    }));
    if (selectedNode && selectedNode.id === id) {
      setSelectedNode({ ...selectedNode, data: { ...selectedNode.data, label, description } });
    }
  };

  const generateLink = () => {
    const sessionData = btoa(JSON.stringify(nodes));
    const url = `${window.location.origin}/invite/${sessionData}`;
    navigator.clipboard.writeText(url);
    toast.success('Interview Link Copied to Clipboard!');
  };

  return (
    <PageTransition className="p-6">
      <div className="w-full h-full flex flex-col md:flex-row gap-6 relative">
        <div className="flex-1 flex flex-col h-full min-h-[500px]">
          <div className="mb-6 flex justify-between items-end">
            <div>
              <h2 className="text-3xl font-extrabold text-white mb-2">Flow Builder</h2>
              <p className="text-textMuted text-base">Architect the interview progression. Click nodes to inject specific prompts.</p>
            </div>
            <Button onClick={generateLink} variant="primary" size="md">
              <Link2 size={20} />
              <span className="hidden md:inline">Generate Link</span>
            </Button>
          </div>
          
          <Card className="flex-1 p-0 !border-gray-800">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onNodeClick={onNodeClick}
              nodeTypes={nodeTypes}
              fitView
              className="bg-background"
            >
              <Background color="#3f3f46" gap={24} size={2} />
              <Controls className="bg-surfaceHighlight fill-textMain border-gray-800 rounded-lg overflow-hidden shadow-xl" />
            </ReactFlow>
          </Card>
        </div>

        <AnimatePresence>
          {selectedNode && (
            <motion.div 
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 50 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="w-full md:w-96 shrink-0 h-full max-h-[600px] overflow-y-auto"
            >
              <Card className="h-full flex flex-col !p-0">
                <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-surface">
                  <h3 className="text-lg font-bold text-white">Stage Configuration</h3>
                  <button onClick={() => setSelectedNode(null)} className="text-textMuted hover:text-white transition-colors bg-background p-2 rounded-full">
                    <X size={18} />
                  </button>
                </div>
                <div className="p-6 space-y-6 flex-1 bg-surfaceHighlight/50">
                  <div>
                    <label className="block text-sm font-semibold text-textMuted mb-2">Stage Name</label>
                    <input
                      type="text"
                      value={selectedNode.data.label}
                      onChange={(e) => updateNodeData(selectedNode.id, e.target.value, selectedNode.data.description)}
                      className="w-full bg-background border border-gray-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all shadow-inner"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-textMuted mb-2">System Instructions</label>
                    <textarea
                      value={selectedNode.data.description}
                      onChange={(e) => updateNodeData(selectedNode.id, selectedNode.data.label, e.target.value)}
                      className="w-full bg-background border border-gray-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all min-h-[200px] resize-none shadow-inner"
                      placeholder="e.g. Focus on system design principles..."
                    />
                  </div>
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </PageTransition>
  );
};
