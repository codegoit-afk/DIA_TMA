import { NextResponse } from "next/server";
import axios from "axios";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as Blob;

    if (!file) {
      return NextResponse.json({ success: false, error: "No file provided" }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
       return NextResponse.json({ success: false, error: "OpenAI API Key missing" }, { status: 500 });
    }

    // Convert Blob to File for OpenAI API
    const openAiFormData = new FormData();
    openAiFormData.append('file', file, 'audio.webm');
    openAiFormData.append('model', 'whisper-1');

    const response = await axios.post('https://api.openai.com/v1/audio/transcriptions', openAiFormData, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'multipart/form-data',
      },
    });

    if (response.data && response.data.text) {
      return NextResponse.json({ success: true, text: response.data.text });
    } else {
      return NextResponse.json({ success: false, error: "Invalid response from OpenAI" }, { status: 500 });
    }

  } catch (error: any) {
    console.error("Transcription API Error:", error.response?.data || error.message);
    return NextResponse.json({ 
      success: false, 
      error: error.response?.data?.error?.message || error.message 
    }, { status: 500 });
  }
}
