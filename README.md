# NEURAL HARMONY SYSTEM of Emotional 5ths (OFFLINE VERSION)

An interactive exploration of musical keys, emotions, valence, and arousal, visualized through the Circle of Fifths. This version operates in a fully **OFFLINE, RULES-ONLY** mode.

## Overview
This system is a self-contained exploration of harmonic resonance. It maps musical keys to emotional states (Valence/Arousal) and uses a local knowledge base to simulate musical insights, transition analysis, and audio feature mapping—no internet or cloud AI required.

### Design Framework
- **Emotional Mapping**: Utilizes a DEAM-inspired (Database for Emotional Analysis in Music) 2D valence/arousal coordinate system.
- **Key Association**: Individual emotional key mappings are manually curated to align with classical music-psychology theory, ensuring artistic and thematic coherence without empirical cloud-data reliance.

## Operational Modes
1. **Songwriter Mode**: Focuses on individual key analysis, offering emotional heuristics and songwriting texture advice based on the selected harmonic center.
2. **Experience Mode**: Designed for immersive exploration, visualizing the broader relationship between valence and arousal, allowing users to map emotional trajectories across the harmonic spectrum.

## Tech Stack
- **Frontend**: React 18, Vite, Tailwind CSS, Framer Motion, D3.js, Recharts.
- **Backend**: Express.js (Node.js).
- **Logic**: Pure local rules-based engine.

## Setup Instructions
1. **Clone the Repository**: Ensure you have Node.js (v18+).
2. **Install Dependencies**: `npm install`
3. **Run Locally**: `npm run dev`
   The application will be running at `http://localhost:3000`.

## Architecture Notes
- **Rules-Only Logic**: All "insights" and "analyses" are derived from the local `constants/insights.ts` engine and static mocks.
- **Zero Cloud Dependencies**: No API calls are made to external services.

## Known Issues
- **Audio Analysis**: The "Audio Analysis" functionality is currently a placeholder/mock output and does not perform real-time signal processing. This will be implemented in a future release.

## Build/Deploy
- **Build**: `npm run build`
- **Deploy**: The generated `dist/` folder is a standard static SPA. Serve via any static web server (Nginx, Apache, etc.) or deploy as a single-node Express container.
