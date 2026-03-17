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
      .from('users')
      .select('*')
      .eq('telegram_id', id)
      .single();

    if (error && error.code === 'PGRST116') {
      // User doesn't exist, we must create them
      const newUser = {
         telegram_id: id,
         username: username || null,
         first_name: first_name || null,
         role: 'user' // Default role
      };

      const { data: createdUser, error: insertError } = await supabaseAdmin
         .from('users')
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
