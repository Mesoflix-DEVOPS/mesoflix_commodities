import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { auth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        const session = await auth();
        if (!session || session.user.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const result = await pool.query('SELECT * FROM campaigns ORDER BY created_at DESC');
        return NextResponse.json({ campaigns: result.rows });
    } catch (error: any) {
        console.error('Failed to fetch campaigns:', error);
        return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const session = await auth();
        if (!session || session.user.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { name, description, landing_page_url, resources, embed_code } = body;

        if (!name || !description) {
            return NextResponse.json({ error: 'Name and description are required' }, { status: 400 });
        }

        const query = `
            INSERT INTO campaigns (name, description, landing_page_url, resources, embed_code)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `;
        const result = await pool.query(query, [
            name, 
            description, 
            landing_page_url || '/register', 
            resources ? JSON.stringify(resources) : null,
            embed_code || null
        ]);

        return NextResponse.json({ campaign: result.rows[0] });
    } catch (error: any) {
        console.error('Failed to create campaign:', error);
        return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
    }
}
