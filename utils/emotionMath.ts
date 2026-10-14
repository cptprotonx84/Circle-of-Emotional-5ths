import { AnalysisResult, EmotionalKeyData, EmotionState } from '../types';
import { EMOTIONAL_KEYS } from '../constants';

const clampCircumplexValue = (value: number) => Math.min(1, Math.max(-1, value));

const sanitizeEmotion = (emotion: EmotionState): EmotionState | null => {
  if (!Number.isFinite(emotion.valence) || !Number.isFinite(emotion.arousal)) return null;
  return {
    valence: clampCircumplexValue(emotion.valence),
    arousal: clampCircumplexValue(emotion.arousal),
  };
};

const getDistance = (left: EmotionState, right: EmotionState) => Math.hypot(
  right.valence - left.valence,
  right.arousal - left.arousal,
);

export const getNearestKey = (emotion: EmotionState): EmotionalKeyData | null => {
  const point = sanitizeEmotion(emotion);
  if (!point) {
    if (import.meta.env?.DEV) console.warn('[selected-key] Cannot map non-finite valence/arousal values.', emotion);
    return null;
  }

  let nearest: EmotionalKeyData | null = null;
  let minimumDistance = Number.POSITIVE_INFINITY;
  for (const key of EMOTIONAL_KEYS) {
    const distance = Math.hypot(key.valence - point.valence, key.arousal - point.arousal);
    if (distance < minimumDistance) {
      minimumDistance = distance;
      nearest = key;
    }
  }
  return nearest;
};

export const calculateMetrics = (first: EmotionState, second: EmotionState): AnalysisResult => {
  const left = sanitizeEmotion(first);
  const right = sanitizeEmotion(second);
  if (!left || !right) {
    return {
      emotion1: { key: 'UNMAPPED' },
      emotion2: { key: 'UNMAPPED' },
      distance: 0,
      resonanceIndex: 0,
    };
  }

  const distance = getDistance(left, right);
  const firstKey = getNearestKey(left);
  const secondKey = getNearestKey(right);
  const spatialResonance = Math.max(0, 1 - distance / (Math.SQRT2 * 2));

  let harmonicResonance = 0;
  if (firstKey && secondKey) {
    const directSteps = Math.abs(firstKey.keyPosition - secondKey.keyPosition);
    const circleSteps = Math.min(directSteps, 12 - directSteps);
    harmonicResonance = 1 - circleSteps / 6;
  }

  return {
    emotion1: firstKey
      ? { key: firstKey.displayName, mood: firstKey.mood, data: firstKey }
      : { key: 'UNMAPPED' },
    emotion2: secondKey
      ? { key: secondKey.displayName, mood: secondKey.mood, data: secondKey }
      : { key: 'UNMAPPED' },
    distance,
    resonanceIndex: spatialResonance * 0.7 + harmonicResonance * 0.3,
  };
};
