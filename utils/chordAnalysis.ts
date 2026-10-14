export type ChordQuality = 'Major' | 'Minor';

export const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const chordName = (root: string, quality: ChordQuality) => `${root}${quality === 'Minor' ? 'm' : ''}`;

// Existing 24-template estimator. CONF is relative harmonic evidence, not a probability.
export const estimateChordFromChroma = (chroma: number[]) => {
  const normalized = Array.from({ length: 12 }, (_, index) => Math.max(0, chroma[index] ?? 0));
  const total = normalized.reduce((sum, value) => sum + value, 0) || 1;
  const candidates: Array<{ rootIndex: number; quality: ChordQuality; score: number }> = [];

  for (let rootIndex = 0; rootIndex < 12; rootIndex += 1) {
    for (const quality of ['Major', 'Minor'] as const) {
      const thirdOffset = quality === 'Major' ? 4 : 3;
      const rootEnergy = normalized[rootIndex];
      const thirdEnergy = normalized[(rootIndex + thirdOffset) % 12];
      const fifthEnergy = normalized[(rootIndex + 7) % 12];
      const triadEnergy = rootEnergy + thirdEnergy * 0.88 + fifthEnergy * 0.76;
      const outsideEnergy = Math.max(0, total - rootEnergy - thirdEnergy - fifthEnergy);
      candidates.push({ rootIndex, quality, score: triadEnergy - outsideEnergy * 0.085 });
    }
  }

  candidates.sort((left, right) => right.score - left.score);
  const best = candidates[0];
  const runnerUp = candidates[1];
  const root = NOTE_NAMES[best.rootIndex];
  const confidence = clamp01((best.score - runnerUp.score) / Math.max(0.12, Math.abs(best.score)));
  return { chord: chordName(root, best.quality), root, quality: best.quality, confidence };
};
