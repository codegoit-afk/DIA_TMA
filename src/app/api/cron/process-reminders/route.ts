import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import axios from 'axios';

// Ensure this route is dynamic so Vercel doesn't prerender it
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    // Vercel Cron sends an authorization header that we can optionally check 
    // for secure invocation: req.headers.get('Authorization') === `Bearer ${process.env.CRON_SECRET}`
    
    try {
        const botToken = process.env.TELEGRAM_BOT_TOKEN;
        if (!botToken) {
            console.error('TELEGRAM_BOT_TOKEN is missing in environment variables.');
            return NextResponse.json({ success: false, error: 'Misconfigured bot token' }, { status: 500 });
        }

        // 1. Fetch pending reminders where scheduled_for is in the past
        const now = new Date().toISOString();
        const { data: pendingReminders, error: fetchError } = await supabaseAdmin
            .from('reminders')
            .select('*')
            .eq('status', 'pending')
            .lte('scheduled_for', now);

        if (fetchError) {
            console.error('Error fetching pending reminders:', fetchError);
            return NextResponse.json({ success: false, error: fetchError.message }, { status: 500 });
        }

        if (!pendingReminders || pendingReminders.length === 0) {
            return NextResponse.json({ success: true, message: 'No pending reminders to process at this time.' });
        }

        console.log(`Processing ${pendingReminders.length} reminder(s)...`);

        const results = [];

        // 2. Iterate and send via Telegram API
        for (const reminder of pendingReminders) {
            try {
                // Send message using Telegram Bot API
                const tgRes = await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                    chat_id: reminder.telegram_id,
                    text: reminder.message,
                    parse_mode: 'HTML'
                });

                if (tgRes.data.ok) {
                    // Update to sent
                    await supabaseAdmin
                        .from('reminders')
                        .update({ status: 'sent' })
                        .eq('id', reminder.id);
                        
                    results.push({ id: reminder.id, status: 'sent' });
                } else {
                    throw new Error(`Telegram API Error: ${tgRes.data.description}`);
                }

            } catch (err: any) {
                console.error(`Failed to send reminder ${reminder.id}:`, err?.response?.data || err.message);
                
                // Update to failed
                await supabaseAdmin
                    .from('reminders')
                    .update({ status: 'failed' })
                    .eq('id', reminder.id);
                    
                results.push({ id: reminder.id, status: 'failed', error: err.message });
            }
        }

        return NextResponse.json({ success: true, processed: results });

    } catch (error: any) {
        console.error('Cron process error:', error);
        return NextResponse.json({ success: false, error: error.message || 'Internal cron error' }, { status: 500 });
    }
}
