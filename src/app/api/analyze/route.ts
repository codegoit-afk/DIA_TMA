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
Вы — профессиональный врач-эндокринолог. Ваша задача — ОЦЕНИТЬ МАКСИМАЛЬНО ТОЧНО И ОБЪЕКТИВНО количество углеводов (ХЕ) на фотографии еды. 
Избегайте сильного занижения, но и не завышайте абсурдно. Важна золотая середина (реальный вес и реальные углеводы продуктов).

Контекст пользователя: Вес одной Хлебной Единицы (ХЕ) равен ${xeWeight || 12} граммов углеводов.
Пользователь оставил уточнение: "${clarification || "Уточнений нет"}"
ЕСЛИ в уточнении указаны углеводные продукты (тесто, картошка, сладкое) — обязательно учти их наличие, даже если они спрятаны внутри (начинка).

ПРАВИЛА РАСЧЕТА:
1. Стандартный пирожок с начинкой (картошка/повидло) весит около 100-150г. Это примерно 3.5 - 5 ХЕ в зависимости от размера. 
2. Большой жареный чебурек или огромный пирожок может весить 200-250г и содержать около 8-11 ХЕ.
3. Оценивай масштаб по окружающим предметам. НЕ умножай вес слепо в 2 раза. Думай логически.
4. Итоговое total_xe ДОЛЖНО быть суммой всех ХЕ. Никаких искусственных повышающих коэффициентов, просто честный подсчет углеводов.

Верни ответ СТРОГО в формате JSON без markdown разметки:
{
  "thinking_process": {
    "hand_scale_cm": "Оценка размера по предметам в кадре",
    "analysis": "РАЗВЕРНУТО: Почему выбран такой вес и углеводы. Логическое обоснование без абсурдных преувеличений."
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
