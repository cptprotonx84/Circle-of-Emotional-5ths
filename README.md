# NEURAL HARMONY SYSTEM of Emotional 5ths

An interactive exploration of the relationship between musical keys, emotions, valence, and arousal, visualized through the Circle of Fifths. This application leverages the Gemini API to analyze emotional states, musical transitions, and key associations.

## Overview

The **NEURAL HARMONY SYSTEM of Emotional 5ths** is a modern, interactive web application built with React, Vite, Tailwind CSS, and D3.js. It features a unique, terminal-inspired "hacker" visual theme.

At its core, the application allows users to explore the **Circle of Fifths**, not just as a music theory tool, but as a map of emotional resonance. Each musical key is associated with a specific emotional state (e.g., C Major with "Innocence / Happiness", C Minor with "Anguish / Sorrow"). The system plots these states on a 2D plane of Valence (positive vs. negative emotion) and Arousal (high vs. low energy).

### Key Features
- **Interactive Circle of Fifths**: A D3-powered, animated visualization of the Circle of Fifths. Click on any key to explore its associated emotion.
- **Resonance Waveform**: Toggle a visual representation of the current key's "arousal" (energy level) via a dynamically oscillating waveform overlay.
- **Emotional Valence & Arousal Mapping**: See how different keys relate to psychological states on a detailed scatter plot.
- **AI-Powered Insights**: Uses the **Google Gemini API** to generate rich, contextual explanations of why a certain key evokes a specific emotion musically, complete with historical contexts and related musical examples.
- **Journey Analysis**: Select two different keys to simulate an emotional "transition." The Gemini API will analyze how the mood shifts from the first state to the second and suggest narrative or musical contexts for this transition.
- **Audio Analysis (Mocked/Future Proofed)**: The backend supports uploading audio segments for deeper musical analysis.

## Tech Stack
- **Frontend**: React 18, Vite, Tailwind CSS, Framer Motion (for fluid animations), D3.js (for data visualization), Recharts (for scatter plots).
- **Icons**: Lucide React.
- **Backend**: Express.js server in TypeScript, handling secure proxying to the Gemini API.
- **AI**: `@google/genai` SDK for interaction with `gemini-3.5-flash`.

## How to Use

### Prerequisites
- Node.js (v18 or higher)
- A Google Gemini API Key

### Setup Instructions

1. **Clone the Repository**
   ```bash
   git clone <your-repository-url>
   cd <your-repository-folder>
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Configure Environment Variables**
   Create a `.env` file in the root directory and add your Gemini API Key:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

4. **Run the Application locally**
   ```bash
   # Starts both the backend Express server and the Vite React frontend
   npm run dev
   ```
   The application will be running at `http://localhost:3000`.

### Interacting with the App

1. **Explore the Circle**: On the main dashboard, you'll see the Harmonic Domain Circle. Hover over the slices to see the keys, and click one to select it.
2. **Toggle Resonance**: Click the `Resonance: OFF / ON` button above the circle to visualize the energy (arousal) of the selected key via a dynamic waveform.
3. **Read AI Insights**: When you select a key, the right panel will display the key's metrics (Valence/Arousal) and automatically fetch a detailed AI-generated musical insight.
4. **Transition Analysis**: 
   - Scroll down to the "Emotional Transition Simulator" section.
   - Select a "State 1" key and a "State 2" key from the dropdowns.
   - The app will map the transition on the valence/arousal plot.
   - Click "Analyze Transition with AI" to generate a narrative understanding of shifting between those two emotional states.

## Architecture Notes

- **Full-Stack Implementation**: The application is built as a single repository but acts as a full-stack app. The Vite development server is integrated as middleware into the Express backend (`server.ts`). This is critical because the Gemini API key must be kept secure on the server side and never exposed to the client browser.
- **API Endpoints**: 
  - `POST /api/generate-insight`: Generates musical insights for a single key.
  - `POST /api/analyze-transition`: Compares two keys and their emotional shifts.
  - `POST /api/analyze-audio`: Endpoint for analyzing audio data.

---
*Created in Google AI Studio.*
