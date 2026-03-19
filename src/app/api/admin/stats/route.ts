import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const telegram_id = searchParams.get('telegram_id');
        const admin_id = process.env.ADMIN_TELEGRAM_ID;

        if (!telegram_id || telegram_id !== admin_id) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        // Total users from "users" table
        const { count: totalUsers } = await supabaseAdmin
            .from('users')
            .select('*', { count: 'exact', head: true });

        // Logs in the last 24 hours
        const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const { count: logsLast24h } = await supabaseAdmin
            .from('food_logs')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', last24h);

        // Active users in the last 7 days
        const last7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        const { data: activeUsersData } = await supabaseAdmin
            .from('food_logs')
            .select('telegram_id')
            .gte('created_at', last7d);
        
        const activeUsersCount = new Set(activeUsersData?.map(u => u.telegram_id)).size;

        // Total reminders sent
        const { count: totalReminders } = await supabaseAdmin
            .from('reminders')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'sent');

        return NextResponse.json({
            success: true,
            data: {
                total_users: totalUsers || 0,
                logs_24h: logsLast24h || 0,
                active_7d: activeUsersCount || 0,
                reminders_sent: totalReminders || 0
            }
        });
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
