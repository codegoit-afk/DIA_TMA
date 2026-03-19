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
            env: {
                has_url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
                has_service_key: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
                admin_id_match: telegram_id === admin_id
            }
        };

        // 1. Check Profiles Table
        const { data: profiles, error: pError, count: pCount } = await supabaseAdmin
            .from('profiles')
            .select('*', { count: 'exact', head: false })
            .limit(5);
        
        results.profiles = {
            count: pCount,
            error: pError,
            sample: profiles,
            is_empty: !profiles || profiles.length === 0
        };

        // 2. Check Logs Table (to verify connection is working)
        const { count: lCount, error: lError } = await supabaseAdmin
            .from('food_logs')
            .select('*', { count: 'exact', head: true });
        
        results.logs = {
            count: lCount,
            error: lError
        };

        // 3. Try a "Bare Minimum" Insert
        const testId = Math.floor(Math.random() * 10000) + 99999;
        const { data: tData, error: tError } = await supabaseAdmin
            .from('profiles')
            .insert({ 
                telegram_id: testId,
                role: 'user',
                hypo_threshold: 4,
                target_sugar_ideal: 6,
                xe_weight: 12,
                insulin_dia: 4,
                coef_matrix: []
            })
            .select();
        
        results.test_insert = {
            data: tData,
            error: tError
        };

        return NextResponse.json({ success: true, results });

    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message, stack: e.stack });
    }
}
