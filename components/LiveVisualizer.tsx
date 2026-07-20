import React, { useEffect, useRef } from 'react';
import { EMOTIONAL_KEYS } from '../constants';
import { EmotionalKeyData } from '../types';

interface LiveVisualizerProps {
  selectedKey: EmotionalKeyData;
  reservedFooterHeight?: number;
}

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

const hexToRgba = (hex: string, alpha: number) => {
  const normalized = hex.replace('#', '');
  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
};

const keyAngle = (key: EmotionalKeyData) => -Math.PI / 2 + (key.keyPosition - 1) * (Math.PI / 6);

const LiveVisualizer: React.FC<LiveVisualizerProps> = ({ selectedKey, reservedFooterHeight = 0 }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const selectedKeyRef = useRef(selectedKey);
  const targetArousalRef = useRef(clamp01(selectedKey.arousal));
  const visualStateRef = useRef({
    phase: 0,
    arousal: clamp01(selectedKey.arousal),
    angle: keyAngle(selectedKey),
  });

  useEffect(() => {
    selectedKeyRef.current = selectedKey;
    targetArousalRef.current = clamp01(selectedKey.arousal);
  }, [selectedKey]);

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

    const render = () => {
      const pixelRatio = window.devicePixelRatio || 1;
      const width = canvas.width / pixelRatio;
      const height = canvas.height / pixelRatio;
      const usableHeight = Math.max(260, height - reservedFooterHeight);
      const selected = selectedKeyRef.current;
      const state = visualStateRef.current;

      state.arousal += (targetArousalRef.current - state.arousal) * 0.035;
      state.phase += 0.009 + state.arousal * 0.019;

      const targetAngle = keyAngle(selected);
      let angleDifference = targetAngle - state.angle;
      while (angleDifference < -Math.PI) angleDifference += Math.PI * 2;
      while (angleDifference > Math.PI) angleDifference -= Math.PI * 2;
      state.angle += angleDifference * 0.075;

      context.fillStyle = '#020409';
      context.fillRect(0, 0, width, height);

      context.save();
      context.strokeStyle = 'rgba(92, 112, 142, 0.1)';
      context.lineWidth = 1;
      for (let x = 24; x < width; x += 32) {
        context.beginPath();
        context.moveTo(x, 0);
        context.lineTo(x, usableHeight);
        context.stroke();
      }
      for (let y = 24; y < usableHeight; y += 32) {
        context.beginPath();
        context.moveTo(0, y);
        context.lineTo(width, y);
        context.stroke();
      }
      context.restore();

      const orbitCenterX = width / 2;
      const orbitCenterY = usableHeight * 0.32;
      const orbitRadius = Math.min(width * 0.3, usableHeight * 0.22, 132);

      context.beginPath();
      context.arc(orbitCenterX, orbitCenterY, orbitRadius, 0, Math.PI * 2);
      context.strokeStyle = 'rgba(75, 93, 120, 0.34)';
      context.lineWidth = 1;
      context.stroke();

      EMOTIONAL_KEYS.forEach(key => {
        const angle = keyAngle(key);
        const nodeX = orbitCenterX + Math.cos(angle) * orbitRadius;
        const nodeY = orbitCenterY + Math.sin(angle) * orbitRadius;
        const isSelected = key.id === selected.id;
        const pulse = isSelected ? 1 + Math.sin(state.phase * 2.2) * 0.08 : 1;
        const nodeRadius = (isSelected ? 8 : 4) * pulse;

        context.save();
        context.beginPath();
        context.arc(nodeX, nodeY, nodeRadius, 0, Math.PI * 2);
        context.fillStyle = key.primaryColor;
        context.globalAlpha = isSelected ? 1 : 0.28;
        context.shadowBlur = isSelected ? 22 : 0;
        context.shadowColor = key.primaryColor;
        context.fill();
        context.restore();

        context.fillStyle = isSelected ? '#f8fafc' : 'rgba(203, 213, 225, 0.48)';
        context.font = `${isSelected ? '700 11px' : '600 8px'} ui-monospace, SFMono-Regular, Menlo, monospace`;
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(key.root, nodeX, nodeY + (isSelected ? 20 : 15));
      });

      const particleRadius = orbitRadius * (0.58 + state.arousal * 0.18);
      const particleX = orbitCenterX + Math.cos(state.angle) * particleRadius;
      const particleY = orbitCenterY + Math.sin(state.angle) * particleRadius;

      context.save();
      context.beginPath();
      context.moveTo(orbitCenterX, orbitCenterY);
      context.lineTo(particleX, particleY);
      context.strokeStyle = hexToRgba(selected.primaryColor, 0.48);
      context.setLineDash([4, 6]);
      context.stroke();
      context.setLineDash([]);
      context.beginPath();
      context.arc(particleX, particleY, 7 + state.arousal * 4, 0, Math.PI * 2);
      context.fillStyle = '#ffffff';
      context.shadowBlur = 28;
      context.shadowColor = selected.primaryColor;
      context.fill();
      context.restore();

      context.textAlign = 'center';
      context.fillStyle = '#f8fafc';
      context.font = '800 22px ui-monospace, SFMono-Regular, Menlo, monospace';
      context.fillText(selected.root, orbitCenterX, orbitCenterY - 4);
      context.fillStyle = selected.primaryColor;
      context.font = '700 8px ui-monospace, SFMono-Regular, Menlo, monospace';
      context.fillText(selected.quality.toUpperCase(), orbitCenterX, orbitCenterY + 14);

      const waveformCenterY = usableHeight * 0.78;
      const waveformWidth = Math.min(width - 48, 620);
      const waveformStartX = (width - waveformWidth) / 2;
      const maximumAmplitude = Math.min(58, usableHeight * 0.115);
      const amplitude = 7 + state.arousal * (maximumAmplitude - 7);
      const cycles = 1.35 + state.arousal * 0.8;
      const path = new Path2D();
      const pointCount = Math.max(120, Math.floor(waveformWidth / 2));

      for (let index = 0; index <= pointCount; index += 1) {
        const progress = index / pointCount;
        const envelope = Math.pow(Math.sin(Math.PI * progress), 0.72);
        const primaryWave = Math.sin(progress * Math.PI * 2 * cycles + state.phase);
        const harmonicWave = Math.sin(progress * Math.PI * 2 * (cycles * 2.35) - state.phase * 0.62);
        const signal = primaryWave + harmonicWave * (0.12 + state.arousal * 0.2);
        const x = waveformStartX + progress * waveformWidth;
        const y = waveformCenterY + signal * amplitude * envelope * 0.76;
        if (index === 0) path.moveTo(x, y);
        else path.lineTo(x, y);
      }

      context.beginPath();
      context.moveTo(waveformStartX, waveformCenterY);
      context.lineTo(waveformStartX + waveformWidth, waveformCenterY);
      context.strokeStyle = 'rgba(108, 126, 154, 0.18)';
      context.lineWidth = 1;
      context.stroke();

      context.save();
      context.strokeStyle = hexToRgba(selected.primaryColor, 0.22);
      context.lineWidth = 13;
      context.shadowBlur = 24;
      context.shadowColor = selected.primaryColor;
      context.stroke(path);
      context.restore();

      context.save();
      context.strokeStyle = hexToRgba(selected.primaryColor, 0.72);
      context.lineWidth = 4;
      context.shadowBlur = 10;
      context.shadowColor = selected.primaryColor;
      context.stroke(path);
      context.restore();

      context.strokeStyle = '#f8fafc';
      context.lineWidth = 1.25;
      context.stroke(path);

      context.textAlign = 'left';
      context.fillStyle = 'rgba(148, 163, 184, 0.62)';
      context.font = '700 8px ui-monospace, SFMono-Regular, Menlo, monospace';
      context.fillText('GENERATED_AROUSAL_RESONANCE', waveformStartX, waveformCenterY - maximumAmplitude - 18);
      context.textAlign = 'right';
      context.fillStyle = hexToRgba(selected.primaryColor, 0.82);
      context.fillText(`A=${state.arousal.toFixed(2)}`, waveformStartX + waveformWidth, waveformCenterY - maximumAmplitude - 18);

      animationRef.current = requestAnimationFrame(render);
    };

    resize();
    window.addEventListener('resize', resize);
    render();

    return () => {
      window.removeEventListener('resize', resize);
      if (animationRef.current !== null) cancelAnimationFrame(animationRef.current);
    };
  }, [reservedFooterHeight]);

  return <canvas ref={canvasRef} className="absolute inset-0 h-full w-full rounded-2xl pointer-events-none" />;
};

export default LiveVisualizer;
