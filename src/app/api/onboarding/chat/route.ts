import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(req: NextRequest) {
    try {
        const { message, history } = await req.json();

        if (!process.env.GEMINI_API_KEY) {
            return NextResponse.json({
                message: "Institutional AI is currently in offline mode. Please wait for an agent or check back shortly."
            });
        }

        const model = genAI.getGenerativeModel({ model: "gemini-pro" });

        const chat = model.startChat({
            history: [
                {
                    role: "user",
                    parts: `You are the Mesoflix Institutional Onboarding Assistant. Your goal is to keep users engaged while they wait for a human agent. 

Instructions for you:
1. Professional Tone: Use institutional trading terminology (liquidity, slippage, margin, spread).
2. API Guidance: If users ask about API keys, explain:
   - They are found in Capital.com Settings > API Integration.
   - For MOBILE users: They must use "Desktop Mode" in their browser or check the "Security/API" tab in the bottom menu of the app.
   - Explain that they need the API Key AND the API Password (not their login password).
3. Trading Knowledge: If asked about markets, focus on Gold (XAUUSD), Crude Oil (BRENT/WTI), and BTCUSD.
4. Goal: Ensure they feel supported and professional. Keep responses concise and high-end.`,
                },
                {
                    role: "model",
                    parts: "Acknowledged. I am active as the Mesoflix Terminal Onboarding AI. I have synchronized my data feeds with Capital.com's integration protocols and commodity market fundamentals. I will guide users through the institutional linkage process with professional precision.",
                },
                ...history
            ],
        });

        const result = await chat.sendMessage(message);
        const response = await result.response;
        const text = response.text();

        return NextResponse.json({ message: text });
    } catch (error: any) {
        console.error("Gemini Chat Error:", error);
        return NextResponse.json({ error: "Failed to connect to AI engine" }, { status: 500 });
    }
}
