"use client";

import { useState, useRef, useEffect } from "react";
import { Camera, Calculator, Settings, History, AlertCircle, Syringe, Wheat, Check } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils/utils";

import axios from "axios";
import { useUser } from "@/components/providers/TelegramProvider";
import { AIResponse } from "@/types";

export default function Home() {
  const { user, calculatorState, setCalculatorState, t, language, setLanguage } = useUser();
  const { sugar, previewUrls, base64Images, result, aiData } = calculatorState;

  const [isPhotoLoading, setIsPhotoLoading] = useState(false);
  const [sugarError, setSugarError] = useState<string | null>(null);
  const [foodText, setFoodText] = useState<string>(""); // Added for text clarification
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 2500); // 2.5 seconds splash screen
    return () => clearTimeout(timer);
  }, []);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSugarChange = (val: string) => {
    setCalculatorState(prev => ({...prev, sugar: val, result: null}));
    const num = parseFloat(val.replace(',', '.'));
    if (!isNaN(num) && num < 3.9) {
      setSugarError(t.sugar_low_warning);
    } else {
      setSugarError(null);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) {
      alert(t.no_file_error);
      return;
    }
    
    const tempUrls = files.map(f => URL.createObjectURL(f));
    setCalculatorState(prev => ({...prev, previewUrls: tempUrls, base64Images: [], result: null, aiData: null}));

    setSugarError(null);

    const getBase64 = (file: File): Promise<string> => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = error => reject(error);
      });
    };
    
    setIsPhotoLoading(true);

    try {
      const b64Promises = files.map(f => getBase64(f));
      const b64s = await Promise.all(b64Promises);
      setCalculatorState(prev => ({...prev, base64Images: b64s}));
    } catch(e) {
      alert(t.file_read_error);
    } finally {
      setIsPhotoLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleStartAnalysis = async () => {
    if (base64Images.length === 0) return;

    const activeUser = user || { telegram_id: 11111111, username: 'test', first_name: 'Test', role: 'user', created_at: new Date().toISOString() };

    setIsPhotoLoading(true);
    setSugarError(null);

    try {
      const aiResponse = await axios.post('/api/analyze', { 
          imageBase64Array: base64Images,
          xeWeight: 12, // TODO: Fetch from profile
          clarification: foodText
      });

      if (aiResponse.data.error) throw new Error(aiResponse.data.error);

      const aiOutput: AIResponse = aiResponse.data.data;
      setCalculatorState(prev => ({...prev, aiData: aiOutput}));

      // Calculate Dose (using average XE for calculation, but sending min/max)
      const currentSugarNum = parseFloat(sugar.replace(',', '.'));
      const calcResponse = await axios.post('/api/calculate', {
          telegram_id: activeUser.telegram_id,
          current_sugar: currentSugarNum,
          total_xe: aiOutput.xe_max // Base it on max for safety during staging/math, will display range later
      });

      if (calcResponse.data.error) throw new Error(calcResponse.data.error);
      
      const calcData = calcResponse.data.data;
      
      // We will define dose_min based on xe_min safely using coef
      const dose_max = calcData.recommended_dose;
      const dose_min = parseFloat(((aiOutput.xe_min * calcData.active_coef) + calcData.dps_added).toFixed(1));

      setCalculatorState(prev => ({
          ...prev,
          result: {
              dose_min: dose_min > 0 ? dose_min : 0,
              dose_max: dose_max > 0 ? dose_max : 0,
              xe_min: aiOutput.xe_min,
              xe_max: aiOutput.xe_max,
              coef: calcData.active_coef,
              dps: calcData.dps_added
          }
      }));

    } catch (error: any) {
      console.error("Upload error full detail:", error);
      const errMsg = error.response?.data?.error || error.message || "Error";
      setSugarError(errMsg);
      alert(errMsg);
    } finally {
      setIsPhotoLoading(false);
    }
  };

  const handleResetAnalysis = () => {
    setCalculatorState(prev => ({...prev, previewUrls: [], base64Images: [], result: null, aiData: null}));
    setFoodText("");
    setIsPhotoLoading(false);
  };

  const handleSaveLog = async () => {
      if (!user || !result || !aiData) return;
      try {
          // Average for history
          const avgDose = parseFloat(((result.dose_min + result.dose_max) / 2).toFixed(1));
          const avgXe = parseFloat(((result.xe_min + result.xe_max) / 2).toFixed(1));

          await axios.post('/api/log', {
              telegram_id: user.telegram_id,
              current_sugar: parseFloat(sugar.replace(',', '.')),
              total_xe: avgXe,
              ai_raw_response: aiData,
              recommended_dose: avgDose,
              actual_dose: avgDose
          });
          alert(t.save_success);
          setCalculatorState({ sugar: "", result: null, aiData: null, previewUrls: [], base64Images: [] });
          setFoodText("");
      } catch(e) {
          alert(t.save_error);
      }
  };

  if (showSplash) {
    return (
      <div className="fixed inset-0 bg-[#0f1115] z-[100] flex flex-col items-center justify-center animate-out fade-out fill-mode-forwards duration-500 delay-[2000ms]">
         <div className="w-64 h-64 bg-indigo-500/20 rounded-full blur-[80px] absolute pointer-events-none" />
         <Calculator className="w-16 h-16 text-indigo-400 mb-4 animate-bounce" />
         <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400 tracking-tight animate-pulse">
            {t.app_title}
         </h1>
         <p className="text-slate-500 mt-2 font-medium tracking-wide">{t.ai_subtitle}</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen p-4 max-w-md mx-auto relative pb-28">
      
      {/* Header */}
      <header className="flex items-center justify-between mb-8 pt-4">
        <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400">
          {t.app_title} <span className="text-sm text-slate-500">(v2)</span>
        </h1>
        <div className="flex gap-2">
           {/* Language Selector */}
           <div className="flex bg-slate-800/50 rounded-full p-1 border border-slate-700/50 shadow-inner">
             <button onClick={() => setLanguage('ru')} className={cn("px-2 py-1 text-xs rounded-full transition-colors", language === 'ru' ? "bg-slate-700 text-white" : "text-slate-400 hover:text-white")}>🇷🇺</button>
             <button onClick={() => setLanguage('ua')} className={cn("px-2 py-1 text-xs rounded-full transition-colors", language === 'ua' ? "bg-slate-700 text-white" : "text-slate-400 hover:text-white")}>🇺🇦</button>
             <button onClick={() => setLanguage('en')} className={cn("px-2 py-1 text-xs rounded-full transition-colors", language === 'en' ? "bg-slate-700 text-white" : "text-slate-400 hover:text-white")}>🇬🇧</button>
           </div>
           
           <Link 
             href="/settings"
             className="p-2 rounded-full bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition shadow-lg"
           >
             <Settings className="w-5 h-5" />
           </Link>
        </div>
      </header>

      {/* Main Form */}
      <div className="space-y-6 relative z-10">
        
        {/* Background decorative blob */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-indigo-500/10 rounded-full blur-[80px] pointer-events-none" />
        
        {/* Sugar Input */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-400">{t.current_sugar}</label>
          <div className="relative">
            <input 
              type="number"
              inputMode="decimal"
              value={sugar}
              onChange={(e) => handleSugarChange(e.target.value)}
              placeholder={t.sugar_placeholder}
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
            multiple
            capture="environment" 
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
        />

        {/* Photo Previews */}
        {previewUrls.length > 0 && !result && (
            <div className="rounded-2xl overflow-x-auto glass-panel p-2 flex gap-3 animate-fade-in-up scrollbar-hide">
                {previewUrls.map((url, idx) => (
                  <div key={idx} className="h-32 min-w-[120px] rounded-xl overflow-hidden relative group shrink-0">
                      <img src={url} alt={`Preview ${idx+1}`} className="object-cover w-full h-full transition-transform duration-700 group-hover:scale-105" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60" />
                  </div>
                ))}

                {isPhotoLoading && (
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-md flex flex-col items-center justify-center gap-4 rounded-2xl z-20">
                        <div className="relative">
                           <div className="w-10 h-10 rounded-full border-t-2 border-b-2 border-indigo-400 animate-spin" />
                        </div>
                        <span className="text-white text-sm font-medium tracking-wide animate-pulse">{t.analyzing}</span>
                    </div>
                )}
            </div>
        )}

        {/* Text Clarification Field (Shown only if photo is uploaded and result not calculated) */}
        {!result && previewUrls.length > 0 && !sugarError && (
          <div className="space-y-4 animate-fade-in-up">
             <div className="space-y-2">
               <label className="text-sm font-medium text-slate-400">{t.clarification_label}</label>
               <input 
                 type="text"
                 value={foodText}
                 onChange={(e) => setFoodText(e.target.value)}
                 placeholder={t.clarification_placeholder}
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
                 {t.cancel}
               </button>
               <button 
                 onClick={handleStartAnalysis}
                 disabled={isPhotoLoading || base64Images.length === 0}
                 className="flex-[2] bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white p-4 rounded-2xl font-medium shadow-[0_8px_30px_rgb(99,102,241,0.3)] active:scale-95 transition-all disabled:opacity-50"
               >
                 {isPhotoLoading ? t.analyzing : t.analyze_btn}
               </button>
             </div>
          </div>
        )}

        {/* Photo Button (Only show if no photo selected) */}
        {previewUrls.length === 0 && (
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
                {!sugar ? t.enter_sugar_first : t.take_photo_btn}
            </span>
            {!sugarError && sugar && (
                <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/10 to-white/0 w-full rounded-2xl translate-x-[-100%] group-hover:animate-[shimmer_1.5s_infinite]" />
            )}
            </button>
        )}

        {/* Result Card */}
        {result && aiData && (
            <div className="glass-panel rounded-3xl p-6 space-y-6 animate-fade-in-up shadow-2xl relative overflow-hidden">
                <div className="absolute -top-24 -right-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-[60px]" />
                
                <div className="text-center space-y-2 pb-4 border-b border-white/5 relative z-10">
                    <p className="text-slate-400 text-sm font-medium tracking-wide">{t.ai_estimate_prefix} <strong className="text-white">{result.xe_min === result.xe_max ? result.xe_max : `${result.xe_min} - ${result.xe_max}`} ХЕ</strong></p>
                    <div className="flex justify-center items-center gap-2 text-blue-400">
                        <Syringe className="w-8 h-8" />
                        <span className="text-5xl font-bold">{result.dose_min === result.dose_max ? result.dose_max : `${result.dose_min}-${result.dose_max}`}</span>
                        <span className="text-xl font-medium self-end mb-1">{t.units}</span>
                    </div>
                    <p className="text-xs text-slate-500 pt-2">{t.coef_label} {result.coef} {result.dps > 0 && `(+${result.dps} ${t.dps_label})`}</p>
                </div>

                <div className="space-y-3">
                    <p className="text-sm font-medium text-slate-300 flex items-center gap-2">
                        <Wheat className="w-4 h-4 text-emerald-500" /> 
                        {t.recognized_items}
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

                <div className="text-[10px] sm:text-xs text-slate-500/80 leading-relaxed text-center italic mt-2">
                    {t.disclaimer}
                </div>

                <div className="flex gap-3 pt-2 border-t border-white/5">
                   <button 
                     onClick={handleResetAnalysis}
                     className="flex-1 glass-panel text-slate-300 p-4 rounded-2xl font-medium flex items-center justify-center transition-colors hover:bg-white/5 hover:text-white active:scale-95">
                       {t.recalculate}
                   </button>
                   <button 
                     onClick={handleSaveLog}
                     className="flex-[2] bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white p-4 rounded-2xl font-medium flex items-center justify-center gap-2 transition-all duration-300 active:scale-95 shadow-[0_8px_30px_rgb(16,185,129,0.3)] border border-white/10">
                       <Check className="w-5 h-5" />
                       {t.save_and_inject}
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
             <span className="text-xs font-medium tracking-wide">{t.calculator}</span>
          </Link>
          <Link href="/logs" className="flex-1 glass-panel text-slate-400 hover:text-white rounded-2xl p-4 flex flex-col items-center gap-1.5 active:scale-95 transition-all duration-300 hover:bg-white/5">
             <History className="w-5 h-5" />
             <span className="text-xs font-medium tracking-wide">{t.history}</span>
          </Link>
        </div>
      </div>

    </main>
  );
}
