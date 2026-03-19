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

        const results: any = {
            timestamp: new Date().toISOString(),
        };

        // 1. Check Profiles
        const { count: pCount, error: pError } = await supabaseAdmin
            .from('profiles')
            .select('*', { count: 'exact', head: true });
        
        results.profiles = { count: pCount, error: pError };

        // 2. Check "users" table (the one causing the constraint error)
        const { data: uData, count: uCount, error: uError } = await supabaseAdmin
            .from('users')
            .select('*', { count: 'exact', head: false })
            .limit(5);
        
        results.users_table = { count: uCount, error: uError, sample: uData };

        // 3. Check logs
        const { count: lCount } = await supabaseAdmin
            .from('food_logs')
            .select('*', { count: 'exact', head: true });
        
        results.logs = { count: lCount };

        return NextResponse.json({ success: true, results });

    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message });
    }
}
