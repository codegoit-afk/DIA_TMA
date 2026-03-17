import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { Profile } from "@/types";

export async function POST(req: Request) {
  try {
    const { telegram_id, current_sugar, total_xe } = await req.json();

    if (!telegram_id || current_sugar === undefined || total_xe === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // 1. Get User Profile from Supabase
    const { data: profileData, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('telegram_id', telegram_id)
      .single();

    // Fallback profile if user hasn't configured settings yet
    const defaultProfile: Profile = {
        telegram_id: telegram_id,
        hypo_threshold: 3.9,
        target_sugar_min: 5.0,
        target_sugar_max: 7.0,
        target_sugar_ideal: 6.0,
        xe_weight: 12,
        use_k2: false,
        insulin_dia: 4,
        isf: 2,
        coef_matrix: [
            { min: 0, max: 20, coef: 1.5 } // Default safe coefficient
        ],
        updated_at: new Date().toISOString()
    };

    const profile = profileData ? (profileData as Profile) : defaultProfile;

    if (profileError && profileError.code !== 'PGRST116') {
      console.error("Profile fetch error:", profileError);
      // We log the error but still proceed with defaultProfile to not block the user entirely
    }

    // 2. Check for Hypoglycemia Risk
    if (current_sugar < profile.hypo_threshold) {
        return NextResponse.json({ 
            error: "CRITICAL_HYPO", 
            message: `Опасно низкий сахар (${current_sugar} < ${profile.hypo_threshold})! Сначала съешьте 1-2 ХЕ быстрых углеводов, подождите 15 минут.`
        });
    }

    // 3. Find Correct Coef from Matrix
    let activeCoef = 1.0; // Fallback
    const matrix = profile.coef_matrix || [];
    
    // Sort matrix by min value just in case
    const sortedMatrix = [...matrix].sort((a, b) => a.min - b.min);
    
    let foundMatch = false;
    for (const row of sortedMatrix) {
        if (current_sugar >= row.min && current_sugar <= row.max) {
            activeCoef = row.coef;
            foundMatch = true;
            break;
        }
    }

    // If sugar is higher than max matrix value, use the highest bracket coefficient
    if (!foundMatch && sortedMatrix.length > 0) {
        const highestRow = sortedMatrix[sortedMatrix.length - 1];
        if (current_sugar > highestRow.max) {
             activeCoef = highestRow.coef;
        }
    }

    // 4. Calculate Final Dose
    // Base Dose = Total XE * Coeff
    let calculatedDose = total_xe * activeCoef;

    // Optional: Add DPS (Correction Dose) if sugar is above target range
    // Formula: (Current - Target) / ISF
    let dps = 0;
    if (current_sugar > profile.target_sugar_max && profile.isf > 0) {
        dps = (current_sugar - profile.target_sugar_ideal) / profile.isf;
        calculatedDose += dps;
    }

    // Round to nearest 0.5 unit (standard insulin pen step)
    const roundedDose = Math.round(calculatedDose * 2) / 2;

    return NextResponse.json({ 
        success: true, 
        data: {
            recommended_dose: roundedDose,
            active_coef: activeCoef,
            dps_added: Math.round(dps * 2) / 2
        } 
    });

  } catch (error: any) {
    console.error("Calculation Error:", error.message);
    return NextResponse.json({ error: "Ошибка при расчете дозы" }, { status: 500 });
  }
}
