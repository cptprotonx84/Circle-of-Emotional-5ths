import React, { useState, useEffect } from 'react';
import { EMOTIONAL_KEYS } from '../constants';
import CircleOfFifths from './CircleOfFifths';
import ValenceArousalChart from './ValenceArousalChart';
import EmotionDetail from './EmotionDetail';
import GeminiInsight from './GeminiInsight';
import Legend from './Legend';
import { getNearestKey } from '../utils/emotionMath';
import { EmotionState } from '../types';

interface EmoKeyAppProps {
  externalSelection?: EmotionState | null;
}

const EmoKeyApp: React.FC<EmoKeyAppProps> = ({ externalSelection }) => {
  const [selectedId, setSelectedId] = useState<number | null>(1); // Default to C Major
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const [isResonating, setIsResonating] = useState<boolean>(false);

  useEffect(() => {
    if (externalSelection) {
      const nearest = getNearestKey(externalSelection);
      if (nearest) {
        setSelectedId(nearest.id);
      }
    }
  }, [externalSelection]);

  const selectedData = selectedId ? EMOTIONAL_KEYS.find(k => k.id === selectedId) || null : null;

  return (
    <div className="w-full text-hackerGreen font-mono">
      <main className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Visualization */}
        <div className="lg:col-span-5 flex flex-col space-y-8">
          <section className="terminal-box p-6 flex flex-col items-center relative">
            <div className="w-full flex justify-between items-center mb-8">
              <h2 className="text-[10px] uppercase tracking-[0.3em] hacker-text-dim font-bold">
                [ HARMONIC_DOMAIN_CIRCLE ]
              </h2>
              <button 
                onClick={() => setIsResonating(!isResonating)}
                className={`text-[9px] uppercase tracking-widest px-3 py-1 border transition-colors ${
                  isResonating ? 'border-neonViolet text-neonViolet bg-neonViolet/10' : 'border-gray-700 text-gray-500 hover:text-gray-300'
                }`}
              >
                Resonance: {isResonating ? 'ON' : 'OFF'}
              </button>
            </div>
            <CircleOfFifths 
              data={EMOTIONAL_KEYS} 
              selectedId={selectedId} 
              hoveredId={hoveredId}
              isResonating={isResonating}
              onSelect={setSelectedId} 
              onHover={setHoveredId}
            />
            
            <Legend 
              data={EMOTIONAL_KEYS}
              selectedId={selectedId}
              hoveredId={hoveredId}
              onSelect={setSelectedId}
              onHover={setHoveredId}
            />
            
            <p className="text-[9px] hacker-text-dim mt-8 text-center max-w-xs uppercase tracking-widest leading-relaxed">
              &gt; SELECT_NODE_TO_INITIALIZE_DATA_DUMP
            </p>
          </section>

          <section className="terminal-box p-6 h-[350px] flex flex-col">
            <h2 className="text-[10px] uppercase tracking-[0.3em] hacker-text-dim mb-6 font-bold text-center">
              [ VALENCE_AROUSAL_CARTESIAN ]
            </h2>
            <div className="flex-1">
               <ValenceArousalChart 
                  data={EMOTIONAL_KEYS} 
                  selectedId={selectedId}
                  onSelect={setSelectedId}
               />
            </div>
          </section>
        </div>

        {/* Right Column: Details & AI */}
        <div className="lg:col-span-7 flex flex-col space-y-6">
           {/* Detail Cards */}
           <div className="min-h-[200px]">
             <EmotionDetail data={selectedData} />
           </div>
           
           {/* AI Insight Section */}
           <div className="flex-1 min-h-[400px]">
             <GeminiInsight data={selectedData} />
           </div>
        </div>

      </main>
    </div>
  );
};

export default EmoKeyApp;