import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET() {
    try {
        const testId = Math.floor(Math.random() * 1000000) + 1000000;
        const { data, error } = await supabaseAdmin
            .from('profiles')
            .insert([
                { 
                    telegram_id: testId, 
                    first_name: 'Debug Test', 
                    role: 'user',
                    hypo_threshold: 3.9,
                    target_sugar_ideal: 6.0,
                    xe_weight: 12,
                    insulin_dia: 4,
                    coef_matrix: []
                }
            ])
            .select();

        if (error) {
            return NextResponse.json({ 
                success: false, 
                error: error,
                context: "Failed to insert into profiles"
            });
        }

        return NextResponse.json({ 
            success: true, 
            data,
            message: "Insert successful! If you see 0 users in admin, check if your stats query is wrong."
        });
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message });
    }
}
