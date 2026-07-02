import React, { useMemo, useState, useEffect } from 'react';
import * as d3 from 'd3';
import { motion } from 'motion/react';
import { EmotionalKeyData } from '../types';

interface CircleOfFifthsProps {
  data: EmotionalKeyData[];
  selectedId: number | null;
  hoveredId: number | null;
  isResonating?: boolean;
  onSelect: (id: number) => void;
  onHover: (id: number | null) => void;
}

const WaveformOverlay: React.FC<{ arousal: number, color: string, radius: number }> = ({ arousal, color, radius }) => {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    let animationFrameId: number;
    const animate = () => {
      const speed = 0.03 + Math.abs(arousal) * 0.05;
      setPhase(prev => (prev + speed) % (Math.PI * 2));
      animationFrameId = requestAnimationFrame(animate);
    };
    animate();
    return () => cancelAnimationFrame(animationFrameId);
  }, [arousal]);

  const numPoints = 150;
  const amplitude = 4 + Math.abs(arousal) * 12;
  const frequency = 6 + Math.floor(Math.abs(arousal) * 8);

  const points = Array.from({ length: numPoints }).map((_, i) => {
    const angle = (i / numPoints) * Math.PI * 2;
    const r = radius + Math.sin(angle * frequency + phase) * amplitude;
    return `${r * Math.cos(angle)},${r * Math.sin(angle)}`;
  });

  const d = `M ${points.join(' L ')} Z`;

  return (
    <motion.path 
      d={d} 
      stroke={color} 
      fill="none" 
      strokeWidth={2} 
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 0.7, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ duration: 0.5 }}
      style={{ filter: "url(#glow)", pointerEvents: "none" }} 
    />
  );
};

const CircleOfFifths: React.FC<CircleOfFifthsProps> = ({ data, selectedId, hoveredId, isResonating, onSelect, onHover }) => {
  const width = 400;
  const height = 400;
  const radius = Math.min(width, height) / 2 - 40;
  const center = { x: width / 2, y: height / 2 };

  const pie = d3.pie<EmotionalKeyData>()
    .value(1)
    .sort((a, b) => a.keyPosition - b.keyPosition)
    .startAngle(-Math.PI / 2 + Math.PI / 12)
    .endAngle(1.5 * Math.PI + Math.PI / 12);

  const arcGenerator = d3.arc<d3.PieArcDatum<EmotionalKeyData>>()
    .innerRadius(radius * 0.55)
    .outerRadius(radius);
  
  const colorRingArc = d3.arc<d3.PieArcDatum<EmotionalKeyData>>()
    .innerRadius(radius * 0.92)
    .outerRadius(radius);

  const labelArc = d3.arc<d3.PieArcDatum<EmotionalKeyData>>()
    .innerRadius(radius * 0.74)
    .outerRadius(radius * 0.74);

  const arcs = useMemo(() => pie(data), [data]);

  const activeId = hoveredId ?? selectedId;
  const activeData = activeId != null ? data.find(d => d.id === activeId) : null;

  const getStrokeColor = (gradient: string) => {
    if (gradient.includes('red')) return '#ef4444';
    if (gradient.includes('yellow')) return '#facc15';
    if (gradient.includes('cyan')) return '#22d3ee';
    if (gradient.includes('green')) return '#22c55e';
    if (gradient.includes('blue')) return '#3b82f6';
    if (gradient.includes('teal')) return '#14b8a6';
    if (gradient.includes('violet')) return '#8b5cf6';
    if (gradient.includes('indigo')) return '#6366f1';
    if (gradient.includes('pink')) return '#ec4899';
    if (gradient.includes('rose') && gradient.includes('crimson')) return '#be123c';
    if (gradient.includes('rose')) return '#fb7185';
    if (gradient.includes('dark_blue')) return '#1e3a8a';
    return '#a855f7';
  };

  return (
    <div className="flex justify-center items-center relative select-none">
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="drop-shadow-2xl">
        <defs>
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>
        <g transform={`translate(${center.x},${center.y})`}>
          {isResonating && activeData && (
             <WaveformOverlay 
               arousal={activeData.arousal} 
               color={getStrokeColor(activeData.colorGradientName)} 
               radius={radius + 15} 
             />
          )}

          {/* Central Label */}
          <circle r={radius * 0.5} fill="#000000" />
          <text x={0} y={-8} textAnchor="middle" dominantBaseline="middle" fill="#d1d5db" fontSize={24} fontWeight={900} style={{ letterSpacing: '0.08em' }}>
            {activeData ? activeData.musicalKey.split(' ')[0] : '—'}
          </text>
          <text x={0} y={15} textAnchor="middle" dominantBaseline="middle" fill="#9ca3af" fontSize={10} fontWeight={800} style={{ letterSpacing: '0.25em' }}>
            {activeData ? (activeData.musicalKey.includes('Minor') ? 'MINOR' : 'MAJOR') : 'SELECT'}
          </text>

          {/* Slices */}
          {arcs.map((slice) => {
            const isHovered = hoveredId === slice.data.id;
            const isSelected = selectedId === slice.data.id;
            const isActive = isHovered || (hoveredId === null && isSelected);
            const isDimmed = (hoveredId !== null || selectedId !== null) && !isActive;

            return (
              <motion.g 
                key={slice.data.id} 
                onClick={() => onSelect(slice.data.id)}
                onMouseEnter={() => onHover(slice.data.id)}
                onMouseLeave={() => onHover(null)}
                className="cursor-pointer group"
                animate={{ opacity: isDimmed ? 0.3 : 1 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
              >
                <motion.path
                  d={arcGenerator(slice) || undefined}
                  className={`stroke-black stroke-[3px] ${isActive ? 'fill-[#00ff41]' : 'fill-[#1e293b] hover:fill-[#334155]'}`}
                  animate={{ scale: isActive ? 1.05 : 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                />
                <motion.path
                   d={colorRingArc(slice) || undefined}
                   className={`
                    ${slice.data.colorGradientName.includes('red') ? 'fill-red-500' : ''}
                    ${slice.data.colorGradientName.includes('yellow') ? 'fill-yellow-400' : ''}
                    ${slice.data.colorGradientName.includes('cyan') ? 'fill-cyan-400' : ''}
                    ${slice.data.colorGradientName.includes('green') ? 'fill-green-500' : ''}
                    ${slice.data.colorGradientName.includes('blue') ? 'fill-blue-500' : ''}
                    ${slice.data.colorGradientName.includes('teal') ? 'fill-teal-500' : ''}
                    ${slice.data.colorGradientName.includes('violet') ? 'fill-violet-500' : ''}
                    ${slice.data.colorGradientName.includes('indigo') ? 'fill-indigo-500' : ''}
                    ${slice.data.colorGradientName.includes('pink') ? 'fill-pink-500' : ''}
                    ${slice.data.colorGradientName.includes('rose') ? 'fill-rose-400' : ''}
                    ${slice.data.colorGradientName.includes('crimson') ? 'fill-rose-700' : ''}
                    ${slice.data.colorGradientName.includes('dark_blue') ? 'fill-blue-900' : ''}
                   `}
                   animate={{ scale: isActive ? 1.05 : 1 }}
                   transition={{ type: "spring", stiffness: 300, damping: 20 }}
                />
              </motion.g>
            );
          })}

          {/* Top Label Layer */}
          {arcs.map((slice) => {
            const isHovered = hoveredId === slice.data.id;
            const isSelected = selectedId === slice.data.id;
            const isActive = isHovered || (hoveredId === null && isSelected);

            const [x, y] = labelArc.centroid(slice);
            const keyRoot = slice.data.musicalKey.split(' ')[0];
            const mode = slice.data.musicalKey.includes('Minor') ? 'MIN' : 'MAJ';

            return (
              <g key={`label-${slice.data.id}`} pointerEvents="none">
                <text
                  x={x}
                  y={y - 6}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill={isActive ? '#020617' : '#9ca3af'}
                  fontSize={16}
                  fontWeight={900}
                  style={{
                    filter: isActive ? 'none' : 'drop-shadow(0 0 4px #00ff41)',
                    letterSpacing: '0.04em'
                  }}
                >
                  {keyRoot}
                </text>
                <text
                  x={x}
                  y={y + 10}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill={isActive ? '#111827' : '#6b7280'}
                  fontSize={7}
                  fontWeight={700}
                  style={{ letterSpacing: '0.08em' }}
                >
                  {mode}
                </text>
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
};

export default CircleOfFifths;
