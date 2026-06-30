export interface EmotionalKeyData {
  id: number;
  emotion: string;
  valence: number;
  arousal: number;
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
  id: number;
}

export interface EmotionState {
  valence: number;
  arousal: number;
}

export interface AnalysisResult {
  emotion1: { key: string; mood?: string; data?: EmotionalKeyData };
  emotion2: { key: string; mood?: string; data?: EmotionalKeyData };
  distance: number;
  resonanceIndex: number;
}