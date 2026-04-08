import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { sql } from "drizzle-orm";

export async function GET(req: NextRequest) {
    if (process.env.NODE_ENV === 'production') {
        return NextResponse.json({ error: 'Debugging disabled in production' }, { status: 403 });
    }
    try {
        const API_KEY = process.env.GEMINI_API_KEY;
        const result: any = {
            build_version: "2.1.0-STABILIZED",
            build_timestamp: new Date().toISOString(),
            ai_handshake: "PENDING",
            database_connection: "PENDING",
            available_models: [],
            environment: process.env.NODE_ENV
        };

        if (!API_KEY) {
            result.ai_handshake = "FAILED: Missing API Key";
        } else {
            // AI Handshake Check
            const aiResponse = await fetch(`https://generativelanguage.googleapis.com/v1/models?key=${API_KEY}`);
            const aiData = await aiResponse.json();
            if (aiResponse.ok) {
                result.ai_handshake = "SUCCESS";
                result.available_models = aiData.models?.map((m: any) => m.name) || [];
            } else {
                result.ai_handshake = `FAILED: ${JSON.stringify(aiData.error || aiData)}`;
            }
        }

        // Institutional Self-Healing Verification
        const rawUrl = process.env.DATABASE_URL || "";
        let patchedUrl = rawUrl;
        
        // Match the same logic as our DB driver
        if (patchedUrl.includes('supabase.co:5432')) {
            patchedUrl = patchedUrl.replace(':5432', ':6543');
        }

        const redact = (url: string) => url.replace(/\/\/[^:]+:[^@]+@/, "//****:****@")
                                          .replace(/:[0-9]+\//, (match) => `:${match.substring(1, match.length-1)} (PORT)/`);

        try {
            const dbCheck = await db.execute(sql`SELECT 1`);
            result.database_connection = "SUCCESS (Supabase is Online)";
        } catch (dbErr: any) {
            result.database_connection = `FAILED: ${dbErr.message}`;
            result.db_diagnostics = {
                raw_endpoint: redact(rawUrl),
                patched_endpoint: redact(patchedUrl),
                error_summary: dbErr.message,
                hint: "Your port MUST be 6543 for Vercel production."
            };
        }

        return NextResponse.json({
            ...result,
            message: "System Health Audit Complete. Share these results with Antigravity to finalize stabilization."
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
