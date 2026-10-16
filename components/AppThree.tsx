import React, { useState, useRef, useEffect } from 'react';
import { Upload, Play, Pause, Loader2, FileText, Terminal, Key, Activity, Music, Zap, Layers } from 'lucide-react';
import WaveSurfer from 'wavesurfer.js';
import RegionsPlugin from 'wavesurfer.js/dist/plugins/regions.esm.js';
import LiveVisualizer, { LiveChordSnapshot } from './LiveVisualizer';
import {
  CIRCLE_OF_FIFTHS_PITCH_CLASSES,
  confidenceTier,
  NOTE_NAMES,
  pitchClassIndexForNote,
  PITCH_CLASS_COLORS,
  triadPitchClasses,
} from '../utils/realtimeChordAnalysis';
import {
  analyzeAudioLocally,
  ChordTimelineSegment,
  validateLocalAudioFileSize,
} from '../utils/localAudioAnalysis';

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
  onBeat?: () => void;
}

type AnalysisStep = 'idle' | 'optimizing' | 'analyzing_key' | 'analyzing_segments';
const AppThree: React.FC<AppThreeProps> = ({
  onBeat,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null); 
  const wavesurfer = useRef<WaveSurfer | null>(null);
  const wsRegions = useRef<any>(null);
  
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [scriptContext, setScriptContext] = useState('');
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [analysisStep, setAnalysisStep] = useState<AnalysisStep>('idle');
  const [chordSegments, setChordSegments] = useState<ChordTimelineSegment[]>([]);
  const [liveChord, setLiveChord] = useState<LiveChordSnapshot | null>(null);
  const [trackInfo, setTrackInfo] = useState<TrackInfo | null>(null);
  const [detectedBeats, setDetectedBeats] = useState<number[]>([]);
  const [suggestions, setSuggestions] = useState<ShiftSuggestion[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [copySuccess, setCopySuccess] = useState(false);

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

  useEffect(() => {
    if (!wsRegions.current) return;
    wsRegions.current.clearRegions();
    chordSegments.forEach(segment => {
      const pitchClass = pitchClassIndexForNote(segment.root);
      const color = pitchClass === null ? '#5c708e' : PITCH_CLASS_COLORS[pitchClass];
      const red = parseInt(color.slice(1, 3), 16);
      const green = parseInt(color.slice(3, 5), 16);
      const blue = parseInt(color.slice(5, 7), 16);
      wsRegions.current.addRegion({
        start: segment.startTime,
        end: segment.endTime,
        content: segment.chord,
        color: `rgba(${red}, ${green}, ${blue}, 0.18)`,
        drag: false,
        resize: false,
      });
    });
  }, [audioUrl, chordSegments]);

  const findActiveIndex = <T extends { startTime: number; endTime: number }>(timeline: T[]) => {
    if (!timeline.length) return -1;
    const exactIndex = timeline.findIndex(segment => currentTime >= segment.startTime && currentTime < segment.endTime);
    if (exactIndex !== -1) return exactIndex;
    if (currentTime >= timeline[timeline.length - 1].endTime) return timeline.length - 1;
    return 0;
  };

  const activeChordIndex = findActiveIndex(chordSegments);
  const activeChord = activeChordIndex >= 0 ? chordSegments[activeChordIndex] : null;

  useEffect(() => {
    if (detectedBeats.length && onBeat) {
      const currentBeatIndex = detectedBeats.findIndex(beat => currentTime >= beat && currentTime < beat + 0.1);
      if (currentBeatIndex !== -1 && currentBeatIndex !== lastBeatIndexRef.current) {
        lastBeatIndexRef.current = currentBeatIndex;
        onBeat();
      }
    }
  }, [
    currentTime,
    detectedBeats,
    onBeat,
  ]);

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
      try {
        validateLocalAudioFileSize(file.size);
      } catch (err: any) {
        setError(`FILE_REJECTED: ${err.message || 'INVALID_AUDIO_FILE'}`);
        event.target.value = '';
        return;
      }
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      const url = URL.createObjectURL(file);
      setIsPlaying(false);
      setAudioUrl(url);
      setAudioFile(file);
      setChordSegments([]);
      setLiveChord(null);
      setTrackInfo(null);
      setSuggestions([]);
      setError(null);
      lastBeatIndexRef.current = -1;

      // Trigger beat detection locally
      await detectBeats(file);
    }
  };

  const handleCopyData = async () => {
    if (chordSegments.length === 0) return;
    const exportData = { trackInfo, chordSegments, suggestions };
    try {
      await navigator.clipboard.writeText(JSON.stringify(exportData, null, 2));
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) { console.error("COPY_FAIL", err); }
  };

  const togglePlay = () => wavesurfer.current && wavesurfer.current.playPause();

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const analyzeAudio = async () => {
    if (!audioFile) return;
    setAnalysisStep('optimizing');
    setError(null);
    setChordSegments([]);
    setTrackInfo(null);
    setSuggestions([]);
    try {
      setAnalysisStep('analyzing_segments');
      const analysis = await analyzeAudioLocally(audioFile);
      setChordSegments(analysis.chordSegments);
      setTrackInfo({
        key: analysis.globalKey,
        tempo: 'LOCAL_ESTIMATE',
        chords: analysis.chordProgression,
      });
    } catch (err: any) {
      setError("ANALYSIS_HALTED: " + (err.message || "SIGNAL_LOST"));
    } finally { setAnalysisStep('idle'); }
  };

  const displayedChord = activeChord?.chord ?? liveChord?.evidence.chord ?? '--';
  const displayedConfidence = activeChord?.confidence ?? liveChord?.evidence.confidence ?? 0;
  const displayedTier = activeChord ? confidenceTier(activeChord.confidence) : liveChord?.tier ?? 'LOW';
  const displayedLabel = displayedTier === 'LOW' ? 'CHORD_CANDIDATE' : 'CURRENT_CHORD';
  const liveTierClass = displayedTier === 'HIGH'
    ? 'border-green-500/60 text-green-400'
    : displayedTier === 'MOD'
      ? 'border-cyan-400/60 text-cyan-300'
      : 'border-amber-600/60 text-amber-500';
  const displayedRoot = activeChord?.root ?? liveChord?.evidence.root ?? null;
  const displayedQuality = activeChord?.quality ?? liveChord?.evidence.quality ?? null;
  const displayedRootIndex = displayedRoot ? pitchClassIndexForNote(displayedRoot) : null;
  const displayedTriad = displayedRootIndex !== null && displayedQuality
    ? triadPitchClasses(displayedRootIndex, displayedQuality)
    : null;
  const measuredChroma = liveChord?.evidence.chroma ?? [];
  const harmonicNodes = CIRCLE_OF_FIFTHS_PITCH_CLASSES.map((pitchClass, orderIndex) => {
    const angle = -Math.PI / 2 + orderIndex * Math.PI / 6;
    return {
      pitchClass,
      x: 110 + Math.cos(angle) * 77,
      y: 105 + Math.sin(angle) * 77,
      energy: measuredChroma[pitchClass] ?? 0,
    };
  });
  const harmonicNodeFor = (pitchClass: number) => harmonicNodes.find(node => node.pitchClass === pitchClass);
  const harmonicEdges = displayedTriad
    ? [
        [displayedTriad.rootIndex, displayedTriad.thirdIndex],
        [displayedTriad.thirdIndex, displayedTriad.fifthIndex],
        [displayedTriad.fifthIndex, displayedTriad.rootIndex],
      ]
    : [];

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
                    <FileText className="w-3 h-3" /> OPTIONAL_ANALYSIS_NOTES
                  </label>
                  <textarea
                    className="w-full bg-black/40 border border-neonViolet/30 rounded-lg p-3 text-xs hacker-text placeholder-neonViolet/30 focus:outline-none focus:border-neonViolet transition-colors resize-none h-24"
                    placeholder="RESERVED FOR FUTURE LOCAL-MODEL CONTEXT..."
                    value={scriptContext}
                    onChange={(e) => setScriptContext(e.target.value)}
                  />
                </div>
                
                {error && (
                  <div className="mt-4 p-3 bg-red-950/30 border border-red-900 text-[10px] text-red-500 font-bold uppercase">{error}</div>
                )}

                <div className="mt-6 flex gap-2">
                   <button
                     data-testid="audio-play-toggle"
                     aria-label={isPlaying ? 'Pause audio' : 'Play audio'}
                     onClick={togglePlay}
                     disabled={!audioFile}
                     className="flex-1 py-2 bg-black border border-neonViolet text-neonViolet text-[10px] font-bold uppercase tracking-widest hover:bg-neonViolet hover:text-black transition-all disabled:opacity-30"
                   >
                      {isPlaying ? <Pause className="w-3 h-3 mx-auto" /> : <Play className="w-3 h-3 mx-auto" />}
                   </button>
                   <button data-testid="process-signal" aria-label="Process audio signal locally" onClick={analyzeAudio} disabled={!audioFile || analysisStep !== 'idle'} className="flex-1 py-2 bg-black border border-hackerGreen text-hackerGreen text-[10px] font-bold uppercase tracking-widest hover:bg-hackerGreen hover:text-black transition-all shadow-[0_0_10px_rgba(0,255,65,0.3)] disabled:opacity-30">
                      {analysisStep !== 'idle' ? 'RUNNING...' : 'PROCESS_SIGNAL'}
                   </button>
                </div>
             </div>
              {chordSegments.length > 0 && (
               <div className="terminal-box p-6">
                  <div className="flex items-center justify-between mb-4 pb-2 border-b border-neonViolet/30">
                    <h3 className="text-[10px] font-bold hacker-text-dim uppercase tracking-[0.3em]">TELEMETRY_EXPORT</h3>
                    <button onClick={handleCopyData} className={`flex items-center gap-2 px-3 py-1 text-[9px] font-bold uppercase tracking-widest transition-all ${copySuccess ? 'text-hackerGreen' : 'text-neonViolet hover:bg-neonViolet/10'}`}>
                      {copySuccess ? 'COPIED' : 'COPY_BUFFER'}
                    </button>
                  </div>
                  <textarea readOnly value={JSON.stringify({ trackInfo, chordSegments, suggestions }, null, 2)} className="w-full h-40 bg-black text-[9px] hacker-text-dim border-none resize-none focus:outline-none scrollbar-hide" />
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
                    reservedFooterHeight={0}
                    timelineChord={activeChord}
                    onChordEvidence={setLiveChord}
                  />
                </div>
                
                <div className="relative z-10 p-4 pointer-events-none flex flex-wrap items-center justify-between gap-3">
                  <div className="text-[10px] font-bold hacker-text bg-black/60 backdrop-blur border border-neonViolet/40 inline-block px-3 py-1 rounded shadow-[0_0_10px_rgba(208,0,255,0.2)]">
                     SYS_TIME: {formatTime(currentTime)}
                  </div>
                  <div
                    data-testid="harmonic-evidence-hud"
                    className={`text-[9px] font-bold bg-black/70 border px-3 py-1 rounded tracking-widest ${liveTierClass}`}
                  >
                    HARMONIC EVIDENCE HUD · {displayedLabel}: {displayedChord} · CONF: {Math.round(displayedConfidence * 100)}% · {displayedTier}
                  </div>
                  <div
                    data-testid="resonance-waveform-status"
                    className="text-[9px] font-bold bg-black/70 border border-neonViolet/40 px-3 py-1 rounded tracking-widest text-neonViolet"
                  >
                    {isPlaying ? 'SIGNAL_MODE: LIVE_AUDIO' : 'SIGNAL_MODE: ACOUSTIC_STANDBY'}
                  </div>
                  {activeChord && (
                    <div data-testid="current-timeline-state" className="text-[9px] font-bold bg-black/70 border border-slate-500/40 px-3 py-1 rounded tracking-widest text-slate-300">
                      TIMELINE_CHORD: {activeChord.chord} · CONF: {Math.round(activeChord.confidence * 100)}%
                    </div>
                  )}
                </div>
             </div>

             {/* Canonical pitch-class mapping and time-aligned waveform */}
             <div data-testid="harmonic-mapping-panel" className="terminal-box glass-shine p-6 space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neonViolet/20 pb-2">
                   <h3 className="text-[10px] font-bold hacker-text-dim uppercase tracking-[0.3em] flex items-center gap-2">
                      <Activity className="w-3 h-3 text-neonViolet" /> HARMONIC_EVIDENCE_MAPPING
                   </h3>
                   <span className="text-[9px] font-bold tracking-widest text-cyan-300">CIRCLE_OF_FIFTHS · PITCH_CLASS</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-5 items-center">
                  <div className="rounded-lg border border-slate-800/80 bg-black/35 flex items-center justify-center min-h-[238px]">
                    <svg viewBox="0 0 220 210" className="w-full max-w-[250px] h-auto" role="img" aria-label="Pitch-class Circle of Fifths harmonic evidence">
                      <circle cx="110" cy="105" r="77" fill="none" stroke="rgba(75,93,120,0.52)" strokeWidth="1" />
                      {harmonicEdges.map(([fromPitch, toPitch]) => {
                        const from = harmonicNodeFor(fromPitch);
                        const to = harmonicNodeFor(toPitch);
                        if (!from || !to || displayedRootIndex === null) return null;
                        return (
                          <path
                            key={`${fromPitch}-${toPitch}`}
                            d={`M ${from.x} ${from.y} Q 110 105 ${to.x} ${to.y}`}
                            fill="none"
                            stroke={PITCH_CLASS_COLORS[displayedRootIndex]}
                            strokeWidth={displayedTier === 'LOW' ? 1 : 1.5}
                            opacity={displayedTier === 'LOW' ? 0.46 : 0.78}
                          />
                        );
                      })}
                      {harmonicNodes.map(node => {
                        const isRoot = node.pitchClass === displayedTriad?.rootIndex;
                        const isThird = node.pitchClass === displayedTriad?.thirdIndex;
                        const isFifth = node.pitchClass === displayedTriad?.fifthIndex;
                        const role = isRoot ? 'R' : isThird ? '3' : isFifth ? '5' : null;
                        const intensity = Math.min(1, Math.max(0, node.energy));
                        const nodeOpacity = role ? Math.max(0.82, 0.34 + intensity * 0.66) : 0.28 + intensity * 0.7;
                        const nodeRadius = 5 + intensity * 5 + (role ? 1.5 : 0);
                        const color = PITCH_CLASS_COLORS[node.pitchClass];
                        return (
                          <g key={node.pitchClass}>
                            <circle
                              cx={node.x}
                              cy={node.y}
                              r={nodeRadius}
                              fill={color}
                              fillOpacity={nodeOpacity}
                              stroke={role ? '#f8fafc' : color}
                              strokeOpacity={role ? 0.8 : 0.24}
                              strokeWidth={role ? 1.2 : 0.6}
                              style={{ filter: intensity > 0.35 || role ? `drop-shadow(0 0 ${4 + intensity * 7}px ${color})` : undefined }}
                            />
                            <text x={node.x} y={node.y + 17} textAnchor="middle" fill="rgba(203,213,225,0.82)" fontSize="7" fontWeight="700">
                              {NOTE_NAMES[node.pitchClass]}
                            </text>
                            {role && (
                              <text x={node.x} y={node.y + 2.5} textAnchor="middle" fill="#020409" fontSize="6" fontWeight="900">
                                {role}
                              </text>
                            )}
                          </g>
                        );
                      })}
                      <text x="110" y="98" textAnchor="middle" fill="#f8fafc" fontSize="19" fontWeight="900">
                        {displayedChord}
                      </text>
                      <text x="110" y="113" textAnchor="middle" fill={displayedRootIndex === null ? '#64748b' : PITCH_CLASS_COLORS[displayedRootIndex]} fontSize="7" fontWeight="800">
                        {displayedQuality?.toUpperCase() ?? 'LISTENING'}
                      </text>
                      <text x="110" y="126" textAnchor="middle" fill="rgba(148,163,184,0.7)" fontSize="6">
                        CONF {Math.round(displayedConfidence * 100)}% · {displayedTier}
                      </text>
                    </svg>
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-2 text-[9px] uppercase tracking-widest">
                      <div className="rounded border border-slate-800 bg-black/35 p-3">
                        <div className="text-slate-500">PITCH_CLASS</div>
                        <div className="mt-1 text-base font-black text-slate-100">{displayedRoot ?? '--'}</div>
                      </div>
                      <div className="rounded border border-slate-800 bg-black/35 p-3">
                        <div className="text-slate-500">CHORD_CANDIDATE</div>
                        <div className="mt-1 text-base font-black text-slate-100">{displayedChord}</div>
                      </div>
                      <div className="rounded border border-slate-800 bg-black/35 p-3">
                        <div className="text-slate-500">QUALITY</div>
                        <div className="mt-1 font-bold text-cyan-300">{displayedQuality ?? '--'}</div>
                      </div>
                      <div className="rounded border border-slate-800 bg-black/35 p-3">
                        <div className="text-slate-500">HARMONIC_EVIDENCE</div>
                        <div className={`mt-1 font-bold ${liveTierClass.split(' ').at(-1)}`}>{Math.round(displayedConfidence * 100)}% · {displayedTier}</div>
                      </div>
                    </div>
                    <div>
                      <div className="mb-2 text-[8px] text-slate-500 uppercase tracking-[0.25em]">CANONICAL_FIFTHS_ORDER</div>
                      <div className="grid grid-cols-6 gap-1">
                        {CIRCLE_OF_FIFTHS_PITCH_CLASSES.map(pitchClass => (
                          <div
                            key={pitchClass}
                            className="rounded border border-slate-800/80 bg-black/30 px-1.5 py-2 text-center"
                            style={{ color: PITCH_CLASS_COLORS[pitchClass] }}
                          >
                            <div className="text-[9px] font-black">{NOTE_NAMES[pitchClass]}</div>
                            <div className="text-[6px] opacity-55">PC {pitchClass}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-neonViolet/15 pt-3 text-[8px] font-bold tracking-[0.22em]">
                  <span className="text-slate-500">TIME_ALIGNED_ACOUSTIC_WAVEFORM</span>
                  <span className="text-cyan-300">CHORD_TIMELINE</span>
                </div>
                <div id="waveform" className="w-full h-[120px] relative">
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
                     <span className="text-[10px] hacker-text-dim uppercase tracking-widest">ESTIMATED_TONAL_CENTER</span>
                     <span className="text-xl font-bold hacker-text uppercase tracking-tighter">{trackInfo.key}</span>
                  </div>
                  <div className="terminal-box p-4 flex flex-col items-center justify-center space-y-2 border-neonViolet/40">
                     <Zap className="w-4 h-4 text-neonViolet" />
                     <span className="text-[10px] hacker-text-dim uppercase tracking-widest">ANALYSIS_ENGINE</span>
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
                <div className="flex items-center justify-between gap-4">
                   <div>
                     <h3 className="text-xl font-bold hacker-text tracking-tighter uppercase tracking-[0.1em]">
                        ESTIMATED_CHORD_CHANGES
                     </h3>
                     <p className="mt-1 text-[9px] hacker-text-dim uppercase tracking-widest">
                        {chordSegments.length} time-aligned harmonic sections · chroma template estimate
                     </p>
                   </div>
                   {analysisStep !== 'idle' && <div className="flex items-center gap-2 text-[10px] text-hackerGreen bg-hackerGreen/10 border border-hackerGreen/30 px-3 py-1 animate-pulse uppercase tracking-widest"><Loader2 className="w-3 h-3 animate-spin" /> SCANNING_MATRIX...</div>}
                </div>

                {chordSegments.length > 0 && (
                  <div className="grid gap-2">
                    {chordSegments.map((segment, index) => {
                      const isActive = index === activeChordIndex;
                      const pitchClass = pitchClassIndexForNote(segment.root);
                      const pitchColor = pitchClass === null ? '#5c708e' : PITCH_CLASS_COLORS[pitchClass];
                      return (
                        <button
                          key={`${segment.startTime}-${segment.chord}`}
                          type="button"
                          data-testid={`chord-segment-${index}`}
                          aria-pressed={isActive}
                          onClick={() => {
                            wavesurfer.current?.setTime(segment.startTime);
                            void wavesurfer.current?.play();
                          }}
                          className={`terminal-box glass-shine p-3 text-left transition-all relative overflow-hidden group ${isActive ? 'shadow-[0_0_20px_rgba(0,255,65,0.3)] border-hackerGreen' : 'border-neonViolet/30 hover:border-neonViolet'}`}
                        >
                          <span className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: pitchColor }} />
                          <span className="flex justify-between items-center gap-4 pl-2">
                            <span className="text-lg font-black tracking-widest" style={{ color: pitchColor }}>{segment.chord}</span>
                            <span className="text-[9px] hacker-text-dim tracking-widest">
                              {formatTime(segment.startTime)} &gt;&gt; {formatTime(segment.endTime)} · CONF {Math.round(segment.confidence * 100)}%
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {analysisStep === 'idle' && chordSegments.length === 0 && (
                  <div className="text-center py-10 terminal-box border-dashed border-neonViolet/20 hacker-text-dim text-[10px] uppercase tracking-widest">
                    LOAD_AUDIO_THEN_PROCESS_SIGNAL
                  </div>
                )}
             </div>
          </div>
       </div>
    </div>
  );
};

export default AppThree;
