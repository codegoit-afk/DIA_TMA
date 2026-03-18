import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(req: Request) {
  try {
    const { 
        telegram_id, 
        current_sugar, 
        photo_url, 
        ai_raw_response, 
        total_xe, 
        recommended_dose, 
        actual_dose 
    } = await req.json();

    if (!telegram_id || current_sugar === undefined || total_xe === undefined || actual_dose === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('food_logs')
      .insert([
        { 
          telegram_id, 
          current_sugar, 
          photo_url, 
          ai_raw_response, 
          total_xe, 
          recommended_dose, 
          actual_dose 
        }
      ])
      .select()
      .single();

    if (error) {
      console.error("Log insert error:", error);
      return NextResponse.json({ error: "Ошибка при сохранении истории" }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });

  } catch (error: any) {
    console.error("Log Error:", error.message);
    return NextResponse.json({ error: "Непредвиденная ошибка" }, { status: 500 });
  }
}

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const telegram_id = searchParams.get('telegram_id');

        if (!telegram_id) {
            return NextResponse.json({ error: "Missing telegram_id" }, { status: 400 });
        }

        const { data, error } = await supabaseAdmin
            .from('food_logs')
            .select('*')
            .eq('telegram_id', telegram_id)
            .order('created_at', { ascending: false })
            .limit(50);

        if (error) {
            console.error("Logs fetch error:", error);
            return NextResponse.json({ error: "Ошибка при загрузке логов" }, { status: 500 });
        }

        return NextResponse.json({ success: true, data });

    } catch (error: any) {
        console.error("Log Fetch Error:", error.message);
        return NextResponse.json({ error: "Непредвиденная ошибка" }, { status: 500 });
    }
}
