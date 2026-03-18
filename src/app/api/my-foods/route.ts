import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

// GET /api/my-foods?telegram_id=X
export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const telegram_id = searchParams.get('telegram_id');
        if (!telegram_id) return NextResponse.json({ success: false, error: 'telegram_id required' }, { status: 400 });

        const { data, error } = await supabaseAdmin
            .from('my_foods')
            .select('*')
            .eq('telegram_id', parseInt(telegram_id))
            .order('created_at', { ascending: false });

        if (error) throw error;
        return NextResponse.json({ success: true, data });
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}

// POST /api/my-foods — create
export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { telegram_id, name, xe, description } = body;

        if (!telegram_id || !name || xe == null) {
            return NextResponse.json({ success: false, error: 'telegram_id, name, xe required' }, { status: 400 });
        }

        const { data, error } = await supabaseAdmin
            .from('my_foods')
            .insert({ telegram_id, name, xe, description: description || null })
            .select()
            .single();

        if (error) throw error;
        return NextResponse.json({ success: true, data });
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}

// DELETE /api/my-foods?id=X
export async function DELETE(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');
        if (!id) return NextResponse.json({ success: false, error: 'id required' }, { status: 400 });

        const { error } = await supabaseAdmin
            .from('my_foods')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return NextResponse.json({ success: true });
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
