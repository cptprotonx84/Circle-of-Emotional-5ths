import React, { useEffect, useState } from 'react';
import { Sparkles, Loader2, Terminal, AlertCircle } from 'lucide-react';
import { getLocalInsight } from '../constants/insights';
import { EmotionalKeyData } from '../types';

interface GeminiInsightProps {
  data: EmotionalKeyData | null;
}

const GeminiInsight: React.FC<GeminiInsightProps> = ({ data }) => {
  const [insight, setInsight] = useState<string | null>(null);

  useEffect(() => {
    if (data) {
      setInsight(getLocalInsight(data.musicalKey));
    } else {
      setInsight(null);
    }
  }, [data]);

  if (!data) {
    return (
      <div className="h-full flex flex-col items-center justify-center hacker-text-dim p-8 text-center border border-neonViolet border-dashed rounded opacity-50">
        <Terminal className="w-8 h-8 mb-4 opacity-30" />
        <p className="text-[10px] uppercase tracking-widest">AWAITING_INPUT_FOR_NEURAL_PROCESSING</p>
      </div>
    );
  }

  return (
    <div className="relative terminal-box p-6 h-full overflow-y-auto">
      <div className="flex items-center gap-3 mb-6 pb-3 border-b border-neonViolet/50">
        <Sparkles className="text-hackerGreen w-5 h-5" />
        <h3 className="text-sm font-bold hacker-text uppercase tracking-[0.2em]">NEURAL_COGNITION_OUTPUT</h3>
      </div>

      <div className="hacker-text text-sm leading-relaxed space-y-4">
          {insight?.split('\n').map((paragraph, idx) => (
            paragraph.trim() && (
              <div key={idx} className="relative pl-6">
                <span className="absolute left-0 top-1 text-[10px] text-neonViolet">&gt;</span>
                <p className="mb-3">{paragraph}</p>
              </div>
            )
          ))}
          <div className="pt-4 mt-8 border-t border-neonViolet/20 hacker-text-dim text-[10px] italic">
            -- END_OF_TRANSMISSION --
          </div>
      </div>
    </div>
  );
};

export default GeminiInsight;
