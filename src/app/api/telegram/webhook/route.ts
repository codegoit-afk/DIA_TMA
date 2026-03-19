import { NextResponse } from 'next/server';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://dia-tma.vercel.app';

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
                    text: 'Забудьте про ручний підрахунок вуглеводів. DIA AI використовує передові алгоритми машинного зору, щоб миттєво розпізнавати їжу на тарілці та з високою точністю розраховувати хлібні одиниці (ХО) і дозу інсуліну.\n\n■ Розумне розпізнавання страв за фотографією\n■ Індивідуальна матриця коефіцієнтів\n■ Деталізована історія та статистика\n\nВаш особистий health-tech асистент, створений для комфорту та безпеки.\n\nРозроблено студією Code&Go.',
                    reply_markup: {
                        inline_keyboard: [[
                            {
                                text: '🩸 Відкрити додаток',
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
