
import React, { useEffect, useState } from 'react';
import { EmotionalKeyData } from '../types';
import { generateEmotionalInsight } from '../services/geminiService';
import { Sparkles, Loader2, Terminal, AlertCircle, Key } from 'lucide-react';

interface GeminiInsightProps {
  data: EmotionalKeyData | null;
}

const GeminiInsight: React.FC<GeminiInsightProps> = ({ data }) => {
  const [insight, setInsight] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (data) {
      setLoading(true);
      setInsight(null);
      setError(null);
      
      const fetchInsight = async () => {
        try {
          const result = await generateEmotionalInsight(data);
          setInsight(result);
        } catch (e: any) {
          setError(e.message);
        } finally {
          setLoading(false);
        }
      };

      const timer = setTimeout(fetchInsight, 500);
      return () => clearTimeout(timer);
    } else {
      setInsight(null);
      setError(null);
    }
  }, [data]);

  const handleOpenKeyDialog = async () => {
    if (window.aistudio?.openSelectKey) {
      await window.aistudio.openSelectKey();
    }
  };

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
        <Sparkles className={`w-5 h-5 ${loading ? 'animate-pulse text-neonViolet' : 'text-hackerGreen'}`} />
        <h3 className="text-sm font-bold hacker-text uppercase tracking-[0.2em]">NEURAL_COGNITION_OUTPUT</h3>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center h-40 space-y-4">
          <Loader2 className="w-10 h-10 text-neonViolet animate-spin" />
          <p className="text-[10px] hacker-text uppercase tracking-widest animate-pulse">Processing_Matrix_Data...</p>
        </div>
      ) : error === 'QUOTA_EXCEEDED' ? (
        <div className="p-4 border border-red-500 bg-red-900/20 rounded flex flex-col items-center gap-4 text-center">
           <AlertCircle className="text-red-500 w-8 h-8" />
           <div>
             <h4 className="text-red-500 font-bold text-xs uppercase mb-1">[!] RESOURCE_EXHAUSTED</h4>
             <p className="text-[10px] hacker-text-dim italic">Free tier rate limits exceeded. Please provide a paid API key for uninterrupted service.</p>
           </div>
           <button 
             onClick={handleOpenKeyDialog}
             className="px-4 py-2 bg-red-950 border border-red-500 text-red-500 text-[10px] font-bold uppercase tracking-widest animate-pulse hover:bg-red-500 hover:text-black transition-all"
           >
             <Key size={10} className="inline mr-2" /> SELECT_PAID_API_KEY
           </button>
        </div>
      ) : (
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
      )}
    </div>
  );
};

export default GeminiInsight;
