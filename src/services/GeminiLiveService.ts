export interface GeminiMessage {
  text: string;
  sender: 'ai' | 'user';
  timestamp: number;
}

export class GeminiLiveService {
  private ws: WebSocket | null = null;
  private url: string = 'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent';
  private apiKey: string = '';

  public onAudioData: ((base64Data: string) => void) | null = null;
  // Fires once per completed utterance, for both the candidate (user) and the AI interviewer.
  public onTranscript: ((sender: 'ai' | 'user', text: string) => void) | null = null;
  public onConnectionStateChange: ((connected: boolean) => void) | null = null;
  // Fires when the model reports (via the set_current_question tool) the current question/problem.
  public onQuestion: ((question: string) => void) | null = null;
  // Fires when the model loads starter code into the editor (via the set_editor_code tool).
  public onEditorCode: ((code: string, language: string) => void) | null = null;

  // Accumulate streaming transcription chunks until an utterance is complete.
  private userBuffer: string = '';
  private aiBuffer: string = '';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  connect(systemInstructions: string, voice?: { voiceName?: string; languageCode?: string }) {
    if (!this.apiKey) {
      console.error("No API key provided for GeminiLiveService.");
      return;
    }

    if (this.ws) {
      this.ws.close();
    }

    const wsUrl = `${this.url}?key=${this.apiKey}`;
    const ws = new WebSocket(wsUrl);
    this.ws = ws;

    ws.onopen = () => {
      console.log("WebSocket connected. Sending setup message...");
      this.onConnectionStateChange?.(true);

      const speechConfig: any = {};
      if (voice?.voiceName) {
        speechConfig.voiceConfig = { prebuiltVoiceConfig: { voiceName: voice.voiceName } };
      }
      if (voice?.languageCode) {
        speechConfig.languageCode = voice.languageCode;
      }

      const setupMessage = {
        setup: {
          model: "models/gemini-3.1-flash-live-preview",
          generationConfig: {
            responseModalities: ["AUDIO"],
            temperature: 1.0,
            ...(Object.keys(speechConfig).length > 0 ? { speechConfig } : {}),
          },
          systemInstruction: {
            parts: [{ text: systemInstructions }]
          },
          tools: [{
            functionDeclarations: [
              {
                name: "set_current_question",
                description: "Call this every time you ask the candidate a new question or pose a new coding/DSA problem, so it can be displayed on their screen. Pass the clean, self-contained question or problem statement without greetings, acknowledgments, or feedback.",
                parameters: {
                  type: "object",
                  properties: {
                    question: {
                      type: "string",
                      description: "The exact question or problem statement to show the candidate."
                    }
                  },
                  required: ["question"]
                }
              },
              {
                name: "set_editor_code",
                description: "Load starter code into the candidate's code editor. Use this for debug tasks (provide code with a genuine bug to find and fix) or optimize tasks (provide working but suboptimal code to improve). The editor opens automatically and the candidate edits the code in place.",
                parameters: {
                  type: "object",
                  properties: {
                    code: {
                      type: "string",
                      description: "The starter code to place in the editor."
                    },
                    language: {
                      type: "string",
                      description: "The programming language id, one of: javascript, typescript, python, java, cpp, go, rust."
                    }
                  },
                  required: ["code", "language"]
                }
              }
            ]
          }],
          outputAudioTranscription: { },
          inputAudioTranscription: { },
          // Be patient: tolerate longer thinking pauses before treating the candidate as done.
          realtimeInputConfig: {
            automaticActivityDetection: {
              startOfSpeechSensitivity: "START_SENSITIVITY_LOW",
              endOfSpeechSensitivity: "END_SENSITIVITY_LOW",
              prefixPaddingMs: 300,
              silenceDurationMs: 1800
            }
          }
        }
      };

      ws.send(JSON.stringify(setupMessage));
    };

    ws.onmessage = async (event) => {
      let data = event.data;
      if (data instanceof Blob) {
        data = await data.text();
      }
      this.handleIncomingMessage(data);
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    ws.onclose = (event) => {
      console.log(`WebSocket closed. Code: ${event.code}, Reason: ${event.reason}`);
      this.onConnectionStateChange?.(false);
      if (this.ws === ws) {
        this.ws = null;
      }
    };
  }

  private isSetupComplete: boolean = false;

  private handleIncomingMessage(data: any) {
    try {
      const parsed = typeof data === 'string' ? JSON.parse(data) : data;
      
      // If the API returns an array of messages, process each one
      if (Array.isArray(parsed)) {
        parsed.forEach(msg => this.handleIncomingMessage(msg));
        return;
      }

      if (parsed.setupComplete) {
        console.log("Setup complete. Ready for audio streaming.");
        this.isSetupComplete = true;
      }

      // Look for serverContent
      if (parsed.serverContent) {
        const sc = parsed.serverContent;

        // Candidate's speech transcription (from inputAudioTranscription).
        // Streams in chunks, so accumulate until the candidate's turn is over.
        if (sc.inputTranscription?.text) {
          this.userBuffer += sc.inputTranscription.text;
        }

        // AI interviewer's speech transcription (from outputAudioTranscription).
        // When the model starts speaking, the candidate has finished — flush their turn first.
        if (sc.outputTranscription?.text) {
          this.flushUser();
          this.aiBuffer += sc.outputTranscription.text;
        }

        // Audio playback (and a fallback for any text parts the model still emits).
        if (sc.modelTurn?.parts) {
          for (const part of sc.modelTurn.parts) {
            if (part.inlineData && part.inlineData.mimeType?.startsWith('audio/pcm')) {
              this.onAudioData?.(part.inlineData.data);
            }
            if (part.text) {
              this.flushUser();
              this.aiBuffer += part.text;
            }
          }
        }

        // End of the model's turn: commit whatever is buffered for both sides.
        if (sc.turnComplete) {
          this.flushUser();
          this.flushAi();
        }
      }

      // Structured tool calls from the model (silent — not part of the spoken audio).
      if (parsed.toolCall?.functionCalls) {
        this.handleToolCalls(parsed.toolCall.functionCalls);
      }
    } catch (err) {
      console.error("Failed to parse incoming WS message", err);
    }
  }

  private handleToolCalls(functionCalls: any[]) {
    const responses: any[] = [];
    for (const fc of functionCalls) {
      if (fc?.name === 'set_current_question') {
        const question = typeof fc.args?.question === 'string' ? fc.args.question.trim() : '';
        if (question) this.onQuestion?.(question);
      } else if (fc?.name === 'set_editor_code') {
        const code = typeof fc.args?.code === 'string' ? fc.args.code : '';
        const language = typeof fc.args?.language === 'string' ? fc.args.language : '';
        if (code) this.onEditorCode?.(code, language);
      }
      // Always acknowledge so the model doesn't stall waiting for a function result.
      responses.push({ id: fc?.id, name: fc?.name, response: { result: 'ok' } });
    }
    if (responses.length && this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ toolResponse: { functionResponses: responses } }));
    }
  }

  private flushUser() {
    const text = this.userBuffer.trim();
    this.userBuffer = '';
    if (text) this.onTranscript?.('user', text);
  }

  private flushAi() {
    const text = this.aiBuffer.trim();
    this.aiBuffer = '';
    if (text) this.onTranscript?.('ai', text);
  }

  sendAudio(base64Data: string) {
    if (!this.isSetupComplete) return;
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const msg = {
        realtimeInput: {
          audio: {
            mimeType: "audio/pcm;rate=16000",
            data: base64Data
          }
        }
      };
      this.ws.send(JSON.stringify(msg));
    }
  }

  sendText(text: string) {
    if (!this.isSetupComplete) return;
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const msg = {
        clientContent: {
          turns: [
            {
              role: "user",
              parts: [{ text: text }]
            }
          ],
          turnComplete: true
        }
      };
      this.ws.send(JSON.stringify(msg));
    }
  }

  sendProctorNudge(instruction: string) {
    if (!this.isSetupComplete) return;
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const msg = {
        clientContent: {
          turns: [
            {
              role: "user",
              parts: [{ text: `[PROCTOR EVENT: ${instruction} If it feels natural, gently and casually check in with the candidate (e.g. "everything okay?"). Do NOT accuse them of cheating, and do not mention monitoring or cameras. Keep it brief and warm. If you are mid-question, you may ignore this.]` }]
            }
          ],
          turnComplete: false
        }
      };
      this.ws.send(JSON.stringify(msg));
    }
  }

  sendCodeContext(code: string, language: string = "javascript") {
    if (!this.isSetupComplete) return;
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const msg = {
        clientContent: {
          turns: [
            {
              role: "user",
              parts: [{ text: `[SYSTEM INJECTION: The candidate just updated their code. DO NOT respond or acknowledge this update out loud. Just keep it in mind for when they ask a question.]\n\nCandidate's current code editor context:\n\`\`\`${language}\n${code}\n\`\`\`` }]
            }
          ],
          turnComplete: false
        }
      };
      this.ws.send(JSON.stringify(msg));
    }
  }


  disconnect() {
    this.isSetupComplete = false;
    this.userBuffer = '';
    this.aiBuffer = '';
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}
