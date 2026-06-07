import type { Node } from 'reactflow';
import type { FlowNodeData, NodeCategory, CompanyInfo } from '../types/flow';
import type { TranscriptItem } from '../components/TranscriptSidebar';
import type {
  EvaluationResult,
  HiringRecommendation,
  StageScore,
} from '../types/evaluation';

const VALID_RECOMMENDATIONS: HiringRecommendation[] = [
  'strong_hire',
  'hire',
  'lean_hire',
  'no_hire',
  'strong_no_hire',
];

interface CanonicalStage {
  stageId: string;
  label: string;
  category: NodeCategory;
  description: string;
}

function toCanonicalStages(nodes: Node[]): CanonicalStage[] {
  return nodes.map((node, i) => {
    const data = node.data as FlowNodeData;
    return {
      stageId: node.id || String(i + 1),
      label: data?.label || `Stage ${i + 1}`,
      category: (data?.category || 'custom') as NodeCategory,
      description: data?.description || '',
    };
  });
}

function buildEvaluationPrompt(
  stages: CanonicalStage[],
  candidateName: string,
  companyInfo: CompanyInfo | undefined,
  conversation: string
): string {
  const sections: string[] = [];

  sections.push(`You are a rigorous, calibrated senior technical hiring panelist. You are given the full transcript of a voice interview, the ordered list of planned interview stages, and company context. Evaluate the CANDIDATE's performance STAGE BY STAGE.`);

  if (companyInfo?.name) {
    const ctx = [
      '\n[COMPANY CONTEXT]',
      `Company: ${companyInfo.name}`,
      companyInfo.roleTitle ? `Role: ${companyInfo.roleTitle}` : '',
      companyInfo.techStack?.length ? `Tech Stack: ${companyInfo.techStack.join(', ')}` : '',
      companyInfo.description ? `About: ${companyInfo.description}` : '',
    ].filter(Boolean).join('\n');
    sections.push(ctx);
  }

  sections.push(`\n[CANDIDATE]\n${candidateName}`);

  const stageList = stages
    .map((s, i) => `${i + 1}. stageId="${s.stageId}" | category=${s.category} | "${s.label}"${s.description ? ` — ${s.description}` : ''}`)
    .join('\n');
  sections.push(`\n[PLANNED STAGES — in order]\n${stageList}`);

  sections.push(`\n[TRANSCRIPT]\n${conversation}`);

  sections.push(`\n[INSTRUCTIONS]
- The stages happened IN ORDER. Segment the conversation and attribute each part to the planned stage it belongs to.
- Score EACH stage from 0 to 100 based strictly on the CANDIDATE's responses and reasoning — NOT on the interviewer's questions.
- If a stage had little or no candidate input (e.g. the interview ended early or the candidate stayed silent), score it low (0-30) and say so explicitly.
- Be honest and calibrated. Do not inflate scores. An average candidate is ~60.
- Give a one- to two-sentence "feedback" per stage, grounded in specific things the candidate actually said.
- Provide a weighted "overallScore" (0-100), a "recommendation", and a 2-4 sentence "summary" explaining the recommendation.

Return ONLY a JSON object (no markdown, no prose) with this exact shape:
{
  "overallScore": <number 0-100>,
  "recommendation": "strong_hire" | "hire" | "lean_hire" | "no_hire" | "strong_no_hire",
  "summary": "<2-4 sentences>",
  "stages": [
    { "stageId": "<the provided stageId>", "score": <number 0-100>, "feedback": "<1-2 sentences>" }
  ]
}
Include exactly one entry in "stages" for every planned stage, using the provided stageId values.`);

  return sections.join('\n');
}

function clampScore(value: any): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function reconcileStages(stages: CanonicalStage[], rawStages: any[]): StageScore[] {
  return stages.map((stage, i) => {
    const match =
      rawStages.find((r) => r && String(r.stageId) === stage.stageId) ||
      rawStages[i];
    return {
      stageId: stage.stageId,
      label: stage.label,
      category: stage.category,
      score: match ? clampScore(match.score) : 0,
      feedback:
        match && typeof match.feedback === 'string' && match.feedback.trim()
          ? match.feedback.trim()
          : 'No candidate input was recorded for this stage.',
    };
  });
}

export async function evaluateInterview(
  apiKey: string,
  nodes: Node[],
  transcript: TranscriptItem[],
  candidateName: string,
  companyInfo?: CompanyInfo
): Promise<EvaluationResult> {
  if (!apiKey) {
    throw new Error('Missing Gemini API key. Configure it in settings.');
  }
  if (!transcript || transcript.length === 0) {
    throw new Error('The transcript is empty — there is nothing to evaluate.');
  }

  const stages = toCanonicalStages(nodes);
  const conversation = transcript
    .map((t) => `${t.sender === 'user' ? 'CANDIDATE' : 'INTERVIEWER'}: ${t.text}`)
    .join('\n');

  const prompt = buildEvaluationPrompt(stages, candidateName, companyInfo, conversation);

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.3,
        },
      }),
    }
  );

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Gemini API error: ${response.status} - ${err}`);
  }

  const result = await response.json();
  const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error('No content returned from Gemini');
  }

  let parsed: any;
  try {
    parsed = JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('Could not parse evaluation JSON from response');
    parsed = JSON.parse(match[0]);
  }

  const rawStages = Array.isArray(parsed.stages) ? parsed.stages : [];
  const recommendation: HiringRecommendation = VALID_RECOMMENDATIONS.includes(parsed.recommendation)
    ? parsed.recommendation
    : 'lean_hire';

  return {
    overallScore: clampScore(parsed.overallScore),
    recommendation,
    summary:
      typeof parsed.summary === 'string' && parsed.summary.trim()
        ? parsed.summary.trim()
        : 'No summary was generated.',
    stages: reconcileStages(stages, rawStages),
    generatedAt: Date.now(),
  };
}
