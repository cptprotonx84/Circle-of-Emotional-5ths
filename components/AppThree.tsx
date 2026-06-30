import React, { useState, useRef, useEffect } from 'react';
import { Upload, Play, Pause, AlertCircle, Loader2, FileText, Terminal, Key, Activity, Music, Zap, Layers } from 'lucide-react';
import WaveSurfer from 'wavesurfer.js';
import RegionsPlugin from 'wavesurfer.js/dist/plugins/regions.esm.js';
import { EmotionState } from '../types';
import LiveVisualizer from './LiveVisualizer';
import { getNearestKey } from '../utils/emotionMath';

interface AudioSegment {
  startTime: string; // "00:00"
  endTime: string;   // "00:15"
  description: string;
  mood: string;
  valence: number;
  arousal: number;
}

interface TrackInfo {
  key: string;
  tempo: string;
  chords: string;
}

interface ShiftSuggestion {
  target: string;
  weights: string;
  advice: string;
}

interface AppThreeProps {
  onSegmentSelect?: (emotion: EmotionState) => void;
  onBeat?: () => void;
}

type AnalysisStep = 'idle' | 'optimizing' | 'analyzing_key' | 'analyzing_segments';

const AppThree: React.FC<AppThreeProps> = ({ onSegmentSelect, onBeat }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null); 
  const wavesurfer = useRef<WaveSurfer | null>(null);
  const wsRegions = useRef<any>(null);
  
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [scriptContext, setScriptContext] = useState('');
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [analysisStep, setAnalysisStep] = useState<AnalysisStep>('idle');
  const [segments, setSegments] = useState<AudioSegment[]>([]);
  const [trackInfo, setTrackInfo] = useState<TrackInfo | null>(null);
  const [detectedBeats, setDetectedBeats] = useState<number[]>([]);
  const [suggestions, setSuggestions] = useState<ShiftSuggestion[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [copySuccess, setCopySuccess] = useState(false);

  const [currentEmotion, setCurrentEmotion] = useState<EmotionState | null>(null);
  const activeSegmentIndexRef = useRef<number>(-1);
  const lastBeatIndexRef = useRef<number>(-1);

  useEffect(() => {
    if (!containerRef.current || !audioRef.current || !audioUrl) return;
    if (wavesurfer.current) wavesurfer.current.destroy();
    wsRegions.current = RegionsPlugin.create();
    wavesurfer.current = WaveSurfer.create({
      container: containerRef.current,
      media: audioRef.current, 
      waveColor: 'rgba(208, 0, 255, 0.2)',
      progressColor: 'rgba(0, 255, 65, 0.5)',
      cursorColor: '#00ff41',
      barWidth: 2,
      barGap: 3,
      height: 120,
      plugins: [wsRegions.current],
    });
    wavesurfer.current.on('play', () => setIsPlaying(true));
    wavesurfer.current.on('pause', () => setIsPlaying(false));
    wavesurfer.current.on('timeupdate', (t) => setCurrentTime(t));
    wavesurfer.current.on('finish', () => setIsPlaying(false));
    wsRegions.current.on('region-clicked', (region: any, e: MouseEvent) => {
       e.stopPropagation();
       region.play();
    });
    return () => wavesurfer.current?.destroy();
  }, [audioUrl]); 

  // Sync segment selection and beat triggers
  useEffect(() => {
    if (!segments.length) return;
    let currentSegIndex = segments.findIndex(seg => {
      const start = parseTime(seg.startTime);
      const end = parseTime(seg.endTime);
      return currentTime >= start && currentTime < end;
    });

    // Fallback: If player head goes beyond the last segment, hold onto the last emotional segment
    if (currentSegIndex === -1 && segments.length > 0) {
      const firstSeg = segments[0];
      const firstStart = parseTime(firstSeg.startTime);
      
      const lastSeg = segments[segments.length - 1];
      const lastEnd = parseTime(lastSeg.endTime);
      
      if (currentTime >= lastEnd) {
        currentSegIndex = segments.length - 1;
      } else if (currentTime < firstStart) {
        currentSegIndex = 0;
      }
    }

    if (currentSegIndex !== -1 && currentSegIndex !== activeSegmentIndexRef.current) {
      activeSegmentIndexRef.current = currentSegIndex;
      const seg = segments[currentSegIndex];
      const newEmotion = { valence: seg.valence, arousal: seg.arousal };
      setCurrentEmotion(newEmotion);
      if (onSegmentSelect) onSegmentSelect(newEmotion);
    }

    // Local Beat Triggering
    if (detectedBeats.length && onBeat) {
      const currentBeatIndex = detectedBeats.findIndex(b => currentTime >= b && currentTime < b + 0.1);
      if (currentBeatIndex !== -1 && currentBeatIndex !== lastBeatIndexRef.current) {
        lastBeatIndexRef.current = currentBeatIndex;
        onBeat();
      }
    }
  }, [currentTime, segments, detectedBeats, onBeat, onSegmentSelect]);

  const detectBeats = async (file: File) => {
    // Only attempt full decoding if the file size is safe (less than 3.5MB) to prevent browser tab crash (OOM)
    if (file.size > 3.5 * 1024 * 1024) {
      console.warn("File size exceeds 3.5MB. Skipping local uncompressed beat decoding to preserve browser memory and prevent tab resets.");
      setDetectedBeats([]);
      return [];
    }
    let audioCtx: AudioContext | null = null;
    try {
      const arrayBuffer = await file.arrayBuffer();
      audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
      
      const channelData = audioBuffer.getChannelData(0);
      const sampleRate = audioBuffer.sampleRate;
      const beats: number[] = [];
      const threshold = 0.6; // Energy threshold
      const minInterval = 0.25; // Min 250ms between beats
      
      let lastBeat = -minInterval;
      // Sampling every 50ms to find peaks
      const step = Math.floor(sampleRate * 0.05);
      for (let i = 0; i < channelData.length; i += step) {
        const time = i / sampleRate;
        const value = Math.abs(channelData[i]);
        if (value > threshold && (time - lastBeat) > minInterval) {
          beats.push(time);
          lastBeat = time;
        }
      }
      setDetectedBeats(beats);
      return beats;
    } catch (e) {
      console.warn("BEAT_DETECTION_FAILED", e);
      return [];
    } finally {
      if (audioCtx) {
        try {
          await audioCtx.close();
        } catch (err) {
          console.warn("FAILED_TO_CLOSE_CTX", err);
        }
      }
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 150 * 1024 * 1024) {
        setError("FILE_TOO_LARGE: MAX 150MB");
        return;
      }
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      const url = URL.createObjectURL(file);
      setIsPlaying(false);
      setAudioUrl(url);
      setAudioFile(file);
      setSegments([]);
      setTrackInfo(null);
      setSuggestions([]);
      setError(null);
      activeSegmentIndexRef.current = -1;
      lastBeatIndexRef.current = -1;
      setCurrentEmotion(null);

      // Trigger beat detection locally
      await detectBeats(file);
    }
  };

  const handleOpenKeyDialog = async () => {
    if (window.aistudio?.openSelectKey) {
      await window.aistudio.openSelectKey();
    }
  };

  const handleCopyData = async () => {
    if (segments.length === 0) return;
    const exportData = { trackInfo, segments, suggestions };
    try {
      await navigator.clipboard.writeText(JSON.stringify(exportData, null, 2));
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) { console.error("COPY_FAIL", err); }
  };

  const togglePlay = () => wavesurfer.current && wavesurfer.current.playPause();

  const parseTime = (timeStr: string) => {
    if (!timeStr) return 0;
    const cleanStr = timeStr.trim();
    if (!cleanStr.includes(':')) {
      const val = parseFloat(cleanStr);
      return isNaN(val) ? 0 : val;
    }
    const parts = cleanStr.split(':');
    const minutes = parseInt(parts[0], 10) || 0;
    const seconds = parseFloat(parts[1]) || 0;
    return minutes * 60 + seconds;
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const analyzeAudio = async () => {
    if (!audioFile) return;
    setAnalysisStep('optimizing');
    setError(null);
    setSegments([]);
    setTrackInfo(null);
    setSuggestions([]);
    try {
      // Get the duration from the WaveSurfer instance
      const durationVal = wavesurfer.current?.getDuration() || 0;
      const durationStr = formatTime(durationVal);

      // Slice the audio file to first 8MB to ensure robust context analysis while keeping body upload safe in limit
      const maxSegmentBytes = 8 * 1024 * 1024;
      const optimizedFile = audioFile.size > maxSegmentBytes 
        ? audioFile.slice(0, maxSegmentBytes, audioFile.type) 
        : audioFile;

      const reader = new FileReader();
      const base64Data = await new Promise<string>((resolve, reject) => {
        reader.onloadend = () => {
          const resultStr = reader.result as string;
          resolve(resultStr.split(',')[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(optimizedFile);
      });

      setAnalysisStep('analyzing_key');

      const res = await fetch("/api/analyze-audio", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          audioData: base64Data,
          mimeType: optimizedFile.type,
          scriptContext,
          duration: durationStr,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        if (errorData.error === "QUOTA_EXCEEDED" || res.status === 429) {
          throw new Error("QUOTA_EXCEEDED");
        }
        throw new Error(errorData.error || "SIGNAL_LOST");
      }

      const responseData = await res.json();

      if (responseData.trackInfo) {
        setTrackInfo(responseData.trackInfo);
      }
      const rawSegments = responseData.segments || [];
      setSegments(rawSegments);
      setSuggestions(responseData.suggestions || []);
      
      wsRegions.current.clearRegions();
      rawSegments.forEach((seg: any, index: number) => {
        const startSeconds = parseTime(seg.startTime);
        const endSeconds = parseTime(seg.endTime);
        const colors = getNearestKey({valence: seg.valence, arousal: seg.arousal});
        const r = parseInt(colors.primaryColor.slice(1, 3), 16);
        const g = parseInt(colors.primaryColor.slice(3, 5), 16);
        const b = parseInt(colors.primaryColor.slice(5, 7), 16);
        wsRegions.current.addRegion({
          start: startSeconds, end: endSeconds, content: `${index + 1}`, 
          color: `rgba(${r}, ${g}, ${b}, 0.15)`, drag: false, resize: false,
        });
      });
    } catch (err: any) {
      if (err.message?.includes('QUOTA_EXCEEDED')) {
        setError("QUOTA_EXCEEDED");
      } else {
        setError("ANALYSIS_HALTED: " + (err.message || "SIGNAL_LOST"));
      }
    } finally { setAnalysisStep('idle'); }
  };

  return (
    <div className="w-full p-4 md:p-8 max-w-7xl mx-auto text-hackerGreen">
       <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-4 space-y-6">
             <div className="terminal-box glass-shine p-6">
                <h3 className="text-sm font-bold mb-6 flex items-center gap-2 uppercase tracking-widest">
                   <Terminal className="w-4 h-4 text-neonViolet" /> INPUT_SOURCE
                </h3>
                <div className="border border-dashed border-neonViolet/50 bg-black/50 rounded-lg p-6 text-center hover:bg-neonViolet/5 transition-all cursor-pointer relative group">
                   <input type="file" accept="audio/*" onChange={handleFileUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                   <Upload className="w-8 h-8 mx-auto text-neonViolet mb-2 group-hover:scale-110 transition-transform" />
                   <p className="text-[10px] hacker-text uppercase tracking-widest">{audioFile ? audioFile.name : "LOAD_WAV_OR_MP3"}</p>
                </div>
                <div className="mt-6">
                  <label className="flex items-center gap-2 text-[9px] hacker-text-dim font-bold uppercase tracking-[0.2em] mb-2">
                    <FileText className="w-3 h-3" /> SCRIPT_METADATA_INJECTOR
                  </label>
                  <textarea
                    className="w-full bg-black/40 border border-neonViolet/30 rounded-lg p-3 text-xs hacker-text placeholder-neonViolet/30 focus:outline-none focus:border-neonViolet transition-colors resize-none h-24"
                    placeholder="ENTER SCENE CONTEXT OR LYRICS..."
                    value={scriptContext}
                    onChange={(e) => setScriptContext(e.target.value)}
                  />
                </div>
                
                {error === "QUOTA_EXCEEDED" ? (
                  <div className="mt-4 p-4 border border-red-500 bg-red-900/20 rounded flex flex-col gap-3">
                     <div className="flex items-center gap-2">
                       <AlertCircle className="text-red-500 w-4 h-4" />
                       <h4 className="text-red-500 font-bold text-[10px] uppercase">QUOTA_EXCEEDED</h4>
                     </div>
                     <p className="text-[9px] hacker-text-dim">Analysis requires higher throughput. Switch to a paid key.</p>
                     <button 
                       onClick={handleOpenKeyDialog}
                       className="w-full py-2 bg-red-950 border border-red-500 text-red-500 text-[10px] font-bold uppercase tracking-widest animate-pulse"
                     >
                       UPGRADE_KEY
                     </button>
                  </div>
                ) : error && (
                  <div className="mt-4 p-3 bg-red-950/30 border border-red-900 text-[10px] text-red-500 font-bold uppercase">{error}</div>
                )}

                <div className="mt-6 flex gap-2">
                   <button onClick={togglePlay} disabled={!audioFile} className="flex-1 py-2 bg-black border border-neonViolet text-neonViolet text-[10px] font-bold uppercase tracking-widest hover:bg-neonViolet hover:text-black transition-all disabled:opacity-30">
                      {isPlaying ? <Pause className="w-3 h-3 mx-auto" /> : <Play className="w-3 h-3 mx-auto" />}
                   </button>
                   <button onClick={analyzeAudio} disabled={!audioFile || analysisStep !== 'idle'} className="flex-1 py-2 bg-black border border-hackerGreen text-hackerGreen text-[10px] font-bold uppercase tracking-widest hover:bg-hackerGreen hover:text-black transition-all shadow-[0_0_10px_rgba(0,255,65,0.3)] disabled:opacity-30">
                      {analysisStep !== 'idle' ? 'RUNNING...' : 'PROCESS_SIGNAL'}
                   </button>
                </div>
             </div>
             {segments.length > 0 && (
               <div className="terminal-box p-6">
                  <div className="flex items-center justify-between mb-4 pb-2 border-b border-neonViolet/30">
                    <h3 className="text-[10px] font-bold hacker-text-dim uppercase tracking-[0.3em]">TELEMETRY_EXPORT</h3>
                    <button onClick={handleCopyData} className={`flex items-center gap-2 px-3 py-1 text-[9px] font-bold uppercase tracking-widest transition-all ${copySuccess ? 'text-hackerGreen' : 'text-neonViolet hover:bg-neonViolet/10'}`}>
                      {copySuccess ? 'COPIED' : 'COPY_BUFFER'}
                    </button>
                  </div>
                  <textarea readOnly value={JSON.stringify({ trackInfo, segments, suggestions }, null, 2)} className="w-full h-40 bg-black text-[9px] hacker-text-dim border-none resize-none focus:outline-none scrollbar-hide" />
               </div>
             )}
          </div>

          <div className="lg:col-span-8 space-y-6">
             <audio ref={audioRef} src={audioUrl || undefined} crossOrigin={audioUrl?.startsWith('blob:') ? undefined : "anonymous"} className="hidden" />
             
             {/* Visualizer Card */}
             <div className="terminal-box relative overflow-hidden h-[500px] group shadow-[0_0_20px_rgba(208,0,255,0.15)] flex flex-col">
                <div className="absolute inset-0 z-0">
                  <LiveVisualizer 
                    mediaElement={audioRef.current} 
                    isPlaying={isPlaying} 
                    valence={currentEmotion?.valence ?? 0}
                    arousal={currentEmotion?.arousal ?? 0}
                    reservedFooterHeight={0}
                  />
                </div>
                
                <div className="relative z-10 p-4 pointer-events-none">
                  <div className="text-[10px] font-bold hacker-text bg-black/60 backdrop-blur border border-neonViolet/40 inline-block px-3 py-1 rounded shadow-[0_0_10px_rgba(208,0,255,0.2)]">
                     SYS_TIME: {formatTime(currentTime)}
                  </div>
                </div>
             </div>

             {/* Rhythm / Timeline Panel */}
             <div className="terminal-box glass-shine p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-neonViolet/20 pb-2">
                   <h3 className="text-[10px] font-bold hacker-text-dim uppercase tracking-[0.3em] flex items-center gap-2">
                      <Activity className="w-3 h-3 text-neonViolet" /> RHYTHM_TIMELINE_WAVEFORM
                   </h3>
                   <div className="text-[9px] hacker-text-dim italic tracking-widest">-- SIGNAL_FEED_CONNECTED --</div>
                </div>
                <div id="waveform" className="w-full h-[120px] filter hue-rotate-[280deg] relative">
                   {/* Dedicated WaveSurfer DOM Target (separate from React children) */}
                   <div ref={containerRef} className="w-full h-full" />
                   
                   {/* React-reconciled Overlay */}
                   <div className="absolute inset-0 pointer-events-none flex">
                      {detectedBeats.length > 0 && wavesurfer.current?.getDuration() && (
                        detectedBeats.map((beat, i) => (
                          <div 
                            key={i} 
                            className="absolute h-full w-[1px] bg-neonViolet opacity-20" 
                            style={{ left: `${(beat / wavesurfer.current!.getDuration()) * 100}%` }}
                          />
                        ))
                      )}
                   </div>
                </div>
             </div>

             {/* Track Telemetry Section (Key, Tempo, Chords) */}
             {trackInfo && (
               <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="terminal-box p-4 flex flex-col items-center justify-center space-y-2 border-hackerGreen/40">
                     <Music className="w-4 h-4 text-hackerGreen" />
                     <span className="text-[10px] hacker-text-dim uppercase tracking-widest">MUSICAL_KEY</span>
                     <span className="text-xl font-bold hacker-text uppercase tracking-tighter">{trackInfo.key}</span>
                  </div>
                  <div className="terminal-box p-4 flex flex-col items-center justify-center space-y-2 border-neonViolet/40">
                     <Zap className="w-4 h-4 text-neonViolet" />
                     <span className="text-[10px] hacker-text-dim uppercase tracking-widest">TEMPO_BPM</span>
                     <span className="text-xl font-bold hacker-text tracking-tighter">{trackInfo.tempo}</span>
                  </div>
                  <div className="terminal-box p-4 flex flex-col items-center justify-center space-y-2 border-cyan-400/40">
                     <Layers className="w-4 h-4 text-cyan-400" />
                     <span className="text-[10px] hacker-text-dim uppercase tracking-widest">CHORD_PROGRESSION</span>
                     <span className="text-xs font-bold text-cyan-400 text-center uppercase tracking-widest leading-relaxed px-2">
                        {trackInfo.chords}
                     </span>
                  </div>
               </div>
             )}

             <div className="space-y-4">
                <div className="flex items-center justify-between">
                   <h3 className="text-xl font-bold hacker-text tracking-tighter uppercase tracking-[0.1em]">DETECTED_EMO_SEGMENTS</h3>
                   {analysisStep !== 'idle' && <div className="flex items-center gap-2 text-[10px] text-hackerGreen bg-hackerGreen/10 border border-hackerGreen/30 px-3 py-1 animate-pulse uppercase tracking-widest"><Loader2 className="w-3 h-3 animate-spin" /> SCANNING_MATRIX...</div>}
                </div>
                {segments.length > 0 ? (
                  <div className="grid gap-3">
                     {segments.map((seg, idx) => {
                       const start = parseTime(seg.startTime);
                       const end = parseTime(seg.endTime);
                       const isActive = currentTime >= start && currentTime < end && isPlaying;
                       const colors = getNearestKey({valence: seg.valence, arousal: seg.arousal});
                       return (
                        <div key={idx} className={`terminal-box glass-shine p-4 transition-all cursor-pointer relative overflow-hidden group ${isActive ? 'shadow-[0_0_20px_rgba(0,255,65,0.3)] border-hackerGreen' : 'border-neonViolet/30 hover:border-neonViolet'}`} onClick={() => { if (wavesurfer.current) { wavesurfer.current.setTime(start); wavesurfer.current.play(); }}}>
                           <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: colors.primaryColor }} />
                           <div className="flex justify-between items-center mb-1">
                              <span className="font-bold hacker-text uppercase text-xs tracking-widest">{seg.mood}</span>
                              <span className="text-[9px] hacker-text-dim uppercase tracking-widest">{seg.startTime} &gt;&gt; {seg.endTime}</span>
                           </div>
                           <p className="text-[10px] hacker-text-dim group-hover:text-hackerGreen transition-colors italic">"{seg.description}"</p>
                        </div>
                       );
                     })}
                  </div>
                ) : (
                  analysisStep === 'idle' && <div className="text-center py-10 terminal-box border-dashed border-neonViolet/20 hacker-text-dim text-[10px] uppercase tracking-widest">SIGNAL_INPUT_REQUIRED</div>
                )}
             </div>
          </div>
       </div>
    </div>
  );
};

export default AppThree;