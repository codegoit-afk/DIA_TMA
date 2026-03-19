import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

// GET /api/logs/all?telegram_id=X&days=7
export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const telegram_id = searchParams.get('telegram_id');
        const days = parseInt(searchParams.get('days') || '7');

        if (!telegram_id) {
            return NextResponse.json({ success: false, error: 'telegram_id required' }, { status: 400 });
        }

        const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

        const { data: logs, error } = await supabaseAdmin
            .from('food_logs')
            .select(`
                id,
                created_at,
                current_sugar,
                total_xe,
                actual_dose,
                ai_raw_response
            `)
            .eq('telegram_id', parseInt(telegram_id))
            .gte('created_at', since)
            .order('created_at', { ascending: false });

        if (error) throw error;

        return NextResponse.json({ success: true, logs });
    } catch (e: any) {
        console.error("Logs All API Error:", e.message);
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
