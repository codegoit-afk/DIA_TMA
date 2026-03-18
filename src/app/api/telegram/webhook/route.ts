import { NextResponse } from 'next/server';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://diabet-tma.vercel.app';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const message = body?.message;

        if (!message) return NextResponse.json({ ok: true });

        const chatId = message.chat?.id;
        const text = message.text;

        if (text === '/start') {
            await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: chatId,
                    text: '👋 Добро пожаловать в Диабет-Калькулятор!\n\nОткрой приложение, чтобы рассчитать дозу инсулина, посмотреть аналитику и вести журнал питания.',
                    reply_markup: {
                        inline_keyboard: [[
                            {
                                text: '🩸 Открыть приложение',
                                web_app: { url: APP_URL }
                            }
                        ]]
                    }
                })
            });
        }

        return NextResponse.json({ ok: true });
    } catch (e: any) {
        console.error('Webhook error:', e);
        return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
    }
}
