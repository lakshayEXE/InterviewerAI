import type { NodeCategory } from './flow';

export type HiringRecommendation =
  | 'strong_hire'
  | 'hire'
  | 'lean_hire'
  | 'no_hire'
  | 'strong_no_hire';

export interface StageScore {
  stageId: string;
  label: string;
  category: NodeCategory;
  /** 0-100 score for the candidate's performance in this stage. */
  score: number;
  /** One- or two-sentence justification grounded in what the candidate said. */
  feedback: string;
}

export interface EvaluationResult {
  /** 0-100 weighted overall score. */
  overallScore: number;
  recommendation: HiringRecommendation;
  /** 2-4 sentence rationale behind the recommendation. */
  summary: string;
  stages: StageScore[];
  /** Epoch ms when this evaluation was generated. */
  generatedAt: number;
}

export const RECOMMENDATION_META: Record<
  HiringRecommendation,
  { label: string; color: string }
> = {
  strong_hire: { label: 'Strong Hire', color: '#4ade80' },
  hire: { label: 'Hire', color: '#60a5fa' },
  lean_hire: { label: 'Lean Hire', color: '#facc15' },
  no_hire: { label: 'No Hire', color: '#fb923c' },
  strong_no_hire: { label: 'Strong No Hire', color: '#f87171' },
};
