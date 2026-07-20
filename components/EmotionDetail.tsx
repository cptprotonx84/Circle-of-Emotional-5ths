import React from 'react';
import { EmotionalKeyData } from '../types';
import { Music, Activity, Heart, Zap } from 'lucide-react';

interface EmotionDetailProps {
  data: EmotionalKeyData | null;
}

const EmotionDetail: React.FC<EmotionDetailProps> = ({ data }) => {
  if (!data) {
    return (
      <div className="flex items-center justify-center h-full hacker-text-dim uppercase text-xs italic tracking-widest">
        &gt; WAITING_FOR_SELECTION_SIGNAL...
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Header Card */}
      <div className="col-span-1 md:col-span-2 terminal-box p-6 relative overflow-hidden group">
        <div className={`absolute inset-0 bg-gradient-to-br ${data.tailwindGradient} opacity-5 group-hover:opacity-10 transition-opacity`} />
        <div className="relative z-10 flex justify-between items-start">
          <div>
             <h2 data-testid="selected-display-name" className="text-4xl font-bold hacker-text mb-1 tracking-tighter">{data.displayName}</h2>
             <p data-testid="selected-emotion" className="text-xl text-neonViolet font-light uppercase tracking-widest">{data.emotion.replace('_', ' ')}</p>
          </div>
          <div className="text-right">
            <span className="inline-block px-3 py-1 bg-black border border-neonViolet text-[10px] text-neonViolet shadow-[0_0_5px_rgba(208,0,255,0.5)]">
              POS_{data.keyPosition}
            </span>
          </div>
        </div>
        <div className="relative z-10 mt-6 pt-4 border-t border-neonViolet/30">
           <p className="text-[10px] hacker-text-dim uppercase tracking-wider mb-1">PROMPT_SIGNATURE</p>
           <p className="text-lg hacker-text font-medium italic">"{data.mood}"</p>
        </div>
      </div>

      {/* Metrics */}
      <div className="terminal-box p-5 flex flex-col justify-center">
        <div className="flex items-center gap-3 mb-2">
          <Heart className="w-4 h-4 text-neonViolet" />
          <span className="text-[10px] uppercase tracking-widest hacker-text-dim">VALENCE</span>
        </div>
        <div className="flex items-end gap-2">
          <span data-testid="selected-valence" className="text-3xl font-bold hacker-text">{data.valence}</span>
          <span className="text-[10px] hacker-text-dim mb-1.5">/ 1.0</span>
        </div>
        <div className="w-full bg-black border border-neonViolet/30 h-1 mt-3 overflow-hidden shadow-[inset_0_0_5px_rgba(0,0,0,1)]">
          <div 
             className="h-full bg-hackerGreen shadow-[0_0_10px_#00ff41] transition-all duration-1000 ease-out" 
             style={{ width: `${((data.valence + 1) / 2) * 100}%` }} 
          />
        </div>
      </div>

      <div className="terminal-box p-5 flex flex-col justify-center">
        <div className="flex items-center gap-3 mb-2">
          <Zap className="w-4 h-4 text-neonViolet" />
          <span className="text-[10px] uppercase tracking-widest hacker-text-dim">AROUSAL</span>
        </div>
        <div className="flex items-end gap-2">
          <span data-testid="selected-arousal" className="text-3xl font-bold hacker-text">{data.arousal}</span>
          <span className="text-[10px] hacker-text-dim mb-1.5">/ 1.0</span>
        </div>
        <div className="w-full bg-black border border-neonViolet/30 h-1 mt-3 overflow-hidden shadow-[inset_0_0_5px_rgba(0,0,0,1)]">
          <div 
             className="h-full bg-hackerGreen shadow-[0_0_10px_#00ff41] transition-all duration-1000 ease-out" 
             style={{ width: `${data.arousal * 100}%` }} 
          />
        </div>
      </div>
    </div>
  );
};

export default EmotionDetail;
