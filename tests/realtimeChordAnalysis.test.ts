import assert from 'node:assert/strict';
import {
  advanceChordTracker,
  analyzePitchClassChroma,
  CHORD_HOLD_FRAMES,
  confidenceTier,
  emptyChordTracker,
} from '../utils/realtimeChordAnalysis';

const chromaFor = (root: number, minor = false) => {
  const chroma = Array.from({ length: 12 }, () => 0.01);
  chroma[root] = 1;
  chroma[(root + (minor ? 3 : 4)) % 12] = 0.82;
  chroma[(root + 7) % 12] = 0.7;
  return chroma;
};

const cMajor = analyzePitchClassChroma(chromaFor(0));
const gMajor = analyzePitchClassChroma(chromaFor(7));
const dMajor = analyzePitchClassChroma(chromaFor(2));
assert.equal(cMajor.chord, 'C');
assert.equal(gMajor.chord, 'G');

let tracker = emptyChordTracker();
for (let frame = 0; frame < CHORD_HOLD_FRAMES - 1; frame += 1) tracker = advanceChordTracker(tracker, cMajor);
assert.equal(tracker.active, null, 'initial candidate must persist for the full hold threshold');
tracker = advanceChordTracker(tracker, cMajor);
assert.equal(tracker.active?.chord, 'C');
assert.equal(tracker.pendingFrames, 0);

for (let frame = 0; frame < 80; frame += 1) tracker = advanceChordTracker(tracker, cMajor);
tracker = advanceChordTracker(tracker, gMajor);
assert.equal(tracker.active?.chord, 'C', 'stable active frames must not count toward a replacement');
assert.equal(tracker.pendingFrames, 1);
tracker = advanceChordTracker(tracker, cMajor);

for (let frame = 0; frame < CHORD_HOLD_FRAMES - 1; frame += 1) tracker = advanceChordTracker(tracker, gMajor);
assert.equal(tracker.active?.chord, 'C', 'replacement must not promote before 14 consecutive frames');
tracker = advanceChordTracker(tracker, dMajor);
assert.equal(tracker.pendingChord, 'D');
assert.equal(tracker.pendingFrames, 1, 'a different replacement candidate must restart persistence');
tracker = advanceChordTracker(tracker, cMajor);
assert.equal(tracker.pendingChord, null, 'returning to the active chord clears pending state');
assert.equal(tracker.pendingFrames, 0);

for (let frame = 0; frame < CHORD_HOLD_FRAMES; frame += 1) tracker = advanceChordTracker(tracker, gMajor);
assert.equal(tracker.active?.chord, 'G');
assert.equal(tracker.pendingChord, null);
assert.equal(tracker.pendingFrames, 0);

assert.equal(confidenceTier(0.19), 'LOW');
assert.equal(confidenceTier(0.2), 'MOD');
assert.equal(confidenceTier(0.449), 'MOD');
assert.equal(confidenceTier(0.45), 'HIGH');

console.log('Real-time chord persistence tests passed.');
