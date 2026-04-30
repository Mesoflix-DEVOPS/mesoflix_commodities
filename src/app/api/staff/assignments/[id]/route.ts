import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { auth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const session = await auth();
        if (!session || session.user.role !== 'user' && session.user.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { custom_alias } = body;

        if (!custom_alias) {
            return NextResponse.json({ error: 'Alias is required' }, { status: 400 });
        }

        // Sanitize alias (lowercase, alphanumeric and dashes only)
        const sanitizedAlias = custom_alias.toLowerCase().replace(/[^a-z0-9-]/g, '');

        if (sanitizedAlias.length < 3) {
            return NextResponse.json({ error: 'Alias too short' }, { status: 400 });
        }

        // Check if alias is already taken
        const checkQuery = 'SELECT id FROM campaign_assignments WHERE custom_alias = $1 AND id != $2';
        const checkRes = await pool.query(checkQuery, [sanitizedAlias, params.id]);
        if (checkRes.rows.length > 0) {
            return NextResponse.json({ error: 'This alias is already claimed' }, { status: 409 });
        }

        // Update the assignment
        const updateQuery = `
            UPDATE campaign_assignments 
            SET custom_alias = $1, updated_at = NOW() 
            WHERE id = $2 AND staff_id = $3
            RETURNING *
        `;
        const result = await pool.query(updateQuery, [sanitizedAlias, params.id, session.user.id]);

        if (result.rows.length === 0) {
            return NextResponse.json({ error: 'Assignment not found or unauthorized' }, { status: 404 });
        }

        return NextResponse.json({ assignment: result.rows[0] });
    } catch (error: any) {
        console.error('Failed to update vanity alias:', error);
        return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
    }
}
