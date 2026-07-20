import React, { useCallback, useEffect, useState } from 'react';
import { Music2, Key, ExternalLink } from 'lucide-react';
import EmoKeyApp from './components/EmoKeyApp';
import AppTwo from './components/AppTwo';
import AppThree from './components/AppThree';
import { EMOTIONAL_KEYS } from './constants';
import { MusicalKeyId } from './types';

const DEFAULT_SELECTED_KEY_ID: MusicalKeyId = 'C_MAJOR';

const App: React.FC = () => {
  const [selectedKeyId, setSelectedKeyId] = useState<MusicalKeyId>(DEFAULT_SELECTED_KEY_ID);
  const [lastBeatTimestamp, setLastBeatTimestamp] = useState<number>(0);
  const [hasPaidKey, setHasPaidKey] = useState(false);

  useEffect(() => {
    const checkKey = async () => {
      if (window.aistudio?.hasSelectedApiKey) {
        const selected = await window.aistudio.hasSelectedApiKey();
        setHasPaidKey(selected);
      }
    };
    checkKey();
    // Refresh check periodically in case of change
    const interval = setInterval(checkKey, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleSelectedKeyChange = useCallback((candidateId: MusicalKeyId) => {
    const candidate = EMOTIONAL_KEYS.find(key => key.id === candidateId);
    if (!candidate) {
      if (import.meta.env.DEV) {
        console.warn(`[selected-key] Ignoring unknown key id "${candidateId}"; preserving the last valid selection.`);
      }
      return;
    }
    setSelectedKeyId(candidate.id);
  }, []);

  const selectedKey = EMOTIONAL_KEYS.find(key => key.id === selectedKeyId);
  if (!selectedKey) {
    throw new Error(`[selected-key] Canonical key id "${selectedKeyId}" is missing from EMOTIONAL_KEYS.`);
  }

  const handleBeat = () => {
    setLastBeatTimestamp(Date.now());
  };

  const handleOpenKeyDialog = async () => {
    if (window.aistudio?.openSelectKey) {
      await window.aistudio.openSelectKey();
      // Assume success as per instructions
      setHasPaidKey(true);
    }
  };

  return (
    <div className="min-h-screen bg-black text-hackerGreen font-mono">
      {/* Global Header */}
      <header className="border-b border-neonViolet bg-black/90 backdrop-blur-md sticky top-0 z-50 shadow-[0_4px_20px_rgba(208,0,255,0.2)]">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-black border border-neonViolet p-2 rounded shadow-[0_0_10px_#D000FF]">
              <Music2 className="w-6 h-6 text-neonViolet" />
            </div>
            <div>
              <h1 className="text-xl font-bold hacker-text tracking-tighter">NEURAL HARMONY SYSTEM of Emotional 5ths</h1>
              <p className="text-[10px] hacker-text-dim uppercase tracking-[0.2em]">Valence • Harmony • Resonance</p>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="hidden md:flex flex-col items-end">
              <div className="flex items-center gap-2 text-[10px] font-bold hacker-text uppercase">
                <span className={`w-2 h-2 rounded-full ${hasPaidKey ? 'bg-hackerGreen shadow-[0_0_8px_#00ff41]' : 'bg-yellow-500 shadow-[0_0_8px_#eab308]'} animate-pulse`}></span>
                {hasPaidKey ? 'KEY_PAID_ACTIVE' : 'KEY_FREE_LIMITS'}
              </div>
              <a 
                href="https://ai.google.dev/gemini-api/docs/billing" 
                target="_blank" 
                rel="noreferrer" 
                className="text-[8px] text-neonViolet hover:underline flex items-center gap-1 mt-0.5 opacity-60"
              >
                BILLING_DOCS <ExternalLink size={8} />
              </a>
            </div>
            
            <button 
              onClick={handleOpenKeyDialog}
              className="flex items-center gap-2 px-3 py-1.5 bg-black border border-neonViolet text-[10px] font-bold text-neonViolet hover:bg-neonViolet hover:text-black transition-all shadow-[0_0_10px_rgba(208,0,255,0.2)]"
            >
              <Key size={12} />
              {hasPaidKey ? 'SWITCH_KEY' : 'UPGRADE_KEY'}
            </button>
          </div>
        </div>
      </header>

      <div className="space-y-12 pb-20">
        
        {/* Section 1: EmoKey */}
        <section id="emokey" className="relative scroll-mt-24">
          <div className="max-w-7xl mx-auto px-6 pt-10 pb-2">
            <h2 className="text-2xl font-bold flex items-center gap-3 hacker-text">
              <span className="text-neonViolet">&gt;</span> 01_EMOTIONAL_MATRIX
            </h2>
            <p className="hacker-text-dim mt-1 max-w-2xl text-xs">
              MAPPING PSYCHOLOGICAL STATES TO HARMONIC COORDINATES VIA CIRCLE_OF_FIFTHS.
              <span data-testid="canonical-selected-key" className="ml-2 text-[10px] bg-hackerGreen/10 text-hackerGreen px-2 py-1 rounded border border-hackerGreen/30">
                SYNC: {selectedKey.id}
              </span>
            </p>
          </div>
          <EmoKeyApp selectedKeyId={selectedKeyId} onSelectedKeyChange={handleSelectedKeyChange} />
        </section>

        {/* Divider */}
        <div className="max-w-7xl mx-auto px-6">
           <div className="h-px bg-gradient-to-r from-transparent via-neonViolet to-transparent opacity-50"></div>
        </div>

        {/* Section 2: Resonance */}
        <section id="resonance" className="relative scroll-mt-24">
          <div className="max-w-7xl mx-auto px-6 pt-10 pb-2">
            <h2 className="text-2xl font-bold flex items-center gap-3 hacker-text">
               <span className="text-neonViolet">&gt;</span> 02_EMOTIONAL_RESONANCE
            </h2>
             <p className="hacker-text-dim mt-1 max-w-2xl text-xs">
               VECTOR ANALYSIS OF EMOTIONAL TRANSITIONS WITHIN VALENCE-AROUSAL SPACE.
            </p>
          </div>
          <AppTwo
            selectedKey={selectedKey}
            onSelectedKeyChange={handleSelectedKeyChange}
            beatTrigger={lastBeatTimestamp}
          />
        </section>

        {/* Divider */}
        <div className="max-w-7xl mx-auto px-6">
           <div className="h-px bg-gradient-to-r from-transparent via-neonViolet to-transparent opacity-50"></div>
        </div>

        {/* Section 3: Audio Analysis */}
        <section id="audio-analysis" className="relative scroll-mt-24">
          <div className="max-w-7xl mx-auto px-6 pt-10 pb-2">
            <h2 className="text-2xl font-bold flex items-center gap-3 hacker-text">
               <span className="text-neonViolet">&gt;</span> 03_EMO_TIMELINE
            </h2>
             <p className="hacker-text-dim mt-1 max-w-2xl text-xs">
               REAL-TIME WAVEFORM DECONSTRUCTION AND AROUSAL_MAPPING.
            </p>
          </div>
          <AppThree selectedKey={selectedKey} onBeat={handleBeat} />
        </section>

      </div>
      
      <footer className="bg-black border-t border-neonViolet py-8 text-center hacker-text-dim text-[10px] uppercase tracking-[0.3em]">
        <p>© 2025 NEURAL_HARMONY_SYSTEM • POWERED_BY_GEMINI_AI</p>
      </footer>
    </div>
  );
};

export default App;
