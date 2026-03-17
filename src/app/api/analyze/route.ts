import { NextResponse } from "next/server";
import axios from "axios";

export const maxDuration = 60; // For Vercel hosting allow 60s for OpenAI

export async function POST(req: Request) {
  try {
    const { imageBase64, xeWeight, clarification } = await req.json();

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "OpenAI API key not configured" }, { status: 500 });
    }

    if (!imageBase64) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }

    // Prepare system prompt for GPT-4o
    const systemPrompt = `
Вы — строгий и опытный врач-эндокринолог. Ваша главная задача — ОЦЕНИТЬ МАКСИМАЛЬНО РЕАЛИСТИЧНО И ДАЖЕ С ЗАПАСОМ количество углеводов (ХЕ) на фотографии еды. 
Диабетику ОПАСНО недокалывать инсулин, поэтому СУЩЕСТВЕННО ЗАНИЖАТЬ углеводы ЗАПРЕЩЕНО. Лучше переоценить на 10-20%, чем недооценить.

Контекст пользователя: Вес одной Хлебной Единицы (ХЕ) равен ${xeWeight || 12} граммов углеводов.
Пользователь оставил важное уточнение: "${clarification || "Уточнений нет"}"
ЕСЛИ в уточнении указаны углеводные продукты (тесто, картошка, сладкое, рис) — ОБЯЗАТЕЛЬНО считай их по верхней границе плотности и веса!

ПРАВИЛА РАСЧЕТА:
1. Выпечка, пирожки, хлеб: Оценивай плотность высоко. Кусок теста диаметром 15 см легко может содержать 4-6 ХЕ сам по себе.
2. Картошка, рис, макароны: Очень тяжелые углеводы. Средняя порция (200г) — это минимум 4-5 ХЕ.
3. Если есть сомнения в размере порции (нет руки в кадре) — ПРЕДПОЛАГАЙ БОЛЬШИЙ ВЕС (порции в кафе обычно 350-450г).
4. Обязательно вчитывайся в "уточнение" пользователя. Если там заявлено то, чего не видно на фото — верь пользователю безоговорочно.
5. Итоговое total_xe ДОЛЖНО быть суммой всех ХЕ с учетом повышающего коэффициента безопасности (умножай базу на 1.15 или 1.2, если есть скрытые жиры/соусы).

Верни ответ СТРОГО в формате JSON без markdown разметки:
{
  "thinking_process": {
    "hand_scale_cm": "Оценка размера руки в кадре (если есть)",
    "analysis": "РАЗВЕРНУТО: Почему вес такой большой и почему ХЕ не занижены. Обоснуй каждую цифру с запасом."
  },
  "items_breakdown": [
    {
      "name": "Название (например, Пирожок с картошкой)",
      "estimated_weight_g": 250,
      "carbs_per_100g": 30,
      "total_carbs_g": 75,
      "xe": 6.25
    }
  ],
  "total_xe": 6.25,
  "glycemic_alert": "Краткое предупреждение о ГИ."
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
