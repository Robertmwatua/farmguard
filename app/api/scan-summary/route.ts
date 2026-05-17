import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: NextRequest) {
  try {
    const { plantName, disease, confidence, healthStatus } = await req.json();

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction: `You are the FarmGuard Agronomist AI. Your job is to analyze a crop's leaf scan diagnostic result and summarize it shortly in exactly 3 to 4 bold, point-form bullet points.
- Bullet 1: Summarize the diagnostic observation clearly (e.g. "Observation: [Blight/Armyworm] spotted with [Confidence]% certainty").
- Bullet 2: State the primary cause shortly (e.g. "Primary Cause: Humidity or pest spreading").
- Bullet 3: Provide a bold, hyper-actionable immediate step the farmer should take right away.
- Bullet 4: Give a preventive suggestion for nearby healthy plants.

Keep the bullets extremely concise, clear, scientific yet simple. Avoid preambles. Use standard hyphens (-) for bullet points.`
    });

    const prompt = `Please summarize this leaf scan:
Plant Species: ${plantName}
Pathology/Disease Spotted: ${disease}
AI Confidence: ${confidence}%
Health Level: ${healthStatus}`;

    const result = await model.generateContent(prompt);
    const summary = await result.response.text();

    return NextResponse.json({ summary });
  } catch (error: any) {
    console.error('Scan summary generation error:', error);
    return NextResponse.json({ summary: "- Observation: Scan diagnostic loaded successfully.\n- Immediate Action: Review the treatment protocol listed below.\n- Prevention: Monitor surrounding leaves closely for spread." }, { status: 200 });
  }
}
