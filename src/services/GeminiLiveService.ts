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
  public onTextContent: ((text: string, isFinal: boolean) => void) | null = null;
  public onConnectionStateChange: ((connected: boolean) => void) | null = null;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  connect(systemInstructions: string) {
    if (!this.apiKey) {
      console.error("No API key provided for GeminiLiveService.");
      return;
    }

    const wsUrl = `${this.url}?key=${this.apiKey}`;
    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      console.log("WebSocket connected. Sending setup message...");
      this.onConnectionStateChange?.(true);

      const setupMessage = {
        setup: {
          model: "models/gemini-3.1-flash-live-preview",
          generationConfig: {
            responseModalities: ["AUDIO", "TEXT"]
          },
          systemInstruction: {
            parts: [{ text: systemInstructions }]
          }
        }
      };

      this.ws?.send(JSON.stringify(setupMessage));
    };

    this.ws.onmessage = async (event) => {
      let data = event.data;
      if (data instanceof Blob) {
        data = await data.text();
      }
      this.handleIncomingMessage(data);
    };

    this.ws.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    this.ws.onclose = (event) => {
      console.log(`WebSocket closed. Code: ${event.code}, Reason: ${event.reason}`);
      this.onConnectionStateChange?.(false);
      this.ws = null;
    };
  }

  private isSetupComplete: boolean = false;

  private handleIncomingMessage(data: any) {
    try {
      const parsed = typeof data === 'string' ? JSON.parse(data) : data;
      console.log("Incoming Gemini WS Message:", Object.keys(parsed));
      
      if (parsed.setupComplete) {
        console.log("Setup complete. Ready for audio streaming.");
        this.isSetupComplete = true;
        // Removed sendText to prevent modality conflicts; AI will respond when it hears the user.
      }

      // Look for serverContent
      if (parsed.serverContent) {
        if (parsed.serverContent.modelTurn) {
          const parts = parsed.serverContent.modelTurn.parts;
          for (const part of parts) {
            // Handle Audio
            if (part.inlineData && part.inlineData.mimeType.startsWith('audio/pcm')) {
              this.onAudioData?.(part.inlineData.data);
            }
            // Handle Text / Text-to-Speech Transcript
            if (part.text) {
              this.onTextContent?.(part.text, false);
            }
          }
        }
        if (parsed.serverContent.turnComplete) {
          this.onTextContent?.('', true);
        }
      }
    } catch (err) {
      console.error("Failed to parse incoming WS message", err);
    }
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

  sendCodeContext(code: string, language: string = "javascript") {
    if (!this.isSetupComplete) return;
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const msg = {
        clientContent: {
          turns: [
            {
              role: "user",
              parts: [{ text: `Candidate's current code editor context:\n\`\`\`${language}\n${code}\n\`\`\`` }]
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
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}
