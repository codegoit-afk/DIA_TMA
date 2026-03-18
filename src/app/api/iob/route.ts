import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

// GET /api/iob?telegram_id=X
// Calculates the current Insulin On Board (IOB) using exponential decay
export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const telegram_id = searchParams.get('telegram_id');
        if (!telegram_id) return NextResponse.json({ success: false, error: 'telegram_id required' }, { status: 400 });

        const tid = parseInt(telegram_id);

        // 1. Get user's DIA setting (defaults to 4h)
        const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('insulin_dia')
            .eq('telegram_id', tid)
            .single();
        
        const dia = profile?.insulin_dia || 4.0; // hours

        // 2. Fetch bolus logs from the last DIA hours
        const sinceTime = new Date(Date.now() - dia * 60 * 60 * 1000).toISOString();

        const { data: logs } = await supabaseAdmin
            .from('food_logs')
            .select('actual_dose, created_at')
            .eq('telegram_id', tid)
            .gte('created_at', sinceTime)
            .order('created_at', { ascending: false });

        if (!logs || logs.length === 0) {
            return NextResponse.json({ success: true, iob: 0, dia });
        }

        // 3. Calculate IOB using exponential decay: IOB(t) = dose * e^(-t/halflife)
        // We use a simplified linear decay where at t=0 -> 100% active, at t=DIA -> 0% active
        const now = Date.now();
        let totalIob = 0;

        for (const log of logs) {
            const hoursAgo = (now - new Date(log.created_at).getTime()) / (1000 * 60 * 60);
            if (hoursAgo >= dia) continue;
            
            // Linear decay factor: 1 at injection, 0 at DIA
            const decayFactor = Math.max(0, 1 - (hoursAgo / dia));
            totalIob += (log.actual_dose || 0) * decayFactor;
        }

        // Round to 1 decimal
        totalIob = Math.round(totalIob * 10) / 10;

        return NextResponse.json({ success: true, iob: totalIob, dia });
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
