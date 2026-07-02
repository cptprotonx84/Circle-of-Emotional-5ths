import React, { useState, useEffect } from 'react';
import { EMOTIONAL_KEYS } from '../constants';
import CircleOfFifths from './CircleOfFifths';
import ValenceArousalChart from './ValenceArousalChart';
import EmotionDetail from './EmotionDetail';
import GeminiInsight from './GeminiInsight';
import Legend from './Legend';
import CollapsibleSection from './CollapsibleSection';
import { getNearestKey } from '../utils/emotionMath';
import { EmotionState } from '../types';
import { Circle, Target, Brain, Cpu, Activity, Music } from 'lucide-react';

const EmoKeyApp: React.FC = () => {
  const [selectedId, setSelectedId] = useState<number | null>(1);
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const [isResonating, setIsResonating] = useState<boolean>(false);
  const [mockTimeline, setMockTimeline] = useState({ chord: "C Major", tempo: 120, valence: 0.9, arousal: 0.8 });

  // Update mock rhythm more frequently
  useEffect(() => {
    const interval = setInterval(() => {
      const randomKey = EMOTIONAL_KEYS[Math.floor(Math.random() * EMOTIONAL_KEYS.length)];
      setMockTimeline({ 
        chord: randomKey.musicalKey, 
        tempo: 120 + Math.floor(Math.random() * 20),
        valence: randomKey.valence, 
        arousal: randomKey.arousal 
      });
    }, 5000); // 5s refresh instead of 120s
    return () => clearInterval(interval);
  }, []);
  
  const [openSections, setOpenSections] = useState({
    circle: true,
    map: false,
    analyzer: false,
    companion: false,
    debug: false
  });

  const selectedData = selectedId ? EMOTIONAL_KEYS.find(k => k.id === selectedId) || null : null;

  return (
    <div className="w-full text-hackerGreen font-mono px-4 py-8 max-w-5xl mx-auto">
      <header className="mb-8 border-b border-neonViolet/30 pb-4 text-center">
        <h1 className="text-xl font-bold tracking-[0.5em] text-neonViolet">NEURAL_HARMONY_SYSTEM</h1>
        <p className="text-[10px] hacker-text-dim mt-2 tracking-widest">v1.0.0-rc1 // OFFLINE_OPERATIONAL_MODE</p>
      </header>

      {/* Real-time Telemetry Dashboard */}
      <div className="grid grid-cols-4 gap-4 mb-8 terminal-box p-4 text-[10px] uppercase">
         <div>KEY: <span className="text-neonViolet">{mockTimeline.chord}</span></div>
         <div>VALENCE: <span className="text-hackerGreen">{mockTimeline.valence}</span></div>
         <div>AROUSAL: <span className="text-hackerGreen">{mockTimeline.arousal}</span></div>
         <div>BPM: <span className="text-neonViolet">{mockTimeline.tempo}</span></div>
      </div>

      <CollapsibleSection title="Circle of Fifths" icon={Circle} isOpen={openSections.circle} onToggle={() => setOpenSections({...openSections, circle: !openSections.circle})}>
        <div className="flex flex-col items-center">
          <button onClick={() => setIsResonating(!isResonating)} className="mb-4 text-[9px] uppercase border border-gray-700 px-3 py-1 hover:border-neonViolet">
            Resonance: {isResonating ? 'ON' : 'OFF'}
          </button>
          <CircleOfFifths data={EMOTIONAL_KEYS} selectedId={selectedId} hoveredId={hoveredId} isResonating={isResonating} onSelect={setSelectedId} onHover={setHoveredId} />
          
          <div className="mt-8 w-full border-t border-neonViolet/20 pt-4">
             <h4 className="text-[10px] uppercase tracking-widest text-hackerGreen mb-4 text-center">Legend / Reference</h4>
             <Legend data={EMOTIONAL_KEYS} selectedId={selectedId} hoveredId={hoveredId} onSelect={setSelectedId} onHover={setHoveredId} />
          </div>
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Emotion Map" icon={Target} isOpen={openSections.map} onToggle={() => setOpenSections({...openSections, map: !openSections.map})}>
        <ValenceArousalChart data={EMOTIONAL_KEYS} selectedId={selectedId} onSelect={setSelectedId} />
      </CollapsibleSection>

      <CollapsibleSection title="Transition Analyzer" icon={Activity} isOpen={openSections.analyzer} onToggle={() => setOpenSections({...openSections, analyzer: !openSections.analyzer})}>
        <div className="p-4 border border-neonViolet/20 rounded bg-black/30">
          <p className="text-[10px] uppercase tracking-widest text-hackerGreen/70">
            [ ENGINE_STATUS: STANDBY ]<br/>
            Select two keys to synthesize transition trajectory.
          </p>
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Songwriting Companion" icon={Brain} isOpen={openSections.companion} onToggle={() => setOpenSections({...openSections, companion: !openSections.companion})}>
        {selectedData ? (
          <>
            <EmotionDetail data={selectedData} />
            <GeminiInsight data={selectedData} />
          </>
        ) : (
          <p className="text-[10px] text-center italic">Select a key to view songwriting heuristics.</p>
        )}
      </CollapsibleSection>

      <CollapsibleSection title="Advanced / Debug" icon={Cpu} isOpen={openSections.debug} onToggle={() => setOpenSections({...openSections, debug: !openSections.debug})}>
        <pre className="text-[10px] overflow-x-auto text-gray-400">{JSON.stringify({selectedId, mockTimeline}, null, 2)}</pre>
      </CollapsibleSection>

    </div>
  );
};

export default EmoKeyApp;
