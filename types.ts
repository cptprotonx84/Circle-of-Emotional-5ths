export type MusicalKeyId =
  | 'C_MAJOR'
  | 'G_MAJOR'
  | 'D_MAJOR'
  | 'A_MAJOR'
  | 'E_MAJOR'
  | 'B_MAJOR'
  | 'F_SHARP_MINOR'
  | 'C_SHARP_MINOR'
  | 'G_SHARP_MINOR'
  | 'D_SHARP_MINOR'
  | 'A_SHARP_MINOR'
  | 'F_MAJOR';

export type MusicalKeyQuality = 'Major' | 'Minor';

export interface EmotionalKeyData {
  id: MusicalKeyId;
  displayName: string;
  root: string;
  quality: MusicalKeyQuality;
  emotion: string;
  valence: number;
  arousal: number;
  color: string;
  colorGradientName: string;
  tailwindGradient: string;
  primaryColor: string;
  secondaryColor: string;
  mood: string;
  musicalKey: string;
  keyPosition: number; // 1-12
}

export interface ChartDataPoint {
  x: number; // Valence
  y: number; // Arousal
  z: number; // Size/Importance (optional)
  label: string;
  color: string;
  id: MusicalKeyId;
}

export interface EmotionState {
  valence: number; // Canonical circumplex coordinate: -1 (negative) to +1 (positive)
  arousal: number; // Canonical circumplex coordinate: -1 (low energy) to +1 (high energy)
}

export interface AnalysisResult {
  emotion1: { key: string; mood?: string; data?: EmotionalKeyData };
  emotion2: { key: string; mood?: string; data?: EmotionalKeyData };
  distance: number;
  resonanceIndex: number;
}
