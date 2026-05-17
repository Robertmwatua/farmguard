import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: NextRequest) {
  try {
    const { plantName, disease, confidence, healthStatus, recommendation, messages } = await req.json();

    const isOptimal = healthStatus === 'Optimal' || disease.toLowerCase().includes('healthy');

    const systemInstruction = `You are the FarmGuard AI Copilot, a dedicated field agronomist helping a farmer with a specific scanned crop report. 
Here are the crop details you are consulting on:
- Plant Species: ${plantName}
- Identified Condition/Disease: ${disease}
- Health Status: ${healthStatus}
- Diagnosis Confidence: ${confidence}%
- Recommended Protocol: ${recommendation}

${isOptimal 
  ? `Your role is to guide the farmer on maintaining this optimal, healthy condition. Advise on proper watering schedules, organic fertilizer ratios (compost/manure), soil aeration, sunlight exposure, companion planting, and organic pest repellents (like neem oil) for prevention. DO NOT recommend chemical fungicides, quarantine, or intense pest isolation unless they report new symptoms.`
  : `Your role is to guide the farmer step-by-step on how to water, treat, quarantine, or apply fungicide/insecticide for this specific diseased case.`
}
Keep your answers scientific yet highly simple, encouraging, and localized for a farm. 
If the farmer asks about unrelated topics, politely guide them back to caring for this ${plantName} crop. Keep responses short and under 3-4 sentences where possible.`;

    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash",
      systemInstruction
    });

    // Format history compliant with Gemini API (starts with user)
    const rawHistory = messages.slice(0, -1);
    const firstUserIndex = rawHistory.findIndex((m: any) => m.role === 'user');
    const filteredHistory = firstUserIndex !== -1 ? rawHistory.slice(firstUserIndex) : [];

    const chat = model.startChat({
      history: filteredHistory.map((m: any) => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }],
      })),
    });

    const currentMessage = messages[messages.length - 1].content;
    const result = await chat.sendMessage(currentMessage);
    const response = await result.response.text();

    return NextResponse.json({ content: response });
  } catch (error: any) {
    console.error('Scan chat copilot error:', error);
    return NextResponse.json({ content: "Notice: My agronomist brain is running some calculations. Please try sending your message again in a moment." }, { status: 200 });
  }
}
