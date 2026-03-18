import { NextResponse } from 'next/server';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const telegram_id = searchParams.get('telegram_id');
        const admin_id = process.env.ADMIN_TELEGRAM_ID;

        const isAdmin = telegram_id && admin_id && telegram_id === admin_id;

        return NextResponse.json({ success: true, isAdmin });
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
