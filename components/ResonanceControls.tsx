import React from 'react';
import { EmotionState } from '../types';

interface ControlsProps {
  label: string;
  colorClass: string;
  state: EmotionState;
  onChange: (s: EmotionState) => void;
}

const ResonanceControls: React.FC<ControlsProps> = ({ label, colorClass, state, onChange }) => {
  return (
    <div className="terminal-box p-6 group">
      <h3 className="text-sm font-bold hacker-text uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
        <span className="text-neonViolet">&gt;</span> {label}
      </h3>
      
      <div className="space-y-8">
        <div>
          <div className="flex justify-between mb-3 text-[10px] uppercase tracking-widest">
            <span className="hacker-text-dim">VALENCE_COORDINATE</span>
            <span className="hacker-text font-bold shadow-[0_0_5px_rgba(0,255,65,0.4)] px-1 bg-black">{state.valence.toFixed(2)}</span>
          </div>
          <input
            type="range"
            min="-1"
            max="1"
            step="0.05"
            value={state.valence}
            onChange={(e) => onChange({ ...state, valence: parseFloat(e.target.value) })}
            className="w-full h-1 bg-black border border-neonViolet/30 rounded-full appearance-none cursor-pointer"
          />
          <div className="flex justify-between text-[8px] hacker-text-dim mt-2 uppercase tracking-[0.2em]">
            <span>[NEG]</span>
            <span>[POS]</span>
          </div>
        </div>

        <div>
          <div className="flex justify-between mb-3 text-[10px] uppercase tracking-widest">
            <span className="hacker-text-dim">AROUSAL_COORDINATE</span>
            <span className="hacker-text font-bold shadow-[0_0_5px_rgba(0,255,65,0.4)] px-1 bg-black">{state.arousal.toFixed(2)}</span>
          </div>
          <input
            type="range"
            min="-1"
            max="1"
            step="0.05"
            value={state.arousal}
            onChange={(e) => onChange({ ...state, arousal: parseFloat(e.target.value) })}
            className="w-full h-1 bg-black border border-neonViolet/30 rounded-full appearance-none cursor-pointer"
          />
          <div className="flex justify-between text-[8px] hacker-text-dim mt-2 uppercase tracking-[0.2em]">
            <span>[LOW_NRG]</span>
            <span>[HIGH_NRG]</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResonanceControls;