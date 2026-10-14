import Meyda from 'meyda';
import { EMOTIONAL_KEYS } from '../constants';
import { MusicalKeyId } from '../types';
import { getNearestKey } from './emotionMath';
import { estimateChordFromChroma, ChordQuality } from './chordAnalysis';

export { estimateChordFromChroma } from './chordAnalysis';
export type { ChordQuality } from './chordAnalysis';

export interface ChordFrame {
  time: number;
  chord: string;
  root: string;
  quality: ChordQuality;
  confidence: number;
  rms: number;
  spectralCentroid: number;
}

export interface ChordTimelineSegment {
  startTime: number;
  endTime: number;
  chord: string;
  root: string;
  quality: ChordQuality;
  confidence: number;
  mappedKeyId: MusicalKeyId | null;
}

export interface EmotionTimelineSegment {
  startTime: number;
  endTime: number;
  valence: number;
  arousal: number;
  mood: string;
  description: string;
  confidence: number;
  mappedKeyId: MusicalKeyId | null;
}

export interface LocalAudioAnalysis {
  duration: number;
  globalKey: string;
  chordProgression: string;
  chordSegments: ChordTimelineSegment[];
}

const BUFFER_SIZE = 4096;
const ANALYSIS_HOP_SECONDS = 0.5;
const MIN_CHORD_SECONDS = 1.25;
const EMOTION_WINDOW_SECONDS = 6;
export const MAX_LOCAL_AUDIO_BYTES = 256 * 1024 * 1024;
export const MAX_LOCAL_AUDIO_DURATION_SECONDS = 20 * 60;

const clamp = (value: number, minimum: number, maximum: number) => Math.min(maximum, Math.max(minimum, value));
const clamp01 = (value: number) => clamp(value, 0, 1);

export const validateLocalAudioFileSize = (size: number) => {
  if (!Number.isFinite(size) || size <= 0) {
    throw new Error('LOCAL_ANALYSIS_INPUT: the selected audio file is empty or unreadable.');
  }
  if (size > MAX_LOCAL_AUDIO_BYTES) {
    throw new Error('LOCAL_ANALYSIS_LIMIT: select an audio file no larger than 256MB.');
  }
};

const mapChordToCircle = (root: string, quality: ChordQuality): MusicalKeyId | null => {
  const exact = EMOTIONAL_KEYS.find(key => key.root === root && key.quality === quality);
  const rootProxy = EMOTIONAL_KEYS.find(key => key.root === root);
  return exact?.id ?? rootProxy?.id ?? null;
};

const smoothChordFrames = (frames: ChordFrame[]) => frames.map((frame, index) => {
  const votes = new Map<string, number>();
  const start = Math.max(0, index - 2);
  const end = Math.min(frames.length - 1, index + 2);

  for (let neighborIndex = start; neighborIndex <= end; neighborIndex += 1) {
    const neighbor = frames[neighborIndex];
    const distanceWeight = neighborIndex === index ? 1.4 : Math.abs(neighborIndex - index) === 1 ? 1 : 0.65;
    votes.set(neighbor.chord, (votes.get(neighbor.chord) ?? 0) + (0.35 + neighbor.confidence) * distanceWeight);
  }

  const winningChord = [...votes.entries()].sort((left, right) => right[1] - left[1])[0]?.[0] ?? frame.chord;
  const winningFrame = frames.slice(start, end + 1).find(candidate => candidate.chord === winningChord) ?? frame;
  return { ...frame, chord: winningChord, root: winningFrame.root, quality: winningFrame.quality };
});

export const buildChordSegmentsFromFrames = (frames: ChordFrame[], duration: number): ChordTimelineSegment[] => {
  if (!frames.length || duration <= 0) return [];
  const smoothedFrames = smoothChordFrames(frames);
  const segments: ChordTimelineSegment[] = [];
  let segmentStart = 0;
  let activeChord = smoothedFrames[0];
  let confidenceTotal = activeChord.confidence;
  let confidenceCount = 1;

  for (let index = 1; index < smoothedFrames.length; index += 1) {
    const frame = smoothedFrames[index];
    const canSplit = frame.time - segmentStart >= MIN_CHORD_SECONDS;

    if (frame.chord !== activeChord.chord && canSplit) {
      segments.push({
        startTime: segmentStart,
        endTime: frame.time,
        chord: activeChord.chord,
        root: activeChord.root,
        quality: activeChord.quality,
        confidence: clamp01(confidenceTotal / confidenceCount),
        mappedKeyId: mapChordToCircle(activeChord.root, activeChord.quality),
      });
      segmentStart = frame.time;
      activeChord = frame;
      confidenceTotal = frame.confidence;
      confidenceCount = 1;
    } else {
      confidenceTotal += frame.confidence;
      confidenceCount += 1;
    }
  }

  segments.push({
    startTime: segmentStart,
    endTime: duration,
    chord: activeChord.chord,
    root: activeChord.root,
    quality: activeChord.quality,
    confidence: clamp01(confidenceTotal / confidenceCount),
    mappedKeyId: mapChordToCircle(activeChord.root, activeChord.quality),
  });

  return segments.reduce<ChordTimelineSegment[]>((result, segment) => {
    const durationSeconds = segment.endTime - segment.startTime;
    const previous = result[result.length - 1];
    if (durationSeconds < MIN_CHORD_SECONDS && previous) {
      previous.endTime = segment.endTime;
      return result;
    }
    result.push({ ...segment });
    return result;
  }, []);
};

const percentile = (values: number[], ratio: number) => {
  if (!values.length) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * ratio))];
};

const describeEmotion = (valence: number, arousal: number) => {
  if (arousal >= 0.36 && valence >= 0.25) return { mood: 'Energized', description: 'Bright, high-energy spectral movement.' };
  if (arousal >= 0.36 && valence < 0.25) return { mood: 'Tense', description: 'High energy with a darker harmonic profile.' };
  if (arousal < -0.2 && valence >= 0.25) return { mood: 'Serene', description: 'Restrained energy with a brighter spectral balance.' };
  if (arousal < -0.2 && valence < 0.25) return { mood: 'Reflective', description: 'Low energy with a darker spectral balance.' };
  return { mood: valence >= 0 ? 'Open' : 'Brooding', description: 'Moderate energy with evolving spectral color.' };
};

const buildEmotionSegments = (frames: ChordFrame[], duration: number): EmotionTimelineSegment[] => {
  if (!frames.length || duration <= 0) return [];
  const rmsReference = Math.max(0.015, percentile(frames.map(frame => frame.rms), 0.9));
  const segments: EmotionTimelineSegment[] = [];

  for (let startTime = 0; startTime < duration; startTime += EMOTION_WINDOW_SECONDS) {
    const endTime = Math.min(duration, startTime + EMOTION_WINDOW_SECONDS);
    const windowFrames = frames.filter(frame => frame.time >= startTime && frame.time < endTime);
    if (!windowFrames.length) continue;

    const rms = windowFrames.reduce((sum, frame) => sum + frame.rms, 0) / windowFrames.length;
    const centroid = windowFrames.reduce((sum, frame) => sum + frame.spectralCentroid, 0) / windowFrames.length;
    const majorRatio = windowFrames.filter(frame => frame.quality === 'Major').length / windowFrames.length;
    const confidence = windowFrames.reduce((sum, frame) => sum + frame.confidence, 0) / windowFrames.length;
    const normalizedEnergy = clamp01((rms / rmsReference) * 0.82);
    const arousal = normalizedEnergy * 2 - 1;
    const brightness = clamp01(centroid / 160);
    const valence = clamp(-0.72 + brightness * 1.18 + majorRatio * 0.34, -1, 1);
    const mappedKey = getNearestKey({ valence, arousal });
    const emotionDescription = describeEmotion(valence, arousal);

    segments.push({
      startTime,
      endTime,
      valence,
      arousal,
      mood: emotionDescription.mood,
      description: emotionDescription.description,
      confidence: clamp01(confidence),
      mappedKeyId: mappedKey?.id ?? null,
    });
  }

  return segments;
};

const dominantChord = (segments: ChordTimelineSegment[]) => {
  const durations = new Map<string, number>();
  for (const segment of segments) {
    durations.set(segment.chord, (durations.get(segment.chord) ?? 0) + segment.endTime - segment.startTime);
  }
  return [...durations.entries()].sort((left, right) => right[1] - left[1])[0]?.[0] ?? 'Unknown';
};

const progressionLabel = (segments: ChordTimelineSegment[]) => {
  const compact: string[] = [];
  for (const segment of segments) {
    if (compact[compact.length - 1] !== segment.chord) compact.push(segment.chord);
  }
  return compact.slice(0, 16).join(' - ') || 'No stable chords detected';
};

export const analyzeAudioLocally = async (file: File): Promise<LocalAudioAnalysis> => {
  validateLocalAudioFileSize(file.size);

  const audioContext = new (window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  try {
    let audioBuffer: AudioBuffer;
    try {
      audioBuffer = await audioContext.decodeAudioData(await file.arrayBuffer());
    } catch {
      throw new Error('LOCAL_ANALYSIS_INPUT: this audio format could not be decoded. Try WAV, MP3, M4A, or FLAC supported by your browser.');
    }
    if (!Number.isFinite(audioBuffer.duration) || audioBuffer.duration <= 0) {
      throw new Error('LOCAL_ANALYSIS_INPUT: the decoded audio contains no playable duration.');
    }
    if (audioBuffer.duration > MAX_LOCAL_AUDIO_DURATION_SECONDS) {
      throw new Error('LOCAL_ANALYSIS_LIMIT: select a track no longer than 20 minutes for offline analysis.');
    }

    const source = audioBuffer.getChannelData(0);
    const frameCount = Math.max(1, Math.floor(audioBuffer.duration / ANALYSIS_HOP_SECONDS));
    const frames: ChordFrame[] = [];
    Meyda.sampleRate = audioBuffer.sampleRate;
    Meyda.bufferSize = BUFFER_SIZE;

    for (let frameIndex = 0; frameIndex < frameCount; frameIndex += 1) {
      const time = frameIndex * ANALYSIS_HOP_SECONDS;
      const sampleStart = Math.min(source.length - 1, Math.floor(time * audioBuffer.sampleRate));
      const signal = new Float32Array(BUFFER_SIZE);
      signal.set(source.subarray(sampleStart, Math.min(source.length, sampleStart + BUFFER_SIZE)));
      const features = Meyda.extract(['chroma', 'rms', 'spectralCentroid'], signal) as {
        chroma?: number[];
        rms?: number;
        spectralCentroid?: number;
      } | null;
      if (!features?.chroma) continue;
      const chord = estimateChordFromChroma(features.chroma);
      frames.push({
        time,
        ...chord,
        rms: features.rms ?? 0,
        spectralCentroid: features.spectralCentroid ?? 0,
      });
    }

    const chordSegments = buildChordSegmentsFromFrames(frames, audioBuffer.duration);
    return {
      duration: audioBuffer.duration,
      globalKey: dominantChord(chordSegments),
      chordProgression: progressionLabel(chordSegments),
      chordSegments,
    };
  } finally {
    await audioContext.close();
  }
};
