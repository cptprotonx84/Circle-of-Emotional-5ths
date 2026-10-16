
export const LOCAL_INSIGHTS: Record<string, string> = {
  "C Major": "C Major is often associated with purity, innocence, and simplicity. Historically, it is the 'clean slate' of music, lacking accidentals and representing a state of absolute equilibrium in the valence-arousal spectrum.",
  "G Major": "G Major brings a sense of warmth and gentle joy. It is frequently linked to pastoral scenes and sunshine, occupying a space of mild, positive arousal.",
  "D Major": "D Major is often perceived as triumphant, bright, and vibrant. It is the key of victory and celebration, showing a higher arousal level than its counterparts.",
  "A Major": "A Major carries a sense of youthfulness, love, and tenderness. It feels softer and more intimate than D Major, balanced perfectly between valence and moderate arousal.",
  "E Major": "E Major radiates brightness, brilliance, and occasionally joy with a hint of brilliance. It is highly active, leaning towards the top-right quadrant of the valence-arousal chart.",
  "B Major": "B Major is often described as intense, strong, and sometimes wild. It stands out for its high-energy, high-valence characteristics, projecting a sense of powerful positivity.",
  "F# Minor": "F# Minor carries a restrained melancholy: inward, spacious, and low in arousal without becoming emotionally inert. It suits reflective passages that need sadness with harmonic clarity.",
  "C# Minor": "C# Minor suggests contemplation and contained dramatic weight. Its neutral valence and moderate arousal make it useful for thoughtful transitions and unresolved inner motion.",
  "G# Minor": "G# Minor holds the map's highest tension: dark valence with strong arousal. It supports urgent, percussive writing and should read as intensity rather than a psychological diagnosis.",
  "D# Minor": "D# Minor feels uneasy and pulsing, pairing negative valence with high arousal. It is suited to suspense, instability, and tightly controlled harmonic pressure.",
  "A# Minor": "A# Minor represents relief as a gentle release from tension. Its positive valence and moderate arousal favor passages that resolve without becoming triumphant.",
  "F Major": "F Major is pastoral, gentle, and reflective. It is the key of nature and the earth, embodying a calm, steady positive valence."
};

export const getLocalInsight = (musicalKey: string): string => {
  return LOCAL_INSIGHTS[musicalKey] || "Musical depth for this key remains in flux, awaiting further harmonic analysis.";
};
