import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (!email) {
        return NextResponse.json({ message: 'Email is required' }, { status: 400 });
    }

    try {
        const existingUsers = await db.select({ id: users.id }).from(users).where(eq(users.email, email.toLowerCase())).limit(1);
        
        return NextResponse.json({ 
            exists: existingUsers.length > 0,
            message: existingUsers.length > 0 ? 'User already exists' : 'User available'
        });
    } catch (error: any) {
        console.error('[Check User API] Error:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
