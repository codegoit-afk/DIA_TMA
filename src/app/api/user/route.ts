import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(req: Request) {
  try {
    const { id, username, first_name } = await req.json();

    if (!id) {
       return NextResponse.json({ error: "Missing telegram id" }, { status: 400 });
    }

    // 1. Try to fetch the user to see if they exist
    let { data: user, error } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('telegram_id', id)
      .single();

    if (error && error.code === 'PGRST116') {
      // User doesn't exist, we must create them
      const newUser = {
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
         ]
      };

      const { data: createdUser, error: insertError } = await supabaseAdmin
         .from('profiles')
         .insert([newUser])
         .select()
         .single();
      
      if (insertError) {
         console.error("User insert error:", insertError);
         return NextResponse.json({ error: "Ошибка при регистрации" }, { status: 500 });
      }

      return NextResponse.json({ success: true, data: createdUser, isNew: true });
    } else if (error) {
       console.error("User fetch error:", error);
       return NextResponse.json({ error: "Ошибка при входе" }, { status: 500 });
    }

    // Return existing user
    return NextResponse.json({ success: true, data: user, isNew: false });


  } catch (error: any) {
    console.error("Auth API Error:", error.message);
    return NextResponse.json({ error: "Непредвиденная ошибка" }, { status: 500 });
  }
}
