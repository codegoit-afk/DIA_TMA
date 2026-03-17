"use client";

import { useState, useRef } from "react";
import { Camera, Calculator, Settings, History, AlertCircle, Syringe, Wheat, Check } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils/utils";

import axios from "axios";
import { useUser } from "@/components/providers/TelegramProvider";
import { AIResponse } from "@/types";

export default function Home() {
  const { user } = useUser();
  const [sugar, setSugar] = useState<string>("");
  const [isPhotoLoading, setIsPhotoLoading] = useState(false);
  const [sugarError, setSugarError] = useState<string | null>(null);
  const [result, setResult] = useState<{ dose: number, xe: number, coef: number, dps: number } | null>(null);
  const [aiData, setAiData] = useState<AIResponse | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSugarChange = (val: string) => {
    setSugar(val);
    setResult(null); // Reset result on new sugar
    const num = parseFloat(val.replace(',', '.'));
    if (!isNaN(num) && num < 3.9) {
      setSugarError("Опасно низкий сахар! Сначала съешь 1-2 ХЕ быстрых углеводов, подожди 15 минут.");
    } else {
      setSugarError(null);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setIsPhotoLoading(true);
    setResult(null);
    setSugarError(null);

    try {
      // 1. Convert to Base64
      const reader = new FileReader();
      reader.readAsDataURL(file);
      
      reader.onload = async () => {
        const base64String = (reader.result as string).split(',')[1];
        
        // 2. Send to our OpenAI API
        const aiResponse = await axios.post('/api/analyze', { 
            imageBase64: base64String,
            xeWeight: 12 // TODO: Fetch from profile
        });

        if (aiResponse.data.error) throw new Error(aiResponse.data.error);

        const aiOutput: AIResponse = aiResponse.data.data;
        setAiData(aiOutput);

        // 3. Calculate Dose
        const currentSugarNum = parseFloat(sugar.replace(',', '.'));
        const calcResponse = await axios.post('/api/calculate', {
            telegram_id: user.telegram_id,
            current_sugar: currentSugarNum,
            total_xe: aiOutput.total_xe
        });

        if (calcResponse.data.error) throw new Error(calcResponse.data.error);
        
        const calcData = calcResponse.data.data;
        setResult({
            dose: calcData.recommended_dose,
            xe: aiOutput.total_xe,
            coef: calcData.active_coef,
            dps: calcData.dps_added
        });

      };
    } catch (error: any) {
      console.error("Upload error full detail:", error);
      const errMsg = error.response?.data?.error || error.message || "Ошибка анализа";
      setSugarError(errMsg);
      alert("Ошибка при анализе: " + errMsg);
    } finally {
      setIsPhotoLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSaveLog = async () => {
      if (!user || !result || !aiData) return;
      try {
          await axios.post('/api/log', {
              telegram_id: user.telegram_id,
              current_sugar: parseFloat(sugar.replace(',', '.')),
              total_xe: result.xe,
              ai_raw_response: aiData,
              recommended_dose: result.dose,
              actual_dose: result.dose // Simplified: assuming user injects recommended
          });
          alert("Сохранено в историю!");
          setResult(null);
          setSugar("");
      } catch(e) {
          alert("Ошибка сохранения");
      }
  };

  return (
    <main className="min-h-screen p-4 max-w-md mx-auto relative pb-28">
      
      {/* Header */}
      <header className="flex items-center justify-between mb-8 pt-4">
        <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400">
          Калькулятор ХЕ
        </h1>
        <Link 
          href="/settings"
          className="p-2 rounded-full bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition shadow-lg"
        >
          <Settings className="w-5 h-5" />
        </Link>
      </header>

      {/* Main Form */}
      <div className="space-y-6">
        
        {/* Sugar Input */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-400">Текущий сахар (ммоль/л)</label>
          <div className="relative">
            <input 
              type="number"
              inputMode="decimal"
              value={sugar}
              onChange={(e) => handleSugarChange(e.target.value)}
              placeholder="5.5"
              className={cn(
                "w-full bg-slate-900 border-2 rounded-2xl p-4 text-3xl font-semibold text-white focus:outline-none transition-colors",
                sugarError ? "border-red-500/50 focus:border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.2)]" : "border-slate-800 focus:border-blue-500"
              )}
            />
          </div>
          
          {/* Alert */}
          {sugarError && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-2xl flex gap-3 animate-in slide-in-from-top-2 fade-in mt-2">
              <AlertCircle className="w-6 h-6 shrink-0 mt-0.5" />
              <p className="text-sm font-medium leading-relaxed">{sugarError}</p>
            </div>
          )}
        </div>

        {/* Hidden File Input */}
        <input 
            type="file" 
            accept="image/*" 
            capture="environment" 
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
        />

        {/* Photo Button (Only show if no result yet) */}
        {!result && (
            <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isPhotoLoading || !!sugarError || !sugar}
            className={cn(
                "w-full group relative overflow-hidden rounded-2xl p-6 flex flex-col items-center justify-center gap-3 transition-all active:scale-95",
                isPhotoLoading ? "bg-slate-800 text-slate-400 cursor-not-allowed" : 
                (sugarError || !sugar) ? "bg-slate-900 border border-slate-800 text-slate-600 cursor-not-allowed" :
                "bg-gradient-to-br from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-lg shadow-blue-900/20"
            )}
            >
            {isPhotoLoading ? (
                <div className="w-8 h-8 rounded-full border-t-2 border-b-2 border-slate-400 animate-spin" />
            ) : (
                <Camera className={cn("w-10 h-10 transition-transform group-hover:scale-110 group-hover:-rotate-3 text-white/90")} />
            )}
            <span className="font-medium text-lg">
                {isPhotoLoading ? "Анализ ИИ..." : !sugar ? "Сначала введите сахар" : "Сфотографировать еду"}
            </span>
            {!isPhotoLoading && !sugarError && sugar && (
                <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/10 to-white/0 w-full rounded-2xl translate-x-[-100%] group-hover:animate-[shimmer_1.5s_infinite]" />
            )}
            </button>
        )}

        {/* Result Card */}
        {result && aiData && (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6 animate-in zoom-in-95 fade-in shadow-2xl">
                <div className="text-center space-y-2 pb-4 border-b border-slate-800/50">
                    <p className="text-slate-400 text-sm">ИИ насчитал <strong className="text-white">{result.xe} ХЕ</strong></p>
                    <div className="flex justify-center items-center gap-2 text-blue-400">
                        <Syringe className="w-8 h-8" />
                        <span className="text-5xl font-bold">{result.dose}</span>
                        <span className="text-xl font-medium self-end mb-1">ед.</span>
                    </div>
                    <p className="text-xs text-slate-500 pt-2">Коэффициент: {result.coef} {result.dps > 0 && `(+${result.dps} ДПС)`}</p>
                </div>

                <div className="space-y-3">
                    <p className="text-sm font-medium text-slate-300 flex items-center gap-2">
                        <Wheat className="w-4 h-4 text-emerald-500" /> 
                        Распознано на тарелке:
                    </p>
                    {aiData.items_breakdown.map((item, idx) => (
                        <div key={idx} className="flex justify-between text-sm bg-slate-950/50 p-3 rounded-xl">
                            <span className="text-slate-300">{item.name}</span>
                            <span className="font-semibold text-white">{item.xe} ХЕ</span>
                        </div>
                    ))}
                    {aiData.glycemic_alert && (
                        <div className="text-xs text-orange-400 bg-orange-500/10 p-3 rounded-xl border border-orange-500/20">
                            {aiData.glycemic_alert}
                        </div>
                    )}
                </div>

                <button 
                  onClick={handleSaveLog}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white p-4 rounded-2xl font-medium flex items-center justify-center gap-2 transition-colors active:scale-95 shadow-lg shadow-emerald-900/20">
                    <Check className="w-5 h-5" />
                    Сохранить и уколоть
                </button>
            </div>
        )}

      </div>

      {/* Navigation Footer (Floating) */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-slate-950 via-slate-950/90 to-transparent pointer-events-none z-50">
        <div className="max-w-md mx-auto flex gap-2 pointer-events-auto">
          <Link href="/" className="flex-1 bg-slate-800 text-white rounded-2xl p-4 flex flex-col items-center gap-1 active:scale-95 transition-transform">
             <Calculator className="w-5 h-5 text-blue-400" />
             <span className="text-xs font-medium">Калькулятор</span>
          </Link>
          <Link href="/logs" className="flex-1 bg-slate-900/80 backdrop-blur-md text-slate-400 hover:text-white rounded-2xl p-4 flex flex-col items-center gap-1 active:scale-95 transition-transform">
             <History className="w-5 h-5" />
             <span className="text-xs font-medium">История</span>
          </Link>
        </div>
      </div>

    </main>
  );
}
