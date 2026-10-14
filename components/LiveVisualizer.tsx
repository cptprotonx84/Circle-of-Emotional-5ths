import React, { useEffect, useRef } from 'react';
import {
  advanceChordTracker,
  analyzePitchClassChroma,
  ChordEvidence,
  confidenceTier,
  ConfidenceTier,
  CIRCLE_OF_FIFTHS_PITCH_CLASSES,
  emptyChordTracker,
  NOTE_NAMES,
} from '../utils/realtimeChordAnalysis';

export interface LiveChordSnapshot {
  evidence: ChordEvidence;
  tier: ConfidenceTier;
  pendingChord: string | null;
  pendingFrames: number;
}

interface LiveVisualizerProps {
  mediaElement: HTMLMediaElement | null;
  isPlaying: boolean;
  reservedFooterHeight?: number;
  onChordEvidence?: (snapshot: LiveChordSnapshot | null) => void;
}

interface ResonanceAudioGraph {
  context: AudioContext;
  analyser: AnalyserNode;
  source: MediaElementAudioSourceNode;
}

type ResonanceMediaElement = HTMLMediaElement & { __resonanceAudioGraph?: ResonanceAudioGraph };

const PITCH_COLORS = [
  '#ffd21a', '#39477d', '#1a9a63', '#b52a58', '#26a7a0', '#a65b78',
  '#6555c9', '#138ca0', '#2877c7', '#c43a6b', '#865072', '#7354b7',
] as const;
const TIER_COLORS: Record<ConfidenceTier, string> = { LOW: '#b98a2f', MOD: '#22d3ee', HIGH: '#22c55e' };

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const hexToRgba = (hex: string, alpha: number) => {
  const normalized = hex.replace('#', '');
  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
};

const LiveVisualizer: React.FC<LiveVisualizerProps> = ({
  mediaElement,
  isPlaying,
  reservedFooterHeight = 0,
  onChordEvidence,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const frequencyDataRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const timeDomainDataRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const isPlayingRef = useRef(isPlaying);
  const onChordEvidenceRef = useRef(onChordEvidence);
  const trackerRef = useRef(emptyChordTracker());
  const chromaRef = useRef(Array.from({ length: 12 }, () => 0));
  const evidenceRef = useRef<ChordEvidence | null>(null);
  const lastAnalysisAtRef = useRef(0);
  const visualStateRef = useRef({ energy: 0, low: 0, mid: 0, high: 0 });

  useEffect(() => { onChordEvidenceRef.current = onChordEvidence; }, [onChordEvidence]);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
    if (isPlaying && audioContextRef.current?.state === 'suspended') void audioContextRef.current.resume();
  }, [isPlaying]);

  useEffect(() => {
    trackerRef.current = emptyChordTracker();
    evidenceRef.current = null;
    chromaRef.current.fill(0);
    onChordEvidenceRef.current?.(null);
    if (!mediaElement) {
      analyserRef.current = null;
      audioContextRef.current = null;
      frequencyDataRef.current = null;
      timeDomainDataRef.current = null;
      return;
    }

    try {
      const resonanceElement = mediaElement as ResonanceMediaElement;
      let graph = resonanceElement.__resonanceAudioGraph;
      if (!graph) {
        const context = new (window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
        const analyser = context.createAnalyser();
        const source = context.createMediaElementSource(mediaElement);
        source.connect(analyser);
        analyser.connect(context.destination);
        graph = { context, analyser, source };
        resonanceElement.__resonanceAudioGraph = graph;
      }
      graph.analyser.fftSize = 8192;
      graph.analyser.smoothingTimeConstant = 0.72;
      audioContextRef.current = graph.context;
      analyserRef.current = graph.analyser;
      frequencyDataRef.current = new Uint8Array(graph.analyser.frequencyBinCount);
      timeDomainDataRef.current = new Uint8Array(graph.analyser.fftSize);
      if (isPlayingRef.current && graph.context.state === 'suspended') void graph.context.resume();
    } catch (error) {
      console.warn('HARMONIC_ANALYSER_UNAVAILABLE', error);
      analyserRef.current = null;
      audioContextRef.current = null;
      frequencyDataRef.current = null;
      timeDomainDataRef.current = null;
    }
  }, [mediaElement]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d', { alpha: false });
    if (!context) return;

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const pixelRatio = window.devicePixelRatio || 1;
      const width = Math.max(1, parent.clientWidth);
      const height = Math.max(1, parent.clientHeight);
      canvas.width = Math.round(width * pixelRatio);
      canvas.height = Math.round(height * pixelRatio);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    };

    const render = (now: number) => {
      const pixelRatio = window.devicePixelRatio || 1;
      const width = canvas.width / pixelRatio;
      const height = canvas.height / pixelRatio;
      const usableHeight = Math.max(260, height - reservedFooterHeight);
      const analyser = analyserRef.current;
      const frequencyData = frequencyDataRef.current;
      const timeDomainData = timeDomainDataRef.current;
      const audioContext = audioContextRef.current;
      const hasLiveSignal = Boolean(isPlayingRef.current && analyser && frequencyData && timeDomainData && audioContext);
      const state = visualStateRef.current;
      let targetEnergy = 0;
      let targetLow = 0;
      let targetMid = 0;
      let targetHigh = 0;

      if (hasLiveSignal && analyser && frequencyData && timeDomainData && audioContext) {
        analyser.getByteFrequencyData(frequencyData);
        analyser.getByteTimeDomainData(timeDomainData);
        const nyquist = audioContext.sampleRate / 2;
        const bandEnergy = (minimum: number, maximum: number) => {
          const start = Math.max(1, Math.floor((minimum / nyquist) * frequencyData.length));
          const end = Math.max(start + 1, Math.min(frequencyData.length, Math.ceil((maximum / nyquist) * frequencyData.length)));
          let total = 0;
          for (let index = start; index < end; index += 1) total += frequencyData[index];
          return total / (end - start) / 255;
        };
        targetLow = bandEnergy(45, 250);
        targetMid = bandEnergy(250, 2400);
        targetHigh = bandEnergy(2400, 9000);
        let squareTotal = 0;
        for (const sample of timeDomainData) squareTotal += Math.pow((sample - 128) / 128, 2);
        targetEnergy = clamp01(Math.sqrt(squareTotal / timeDomainData.length) * 3.2);

        if (now - lastAnalysisAtRef.current >= 90 && targetEnergy > 0.012) {
          lastAnalysisAtRef.current = now;
          const measured = Array.from({ length: 12 }, () => 0);
          for (let index = 1; index < frequencyData.length; index += 1) {
            const frequency = (index * audioContext.sampleRate) / analyser.fftSize;
            if (frequency < 55 || frequency > 2200) continue;
            const midi = Math.round(69 + 12 * Math.log2(frequency / 440));
            const pitchClass = ((midi % 12) + 12) % 12;
            const magnitude = Math.pow(frequencyData[index] / 255, 2);
            measured[pitchClass] += magnitude / Math.sqrt(Math.max(1, frequency / 110));
          }
          const maximum = Math.max(...measured, 0.0001);
          chromaRef.current = measured.map((value, index) => {
            const normalized = value / maximum;
            return chromaRef.current[index] * 0.55 + normalized * 0.45;
          });
          const candidate = analyzePitchClassChroma(chromaRef.current);
          trackerRef.current = advanceChordTracker(trackerRef.current, candidate);
          const displayed = trackerRef.current.active ?? candidate;
          evidenceRef.current = { ...displayed, chroma: [...chromaRef.current] };
          onChordEvidenceRef.current?.({
            evidence: evidenceRef.current,
            tier: confidenceTier(evidenceRef.current.confidence),
            pendingChord: trackerRef.current.pendingChord,
            pendingFrames: trackerRef.current.pendingFrames,
          });
        }
      }

      const response = hasLiveSignal ? 0.2 : 0.07;
      state.energy += (targetEnergy - state.energy) * response;
      state.low += (targetLow - state.low) * response;
      state.mid += (targetMid - state.mid) * response;
      state.high += (targetHigh - state.high) * response;

      context.fillStyle = '#020409';
      context.fillRect(0, 0, width, height);
      context.strokeStyle = 'rgba(92, 112, 142, 0.1)';
      context.lineWidth = 1;
      for (let x = 24; x < width; x += 32) { context.beginPath(); context.moveTo(x, 0); context.lineTo(x, usableHeight); context.stroke(); }
      for (let y = 24; y < usableHeight; y += 32) { context.beginPath(); context.moveTo(0, y); context.lineTo(width, y); context.stroke(); }

      const centerX = width / 2;
      const centerY = usableHeight * 0.32;
      const radius = Math.min(width * 0.3, usableHeight * 0.22, 132);
      context.beginPath();
      context.arc(centerX, centerY, radius, 0, Math.PI * 2);
      context.strokeStyle = 'rgba(75, 93, 120, 0.42)';
      context.stroke();

      const nodePoint = (pitchClass: number, distance = radius) => {
        const circleIndex = CIRCLE_OF_FIFTHS_PITCH_CLASSES.findIndex(value => value === pitchClass);
        const angle = -Math.PI / 2 + circleIndex * Math.PI / 6;
        return { x: centerX + Math.cos(angle) * distance, y: centerY + Math.sin(angle) * distance };
      };
      const evidence = evidenceRef.current;
      const tier = confidenceTier(evidence?.confidence ?? 0);
      const tierColor = TIER_COLORS[tier];

      if (evidence) {
        const root = nodePoint(evidence.rootIndex);
        const third = nodePoint(evidence.thirdIndex);
        const fifth = nodePoint(evidence.fifthIndex);
        context.save();
        context.beginPath();
        context.moveTo(root.x, root.y);
        const curveAmount = 0.38;
        const curveTo = (from: { x: number; y: number }, to: { x: number; y: number }) => {
          const midpointX = (from.x + to.x) / 2;
          const midpointY = (from.y + to.y) / 2;
          const controlX = midpointX + (centerX - midpointX) * curveAmount;
          const controlY = midpointY + (centerY - midpointY) * curveAmount;
          context.quadraticCurveTo(controlX, controlY, to.x, to.y);
        };
        curveTo(root, third);
        curveTo(third, fifth);
        curveTo(fifth, root);
        context.strokeStyle = hexToRgba(tierColor, tier === 'LOW' ? 0.46 : 0.78);
        context.fillStyle = hexToRgba(tierColor, tier === 'LOW' ? 0.035 : 0.075);
        context.lineWidth = tier === 'LOW' ? 1 : 1.6;
        context.fill();
        context.stroke();
        context.restore();
      }

      CIRCLE_OF_FIFTHS_PITCH_CLASSES.forEach(pitchClass => {
        const point = nodePoint(pitchClass);
        const chromaEnergy = chromaRef.current[pitchClass] ?? 0;
        const isTriad = Boolean(evidence && [evidence.rootIndex, evidence.thirdIndex, evidence.fifthIndex].includes(pitchClass));
        context.save();
        context.beginPath();
        context.arc(point.x, point.y, 3.5 + chromaEnergy * 8 + (isTriad ? 1.5 : 0), 0, Math.PI * 2);
        context.fillStyle = PITCH_COLORS[pitchClass];
        context.globalAlpha = 0.22 + chromaEnergy * 0.78;
        context.shadowBlur = chromaEnergy * 18;
        context.shadowColor = PITCH_COLORS[pitchClass];
        context.fill();
        context.restore();
        context.fillStyle = isTriad ? '#f8fafc' : 'rgba(203, 213, 225, 0.55)';
        context.font = `${isTriad ? '700 10px' : '600 8px'} ui-monospace, monospace`;
        context.textAlign = 'center';
        context.fillText(NOTE_NAMES[pitchClass], point.x, point.y + 17 + chromaEnergy * 4);
      });

      let centroidX = 0;
      let centroidY = 0;
      let centroidWeight = 0;
      CIRCLE_OF_FIFTHS_PITCH_CLASSES.forEach(pitchClass => {
        const point = nodePoint(pitchClass, 1);
        const weight = chromaRef.current[pitchClass] ?? 0;
        centroidX += (point.x - centerX) * weight;
        centroidY += (point.y - centerY) * weight;
        centroidWeight += weight;
      });
      if (centroidWeight > 0.02) {
        const scale = radius * 0.62 / centroidWeight;
        context.beginPath();
        context.moveTo(centerX, centerY);
        context.lineTo(centerX + centroidX * scale, centerY + centroidY * scale);
        context.strokeStyle = 'rgba(248, 250, 252, 0.34)';
        context.setLineDash([3, 5]);
        context.stroke();
        context.setLineDash([]);
      }

      context.textAlign = 'center';
      context.fillStyle = '#f8fafc';
      context.font = '800 22px ui-monospace, monospace';
      context.fillText(evidence?.root ?? '--', centerX, centerY - 4);
      context.fillStyle = tierColor;
      context.font = '700 8px ui-monospace, monospace';
      context.fillText(evidence?.quality.toUpperCase() ?? 'LISTENING', centerX, centerY + 14);
      context.fillStyle = 'rgba(148, 163, 184, 0.58)';
      context.fillText('PITCH-CLASS CENTROID', centerX, centerY + 30);

      const waveformCenterY = usableHeight * 0.78;
      const waveformWidth = Math.min(width - 48, 620);
      const waveformStartX = (width - waveformWidth) / 2;
      const maximumAmplitude = Math.min(62, usableHeight * 0.125);
      const waveform = new Path2D();
      const pointCount = Math.max(120, Math.floor(waveformWidth / 2));
      for (let index = 0; index <= pointCount; index += 1) {
        const progress = index / pointCount;
        const sampleIndex = timeDomainData ? Math.min(timeDomainData.length - 1, Math.floor(progress * timeDomainData.length)) : 0;
        const sample = hasLiveSignal && timeDomainData ? (timeDomainData[sampleIndex] - 128) / 128 : 0;
        const x = waveformStartX + progress * waveformWidth;
        const y = waveformCenterY + sample * maximumAmplitude;
        if (index === 0) waveform.moveTo(x, y); else waveform.lineTo(x, y);
      }
      context.beginPath();
      context.moveTo(waveformStartX, waveformCenterY);
      context.lineTo(waveformStartX + waveformWidth, waveformCenterY);
      context.strokeStyle = 'rgba(108, 126, 154, 0.18)';
      context.stroke();
      context.save();
      context.strokeStyle = hexToRgba(tierColor, tier === 'LOW' ? 0.16 : 0.24);
      context.lineWidth = 12 + state.energy * 8;
      context.shadowBlur = tier === 'LOW' ? 10 : 24 + state.energy * 20;
      context.shadowColor = tierColor;
      context.stroke(waveform);
      context.restore();
      context.strokeStyle = tier === 'LOW' ? hexToRgba(tierColor, 0.72) : tierColor;
      context.lineWidth = 2.5;
      context.stroke(waveform);
      context.strokeStyle = '#f8fafc';
      context.lineWidth = 1;
      context.stroke(waveform);

      const plumeBottom = usableHeight - 7;
      const plumeHeight = Math.min(54, usableHeight * 0.12);
      for (let x = 0; x < width; x += 7) {
        const blend = x / Math.max(1, width);
        const heightValue = (state.low * (1 - blend) + state.mid * 0.6 + state.high * blend) * plumeHeight;
        context.fillStyle = hexToRgba(tierColor, tier === 'LOW' ? 0.12 : 0.2);
        context.fillRect(x, plumeBottom - heightValue, 4, heightValue);
      }

      context.textAlign = 'left';
      context.fillStyle = 'rgba(148, 163, 184, 0.62)';
      context.font = '700 8px ui-monospace, monospace';
      context.fillText('PITCH-CLASS CHROMAGRAM · ACOUSTIC WAVEFORM', waveformStartX, waveformCenterY - maximumAmplitude - 16);
      context.textAlign = 'right';
      context.fillStyle = tierColor;
      context.fillText(`E=${state.energy.toFixed(2)} L=${state.low.toFixed(2)} M=${state.mid.toFixed(2)} H=${state.high.toFixed(2)}`, waveformStartX + waveformWidth, waveformCenterY - maximumAmplitude - 16);

      animationRef.current = requestAnimationFrame(render);
    };

    resize();
    window.addEventListener('resize', resize);
    animationRef.current = requestAnimationFrame(render);
    return () => {
      window.removeEventListener('resize', resize);
      if (animationRef.current !== null) cancelAnimationFrame(animationRef.current);
    };
  }, [reservedFooterHeight]);

  return <canvas ref={canvasRef} className="absolute inset-0 h-full w-full rounded-2xl pointer-events-none" />;
};

export default LiveVisualizer;
