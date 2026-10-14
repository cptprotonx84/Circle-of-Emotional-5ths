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

  // API 2: Audio Analysis Proxy (Mocked)
  app.post("/api/analyze-audio", async (req, res) => {
    res.json({
      trackInfo: { key: "C Major", tempo: "120", chords: "C - Am - F - G" },
      segments: [
        { startTime: "00:00", endTime: "01:30", description: "Calm introduction", mood: "Peaceful", valence: 0.5, arousal: -0.6 },
        { startTime: "01:30", endTime: "03:00", description: "Energetic climax", mood: "Excitement", valence: 0.8, arousal: 0.9 }
      ],
      suggestions: [{ target: "G Major", weights: "High", advice: "Brighten the harmonic texture" }]
    });
  });

  // API 3: General Key/Emotion Poetry Insight Proxy (Mocked)
  app.post("/api/generate-insight", async (req, res) => {
    const { musicalKey } = req.body;
    res.json({ text: getLocalInsight(musicalKey) });
  });

  // API 4: Transition Interpretation Proxy (Mocked)
  app.post("/api/analyze-transition", async (req, res) => {
    res.json({ text: "The transition from the current state to the target represents a shift from introspective clarity to outward expansion, mirroring the harmonic evolution from the tonic to the dominant." });
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
