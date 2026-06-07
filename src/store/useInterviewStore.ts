import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Node, Edge } from 'reactflow';
import type { TranscriptItem } from '../components/TranscriptSidebar';
import type { CompanyInfo, InterviewerConfig } from '../types/flow';
import { DEFAULT_COMPANY_INFO, DEFAULT_INTERVIEWER_CONFIG } from '../types/flow';
import type { EvaluationResult } from '../types/evaluation';
import type { ProctorEvent } from '../types/proctor';

export interface FlowNavActions {
  onCompanyInfo: () => void;
  onInterviewerConfig: () => void;
  onGenerateLink: () => void;
  onGenerateAI: () => void;
}

export interface InterviewStore {
  apiKey: string;
  setApiKey: (key: string) => void;
  nodes: Node[];
  edges: Edge[];
  setNodes: (nodes: Node[] | ((val: Node[]) => Node[])) => void;
  setEdges: (edges: Edge[] | ((val: Edge[]) => Edge[])) => void;
  companyInfo: CompanyInfo;
  setCompanyInfo: (info: CompanyInfo) => void;
  interviewerConfig: InterviewerConfig;
  setInterviewerConfig: (config: InterviewerConfig) => void;
  transcript: TranscriptItem[];
  addTranscriptItem: (item: TranscriptItem) => void;
  clearTranscript: () => void;
  /** Snapshot of the stages used in the most recent live session (may come from an invite link). */
  sessionNodes: Node[];
  setSessionNodes: (nodes: Node[]) => void;
  evaluation: EvaluationResult | null;
  setEvaluation: (evaluation: EvaluationResult | null) => void;
  proctorEvents: ProctorEvent[];
  addProctorEvent: (event: ProctorEvent) => void;
  clearProctorEvents: () => void;
  isSessionActive: boolean;
  setSessionActive: (active: boolean) => void;
  flowNavActions: FlowNavActions | null;
  setFlowNavActions: (actions: FlowNavActions | null) => void;
}

const initialNodes: Node[] = [
  { id: '1', type: 'custom', position: { x: 250, y: 50 }, data: { category: 'greeting', label: 'Greeting', description: 'Introduction and ice breakers', tone: 'formal', durationHint: '2-3 min' } },
  { id: '2', type: 'custom', position: { x: 250, y: 180 }, data: { category: 'fundamentals', label: 'Technical Screening', description: 'Assess coding and logic', subjects: [], depth: 'intermediate' } },
  { id: '3', type: 'custom', position: { x: 250, y: 310 }, data: { category: 'behavioral', label: 'Behavioral', description: 'Culture fit & past experience', focusAreas: [] } },
  { id: '4', type: 'custom', position: { x: 250, y: 440 }, data: { category: 'wrapup', label: 'Wrap-up', description: 'Questions for us & closing', allowCandidateQuestions: true } },
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
      companyInfo: DEFAULT_COMPANY_INFO,
      setCompanyInfo: (info) => set({ companyInfo: info }),
      interviewerConfig: DEFAULT_INTERVIEWER_CONFIG,
      setInterviewerConfig: (config) => set({ interviewerConfig: config }),
      transcript: [],
      addTranscriptItem: (item) => set((state) => ({ transcript: [...state.transcript, item] })),
      clearTranscript: () => set({ transcript: [] }),
      sessionNodes: [],
      setSessionNodes: (nodes) => set({ sessionNodes: nodes }),
      evaluation: null,
      setEvaluation: (evaluation) => set({ evaluation }),
      proctorEvents: [],
      addProctorEvent: (event) => set((state) => ({ proctorEvents: [...state.proctorEvents, event] })),
      clearProctorEvents: () => set({ proctorEvents: [] }),
      isSessionActive: false,
      setSessionActive: (active) => set({ isSessionActive: active }),
      flowNavActions: null,
      setFlowNavActions: (actions) => set({ flowNavActions: actions }),
    }),
    {
      name: 'interview_session',
      partialize: (state) => ({
        transcript: state.transcript,
        apiKey: state.apiKey,
        nodes: state.nodes,
        edges: state.edges,
        companyInfo: state.companyInfo,
        interviewerConfig: state.interviewerConfig,
        sessionNodes: state.sessionNodes,
        evaluation: state.evaluation,
        proctorEvents: state.proctorEvents,
      }),
    }
  )
);
