import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

// GET /api/analytics?telegram_id=X&days=7
export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const telegram_id = searchParams.get('telegram_id');
        const days = parseInt(searchParams.get('days') || '7');
        if (!telegram_id) return NextResponse.json({ success: false, error: 'telegram_id required' }, { status: 400 });

        const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

        const { data: logs, error } = await supabaseAdmin
            .from('food_logs')
            .select('current_sugar, total_xe, actual_dose, created_at')
            .eq('telegram_id', parseInt(telegram_id))
            .gte('created_at', since)
            .order('created_at', { ascending: true });

        if (error) throw error;

        if (!logs || logs.length === 0) {
            return NextResponse.json({ success: true, data: { total_logs: 0, avg_sugar: 0, avg_xe: 0, avg_dose: 0, tir_low: 0, tir_target: 0, tir_high: 0, daily_avg: [] } });
        }

        // Aggregate stats
        const total = logs.length;
        const avg_sugar = Math.round((logs.reduce((s, l) => s + (l.current_sugar || 0), 0) / total) * 10) / 10;
        const avg_xe = Math.round((logs.reduce((s, l) => s + (l.total_xe || 0), 0) / total) * 10) / 10;
        const avg_dose = Math.round((logs.reduce((s, l) => s + (l.actual_dose || 0), 0) / total) * 10) / 10;

        // TIR calculation (based on current_sugar at logging time)
        const low = logs.filter(l => l.current_sugar < 3.9).length;
        const high = logs.filter(l => l.current_sugar > 10).length;
        const target = total - low - high;
        const tir_low = Math.round((low / total) * 100);
        const tir_high = Math.round((high / total) * 100);
        const tir_target = 100 - tir_low - tir_high;

        // Daily averages for sparkline
        const byDay: Record<string, { sum: number; count: number }> = {};
        for (const log of logs) {
            const day = log.created_at.substring(0, 10); // YYYY-MM-DD
            if (!byDay[day]) byDay[day] = { sum: 0, count: 0 };
            byDay[day].sum += log.current_sugar || 0;
            byDay[day].count++;
        }
        const daily_avg = Object.entries(byDay)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, { sum, count }]) => ({
                date,
                avg_sugar: Math.round((sum / count) * 10) / 10,
                count
            }));

        return NextResponse.json({
            success: true,
            data: { total_logs: total, avg_sugar, avg_xe, avg_dose, tir_low, tir_target, tir_high, daily_avg }
        });
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
