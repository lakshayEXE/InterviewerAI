import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import type { ProctorEventType } from '../types/proctor';

const TASKS_VISION_VERSION = '0.10.35';
const WASM_URL = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${TASKS_VISION_VERSION}/wasm`;
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

// Detection cadence and how long a condition must persist before it counts.
const DETECT_INTERVAL_MS = 250; // ~4 fps
const DEBOUNCE_MS = 2500;

// Head-pose thresholds (degrees) for "looking away".
const YAW_LIMIT = 28; // left/right turn
const PITCH_UP_LIMIT = 25; // looking up
const PITCH_DOWN_LIMIT = 38; // looking far down (lenient: reading/typing is normal)

type FaceStatus = 'ok' | 'no-face' | 'multiple-faces' | 'looking-away';

export class FaceProctor {
  private landmarker: FaceLandmarker | null = null;
  private video: HTMLVideoElement | null = null;
  private rafId: number | null = null;
  private running = false;
  private lastDetect = 0;
  private lastVideoTime = -1;

  private currentStatus: FaceStatus = 'ok';
  private statusSince = 0;
  private emittedForEpisode = false;

  public onEvent: ((type: ProctorEventType) => void) | null = null;
  public onError: ((err: unknown) => void) | null = null;

  async start(video: HTMLVideoElement) {
    this.video = video;
    try {
      const fileset = await FilesetResolver.forVisionTasks(WASM_URL);
      this.landmarker = await FaceLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: MODEL_URL, delegate: 'GPU' },
        runningMode: 'VIDEO',
        numFaces: 2,
        outputFacialTransformationMatrixes: true,
      });
      this.running = true;
      this.statusSince = performance.now();
      this.loop();
    } catch (err) {
      console.error('FaceProctor init failed:', err);
      this.onError?.(err);
    }
  }

  private loop = () => {
    if (!this.running) return;
    this.rafId = requestAnimationFrame(this.loop);

    const now = performance.now();
    if (now - this.lastDetect < DETECT_INTERVAL_MS) return;
    this.lastDetect = now;

    const video = this.video;
    const landmarker = this.landmarker;
    if (!video || !landmarker || video.readyState < 2) return;
    // Avoid feeding the same frame twice (detectForVideo needs progressing time).
    if (video.currentTime === this.lastVideoTime) return;
    this.lastVideoTime = video.currentTime;

    let status: FaceStatus = 'ok';
    try {
      const result = landmarker.detectForVideo(video, now);
      const faceCount = result.faceLandmarks?.length ?? 0;
      if (faceCount === 0) {
        status = 'no-face';
      } else if (faceCount > 1) {
        status = 'multiple-faces';
      } else {
        const matrix = result.facialTransformationMatrixes?.[0]?.data;
        if (matrix && this.isLookingAway(matrix)) {
          status = 'looking-away';
        }
      }
    } catch {
      return; // transient detection error; skip this frame
    }

    this.evaluateStatus(status, now);
  };

  // Extract yaw/pitch (degrees) from the column-major 4x4 transform matrix
  // and decide if the head is turned away from the screen.
  private isLookingAway(d: Float32Array | number[]): boolean {
    const clamp = (v: number) => Math.max(-1, Math.min(1, v));
    const yaw = Math.asin(clamp(d[8])) * (180 / Math.PI);
    const pitch = Math.atan2(-d[9], d[10]) * (180 / Math.PI);
    if (Math.abs(yaw) > YAW_LIMIT) return true;
    if (pitch > PITCH_UP_LIMIT) return true;
    if (pitch < -PITCH_DOWN_LIMIT) return true;
    return false;
  }

  private evaluateStatus(status: FaceStatus, now: number) {
    if (status !== this.currentStatus) {
      this.currentStatus = status;
      this.statusSince = now;
      this.emittedForEpisode = false;
      return;
    }
    if (
      status !== 'ok' &&
      !this.emittedForEpisode &&
      now - this.statusSince >= DEBOUNCE_MS
    ) {
      this.emittedForEpisode = true;
      this.onEvent?.(status);
    }
  }

  stop() {
    this.running = false;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    try {
      this.landmarker?.close();
    } catch {
      // ignore
    }
    this.landmarker = null;
    this.video = null;
  }
}
