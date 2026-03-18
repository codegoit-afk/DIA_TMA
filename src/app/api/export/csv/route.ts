import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

// GET /api/export/csv?telegram_id=X&days=30
export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const telegram_id = searchParams.get('telegram_id');
        const days = parseInt(searchParams.get('days') || '30');
        if (!telegram_id) return NextResponse.json({ success: false, error: 'telegram_id required' }, { status: 400 });

        const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

        const { data: logs, error } = await supabaseAdmin
            .from('food_logs')
            .select('created_at, current_sugar, total_xe, xe_corrected, actual_dose, recommended_dose')
            .eq('telegram_id', parseInt(telegram_id))
            .gte('created_at', since)
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Build CSV
        const header = 'Дата и время,Сахар (ммоль/л),ХЕ,ХЕ (скорректир.),Доза (факт.),Доза (рекомендов.)\n';
        const rows = (logs || []).map(l => {
            const dt = new Date(l.created_at);
            const dateStr = dt.toLocaleDateString('ru-RU') + ' ' + dt.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
            return `${dateStr},${l.current_sugar},${l.total_xe},${l.xe_corrected ?? ''},${l.actual_dose},${l.recommended_dose}`;
        }).join('\n');

        const csv = '\uFEFF' + header + rows; // BOM for Excel UTF-8 compatibility

        const today = new Date().toISOString().substring(0, 10);
        return new NextResponse(csv, {
            status: 200,
            headers: {
                'Content-Type': 'text/csv; charset=utf-8',
                'Content-Disposition': `attachment; filename="diabet-log-${today}.csv"`,
            }
        });
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
