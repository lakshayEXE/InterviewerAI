import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Node, Edge } from 'reactflow';
import type { TranscriptItem } from '../components/TranscriptSidebar';

export interface InterviewStore {
  apiKey: string;
  setApiKey: (key: string) => void;
  nodes: Node[];
  edges: Edge[];
  setNodes: (nodes: Node[] | ((val: Node[]) => Node[])) => void;
  setEdges: (edges: Edge[] | ((val: Edge[]) => Edge[])) => void;
  transcript: TranscriptItem[];
  addTranscriptItem: (item: TranscriptItem) => void;
  clearTranscript: () => void;
}

const initialNodes: Node[] = [
  { id: '1', type: 'custom', position: { x: 250, y: 50 }, data: { label: 'Greeting', description: 'Greeting and ice breakers', isActive: false } },
  { id: '2', type: 'custom', position: { x: 250, y: 150 }, data: { label: 'Technical Screening', description: 'Assess coding and logic', isActive: false } },
  { id: '3', type: 'custom', position: { x: 250, y: 250 }, data: { label: 'Behavioral', description: 'Culture fit & past experience', isActive: false } },
  { id: '4', type: 'custom', position: { x: 250, y: 350 }, data: { label: 'Wrap-up', description: 'Questions for us & closing', isActive: false } },
];

const initialEdges: Edge[] = [
  { id: 'e1-2', source: '1', target: '2', animated: true, style: { stroke: '#38bdf8' } },
  { id: 'e2-3', source: '2', target: '3', animated: true, style: { stroke: '#38bdf8' } },
  { id: 'e3-4', source: '3', target: '4', animated: true, style: { stroke: '#38bdf8' } },
];

export const useInterviewStore = create<InterviewStore>()(
  persist(
    (set) => ({
      apiKey: import.meta.env.VITE_GEMINI_API_KEY || '',
      setApiKey: (key) => set({ apiKey: key }),
      nodes: initialNodes,
      edges: initialEdges,
      setNodes: (nodes) => set((state) => ({ nodes: typeof nodes === 'function' ? nodes(state.nodes) : nodes })),
      setEdges: (edges) => set((state) => ({ edges: typeof edges === 'function' ? edges(state.edges) : edges })),
      transcript: [],
      addTranscriptItem: (item) => set((state) => ({ transcript: [...state.transcript, item] })),
      clearTranscript: () => set({ transcript: [] }),
    }),
    {
      name: 'interview_session',
      partialize: (state) => ({ transcript: state.transcript, apiKey: state.apiKey, nodes: state.nodes, edges: state.edges }),
    }
  )
);
