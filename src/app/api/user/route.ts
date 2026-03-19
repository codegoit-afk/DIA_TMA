import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(req: Request) {
  try {
    const { id, username, first_name } = await req.json();

    if (!id) {
       return NextResponse.json({ error: "Missing telegram id" }, { status: 400 });
    }

    // Default Profile Data
    const defaultProfile = {
       telegram_id: id,
       username: username || null,
       first_name: first_name || null,
       role: id.toString() === process.env.ADMIN_TELEGRAM_ID ? 'admin' : 'user',
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

    // Use UPSERT instead of manual check + insert
    // This handles cases where user existed but had broken data or missing fields
    const { data: user, error } = await supabaseAdmin
      .from('profiles')
      .upsert(defaultProfile, { onConflict: 'telegram_id' })
      .select()
      .single();

    if (error) {
       console.error("User Sync Error:", error);
       return NextResponse.json({ 
         success: false, 
         error: error.message, 
         code: error.code,
         details: error.details 
       }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: user });

  } catch (error: any) {
    console.error("Auth API Global Error:", error.message);
    return NextResponse.json({ error: `Internal Error: ${error.message}` }, { status: 500 });
  }
}
