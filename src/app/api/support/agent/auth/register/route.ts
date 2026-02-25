import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { supportAgents } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { fullName, email, password } = body;

        if (!fullName || !email || !password) {
            return NextResponse.json({ error: "All fields are required" }, { status: 400 });
        }

        if (password.length < 8) {
            return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
        }

        // Check if email already exists
        const existing = await db.select().from(supportAgents).where(eq(supportAgents.email, email)).limit(1);
        if (existing.length > 0) {
            return NextResponse.json({ error: "An agent with this email already exists" }, { status: 409 });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);

        // In a real corporate environment, 'role' might default to a pending state until a supervisor approves them.
        // For this demo, we'll auto-approve them as 'agent'
        await db.insert(supportAgents).values({
            email,
            password_hash,
            full_name: fullName,
            role: 'agent',
            is_active: true
        });

        return NextResponse.json({ success: true }, { status: 201 });

    } catch (error) {
        console.error("Agent registration error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
