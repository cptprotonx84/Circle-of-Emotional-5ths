import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // JSON and URL-encoded body parsing with safe 10MB limit
  app.use(express.json({ limit: "15mb" }));
  app.use(express.urlencoded({ extended: true, limit: "15mb" }));

  // Helper to initialize GenAI client robustly, handling both API keys and OAuth tokens.
  const getGenAIClient = () => {
    const token = process.env.GEMINI_API_KEY || process.env.API_KEY;
    if (!token) throw new Error("API_KEY_NOT_CONFIGURED");

    const isOAuth = token.startsWith("ya29.");

    const customFetch = async (url: any, options: any) => {
      let strUrl = url.toString();
      const urlObj = new URL(strUrl);

      if (isOAuth) {
        // Remove the ?key= query parameter to prevent ACCESS_TOKEN_TYPE_UNSUPPORTED
        urlObj.searchParams.delete("key");
        options.headers = {
          ...options.headers,
          Authorization: `Bearer ${token}`
        };
      }

      return fetch(urlObj.toString(), options);
    };

    return new GoogleGenAI({
      apiKey: token,
      httpOptions: {
        fetch: customFetch,
        headers: { "User-Agent": "aistudio-build" }
      }
    });
  };

  // API 1: Healthcheck
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // API 2: Audio Analysis Proxy
  app.post("/api/analyze-audio", async (req, res) => {
    try {
      const { audioData, mimeType, scriptContext, duration } = req.body;
      if (!audioData) {
        return res.status(400).json({ error: "Missing audio data" });
      }

      let ai;
      try {
        ai = getGenAIClient();
      } catch (e: any) {
        return res.status(400).json({ error: e.message });
      }

      const audioPart = {
        inlineData: {
          data: audioData,
          mimeType: mimeType
        }
      };

      const combinedPrompt = `AUDIO_ANALYSIS_REQUEST: Analyze this audio track and return a single valid JSON response.
      Provide the following sections inside the returned JSON structure. Do NOT include markdown code blocks (e.g. \`\`\`json) - output purely valid JSON:

      1. Global Key (e.g., C Major, F# Minor), Tempo (BPM e.g. "120"), and main Chord Progression (e.g. "Am - F - C - G").
         Return inside "trackInfo" with keys "key", "tempo", and "chords".
      2. Emotional segmented timeline breaks based on the sonic features of the audio, indicating valence & arousal (both must be in the range -1.0 to 1.0) under "segments".
         Each segment must possess "startTime" ("MM:SS"), "endTime" ("MM:SS"), "description", "mood" (e.g. "Aggression", "Melancholy"), "valence" (number), and "arousal" (number).
         CRITICAL constraints: 
         - The segments MUST be contiguous, start exactly at "00:00", and cover the entire length of the track.
         - The total duration of this full track is ${duration || "03:00"}. Ensure that your final segment's endTime matches ${duration || "03:00"} exactly, and all intermediate segments partition this full duration.
         - You MUST provide highly distinct, dynamic valence and arousal values for each segment to accurately capture the emotional shifts in the track. Avoid repeating the same values for consecutive segments.
         ${scriptContext ? `CONTEXT to dynamically incorporate: "${scriptContext}"` : ""}
      3. Shift suggestions under "suggestions".
         Each suggestion must possess "target" (string), "weights" (string), and "advice" (string).`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: { parts: [audioPart, { text: combinedPrompt }] },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              trackInfo: {
                type: Type.OBJECT,
                properties: {
                  key: { type: Type.STRING },
                  tempo: { type: Type.STRING },
                  chords: { type: Type.STRING }
                }
              },
              segments: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    startTime: { type: Type.STRING, description: "Format: MM:SS. Must start exactly at 00:00 for the first segment." },
                    endTime: { type: Type.STRING, description: "Format: MM:SS. Must match the exact track duration for the final segment." },
                    description: { type: Type.STRING },
                    mood: { type: Type.STRING },
                    valence: { type: Type.NUMBER, description: "Between -1.0 and 1.0. Must be highly distinct per segment." },
                    arousal: { type: Type.NUMBER, description: "Between -1.0 and 1.0. Must be highly distinct per segment." }
                  },
                  required: ["startTime", "endTime", "description", "mood", "valence", "arousal"]
                }
              },
              suggestions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    target: { type: Type.STRING },
                    weights: { type: Type.STRING },
                    advice: { type: Type.STRING }
                  }
                }
              }
            },
            required: ["trackInfo", "segments", "suggestions"]
          }
        }
      });

      let responseText = response.text || "";
      if (responseText.includes("```")) {
        responseText = responseText.replace(/```json/g, "").replace(/```/g, "").trim();
      }

      const parsedJSON = JSON.parse(responseText.trim());
      res.json(parsedJSON);
    } catch (err: any) {
      console.error("Audio Analysis Server Error:", err);
      if (err.message?.includes("429") || err.message?.includes("RESOURCE_EXHAUSTED")) {
        res.status(429).json({ error: "QUOTA_EXCEEDED" });
      } else {
        res.status(500).json({ error: err.message || "Failed to analyze audio signal." });
      }
    }
  });

  // API 3: General Key/Emotion Poetry Insight Proxy
  app.post("/api/generate-insight", async (req, res) => {
    try {
      const { musicalKey, emotion, mood, valence, arousal } = req.body;
      let ai;
      try {
        ai = getGenAIClient();
      } catch (e: any) {
        return res.status(400).json({ error: e.message });
      }

      const prompt = `
        Analyze the musical key of ${musicalKey} and its association with the emotion "${emotion}".
        The mood is described as "${mood}".
        Valence: ${valence}, Arousal: ${arousal}.
        
        1. Briefly explain why this key might evoke this specific emotion musically (e.g., resonance, historical usage, brightness/darkness).
        2. Describe a vivid short scene or visual setting that embodies this combination.
        3. Suggest a simple chord progression or musical texture that a composer could use to express this.
        
        Keep the response concise (under 200 words) but poetic and insightful. Format with clear paragraphs.
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
      });

      res.json({ text: response.text || "No insight generated." });
    } catch (err: any) {
      console.error("Generate Insight Server Error:", err);
      if (err.message?.includes("429") || err.message?.includes("RESOURCE_EXHAUSTED")) {
        res.status(429).json({ error: "QUOTA_EXCEEDED" });
      } else {
        res.status(500).json({ error: err.message || "Failed to generate dynamic insights." });
      }
    }
  });

  // API 4: Transition Interpretation Proxy
  app.post("/api/analyze-transition", async (req, res) => {
    try {
      const { e1, e2, metrics } = req.body;
      let ai;
      try {
        ai = getGenAIClient();
      } catch (e: any) {
        return res.status(400).json({ error: e.message });
      }

      const prompt = `
        You are an expert in music psychology and emotional analysis.
        Analyze the transition between two emotional states in a user's journey:
        
        State 1: Valence ${e1.valence}, Arousal ${e1.arousal} (Musical Key: ${metrics.emotion1.key})
        State 2: Valence ${e2.valence}, Arousal ${e2.arousal} (Musical Key: ${metrics.emotion2.key})
        
        Calculated Distance: ${metrics.distance.toFixed(3)}
        Resonance Index: ${metrics.resonanceIndex.toFixed(3)} (0 to 1 scale)

        Provide a concise, poetic interpretation (max 100 words) of this emotional shift. 
        Explain what the change in musical keys signifies metaphorically about this change in mood.
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
      });

      res.json({ text: response.text || "NO_DATA_RECOVERED" });
    } catch (err: any) {
      console.error("Analyze Transition Server Error:", err);
      if (err.message?.includes("429") || err.message?.includes("RESOURCE_EXHAUSTED")) {
        res.status(429).json({ error: "QUOTA_EXCEEDED" });
      } else {
        res.status(500).json({ error: err.message || "Failed to synthesize neural values." });
      }
    }
  });

  // Vite middleware in development, static static handling in production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
