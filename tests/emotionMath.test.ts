import assert from 'node:assert/strict';
import { EMOTIONAL_KEYS } from '../constants';
import { calculateMetrics, getNearestKey } from '../utils/emotionMath';

for (const key of EMOTIONAL_KEYS) {
  assert.equal(
    getNearestKey({ valence: key.valence, arousal: key.arousal })?.id,
    key.id,
    `${key.displayName} should own its declared circumplex coordinate`,
  );
}

assert.equal(getNearestKey({ valence: 0.95, arousal: 0.95 })?.id, 'C_MAJOR');
assert.equal(getNearestKey({ valence: 0.8, arousal: -0.6 })?.id, 'E_MAJOR');
assert.equal(getNearestKey({ valence: -0.85, arousal: -0.75 })?.id, 'F_SHARP_MINOR');
assert.equal(getNearestKey({ valence: -0.8, arousal: 0.9 })?.id, 'G_SHARP_MINOR');
assert.equal(getNearestKey({ valence: Number.NaN, arousal: 0 }) , null);

const identical = calculateMetrics({ valence: 0.9, arousal: 0.85 }, { valence: 0.9, arousal: 0.85 });
assert.equal(identical.resonanceIndex, 1);

const opposed = calculateMetrics({ valence: 0.9, arousal: 0.85 }, { valence: -0.8, arousal: -0.65 });
assert.ok(opposed.resonanceIndex >= 0 && opposed.resonanceIndex < identical.resonanceIndex);

console.log('Emotion math tests passed: 12 unique key anchors and four circumplex quadrants verified.');
