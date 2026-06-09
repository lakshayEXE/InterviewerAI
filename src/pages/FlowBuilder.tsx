import React, { useCallback, useState, useRef, useEffect } from 'react';
import ReactFlow, {
  Background,
  Controls,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
} from 'reactflow';
import type { Node, NodeChange, EdgeChange, Connection } from 'reactflow';
import 'reactflow/dist/style.css';
import { useInterviewStore } from '../store/useInterviewStore';
import toast from 'react-hot-toast';
import { PageTransition } from '../components/ui/PageTransition';
import { AnimatePresence } from 'framer-motion';
import { CustomFlowNode } from '../components/flow/CustomNode';
import { NodePalette } from '../components/flow/NodePalette';
import { NodeConfigPanel } from '../components/flow/NodeConfigPanel';
import { CompanyConfigPanel } from '../components/flow/CompanyConfigPanel';
import { InterviewerConfigPanel } from '../components/flow/InterviewerConfigPanel';
import { GenerateFlowModal } from '../components/flow/GenerateFlowModal';
import { generateFlowFromJD } from '../services/FlowGeneratorService';
import { encodeSessionPayload } from '../utils/sessionPayload';
import { NODE_CATEGORIES } from '../types/flow';
import type { FlowNodeData, NodeCategory } from '../types/flow';
import { Workflow } from 'lucide-react';

const nodeTypes = { custom: CustomFlowNode };

export const FlowBuilder: React.FC = () => {
  const nodes = useInterviewStore(state => state.nodes);
  const edges = useInterviewStore(state => state.edges);
  const setNodes = useInterviewStore(state => state.setNodes);
  const setEdges = useInterviewStore(state => state.setEdges);
  const apiKey = useInterviewStore(state => state.apiKey);
  const companyInfo = useInterviewStore(state => state.companyInfo);
  const setCompanyInfo = useInterviewStore(state => state.setCompanyInfo);
  const interviewerConfig = useInterviewStore(state => state.interviewerConfig);
  const setInterviewerConfig = useInterviewStore(state => state.setInterviewerConfig);
  const setFlowNavActions = useInterviewStore(state => state.setFlowNavActions);

  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [showCompanyConfig, setShowCompanyConfig] = useState(false);
  const [showInterviewerConfig, setShowInterviewerConfig] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);

  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);

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
    setShowCompanyConfig(false);
    setShowInterviewerConfig(false);
  };

  const updateNodeData = useCallback((id: string, data: Partial<FlowNodeData>) => {
    setNodes(nds => nds.map(n => {
      if (n.id === id) {
        const updated = { ...n, data: { ...n.data, ...data } };
        return updated;
      }
      return n;
    }));
    setSelectedNode(prev => {
      if (prev && prev.id === id) {
        return { ...prev, data: { ...prev.data, ...data } };
      }
      return prev;
    });
  }, [setNodes]);

  const deleteNode = useCallback((id: string) => {
    setNodes(nds => nds.filter(n => n.id !== id));
    setEdges(eds => eds.filter(e => e.source !== id && e.target !== id));
    setSelectedNode(null);
  }, [setNodes, setEdges]);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const addStage = useCallback((category: NodeCategory, position?: { x: number; y: number }) => {
    const meta = NODE_CATEGORIES.find(c => c.category === category);
    if (!meta) return;

    // The "visual tail" of the chain = node with the greatest y coordinate.
    // Using this (instead of array order) keeps the new node and edge anchored
    // to wherever the user has actually placed the bottom of their flow.
    const tailNode = nodes.length > 0
      ? nodes.reduce((a, b) => (a.position.y >= b.position.y ? a : b))
      : null;

    const pos = position ?? (tailNode
      ? { x: tailNode.position.x, y: tailNode.position.y + 140 }
      : { x: 250, y: 80 });

    const newNode: Node = {
      id: `node_${Date.now()}`,
      type: 'custom',
      position: pos,
      data: { ...meta.defaultData },
    };

    setNodes(nds => [...nds, newNode]);

    if (tailNode) {
      setEdges(eds => [...eds, {
        id: `e_${tailNode.id}-${newNode.id}`,
        source: tailNode.id,
        target: newNode.id,
        animated: true,
        style: { stroke: '#38bdf8' },
      }]);
    }
  }, [nodes, setNodes, setEdges]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const category = e.dataTransfer.getData('application/reactflow-category') as NodeCategory;
    if (!category) return;

    const bounds = reactFlowWrapper.current?.getBoundingClientRect();
    if (!bounds || !reactFlowInstance) return;

    const position = reactFlowInstance.screenToFlowPosition({
      x: e.clientX - bounds.left,
      y: e.clientY - bounds.top,
    });

    addStage(category, position);
  }, [reactFlowInstance, addStage]);

  const generateLink = useCallback(() => {
    const state = useInterviewStore.getState();
    const sessionData = encodeSessionPayload({
      nodes: state.nodes,
      config: state.interviewerConfig,
      companyInfo: state.companyInfo,
    });
    const url = `${window.location.origin}/invite/${sessionData}`;
    navigator.clipboard.writeText(url);
    toast.success('Interview Link Copied to Clipboard!');
  }, []);

  // Register Flow Builder actions into the top navbar
  useEffect(() => {
    setFlowNavActions({
      onCompanyInfo: () => { setShowCompanyConfig(true); setShowInterviewerConfig(false); setSelectedNode(null); },
      onInterviewerConfig: () => { setShowInterviewerConfig(true); setShowCompanyConfig(false); setSelectedNode(null); },
      onGenerateLink: generateLink,
      onGenerateAI: () => setShowGenerateModal(true),
    });
    return () => setFlowNavActions(null);
  }, [setFlowNavActions, generateLink]);

  const handleAIGenerate = async (jd: string, resume: string) => {
    if (!apiKey) {
      toast.error('API key required. Configure it in settings.');
      throw new Error('No API key');
    }

    try {
      const flowData = await generateFlowFromJD(apiKey, jd, resume);

      const newNodes: Node[] = flowData.map((data, i) => ({
        id: `node_${Date.now()}_${i}`,
        type: 'custom',
        position: { x: 250, y: 50 + i * 130 },
        data,
      }));

      const newEdges = newNodes.slice(1).map((node, i) => ({
        id: `e_${newNodes[i].id}-${node.id}`,
        source: newNodes[i].id,
        target: node.id,
        animated: true,
        style: { stroke: '#38bdf8' },
      }));

      setNodes(newNodes);
      setEdges(newEdges);
      setSelectedNode(null);
      toast.success(`Generated ${newNodes.length} interview stages!`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate flow');
      throw err;
    }
  };

  return (
    <PageTransition className="p-0 h-full">
      <div className="w-full h-full flex relative">
        <NodePalette
          onGenerateClick={() => setShowGenerateModal(true)}
          onAddStage={(category) => addStage(category)}
          stageCount={nodes.length}
        />

        <div className="flex-1 flex flex-col h-full">
          <div className="flex-1 flex overflow-hidden">
            <div className="flex-1 relative" ref={reactFlowWrapper}>
              <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onNodeClick={onNodeClick}
                onInit={setReactFlowInstance}
                onDragOver={onDragOver}
                onDrop={onDrop}
                nodeTypes={nodeTypes}
                fitView
                className="bg-background"
                deleteKeyCode={['Backspace', 'Delete']}
              >
                <Background color="#3f3f46" gap={24} size={2} />
                <Controls className="bg-surfaceHighlight fill-textMain border-gray-800 rounded-lg overflow-hidden shadow-xl" />
              </ReactFlow>

              {nodes.length === 0 && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 pointer-events-none px-6 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-surface/60 border border-white/[0.06] flex items-center justify-center text-textMuted">
                    <Workflow size={30} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Your interview flow is empty</h3>
                    <p className="text-sm text-textMuted mt-1 max-w-xs">
                      Drag a stage from the left, click one to add it, or generate a full flow with AI.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <AnimatePresence>
              {selectedNode && !showCompanyConfig && !showInterviewerConfig && (
                <NodeConfigPanel
                  node={selectedNode}
                  onUpdate={updateNodeData}
                  onDelete={deleteNode}
                  onClose={() => setSelectedNode(null)}
                />
              )}
              {showCompanyConfig && (
                <CompanyConfigPanel
                  companyInfo={companyInfo}
                  onChange={setCompanyInfo}
                  onClose={() => setShowCompanyConfig(false)}
                />
              )}
              {showInterviewerConfig && (
                <InterviewerConfigPanel
                  config={interviewerConfig}
                  onChange={setInterviewerConfig}
                  onClose={() => setShowInterviewerConfig(false)}
                />
              )}
            </AnimatePresence>
          </div>
        </div>

        <GenerateFlowModal
          isOpen={showGenerateModal}
          onClose={() => setShowGenerateModal(false)}
          onGenerate={handleAIGenerate}
        />
      </div>
    </PageTransition>
  );
};
