/**
 * app/api/fertilizer/route.ts
 *
 * POST handler — "Smart Fertilizer Recommendations"
 *
 * Pipeline:
 *  1. Read `condition` + `cropType` from the request JSON body.
 *  2. Initialise Google Generative AI via `process.env.GEMINI_API_KEY`.
 *  3. Send a strict system-instruction prompt to `gemini-1.5-flash`
 *     requiring raw JSON output (no markdown fences, no extra prose).
 *  4. Parse Gemini's text response directly with JSON.parse().
 *  5. On any network or parse failure, return a full safe default payload
 *     so the front-end always receives a complete, typed response.
 */

import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

/* ─── Strict system instruction ───────────────────────────────────────────── */

const SYSTEM_INSTRUCTION = `
You are an expert digital agronomist with 25 years of field experience in precision
nutrient management. Your job is to analyse a single crop and its diagnosed condition
and return a precision fertiliser and treatment protocol.

OUTPUT CONTRACT — YOU MUST OBEY ALL OF THE FOLLOWING RULES:

1.  You MUST output ONLY raw JSON. No markdown fences. No back-ticks. No explanation,
    preamble, or closing text of any kind.
2.  The JSON object MUST contain exactly and only these keys:

{
  "nitrogen_ratio": number,           // 0–100 — recommended N share of total N-P-K
  "phosphorus_ratio": number,         // 0–100 — recommended P share of total N-P-K
  "potassium_ratio": number,          // 0–100 — recommended K share of total N-P-K
  "synthetic_name": "string",         // brand or generic synthetic fertiliser name
  "synthetic_dosage": "string",       // grams per plant / litres per hectare, plain text
  "organic_alternative": "string",    // equivalent organic / bio-fertiliser option
  "application_frequency": "string",  // e.g. "Every 3 weeks until flowering"
  "safety_precaution": "string"       // one-sentence PPE / environmental warning
}

3.  The three ratio numbers MUST add up to exactly 100 (they are the % composition).
4.  nitrogen_ratio, phosphorus_ratio, and potassium_ratio must be integers or decimals,
    not strings.
5.  Do NOT include any other keys. Do NOT nest objects. Do NOT wrap in an array.
`;

/* ─── Safe fallback when Gemini is unreachable or returns bad JSON ────────── */
function safeFallback(condition: string, cropType: string) {
  return {
    nitrogen_ratio: 40,
    phosphorus_ratio: 25,
    potassium_ratio: 35,
    synthetic_name: "NPK 20-10-15",
    synthetic_dosage: `Apply 200 g per plant mixed into top-soil, or 300 kg per hectare as a basal dressing.`,
    organic_alternative: `${cropType} compost — apply 5 kg of well-rotted farmyard manure per plant every 4 weeks.`,
    application_frequency: `Every 14 days until flower initiation, then every 21 days until harvest.`,
    safety_precaution: `Wear nitrile gloves, safety goggles, and an N95 mask during application. Avoid contact with eyes and do not apply before heavy rain is forecast within 24 hours.`,
    _source: "safe-fallback",
  };
}

/* ─── Parse raw text from Gemini — handles accidental markdown fences ─────── */
function parseGeminiText(text: string): any {
  // Strip triple-backtick fences (```json  or  ``` )
  const cleaned = text.replace(/```(?:json)?\s*/gi, "").replace(/```\s*$/g, "").trim();

  // Try to locate the first '{' and last '}'
  const firstBrace = cleaned.indexOf("{");
  const lastBrace  = cleaned.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1));
  }

  // Fallback: try the whole string
  return JSON.parse(cleaned);
}

/* ─── POST handler ─────────────────────────────────────────────────────────── */

export async function POST(request: NextRequest) {
  /* 1. Read and validate body */
  let body: { condition?: string; cropType?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body. Expected { condition: string, cropType: string }." },
      { status: 400 },
    );
  }

  const condition  = (body.condition  ?? "").trim();
  const cropType   = (body.cropType   ?? "").trim();

  if (!condition || !cropType) {
    return NextResponse.json(
      { error: "Both condition and cropType are required." },
      { status: 400 },
    );
  }

  /* 2. Initialise Gemini client */
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("[fertilizer] GEMINI_API_KEY is not set — returning safe fallback.");
    return NextResponse.json(safeFallback(condition, cropType));
  }

  const genAI     = new GoogleGenerativeAI(apiKey);
  const model     = genAI.getGenerativeModel({
    model:      "gemini-1.5-flash",
    systemInstruction: SYSTEM_INSTRUCTION,
  });

  /* 3. Build the user prompt */
  const userPrompt = `
Crop Type   : ${cropType}
Diagnosed Condition : ${condition}

Return the JSON object described in your system instructions. No markdown, no backticks, no commentary.
`;

  /* 4. Call Gemini — with a hard timeout so the request never hangs */
  const controller = new AbortController();
  const timeoutId  = setTimeout(() => controller.abort(), 20_000);

  try {
    const result       = await model.generateContent(userPrompt, { signal: controller.signal });
    const responseText = result.response.text();

    clearTimeout(timeoutId);

    /* 5. Parse and validate */
    const parsed = parseGeminiText(responseText);

    // Validate required keys are present and correctly typed
    const requiredKeys = [
      "nitrogen_ratio", "phosphorus_ratio", "potassium_ratio",
      "synthetic_name", "synthetic_dosage",
      "organic_alternative", "application_frequency", "safety_precaution",
    ];
    const missing = requiredKeys.filter((k) => !(k in parsed));
    if (missing.length > 0) {
      console.warn("[fertilizer] Gemini response missing keys:", missing, "— using fallback.");
      return NextResponse.json({ ...safeFallback(condition, cropType), _source: "schema-fallback" });
    }

    // Force ratio types to number (Gemini sometimes returns strings)
    const payload = {
      nitrogen_ratio:       Number(parsed.nitrogen_ratio) || 0,
      phosphorus_ratio:     Number(parsed.phosphorus_ratio)  || 0,
      potassium_ratio:      Number(parsed.potassium_ratio)  || 0,
      synthetic_name:       String(parsed.synthetic_name),
      synthetic_dosage:     String(parsed.synthetic_dosage),
      organic_alternative:  String(parsed.organic_alternative),
      application_frequency:String(parsed.application_frequency),
      safety_precaution:    String(parsed.safety_precaution),
    };

    return NextResponse.json(payload, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err: any) {
    clearTimeout(timeoutId);
    console.warn("[fertilizer] Gemini call failed:", err?.message ?? err, "— returning safe fallback.");

    return NextResponse.json({ ...safeFallback(condition, cropType), _source: "network-fallback" });
  }
}
