import { supabase } from "@/lib/supabase";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export const dynamic = 'force-dynamic';

// GET progress and notes
export async function GET(req: NextRequest) {
    try {
        const session = await auth();
        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const userId = session.user.id;
        const { searchParams } = new URL(req.url);
        const classId = searchParams.get("class_id");

        if (!classId) {
            return NextResponse.json({ error: "Missing class_id" }, { status: 400 });
        }

        // Parallel fetch for progress and notes using Supabase
        const [progressRes, noteRes] = await Promise.all([
            supabase.from('user_progress').select('is_done').eq('user_id', userId).eq('class_id', classId).maybeSingle(),
            supabase.from('user_notes').select('content').eq('user_id', userId).eq('class_id', classId).maybeSingle()
        ]);

        return NextResponse.json({
            is_done: progressRes.data?.is_done || false,
            notes: noteRes.data?.content || "",
        });
    } catch (error: any) {
        console.error("Error fetching progress/notes:", error.message || error);
        return NextResponse.json({ 
            error: "Failed to fetch data", 
            details: error.message,
            code: error.code
        }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const session = await auth();
        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const userId = session.user.id;
        const { class_id, is_done } = await req.json();

        if (!class_id) {
            return NextResponse.json({ error: "Missing class_id" }, { status: 400 });
        }

        const { error } = await supabase
            .from('user_progress')
            .upsert({
                user_id: userId,
                class_id: class_id,
                is_done: is_done,
                updated_at: new Date().toISOString()
            }, {
                onConflict: 'user_id,class_id'
            });

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Error updating progress:", error.message || error);
        return NextResponse.json({ 
            error: "Failed to update progress", 
            details: error.message,
            code: error.code
        }, { status: 500 });
    }
}
