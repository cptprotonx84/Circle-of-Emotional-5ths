import React, { useState, useMemo, useEffect } from 'react';
import ResonanceControls from './ResonanceControls';
import SoundReactiveMatrix from './SoundReactiveMatrix';
import { calculateMetrics } from '../utils/emotionMath';
import { EmotionState, AnalysisResult } from '../types';
import { Cpu, Zap, Activity, Info, AlertCircle, Key } from 'lucide-react';

interface AppTwoProps {
  externalState?: EmotionState | null;
  beatTrigger?: number;
}

const AppTwo: React.FC<AppTwoProps> = ({ externalState, beatTrigger }) => {
  const [e1, setE1] = useState<EmotionState>({ valence: 0.6, arousal: 0.5 });
  const [e2, setE2] = useState<EmotionState>({ valence: -0.4, arousal: -0.3 });
  
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (externalState) {
      setE1(externalState);
    }
  }, [externalState]);

  const metrics: AnalysisResult = useMemo(() => calculateMetrics(e1, e2), [e1, e2]);

  const handleOpenKeyDialog = async () => {
    if (window.aistudio?.openSelectKey) {
      await window.aistudio.openSelectKey();
    }
  };

  const handleAnalyze = async () => {
    setLoading(true);
    setError(null);
    setAiAnalysis(null);

    try {
      const res = await fetch("/api/analyze-transition", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          e1,
          e2,
          metrics,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        if (errorData.error === "QUOTA_EXCEEDED" || res.status === 429) {
          throw new Error("QUOTA_EXCEEDED");
        }
        throw new Error(errorData.error || "SIGNAL_LOST_ERROR");
      }

      const resData = await res.json();
      setAiAnalysis(resData.text || "NO_DATA_RECOVERED");
    } catch (err: any) {
      console.error(err);
      if (err.message?.includes("QUOTA_EXCEEDED")) {
        setError("QUOTA_EXCEEDED");
      } else {
        setError(err.message || "SIGNAL_LOST_ERROR");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full p-4 md:p-8 max-w-7xl mx-auto text-hackerGreen">
      <main className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Controls Section */}
        <div className="lg:col-span-4 space-y-6">
          <ResonanceControls 
            label="EMO_PROBE_01" 
            colorClass="border-neonViolet text-hackerGreen" 
            state={e1} 
            onChange={setE1} 
          />
          <ResonanceControls 
            label="EMO_PROBE_02" 
            colorClass="border-neonViolet text-hackerGreen" 
            state={e2} 
            onChange={setE2} 
          />
        </div>

        {/* Visualization & Metrics Section */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Dynamic Visualization Matrix */}
            <div className="flex-1 flex justify-center terminal-box p-4 h-[400px]">
              <SoundReactiveMatrix 
                mediaElement={null} 
                isPlaying={true} 
                targetEmotion={e1} 
                beatTrigger={beatTrigger}
              />
            </div>

            {/* Metrics Card */}
            <div className="w-full md:w-72 terminal-box p-6 flex flex-col justify-center space-y-8">
              <div>
                <h4 className="hacker-text-dim text-[10px] font-bold uppercase tracking-[0.3em] mb-4 flex items-center gap-2">
                  <Activity className="w-3 h-3 text-neonViolet" /> RESONANCE_IDX
                </h4>
                <div className="text-4xl font-bold hacker-text shadow-[0_0_10px_rgba(0,255,65,0.2)]">
                  {metrics.resonanceIndex.toFixed(3)}
                </div>
                <div className="w-full bg-black border border-neonViolet/30 h-1.5 mt-4 overflow-hidden shadow-[inset_0_0_5px_rgba(0,0,0,1)]">
                  <div 
                    className="h-full bg-hackerGreen shadow-[0_0_15px_#00ff41] transition-all duration-300"
                    style={{ width: `${metrics.resonanceIndex * 100}%` }}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <h4 className="hacker-text-dim text-[10px] font-bold uppercase tracking-[0.3em] mb-1">VECTOR_MAGNITUDE</h4>
                <div className="text-2xl hacker-text">{metrics.distance.toFixed(3)}</div>
              </div>

              <div className="space-y-3 pt-6 border-t border-neonViolet/30">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-neonViolet font-bold uppercase">Probe_01</span>
                  <span className="hacker-text">{metrics.emotion1.key}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-neonViolet font-bold uppercase">Probe_02</span>
                  <span className="hacker-text">{metrics.emotion2.key}</span>
                </div>
              </div>
            </div>
          </div>

          {/* AI Analysis Section */}
          <div className="w-full terminal-box p-6 relative overflow-hidden">
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-neonViolet/30">
              <h3 className="text-lg font-bold hacker-text flex items-center gap-3 uppercase tracking-widest">
                <Cpu className="w-5 h-5 text-neonViolet" /> NEURAL_INTERPRETATION
              </h3>
              <button
                onClick={handleAnalyze}
                disabled={loading}
                className="px-6 py-2 bg-black border border-neonViolet text-neonViolet text-xs font-bold uppercase tracking-widest hover:bg-neonViolet hover:text-black transition-all shadow-[0_0_10px_rgba(208,0,255,0.3)] disabled:opacity-50"
              >
                {loading ? 'COMPUTING...' : 'RUN_ANALYSIS'}
              </button>
            </div>

            {error === "QUOTA_EXCEEDED" ? (
              <div className="p-4 border border-red-500 bg-red-900/20 rounded flex items-center justify-between gap-4">
                 <div className="flex items-center gap-3">
                   <AlertCircle className="text-red-500 w-6 h-6" />
                   <div>
                     <h4 className="text-red-500 font-bold text-xs uppercase">[!] QUOTA_EXCEEDED</h4>
                     <p className="text-[10px] hacker-text-dim">Free tier limits reached. Switch to a paid key for more throughput.</p>
                   </div>
                 </div>
                 <button 
                   onClick={handleOpenKeyDialog}
                   className="px-4 py-2 bg-red-950 border border-red-500 text-red-500 text-[10px] font-bold uppercase tracking-widest animate-pulse hover:bg-red-500 hover:text-black transition-all"
                 >
                   <Key size={10} className="inline mr-2" /> UPGRADE_KEY
                 </button>
              </div>
            ) : error && (
              <div className="p-4 bg-red-950 border border-red-500 text-red-500 text-xs font-mono uppercase animate-pulse">
                [!] ERROR: {error}
              </div>
            )}

            {aiAnalysis && (
              <div className="hacker-text text-sm leading-relaxed space-y-4 max-w-none">
                <div className="relative pl-6">
                  <span className="absolute left-0 top-1 text-neonViolet">&gt;</span>
                  <p className="italic text-hackerGreen font-medium">
                    {aiAnalysis}
                  </p>
                </div>
              </div>
            )}
            
            {!aiAnalysis && !loading && !error && (
              <p className="hacker-text-dim text-[10px] uppercase tracking-[0.2em] italic">
                &gt; AWAITING_EXECUTION_COMMAND...
              </p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default AppTwo;