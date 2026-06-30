import { GoogleGenAI } from "@google/genai";

async function main() {
  const token = "ya29.fakeTokenForTestingACCESS_TOKEN_TYPE_UNSUPPORTED";
  
  // Test 1: Just setting apiKey
  console.log("--- Test 1: apiKey ---");
  try {
    const ai1 = new GoogleGenAI({ apiKey: token });
    await ai1.models.generateContent({ model: "gemini-3.5-flash", contents: "hi" });
  } catch(e: any) {
    console.log("Test 1 error:", e.message);
  }

  // Test 2: Setting Authorization header and empty apiKey
  console.log("--- Test 2: Authorization header, apiKey undefined ---");
  try {
    // If we don't set apiKey, GoogleGenAI falls back to GoogleAuth (ADC).
    // If ADC fails, it throws immediately.
    // So we HAVE to set something or bypass it.
    const ai2 = new GoogleGenAI({ 
      apiKey: " ", 
      httpOptions: { headers: { Authorization: `Bearer ${token}` } } 
    });
    await ai2.models.generateContent({ model: "gemini-3.5-flash", contents: "hi" });
  } catch(e: any) {
    console.log("Test 2 error:", e.message);
  }
}
main();
