import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { learnClasses } from '@/lib/db/schema';
import { desc } from 'drizzle-orm';

// GET all classes
export async function GET() {
    try {
        const classes = await db.select().from(learnClasses).orderBy(desc(learnClasses.created_at));
        return NextResponse.json(classes);
    } catch (error) {
        console.error('Error fetching learn classes:', error);
        return NextResponse.json({ error: 'Failed to fetch classes' }, { status: 500 });
    }
}

// POST new class (Limited to support agents in production, but open for initial setup)
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { title, description, youtube_url, category } = body;

        if (!title || !description || !youtube_url) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const [newClass] = await db.insert(learnClasses).values({
            title,
            description,
            youtube_url,
            category: category || 'Beginner',
        }).returning();

        return NextResponse.json(newClass);
    } catch (error) {
        console.error('Error creating learn class:', error);
        return NextResponse.json({ error: 'Failed to create class' }, { status: 500 });
    }
}
