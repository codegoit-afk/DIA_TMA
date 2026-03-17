"use client";

import { useState, useRef } from "react";
import { Camera, Calculator, Settings, History, AlertCircle, Syringe, Wheat, Check } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils/utils";

import axios from "axios";
import { useUser } from "@/components/providers/TelegramProvider";
import { AIResponse } from "@/types";

export default function Home() {
  const { user, calculatorState, setCalculatorState } = useUser();
  const { sugar, previewUrl, base64Image, result, aiData } = calculatorState;

  const [isPhotoLoading, setIsPhotoLoading] = useState(false);
  const [sugarError, setSugarError] = useState<string | null>(null);
  const [foodText, setFoodText] = useState<string>(""); // Added for text clarification
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSugarChange = (val: string) => {
    setCalculatorState(prev => ({...prev, sugar: val, result: null}));
    const num = parseFloat(val.replace(',', '.'));
    if (!isNaN(num) && num < 3.9) {
      setSugarError("Опасно низкий сахар! Сначала съешь 1-2 ХЕ быстрых углеводов, подожди 15 минут.");
    } else {
      setSugarError(null);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      alert("Файл не выбран!");
      return;
    }
    
    // TEMPORARY: If user is somehow null in browser, use a fast mock instead of silently failing
    const activeUser = user || { telegram_id: 11111111, username: 'test', first_name: 'Test', role: 'user', created_at: new Date().toISOString() };

    const tempUrl = URL.createObjectURL(file);
    setCalculatorState(prev => ({...prev, previewUrl: tempUrl, base64Image: null, result: null, aiData: null}));

    setSugarError(null);

    // 1. Convert to Base64 using Promise and store it
    const getBase64 = (file: File): Promise<string> => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = error => reject(error);
      });
    };
    
    try {
      const b64 = await getBase64(file);
      setCalculatorState(prev => ({...prev, base64Image: b64}));
    } catch(e) {
      alert("Ошибка чтения файла");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleStartAnalysis = async () => {
    if (!base64Image) return;

    // TEMPORARY: If user is somehow null in browser, use a fast mock instead of silently failing
    const activeUser = user || { telegram_id: 11111111, username: 'test', first_name: 'Test', role: 'user', created_at: new Date().toISOString() };

    setIsPhotoLoading(true);
    setSugarError(null);

    try {
      // 2. Send to our OpenAI API
      const aiResponse = await axios.post('/api/analyze', { 
          imageBase64: base64Image,
          xeWeight: 12, // TODO: Fetch from profile
          clarification: foodText // Sending the added text
      });

      if (aiResponse.data.error) throw new Error(aiResponse.data.error);

      const aiOutput: AIResponse = aiResponse.data.data;
      setCalculatorState(prev => ({...prev, aiData: aiOutput}));

      // 3. Calculate Dose
      const currentSugarNum = parseFloat(sugar.replace(',', '.'));
      const calcResponse = await axios.post('/api/calculate', {
          telegram_id: activeUser.telegram_id,
          current_sugar: currentSugarNum,
          total_xe: aiOutput.total_xe
      });

      if (calcResponse.data.error) throw new Error(calcResponse.data.error);
      
      const calcData = calcResponse.data.data;
      setCalculatorState(prev => ({
          ...prev,
          result: {
              dose: calcData.recommended_dose,
              xe: aiOutput.total_xe,
              coef: calcData.active_coef,
              dps: calcData.dps_added
          }
      }));

    } catch (error: any) {
      console.error("Upload error full detail:", error);
      const errMsg = error.response?.data?.error || error.message || "Ошибка анализа";
      setSugarError(errMsg);
      alert("Ошибка при анализе: " + errMsg);
    } finally {
      setIsPhotoLoading(false);
    }
  };

  const handleResetAnalysis = () => {
    setCalculatorState(prev => ({...prev, previewUrl: null, base64Image: null, result: null, aiData: null}));
    setFoodText("");
    setIsPhotoLoading(false);
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
          setCalculatorState({ sugar: "", result: null, aiData: null, previewUrl: null, base64Image: null });
          setFoodText("");
      } catch(e) {
          alert("Ошибка сохранения");
      }
  };

  return (
    <main className="min-h-screen p-4 max-w-md mx-auto relative pb-28">
      
      {/* Header */}
      <header className="flex items-center justify-between mb-8 pt-4">
        <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400">
          Калькулятор ХЕ <span className="text-sm text-slate-500">(v2)</span>
        </h1>
        <Link 
          href="/settings"
          className="p-2 rounded-full bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition shadow-lg"
        >
          <Settings className="w-5 h-5" />
        </Link>
      </header>

      {/* Main Form */}
      <div className="space-y-6 relative z-10">
        
        {/* Background decorative blob */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-indigo-500/10 rounded-full blur-[80px] pointer-events-none" />
        
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
                "w-full glass-input rounded-2xl p-4 text-3xl font-semibold text-white focus:outline-none transition-all duration-300",
                sugarError ? "border-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.15)]" : "focus:border-indigo-500/50 focus:shadow-[0_0_20px_rgba(99,102,241,0.15)] focus:bg-white/5"
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

        {/* Photo Preview */}
        {previewUrl && !result && (
            <div className="rounded-2xl overflow-hidden glass-panel h-56 w-full relative group animate-fade-in-up">
                <img src={previewUrl} alt="Preview" className="object-cover w-full h-full transition-transform duration-700 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60" />
                {isPhotoLoading && (
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex flex-col items-center justify-center gap-4">
                        <div className="relative">
                           <div className="w-12 h-12 rounded-full border-t-2 border-b-2 border-indigo-400 animate-spin" />
                           <div className="absolute inset-0 w-12 h-12 rounded-full border-r-2 border-l-2 border-emerald-400 animate-spin opacity-50" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
                        </div>
                        <span className="text-white font-medium tracking-wide animate-pulse">Анализ нейросетью...</span>
                    </div>
                )}
            </div>
        )}

        {/* Text Clarification Field (Shown only if photo is uploaded and result not calculated) */}
        {!result && previewUrl && !sugarError && (
          <div className="space-y-4 translate-y-2 opacity-0 animate-[fade-in_0.5s_ease-out_forwards] delay-150">
             <div className="space-y-2">
               <label className="text-sm font-medium text-slate-400">Уточнение для ИИ (необязательно)</label>
               <input 
                 type="text"
                 value={foodText}
                 onChange={(e) => setFoodText(e.target.value)}
                 placeholder="Например: 'пирожок с картошкой'"
                 className="w-full glass-input rounded-2xl p-4 text-white focus:outline-none focus:border-indigo-500/50 focus:bg-white/5 transition-all duration-300 placeholder:text-slate-500/70"
               />
             </div>
             
             {/* Action Buttons for Analysis */}
             <div className="flex gap-3">
               <button 
                 onClick={handleResetAnalysis}
                 disabled={isPhotoLoading}
                 className="flex-1 glass-panel text-slate-300 p-4 rounded-2xl font-medium transition-colors hover:bg-white/5 hover:text-white active:scale-95 disabled:opacity-50"
               >
                 Отмена
               </button>
               <button 
                 onClick={handleStartAnalysis}
                 disabled={isPhotoLoading || !base64Image}
                 className="flex-[2] bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white p-4 rounded-2xl font-medium shadow-[0_8px_30px_rgb(99,102,241,0.3)] active:scale-95 transition-all disabled:opacity-50"
               >
                 {isPhotoLoading ? "Анализ..." : "Рассчитать ХЕ"}
               </button>
             </div>
          </div>
        )}

        {/* Photo Button (Only show if no photo selected) */}
        {!previewUrl && (
            <button
            onClick={() => fileInputRef.current?.click()}
            disabled={!!sugarError || !sugar}
            className={cn(
                "w-full group relative overflow-hidden rounded-2xl p-6 flex flex-col items-center justify-center gap-3 transition-all duration-300 active:scale-95",
                (sugarError || !sugar) ? "glass-panel opacity-60 text-slate-500 cursor-not-allowed" :
                "bg-gradient-to-br from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 shadow-[0_8px_30px_rgb(99,102,241,0.3)] hover:shadow-[0_8px_40px_rgb(99,102,241,0.4)] border border-white/10"
            )}
            >
            <Camera className={cn("w-10 h-10 transition-transform group-hover:scale-110 group-hover:-rotate-3 text-white/90")} />
            <span className="font-medium text-lg text-white">
                {!sugar ? "Сначала введите сахар" : "Сфотографировать еду"}
            </span>
            {!sugarError && sugar && (
                <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/10 to-white/0 w-full rounded-2xl translate-x-[-100%] group-hover:animate-[shimmer_1.5s_infinite]" />
            )}
            </button>
        )}

        {/* Result Card */}
        {result && aiData && (
            <div className="glass-panel rounded-3xl p-6 space-y-6 animate-fade-in-up shadow-2xl relative overflow-hidden">
                {/* Decorative glow inside card */}
                <div className="absolute -top-24 -right-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-[60px]" />
                
                <div className="text-center space-y-2 pb-4 border-b border-white/5 relative z-10">
                    <p className="text-slate-400 text-sm font-medium tracking-wide">Нейросеть оценила в <strong className="text-white">{result.xe} ХЕ</strong></p>
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
                        <div key={idx} className="flex justify-between text-sm glass-input p-3.5 rounded-xl animate-fade-in-up" style={{ animationDelay: `${idx * 100}ms` }}>
                            <span className="text-slate-300">{item.name}</span>
                            <span className="font-semibold text-emerald-400">{item.xe} ХЕ</span>
                        </div>
                    ))}
                    {aiData.glycemic_alert && (
                        <div className="text-xs text-orange-400 bg-orange-500/10 p-3 rounded-xl border border-orange-500/20">
                            {aiData.glycemic_alert}
                        </div>
                    )}
                </div>

                <div className="flex gap-3">
                   <button 
                     onClick={handleResetAnalysis}
                     className="flex-1 glass-panel text-slate-300 p-4 rounded-2xl font-medium flex items-center justify-center transition-colors hover:bg-white/5 hover:text-white active:scale-95">
                       Пересчитать
                   </button>
                   <button 
                     onClick={handleSaveLog}
                     className="flex-[2] bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white p-4 rounded-2xl font-medium flex items-center justify-center gap-2 transition-all duration-300 active:scale-95 shadow-[0_8px_30px_rgb(16,185,129,0.3)] border border-white/10">
                       <Check className="w-5 h-5" />
                       Сохранить
                   </button>
                </div>
            </div>
        )}

      </div>

      {/* Navigation Footer (Floating) */}
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-[#0f1115] via-[#0f1115]/90 to-transparent pointer-events-none z-50">
        <div className="max-w-md mx-auto flex gap-3 pointer-events-auto">
          <Link href="/" className="flex-1 glass-panel text-white rounded-2xl p-4 flex flex-col items-center gap-1.5 active:scale-95 transition-all duration-300 hover:bg-white/5 border-indigo-500/30">
             <Calculator className="w-5 h-5 text-indigo-400" />
             <span className="text-xs font-medium tracking-wide">Калькулятор</span>
          </Link>
          <Link href="/logs" className="flex-1 glass-panel text-slate-400 hover:text-white rounded-2xl p-4 flex flex-col items-center gap-1.5 active:scale-95 transition-all duration-300 hover:bg-white/5">
             <History className="w-5 h-5" />
             <span className="text-xs font-medium tracking-wide">История</span>
          </Link>
        </div>
      </div>

    </main>
  );
}
