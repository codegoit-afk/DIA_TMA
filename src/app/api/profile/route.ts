import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const telegram_id = searchParams.get('telegram_id');

    if (!telegram_id) {
      return NextResponse.json({ error: "Missing telegram_id" }, { status: 400 });
    }

    // Attempt to get profile
    let { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('telegram_id', telegram_id)
      .single();

    if (error && error.code === 'PGRST116') {
      // Profile zero-state doesn't exist, we should create a basic one
      return NextResponse.json({ 
        success: true, 
        message: "No profile found",
        data: null
      });
    } else if (error) {
       console.error("Profile fetch error:", error);
       return NextResponse.json({ error: "Ошибка при получении профиля" }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: profile });

  } catch (error: any) {
    console.error("Profile API Error:", error.message);
    return NextResponse.json({ error: "Непредвиденная ошибка" }, { status: 500 });
  }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { telegram_id, ...updateData } = body;
    
        if (!telegram_id) {
          return NextResponse.json({ error: "Missing telegram_id" }, { status: 400 });
        }
    
        // Upsert the profile (Update if exists, Insert if not)
        const { data, error } = await supabaseAdmin
          .from('profiles')
          .upsert({ 
             telegram_id, 
             ...updateData,
             updated_at: new Date().toISOString()
          })
          .select()
          .single();
    
        if (error) {
          console.error("Profile upsert error:", error);
          return NextResponse.json({ error: "Ошибка при сохранении профиля" }, { status: 500 });
        }
    
        return NextResponse.json({ success: true, data });
    
      } catch (error: any) {
        console.error("Profile API Error:", error.message);
        return NextResponse.json({ error: "Непредвиденная ошибка при сохранении" }, { status: 500 });
      }
}
