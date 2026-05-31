import "dotenv/config";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

const MODELS = ["gemini-3.1-pro-preview", "gemini-2.5-flash", "gemini-3.5-flash"];
const QUERY =
  "Using Google Search, list two notable news items about Salesforce from the last 30 days, with source URLs.";

async function probe(model: string) {
  try {
    const res = await ai.models.generateContent({
      model,
      contents: QUERY,
      config: { tools: [{ googleSearch: {} }], temperature: 0 },
    });
    const cand = res.candidates?.[0] as
      | { groundingMetadata?: { groundingChunks?: unknown[]; webSearchQueries?: string[] } }
      | undefined;
    const gm = cand?.groundingMetadata;
    console.log(`\n=== ${model} ===`);
    console.log("text length:        ", (res.text ?? "").length);
    console.log("groundingMetadata?: ", gm ? "YES" : "NO");
    console.log("groundingChunks:    ", gm?.groundingChunks?.length ?? 0);
    console.log("webSearchQueries:   ", JSON.stringify(gm?.webSearchQueries ?? []));
    if (gm) console.log("metadata keys:      ", Object.keys(gm).join(", "));
  } catch (e) {
    console.log(`\n=== ${model} ===`);
    console.log("ERROR:", e instanceof Error ? e.message.slice(0, 200) : String(e));
  }
}

async function main() {
  for (const m of MODELS) await probe(m);
}
main();
