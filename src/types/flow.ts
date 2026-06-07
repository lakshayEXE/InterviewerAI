export type NodeCategory =
  | 'greeting'
  | 'fundamentals'
  | 'dsa'
  | 'coding'
  | 'system-design'
  | 'behavioral'
  | 'custom'
  | 'wrapup';

export interface BaseNodeData {
  category: NodeCategory;
  label: string;
  description: string;
}

export interface GreetingNodeData extends BaseNodeData {
  category: 'greeting';
  tone: 'formal' | 'casual';
  durationHint: string;
}

export interface FundamentalsNodeData extends BaseNodeData {
  category: 'fundamentals';
  subjects: string[];
  depth: 'basic' | 'intermediate' | 'advanced';
}

export interface DSANodeData extends BaseNodeData {
  category: 'dsa';
  topics: string[];
  difficulty: 'easy' | 'medium' | 'hard';
  allowHints: boolean;
}

export interface CodingNodeData extends BaseNodeData {
  category: 'coding';
  language: string;
  problemType: 'implement' | 'debug' | 'optimize';
}

export interface SystemDesignNodeData extends BaseNodeData {
  category: 'system-design';
  scope: 'HLD' | 'LLD' | 'both';
  exampleSystems: string[];
}

export interface BehavioralNodeData extends BaseNodeData {
  category: 'behavioral';
  focusAreas: string[];
}

export interface CustomNodeData extends BaseNodeData {
  category: 'custom';
  instructions: string;
}

export interface WrapupNodeData extends BaseNodeData {
  category: 'wrapup';
  allowCandidateQuestions: boolean;
}

export type FlowNodeData =
  | GreetingNodeData
  | FundamentalsNodeData
  | DSANodeData
  | CodingNodeData
  | SystemDesignNodeData
  | BehavioralNodeData
  | CustomNodeData
  | WrapupNodeData;

export interface CompanyInfo {
  name: string;
  description: string;
  techStack: string[];
  roleTitle: string;
  additionalContext: string;
}

export const DEFAULT_COMPANY_INFO: CompanyInfo = {
  name: '',
  description: '',
  techStack: [],
  roleTitle: '',
  additionalContext: '',
};

export type InterviewerDemeanor = 'friendly' | 'balanced' | 'strict';

export interface InterviewerConfig {
  demeanor: InterviewerDemeanor;
  customInstructions: string;
  voiceName: string;
  languageCode: string;
}

export const DEFAULT_INTERVIEWER_CONFIG: InterviewerConfig = {
  demeanor: 'friendly',
  customInstructions: '',
  voiceName: 'Kore',
  languageCode: 'en-IN',
};

export interface DemeanorPresetMeta {
  id: InterviewerDemeanor;
  label: string;
  icon: string;
  description: string;
}

export const DEMEANOR_PRESETS: DemeanorPresetMeta[] = [
  {
    id: 'friendly',
    label: 'Friendly & Supportive',
    icon: '😊',
    description: 'Warm, encouraging and patient. Offers hints and puts the candidate at ease.',
  },
  {
    id: 'balanced',
    label: 'Balanced',
    icon: '⚖️',
    description: 'Professional and neutral. Fair and direct, hints only after a real attempt.',
  },
  {
    id: 'strict',
    label: 'Strict & Challenging',
    icon: '🎯',
    description: 'Rigorous with a high bar. Probes deeply and rarely gives hints.',
  },
];

export interface VoiceOption {
  name: string;
  label: string;
  gender: 'female' | 'male';
}

export const INTERVIEWER_VOICES: VoiceOption[] = [
  { name: 'Kore', label: 'Kore', gender: 'female' },
  { name: 'Aoede', label: 'Aoede', gender: 'female' },
  { name: 'Leda', label: 'Leda', gender: 'female' },
  { name: 'Zephyr', label: 'Zephyr', gender: 'female' },
  { name: 'Callirrhoe', label: 'Callirrhoe', gender: 'female' },
  { name: 'Puck', label: 'Puck', gender: 'male' },
  { name: 'Orus', label: 'Orus', gender: 'male' },
  { name: 'Charon', label: 'Charon', gender: 'male' },
];

export interface VoiceLanguageOption {
  code: string;
  label: string;
}

export const VOICE_LANGUAGES: VoiceLanguageOption[] = [
  { code: 'en-IN', label: 'English (Indian accent)' },
  { code: 'hi-IN', label: 'Hindi (India)' },
  { code: 'en-US', label: 'English (US)' },
  { code: 'en-GB', label: 'English (UK)' },
  { code: 'es-US', label: 'Spanish (US)' },
  { code: 'fr-FR', label: 'French (France)' },
  { code: 'de-DE', label: 'German (Germany)' },
];

export interface NodeCategoryMeta {
  category: NodeCategory;
  label: string;
  icon: string;
  color: string;
  group: 'start-end' | 'technical' | 'soft-skills' | 'other';
  defaultData: FlowNodeData;
}

export const NODE_CATEGORIES: NodeCategoryMeta[] = [
  {
    category: 'greeting',
    label: 'Greeting',
    icon: '👋',
    color: '#4ade80',
    group: 'start-end',
    defaultData: {
      category: 'greeting',
      label: 'Greeting',
      description: 'Introduction and ice breakers',
      tone: 'formal',
      durationHint: '2-3 min',
    },
  },
  {
    category: 'fundamentals',
    label: 'Fundamentals',
    icon: '📚',
    color: '#60a5fa',
    group: 'technical',
    defaultData: {
      category: 'fundamentals',
      label: 'Fundamentals',
      description: 'Test core CS fundamentals',
      subjects: [],
      depth: 'intermediate',
    },
  },
  {
    category: 'dsa',
    label: 'DSA',
    icon: '🧩',
    color: '#f472b6',
    group: 'technical',
    defaultData: {
      category: 'dsa',
      label: 'DSA',
      description: 'Data structures & algorithms',
      topics: [],
      difficulty: 'medium',
      allowHints: false,
    },
  },
  {
    category: 'coding',
    label: 'Live Coding',
    icon: '💻',
    color: '#a78bfa',
    group: 'technical',
    defaultData: {
      category: 'coding',
      label: 'Live Coding',
      description: 'Hands-on coding challenge',
      language: '',
      problemType: 'implement',
    },
  },
  {
    category: 'system-design',
    label: 'System Design',
    icon: '🏗️',
    color: '#fb923c',
    group: 'technical',
    defaultData: {
      category: 'system-design',
      label: 'System Design',
      description: 'Architecture and design discussion',
      scope: 'HLD',
      exampleSystems: [],
    },
  },
  {
    category: 'behavioral',
    label: 'Behavioral',
    icon: '🤝',
    color: '#facc15',
    group: 'soft-skills',
    defaultData: {
      category: 'behavioral',
      label: 'Behavioral',
      description: 'Culture fit & past experience',
      focusAreas: [],
    },
  },
  {
    category: 'custom',
    label: 'Custom Stage',
    icon: '✏️',
    color: '#94a3b8',
    group: 'other',
    defaultData: {
      category: 'custom',
      label: 'Custom Stage',
      description: '',
      instructions: '',
    },
  },
  {
    category: 'wrapup',
    label: 'Wrap-up',
    icon: '🎬',
    color: '#2dd4bf',
    group: 'start-end',
    defaultData: {
      category: 'wrapup',
      label: 'Wrap-up',
      description: 'Closing and candidate questions',
      allowCandidateQuestions: true,
    },
  },
];

export const FUNDAMENTALS_SUBJECTS = [
  'OOPs', 'DBMS', 'Operating Systems', 'Computer Networks',
  'Software Engineering', 'Compiler Design', 'Theory of Computation',
];

export const DSA_TOPICS = [
  'Arrays', 'Strings', 'Linked Lists', 'Stacks & Queues',
  'Trees', 'Graphs', 'Dynamic Programming', 'Greedy',
  'Hashing', 'Sorting & Searching', 'Recursion', 'Bit Manipulation',
];

export const BEHAVIORAL_AREAS = [
  'Leadership', 'Conflict Resolution', 'Teamwork',
  'Communication', 'Problem Solving', 'Adaptability',
  'Time Management', 'Decision Making',
];
