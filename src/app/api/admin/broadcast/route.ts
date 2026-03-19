import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import axios from 'axios';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { message, button_text, button_url, telegram_id } = body;
        const admin_id = process.env.ADMIN_TELEGRAM_ID;

        // Verify Admin
        if (!telegram_id || telegram_id.toString() !== admin_id) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        if (!message) {
            return NextResponse.json({ success: false, error: 'Message is required' }, { status: 400 });
        }

        const botToken = process.env.TELEGRAM_BOT_TOKEN;
        if (!botToken) {
            throw new Error('Telegram Bot Token not configured');
        }

        // Fetch all users to broadcast to
        const { data: users, error } = await supabaseAdmin
            .from('profiles')
            .select('telegram_id');

        if (error) throw error;

        let successCount = 0;
        let failCount = 0;

        // Sequential sending to avoid rate limiting for now
        // For larger user bases, this should be a background job
        const results = await Promise.all(users.map(async (u: any) => {
            try {
                const payload: any = {
                    chat_id: u.telegram_id,
                    text: message,
                    parse_mode: 'HTML'
                };

                if (button_text && button_url) {
                    payload.reply_markup = {
                        inline_keyboard: [
                            [{ text: button_text, url: button_url }]
                        ]
                    };
                }

                await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, payload);
                successCount++;
                return { id: u.telegram_id, status: 'success' };
            } catch (err: any) {
                console.error(`Failed to send to ${u.telegram_id}:`, err.response?.data || err.message);
                failCount++;
                return { id: u.telegram_id, status: 'fail', error: err.message };
            }
        }));

        return NextResponse.json({ 
            success: true, 
            data: { 
                total: users.length, 
                success: successCount, 
                failed: failCount,
                results: results.slice(0, 10) // Return first 10 for debugging
            } 
        });

    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
