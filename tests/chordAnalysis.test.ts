import assert from 'node:assert/strict';
import Meyda from 'meyda';
import {
  buildChordSegmentsFromFrames,
  ChordFrame,
  ChordQuality,
  estimateChordFromChroma,
  MAX_LOCAL_AUDIO_BYTES,
  validateLocalAudioFileSize,
} from '../utils/localAudioAnalysis';

assert.doesNotThrow(() => validateLocalAudioFileSize(41 * 1024 * 1024));
assert.doesNotThrow(() => validateLocalAudioFileSize(MAX_LOCAL_AUDIO_BYTES));
assert.throws(
  () => validateLocalAudioFileSize(0),
  /selected audio file is empty or unreadable/,
);
assert.throws(
  () => validateLocalAudioFileSize(MAX_LOCAL_AUDIO_BYTES + 1),
  /no larger than 256MB/,
);

const chromaForChord = (rootIndex: number, quality: ChordQuality) => {
  const chroma = Array.from({ length: 12 }, () => 0.02);
  chroma[rootIndex] = 1;
  chroma[(rootIndex + (quality === 'Major' ? 4 : 3)) % 12] = 0.84;
  chroma[(rootIndex + 7) % 12] = 0.72;
  return chroma;
};

assert.deepEqual(
  (({ chord, root, quality }) => ({ chord, root, quality }))(estimateChordFromChroma(chromaForChord(0, 'Major'))),
  { chord: 'C', root: 'C', quality: 'Major' },
);

const SAMPLE_RATE = 44100;
const FRAME_SIZE = 4096;
const synthesizeTriad = (frequencies: number[]) => Float32Array.from(
  { length: FRAME_SIZE },
  (_, sampleIndex) => frequencies.reduce(
    (sum, frequency) => sum + Math.sin((2 * Math.PI * frequency * sampleIndex) / SAMPLE_RATE) / frequencies.length,
    0,
  ),
);

Meyda.sampleRate = SAMPLE_RATE;
Meyda.bufferSize = FRAME_SIZE;
const extractedProgression = [
  [261.63, 329.63, 392.00],
  [220.00, 261.63, 329.63],
  [174.61, 220.00, 261.63],
  [196.00, 246.94, 293.66],
].map(frequencies => {
  const chroma = Meyda.extract('chroma', synthesizeTriad(frequencies)) as number[];
  return estimateChordFromChroma(chroma).chord;
});
assert.deepEqual(extractedProgression, ['C', 'Am', 'F', 'G']);

assert.deepEqual(
  (({ chord, root, quality }) => ({ chord, root, quality }))(estimateChordFromChroma(chromaForChord(9, 'Minor'))),
  { chord: 'Am', root: 'A', quality: 'Minor' },
);

const progression = [
  { chord: 'C', root: 'C', quality: 'Major' as const },
  { chord: 'Am', root: 'A', quality: 'Minor' as const },
  { chord: 'F', root: 'F', quality: 'Major' as const },
  { chord: 'G', root: 'G', quality: 'Major' as const },
];

const frames: ChordFrame[] = progression.flatMap((entry, progressionIndex) =>
  Array.from({ length: 16 }, (_, frameIndex) => ({
    time: progressionIndex * 8 + frameIndex * 0.5,
    ...entry,
    confidence: 0.82,
    rms: 0.22,
    spectralCentroid: 72,
  })),
);

const segments = buildChordSegmentsFromFrames(frames, 32);
assert.deepEqual(segments.map(segment => segment.chord), ['C', 'Am', 'F', 'G']);
assert.equal(segments[0].startTime, 0);
assert.equal(segments.at(-1)?.endTime, 32);
assert.ok(segments.every(segment => segment.endTime > segment.startTime));

console.log('Chord analysis tests passed:', segments.map(segment => `${segment.chord}@${segment.startTime.toFixed(1)}s`).join(' -> '));
