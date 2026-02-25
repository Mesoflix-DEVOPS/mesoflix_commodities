import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { desc } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const allUsers = await db.select({
            id: users.id,
            email: users.email,
            full_name: users.full_name,
            role: users.role,
            created_at: users.created_at,
            last_login_at: users.last_login_at,
            email_verified: users.email_verified,
            two_factor_enabled: users.two_factor_enabled,
        })
            .from(users)
            .orderBy(desc(users.created_at));

        return NextResponse.json({ success: true, users: allUsers });
    } catch (error) {
        console.error("Failed to fetch users for agent dashboard:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}
