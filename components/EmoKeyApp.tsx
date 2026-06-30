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
import { Circle, Target, Brain, Cpu, Activity } from 'lucide-react';

interface EmoKeyAppProps {
  externalSelection?: EmotionState | null;
}

const EmoKeyApp: React.FC<EmoKeyAppProps> = ({ externalSelection }) => {
  const [selectedId, setSelectedId] = useState<number | null>(1);
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const [isResonating, setIsResonating] = useState<boolean>(false);
  
  // Toggle states
  const [openSections, setOpenSections] = useState({
    circle: true,
    map: false,
    analyzer: false,
    companion: false,
    debug: false
  });

  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  useEffect(() => {
    if (externalSelection) {
      const nearest = getNearestKey(externalSelection);
      if (nearest) setSelectedId(nearest.id);
    }
  }, [externalSelection]);

  const selectedData = selectedId ? EMOTIONAL_KEYS.find(k => k.id === selectedId) || null : null;

  return (
    <div className="w-full text-hackerGreen font-mono px-4 py-8 max-w-5xl mx-auto">
      <header className="mb-8 border-b border-neonViolet/30 pb-4 text-center">
        <h1 className="text-xl font-bold tracking-[0.5em] text-neonViolet">NEURAL_HARMONY_SYSTEM</h1>
        <p className="text-[10px] hacker-text-dim mt-2 tracking-widest">OFFLINE_OPERATIONAL_MODE</p>
      </header>

      <CollapsibleSection title="Circle of Fifths" icon={Circle} isOpen={openSections.circle} onToggle={() => toggleSection('circle')}>
        <div className="flex flex-col items-center">
          <button onClick={() => setIsResonating(!isResonating)} className="mb-4 text-[9px] uppercase border border-gray-700 px-3 py-1 hover:border-neonViolet">
            Resonance: {isResonating ? 'ON' : 'OFF'}
          </button>
          <CircleOfFifths data={EMOTIONAL_KEYS} selectedId={selectedId} hoveredId={hoveredId} isResonating={isResonating} onSelect={setSelectedId} onHover={setHoveredId} />
          <Legend data={EMOTIONAL_KEYS} selectedId={selectedId} hoveredId={hoveredId} onSelect={setSelectedId} onHover={setHoveredId} />
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Emotion Map" icon={Target} isOpen={openSections.map} onToggle={() => toggleSection('map')}>
        <ValenceArousalChart data={EMOTIONAL_KEYS} selectedId={selectedId} onSelect={setSelectedId} />
      </CollapsibleSection>

      <CollapsibleSection title="Transition Analyzer" icon={Activity} isOpen={openSections.analyzer} onToggle={() => toggleSection('analyzer')}>
        <div className="p-4 border border-neonViolet/20 rounded bg-black/30">
          <p className="text-[10px] uppercase tracking-widest text-hackerGreen/70">
            [ ENGINE_STATUS: STANDBY ]<br/>
            Select two keys from the visualizer to initiate harmonic trajectory synthesis.
          </p>
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Songwriting Companion" icon={Brain} isOpen={openSections.companion} onToggle={() => toggleSection('companion')}>
        {selectedData ? (
          <>
            <EmotionDetail data={selectedData} />
            <div className="mt-4 pt-4 border-t border-neonViolet/20">
              <h4 className="text-[9px] uppercase tracking-widest text-neonViolet mb-2">Local Insight Engine</h4>
              <GeminiInsight data={selectedData} />
            </div>
          </>
        ) : (
          <p className="text-[10px] text-center italic">Select a key to view songwriting heuristics.</p>
        )}
      </CollapsibleSection>

      <CollapsibleSection title="Advanced / Debug" icon={Cpu} isOpen={openSections.debug} onToggle={() => toggleSection('debug')}>
        <pre className="text-[10px] overflow-x-auto text-gray-400">{JSON.stringify(selectedData, null, 2)}</pre>
      </CollapsibleSection>

    </div>
  );
};

export default EmoKeyApp;
