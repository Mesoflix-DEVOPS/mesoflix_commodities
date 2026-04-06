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
                    parts: "You are the Mesoflix Institutional Onboarding Assistant. Your goal is to keep users engaged while they wait for a human agent. You should be professional, use institutional trading terminology, and answer questions about commodity trading and Capital.com API key registration. Keep responses concise and high-end.",
                },
                {
                    role: "model",
                    parts: "Understood. I am now active as the Mesoflix Terminal Onboarding AI. I will maintain a premium level of engagement and provide technical clarity on brokerage integration and market fundamentals.",
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
