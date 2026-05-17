import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();

    try {
      const model = genAI.getGenerativeModel({ 
        model: "gemini-2.5-flash",
        systemInstruction: "You are the FarmGuard AI Assistant, an expert agronomist and plant pathologist. Your role is to help farmers diagnose crop issues, suggest sustainable treatments, and provide farming advice. You must only discuss agriculture, plants, soil health, and farming-related topics. If asked about unrelated topics, politely redirect the conversation back to farming. Keep your tone professional, helpful, and scientific yet accessible."
      });

      // Ensure history starts with a 'user' message for Gemini API compliance
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
    } catch (chatError) {
      console.error("Chat backend connection dropped:", chatError);
      return NextResponse.json({ content: "System Notice: I am experiencing a temporary connection drop to my global brain. Please try messaging me again in a moment." }, { status: 200 });
    }

  } catch (error: any) {
    console.error('Chat error:', error);
    return NextResponse.json({ content: "System Notice: I am experiencing a temporary connection drop to my global brain. Please try messaging me again in a moment." }, { status: 200 });
  }
}
