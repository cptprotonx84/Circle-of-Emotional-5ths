import React, { useEffect, useMemo, useState } from 'react';
import * as d3 from 'd3';
import { motion } from 'motion/react';
import { EmotionalKeyData } from '../types';

interface CircleOfFifthsProps {
  data: EmotionalKeyData[];
  selectedId: number | null;
  hoveredId: number | null;
  isResonating?: boolean;
  activeWedgeStyle?: ActiveWedgeStyle;
  onSelect: (id: number) => void;
  onHover: (id: number | null) => void;
}

type ActiveWedgeStyle = 'gradient' | 'wave' | 'aurora';

// Change this single value to compare the three prototype treatments.
const ACTIVE_WEDGE_STYLE: ActiveWedgeStyle = 'aurora';

const polarPoint = (angle: number, pointRadius: number) => ({
  x: Math.sin(angle) * pointRadius,
  y: -Math.cos(angle) * pointRadius,
});

const describeArcLine = (startAngle: number, endAngle: number, lineRadius: number) => {
  const start = polarPoint(startAngle, lineRadius);
  const end = polarPoint(endAngle, lineRadius);
  const largeArcFlag = endAngle - startAngle > Math.PI ? 1 : 0;
  return `M ${start.x} ${start.y} A ${lineRadius} ${lineRadius} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`;
};

const WaveformOverlay: React.FC<{ arousal: number; color: string; radius: number }> = ({ arousal, color, radius }) => {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    let animationFrameId: number;
    const animate = () => {
      const speed = 0.03 + Math.abs(arousal) * 0.05;
      setPhase(previous => (previous + speed) % (Math.PI * 2));
      animationFrameId = requestAnimationFrame(animate);
    };

    animate();
    return () => cancelAnimationFrame(animationFrameId);
  }, [arousal]);

  const points = Array.from({ length: 150 }, (_, index) => {
    const angle = (index / 150) * Math.PI * 2;
    const amplitude = 4 + Math.abs(arousal) * 12;
    const frequency = 6 + Math.floor(Math.abs(arousal) * 8);
    const pointRadius = radius + Math.sin(angle * frequency + phase) * amplitude;
    return `${pointRadius * Math.cos(angle)},${pointRadius * Math.sin(angle)}`;
  });

  return (
    <motion.path
      d={`M ${points.join(' L ')} Z`}
      stroke={color}
      fill="none"
      strokeWidth={2}
      initial={{ opacity: 0 }}
      animate={{ opacity: 0.65 }}
      transition={{ duration: 0.35 }}
      style={{ filter: 'url(#circle-glow)', pointerEvents: 'none' }}
    />
  );
};

const CircleOfFifths: React.FC<CircleOfFifthsProps> = ({
  data,
  selectedId,
  hoveredId,
  isResonating,
  activeWedgeStyle = ACTIVE_WEDGE_STYLE,
  onSelect,
  onHover,
}) => {
  const size = 420;
  const radius = 168;
  const innerRadius = 98;
  const centerRadius = 86;
  const labelRadius = 132;
  const center = size / 2;

  const arcs = useMemo(() => {
    const pie = d3
      .pie<EmotionalKeyData>()
      .value(1)
      .sort((a, b) => a.keyPosition - b.keyPosition)
      .startAngle(-Math.PI / 2 + Math.PI / 12)
      .endAngle(1.5 * Math.PI + Math.PI / 12);

    return pie(data);
  }, [data]);

  const wedgeArc = useMemo(
    () => d3.arc<d3.PieArcDatum<EmotionalKeyData>>().innerRadius(innerRadius).outerRadius(radius),
    [],
  );
  const rimArc = useMemo(
    () => d3.arc<d3.PieArcDatum<EmotionalKeyData>>().innerRadius(radius - 12).outerRadius(radius),
    [],
  );
  const labelArc = useMemo(
    () => d3.arc<d3.PieArcDatum<EmotionalKeyData>>().innerRadius(labelRadius).outerRadius(labelRadius),
    [],
  );

  const activeId = hoveredId ?? selectedId;
  const activeData = data.find(item => item.id === activeId) ?? null;
  const activeIndex = arcs.findIndex(slice => slice.data.id === activeId);
  const activeKey = activeData?.musicalKey.split(' ')[0] ?? '—';
  const activeMode = activeData?.musicalKey.includes('Minor') ? 'MINOR' : 'MAJOR';
  const activeEmotion = activeData?.emotion.replace('_', ' ') ?? 'SELECT A KEY';

  return (
    <div className="relative flex w-full items-center justify-center select-none" aria-label="Interactive Circle of Fifths">
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="h-auto w-full max-w-[420px] overflow-visible"
        role="img"
        data-active-wedge-style={activeWedgeStyle}
        aria-label={activeData ? `Circle of Fifths, ${activeData.musicalKey} selected` : 'Circle of Fifths'}
      >
        <defs>
          <filter id="circle-glow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          <filter id="active-wedge-edge" x="-35%" y="-35%" width="170%" height="170%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="2.8" result="edgeBlur" />
            <feMerge>
              <feMergeNode in="edgeBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="active-wedge-bloom" x="-45%" y="-45%" width="190%" height="190%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="7" />
          </filter>
          <radialGradient id="circle-center-fill" cx="50%" cy="42%" r="68%">
            <stop offset="0%" stopColor="#0d1420" />
            <stop offset="72%" stopColor="#050810" />
            <stop offset="100%" stopColor="#010205" />
          </radialGradient>
          {arcs.map(slice => {
            const middleAngle = (slice.startAngle + slice.endAngle) / 2;
            const innerPoint = polarPoint(middleAngle, innerRadius);
            const outerPoint = polarPoint(middleAngle, radius);

            return (
              <React.Fragment key={`active-defs-${slice.data.id}`}>
                <linearGradient
                  id={`gradient-sweep-${slice.data.id}`}
                  gradientUnits="userSpaceOnUse"
                  x1={innerPoint.x}
                  y1={innerPoint.y}
                  x2={outerPoint.x}
                  y2={outerPoint.y}
                >
                  <stop offset="0%" stopColor="#050810" />
                  <stop offset="42%" stopColor={slice.data.primaryColor} stopOpacity="0.48" />
                  <stop offset="100%" stopColor={slice.data.secondaryColor} stopOpacity="0.98" />
                </linearGradient>
                <linearGradient
                  id={`wave-band-base-${slice.data.id}`}
                  gradientUnits="userSpaceOnUse"
                  x1={innerPoint.x}
                  y1={innerPoint.y}
                  x2={outerPoint.x}
                  y2={outerPoint.y}
                >
                  <stop offset="0%" stopColor="#060a12" />
                  <stop offset="55%" stopColor={slice.data.primaryColor} stopOpacity="0.26" />
                  <stop offset="100%" stopColor={slice.data.primaryColor} stopOpacity="0.5" />
                </linearGradient>
                <linearGradient
                  id={`aurora-glass-${slice.data.id}`}
                  gradientUnits="userSpaceOnUse"
                  x1={innerPoint.x}
                  y1={innerPoint.y}
                  x2={outerPoint.x}
                  y2={outerPoint.y}
                >
                  <stop offset="0%" stopColor="#07101a" stopOpacity="0.94" />
                  <stop offset="34%" stopColor={slice.data.primaryColor} stopOpacity="0.3" />
                  <stop offset="70%" stopColor={slice.data.secondaryColor} stopOpacity="0.72" />
                  <stop offset="100%" stopColor={slice.data.primaryColor} stopOpacity="0.92" />
                </linearGradient>
              </React.Fragment>
            );
          })}
        </defs>

        <g transform={`translate(${center}, ${center})`}>
          {isResonating && activeData && (
            <WaveformOverlay arousal={activeData.arousal} color={activeData.primaryColor} radius={radius + 10} />
          )}

          <circle r={radius + 5} fill="#02040a" stroke="#182131" strokeWidth="2" />

          {arcs.map((slice, sliceIndex) => {
            const isHovered = hoveredId === slice.data.id;
            const isSelected = selectedId === slice.data.id;
            const isActive = isHovered || (hoveredId === null && isSelected);
            const indexDistance = activeIndex < 0 ? Number.POSITIVE_INFINITY : Math.abs(sliceIndex - activeIndex);
            const circularDistance = Math.min(indexDistance, data.length - indexDistance);
            const isNeighbor = circularDistance === 1;
            const [labelX, labelY] = labelArc.centroid(slice);
            const keyName = slice.data.musicalKey.split(' ')[0];
            const mode = slice.data.musicalKey.includes('Minor') ? 'MIN' : 'MAJ';
            const activeFill =
              activeWedgeStyle === 'gradient'
                ? `url(#gradient-sweep-${slice.data.id})`
                : activeWedgeStyle === 'wave'
                  ? `url(#wave-band-base-${slice.data.id})`
                  : `url(#aurora-glass-${slice.data.id})`;
            const activeStroke = slice.data.primaryColor;

            return (
              <g
                key={slice.data.id}
                role="button"
                tabIndex={0}
                aria-label={`${slice.data.musicalKey}: ${slice.data.emotion.replace('_', ' ')}`}
                onClick={() => onSelect(slice.data.id)}
                onKeyDown={event => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onSelect(slice.data.id);
                  }
                }}
                onMouseEnter={() => onHover(slice.data.id)}
                onMouseLeave={() => onHover(null)}
                onFocus={() => onHover(slice.data.id)}
                onBlur={() => onHover(null)}
                className="cursor-pointer outline-none"
                opacity={activeId !== null && !isActive ? 0.72 : 1}
              >
                <title>{`${slice.data.musicalKey} — ${slice.data.emotion.replace('_', ' ')}`}</title>
                {isActive && (activeWedgeStyle === 'gradient' || activeWedgeStyle === 'aurora') && (
                  <path
                    d={wedgeArc(slice) ?? undefined}
                    fill={slice.data.primaryColor}
                    fillOpacity={activeWedgeStyle === 'aurora' ? 0.18 : 0.1}
                    filter="url(#active-wedge-bloom)"
                    pointerEvents="none"
                  />
                )}
                <path
                  d={wedgeArc(slice) ?? undefined}
                  fill={isActive ? activeFill : '#0a101c'}
                  stroke={isActive ? activeStroke : '#02040a'}
                  strokeWidth={isActive ? 2.3 : 3}
                  filter={isActive ? 'url(#active-wedge-edge)' : undefined}
                  vectorEffect="non-scaling-stroke"
                />
                {isNeighbor && activeData && (
                  <path
                    d={wedgeArc(slice) ?? undefined}
                    fill={activeData.primaryColor}
                    fillOpacity="0.055"
                    stroke={activeData.primaryColor}
                    strokeOpacity="0.16"
                    strokeWidth="1.2"
                    pointerEvents="none"
                  />
                )}
                <path
                  d={rimArc(slice) ?? undefined}
                  fill={slice.data.primaryColor}
                  opacity={isActive ? 1 : isNeighbor ? 0.7 : 0.46}
                  filter={isActive ? 'url(#active-wedge-edge)' : undefined}
                  pointerEvents="none"
                />

                {isActive && activeWedgeStyle === 'wave' && (
                  <g pointerEvents="none" fill="none" strokeLinecap="round">
                    {[112, 128, 145].map((bandRadius, bandIndex) => (
                      <path
                        key={bandRadius}
                        d={describeArcLine(slice.startAngle + 0.025, slice.endAngle - 0.025, bandRadius)}
                        stroke={bandIndex === 1 ? slice.data.secondaryColor : slice.data.primaryColor}
                        strokeWidth={bandIndex === 1 ? 2 : 1.25}
                        strokeOpacity={0.34 + bandIndex * 0.14}
                      />
                    ))}
                  </g>
                )}

                {isActive && activeWedgeStyle === 'aurora' && (
                  <g pointerEvents="none" fill="none">
                    <path
                      d={describeArcLine(slice.startAngle + 0.035, slice.endAngle - 0.035, innerRadius + 5)}
                      stroke="#ffffff"
                      strokeWidth="1.4"
                      strokeOpacity="0.34"
                      strokeLinecap="round"
                    />
                    <path
                      d={describeArcLine(slice.startAngle + 0.025, slice.endAngle - 0.025, radius - 5)}
                      stroke={slice.data.primaryColor}
                      strokeWidth="2.2"
                      strokeOpacity="0.88"
                      strokeLinecap="round"
                      filter="url(#active-wedge-edge)"
                    />
                  </g>
                )}

                <g transform={`translate(${labelX}, ${labelY})`} pointerEvents="none">
                  <text
                    x="0"
                    y="-1"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill={isActive ? '#f8fafc' : '#d8dee9'}
                    stroke={isActive ? '#02040a' : 'none'}
                    strokeWidth={isActive ? 1.8 : 0}
                    paintOrder="stroke"
                    fontFamily="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
                    fontSize="14"
                    fontWeight="800"
                  >
                    {keyName}
                  </text>
                  <text
                    x="0"
                    y="12"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill={isActive ? '#dbe4f0' : '#697386'}
                    stroke={isActive ? '#02040a' : 'none'}
                    strokeWidth={isActive ? 1.1 : 0}
                    paintOrder="stroke"
                    fontFamily="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
                    fontSize="7"
                    fontWeight="700"
                    letterSpacing="1.2"
                  >
                    {mode}
                  </text>
                </g>
              </g>
            );
          })}

          <circle r={centerRadius + 7} fill="#050810" stroke="#111827" strokeWidth="3" />
          <circle
            r={centerRadius}
            fill="url(#circle-center-fill)"
            stroke={activeData?.primaryColor ?? '#394456'}
            strokeOpacity="0.62"
            strokeWidth="2"
          />
          <circle r="54" fill="none" stroke="#202a3a" strokeWidth="1" strokeDasharray="2 8" opacity="0.9" />

          <g pointerEvents="none" textAnchor="middle">
            <text
              y="-42"
              fill="#778195"
              fontFamily="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
              fontSize="8"
              fontWeight="700"
              letterSpacing="2.4"
            >
              THE CIRCLE
            </text>
            <text
              y="10"
              fill="#f8fafc"
              fontFamily="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
              fontSize={activeKey.length > 2 ? 34 : 42}
              fontWeight="800"
              letterSpacing="-1"
            >
              {activeKey}
            </text>
            <text
              y="29"
              fill={activeData?.primaryColor ?? '#8b95a7'}
              fontFamily="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
              fontSize="8"
              fontWeight="800"
              letterSpacing="2.8"
            >
              {activeMode}
            </text>
            <text
              y="50"
              fill="#8590a3"
              fontFamily="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
              fontSize="7"
              letterSpacing="1.2"
            >
              {activeEmotion.toUpperCase()}
            </text>
          </g>
        </g>
      </svg>
    </div>
  );
};

export default CircleOfFifths;
