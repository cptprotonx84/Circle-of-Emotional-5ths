import React from 'react';
import {
  CartesianGrid,
  Label,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { EmotionalKeyData, MusicalKeyId } from '../types';

interface ValenceArousalChartProps {
  data: EmotionalKeyData[];
  selectedId: MusicalKeyId | null;
  hoveredId?: MusicalKeyId | null;
  onSelect: (id: MusicalKeyId) => void;
  onHover?: (id: MusicalKeyId | null) => void;
}

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const item = payload[0].payload as EmotionalKeyData;
  return (
    <div
      className="rounded border bg-black/95 p-3 text-xs font-mono shadow-2xl"
      style={{ borderColor: item.primaryColor, boxShadow: `0 0 15px ${item.primaryColor}40` }}
    >
      <div className="mb-1 flex items-center justify-between gap-4">
        <span className="font-bold text-white">{item.displayName}</span>
        <span className="rounded px-1.5 py-0.5 text-[9px] font-bold text-black" style={{ backgroundColor: item.primaryColor }}>
          POS_{item.keyPosition}
        </span>
      </div>
      <p className="text-[10px] uppercase tracking-wider text-hackerGreen">{item.emotion.replace('_', ' ')}</p>
      <div className="mt-2 flex gap-3 border-t border-white/10 pt-2 text-[10px] text-gray-300">
        <span>V: <strong className="text-white">{item.valence.toFixed(2)}</strong></span>
        <span>A: <strong className="text-white">{item.arousal.toFixed(2)}</strong></span>
      </div>
    </div>
  );
};

interface EmotionDotProps {
  cx?: number;
  cy?: number;
  payload?: EmotionalKeyData;
  selectedId: MusicalKeyId | null;
  hoveredId: MusicalKeyId | null;
  onSelect: (id: MusicalKeyId) => void;
  onHover?: (id: MusicalKeyId | null) => void;
}

const EmotionDot: React.FC<EmotionDotProps> = ({ cx, cy, payload, selectedId, hoveredId, onSelect, onHover }) => {
  if (cx === undefined || cy === undefined || !payload) return null;
  const isSelected = selectedId === payload.id;
  const isHovered = hoveredId === payload.id;
  const isActive = isSelected || isHovered;
  const isDimmed = (selectedId !== null || hoveredId !== null) && !isActive;
  const select = () => onSelect(payload.id);

  return (
    <g
      role="button"
      tabIndex={0}
      aria-label={`${payload.displayName}: ${payload.emotion.replace('_', ' ')}`}
      aria-pressed={isSelected}
      className="cursor-pointer outline-none"
      opacity={isDimmed ? 0.3 : 1}
      onClick={select}
      onMouseEnter={() => onHover?.(payload.id)}
      onMouseLeave={() => onHover?.(null)}
      onFocus={() => onHover?.(payload.id)}
      onBlur={() => onHover?.(null)}
      onKeyDown={event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          select();
        }
      }}
    >
      {isActive && (
        <>
          <circle cx={cx} cy={cy} r={isSelected ? 15 : 12} fill="none" stroke={payload.primaryColor} strokeWidth="1.5" strokeDasharray="3 3" />
          <circle cx={cx} cy={cy} r={isSelected ? 10 : 8} fill={payload.primaryColor} opacity="0.22" />
        </>
      )}
      <circle cx={cx} cy={cy} r={isSelected ? 6.5 : isHovered ? 5.5 : 4.5} fill={payload.primaryColor} stroke={isActive ? '#ffffff' : '#050810'} strokeWidth={isActive ? 2 : 1} />
      <text x={cx} y={cy - (isActive ? 13 : 9)} textAnchor="middle" fill={isActive ? '#ffffff' : payload.primaryColor} fontSize={isActive ? 10 : 8} fontWeight="700" fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace" pointerEvents="none">
        {payload.root}
      </text>
    </g>
  );
};

const ValenceArousalChart: React.FC<ValenceArousalChartProps> = ({ data, selectedId, hoveredId = null, onSelect, onHover }) => (
  <div className="relative h-full min-h-[300px] w-full">
    <div className="pointer-events-none absolute inset-0 z-10 flex flex-col justify-between p-6 text-[8px] font-mono uppercase tracking-widest opacity-40">
      <div className="flex justify-between">
        <span className="text-red-400">[TURBULENT / TENSION]</span>
        <span className="text-yellow-300">[EUPHORIC / RADIANT]</span>
      </div>
      <div className="mb-4 flex justify-between">
        <span className="text-indigo-400">[MELANCHOLIC / SOMBER]</span>
        <span className="text-teal-300">[SERENE / REFLECTIVE]</span>
      </div>
    </div>
    <ResponsiveContainer width="100%" height="100%">
      <ScatterChart margin={{ top: 24, right: 24, bottom: 24, left: 14 }}>
        <CartesianGrid strokeDasharray="2 5" stroke="#334155" opacity={0.45} />
        <XAxis type="number" dataKey="valence" name="Valence" domain={[-1, 1]} stroke="#64748b" tick={{ fontSize: 10 }}>
          <Label value="VALENCE · NEGATIVE → POSITIVE" offset={0} position="insideBottom" fill="#64748b" style={{ fontSize: '9px' }} />
        </XAxis>
        <YAxis type="number" dataKey="arousal" name="Arousal" domain={[-1, 1]} stroke="#64748b" tick={{ fontSize: 10 }}>
          <Label value="AROUSAL · LOW → HIGH" angle={-90} position="insideLeft" fill="#64748b" style={{ fontSize: '9px' }} />
        </YAxis>
        <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#d000ff', strokeDasharray: '3 3', opacity: 0.5 }} />
        <ReferenceLine y={0} stroke="#64748b" strokeDasharray="4 4" opacity={0.6} />
        <ReferenceLine x={0} stroke="#64748b" strokeDasharray="4 4" opacity={0.6} />
        <Scatter
          name="Emotional keys"
          data={data}
          shape={props => <EmotionDot {...props} selectedId={selectedId} hoveredId={hoveredId} onSelect={onSelect} onHover={onHover} />}
        />
      </ScatterChart>
    </ResponsiveContainer>
  </div>
);

export default ValenceArousalChart;
