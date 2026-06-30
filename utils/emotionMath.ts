import { EmotionState, AnalysisResult, EmotionalKeyData } from '../types';
import { EMOTIONAL_KEYS } from '../constants';

// Euclidean distance between two points in 2D space
const getDistance = (e1: EmotionState, e2: EmotionState): number => {
  return Math.sqrt(
    Math.pow(e2.valence - e1.valence, 2) + Math.pow(e2.arousal - e1.arousal, 2)
  );
};

// Find the nearest key in our database to a given V-A point
export const getNearestKey = (e: EmotionState): EmotionalKeyData => {
  let minDist = Infinity;
  let nearest = EMOTIONAL_KEYS[0];

  for (const k of EMOTIONAL_KEYS) {
    // Note: EMOTIONAL_KEYS arousal is 0.3-0.9 usually. 
    // If input arousal is -1 to 1, we might map it, but for now we assume direct comparison
    // or that the input will be in a compatible range.
    // The visualization in AppTwo allows -1 to 1.
    // Let's assume standard Euclidean distance.
    const dist = Math.sqrt(Math.pow(k.valence - e.valence, 2) + Math.pow(k.arousal - e.arousal, 2));
    if (dist < minDist) {
      minDist = dist;
      nearest = k;
    }
  }
  return nearest;
};

export const calculateMetrics = (e1: EmotionState, e2: EmotionState): AnalysisResult => {
  const dist = getDistance(e1, e2);
  
  // Resonance Index: Arbitrary metric where closer emotions are "more resonant" 
  // or specific harmonic intervals are resonant. 
  // For this app, let's define Resonance as inverse of distance, normalized.
  // Max possible distance in 2x2 square is sqrt(8) ≈ 2.82
  // Let's normalize so 0 distance = 1.0 resonance, max distance = 0.0
  const maxDist = 2.82;
  const resonanceIndex = Math.max(0, 1 - (dist / maxDist));

  const k1 = getNearestKey(e1);
  const k2 = getNearestKey(e2);

  return {
    emotion1: { key: k1.musicalKey, mood: k1.mood, data: k1 },
    emotion2: { key: k2.musicalKey, mood: k2.mood, data: k2 },
    distance: dist,
    resonanceIndex: resonanceIndex
  };
};