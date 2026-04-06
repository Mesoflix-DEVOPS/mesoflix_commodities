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
                    parts: `You are the Mesoflix Institutional Onboarding Engine. Your goal is to onboard new users through a conversational interface instead of a form.

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
Institutional, elite, and high-end. Use terms like "Liquidity", "Brokerage Integration", "Latency", and "Security Protocols".`,
                },
                {
                    role: "model",
                    parts: "Institutional Onboarding Engine Initialized. I am ready to guide the client through the Mesoflix terminal integration protocols. I will monitor for identity verification and credential collection triggers.",
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
