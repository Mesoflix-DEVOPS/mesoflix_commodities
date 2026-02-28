import { db } from "@/lib/db";
import { supportAgents, learnClasses } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    console.log('🔄 Running temporary database setup...');

    try {
        // 1. Deactivate 2FA for john@gmail.com
        const [agent] = await db.select().from(supportAgents).where(eq(supportAgents.email, 'john@gmail.com'));

        let status2fa = "Not found";
        if (agent) {
            await db.update(supportAgents)
                .set({ two_factor_enabled: false })
                .where(eq(supportAgents.email, 'john@gmail.com'));
            status2fa = "Deactivated";
        }

        // 2. Add first class directly to database
        const classes = await db.select().from(learnClasses);
        let lessonStatus = "Already exists";
        if (classes.length === 0) {
            await db.insert(learnClasses).values({
                title: "Introduction to Financial Markets",
                description: "Master the basics of trading from scratch. This comprehensive guide covers market mechanics, types of assets, and how to start your journey.",
                youtube_url: "https://www.youtube.com/embed/yM6s8acNla4",
                category: "Beginner",
            });
            lessonStatus = "Seeded";
        }

        return NextResponse.json({
            success: true,
            status2fa,
            lessonStatus
        });

    } catch (error: any) {
        console.error('❌ Database update failed:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
