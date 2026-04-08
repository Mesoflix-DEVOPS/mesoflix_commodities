import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        const session = await auth();
        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const userId = session.user.id;
        const { class_id, content } = await req.json();

        if (!class_id || content === undefined) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // Upsert logic via Supabase
        const { error } = await supabase
            .from('user_notes')
            .upsert({
                user_id: userId,
                class_id: class_id,
                content: content,
                updated_at: new Date().toISOString()
            }, {
                onConflict: 'user_id,class_id'
            });

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Error saving notes:", error.message || error);
        return NextResponse.json({ 
            error: "Failed to save notes", 
            details: error.message,
            code: error.code 
        }, { status: 500 });
    }
}
