import type { FlowNodeData, NodeCategory } from '../types/flow';
import { NODE_CATEGORIES } from '../types/flow';

const GENERATION_PROMPT = `You are an expert interview designer. Given a Job Description (JD) and optionally a candidate's resume, generate a structured interview flow as a JSON array.

Each element in the array must be an object with these fields:
- "category": one of "greeting", "fundamentals", "dsa", "coding", "system-design", "behavioral", "custom", "wrapup"
- "label": a short name for the stage
- "description": a brief description of what this stage covers
- Plus category-specific fields:
  - greeting: "tone" ("formal"|"casual"), "durationHint" (string)
  - fundamentals: "subjects" (string[]), "depth" ("basic"|"intermediate"|"advanced")
  - dsa: "topics" (string[]), "difficulty" ("easy"|"medium"|"hard"), "allowHints" (boolean)
  - coding: "language" (string), "problemType" ("implement"|"debug"|"optimize")
  - system-design: "scope" ("HLD"|"LLD"|"both"), "exampleSystems" (string[])
  - behavioral: "focusAreas" (string[])
  - custom: "instructions" (string)
  - wrapup: "allowCandidateQuestions" (boolean)

Rules:
1. Always start with a "greeting" node and end with a "wrapup" node.
2. Analyze the JD to determine which technical areas to test.
3. If a resume is provided, cross-reference skills to find areas to probe deeper.
4. Choose appropriate difficulty based on the seniority level in the JD.
5. Generate 4-8 stages total (including greeting and wrapup).
6. Only output the JSON array. No markdown, no explanation.`;

const VALID_CATEGORIES: NodeCategory[] = ['greeting', 'fundamentals', 'dsa', 'coding', 'system-design', 'behavioral', 'custom', 'wrapup'];

function validateNode(node: any): FlowNodeData | null {
  if (!node || typeof node !== 'object') return null;
  if (!VALID_CATEGORIES.includes(node.category)) return null;
  if (!node.label || typeof node.label !== 'string') return null;

  const meta = NODE_CATEGORIES.find(c => c.category === node.category);
  if (!meta) return null;

  return { ...meta.defaultData, ...node } as FlowNodeData;
}

export async function generateFlowFromJD(
  apiKey: string,
  jd: string,
  resume: string
): Promise<FlowNodeData[]> {
  const userContent = resume.trim()
    ? `[JOB DESCRIPTION]\n${jd}\n\n[CANDIDATE RESUME]\n${resume}`
    : `[JOB DESCRIPTION]\n${jd}`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          { role: 'user', parts: [{ text: `${GENERATION_PROMPT}\n\n${userContent}` }] },
        ],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.7,
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

  let parsed: any[];
  try {
    parsed = JSON.parse(text);
  } catch {
    const match = text.match(/\[[\s\S]*\]/);
    if (!match) throw new Error('Could not parse JSON from response');
    parsed = JSON.parse(match[0]);
  }

  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error('Invalid response format');
  }

  const nodes = parsed.map(validateNode).filter((n): n is FlowNodeData => n !== null);

  if (nodes.length === 0) {
    throw new Error('No valid nodes generated');
  }

  return nodes;
}
