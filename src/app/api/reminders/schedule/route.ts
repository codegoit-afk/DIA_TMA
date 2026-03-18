import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { telegram_id, message, hours_delay = 2, type = 'high_fat_split' } = body;

        if (!telegram_id || !message) {
            return NextResponse.json({ success: false, error: 'Missing telegram_id or message' }, { status: 400 });
        }

        // Calculate time
        const scheduledTime = new Date();
        scheduledTime.setHours(scheduledTime.getHours() + hours_delay);

        const { data, error } = await supabaseAdmin
            .from('reminders')
            .insert([
                {
                    telegram_id,
                    message,
                    scheduled_for: scheduledTime.toISOString(),
                    type,
                    status: 'pending'
                }
            ])
            .select('*')
            .single();

        if (error) {
            console.error("Supabase API error (reminders):", error);
            return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, data });

    } catch (error: any) {
        console.error("API Error block:", error);
        return NextResponse.json({ success: false, error: error.message || 'Internal error' }, { status: 500 });
    }
}
