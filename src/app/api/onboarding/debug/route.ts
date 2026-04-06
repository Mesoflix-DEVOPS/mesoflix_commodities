import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { sql } from "drizzle-orm";

export async function GET(req: NextRequest) {
    try {
        const API_KEY = process.env.GEMINI_API_KEY;
        const result: any = {
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

        // Database Health Check
        const redactedUrl = (process.env.DATABASE_URL || "")
            .replace(/:([^@]+)@/, ":****@") // Hide password
            .replace(/\/\/([^:]+):/, "//****:"); // Hide user

        try {
            const dbCheck = await db.execute(sql`SELECT 1`);
            result.database_connection = "SUCCESS (Supabase is Online)";
        } catch (dbErr: any) {
            result.database_connection = `FAILED: ${dbErr.message}`;
            result.db_diagnostics = {
                redacted_url: redactedUrl,
                error_stack: dbErr.stack?.substring(0, 200),
                hint: "Ensure port is 6543 and sslmode=require is appended."
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
