import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();

    const systemInstruction = `You are FarmGuard AI's Master Agronomist and Digital Farming Teacher. 
Your sole mission is to educate farmers, students, and agronomists on agricultural topics. This includes crop selection, soil pH, NPK fertilizers, drip irrigation, pest and disease prevention, hydroponics, livestock management, poultry care, crop rotation, and seasonal planning.

CRITICAL RULE:
You MUST ONLY discuss agricultural and farming topics. If the user asks about ANY unrelated topics (for example: sports, pop music, general coding, Hollywood movies, politics, recipes unrelated to farm crops, or general non-farming conversational prompts), you must politely and strictly decline. For example, you can reply: "I am FarmGuard's dedicated agricultural teacher, so my brain is fully focused on farming. Please let me know if you have any questions about crops, soil, water, or livestock!"

Keep your answers structured, utilizing clear bullet points, bold text for key terms, and short paragraphs. Make your tone warm, highly encouraging, and scientific yet simple. Use relevant emojis to keep lessons engaging.`;

    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash",
      systemInstruction
    });

    // Format history for Gemini API compliance (must start with user)
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
    console.error('Teachings chat backend error:', error);
    return NextResponse.json({ 
      content: "Classroom Notice: I am running some crop diagnostic calculations in my brain. Please ask your farming question again in a second." 
    }, { status: 200 });
  }
}
