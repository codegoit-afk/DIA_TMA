import { NextResponse } from "next/server";
import axios from "axios";

export async function POST(req: Request) {
  try {
    const { 
      guardian_id, 
      child_name, 
      dose, 
      xe, 
      meal_name, 
      sugar, 
      language = 'ua' 
    } = await req.json();

    if (!guardian_id) {
      return NextResponse.json({ success: false, message: "No guardian_id provided" });
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      return NextResponse.json({ success: false, message: "Bot token missing" }, { status: 500 });
    }

    // Build the message based on language
    let message = "";
    if (language === 'ru') {
      message = `🚨 <b>Опека: Новый лог от ${child_name || 'ребенка'}</b>\n\n` +
                `🍰 ХЕ: <b>${xe}</b>\n` +
                `💉 Доза: <b>${dose} ед.</b>\n` +
                `🩸 Сахар: <b>${sugar || '—'} ммоль/л</b>\n` +
                `🍽 Еда: ${meal_name || '—'}`;
    } else if (language === 'en') {
      message = `🚨 <b>Guard: New log from ${child_name || 'child'}</b>\n\n` +
                `🍰 XE: <b>${xe}</b>\n` +
                `💉 Dose: <b>${dose} U</b>\n` +
                `🩸 Sugar: <b>${sugar || '—'} mmol/L</b>\n` +
                `🍽 Meal: ${meal_name || '—'}`;
    } else {
      // Default UA
      message = `🚨 <b>Опіка: Новий лог від ${child_name || 'дитини'}</b>\n\n` +
                `🍰 ХО: <b>${xe}</b>\n` +
                `💉 Доза: <b>${dose} од.</b>\n` +
                `🩸 Цукор: <b>${sugar || '—'} ммоль/л</b>\n` +
                `🍽 Їжа: ${meal_name || '—'}`;
    }

    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    await axios.post(url, {
      chat_id: guardian_id,
      text: message,
      parse_mode: "HTML"
    });

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error("Guardian notification error:", error);
    // Silent fail for caller, but log it
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
