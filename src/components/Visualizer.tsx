import React, { useRef, useEffect } from 'react';

interface VisualizerProps {
  micVolume: number;
  aiVolume: number;
}

export const Visualizer: React.FC<VisualizerProps> = ({ micVolume, aiVolume }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let phase = 0;

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      phase += 0.05;

      const drawWave = (color: string, volume: number, yOffset: number, frequency: number, phaseOffset: number) => {
        ctx.beginPath();
        ctx.moveTo(0, height / 2);
        
        // Base amplitude with volume scaling
        const amplitude = 10 + (volume * 0.5);

        for (let x = 0; x < width; x++) {
          const y = Math.sin((x * frequency) + phase + phaseOffset) * amplitude + height / 2 + yOffset;
          ctx.lineTo(x, y);
        }
        
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.stroke();
      };

      // AI Volume Waves (Cyan)
      drawWave('rgba(56, 189, 248, 0.8)', aiVolume, -10, 0.02, 0);
      drawWave('rgba(56, 189, 248, 0.4)', aiVolume, -10, 0.03, Math.PI / 4);

      // Mic Volume Waves (Green)
      drawWave('rgba(74, 222, 128, 0.8)', micVolume, 10, 0.02, Math.PI);
      drawWave('rgba(74, 222, 128, 0.4)', micVolume, 10, 0.03, Math.PI * 1.25);

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [micVolume, aiVolume]);

  return (
    <div className="w-full h-32 flex items-center justify-center bg-surfaceHighlight rounded-2xl overflow-hidden glass-panel">
      <canvas ref={canvasRef} width={600} height={128} className="w-full h-full" />
    </div>
  );
};
