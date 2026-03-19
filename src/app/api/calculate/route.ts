import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { Profile } from "@/types";
import axios from "axios";

export const maxDuration = 60; // Allow 60s for OpenAI

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { 
      telegram_id, 
      sugar, 
      current_sugar, 
      images, 
      imageBase64Array, 
      description, 
      clarification,
      total_xe // Optional, for manual mode
    } = body;

    const activeSugar = sugar !== undefined ? sugar : current_sugar;
    const activeImages = images || imageBase64Array;
    const activeDescription = description || clarification;

    if (!telegram_id || activeSugar === undefined) {
      return NextResponse.json({ error: "Missing required fields (id or sugar)" }, { status: 400 });
    }

    // 1. Get User Profile from Supabase
    const { data: profileData, error: profileError } = await supabaseAdmin
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

    // 2. Check for Hypoglycemia Risk
    const numSugar = parseFloat(activeSugar.toString().replace(',', '.'));
    if (numSugar < profile.hypo_threshold) {
        return NextResponse.json({ 
            success: false,
            error: "CRITICAL_HYPO", 
            message: `Опасно низкий сахар (${numSugar} < ${profile.hypo_threshold})! Сначала съешьте 1-2 ХЕ быстрых углеводов, подождите 15 минут.`
        });
    }

    let finalXeMin = 0;
    let finalXeMax = 0;
    let aiResponse = null;
    let isHighFat = false;

    // 3. AI Vision Analysis if images are provided
    if (activeImages && Array.isArray(activeImages) && activeImages.length > 0) {
        if (!process.env.OPENAI_API_KEY) {
            return NextResponse.json({ error: "OpenAI API key not configured" }, { status: 500 });
        }

        const systemPrompt = `
Вы — профессиональный врач-эндокринолог. Ваша задача — ОЦЕНИТЬ МАКСИМАЛЬНО ТОЧНО И ОБЪЕКТИВНО количество хлебных единиц (ХЕ) на фотографии.
Вес одной ХЕ = ${profile.xe_weight || 12}г углеводов.
Уточнение пользователя: "${activeDescription || "Нет"}"

Верни JSON:
{
  "thinking_process": "...",
  "items_breakdown": [{"name": "...", "xe": 1.2}],
  "xe_min": 5.0,
  "xe_max": 6.0,
  "high_fat": true/false
}`;

        const gptRes = await axios.post(
            "https://api.openai.com/v1/chat/completions",
            {
                model: "gpt-4o",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: [
                        { type: "text", text: "Анализируй еду:" },
                        ...activeImages.map((b64: string) => ({
                            type: "image_url",
                            image_url: { url: `data:image/jpeg;base64,${b64}`, detail: "high" }
                        }))
                    ]}
                ],
                response_format: { type: "json_object" }
            },
            { headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` } }
        );

        aiResponse = JSON.parse(gptRes.data.choices[0].message.content);
        finalXeMin = aiResponse.xe_min;
        finalXeMax = aiResponse.xe_max;
        isHighFat = aiResponse.high_fat || false;

    } else if (total_xe !== undefined) {
        // Manual mode
        finalXeMin = parseFloat(total_xe.toString());
        finalXeMax = parseFloat(total_xe.toString());
    } else {
        return NextResponse.json({ error: "No images or XE provided" }, { status: 400 });
    }

    // 4. Calculate Dose
    const avgXe = (finalXeMin + finalXeMax) / 2;
    
    // Find Coef from Matrix
    let activeCoef = 1.0;
    const matrix = profile.coef_matrix || [];
    const sortedMatrix = [...matrix].sort((a, b) => a.min - b.min);
    
    let foundMatch = false;
    for (const row of sortedMatrix) {
        if (avgXe >= row.min && avgXe <= row.max) {
            activeCoef = row.coef;
            foundMatch = true;
            break;
        }
    }
    if (!foundMatch && sortedMatrix.length > 0) {
        const highestRow = sortedMatrix[sortedMatrix.length - 1];
        if (avgXe > highestRow.max) activeCoef = highestRow.coef;
    }

    let baseDose = avgXe * activeCoef;
    let dps = 0;
    if (numSugar > profile.target_sugar_max && profile.isf && profile.isf > 0) {
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
    console.error("Calculation Error:", error?.response?.data || error.message);
    return NextResponse.json({ error: "Ошибка при расчете дозы" }, { status: 500 });
  }
}
