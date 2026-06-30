
import React, { useEffect, useRef } from 'react';
import { EMOTIONAL_KEYS } from '../constants';
import { getNearestKey } from '../utils/emotionMath';
import { EmotionState, EmotionalKeyData } from '../types';

interface SoundReactiveMatrixProps {
  mediaElement: HTMLMediaElement | null;
  isPlaying: boolean;
  targetEmotion: EmotionState | null;
  beatTrigger?: number;
}

const FFT_SIZE = 1024;
const SMOOTHING = 0.85;
const HISTORY_SIZE = 50;
const ORBIT_RADIUS = 150;
const ATTRACTOR_STRENGTH = 0.08;

const SoundReactiveMatrix: React.FC<SoundReactiveMatrixProps> = ({ mediaElement, isPlaying, targetEmotion, beatTrigger }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);

  // Advanced Physics State
  const state = useRef({
    angle: -Math.PI / 2,
    targetAngle: -Math.PI / 2,
    radius: 0.5,
    trail: [] as { x: number; y: number; hue: string }[],
    beatImpulse: 0,
    bass: 0,
    mid: 0,
    high: 0,
    tension: 0,
    flux: 0,
    previousSpectrum: new Float32Array(FFT_SIZE / 2),
    pulses: [] as { id: number; time: number; color: string }[],
    lastTargetId: -1,
  });

  useEffect(() => {
    if (beatTrigger) state.current.beatImpulse = 1.0;
  }, [beatTrigger]);

  useEffect(() => {
    if (!mediaElement) return;
    const initAudio = () => {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      if (!analyserRef.current) {
        analyserRef.current = ctx.createAnalyser();
        analyserRef.current.fftSize = FFT_SIZE;
        analyserRef.current.smoothingTimeConstant = SMOOTHING;
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
          sourceRef.current.connect(analyserRef.current);
          analyserRef.current.connect(ctx.destination);
        } catch (e) {}
      }
    };
    initAudio();
  }, [mediaElement]);

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    const render = () => {
      const w = canvas.width;
      const h = canvas.height;
      const cx = w / 2;
      const cy = h / 2;

      // 1. Audio Processing
      if (isPlaying && analyserRef.current) {
        const data = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(data);
        
        let b = 0, m = 0, hi = 0;
        for (let i = 0; i < 10; i++) b += data[i];
        for (let i = 10; i < 100; i++) m += data[i];
        for (let i = 100; i < 300; i++) hi += data[i];

        state.current.bass = b / 10 / 255;
        state.current.mid = m / 90 / 255;
        state.current.high = hi / 200 / 255;
        state.current.flux = (state.current.bass + state.current.mid + state.current.high) / 3;
        if (state.current.bass > 0.8) state.current.beatImpulse = 1.0;
      }
      
      state.current.beatImpulse *= 0.93;
      state.current.tension = state.current.mid * 0.5 + state.current.high * 0.5;

      // 2. Shortest Path Attraction
      let currentTarget: EmotionalKeyData | null = null;
      if (targetEmotion) {
        currentTarget = getNearestKey(targetEmotion);
        state.current.targetAngle = -Math.PI / 2 + (currentTarget.keyPosition - 1) * (Math.PI / 6);
        
        // Detect Note Change for pulses
        if (currentTarget.id !== state.current.lastTargetId) {
          state.current.pulses.push({
            id: currentTarget.id,
            time: 1.0,
            color: currentTarget.primaryColor
          });
          state.current.lastTargetId = currentTarget.id;
        }
      }

      let diff = state.current.targetAngle - state.current.angle;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;

      const jitter = (Math.random() - 0.5) * state.current.tension * 0.2;
      state.current.angle += diff * ATTRACTOR_STRENGTH + jitter;

      const radiusTarget = 0.4 + state.current.bass * 0.4 + state.current.tension * 0.2;
      state.current.radius += (radiusTarget - state.current.radius) * 0.1;

      // 3. Clear & Background Grid
      ctx.fillStyle = '#050810';
      ctx.fillRect(0, 0, w, h);

      // Reactive Background Grid
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.2 + state.current.flux * 0.3;
      const gridSize = 40;
      for (let x = 0; x < w; x += gridSize) {
        ctx.beginPath();
        for (let y = 0; y < h; y += 10) {
          const dx = x - (cx + Math.cos(state.current.angle) * ORBIT_RADIUS * state.current.radius);
          const dy = y - (cy + Math.sin(state.current.angle) * ORBIT_RADIUS * state.current.radius);
          const dist = Math.sqrt(dx*dx + dy*dy);
          const push = Math.max(0, (150 - dist) / 150) * 20;
          ctx.lineTo(x + (dx / dist) * push, y + (dy / dist) * push);
        }
        ctx.stroke();
      }

      // 4. Harmonic Nodes & Pings
      EMOTIONAL_KEYS.forEach(key => {
        const theta = -Math.PI / 2 + (key.keyPosition - 1) * (Math.PI / 6);
        const kx = cx + Math.cos(theta) * ORBIT_RADIUS;
        const ky = cy + Math.sin(theta) * ORBIT_RADIUS;

        let aDiff = Math.abs(state.current.angle - theta);
        while (aDiff > Math.PI) aDiff = Math.abs(aDiff - Math.PI * 2);
        const prox = Math.max(0, 1 - aDiff / 0.8);

        // Draw Active Node Connection (Bloom Pass)
        if (prox > 0.5) {
          const beamProx = (prox - 0.5) / 0.5;
          const px = cx + Math.cos(state.current.angle) * (ORBIT_RADIUS * state.current.radius);
          const py = cy + Math.sin(state.current.angle) * (ORBIT_RADIUS * state.current.radius);
          
          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          // Bloom Pass 1
          ctx.beginPath();
          ctx.moveTo(px, py); ctx.lineTo(kx, ky);
          ctx.strokeStyle = key.primaryColor;
          ctx.lineWidth = 15 * beamProx * (1 + state.current.beatImpulse);
          ctx.globalAlpha = 0.1 * beamProx;
          ctx.stroke();
          // Bloom Pass 2
          ctx.lineWidth = 4 * beamProx;
          ctx.globalAlpha = 0.4 * beamProx;
          ctx.stroke();
          // Core
          ctx.lineWidth = 1;
          ctx.globalAlpha = 0.8 * beamProx;
          ctx.globalCompositeOperation = 'source-over';
          ctx.stroke();
          ctx.restore();
        }

        // Draw Node
        ctx.beginPath();
        const baseSize = 4 + prox * 6;
        ctx.arc(kx, ky, baseSize, 0, Math.PI * 2);
        ctx.fillStyle = key.primaryColor;
        ctx.globalAlpha = 0.3 + prox * 0.7;
        ctx.fill();
        
        // Node Label
        if (prox > 0.3) {
          ctx.fillStyle = '#fff';
          ctx.font = `bold ${10 + prox * 2}px Inter`;
          ctx.textAlign = 'center';
          ctx.fillText(key.musicalKey.split(' ')[0], kx, ky + 20);
        }
      });

      // 5. Particle Trail
      const px = cx + Math.cos(state.current.angle) * (ORBIT_RADIUS * state.current.radius);
      const py = cy + Math.sin(state.current.angle) * (ORBIT_RADIUS * state.current.radius);
      state.current.trail.push({ x: px, y: py, hue: currentTarget?.primaryColor || '#fff' });
      if (state.current.trail.length > HISTORY_SIZE) state.current.trail.shift();

      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 1; i < state.current.trail.length; i++) {
        const p1 = state.current.trail[i-1];
        const p2 = state.current.trail[i];
        const alpha = i / state.current.trail.length;
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.strokeStyle = p2.hue;
        ctx.lineWidth = 2 + alpha * 5 + state.current.beatImpulse * 10;
        ctx.globalAlpha = alpha * 0.5;
        ctx.stroke();
      }
      ctx.restore();

      // 6. Particle Head
      ctx.beginPath();
      const headSize = 8 + state.current.beatImpulse * 15;
      ctx.arc(px, py, headSize, 0, Math.PI * 2);
      ctx.fillStyle = '#fff';
      ctx.shadowBlur = 20 + state.current.beatImpulse * 40;
      ctx.shadowColor = currentTarget?.primaryColor || '#fff';
      ctx.fill();
      ctx.shadowBlur = 0;

      // 7. Node Pings (Activation Ripples)
      state.current.pulses = state.current.pulses.filter(p => p.time > 0);
      state.current.pulses.forEach(p => {
        const key = EMOTIONAL_KEYS.find(k => k.id === p.id);
        if (!key) return;
        const theta = -Math.PI / 2 + (key.keyPosition - 1) * (Math.PI / 6);
        const kx = cx + Math.cos(theta) * ORBIT_RADIUS;
        const ky = cy + Math.sin(theta) * ORBIT_RADIUS;

        ctx.beginPath();
        ctx.arc(kx, ky, (1 - p.time) * 100, 0, Math.PI * 2);
        ctx.strokeStyle = p.color;
        ctx.lineWidth = p.time * 4;
        ctx.globalAlpha = p.time * 0.5;
        ctx.stroke();
        p.time -= 0.02;
      });

      animationRef.current = requestAnimationFrame(render);
    };

    const handleResize = () => {
      const parent = canvas.parentElement;
      if (parent) {
        canvas.width = parent.clientWidth;
        canvas.height = parent.clientHeight;
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isPlaying, targetEmotion]);

  return (
    <div className="relative w-full h-full rounded-2xl overflow-hidden bg-slate-950 border border-white/5 shadow-2xl">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
      <div className="absolute bottom-4 right-4 flex flex-col items-end gap-1 opacity-40 pointer-events-none">
        <span className="text-[9px] font-mono text-cyan-400">FLUX_STRENGTH: {(state.current.flux * 100).toFixed(1)}%</span>
        <span className="text-[9px] font-mono text-rose-400">VECTOR_MASS: {(state.current.radius * 10).toFixed(1)}u</span>
      </div>
    </div>
  );
};

export default SoundReactiveMatrix;
