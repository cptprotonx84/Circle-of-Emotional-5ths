import React, { useEffect, useRef } from 'react';
import { EMOTIONAL_KEYS } from '../constants';

interface LiveVisualizerProps {
  mediaElement: HTMLMediaElement | null;
  isPlaying: boolean;
  valence: number;
  arousal: number;
  reservedFooterHeight?: number; 
}

const RHYTHM_H = 90;
const FOOTER_PAD = 14;

const LiveVisualizer: React.FC<LiveVisualizerProps> = ({ 
  mediaElement, 
  isPlaying, 
  valence, 
  arousal,
  reservedFooterHeight = 90 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);

  // Persistence for smoothed audio envelopes
  const envelopes = useRef({
    low: 0,
    mid: 0,
    high: 0,
    overall: 0,
    guitar: 0
  });

  // Audio setup
  useEffect(() => {
    if (!mediaElement) return;
    const initAudio = () => {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      if (!analyserRef.current) {
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 1024;
        analyser.smoothingTimeConstant = 0.8;
        analyserRef.current = analyser;
      }
      if (!sourceRef.current) {
        try {
          // Prevent DOMException by reusing previous source node if already created on this mediaElement
          const cacheKey = '_audioSource';
          if ((mediaElement as any)[cacheKey]) {
            sourceRef.current = (mediaElement as any)[cacheKey];
          } else {
            sourceRef.current = ctx.createMediaElementSource(mediaElement);
            (mediaElement as any)[cacheKey] = sourceRef.current;
          }
          sourceRef.current.connect(analyserRef.current!);
          analyserRef.current!.connect(ctx.destination);
        } catch (err) { console.warn(err); }
      }
    };
    initAudio();
  }, [mediaElement]);

  useEffect(() => {
    const ctx = audioContextRef.current;
    if (ctx && isPlaying && ctx.state === 'suspended') ctx.resume();
  }, [isPlaying]);

  useEffect(() => {
    if (!canvasRef.current || !analyserRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    const resize = () => {
      const parent = canvas.parentElement;
      if (parent) {
        canvas.width = parent.offsetWidth * window.devicePixelRatio;
        canvas.height = parent.offsetHeight * window.devicePixelRatio;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
      }
    };
    resize();
    window.addEventListener('resize', resize);

    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const freqData = new Uint8Array(bufferLength);
    const timeData = new Uint8Array(bufferLength);

    const render = () => {
      analyser.getByteFrequencyData(freqData);
      analyser.getByteTimeDomainData(timeData);

      const w = canvas.width / window.devicePixelRatio;
      const h = canvas.height / window.devicePixelRatio;
      
      const useFullHeight = reservedFooterHeight === 0;
      const cx = w / 2;
      const cy = h / 2;
      const time = Date.now() / 1000;

      // --- 1. Audio Feature Extraction ---
      let lowSum = 0, midSum = 0, highSum = 0, totalSum = 0, guitarSum = 0;
      
      // Low (Bass): ~20-140Hz (bins 0-3)
      for (let i = 0; i < 4; i++) lowSum += freqData[i];
      // Mid (Voice): ~200-3000Hz (bins 4-70)
      for (let i = 4; i < 70; i++) midSum += freqData[i];
      // High (Hats/Air): ~3k-10kHz (bins 71-232)
      for (let i = 71; i < 232; i++) highSum += freqData[i];
      // Guitar/Texture: ~700Hz - 3500Hz (bins 16-81)
      for (let i = 16; i < 82; i++) guitarSum += freqData[i];
      // Total
      for (let i = 0; i < 232; i++) totalSum += freqData[i];

      const lowTarget = lowSum / 4 / 255;
      const midTarget = midSum / 66 / 255;
      const highTarget = highSum / 161 / 255;
      const guitarTarget = guitarSum / 66 / 255;
      const overallTarget = totalSum / 232 / 255;

      envelopes.current.low += (lowTarget - envelopes.current.low) * 0.15;
      envelopes.current.mid += (midTarget - envelopes.current.mid) * 0.15;
      envelopes.current.high += (highTarget - envelopes.current.high) * 0.15;
      envelopes.current.guitar += (guitarTarget - envelopes.current.guitar) * 0.12;
      envelopes.current.overall += (overallTarget - envelopes.current.overall) * 0.1;

      const { low, mid, high, overall, guitar } = envelopes.current;
      const lowEnergy = low; const midEnergy = mid; const highEnergy = high; const overallEnergy = overall;

      // Clear
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, w, h);

      // --- 2. Color Mapping (Voice/Freq Reactive) ---
      const energyWeight = mid + high + low + 0.001;
      let reactiveHue = (180 + midEnergy * 60 + highEnergy * 120 + lowEnergy * -60) % 360;

      // --- 3. Enhanced Oscilloscope Visibility (GOAL A) ---
      const mainBaseWidth = 3.0 + overall * 3.0;
      const mainBaseAlpha = 0.55 + overall * 0.4;
      const reactiveLightness = 35 + overall * 35;

      const scopeWidth = Math.min(w * 0.65, 520);
      const xStart = cx - scopeWidth / 2;
      const ampBase = 40 + low * 100 + arousal * 30;

      const drawHighVisScope = (yOffset: number, gain: number, alphaMult: number, hueShift: number, isTexture: boolean) => {
        const hue = (reactiveHue + hueShift) % 360;
        const mainAlpha = mainBaseAlpha * alphaMult;
        const mainWidth = (isTexture ? 2.0 + guitar * 2.0 : mainBaseWidth) * gain;

        const scopeGrad = ctx.createLinearGradient(xStart, 0, xStart + scopeWidth, 0);
        scopeGrad.addColorStop(0, `hsla(${hue}, 100%, ${reactiveLightness}%, 0)`);
        scopeGrad.addColorStop(0.5, `hsla(${hue}, 100%, ${reactiveLightness + 10}%, ${mainAlpha})`);
        scopeGrad.addColorStop(1, `hsla(${hue}, 100%, ${reactiveLightness}%, 0)`);

        let prevS = 0;

        const drawPass = (wFactor: number, aFactor: number, composite: GlobalCompositeOperation) => {
          ctx.save();
          ctx.beginPath();
          ctx.globalAlpha = mainAlpha * aFactor * (0.5 + overallEnergy * 0.5 + midEnergy * 0.3);
          ctx.strokeStyle = scopeGrad;
          ctx.lineWidth = mainWidth * (0.5 + overallEnergy * 0.8 + midEnergy * 0.4);
          ctx.globalCompositeOperation = composite;

          for (let i = 0; i < bufferLength; i++) {
            const t = i / (bufferLength - 1);
            let s = (timeData[i] - 128) / 128;
            
            // Texture high-pass (GOAL B)
            if (isTexture) {
              const highPassS = s - 0.92 * prevS;
              prevS = s;
              s = highPassS * 1.5; // Gain for visibility
            }

            const x = xStart + t * scopeWidth;
            const y = cy + yOffset + s * ampBase * gain;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.stroke();
          ctx.restore();
        };

        // Bloom Pass 1: Glow
        drawPass(2.2, 0.22, 'lighter');
        // Bloom Pass 2: Halo
        drawPass(1.5, 0.18, 'lighter');
        // Bloom Pass 3: Core
        drawPass(1.0, 1.0, 'source-over');
      };

      // Draw Texture Layer (Guitar-ish) (GOAL B)
      if (guitar > 0.05) {
        drawHighVisScope(-18, 0.7, guitar * 0.8, 40, true);
      }

      // Draw Main Multi-Layered Oscilloscope (GOAL A)
      drawHighVisScope(0, 1.0, 1.0, 0, false);
      drawHighVisScope(0, 0.6, 0.4, -10, false);

      // --- 4. Emotional Nodes ---
      const orbitRadius = Math.min(w, h) * 0.38;
      const targetAngle = Math.PI * (valence + 1) - Math.PI / 2;
      const targetRadius = Math.min(w, h) * 0.25 * (1.1 + arousal);

      EMOTIONAL_KEYS.forEach((node) => {
        const theta = -Math.PI / 2 + (node.keyPosition - 1) * (Math.PI / 6);
        const nx = cx + Math.cos(theta) * orbitRadius;
        const ny = cy + Math.sin(theta) * orbitRadius;
        let angDiff = Math.abs(targetAngle - theta);
        while (angDiff > Math.PI) angDiff = Math.abs(angDiff - Math.PI * 2);
        const isActive = angDiff < 0.5;
        const proximity = Math.max(0, 1 - angDiff);

        ctx.beginPath();
        const size = 4 + proximity * 12 + low * 15;
        ctx.arc(nx, ny, size, 0, Math.PI * 2);
        ctx.shadowBlur = isActive ? 20 + low * 40 : 0;
        ctx.shadowColor = node.primaryColor;
        ctx.fillStyle = node.primaryColor;
        ctx.globalAlpha = 0.2 + proximity * 0.8;
        ctx.fill();
        ctx.shadowBlur = 0;

        const displayLetter = node.musicalKey.includes('Minor') ? node.musicalKey[0].toLowerCase() : node.musicalKey[0];
        ctx.save();
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = `bold ${Math.max(6, Math.min(size * 0.8, 11))}px monospace`;
        ctx.fillStyle = isActive ? '#000' : 'rgba(255, 255, 255, 0.8)';
        ctx.fillText(displayLetter, nx, ny);
        ctx.restore();
      });

      // --- 5. Emotional Vector & Particle ---
      const px = cx + Math.cos(targetAngle) * targetRadius;
      const py = cy + Math.sin(targetAngle) * targetRadius;

      ctx.beginPath();
      ctx.moveTo(cx, cy); ctx.lineTo(px, py);
      ctx.strokeStyle = `hsla(${reactiveHue}, 100%, ${reactiveLightness}%, ${mainBaseAlpha * 0.5})`;
      ctx.setLineDash([5, 5]);
      ctx.stroke(); ctx.setLineDash([]);

      ctx.beginPath();
      ctx.arc(px, py, 10 + low * 20, 0, Math.PI * 2);
      ctx.fillStyle = '#fff';
      ctx.shadowBlur = 30 + low * 50;
      ctx.shadowColor = `hsla(${reactiveHue}, 100%, 50%, 0.85)`;
      ctx.globalAlpha = 1;
      ctx.fill(); ctx.shadowBlur = 0;

      animationRef.current = requestAnimationFrame(render);
    };

    render();
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      window.removeEventListener('resize', resize);
    };
  }, [isPlaying, valence, arousal, reservedFooterHeight]);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full rounded-2xl pointer-events-none" />;
};

export default LiveVisualizer;