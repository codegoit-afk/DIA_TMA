"use client";

import { useState, useRef, useEffect, useCallback, Suspense } from "react";
import { Camera, Calculator, Settings, History, AlertCircle, Syringe, Wheat, Check, UtensilsCrossed, BookmarkPlus, TrendingUp } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from 'next/navigation';
import { cn } from "@/lib/utils/utils";

import axios from "axios";
import { useUser } from "@/components/providers/TelegramProvider";
import { AIResponse } from "@/types";

declare global {
  interface Window {
    Telegram?: any;
  }
}

export default function Home() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#030712]" />}>
      <HomeContent />
    </Suspense>
  );
}

function HomeContent() {
  const { user, calculatorState, setCalculatorState, t, language, setLanguage, showSplash } = useUser();
  const { sugar, previewUrls, base64Images, result, aiData } = calculatorState;

  const [isPhotoLoading, setIsPhotoLoading] = useState(false);
  const [sugarError, setSugarError] = useState<string | null>(null);
  const [foodText, setFoodText] = useState<string>(""); 
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // CGM State
  const [cgmData, setCgmData] = useState<{ glucose: number; direction: string; timestamp: string } | null>(null);
  const [isFetchingCgm, setIsFetchingCgm] = useState(false);

  // IOB (Insulin on Board)
  const [iob, setIob] = useState<number>(0);

  // My Foods - Quick log
  const [xeOverride, setXeOverride] = useState<string>(""); // Manual XE correction
  const [quickFoodName, setQuickFoodName] = useState<string | null>(null);
  const searchParams = useSearchParams();

  useEffect(() => {
    if (toastMessage) {
       const timer = setTimeout(() => setToastMessage(null), 3000);
       return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  useEffect(() => {
    // Hide BackButton on Home
    // @ts-ignore
    const WebApp = window.Telegram?.WebApp;
    if (WebApp) {
      WebApp.BackButton.hide();
    }
  }, []);

  useEffect(() => {
    async function fetchCgm() {
      if (!user) return;
      setIsFetchingCgm(true);
      try {
        const res = await axios.get(`/api/cgm/fetch?telegram_id=${user.telegram_id}`);
        if (res.data.success && res.data.active && res.data.data) {
          const { glucose, direction, dateString } = res.data.data;
          setCgmData({ glucose, direction, timestamp: dateString });
          
          setCalculatorState(prev => {
             // Only auto-fill if the user hasn't typed anything yet or it matches old CGM value
             if (!prev.sugar || prev.sugar === cgmData?.glucose.toString()) {
                 return { ...prev, sugar: glucose.toString() };
             }
             return prev;
          });
        }
      } catch (e) {
        // Silently fail if no CGM configured or error
      } finally {
        setIsFetchingCgm(false);
      }
    }
    fetchCgm();
    
    // Auto-refresh every 3 minutes
    const interval = setInterval(fetchCgm, 3 * 60 * 1000);
    return () => clearInterval(interval);
  }, [user]);

  const getTrendArrow = (dir: string) => {
    const arrows: Record<string, string> = {
        'DoubleUp': '⇈', 'SingleUp': '↑', 'FortyFiveUp': '↗',
        'Flat': '→', 'FortyFiveDown': '↘', 'SingleDown': '↓', 'DoubleDown': '⇊'
    };
    return arrows[dir] || '';
  };

  // Handle ?quick_food=X&quick_xe=Y navigation from My Foods page
  useEffect(() => {
    const qName = searchParams?.get('quick_food');
    const qXe = searchParams?.get('quick_xe');
    if (qName && qXe) {
      setQuickFoodName(qName);
      setXeOverride(qXe);
      setCalculatorState(prev => ({ ...prev, result: {
        dose_min: 0, dose_max: 0,
        xe_min: parseFloat(qXe), xe_max: parseFloat(qXe),
        coef: 0, dps: 0, is_high_fat: false
      }, aiData: null }));
    }
  }, [searchParams]);
  
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
      let userXeWeight = 12;
      try {
         const profileRes = await axios.get(`/api/profile?telegram_id=${activeUser.telegram_id}`);
         if (profileRes.data.success && profileRes.data.data && profileRes.data.data.xe_weight) {
             userXeWeight = profileRes.data.data.xe_weight;
         }
      } catch (e) {
         console.warn("Failed to fetch xe_weight, using default", e);
      }

      const aiResponse = await axios.post('/api/analyze', { 
          imageBase64Array: base64Images,
          xeWeight: userXeWeight,
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
              dps: calcData.dps_added,
              is_high_fat: aiOutput.high_fat || false
          }
      }));

      // Fetch IOB silently to display in result card
      try {
          const iobRes = await axios.get(`/api/iob?telegram_id=${activeUser.telegram_id}`);
          if (iobRes.data.success) setIob(iobRes.data.iob || 0);
      } catch { /* silently ignore */ }

    } catch (error: any) {
      console.error("Upload error full detail:", error);
      const errMsg = error.response?.data?.error || error.message || "Error";
      setSugarError(errMsg);
      setToastMessage(errMsg);
    } finally {
      setIsPhotoLoading(false);
    }
  };

  const handleResetAnalysis = () => {
    setCalculatorState(prev => ({...prev, previewUrls: [], base64Images: [], result: null, aiData: null}));
    setFoodText("");
    setXeOverride("");
    setQuickFoodName(null);
    setIsPhotoLoading(false);
  };

  const handleSaveLog = async () => {
      const activeUser = user || { telegram_id: 11111111 };
      if (!result || !aiData) return;
      
      try {
          // Average for history — use xeOverride if user corrected
          const effectiveXe = xeOverride && parseFloat(xeOverride) > 0 ? parseFloat(xeOverride) : parseFloat(((result.xe_min + result.xe_max) / 2).toFixed(1));
          const avgDose = parseFloat(((result.dose_min + result.dose_max) / 2).toFixed(1));
          const avgXe = parseFloat(((result.xe_min + result.xe_max) / 2).toFixed(1));

          await axios.post('/api/log', {
              telegram_id: activeUser.telegram_id,
              current_sugar: parseFloat(sugar.replace(',', '.')),
              total_xe: effectiveXe,
              xe_corrected: xeOverride && parseFloat(xeOverride) !== avgXe ? parseFloat(xeOverride) : null,
              ai_raw_response: aiData || { items_breakdown: [{ name: quickFoodName || 'Quick log', xe: effectiveXe, estimated_weight_g: 0, carbs_per_100g: 0, total_carbs_g: 0 }], xe_min: effectiveXe, xe_max: effectiveXe, glycemic_alert: null, high_fat: false, thinking_process: { hand_scale_cm: '', analysis: '' } },
              recommended_dose: avgDose,
              actual_dose: avgDose
          });
          
          // PHASE 10: Schedule Reminder if High Fat
          if (result.is_high_fat) {
              const remainingDose = Math.round(result.dose_max * 0.2 * 2) / 2;
              await axios.post('/api/reminders/schedule', {
                  telegram_id: activeUser.telegram_id,
                  message: `⏱ <b>Напоминание!</b> Прошло 2 часа после плотного (жирного) приема пищи.\n\nРекомендовано доколоть оставшуюся часть дозы: <b>${remainingDose} ед.</b>`,
                  hours_delay: 2,
                  type: 'high_fat_split'
              }).catch(err => console.error("Failed to schedule reminder:", err));
          }

          setToastMessage(t.save_success);
          setCalculatorState({ sugar: "", result: null, aiData: null, previewUrls: [], base64Images: [] });
          setFoodText("");
          setXeOverride("");
          setQuickFoodName(null);
      } catch(e: any) {
          console.error(e);
          setToastMessage(t.save_error);
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
      
      {/* Header (Cleaned up, only Settings gear) */}
      <header className="flex items-center justify-end mb-8 pt-4 relative z-10 w-full">
         <Link 
           href="/settings"
           onClick={() => {
               if (window.Telegram?.WebApp?.HapticFeedback) {
                   window.Telegram.WebApp.HapticFeedback.impactOccurred('light');
               }
           }}
           className="p-3 bg-white/5 backdrop-blur-md border border-white/10 rounded-full text-gray-400 hover:text-white transition-all shadow-lg hover:shadow-[0_0_15px_rgba(255,255,255,0.1)]"
         >
           <Settings className="w-6 h-6" />
         </Link>
      </header>

      {/* Main Form */}
      <div className="space-y-6 relative z-10 pb-20">
        
        {/* Background decorative blob */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none" />
        
        {/* Sugar Input - GIANT and CLEAN */}
        <div className="flex flex-col items-center justify-center py-10 space-y-4">
          <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-500">{t.current_sugar}</label>
              {isFetchingCgm && <div className="w-3 h-3 rounded-full border-t-2 border-emerald-400 animate-spin" />}
          </div>

          <div className="relative w-full max-w-[200px]">
            {cgmData && (
                <div className="absolute -right-8 top-1/2 -translate-y-1/2 flex flex-col items-center justify-center text-emerald-400 animate-fade-in-up">
                    <span className="text-3xl font-black drop-shadow-[0_0_10px_rgba(52,211,153,0.8)]">{getTrendArrow(cgmData.direction)}</span>
                </div>
            )}
            <input 
              type="number"
              inputMode="decimal"
              value={sugar}
              onChange={(e) => handleSugarChange(e.target.value)}
              placeholder="0.0"
              className={cn(
                "w-full bg-transparent text-center text-[5rem] font-black text-white focus:outline-none transition-all duration-300 placeholder:text-gray-800",
                sugarError ? "text-red-400 drop-shadow-[0_0_20px_rgba(239,68,68,0.5)]" : "focus:drop-shadow-[0_0_30px_rgba(52,211,153,0.3)]"
              )}
            />
          </div>
          
          {/* Alert */}
          {sugarError && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-3xl flex gap-3 animate-fade-in-up w-full mt-4">
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
            <div className="rounded-3xl overflow-x-auto bg-white/5 backdrop-blur-xl border border-white/10 p-2 flex gap-3 animate-fade-in-up scrollbar-hide shadow-2xl">
                {previewUrls.map((url, idx) => (
                  <div key={idx} className="h-40 min-w-[140px] rounded-2xl overflow-hidden relative group shrink-0 shadow-lg border border-white/10">
                      <img src={url} alt={`Preview ${idx+1}`} className="object-cover w-full h-full transition-transform duration-700 group-hover:scale-105" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60" />
                  </div>
                ))}

                {isPhotoLoading && (
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-md flex flex-col items-center justify-center gap-4 rounded-3xl z-20">
                        <div className="relative">
                           <div className="w-12 h-12 rounded-full border-t-2 border-b-2 border-emerald-400 animate-spin" />
                        </div>
                        <span className="text-emerald-400 font-bold tracking-widest uppercase text-xs animate-pulse">{t.analyzing}</span>
                    </div>
                )}
            </div>
        )}

        {/* Text Clarification Field (Shown only if photo is uploaded and result not calculated) */}
        {!result && previewUrls.length > 0 && !sugarError && (
          <div className="space-y-4 animate-fade-in-up">
             <div className="space-y-2">
               <label className="text-xs font-medium text-gray-500 tracking-wide uppercase">{t.clarification_label}</label>
               <input 
                 type="text"
                 value={foodText}
                 onChange={(e) => setFoodText(e.target.value)}
                 placeholder={t.clarification_placeholder}
                 className="w-full bg-black/20 rounded-xl p-4 text-white font-medium border border-white/10 focus:ring-2 focus:ring-emerald-500/50 focus:outline-none transition-all placeholder:text-gray-600 shadow-inner"
               />
             </div>
             
             {/* Action Buttons for Analysis */}
             <div className="flex gap-3">
               <button 
                 onClick={() => {
                     handleResetAnalysis();
                     if (window.Telegram?.WebApp?.HapticFeedback) {
                         window.Telegram.WebApp.HapticFeedback.impactOccurred('light');
                     }
                 }}
                 disabled={isPhotoLoading}
                 className="flex-1 bg-white/5 backdrop-blur-md border border-white/10 text-gray-400 p-4 rounded-2xl font-bold transition-all hover:bg-white/10 hover:text-white active:scale-95 disabled:opacity-50"
               >
                 {t.cancel}
               </button>
               <button 
                 onClick={() => {
                     if (window.Telegram?.WebApp?.HapticFeedback) {
                         window.Telegram.WebApp.HapticFeedback.impactOccurred('medium');
                     }
                     handleStartAnalysis();
                 }}
                 disabled={isPhotoLoading || base64Images.length === 0}
                 className="flex-[2] bg-gradient-to-r from-emerald-400 to-cyan-500 hover:from-emerald-300 hover:to-cyan-400 text-gray-900 p-4 rounded-2xl font-black shadow-[0_0_20px_rgba(52,211,153,0.3)] active:scale-95 transition-all disabled:opacity-50 uppercase tracking-wide"
               >
                 {isPhotoLoading ? t.analyzing : t.analyze_btn}
               </button>
             </div>
          </div>
        )}

        {/* Photo Button (Only show if no photo selected) */}
        {previewUrls.length === 0 && (
            <button
            onClick={() => {
                if (window.Telegram?.WebApp?.HapticFeedback) {
                    window.Telegram.WebApp.HapticFeedback.impactOccurred('light');
                }
                fileInputRef.current?.click();
            }}
            disabled={!!sugarError || !sugar}
            className={cn(
                "w-full group relative overflow-hidden rounded-3xl p-6 py-8 flex flex-col items-center justify-center gap-4 transition-all duration-300 active:scale-95",
                (sugarError || !sugar) ? "bg-white/5 backdrop-blur-sm border border-white/5 opacity-50 text-gray-600 cursor-not-allowed" :
                "bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 backdrop-blur-xl border border-emerald-500/30 shadow-[0_0_30px_rgba(52,211,153,0.15)] hover:shadow-[0_0_50px_rgba(52,211,153,0.3)] hover:bg-emerald-500/30"
            )}
            >
            <Camera className={cn("w-14 h-14 transition-transform group-hover:scale-110", (sugarError || !sugar) ? "text-gray-600" : "text-emerald-400")} />
            <span className="font-extrabold tracking-tight text-xl text-white">
                {!sugar ? t.enter_sugar_first : t.take_photo_btn}
            </span>
            {!sugarError && sugar && (
                <div className="absolute inset-0 bg-gradient-to-tr from-emerald-400/0 via-emerald-400/10 to-emerald-400/0 w-full rounded-3xl translate-x-[-100%] group-hover:animate-[shimmer_1.5s_infinite]" />
            )}
            </button>
        )}

        {/* Result Card */}
        {result && aiData && (
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2rem] p-6 space-y-6 animate-fade-in-up shadow-2xl relative overflow-hidden">
                <div className="absolute -top-32 -right-32 w-64 h-64 bg-emerald-500/10 rounded-full blur-[80px]" />
                
                <div className="text-center space-y-4 pb-6 border-b border-white/5 relative z-10 w-full flex flex-col items-center justify-center">
                    <p className="text-gray-400 text-sm font-medium tracking-wide uppercase">{t.ai_estimate_prefix} <strong className="text-white bg-black/20 px-2 py-0.5 rounded-md ml-1 border border-white/5">{result.xe_min === result.xe_max ? result.xe_max : `${result.xe_min} - ${result.xe_max}`} ХЕ</strong></p>
                    
                    {result.is_high_fat ? (
                        <div className="flex flex-col items-center gap-2 pt-2 w-full">
                           <div className="flex items-center justify-center gap-2 text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400 w-full">
                               <span className="text-[5rem] font-black tracking-tighter leading-none">{Math.round(result.dose_max * 0.8 * 2) / 2}</span>
                               <span className="text-2xl font-bold self-end mb-2 text-cyan-400">{t.units}</span>
                           </div>
                           <p className="text-xs text-gray-400 tracking-widest uppercase font-bold bg-black/20 px-3 py-1 rounded-full border border-white/5 shadow-inner">({t.dose_now})</p>
                           
                           <div className="flex items-center justify-center gap-2 text-cyan-500 mt-4 w-full">
                               <span className="text-4xl font-black opacity-90 tracking-tighter">+{Math.round(result.dose_max * 0.2 * 2) / 2}</span>
                               <span className="text-xl font-bold self-end mb-1 opacity-90">{t.units}</span>
                           </div>
                           <p className="text-[10px] text-gray-500 tracking-widest uppercase font-bold opacity-80 mt-1">({t.dose_later})</p>
                        </div>
                    ) : (
                        <div className="flex justify-center items-center gap-2 text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400 w-full">
                            <span className="text-[6rem] font-black tracking-tighter leading-none py-2">{result.dose_min === result.dose_max ? result.dose_max : `${result.dose_min}-${result.dose_max}`}</span>
                            <span className="text-2xl font-bold self-end mb-4 text-cyan-400">{t.units}</span>
                        </div>
                    )}
                    
                    <p className="text-xs text-gray-500 font-medium bg-black/20 px-3 py-1 rounded-full border border-white/5 mt-4">{t.coef_label} {result.coef} {result.dps > 0 && <span className="text-emerald-400 font-bold ml-1">+{result.dps} {t.dps_label}</span>}</p>
                    {iob > 0 && (
                      <div className="flex items-center gap-2 mt-2 px-3 py-1.5 bg-purple-500/10 border border-purple-500/30 rounded-full">
                        <Syringe className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
                        <span className="text-xs font-semibold text-purple-300">{t.iob_active || "Активный инсулин"}: <strong>{iob} {t.units}</strong> ({t.iob_note || "учтен в дозе"})</span>
                      </div>
                    )}
                </div>

                {/* XE Override + Quick food label */}
                <div className="bg-blue-500/5 border border-blue-500/20 rounded-2xl p-4 space-y-2">
                  {quickFoodName && (
                    <p className="text-xs text-blue-400 font-bold flex items-center gap-1.5 mb-1">
                      <UtensilsCrossed className="w-3.5 h-3.5" />
                      {t.quick_log_desc}: <span className="text-white">{quickFoodName}</span>
                    </p>
                  )}
                  <div className="flex items-center gap-3">
                    <label className="text-xs font-medium text-gray-400 flex-1">{t.correct_xe || "Уточнить ХЕ"}</label>
                    <input
                      type="number"
                      step="0.5"
                      value={xeOverride}
                      onChange={(e) => setXeOverride(e.target.value)}
                      placeholder={result.xe_max.toString()}
                      className="w-24 bg-black/20 border border-white/10 rounded-xl px-3 py-2 text-white text-center font-black text-lg focus:ring-2 focus:ring-blue-500/50 focus:outline-none transition-all"
                    />
                    <span className="text-gray-500 text-sm font-bold">ХЕ</span>
                  </div>
                </div>

                <div className="space-y-4">
                    {result.is_high_fat && (
                        <div className="text-xs bg-amber-500/10 p-4 rounded-2xl border border-amber-500/30 text-amber-200 animate-fade-in-up shadow-inner relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-20 h-20 bg-amber-500/20 blur-2xl rounded-full" />
                            <p className="font-extrabold flex items-center gap-2 mb-2 text-amber-400/90 tracking-wide uppercase text-[10px]"><AlertCircle className="w-4 h-4 text-amber-500"/> {t.fat_alert_title}</p>
                            <p className="opacity-90 leading-relaxed text-[11px] sm:text-xs text-amber-100 font-medium relative z-10">{t.fat_alert_desc}</p>
                        </div>
                    )}
                    <p className="text-xs font-bold text-gray-500 flex items-center gap-2 tracking-wide uppercase mb-1">
                        <Wheat className="w-4 h-4 text-emerald-500" /> 
                        {t.recognized_items}
                    </p>
                    <div className="bg-black/20 border border-white/5 rounded-2xl overflow-hidden shadow-inner flex flex-col">
                        {aiData.items_breakdown.map((item, idx) => (
                            <div key={idx} className={cn(
                                "flex justify-between items-center text-sm p-4 animate-fade-in-up", 
                                idx !== aiData.items_breakdown.length - 1 ? "border-b border-white/5" : ""
                            )} style={{ animationDelay: `${idx * 100}ms` }}>
                                <span className="text-gray-300 font-medium">{item.name}</span>
                                <span className="font-extrabold text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded-md">{item.xe} ХЕ</span>
                            </div>
                        ))}
                    </div>
                    {aiData.glycemic_alert && (
                        <div className="text-xs text-orange-400 bg-orange-500/10 p-4 rounded-2xl border border-orange-500/20 shadow-inner font-medium leading-relaxed">
                            {aiData.glycemic_alert}
                        </div>
                    )}
                </div>

                <div className="flex flex-col gap-3 pt-4 border-t border-white/5">
                   {aiData && !quickFoodName && (
                     <button
                       onClick={async () => {
                         if (!user) return;
                         window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('medium');
                         const nameParts = aiData.items_breakdown.map(i => i.name).join(' + ');
                         const totalXe = xeOverride && parseFloat(xeOverride) > 0 ? parseFloat(xeOverride) : result.xe_max;
                         try {
                           await axios.post('/api/my-foods', { telegram_id: user.telegram_id, name: nameParts, xe: totalXe });
                           setToastMessage(t.food_saved || 'Блюдо сохранено!');
                         } catch { setToastMessage(t.save_error); }
                       }}
                       className="w-full bg-amber-500/10 border border-amber-500/20 text-amber-300 p-3.5 rounded-2xl font-bold flex items-center justify-center gap-2 active:scale-95 transition-transform"
                     >
                       <BookmarkPlus className="w-4 h-4" />
                       {t.save_to_my_foods}
                     </button>
                   )}
                   <div className="flex gap-3">
                     <button
                       onClick={() => {
                           handleResetAnalysis();
                           window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light');
                       }}
                       className="flex-1 bg-black/20 border border-white/5 text-gray-400 p-4 rounded-2xl font-bold flex items-center justify-center transition-all hover:bg-white/5 hover:text-white active:scale-95 shadow-inner">
                       {t.recalculate}
                     </button>
                     <button
                       onClick={() => {
                           window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('heavy');
                           handleSaveLog();
                       }}
                       className="flex-[2] bg-gradient-to-r from-emerald-400 to-cyan-500 hover:opacity-90 text-gray-900 p-4 rounded-2xl font-extrabold flex items-center justify-center gap-2 transition-transform duration-200 active:scale-95 shadow-[0_0_20px_rgba(52,211,153,0.3)] uppercase tracking-wide">
                       <Check className="w-5 h-5 flex-shrink-0" />
                       <span className="truncate">{t.save_and_inject}</span>
                     </button>
                   </div>
                </div>
            </div>
        )}

      </div>

      {/* Navigation Footer (Floating iOS Style) */}
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-[#030712] via-[#030712]/90 to-transparent pointer-events-none z-40">
        <div className="max-w-md mx-auto flex gap-2 pointer-events-auto bg-white/5 backdrop-blur-2xl border border-white/10 p-2 rounded-3xl shadow-2xl">
          <Link 
            href="/" 
            onClick={() => window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light')}
            className="flex-1 bg-white/10 text-white rounded-2xl p-3 flex flex-col items-center gap-1 active:scale-95 transition-all duration-200 shadow-inner">
             <Calculator className="w-5 h-5 text-emerald-400" />
             <span className="text-[10px] font-extrabold tracking-widest uppercase">{t.calculator}</span>
          </Link>
          <Link 
            href="/my-foods"
            onClick={() => window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light')}
            className="flex-1 text-gray-500 hover:text-white rounded-2xl p-3 flex flex-col items-center gap-1 active:scale-95 transition-all duration-200 hover:bg-white/5">
             <UtensilsCrossed className="w-5 h-5" />
             <span className="text-[10px] font-bold tracking-widest uppercase">{t.food_nav || "Еда"}</span>
          </Link>
          <Link 
            href="/logs" 
            onClick={() => window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light')}
            className="flex-1 text-gray-500 hover:text-white rounded-2xl p-3 flex flex-col items-center gap-1 active:scale-95 transition-all duration-200 hover:bg-white/5">
             <History className="w-5 h-5" />
             <span className="text-[10px] font-bold tracking-widest uppercase">{t.history}</span>
          </Link>
          <Link 
            href="/analytics"
            onClick={() => window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light')}
            className="flex-1 text-gray-500 hover:text-white rounded-2xl p-3 flex flex-col items-center gap-1 active:scale-95 transition-all duration-200 hover:bg-white/5">
             <TrendingUp className="w-5 h-5" />
             <span className="text-[10px] font-bold tracking-widest uppercase">{t.analytics_nav || "Тренды"}</span>
          </Link>
          <Link 
            href="/settings" 
            onClick={() => window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light')}
            className="flex-1 text-gray-500 hover:text-white rounded-2xl p-3 flex flex-col items-center gap-1 active:scale-95 transition-all duration-200 hover:bg-white/5">
             <Settings className="w-5 h-5" />
             <span className="text-[10px] font-bold tracking-widest uppercase">{t.settings}</span>
          </Link>
        </div>
      </div>

      {/* Floating Snackbar for Toasts */}
      {toastMessage && (
          <div className="fixed bottom-32 left-0 right-0 flex justify-center z-50 animate-in slide-in-from-bottom-5 fade-in pointer-events-none px-4">
              <div className="bg-gray-900 border border-white/10 text-white px-5 py-3 rounded-full flex items-center gap-3 shadow-2xl backdrop-blur-xl">
                  {toastMessage.includes("Error") || toastMessage.includes("Ошибка") ? (
                      <AlertCircle className="w-5 h-5 text-red-500" />
                  ) : (
                      <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/50">
                          <Check className="w-3 h-3 text-emerald-400" />
                      </div>
                  )}
                  <span className="text-sm font-semibold">{toastMessage}</span>
              </div>
          </div>
      )}

    </main>
  );
}
