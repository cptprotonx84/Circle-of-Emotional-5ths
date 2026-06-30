
import React from 'react';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
  Label
} from 'recharts';
import { EmotionalKeyData } from '../types';

interface ValenceArousalChartProps {
  data: EmotionalKeyData[];
  selectedId: number | null;
  onSelect: (id: number) => void;
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload as EmotionalKeyData;
    return (
      <div className="bg-surface border border-gray-600 p-3 rounded shadow-xl text-xs">
        <p className="font-bold text-white mb-1">{data.musicalKey}</p>
        <p className="text-gray-300">Emotion: <span className="text-primary">{data.emotion}</span></p>
        <p className="text-gray-400 mt-1">Valence: {data.valence}</p>
        <p className="text-gray-400">Arousal: {data.arousal}</p>
      </div>
    );
  }
  return null;
};

const ValenceArousalChart: React.FC<ValenceArousalChartProps> = ({ data, selectedId, onSelect }) => {
  return (
    <div className="h-full w-full min-h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart
          margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
          // Fix: Using 'any' for event type to bypass Recharts 'activePayload' property access error
          onClick={(e: any) => {
            if (e && e.activePayload && e.activePayload[0]) {
               onSelect(e.activePayload[0].payload.id);
            }
          }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis 
            type="number" 
            dataKey="valence" 
            name="Valence" 
            domain={[-1, 1]} 
            stroke="#94a3b8"
            tick={{fontSize: 12}}
          >
            <Label value="Valence (Negative → Positive)" offset={0} position="insideBottom" fill="#64748b" style={{ fontSize: '10px' }} />
          </XAxis>
          <YAxis 
            type="number" 
            dataKey="arousal" 
            name="Arousal" 
            domain={[0, 1]} 
            stroke="#94a3b8"
            tick={{fontSize: 12}}
          >
             <Label value="Arousal (Low → High)" angle={-90} position="insideLeft" fill="#64748b" style={{ fontSize: '10px' }} />
          </YAxis>
          <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
          <ReferenceLine y={0.5} stroke="#475569" strokeDasharray="3 3" />
          <ReferenceLine x={0} stroke="#475569" strokeDasharray="3 3" />
          
          <Scatter name="Emotions" data={data} fill="#8884d8" cursor="pointer">
            {data.map((entry, index) => {
              const isSelected = selectedId === entry.id;
              // Map tailwind gradient approximates to solid colors for the chart dots
              let fill = "#cbd5e1"; 
              if (entry.emotion === "Joy_Excitement") fill = "#facc15";
              if (entry.emotion === "Sadness") fill = "#4338ca";
              if (entry.emotion === "Tension_Anger") fill = "#dc2626";
              if (entry.emotion === "Serenity") fill = "#14b8a6";
              
              return (
                <Cell 
                  key={`cell-${index}`} 
                  fill={fill} 
                  stroke={isSelected ? "#fff" : "none"}
                  strokeWidth={2}
                  r={isSelected ? 8 : 5}
                  opacity={selectedId && !isSelected ? 0.3 : 1}
                />
              );
            })}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
};

export default ValenceArousalChart;