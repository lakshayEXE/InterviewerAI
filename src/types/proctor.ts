export type ProctorEventType =
  | 'fullscreen-exit'
  | 'tab-hidden'
  | 'window-blur'
  | 'paste'
  | 'multi-monitor'
  | 'no-face'
  | 'multiple-faces'
  | 'looking-away';

export type ProctorSeverity = 'low' | 'medium' | 'high';

export type ProctorSource = 'behavioral' | 'ml' | 'gemini';

export interface ProctorEvent {
  id: string;
  type: ProctorEventType;
  severity: ProctorSeverity;
  source: ProctorSource;
  message: string;
  timestamp: number;
  /** True when a Gemini snapshot confirmed the suspicion. */
  confirmed?: boolean;
}

export interface ProctorEventMeta {
  label: string;
  icon: string;
  severity: ProctorSeverity;
  /** Whether this is a "soft" / ambiguous event that should trigger a casual AI check-in. */
  soft: boolean;
}

export const PROCTOR_EVENT_META: Record<ProctorEventType, ProctorEventMeta> = {
  'fullscreen-exit': { label: 'Exited fullscreen', icon: '🖥️', severity: 'high', soft: false },
  'tab-hidden': { label: 'Switched tab / minimized', icon: '🔀', severity: 'high', soft: false },
  'window-blur': { label: 'Left the interview window', icon: '↗️', severity: 'medium', soft: false },
  'paste': { label: 'Pasted code', icon: '📋', severity: 'high', soft: false },
  'multi-monitor': { label: 'Multiple displays detected', icon: '🖥️', severity: 'low', soft: false },
  'no-face': { label: 'No face detected', icon: '🚫', severity: 'medium', soft: true },
  'multiple-faces': { label: 'Multiple faces detected', icon: '👥', severity: 'high', soft: false },
  'looking-away': { label: 'Looking away from screen', icon: '👀', severity: 'medium', soft: true },
};

/** Penalty weights used to compute the integrity score (100 - sum). */
export const PROCTOR_SEVERITY_PENALTY: Record<ProctorSeverity, number> = {
  low: 3,
  medium: 8,
  high: 15,
};
