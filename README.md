# NEURAL HARMONY SYSTEM of Emotional 5ths (OFFLINE VERSION)

An interactive exploration of musical keys, emotions, valence, and arousal, visualized through the Circle of Fifths. This version operates in a fully **OFFLINE, RULES-ONLY** mode.

## Overview
This system is a self-contained exploration of harmonic resonance. It maps musical keys to emotional states (Valence/Arousal) and uses a local knowledge base to simulate musical insights, transition analysis, and audio feature mapping—no internet or cloud AI required.

### Design Framework
- **Emotional Mapping**: Utilizes a DEAM-inspired (Database for Emotional Analysis in Music) 2D valence/arousal coordinate system.
- **Canonical Coordinates**: Valence and arousal both use a single `-1.0` to `+1.0` circumplex scale throughout controls, key mapping, timelines, and visualizers.
- **Key Association**: Individual key mappings are curated artistic and music-theory heuristics. They are exploratory associations, not psychological diagnosis or empirically definitive measurements of emotion.

### Harmonic Evidence Visualizer
- The live analyzer is driven only by measured Web Audio features: low/mid/high energy, waveform samples, and a 12-bin pitch-class chromagram.
- The pitch-class ring uses Circle-of-Fifths visualization colors. Node size and brightness follow measured chroma energy; root/third/fifth geometry follows the active chord candidate.
- `CONF` is relative harmonic evidence from the existing 24-template major/minor comparison. It is not a calibrated probability of correctness.
- Replacement chords must persist for 14 consecutive analysis frames before becoming active. LOW evidence remains steady dim amber; MOD is cyan; HIGH is green.

### Local Timeline Analysis
- The chord timeline uses local chroma features to estimate timestamped major/minor chord changes. The current chord label updates during playback and its root drives the separate Circle focus.
- Audio playback does not infer valence, arousal, moods, or emotional labels. The Emotional Matrix and Resonance sections remain separate manual creative tools.
- Analysis runs in the browser through Meyda and the Web Audio API. The results are harmonic estimates, not authoritative transcription.
- Offline processing accepts audio files up to 256 MB and tracks up to 20 minutes. Larger material should be split into song-length files before analysis.

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
- **Offline-first Logic**: Chord timing is derived locally. Existing written transition insights still use the local rules endpoint.
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
