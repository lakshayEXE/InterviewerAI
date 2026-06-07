import type { FlowNodeData, CompanyInfo, InterviewerConfig, InterviewerDemeanor } from '../types/flow';
import { DEFAULT_INTERVIEWER_CONFIG } from '../types/flow';
import type { Node } from 'reactflow';

const CODING_PATIENCE = `\n  PATIENCE: After posing the problem, expect the candidate to think out loud and type their solution over MULTIPLE turns. Do NOT expect a complete or correct answer in one shot. Stay silent while they are thinking or typing — do not interrupt their flow or prompt them repeatedly. Only respond when they pause and look to you for feedback, or after a clearly long silence to check if they want a hint.`;

function nodeToPrompt(data: FlowNodeData, index: number): string {
  const phaseNum = index + 1;

  switch (data.category) {
    case 'greeting': {
      const tone = data.tone === 'casual' ? 'Keep it casual and friendly' : 'Maintain a professional tone';
      return `Phase ${phaseNum} — ${data.label}:\n  ${tone}. Duration: ~${data.durationHint}.\n  ${data.description}`;
    }
    case 'fundamentals': {
      const subjects = data.subjects.length > 0 ? data.subjects.join(', ') : 'general CS fundamentals';
      return `Phase ${phaseNum} — ${data.label}:\n  Test the candidate on: ${subjects}\n  Depth: ${data.depth} — ${getDepthGuidance(data.depth)}\n  ${data.description}`;
    }
    case 'dsa': {
      const topics = data.topics.length > 0 ? data.topics.join(', ') : 'general DSA';
      const hints = data.allowHints ? 'You may provide small hints if stuck.' : 'Do NOT provide hints unless they are completely stuck after multiple attempts.';
      return `Phase ${phaseNum} — ${data.label}:\n  Topics: ${topics}\n  Difficulty: ${data.difficulty}\n  ${hints}\n  ${data.description}${CODING_PATIENCE}`;
    }
    case 'coding': {
      const lang = data.language || 'any language of their choice';
      const typeMap = { implement: 'implement a solution from scratch', debug: 'find and fix bugs in given code', optimize: 'optimize an existing solution' };
      return `Phase ${phaseNum} — ${data.label}:\n  Language: ${lang}\n  Task type: ${typeMap[data.problemType]}\n  ${data.description}${CODING_PATIENCE}`;
    }
    case 'system-design': {
      const scopeMap = { HLD: 'High-Level Design only', LLD: 'Low-Level Design only', both: 'Both HLD and LLD' };
      const systems = data.exampleSystems.length > 0 ? `Example systems to discuss: ${data.exampleSystems.join(', ')}` : '';
      return `Phase ${phaseNum} — ${data.label}:\n  Scope: ${scopeMap[data.scope]}\n  ${systems}\n  ${data.description}`;
    }
    case 'behavioral': {
      const areas = data.focusAreas.length > 0 ? `Focus areas: ${data.focusAreas.join(', ')}` : 'General behavioral assessment';
      return `Phase ${phaseNum} — ${data.label}:\n  ${areas}\n  ${data.description}`;
    }
    case 'custom': {
      return `Phase ${phaseNum} — ${data.label}:\n  ${data.instructions || data.description}`;
    }
    case 'wrapup': {
      const cq = data.allowCandidateQuestions ? 'Allow the candidate to ask questions about the role/company.' : '';
      return `Phase ${phaseNum} — ${data.label}:\n  ${cq}\n  ${data.description}`;
    }
    default:
      return `Phase ${phaseNum} — ${(data as FlowNodeData).label}:\n  ${(data as FlowNodeData).description}`;
  }
}

function getDepthGuidance(depth: string): string {
  switch (depth) {
    case 'basic': return 'expect definitions and simple examples';
    case 'intermediate': return 'expect explanations with trade-offs and use cases';
    case 'advanced': return 'expect deep understanding, edge cases, and real-world applications';
    default: return '';
  }
}

function buildPersonaLine(candidateName: string, config: InterviewerConfig): string {
  const isIndianEnglish = config.languageCode.startsWith('en-IN');
  const isHindi = config.languageCode.startsWith('hi');

  let identity = 'a senior technical interviewer';
  if (isIndianEnglish) {
    identity = 'a warm, articulate Indian woman in her early 30s working as a senior technical interviewer, speaking in natural Indian English';
  } else if (isHindi) {
    identity = 'a warm, articulate Indian woman in her early 30s working as a senior technical interviewer';
  }

  return `You are ${identity}. The candidate's name is ${candidateName}. Greet them briefly and warmly, then start Phase 1.`;
}

function buildBehaviorRules(demeanor: InterviewerDemeanor): string {
  const common = [
    'Follow the interview phases IN ORDER. Complete each phase before moving to the next.',
    'Ask exactly ONE question at a time, then stop talking and wait for the candidate to respond.',
    'Keep every spoken turn very short (1-3 sentences). Do not lecture or monologue.',
    'Always be respectful and humble. NEVER be rude, condescending, dismissive, or demeaning.',
    'Do not simply hand over the full answer; guide the candidate toward it instead.',
    'Wait patiently for the candidate to finish speaking or writing code before responding.',
  ];

  let demeanorRules: string[];
  switch (demeanor) {
    case 'friendly':
      demeanorRules = [
        'Be warm, encouraging, and patient throughout. Your goal is to help the candidate feel comfortable and perform at their best.',
        'Acknowledge good points and effort. Celebrate small wins.',
        'When an answer is wrong or code is buggy, point it out gently and kindly, then nudge them in the right direction.',
        'Offer a helpful hint whenever the candidate seems stuck or unsure. Do not let them flounder.',
        'Use a relaxed, conversational tone. Avoid harsh cross-examination.',
      ];
      break;
    case 'strict':
      demeanorRules = [
        'Maintain a rigorous, high bar. Be professional and direct, but never disrespectful.',
        'When an answer is wrong or code is buggy, call out the flaw clearly and ask the candidate to fix it.',
        'Cross-question the candidate. Probe their reasoning with "Why?" and follow-up questions.',
        'Avoid giving hints; let the candidate work through the problem themselves unless they are completely stuck after multiple genuine attempts.',
      ];
      break;
    case 'balanced':
    default:
      demeanorRules = [
        'Be professional, neutral, and fair. Stay clear and direct without being cold.',
        'When an answer is wrong or code is buggy, point out the flaw politely and ask the candidate to address it.',
        'Probe their reasoning where it helps you assess them.',
        'Offer a hint only after the candidate has made a genuine attempt and is clearly stuck.',
      ];
      break;
  }

  const all = [...demeanorRules, ...common].map((rule, i) => `${i + 1}. ${rule}`);
  return all.join('\n');
}

export function buildSystemPrompt(
  nodes: Node[],
  candidateName: string,
  companyInfo?: CompanyInfo,
  config: InterviewerConfig = DEFAULT_INTERVIEWER_CONFIG
): string {
  const sections: string[] = [];

  sections.push(buildPersonaLine(candidateName, config));

  if (companyInfo && companyInfo.name) {
    const companySection = [
      '\n[COMPANY CONTEXT]',
      `Company: ${companyInfo.name}`,
      companyInfo.roleTitle ? `Role: ${companyInfo.roleTitle}` : '',
      companyInfo.techStack.length > 0 ? `Tech Stack: ${companyInfo.techStack.join(', ')}` : '',
      companyInfo.description ? `About: ${companyInfo.description}` : '',
      companyInfo.additionalContext ? `Notes: ${companyInfo.additionalContext}` : '',
      'Use this context if the candidate asks about the company. Never hallucinate company information.',
    ].filter(Boolean).join('\n');
    sections.push(companySection);
  }

  const phaseInstructions = nodes.map((node, i) => {
    const data = node.data as FlowNodeData;
    return nodeToPrompt(data, i);
  }).join('\n\n');

  sections.push(`\n[INTERVIEW PHASES]\n${phaseInstructions}`);

  sections.push(`\n[INTERVIEWER BEHAVIOR]\n${buildBehaviorRules(config.demeanor)}`);

  sections.push(`\n[CONVERSATION PACING - VERY IMPORTANT]
This is a real-time spoken interview. Talking too much or jumping in too fast ruins it.
1. Ask EXACTLY ONE question at a time, then STOP and wait. Never stack multiple questions in a single turn.
2. Keep every spoken turn very short — 1 to 3 sentences. Do not lecture, monologue, or over-explain.
3. After you ask something, say nothing more until the candidate has answered. NEVER answer your own question and NEVER fill the silence.
4. Treat pauses as thinking time. Do NOT jump in the instant the candidate stops talking — allow several seconds of silence for them to think and gather their thoughts.
5. Only gently check in (e.g. "Take your time" or "Let me know when you're ready") after a clearly long silence.
6. Let the candidate finish their thought completely before you speak.`);

  sections.push(`\n[PROCTORING]
Occasionally you may receive a message tagged [PROCTOR EVENT: ...]. This is an automated, often imperfect signal that the candidate may be distracted. Treat it gently: if it fits naturally, give a warm, casual check-in like "everything okay?" or "take your time". NEVER accuse the candidate of cheating, never mention cameras or monitoring, and never let it derail the interview. If you are in the middle of something, you may ignore it.`);

  if (config.customInstructions && config.customInstructions.trim()) {
    sections.push(`\n[ADDITIONAL INTERVIEWER INSTRUCTIONS]\n${config.customInstructions.trim()}`);
  }

  return sections.join('\n');
}
