import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.warn("CRITICAL: GEMINI_API_KEY is missing. Ensure it is defined in .env.local");
}
const genAI = new GoogleGenerativeAI(apiKey || "");

const fallbackAnalysis = {
  farmerSummary: "- Disease signs are visible and need quick action.\n- Remove badly affected leaves first.\n- Reduce excess moisture around the crop.\n- Apply a suitable protectant spray and keep monitoring daily.",
  diagnosticOverview: "The crop shows distinct lesion patterns consistent with initial fungal incubation. Immediate moisture containment is highly recommended.",
  immediateProtocol: "- Prune heavily affected leaves to halt systemic distribution.\n- Limit localized top-soil irrigation cycles.\n- Apply organic copper-based protectant spray.",
  longTermRecommendations: "- Enact an immediate crop rotation program next cycle.\n- Transition to disease-resistant seed strains.\n- Enhance general drainage contours."
};

function fileToGenerativePart(buffer: Buffer, mimeType: string) {
  return {
    inlineData: {
      data: buffer.toString("base64"),
      mimeType
    },
  };
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('image') as File;

    if (!file) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 1. Multimodal Vision Call to Gemini 2.5 Flash
    let responseData: any;
    try {
      const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash",
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.1, // Lower temperature reduces "random" hallucinations
        },
        systemInstruction: "You are FarmGuard AI's expert plant pathologist. Your task is to analyze crop leaf images. FIRST: Determine if the image is a clear photo of a plant leaf. If the image is a person, a room, an animal, or anything that is NOT a plant leaf, you MUST return exactly: {\"classification\": [{\"label\": \"Invalid___Not_A_Plant\", \"score\": 0.0}], \"analysis\": null}. If it IS a plant leaf, diagnose the condition. Output MUST be valid JSON only."
      });

      const imagePart = fileToGenerativePart(buffer, file.type);
      const prompt = `Perform complete diagnostic classification and analysis on this leaf image. 
      
      You MUST return a JSON object containing exactly this schema structure (with no surrounding markdown code blocks):
      {
        "classification": [
          {
            "label": "PlantName___Disease_Or_Healthy",
            "score": 0.95
          }
        ],
        "analysis": {
          "farmerSummary": "A simple markdown bulleted list of 4-5 short points summarizing the diagnosis, urgency, key field action, weather/moisture concerns, and what the farmer should monitor next.",
          "diagnosticOverview": "A thorough paragraph describing the disease, how it spreads under specific weather conditions, and how it affects this specific crop's cellular structure.",
          "immediateProtocol": "A markdown bulleted list of 3-4 emergency actions the farmer must physically take right now in the field to halt spread (e.g., specific chemical/organic applications, humidity reduction, pruning guidelines).",
          "longTermRecommendations": "A markdown bulleted list of 3-4 structural crop management steps for the next planting season (e.g., crop rotation, nitrogen levels, disease-resistant seed strains)."
        }
      }

      Important Label rules:
      - Separate the Plant name and the Condition name using exactly three underscores ('___'). E.g., 'Maize___Common_rust', 'Tomato___Late_blight', 'Tomato___healthy', 'Potato___Early_blight'.
      - Replace any spaces in the plant name or disease name with single underscores.
      - If it is healthy, use 'healthy' as the condition name (e.g., 'Maize___healthy').
      - CRITICAL: If the image is not a plant, set label to 'Invalid___Not_A_Plant' and score to 0.0.
      - Ensure the score is a float value between 0.0 and 1.0 representing your confidence.`;

      const geminiResult = await model.generateContent([prompt, imagePart]);
      const text = geminiResult.response.text();

      // Clean up markdown fences if Gemini still wrapped them
      const jsonString = text.replace(/```json/g, "").replace(/```/g, "").trim();
      responseData = JSON.parse(jsonString);

    } catch (geminiError) {
      console.error("Gemini API Error:", geminiError);
      throw new Error(`AI Analysis failed: ${geminiError instanceof Error ? geminiError.message : 'Unknown error'}`);
    }

    // 2. Guardrail Check: Check top score and validity of leaf
    const topResult = responseData?.classification?.[0];
    if (!topResult || topResult.score < 0.65 || topResult.label === "Invalid___Not_A_Plant") {
      return NextResponse.json({
        error: "Not a plant",
        message: "Our AI couldn't identify a plant leaf in this photo. Please ensure the leaf is centered and well-lit."
      }, { status: 422 });
    }

    // 3. Return the fully compliant JSON payload
    return NextResponse.json({
      classification: responseData.classification,
      analysis: responseData.analysis
    }, { status: 200 });

  } catch (error: any) {
    console.error('Classification endpoint error:', error);
    return NextResponse.json(
      { error: "Classification failed", message: error.message || 'An unexpected error occurred during analysis.' },
      { status: 500 }
    );
  }
}
