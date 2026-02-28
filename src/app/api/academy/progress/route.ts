import { db } from "@/lib/db";
import { userProgress, userNotes } from "@/lib/db/schema";
import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";

// GET progress and notes
export async function GET(req: NextRequest) {
    try {
        const session = await auth();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const userId = session.user.id;
        const { searchParams } = new URL(req.url);
        const classId = searchParams.get("class_id");

        if (!classId) {
            return NextResponse.json({ error: "Missing class_id" }, { status: 400 });
        }

        // Fetch progress
        const [progress] = await db
            .select()
            .from(userProgress)
            .where(
                and(
                    eq(userProgress.user_id, userId),
                    eq(userProgress.class_id, classId)
                )
            );

        // Fetch notes
        const [note] = await db
            .select()
            .from(userNotes)
            .where(
                and(
                    eq(userNotes.user_id, userId),
                    eq(userNotes.class_id, classId)
                )
            );

        return NextResponse.json({
            is_done: progress?.is_done || false,
            notes: note?.content || "",
        });
    } catch (error) {
        console.error("Error fetching progress/notes:", error);
        return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const session = await auth();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const userId = session.user.id;

        const body = await req.json();
        const { class_id, is_done } = body;

        if (!class_id) {
            return NextResponse.json({ error: "Missing class_id" }, { status: 400 });
        }

        // Check if progress already exists
        const [existing] = await db
            .select()
            .from(userProgress)
            .where(
                and(
                    eq(userProgress.user_id, userId),
                    eq(userProgress.class_id, class_id)
                )
            );

        if (existing) {
            await db
                .update(userProgress)
                .set({ is_done, updated_at: new Date() })
                .where(eq(userProgress.id, existing.id));
        } else {
            await db.insert(userProgress).values({
                user_id: userId,
                class_id,
                is_done,
            });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error updating progress:", error);
        return NextResponse.json({ error: "Failed to update progress" }, { status: 500 });
    }
}
