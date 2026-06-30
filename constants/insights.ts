
export const LOCAL_INSIGHTS: Record<string, string> = {
  "C Major": "C Major is often associated with purity, innocence, and simplicity. Historically, it is the 'clean slate' of music, lacking accidentals and representing a state of absolute equilibrium in the valence-arousal spectrum.",
  "G Major": "G Major brings a sense of warmth and gentle joy. It is frequently linked to pastoral scenes and sunshine, occupying a space of mild, positive arousal.",
  "D Major": "D Major is often perceived as triumphant, bright, and vibrant. It is the key of victory and celebration, showing a higher arousal level than its counterparts.",
  "A Major": "A Major carries a sense of youthfulness, love, and tenderness. It feels softer and more intimate than D Major, balanced perfectly between valence and moderate arousal.",
  "E Major": "E Major radiates brightness, brilliance, and occasionally joy with a hint of brilliance. It is highly active, leaning towards the top-right quadrant of the valence-arousal chart.",
  "B Major": "B Major is often described as intense, strong, and sometimes wild. It stands out for its high-energy, high-valence characteristics, projecting a sense of powerful positivity.",
  "F# Major": "F# Major is characterized by triumph, but also a slight complexity. It's the key of conquest and intellectual success, leaning into the high-valence, high-arousal region.",
  "C# Major": "C# Major is rich, deep, and occasionally overwhelming. It captures a sense of intensity and dramatic flair, sitting firmly in the high arousal region.",
  "Ab Major": "Ab Major is often associated with grace, beauty, and mild melancholy. It navigates the middle-ground, blending positive valence with more introspective, moderate arousal.",
  "Eb Major": "Eb Major is known for its depth, resonance, and occasionally heroic or solemn nature. It carries a sense of wisdom and weight, balancing mid-range valence with moderate energy.",
  "Bb Major": "Bb Major is optimistic, hopeful, and forward-looking. It represents the transition from darkness to light, with a balanced positive valence.",
  "F Major": "F Major is pastoral, gentle, and reflective. It is the key of nature and the earth, embodying a calm, steady positive valence."
};

export const getLocalInsight = (musicalKey: string): string => {
  return LOCAL_INSIGHTS[musicalKey] || "Musical depth for this key remains in flux, awaiting further harmonic analysis.";
};
