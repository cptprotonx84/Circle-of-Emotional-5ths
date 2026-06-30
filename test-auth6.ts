import { GoogleGenAI } from "@google/genai";

async function main() {
  const token = process.env.GEMINI_API_KEY || "";
  const isOAuth = token.startsWith("ya29.");
  
  const customFetch = async (url: any, options: any) => {
    let strUrl = url.toString();
    const urlObj = new URL(strUrl);
    
    if (isOAuth) {
      urlObj.searchParams.delete("key");
      options.headers = {
        ...options.headers,
        Authorization: `Bearer ${token}`
      };
    }
    
    return fetch(urlObj.toString(), options);
  };

  const ai = new GoogleGenAI({ 
    apiKey: token, 
    httpOptions: { 
      fetch: customFetch,
      headers: { "User-Agent": "aistudio-build" }
    }
  });

  try {
    const res = await ai.models.generateContent({ model: "gemini-3.5-flash", contents: "hi" });
    console.log("Success:", res.text);
  } catch(e: any) {
    console.log("Error:", e.message);
  }
}
main();
