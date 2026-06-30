import React from 'react';
import { ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, ZAxis, ReferenceLine, CartesianGrid, Cell, Label } from 'recharts';
import { EmotionState } from '../types';

interface VisualizationProps {
  e1: EmotionState;
  e2: EmotionState;
}

const ResonanceVisualization: React.FC<VisualizationProps> = ({ e1, e2 }) => {
  const data = [
    { x: e1.valence, y: e1.arousal, id: 'e1', label: 'E1' },
    { x: e2.valence, y: e2.arousal, id: 'e2', label: 'E2' },
  ];

  return (
    <div className="w-full h-[300px] md:h-[400px]">
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis 
            type="number" 
            dataKey="x" 
            name="Valence" 
            domain={[-1.1, 1.1]} 
            stroke="#94a3b8"
            tick={{fontSize: 12}} 
          />
          <YAxis 
            type="number" 
            dataKey="y" 
            name="Arousal" 
            domain={[-1.1, 1.1]} 
            stroke="#94a3b8"
            tick={{fontSize: 12}} 
          />
          <ZAxis range={[100, 100]} />
          
          <ReferenceLine x={0} stroke="#475569" strokeDasharray="3 3" />
          <ReferenceLine y={0} stroke="#475569" strokeDasharray="3 3" />

          {/* Draw a line connecting the two points */}
          {/* Note: Recharts doesn't natively support a line between two specific scatter points easily without custom shape, 
              but we can overlay a ReferenceLine if it was axis aligned, or just rely on the visual distance. 
              For simplicity, we'll just show the points. */}

          <Scatter name="States" data={data}>
            {data.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={entry.id === 'e1' ? '#22d3ee' : '#fb7185'} // Cyan for E1, Rose for E2
                stroke="white"
                strokeWidth={2}
              />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
      <div className="text-center text-xs text-gray-500 mt-2">
        Visualizing emotional distance in V-A space
      </div>
    </div>
  );
};

export default ResonanceVisualization;