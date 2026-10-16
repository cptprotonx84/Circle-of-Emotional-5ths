import React, { useEffect, useRef } from 'react';
import { EMOTIONAL_KEYS } from '../constants';
import { EmotionalKeyData, EmotionState, MusicalKeyId } from '../types';
import { getNearestKey } from '../utils/emotionMath';

interface SoundReactiveMatrixProps {
  mediaElement: HTMLMediaElement | null;
  isPlaying: boolean;
  selectedKey: EmotionalKeyData;
  primaryEmotion: EmotionState;
  secondaryEmotion: EmotionState;
  beatTrigger?: number;
}

const FFT_SIZE = 1024;
const HISTORY_SIZE = 46;
const angleForKey = (key: EmotionalKeyData) => -Math.PI / 2 + (key.keyPosition - 1) * (Math.PI / 6);
const normalizeArousal = (value: number) => Math.min(1, Math.max(0, (value + 1) / 2));

const approachAngle = (current: number, target: number, strength: number) => {
  let difference = target - current;
  while (difference < -Math.PI) difference += Math.PI * 2;
  while (difference > Math.PI) difference -= Math.PI * 2;
  return current + difference * strength;
};

const SoundReactiveMatrix: React.FC<SoundReactiveMatrixProps> = ({
  mediaElement,
  isPlaying,
  selectedKey,
  primaryEmotion,
  secondaryEmotion,
  beatTrigger,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const selectedKeyRef = useRef(selectedKey);
  const primaryRef = useRef(primaryEmotion);
  const secondaryRef = useRef(secondaryEmotion);
  const isPlayingRef = useRef(isPlaying);
  const state = useRef({
    angle1: angleForKey(selectedKey),
    angle2: angleForKey(getNearestKey(secondaryEmotion) ?? selectedKey),
    radius1: 0.55,
    radius2: 0.55,
    trail1: [] as Array<{ x: number; y: number; color: string }>,
    trail2: [] as Array<{ x: number; y: number; color: string }>,
    beatImpulse: 0,
    bass: 0,
    mid: 0,
    high: 0,
    flux: 0,
    tension: 0,
    pulses: [] as Array<{ id: MusicalKeyId; life: number; color: string }>,
    lastPrimaryId: null as MusicalKeyId | null,
  });

  useEffect(() => {
    selectedKeyRef.current = selectedKey;
    primaryRef.current = primaryEmotion;
    secondaryRef.current = secondaryEmotion;
  }, [primaryEmotion, secondaryEmotion, selectedKey]);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
    if (isPlaying && audioContextRef.current?.state === 'suspended') void audioContextRef.current.resume();
  }, [isPlaying]);

  useEffect(() => {
    if (beatTrigger) state.current.beatImpulse = 1;
  }, [beatTrigger]);

  useEffect(() => {
    if (!mediaElement) return;
    try {
      const context = audioContextRef.current ?? new (window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      audioContextRef.current = context;
      const analyser = analyserRef.current ?? context.createAnalyser();
      analyser.fftSize = FFT_SIZE;
      analyser.smoothingTimeConstant = 0.85;
      analyserRef.current = analyser;
      if (!sourceRef.current) {
        sourceRef.current = context.createMediaElementSource(mediaElement);
        sourceRef.current.connect(analyser);
        analyser.connect(context.destination);
      }
    } catch (error) {
      console.warn('MATRIX_AUDIO_GRAPH_UNAVAILABLE', error);
    }
  }, [mediaElement]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d', { alpha: false });
    if (!context) return;
    const frequencyData = new Uint8Array(FFT_SIZE / 2);

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const ratio = window.devicePixelRatio || 1;
      const width = Math.max(1, parent.clientWidth);
      const height = Math.max(1, parent.clientHeight);
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    };

    const drawTrail = (trail: Array<{ x: number; y: number; color: string }>, x: number, y: number, color: string) => {
      trail.push({ x, y, color });
      if (trail.length > HISTORY_SIZE) trail.shift();
      context.save();
      context.globalCompositeOperation = 'lighter';
      for (let index = 1; index < trail.length; index += 1) {
        const previous = trail[index - 1];
        const point = trail[index];
        const alpha = index / trail.length;
        context.beginPath();
        context.moveTo(previous.x, previous.y);
        context.lineTo(point.x, point.y);
        context.strokeStyle = point.color;
        context.lineWidth = 1 + alpha * 4 + state.current.beatImpulse * 5;
        context.globalAlpha = alpha * 0.42;
        context.stroke();
      }
      context.restore();
    };

    const drawHead = (x: number, y: number, color: string, label: string) => {
      context.save();
      context.beginPath();
      const size = 7 + state.current.beatImpulse * 8;
      context.arc(x, y, size, 0, Math.PI * 2);
      context.fillStyle = '#ffffff';
      context.shadowBlur = 20 + state.current.beatImpulse * 24;
      context.shadowColor = color;
      context.fill();
      context.shadowBlur = 0;
      context.fillStyle = '#00ff41';
      context.font = '700 8px ui-monospace, SFMono-Regular, Menlo, monospace';
      context.textAlign = 'center';
      context.fillText(label, x, y - size - 6);
      context.restore();
    };

    const render = () => {
      const ratio = window.devicePixelRatio || 1;
      const width = canvas.width / ratio;
      const height = canvas.height / ratio;
      const centerX = width / 2;
      const centerY = height / 2;
      const orbitRadius = Math.min(width, height) * 0.34;
      const current = state.current;

      if (isPlayingRef.current && analyserRef.current) {
        analyserRef.current.getByteFrequencyData(frequencyData);
        const average = (start: number, end: number) => {
          let total = 0;
          for (let index = start; index < end; index += 1) total += frequencyData[index];
          return total / Math.max(1, end - start) / 255;
        };
        current.bass += (average(0, 12) - current.bass) * 0.18;
        current.mid += (average(12, 110) - current.mid) * 0.18;
        current.high += (average(110, 300) - current.high) * 0.18;
      } else {
        current.bass *= 0.94;
        current.mid *= 0.94;
        current.high *= 0.94;
      }
      current.flux = (current.bass + current.mid + current.high) / 3;
      current.beatImpulse *= 0.92;

      const primary = primaryRef.current;
      const secondary = secondaryRef.current;
      const primaryKey = getNearestKey(primary) ?? selectedKeyRef.current;
      const secondaryKey = getNearestKey(secondary) ?? selectedKeyRef.current;
      const vectorDistance = Math.hypot(primary.valence - secondary.valence, primary.arousal - secondary.arousal);
      current.tension = Math.min(1, vectorDistance / (Math.SQRT2 * 2));
      current.angle1 = approachAngle(current.angle1, angleForKey(primaryKey), 0.085);
      current.angle2 = approachAngle(current.angle2, angleForKey(secondaryKey), 0.072);
      const radiusTarget1 = 0.43 + normalizeArousal(primary.arousal) * 0.34 + current.bass * 0.12;
      const radiusTarget2 = 0.43 + normalizeArousal(secondary.arousal) * 0.34 + current.mid * 0.12;
      current.radius1 += (radiusTarget1 - current.radius1) * 0.09;
      current.radius2 += (radiusTarget2 - current.radius2) * 0.09;

      if (primaryKey.id !== current.lastPrimaryId) {
        current.pulses.push({ id: primaryKey.id, life: 1, color: primaryKey.primaryColor });
        current.lastPrimaryId = primaryKey.id;
      }

      const p1x = centerX + Math.cos(current.angle1) * orbitRadius * current.radius1;
      const p1y = centerY + Math.sin(current.angle1) * orbitRadius * current.radius1;
      const p2x = centerX + Math.cos(current.angle2) * orbitRadius * current.radius2;
      const p2y = centerY + Math.sin(current.angle2) * orbitRadius * current.radius2;

      context.fillStyle = '#050810';
      context.fillRect(0, 0, width, height);
      context.save();
      context.strokeStyle = '#1e293b';
      context.lineWidth = 1;
      context.globalAlpha = 0.2 + current.flux * 0.25;
      for (let x = 0; x <= width; x += 40) {
        context.beginPath(); context.moveTo(x, 0); context.lineTo(x, height); context.stroke();
      }
      for (let y = 0; y <= height; y += 40) {
        context.beginPath(); context.moveTo(0, y); context.lineTo(width, y); context.stroke();
      }
      context.restore();

      context.beginPath();
      context.arc(centerX, centerY, orbitRadius, 0, Math.PI * 2);
      context.strokeStyle = 'rgba(75, 93, 120, 0.4)';
      context.stroke();

      EMOTIONAL_KEYS.forEach(key => {
        const theta = angleForKey(key);
        const nodeX = centerX + Math.cos(theta) * orbitRadius;
        const nodeY = centerY + Math.sin(theta) * orbitRadius;
        const proximityFor = (angle: number) => {
          let difference = Math.abs(angle - theta);
          while (difference > Math.PI) difference = Math.abs(difference - Math.PI * 2);
          return Math.max(0, 1 - difference / 0.8);
        };
        const proximity = Math.max(proximityFor(current.angle1), proximityFor(current.angle2));
        context.beginPath();
        context.arc(nodeX, nodeY, 4 + proximity * 7, 0, Math.PI * 2);
        context.fillStyle = key.primaryColor;
        context.globalAlpha = 0.3 + proximity * 0.7;
        context.shadowBlur = proximity > 0.55 ? 18 : 0;
        context.shadowColor = key.primaryColor;
        context.fill();
        context.shadowBlur = 0;
        context.globalAlpha = 1;
        context.fillStyle = proximity > 0.45 ? '#ffffff' : 'rgba(255,255,255,0.42)';
        context.font = `${proximity > 0.45 ? '700 10px' : '600 8px'} ui-monospace, SFMono-Regular, Menlo, monospace`;
        context.textAlign = 'center';
        context.fillText(key.root, nodeX, nodeY + 18);
      });

      context.save();
      context.globalCompositeOperation = 'lighter';
      const bridgeGradient = context.createLinearGradient(p1x, p1y, p2x, p2y);
      bridgeGradient.addColorStop(0, primaryKey.primaryColor);
      bridgeGradient.addColorStop(0.5, '#d000ff');
      bridgeGradient.addColorStop(1, secondaryKey.primaryColor);
      const time = performance.now() / 1000;
      const midpointX = (p1x + p2x) / 2 + Math.sin(time * 4) * 10 * current.tension;
      const midpointY = (p1y + p2y) / 2 + Math.cos(time * 4) * 10 * current.tension;
      context.beginPath();
      context.moveTo(p1x, p1y);
      context.quadraticCurveTo(midpointX, midpointY, p2x, p2y);
      context.strokeStyle = bridgeGradient;
      context.lineWidth = 5 + current.tension * 5 + current.beatImpulse * 5;
      context.globalAlpha = 0.18 + current.tension * 0.22;
      context.stroke();
      context.lineWidth = 1.25;
      context.globalAlpha = 0.78;
      context.setLineDash([4, 5]);
      context.stroke();
      context.setLineDash([]);
      context.restore();

      drawTrail(current.trail1, p1x, p1y, primaryKey.primaryColor);
      drawTrail(current.trail2, p2x, p2y, secondaryKey.primaryColor);
      drawHead(p1x, p1y, primaryKey.primaryColor, 'P_01');
      drawHead(p2x, p2y, secondaryKey.primaryColor, 'P_02');

      current.pulses = current.pulses.filter(pulse => pulse.life > 0);
      current.pulses.forEach(pulse => {
        const key = EMOTIONAL_KEYS.find(item => item.id === pulse.id);
        if (!key) return;
        const theta = angleForKey(key);
        context.beginPath();
        context.arc(centerX + Math.cos(theta) * orbitRadius, centerY + Math.sin(theta) * orbitRadius, (1 - pulse.life) * 70, 0, Math.PI * 2);
        context.strokeStyle = pulse.color;
        context.lineWidth = pulse.life * 3;
        context.globalAlpha = pulse.life * 0.55;
        context.stroke();
        context.globalAlpha = 1;
        pulse.life -= 0.025;
      });

      animationRef.current = requestAnimationFrame(render);
    };

    resize();
    window.addEventListener('resize', resize);
    render();
    return () => {
      window.removeEventListener('resize', resize);
      if (animationRef.current !== null) cancelAnimationFrame(animationRef.current);
    };
  }, []);

  const primaryKey = getNearestKey(primaryEmotion) ?? selectedKey;
  const secondaryKey = getNearestKey(secondaryEmotion) ?? selectedKey;
  return (
    <div className="relative h-full w-full overflow-hidden rounded-xl border border-neonViolet/20 bg-slate-950 shadow-2xl">
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
      <div data-testid="resonance-orbital-key" className="pointer-events-none absolute bottom-3 left-3 text-[9px] font-mono tracking-widest" style={{ color: primaryKey.primaryColor }}>
        P_01: {primaryKey.displayName.toUpperCase()} · P_02: {secondaryKey.displayName.toUpperCase()}
      </div>
    </div>
  );
};

export default SoundReactiveMatrix;
