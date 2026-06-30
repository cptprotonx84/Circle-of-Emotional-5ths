import { GoogleGenAI } from "@google/genai";

// Try overriding the fetch implementation in GoogleGenAI!
async function main() {
  const token = "ya29.fakeTokenForTestingACCESS_TOKEN_TYPE_UNSUPPORTED";
  
  const ai = new GoogleGenAI({ 
    apiKey: "placeholder", // dummy
  });

  // Hack: intercept fetch
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url: any, options: any) => {
    // If it's a ya29 token, rewrite url to remove ?key= and add Authorization header
    let strUrl = url.toString();
    if (strUrl.includes("?key=placeholder")) {
      strUrl = strUrl.replace("?key=placeholder", "");
      options.headers = {
        ...options.headers,
        Authorization: `Bearer ${token}`
      };
    }
    return originalFetch(strUrl, options);
  };

  try {
    await ai.models.generateContent({ model: "gemini-3.5-flash", contents: "hi" });
  } catch(e: any) {
    console.log("Error:", e.message);
  }
}
main();
