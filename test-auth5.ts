import { GoogleGenAI } from "@google/genai";

async function main() {
  const token = process.env.GEMINI_API_KEY || "";
  
  const customFetch = async (url: any, options: any) => {
    let strUrl = url.toString();
    // Remove the ?key=... query parameter completely
    const urlObj = new URL(strUrl);
    urlObj.searchParams.delete("key");
    
    // Add the token in the header
    options.headers = {
      ...options.headers,
      Authorization: `Bearer ${token}`
    };
    
    return fetch(urlObj.toString(), options);
  };

  const ai = new GoogleGenAI({ 
    apiKey: "dummy", 
    httpOptions: { fetch: customFetch }
  });

  try {
    const res = await ai.models.generateContent({ model: "gemini-3.5-flash", contents: "hi" });
    console.log("Success:", res.text);
  } catch(e: any) {
    console.log("Error:", e.message);
  }
}
main();
