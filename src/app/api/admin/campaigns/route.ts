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

export async function PATCH(req: NextRequest) {
    try {
        const session = await auth();
        if (!session || session.user.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { id, name, description, landing_page_url, resources, embed_code } = body;

        if (!id) {
            return NextResponse.json({ error: 'Campaign ID is required' }, { status: 400 });
        }

        const query = `
            UPDATE campaigns 
            SET name = COALESCE($1, name), 
                description = COALESCE($2, description), 
                landing_page_url = COALESCE($3, landing_page_url), 
                resources = COALESCE($4, resources), 
                embed_code = COALESCE($5, embed_code),
                updated_at = NOW()
            WHERE id = $6
            RETURNING *
        `;
        const result = await pool.query(query, [
            name, 
            description, 
            landing_page_url, 
            resources ? JSON.stringify(resources) : null,
            embed_code,
            id
        ]);

        if (result.rows.length === 0) {
            return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
        }

        return NextResponse.json({ campaign: result.rows[0] });
    } catch (error: any) {
        console.error('Failed to update campaign:', error);
        return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
    }
}
