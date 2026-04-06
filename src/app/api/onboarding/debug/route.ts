import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    try {
        const API_KEY = process.env.GEMINI_API_KEY;

        if (!API_KEY) {
            return NextResponse.json({ error: "No API Key found in Environment Variables." });
        }

        // Discovery call to list all models available to this specific key
        const response = await fetch(`https://generativelanguage.googleapis.com/v1/models?key=${API_KEY}`);
        const data = await response.json();

        return NextResponse.json({
            status: response.status,
            available_models: data.models?.map((m: any) => m.name) || [],
            raw_error: data.error || null,
            message: "Diagnostic tool active. Use this to verify your API Key handshake."
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
