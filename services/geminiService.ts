
import { EmotionalKeyData } from "../types";

export const generateEmotionalInsight = async (data: EmotionalKeyData): Promise<string> => {
  try {
    const res = await fetch("/api/generate-insight", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        musicalKey: data.musicalKey,
        emotion: data.emotion,
        mood: data.mood,
        valence: data.valence,
        arousal: data.arousal,
      }),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      if (errorData.error === "QUOTA_EXCEEDED" || res.status === 429) {
        throw new Error("QUOTA_EXCEEDED");
      }
      throw new Error(errorData.error || "SERVER_SIGNAL_LOST");
    }

    const resData = await res.json();
    return resData.text || "No insight generated.";
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    if (error.message?.includes("QUOTA_EXCEEDED")) {
      throw new Error("QUOTA_EXCEEDED");
    }
    return "Unable to generate insight at this moment.";
  }
};
