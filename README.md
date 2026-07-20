# NEURAL HARMONY SYSTEM of Emotional 5ths (OFFLINE VERSION)

An interactive exploration of musical keys, emotions, valence, and arousal, visualized through the Circle of Fifths. This version operates in a fully **OFFLINE, RULES-ONLY** mode.

## Overview
This system is a self-contained exploration of harmonic resonance. It maps musical keys to emotional states (Valence/Arousal) and uses a local knowledge base to simulate musical insights, transition analysis, and audio feature mapping—no internet or cloud AI required.

### Design Framework
- **Emotional Mapping**: Utilizes a DEAM-inspired (Database for Emotional Analysis in Music) 2D valence/arousal coordinate system.
- **Key Association**: Individual key mappings are curated artistic and music-theory heuristics. They are exploratory associations, not psychological diagnosis or empirically definitive measurements of emotion.

### Resonance Waveform
- During playback, the Resonance Waveform uses local Web Audio frequency and time-domain data from the loaded song. Bass, mid, high, and RMS energy drive its displacement, complexity, glow, orbital pulse, and motion speed.
- The selected key's mapped arousal remains a visual baseline, while the selected key controls the waveform color and harmonic identity.
- When playback is stopped or no analyser is available, the panel falls back to a restrained arousal-driven standby signal.
- Live signal reactivity is visual only; it does not claim to infer the listener's emotional or psychological state.

### Local Timeline Analysis
- **Chord mode** uses local chroma features to estimate timestamped major/minor chord changes. The current chord label updates during playback and its root drives the Circle focus.
- **Emotion mode** divides the track into local analysis windows and derives changing valence/arousal estimates from energy, brightness, and harmonic character. These values drive `EMO_PROBE_01` and the nearest Circle key while that mode is active.
- The timeline toggle switches the display and playback driver between chord progression and emotion trajectory. Chord and emotion sections are intentionally independent, so their counts do not need to match.
- Analysis runs in the browser through Meyda and the Web Audio API. The results are musical estimates, not authoritative transcription or psychological measurement.

## Operational Modes
1. **Songwriter Mode**: Focuses on individual key analysis, offering emotional heuristics and songwriting texture advice based on the selected harmonic center.
2. **Experience Mode**: Designed for immersive exploration, visualizing the broader relationship between valence and arousal, allowing users to map emotional trajectories across the harmonic spectrum.

## Tech Stack
- **Frontend**: React 18, Vite, Tailwind CSS, Framer Motion, D3.js, Recharts.
- **Backend**: Express.js (Node.js).
- **Logic**: Local rules plus browser-side Web Audio/Meyda feature extraction.

## Setup Instructions
1. **Clone the Repository**: Ensure you have Node.js (v18+).
2. **Install Dependencies**: `npm install`
3. **Run Locally**: `npm run dev`
   The application will be running at `http://localhost:3000`.

## Architecture Notes
- **Offline-first Logic**: Chord timing and emotion trajectories are derived locally. Existing written transition insights still use the local rules endpoint.
- **Zero Cloud Requirement**: Audio analysis does not upload the song or require an API key.
- **Optional Future Model**: A local Gemma companion can later enrich mood descriptions or interpret supplied context, but deterministic audio features should remain responsible for timestamp accuracy.

## License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Credits
- **Creator**: Nick Louthan
- **Project Identity**: Nick Valence / NX-Valence Labs

## Known Issues
- **Audio Analysis**: Chord labels are template-based estimates and can be less reliable with dense mixes, inversions, ambiguous harmony, tuning drift, or extended chords. Emotion values are transparent audio-feature heuristics rather than psychological ground truth.
- **Circle Coverage**: The UI's 12-key emotional dataset does not contain every major/minor spelling. The timeline preserves the estimated chord label, while the Circle may use the same-root key as a visual proxy.

## Build/Deploy
- **Build**: `npm run build`
- **Deploy**: The generated `dist/` folder is a standard static SPA. Serve via any static web server (Nginx, Apache, etc.) or deploy as a single-node Express container.
