import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(req: NextRequest) {
    try {
        const { message, history } = await req.json();
        const API_KEY = process.env.GEMINI_API_KEY;

        if (!API_KEY) {
            return NextResponse.json({
                message: "Institutional AI is currently in offline mode. Please wait for an agent or check back shortly."
            });
        }

        if (!message || typeof message !== 'string') {
            return NextResponse.json({ error: "Invalid message payload" }, { status: 400 });
        }

        // Standardize history into Gemini REST format
        const contents = (history || []).map((item: any) => ({
            role: item.role === 'user' ? 'user' : 'model',
            parts: Array.isArray(item.parts) 
                ? item.parts.map((p: any) => typeof p === 'string' ? { text: p } : p)
                : [{ text: String(item.parts || '') }]
        }));

        // Add the system prompt and the current message to the payload
        const systemPrompt = {
            role: "user",
            parts: [{ text: `You are the Mesoflix Institutional Onboarding Engine. Your goal is to onboard new users through a conversational interface instead of a form.

**PROTOCOL OVERVIEW:**
1. **Capital Check**: Ask if they have a Capital.com account. If NO, share the link: https://go.capital.com/visit/?bta=44529&brand=capital. Tell them to return when done.
2. **Identity**: Collect Full Name and Email. 
   - **MANDATORY**: After getting the email, you MUST output a JSON action to check if the user exists: \`ACTION: CHECK_USER(email)\`.
3. **API Setup**: Provide instructions for creating an API Key and API Password in Capital.com Settings > API Integration.
   - For mobile: Advise "Desktop Mode" or the bottom "Security" tab.
4. **Credential Collection**: Collect the API Key and API Password.
5. **Finalization**: Once you have Email, Name, API Key, and API Password, output the final action: \`ACTION: COMPLETE_REGISTRATION(email, name, apiKey, apiPassword)\`.

**SUPPORT PROTOCOL:**
- If the user says "I am stuck", "I can't find it", or shows frustration, output: \`ACTION: CREATE_SUPPORT_TICKET()\`.

**TONE:** 
Institutional, elite, and high-end. Use terms like "Liquidity", "Brokerage Integration", "Latency", and "Security Protocols".` }]
        };

        const acknowledgePrompt = {
            role: "model",
            parts: [{ text: "Institutional Onboarding Engine Initialized. I am ready to guide the client through the Mesoflix terminal integration protocols. I will monitor for identity verification and credential collection triggers." }]
        };

        const currentMessage = {
            role: "user",
            parts: [{ text: message }]
        };

        // Complete prompt chain for the stateless REST API
        const payload = {
            contents: [systemPrompt, acknowledgePrompt, ...contents, currentMessage],
            generationConfig: {
                temperature: 0.7,
                topK: 1,
                topP: 1,
                maxOutputTokens: 2048,
            }
        };

        // Direct high-performance REST call (Bypasses SDK issues on Vercel)
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (!response.ok) {
            const errorStatus = response.status;
            const errorText = JSON.stringify(data.error || data);
            throw new Error(`[${errorStatus}] Google API Reject: ${errorText}`);
        }

        const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || "Protocol Timeout. Re-connecting...";
        return NextResponse.json({ message: aiResponse });

    } catch (error: any) {
        console.error("Gemini Direct Error:", error);
        return NextResponse.json({ 
            error: `AI Link Failed: ${error.message.substring(0, 150)}`,
            hint: "Check if your GEMINI_API_KEY is active and verify your Google AI Studio quota."
        }, { status: 500 });
    }
}
