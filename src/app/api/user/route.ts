import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(req: Request) {
  try {
    const { id, username, first_name } = await req.json();

    if (!id) {
       return NextResponse.json({ error: "Missing telegram id" }, { status: 400 });
    }

    const isOwner = id.toString() === process.env.ADMIN_TELEGRAM_ID;
    const role = isOwner ? 'admin' : 'user';

    // 1. Sync with "users" table first (source of truth for identity)
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .upsert({
        telegram_id: id,
        username: username || null,
        first_name: first_name || null,
        role: role
      }, { onConflict: 'telegram_id' })
      .select()
      .single();

    if (userError) {
      console.error("Users Table Sync Error:", userError);
      return NextResponse.json({ error: "Ошибка синхронизации пользователей" }, { status: 500 });
    }

    // 2. Sync with "profiles" table (settings)
    const defaultProfile = {
       telegram_id: id,
       hypo_threshold: 3.9,
       target_sugar_min: 5.0,
       target_sugar_max: 7.0,
       target_sugar_ideal: 6.0,
       xe_weight: 12,
       insulin_dia: 4,
       isf: 2,
       coef_matrix: [
           { min: 1.0, max: 8.0, coef: 2.0 },
           { min: 8.1, max: 15.0, coef: 1.5 },
           { min: 15.1, max: 99.0, coef: 1.0 }
       ],
       updated_at: new Date().toISOString()
    };

    // Use upsert for profiles as well
    const { data: profileData, error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert(defaultProfile, { onConflict: 'telegram_id' })
      .select()
      .single();

    if (profileError) {
       console.error("Profiles Table Sync Error:", profileError);
       // We don't fail the whole request if profile exists but upsert failed for some reason
       // but we should return the user data at least
    }

    return NextResponse.json({ 
        success: true, 
        data: { ...userData, ...profileData } 
    });

  } catch (error: any) {
    console.error("Auth API Global Error:", error.message);
    return NextResponse.json({ error: `Internal Error: ${error.message}` }, { status: 500 });
  }
}
