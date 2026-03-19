"use client";

import { useState, useRef, useEffect } from "react";
import { Mic, Square, Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils/utils";
import { useUser } from "@/components/providers/TelegramProvider";

type VoiceRecorderProps = {
  onTranscription: (text: string) => void;
  disabled?: boolean;
};

export default function VoiceRecorder({ onTranscription, disabled }: VoiceRecorderProps) {
  const { t } = useUser();
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        await handleTranscription(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('medium');
    } catch (err) {
      console.error("Failed to start recording:", err);
      setError(t.voice_error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light');
    }
  };

  const handleTranscription = async (blob: Blob) => {
    setIsProcessing(true);
    try {
      const formData = new FormData();
      formData.append('file', blob, 'recording.webm');

      const response = await fetch('/api/ai/transcribe', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (data.success && data.text) {
        onTranscription(data.text);
      } else {
        throw new Error(data.error || "Transcription failed");
      }
    } catch (err) {
      console.error("Transcription error:", err);
      setError(t.voice_error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        onClick={isRecording ? stopRecording : startRecording}
        disabled={disabled || isProcessing}
        className={cn(
          "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300",
          isRecording 
            ? "bg-red-500 scale-110 animate-pulse shadow-lg shadow-red-500/30" 
            : "bg-emerald-50 text-emerald-500 hover:bg-emerald-100",
          isProcessing && "opacity-50 cursor-not-allowed",
          disabled && "opacity-20 cursor-not-allowed"
        )}
        title={isRecording ? t.voice_stop : t.voice_button}
      >
        {isProcessing ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : isRecording ? (
          <Square className="w-5 h-5 text-white" />
        ) : (
          <Mic className="w-5 h-5" />
        )}
      </button>

      {(isRecording || isProcessing || error) && (
        <div className="absolute top-[-40px] left-1/2 -translate-x-1/2 whitespace-nowrap px-3 py-1.5 rounded-full bg-white/90 backdrop-blur shadow-sm border border-gray-100 flex items-center gap-2 animate-fade-in-up">
          {error ? (
            <>
              <AlertCircle className="w-3 h-3 text-red-500" />
              <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest">{error}</span>
            </>
          ) : isProcessing ? (
            <>
              <Loader2 className="w-3 h-3 text-emerald-500 animate-spin" />
              <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">{t.voice_processing}</span>
            </>
          ) : (
            <>
              <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
              <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest">{t.voice_recording}</span>
            </>
          )}
        </div>
      )}
    </div>
  );
}
