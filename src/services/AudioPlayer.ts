export class AudioPlayer {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private nextPlayTime: number = 0;
  private isPlaying: boolean = false;

  constructor() {}

  init() {
    if (!this.audioContext) {
      try {
        this.audioContext = new window.AudioContext({ sampleRate: 24000 });
      } catch {
        this.audioContext = new window.AudioContext();
      }
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.connect(this.audioContext.destination);
      this.nextPlayTime = this.audioContext.currentTime;
      this.isPlaying = true;
    }
  }

  playChunk(base64Data: string) {
    if (!this.audioContext || !this.analyser || !this.isPlaying) return;

    const pcm16Data = this.base64ToInt16Array(base64Data);
    const float32Data = this.int16ToFloat32(pcm16Data);
    
    const sourceSampleRate = 24000;
    const buffer = this.audioContext.createBuffer(1, float32Data.length, sourceSampleRate);
    buffer.copyToChannel(float32Data as any, 0);

    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(this.analyser);

    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }

    const startTime = Math.max(this.audioContext.currentTime, this.nextPlayTime);
    source.start(startTime);
    
    this.nextPlayTime = startTime + buffer.duration;
  }

  stop() {
    this.isPlaying = false;
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
      this.audioContext = null;
      this.analyser = null;
    }
  }

  clearQueue() {
    if (this.audioContext) {
      this.nextPlayTime = this.audioContext.currentTime;
    }
  }

  getVolume(): number {
    if (!this.analyser) return 0;
    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(dataArray);
    const sum = dataArray.reduce((a, b) => a + b, 0);
    return sum / dataArray.length;
  }

  private base64ToInt16Array(base64: string): Int16Array {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return new Int16Array(bytes.buffer);
  }

  private int16ToFloat32(int16Array: Int16Array): Float32Array {
    const float32Array = new Float32Array(int16Array.length);
    for (let i = 0; i < int16Array.length; i++) {
      float32Array[i] = int16Array[i] / 32768.0;
    }
    return float32Array;
  }
}
