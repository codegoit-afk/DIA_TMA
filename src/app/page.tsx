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
      if (!user || !user.telegram_id) return;
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

  // Resize and compress image for mobile stability (Vercel payload limits)
  const resizeImage = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1024;
        const MAX_HEIGHT = 1024;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        // Compress as JPEG 0.7
        resolve(canvas.toDataURL('image/jpeg', 0.7).split(',')[1]);
      };
      img.src = URL.createObjectURL(file);
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) {
      alert(t.no_file_error);
      return;
    }
    
    // Clear previous state if new files are selected
    setCalculatorState(prev => ({...prev, previewUrls: [], base64Images: [], result: null, aiData: null}));
    setSugarError(null);
    
    const tempUrls = files.map(f => URL.createObjectURL(f));
    setCalculatorState(prev => ({...prev, previewUrls: tempUrls}));

    setIsPhotoLoading(true);

    try {
      const resizedB64s = await Promise.all(files.map(f => resizeImage(f)));
      setCalculatorState(prev => ({...prev, base64Images: resizedB64s}));
    } catch(e) {
      alert(t.file_read_error);
    } finally {
      setIsPhotoLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleStartAnalysis = async () => {
    if (base64Images.length === 0) return;

    const activeUser = (user && user.telegram_id) ? user : { telegram_id: 804617505, username: 'admin', first_name: 'Owner', role: 'admin', created_at: new Date().toISOString() };

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
      if (!aiOutput || !aiOutput.items_breakdown) {
          throw new Error("Не удалось распознать еду. Попробуйте другое фото.");
      }
      setCalculatorState(prev => ({...prev, aiData: aiOutput}));

      // Calculate Dose (using average XE for calculation, but sending min/max)
      const sugarValue = sugar || "5.5";
      let currentSugarNum = parseFloat(sugarValue.toString().replace(',', '.'));
      if (isNaN(currentSugarNum)) currentSugarNum = 5.5;

      const calcResponse = await axios.post('/api/calculate', {
          telegram_id: activeUser.telegram_id,
          current_sugar: currentSugarNum,
          total_xe: aiOutput.xe_max || 0
      });

      if (calcResponse.data.error) throw new Error(calcResponse.data.error);
      
      const calcData = calcResponse.data.data;
      if (!calcData) throw new Error("Ошибка расчета дозы. Проверьте настройки коэффициентов.");
      
      // We will define dose_min based on xe_min safely using coef
      const dose_max = calcData.recommended_dose;
      const xeMin = aiOutput.xe_min || 0;
      const activeCoef = calcData.active_coef || 1.0;
      const dpsAdded = calcData.dps_added || 0;
      const dose_min = parseFloat(((xeMin * activeCoef) + dpsAdded).toFixed(1));

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
      const activeUser = (user && user.telegram_id) ? user : { telegram_id: 804617505 };
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

  return (
    <main className="min-h-screen p-4 max-w-[375px] mx-auto relative pb-36">
      {/* Global Splash Screen Overlay */}
      {showSplash && (
        <div className="fixed inset-0 bg-[#F8F4F0] z-[100] flex flex-col items-center justify-center pointer-events-none transition-opacity duration-1000 opacity-100">
           <Calculator className="w-16 h-16 text-emerald-500 mb-4 animate-bounce" />
           <h1 className="text-3xl font-black text-[#111827] tracking-tight animate-pulse">
              DIA <span className="font-thin text-emerald-500">AI</span>
           </h1>
        </div>
      )}
      
      {/* Header (Symmetrical, Logo in center) */}
      <header className="flex items-center justify-between mb-8 pt-6 relative z-10 w-full px-2">
         <div className="w-10" /> {/* Spacer for symmetry */}
         <h1 className="text-2xl font-black text-[#111827] tracking-tighter">
            DIA <span className="font-light bg-clip-text text-transparent bg-gradient-to-r from-emerald-500 to-cyan-500">AI</span>
         </h1>
         <Link 
           href="/settings"
           onClick={() => window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light')}
           className="w-10 h-10 flex items-center justify-center nm-outset nm-active rounded-xl text-gray-400 transition-all"
         >
           <Settings className="w-5 h-5" />
         </Link>
      </header>

      {/* Main Content Area */}
      <div className="space-y-8 relative z-10">
        
        {/* Sugar Input Section */}
        {!result && (
          <div className="space-y-2 animate-fade-in-up">
            <label className="text-xs font-medium text-gray-400 ml-1 uppercase tracking-wider">
              {t.current_sugar}
            </label>
            <div className="nm-inset rounded-[2.5rem] p-10 flex flex-col items-center justify-center relative overflow-hidden">
               {isFetchingCgm && (
                 <div className="absolute top-4 right-4 w-4 h-4 rounded-full border-t-2 border-emerald-500 animate-spin" />
               )}
               {cgmData && (
                 <div className="absolute left-6 top-1/2 -translate-y-1/2 flex flex-col items-center text-emerald-500 animate-pulse">
                    <span className="text-2xl font-black">{getTrendArrow(cgmData.direction)}</span>
                 </div>
               )}
               <input 
                 type="number"
                 inputMode="decimal"
                 value={sugar}
                 onChange={(e) => handleSugarChange(e.target.value)}
                 placeholder="5.5"
                 className={cn(
                   "w-full bg-transparent text-center text-7xl font-black text-[#111827] focus:outline-none placeholder:text-gray-200 transition-all",
                   sugarError ? "text-red-500" : ""
                 )}
               />
            </div>
            {sugarError && (
              <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-xs font-medium border border-red-100 flex gap-2 animate-shake">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {sugarError}
              </div>
            )}
          </div>
        )}

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

        {/* AI Action Button / Previews */}
        {!result && (
          <div className="space-y-6">
             {previewUrls.length > 0 ? (
                <div className="space-y-4">
                  <div className="nm-inset rounded-3xl p-3 flex gap-3 overflow-x-auto scrollbar-hide">
                    {previewUrls.map((url, idx) => (
                      <div key={idx} className="h-32 min-w-[120px] rounded-2xl overflow-hidden shadow-sm border border-white/50">
                        <img src={url} alt="food" className="w-full h-full object-cover" />
                      </div>
                    ))}
                    {isPhotoLoading && (
                      <div className="h-32 min-w-[120px] rounded-2xl bg-gray-100 animate-pulse flex items-center justify-center">
                        <div className="w-6 h-6 border-t-2 border-emerald-500 animate-spin rounded-full" />
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-gray-500 ml-1 uppercase tracking-wider">{t.clarification_label}</label>
                    <div className="nm-inset rounded-2xl p-1">
                      <input 
                        type="text"
                        value={foodText}
                        onChange={(e) => setFoodText(e.target.value)}
                        placeholder={t.clarification_placeholder}
                        className="w-full bg-transparent p-4 text-sm font-medium text-[#111827] focus:outline-none placeholder:text-gray-400"
                      />
                    </div>
                  </div>

                  <div className="flex gap-4 pt-2">
                    <button 
                      onClick={handleResetAnalysis}
                      className="flex-1 nm-outset nm-active rounded-2xl p-4 text-gray-500 font-bold transition-all"
                    >
                      {t.cancel}
                    </button>
                    <button 
                      onClick={() => {
                        window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('medium');
                        handleStartAnalysis();
                      }}
                      disabled={isPhotoLoading}
                      className="flex-[2] nm-outset nm-active bg-emerald-500 rounded-2xl p-4 text-white font-black uppercase tracking-widest shadow-[inset_0_0_20px_rgba(255,255,255,0.2)]"
                    >
                      {isPhotoLoading ? t.analyzing : t.analyze_btn}
                    </button>
                  </div>
                </div>
             ) : (
                <div className="flex flex-col items-center justify-center py-6">
                  <button
                    onClick={() => {
                        window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light');
                        fileInputRef.current?.click();
                    }}
                    disabled={!sugar || sugarError !== null}
                    className={cn(
                        "w-48 h-48 rounded-[3rem] flex flex-col items-center justify-center gap-4 transition-all duration-300 active:scale-95 group",
                        (!sugar || sugarError) ? "opacity-40 grayscale" : "nm-outset nm-active p-8"
                    )}
                  >
                    <div className="w-20 h-20 rounded-full bg-emerald-50 flex items-center justify-center shadow-[0_0_30px_rgba(52,211,153,0.2)] group-hover:shadow-[0_0_50px_rgba(52,211,153,0.4)] transition-all">
                        <Camera className="w-10 h-10 text-emerald-500 group-hover:scale-110 transition-transform" />
                    </div>
                    <span className="text-sm font-black text-[#111827] uppercase tracking-widest">
                       {t.analyze_btn}
                    </span>
                  </button>
                  {!sugar && (
                    <p className="text-[10px] font-bold text-gray-400 mt-6 uppercase tracking-widest animate-pulse">
                       {t.enter_sugar_first}
                    </p>
                  )}
                </div>
             )}
          </div>
        )}

        {/* Result Card (When calculation finished) */}
        {result && aiData && (
          <div className="space-y-8 animate-fade-in-up">
             {/* Dosage Highlight */}
             <div className="nm-inset rounded-[3rem] p-8 flex flex-col items-center space-y-4">
                <span className="text-xs font-bold text-gray-400 tracking-widest uppercase">{t.recommended_dose}</span>
                <div className="flex items-center gap-3">
                   <h2 className="text-7xl font-black bg-clip-text text-transparent bg-gradient-to-br from-emerald-500 to-cyan-600 tracking-tighter">
                      {result.dose_min === result.dose_max ? result.dose_max : `${result.dose_min}-${result.dose_max}`}
                   </h2>
                   <span className="text-2xl font-black text-cyan-600 self-end mb-2 uppercase">{t.units}</span>
                </div>
                {result.is_high_fat && (
                   <div className="nm-outset-sm rounded-full px-4 py-1.5 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                      <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest">{t.fat_alert_title}</span>
                   </div>
                )}
             </div>

             {/* Calculation Details */}
             <div className="grid grid-cols-2 gap-4">
                <div className="nm-outset-sm rounded-3xl p-4 flex flex-col items-center gap-1">
                   <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t.ai_estimate_prefix}</span>
                   <span className="text-xl font-black text-[#111827]">{result.xe_min === result.xe_max ? result.xe_max : `${result.xe_min}-${result.xe_max}`} ХЕ</span>
                </div>
                <div className="nm-outset-sm rounded-3xl p-4 flex flex-col items-center gap-1">
                   <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t.coef_label}</span>
                   <span className="text-xl font-black text-[#111827]">{result.coef}</span>
                </div>
             </div>

             {/* Items Breakdown */}
             <div className="space-y-3">
                <h3 className="text-xs font-black text-gray-500 ml-2 uppercase tracking-widest">{t.recognized_items}</h3>
                <div className="nm-inset rounded-3xl p-2 space-y-1">
                   {aiData.items_breakdown.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center p-4">
                         <span className="text-sm font-bold text-[#111827]">{item.name}</span>
                         <span className="text-sm font-black text-emerald-500">{item.xe} ХЕ</span>
                      </div>
                   ))}
                </div>
             </div>

             {/* Action Bar */}
             <div className="flex gap-4">
                <button 
                   onClick={handleResetAnalysis}
                   className="flex-1 nm-outset nm-active p-5 rounded-3xl text-gray-500 font-bold uppercase tracking-widest transition-all"
                >
                   {t.recalculate}
                </button>
                <button 
                   onClick={() => {
                      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success');
                      handleSaveLog();
                   }}
                   className="flex-[2] nm-outset nm-active bg-emerald-500 p-5 rounded-3xl text-white font-black uppercase tracking-widest flex items-center justify-center gap-2"
                >
                   <Check className="w-5 h-5" />
                   {t.save_and_inject}
                </button>
             </div>
          </div>
        )}

      </div>

      {/* Toast Notification */}
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
