import { db } from "@/lib/db";
import { userNotes } from "@/lib/db/schema";
import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";

export async function POST(req: NextRequest) {
    try {
        const session = await auth();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const userId = session.user.id;
        const body = await req.json();
        const { class_id, content } = body;

        if (!class_id || content === undefined) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // Check if note already exists
        const [existing] = await db
            .select()
            .from(userNotes)
            .where(
                and(
                    eq(userNotes.user_id, userId),
                    eq(userNotes.class_id, class_id)
                )
            );

        if (existing) {
            await db
                .update(userNotes)
                .set({ content, updated_at: new Date() })
                .where(eq(userNotes.id, existing.id));
        } else {
            await db.insert(userNotes).values({
                user_id: userId,
                class_id,
                content,
            });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error saving notes:", error);
        return NextResponse.json({ error: "Failed to save notes" }, { status: 500 });
    }
}
