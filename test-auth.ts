import { GoogleGenAI } from "@google/genai";

async function main() {
  const token = process.env.GEMINI_API_KEY || process.env.API_KEY || "";
  console.log("Token:", token.substring(0, 10));
  
  const isOAuth = !token.startsWith("AIza");

  const ai = new GoogleGenAI({
    // If it's an OAuth token, we can't pass it as apiKey because it appends ?key=
    // which throws ACCESS_TOKEN_TYPE_UNSUPPORTED.
    // We can pass an empty string and set Authorization header.
    // Actually, passing "placeholder" for apiKey might send ?key=placeholder which also fails.
    // Wait, the genai sdk allows empty string? Let's test
    apiKey: isOAuth ? "" : token,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
        ...(isOAuth ? { Authorization: `Bearer ${token}` } : {})
      }
    }
  });

  try {
    const res = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: "say hi"
    });
    console.log("Success!", res.text);
  } catch(e: any) {
    console.error("Error:", e.message);
  }
}
main();
