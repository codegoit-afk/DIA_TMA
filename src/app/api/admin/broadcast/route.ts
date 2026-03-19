import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import axios from 'axios';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { message, button_text, button_url, image_url, telegram_id } = body;
        const admin_id = process.env.ADMIN_TELEGRAM_ID;

        // Verify Admin
        if (!telegram_id || telegram_id.toString() !== admin_id) {
            return NextResponse.json({ success: false, error: 'Доступ запрещен' }, { status: 401 });
        }

        if (!message && !image_url) {
            return NextResponse.json({ success: false, error: 'Необходимо ввести сообщение или ссылку на изображение' }, { status: 400 });
        }

        const botToken = process.env.TELEGRAM_BOT_TOKEN;
        if (!botToken) {
            throw new Error('Токен Telegram не настроен');
        }

        // Fetch all users to broadcast to from the "users" table
        const { data: users, error } = await supabaseAdmin
            .from('users')
            .select('telegram_id');

        if (error) throw error;

        let successCount = 0;
        let failCount = 0;

        const results = await Promise.all(users.map(async (u: any) => {
            try {
                // If image_url is provided, use sendPhoto. Otherwise send message.
                const method = image_url ? 'sendPhoto' : 'sendMessage';
                const payload: any = {
                    chat_id: u.telegram_id,
                    parse_mode: 'HTML'
                };

                if (image_url) {
                    payload.photo = image_url;
                    payload.caption = message; // Use caption for text with photo
                } else {
                    payload.text = message;
                }

                if (button_text && button_url) {
                    payload.reply_markup = {
                        inline_keyboard: [
                            [{ text: button_text, url: button_url }]
                        ]
                    };
                }

                await axios.post(`https://api.telegram.org/bot${botToken}/${method}`, payload);
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
                results: results.slice(0, 5)
            } 
        });

    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
