import type { ProctorEventType } from '../types/proctor';

const SUSPICION_PROMPT: Partial<Record<ProctorEventType, string>> = {
  'no-face': 'The candidate may have left their seat or covered the camera.',
  'multiple-faces': 'There may be more than one person visible.',
  'looking-away': 'The candidate may be looking away from the screen (e.g. at notes or another device).',
};

export interface ConfirmResult {
  confirmed: boolean;
  note: string;
}

// When Gemini returns 429 (Too Many Requests), skip vision calls entirely for
// this long. Avoids hammering the API while quota is exhausted, since we're
// already storing the on-device ML event regardless.
const QUOTA_BACKOFF_MS = 120_000;
let backoffUntil = 0;

export const isVisionBackedOff = () => Date.now() < backoffUntil;

/**
 * Sends a single JPEG frame to Gemini to confirm a suspicion flagged by the
 * on-device detector. Called rarely (rate-limited by the caller) to keep cost low.
 * `jpegBase64` must be the raw base64 (no data: prefix).
 */
export async function confirmFrame(
  apiKey: string,
  jpegBase64: string,
  type: ProctorEventType
): Promise<ConfirmResult> {
  if (!apiKey || !jpegBase64) {
    return { confirmed: false, note: '' };
  }

  if (isVisionBackedOff()) {
    return { confirmed: false, note: '' };
  }

  const context = SUSPICION_PROMPT[type] || 'Possible suspicious behavior was detected.';
  const prompt = `You are an exam proctor reviewing a single webcam frame from a live technical interview. ${context}
Looking ONLY at this image, decide whether the concern is clearly visible. Be conservative: if it is ambiguous or could be innocent, say it is NOT confirmed.
Return ONLY JSON: { "confirmed": boolean, "note": "<short, factual, one sentence>" }`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [
                { text: prompt },
                { inlineData: { mimeType: 'image/jpeg', data: jpegBase64 } },
              ],
            },
          ],
          generationConfig: { responseMimeType: 'application/json', temperature: 0.1 },
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        backoffUntil = Date.now() + QUOTA_BACKOFF_MS;
        console.warn(
          `Proctor vision quota exhausted (429). Pausing confirmations for ${
            QUOTA_BACKOFF_MS / 1000
          }s.`
        );
      }
      return { confirmed: false, note: '' };
    }

    const result = await response.json();
    const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return { confirmed: false, note: '' };

    let parsed: { confirmed?: boolean; note?: string };
    try {
      parsed = JSON.parse(text);
    } catch {
      const match = text.match(/\{[\s\S]*\}/);
      if (!match) return { confirmed: false, note: '' };
      parsed = JSON.parse(match[0]);
    }

    return {
      confirmed: parsed.confirmed === true,
      note: typeof parsed.note === 'string' ? parsed.note.trim() : '',
    };
  } catch (err) {
    console.error('Proctor vision confirmation failed:', err);
    return { confirmed: false, note: '' };
  }
}
