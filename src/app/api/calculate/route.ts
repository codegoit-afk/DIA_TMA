import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { Profile } from "@/types";
import axios from "axios";

export const maxDuration = 60; // Allow 60s for OpenAI

export async function POST(req: Request) {
  try {
    let body;
    try {
        body = await req.json();
    } catch (e) {
        return NextResponse.json({ error: "Invalid JSON or payload too large" }, { status: 400 });
    }

    const { 
      telegram_id, 
      sugar, 
      current_sugar, 
      images, 
      imageBase64Array, 
      description, 
      clarification,
      total_xe 
    } = body;

    const activeSugar = sugar !== undefined ? sugar : current_sugar;
    const activeImages = images || imageBase64Array;
    const activeDescription = description || clarification;

    if (!telegram_id || activeSugar === undefined) {
      return NextResponse.json({ error: "Missing telegram_id or sugar" }, { status: 400 });
    }

    // 1. Get User Profile
    const { data: profileData } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('telegram_id', telegram_id)
      .single();

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
            { min: 1.0, max: 8.0, coef: 2.0 },
            { min: 8.1, max: 15.0, coef: 1.5 },
            { min: 15.1, max: 99.0, coef: 1.0 }
        ],
        updated_at: new Date().toISOString()
    };

    const profile = profileData ? (profileData as Profile) : defaultProfile;
    const numSugar = parseFloat(activeSugar.toString().replace(',', '.'));

    // 2. Hypo Check
    if (numSugar < profile.hypo_threshold) {
        return NextResponse.json({ 
            success: false,
            error: "CRITICAL_HYPO", 
            message: `Опасно низкий сахар (${numSugar})! Скушайте быстрые углеводы.`
        });
    }

    let finalXeMin = 0;
    let finalXeMax = 0;
    let aiResponse = null;
    let isHighFat = false;

    // 3. AI Analysis
    if (activeImages && Array.isArray(activeImages) && activeImages.length > 0) {
        if (!process.env.OPENAI_API_KEY) {
            return NextResponse.json({ error: "OpenAI API key missing" }, { status: 500 });
        }

        try {
            const systemPrompt = `Analyze food images for diabetes management. XE weight = ${profile.xe_weight}g. User note: "${activeDescription || "none"}". Return JSON with thinking_process, items_breakdown, xe_min, xe_max, high_fat.`;
            
            const gptRes = await axios.post(
                "https://api.openai.com/v1/chat/completions",
                {
                    model: "gpt-4o",
                    messages: [
                        { role: "system", content: systemPrompt },
                        { role: "user", content: [
                            { type: "text", text: "Estimate carbs/XE:" },
                            ...activeImages.map((b64: string) => ({
                                type: "image_url",
                                image_url: { url: `data:image/jpeg;base64,${b64}`, detail: "auto" }
                            }))
                        ]}
                    ],
                    response_format: { type: "json_object" }
                },
                { headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` }, timeout: 50000 }
            );

            aiResponse = JSON.parse(gptRes.data.choices[0].message.content);
            finalXeMin = aiResponse.xe_min;
            finalXeMax = aiResponse.xe_max;
            isHighFat = aiResponse.high_fat || false;
        } catch (aiErr: any) {
            console.error("OpenAI Error Detail:", aiErr?.response?.data || aiErr.message);
            return NextResponse.json({ error: `AI Analysis failed: ${aiErr.message}` }, { status: 502 });
        }
    } else if (total_xe !== undefined) {
        finalXeMin = parseFloat(total_xe.toString());
        finalXeMax = parseFloat(total_xe.toString());
    } else {
        return NextResponse.json({ error: "Provide images or XE value" }, { status: 400 });
    }

    // 4. Dose Calculation
    const avgXe = (finalXeMin + finalXeMax) / 2;
    let activeCoef = 1.0;
    const matrix = profile.coef_matrix || [];
    const sortedMatrix = [...matrix].sort((a, b) => a.min - b.min);
    
    for (const row of sortedMatrix) {
        if (avgXe >= row.min && avgXe <= row.max) {
            activeCoef = row.coef;
            break;
        }
    }

    let dps = 0;
    if (profile.target_sugar_max && numSugar > profile.target_sugar_max && profile.isf && profile.isf > 0) {
        dps = (numSugar - profile.target_sugar_ideal) / profile.isf;
    }

    const totalDoseMin = Math.round((finalXeMin * activeCoef + dps) * 2) / 2;
    const totalDoseMax = Math.round((finalXeMax * activeCoef + dps) * 2) / 2;

    return NextResponse.json({ 
        success: true, 
        result: {
            xe_min: finalXeMin,
            xe_max: finalXeMax,
            dose_min: totalDoseMin,
            dose_max: totalDoseMax,
            coef: activeCoef,
            dps: Math.round(dps * 2) / 2,
            is_high_fat: isHighFat
        },
        aiResponse: aiResponse
    });

  } catch (error: any) {
    console.error("Global Calculation Error:", error.message);
    return NextResponse.json({ error: `Internal Error: ${error.message}` }, { status: 500 });
  }
}
