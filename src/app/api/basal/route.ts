import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

// GET /api/basal?telegram_id=X — list last 7 days
export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const telegram_id = searchParams.get('telegram_id');
        if (!telegram_id) return NextResponse.json({ success: false, error: 'telegram_id required' }, { status: 400 });

        const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        const { data, error } = await supabaseAdmin
            .from('basal_logs')
            .select('*')
            .eq('telegram_id', parseInt(telegram_id))
            .gte('injected_at', since)
            .order('injected_at', { ascending: false });

        if (error) throw error;
        return NextResponse.json({ success: true, data });
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}

// POST /api/basal — log a new basal injection
export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { telegram_id, dose, insulin_name, injected_at } = body;

        if (!telegram_id || !dose) {
            return NextResponse.json({ success: false, error: 'telegram_id and dose required' }, { status: 400 });
        }

        const { data, error } = await supabaseAdmin
            .from('basal_logs')
            .insert({
                telegram_id,
                dose,
                insulin_name: insulin_name || 'Lantus',
                injected_at: injected_at || new Date().toISOString()
            })
            .select()
            .single();

        if (error) throw error;
        return NextResponse.json({ success: true, data });
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
