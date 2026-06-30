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
      // Speed scales with arousal
      const speed = 0.03 + Math.abs(arousal) * 0.05;
      setPhase(prev => (prev + speed) % (Math.PI * 2));
      animationFrameId = requestAnimationFrame(animate);
    };
    animate();
    return () => cancelAnimationFrame(animationFrameId);
  }, [arousal]);

  const numPoints = 150;
  // Amplitude and frequency scale with arousal
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

  // D3 Scales and Layout
  const pie = d3.pie<EmotionalKeyData>()
    .value(1) // Equal slices
    .sort((a, b) => a.keyPosition - b.keyPosition) // Ensure C is top then clockwise
    .startAngle(-Math.PI / 2 + Math.PI / 12) // Rotate so C (index 1) is at top. Each slice is 30deg (PI/6). Center of C slice at -90deg.
    .endAngle(1.5 * Math.PI + Math.PI / 12);

  // Main arc generator for the background of slices
  const arcGenerator = d3.arc<d3.PieArcDatum<EmotionalKeyData>>()
    .innerRadius(radius * 0.55)
    .outerRadius(radius);
  
  // Specific arc generator for the outer color ring to avoid passing custom radii to the datum
  const colorRingArc = d3.arc<d3.PieArcDatum<EmotionalKeyData>>()
    .innerRadius(radius * 0.92)
    .outerRadius(radius);

  const labelArc = d3.arc<d3.PieArcDatum<EmotionalKeyData>>()
    .innerRadius(radius * 0.75)
    .outerRadius(radius * 0.75);

  const arcs = useMemo(() => pie(data), [data]);

  const activeId = hoveredId || selectedId;
  const activeData = activeId ? data.find(d => d.id === activeId) : null;

  // Map gradient name to a solid color for the stroke
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
    return '#a855f7'; // default neonViolet
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
          <circle r={radius * 0.5} className="fill-black stroke-neonViolet stroke-2 drop-shadow-[0_0_10px_rgba(208,0,255,0.5)]" />
          <text textAnchor="middle" dy="0.3em" className="fill-hackerGreen text-sm font-bold tracking-[0.3em] pointer-events-none drop-shadow-[0_0_5px_#00ff41]">
             {activeData ? activeData.musicalKey.split(' ')[0] : 'SELECT'}
          </text>
          {activeData && (
             <text textAnchor="middle" dy="1.8em" className="fill-gray-500 text-[9px] uppercase tracking-widest pointer-events-none">
               {activeData.musicalKey.includes('Minor') ? 'Minor' : 'Major'}
             </text>
          )}

          {/* Slices */}
          {arcs.map((slice) => {
            // Logic determines which slice is visually "active"
            const isHovered = hoveredId === slice.data.id;
            const isSelected = selectedId === slice.data.id;
            
            // If user is hovering something, that thing is active.
            // If user is NOT hovering anything, the selected thing is active.
            const isActive = isHovered || (hoveredId === null && isSelected);
            
            // Everything else is dimmed if there is an active state in play
            const isDimmed = (hoveredId !== null || selectedId !== null) && !isActive;

            const [centroidX, centroidY] = labelArc.centroid(slice);
            
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
                  className={`
                    stroke-black stroke-[3px]
                    ${isActive ? 'fill-[#00ff41]' : 'fill-[#0f172a] hover:fill-[#1e293b]'}
                  `}
                  animate={{ scale: isActive ? 1.05 : 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                />
                
                {/* Visual Indicator of Color using dedicated arc generator */}
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

                <motion.text
                  transform={`translate(${centroidX}, ${centroidY})`}
                  textAnchor="middle"
                  dy="0.35em"
                  className={`
                    text-xs font-bold pointer-events-none transition-colors duration-300
                    ${isActive ? 'fill-black' : 'fill-hackerGreen drop-shadow-[0_0_5px_#00ff41]'}
                  `}
                  animate={{ scale: isActive ? 1.1 : 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                >
                  {slice.data.musicalKey.split(' ')[0]}
                </motion.text>
                
                {/* Minor/Major Indicator Subtext */}
                <motion.text
                   transform={`translate(${centroidX}, ${centroidY + 12})`}
                   textAnchor="middle"
                   className={`text-[8px] pointer-events-none uppercase ${isActive ? 'fill-gray-800' : 'fill-neonViolet drop-shadow-[0_0_2px_#D000FF]'}`}
                   animate={{ scale: isActive ? 1.1 : 1 }}
                   transition={{ type: "spring", stiffness: 300, damping: 20 }}
                >
                   {slice.data.musicalKey.includes('Minor') ? 'min' : 'maj'}
                </motion.text>

                {/* Emotion Note Text */}
                <motion.text
                   transform={`translate(${centroidX}, ${centroidY + 24})`}
                   textAnchor="middle"
                   className={`text-[6px] pointer-events-none uppercase tracking-wider ${isActive ? 'fill-black/60 font-bold' : 'fill-gray-500'}`}
                   animate={{ scale: isActive ? 1.1 : 1, opacity: isActive ? 1 : 0.4 }}
                   transition={{ type: "spring", stiffness: 300, damping: 20 }}
                >
                   {slice.data.emotion}
                </motion.text>
              </motion.g>
            );
          })}
        </g>
      </svg>
    </div>
  );
};

export default CircleOfFifths;