import { estimateChordFromChroma, ChordQuality, NOTE_NAMES } from './chordAnalysis';

export { NOTE_NAMES } from './chordAnalysis';
export const CIRCLE_OF_FIFTHS_PITCH_CLASSES = [0, 7, 2, 9, 4, 11, 6, 1, 8, 3, 10, 5] as const;
export const PITCH_CLASS_COLORS = [
  '#ffd21a', '#39477d', '#1a9a63', '#b52a58', '#26a7a0', '#a65b78',
  '#6555c9', '#138ca0', '#2877c7', '#c43a6b', '#865072', '#7354b7',
] as const;
export const CHORD_HOLD_FRAMES = 14;

export const pitchClassIndexForNote = (note: string): number | null => {
  const index = NOTE_NAMES.indexOf(note as (typeof NOTE_NAMES)[number]);
  return index >= 0 ? index : null;
};

export const triadPitchClasses = (rootIndex: number, quality: ChordQuality) => ({
  rootIndex,
  thirdIndex: (rootIndex + (quality === 'Major' ? 4 : 3)) % 12,
  fifthIndex: (rootIndex + 7) % 12,
});

export interface ChordEvidence {
  chord: string;
  root: string;
  rootIndex: number;
  quality: ChordQuality;
  confidence: number;
  chroma: number[];
  thirdIndex: number;
  fifthIndex: number;
}

export interface ChordTrackerState {
  active: ChordEvidence | null;
  pendingChord: string | null;
  pendingFrames: number;
}

export type ConfidenceTier = 'LOW' | 'MOD' | 'HIGH';

export const confidenceTier = (confidence: number): ConfidenceTier => {
  if (confidence < 0.2) return 'LOW';
  if (confidence < 0.45) return 'MOD';
  return 'HIGH';
};

export const analyzePitchClassChroma = (input: ArrayLike<number>): ChordEvidence => {
  const chroma = Array.from({ length: 12 }, (_, index) => Math.max(0, Number(input[index]) || 0));
  const total = chroma.reduce((sum, value) => sum + value, 0);
  const normalized = total > 0 ? chroma.map(value => value / total) : chroma;
  const candidate = estimateChordFromChroma(normalized);
  const rootIndex = pitchClassIndexForNote(candidate.root) ?? 0;
  const triad = triadPitchClasses(rootIndex, candidate.quality);
  return {
    ...candidate,
    confidence: total > 0 ? candidate.confidence : 0,
    ...triad,
    chroma: normalized,
  };
};

export const advanceChordTracker = (
  state: ChordTrackerState,
  candidate: ChordEvidence,
  requiredFrames = CHORD_HOLD_FRAMES,
): ChordTrackerState => {
  if (state.active?.chord === candidate.chord) {
    return { active: candidate, pendingChord: null, pendingFrames: 0 };
  }

  const pendingFrames = state.pendingChord === candidate.chord ? state.pendingFrames + 1 : 1;
  if (pendingFrames >= requiredFrames) {
    return { active: candidate, pendingChord: null, pendingFrames: 0 };
  }

  return { active: state.active, pendingChord: candidate.chord, pendingFrames };
};

export const emptyChordTracker = (): ChordTrackerState => ({
  active: null,
  pendingChord: null,
  pendingFrames: 0,
});
