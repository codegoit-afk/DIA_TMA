import { NextResponse } from "next/server";
import axios from "axios";

export const maxDuration = 60; // For Vercel hosting allow 60s for OpenAI

export async function POST(req: Request) {
  try {
    const { imageBase64, xeWeight } = await req.json();

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "OpenAI API key not configured" }, { status: 500 });
    }

    if (!imageBase64) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }

    // Prepare system prompt for GPT-4o
    const systemPrompt = `
Вы — опытный врач-эндокринолог и нутрициолог. Ваша задача — максимально точно оценить количество углеводов (ХЕ) на фотографии еды. 
Контекст пользователя: Вес одной Хлебной Единицы (ХЕ) равен ${xeWeight || 12} граммов углеводов.

Верни ответ СТРОГО в формате JSON без markdown разметки:
{
  "thinking_process": {
    "hand_scale_cm": "Оценка размера руки в кадре (ширина ладони ~8-10 см) для масштаба",
    "analysis": "Рассуждения о размере, весе и углеводах каждого продукта на тарелке"
  },
  "items_breakdown": [
    {
      "name": "Название обнаруженного продукта (например, Картофельное пюре)",
      "estimated_weight_g": 150,
      "carbs_per_100g": 16,
      "total_carbs_g": 24,
      "xe": 2.0
    }
  ],
  "total_xe": 2.0,
  "glycemic_alert": "Краткое предупреждение. Например: 'Пюре имеет высокий ГИ (быстрые углеводы), сахар поднимется быстро.' Если всё ок, вернуть null."
}`;

    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: "user",
            content: [
              { type: "text", text: "Проанализируй эту еду." },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${imageBase64}`,
                  detail: "high"
                }
              }
            ]
          }
        ],
        response_format: { type: "json_object" },
        max_tokens: 1500,
        temperature: 0.1 // Низкая температура для более предсказуемых ответов
      },
      {
        headers: {
          "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    const aiContent = response.data.choices[0].message.content;
    const parsedData = JSON.parse(aiContent);

    return NextResponse.json({ success: true, data: parsedData });

  } catch (error: any) {
    console.error("OpenAI Error:", error?.response?.data || error.message);
    return NextResponse.json({ 
      error: "Ошибка при анализе фотографии", 
      details: error?.response?.data || error.message 
    }, { status: 500 });
  }
}
