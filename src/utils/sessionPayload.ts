import type { Node } from 'reactflow';
import type { InterviewerConfig, CompanyInfo } from '../types/flow';

export interface SessionPayload {
  nodes: Node[];
  config?: InterviewerConfig;
  companyInfo?: CompanyInfo;
}

// UTF-8 safe base64 so custom-instruction / company text with non-ASCII survives.
function toBase64(str: string): string {
  return btoa(
    encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_, p1) =>
      String.fromCharCode(parseInt(p1, 16))
    )
  );
}

function fromBase64(b64: string): string {
  return decodeURIComponent(
    atob(b64)
      .split('')
      .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
      .join('')
  );
}

export function encodeSessionPayload(payload: SessionPayload): string {
  return toBase64(JSON.stringify(payload));
}

export function decodeSessionPayload(data: string): SessionPayload | null {
  try {
    const parsed = JSON.parse(fromBase64(data));
    // Legacy format: a bare array of nodes.
    if (Array.isArray(parsed)) {
      return { nodes: parsed };
    }
    // New format: { nodes, config, companyInfo }.
    if (parsed && Array.isArray(parsed.nodes)) {
      return {
        nodes: parsed.nodes,
        config: parsed.config,
        companyInfo: parsed.companyInfo,
      };
    }
    return null;
  } catch (e) {
    console.error('Invalid session payload', e);
    return null;
  }
}
