import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const telegram_id = searchParams.get('telegram_id');
        const target_user_id = searchParams.get('target_user_id');
        const admin_id = process.env.ADMIN_TELEGRAM_ID;

        if (!telegram_id || telegram_id !== admin_id) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        if (!target_user_id) {
            return NextResponse.json({ success: false, error: 'target_user_id required' }, { status: 400 });
        }

        // Fetch logs for the specific user
        const { data: logs, error } = await supabaseAdmin
            .from('food_logs')
            .select('*')
            .eq('telegram_id', parseInt(target_user_id))
            .order('created_at', { ascending: false })
            .limit(50);

        if (error) throw error;

        return NextResponse.json({ success: true, data: logs });
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
