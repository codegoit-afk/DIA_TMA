"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { 
  Camera, 
  Settings, 
  History, 
  ChevronRight, 
  Check, 
  AlertCircle,
  TrendingUp,
  Clock,
  Mic,
  ArrowRight,
  Info,
  Calendar,
  Loader2,
  Image as ImageIcon
} from "lucide-react";
import Link from "next/link";
import { useUser } from "@/components/providers/TelegramProvider";
import { cn } from "@/lib/utils/utils";
import axios from "axios";
import VoiceRecorder from "@/components/VoiceRecorder";
import { User } from "@/types";

export default function Home() {
  const { user, calculatorState, setCalculatorState, language, t, showSplash } = useUser();
  const fileInputCameraRef = useRef<HTMLInputElement>(null);
  const fileInputGalleryRef = useRef<HTMLInputElement>(null);

  const { sugar, previewUrls, base64Images, result, aiData } = calculatorState;
  const [isPhotoLoading, setIsPhotoLoading] = useState(false);
  const [sugarError, setSugarError] = useState<string | null>(null);
  const [foodText, setFoodText] = useState("");
  const [xeOverride, setXeOverride] = useState("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [quickFoodName, setQuickFoodName] = useState<string | null>(null);
  const [cgmData, setCgmData] = useState<any>(null);
  const [isFetchingCgm, setIsFetchingCgm] = useState(false);

  // Load CGM data
  useEffect(() => {
    const fetchCgm = async () => {
       if (!user?.telegram_id) return;
       setIsFetchingCgm(true);
       try {
         const res = await axios.get(`/api/cgm?telegram_id=${user.telegram_id}`);
         if (res.data.success) {
           setCgmData(res.data.data);
         }
       } catch (e) {
         console.error("CGM fetch error", e);
       } finally {
         setIsFetchingCgm(false);
       }
    };
    fetchCgm();
  }, [user]);

  const handleSugarChange = (val: string) => {
    setCalculatorState(prev => ({ ...prev, sugar: val }));
    const num = parseFloat(val.replace(',', '.'));
    if (!isNaN(num)) {
       if (num < 3.9) {
          setSugarError(t.sugar_low_warning);
       } else {
          setSugarError(null);
       }
    } else {
       setSugarError(null);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsPhotoLoading(true);
    const newPreviews: string[] = [];
    const newBase64s: string[] = [];

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        newPreviews.push(result);
        newBase64s.push(result.split(',')[1]);

        if (newPreviews.length === files.length) {
          setCalculatorState(prev => ({
            ...prev,
            previewUrls: [...prev.previewUrls, ...newPreviews],
            base64Images: [...prev.base64Images, ...newBase64s]
          }));
          setIsPhotoLoading(false);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleStartAnalysis = async () => {
    if (!sugar) return;
    setIsPhotoLoading(true);
    try {
        const res = await axios.post('/api/calculate', {
            sugar: parseFloat(sugar.replace(',', '.')),
            images: base64Images,
            description: foodText,
            telegram_id: user?.telegram_id || 804617505
        });

        if (res.data.success) {
            setCalculatorState(prev => ({
                ...prev,
                result: res.data.result,
                aiData: res.data.aiResponse
            }));
            window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success');
        } else {
            setToastMessage(t.save_error);
        }
    } catch (e: any) {
        console.error(e);
        setToastMessage(t.save_error);
    } finally {
        setIsPhotoLoading(false);
    }
  };

  const handleResetAnalysis = () => {
    setCalculatorState(prev => ({ ...prev, result: null, aiData: null, previewUrls: [], base64Images: [] }));
    setFoodText("");
    setXeOverride("");
    setQuickFoodName(null);
    setIsPhotoLoading(false);
  };

  const handleSaveLog = async () => {
      const activeUser = (user && user.telegram_id) ? user : { 
        telegram_id: 804617505,
        role: 'admin',
        created_at: new Date().toISOString(),
        first_name: 'Owner',
        username: 'admin'
      } as User;
      
      if (!result || !aiData) return;
      
      try {
          // Average for history
          const effectiveXe = xeOverride && parseFloat(xeOverride) > 0 ? parseFloat(xeOverride) : parseFloat(((result.xe_min + result.xe_max) / 2).toFixed(1));
          const avgDose = parseFloat(((result.dose_min + result.dose_max) / 2).toFixed(1));
          const avgXe = parseFloat(((result.xe_min + result.xe_max) / 2).toFixed(1));

          await axios.post('/api/log', {
              telegram_id: activeUser.telegram_id,
              current_sugar: parseFloat(sugar.replace(',', '.')),
              total_xe: effectiveXe,
              xe_corrected: xeOverride && parseFloat(xeOverride) !== avgXe ? parseFloat(xeOverride) : null,
              ai_raw_response: aiData,
              recommended_dose: avgDose,
              actual_dose: avgDose
          });
          
          // Smart Reminders
          await axios.post('/api/reminders/schedule', {
              telegram_id: activeUser.telegram_id,
              message: t.reminder_sugar_check,
              hours_delay: 2,
              type: 'sugar_check'
          }).catch(err => console.error("Failed to schedule sugar check reminder:", err));

          if (result.is_high_fat) {
              const remainingDose = Math.round(result.dose_max * 0.2 * 2) / 2;
              const msg = (t.reminder_high_fat || '').replace('{dose}', remainingDose.toString());
              await axios.post('/api/reminders/schedule', {
                  telegram_id: activeUser.telegram_id,
                  message: msg,
                  hours_delay: 2,
                  type: 'high_fat_split'
              }).catch(err => console.error("Failed to schedule high fat reminder:", err));
          }

          // GUARD MODE
          // @ts-ignore
          if (activeUser.guardian_id) {
              await axios.post('/api/guardian/notify', {
                  // @ts-ignore
                  guardian_id: activeUser.guardian_id,
                  // @ts-ignore
                  child_name: activeUser.first_name || activeUser.username || "Ребенок",
                  dose: result.dose_max,
                  xe: result.xe_max,
                  meal_name: foodText || quickFoodName || "Прием пищи",
                  sugar: sugar,
                  language: language
              }).catch(err => console.error("Failed to notify guardian:", err));
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

  const getTrendArrow = (dir: string) => {
    switch(dir) {
      case 'Flat': return '→';
      case 'FortyFiveUp': return '↗';
      case 'FortyFiveDown': return '↘';
      case 'SingleUp': return '↑';
      case 'SingleDown': return '↓';
      case 'DoubleUp': return '⇈';
      case 'DoubleDown': return '⇊';
      default: return '';
    }
  };

  return (
    <main className="min-h-screen p-4 max-w-[375px] mx-auto relative pb-36 overflow-x-hidden">
      {/* Splash Screen */}
      {showSplash && (
        <div className="fixed inset-0 bg-[#F8F4F0] z-[100] flex flex-col items-center justify-center pointer-events-none transition-opacity duration-1000 opacity-100 overflow-hidden">
           <style>{`
             @keyframes splashScale {
               0% { transform: scale(0.6); opacity: 0; filter: blur(20px); }
               50% { transform: scale(1.1); opacity: 1; filter: blur(0px); }
               100% { transform: scale(1); opacity: 1; filter: blur(0px); }
             }
             .animate-premium-splash {
               animation: splashScale 1.8s cubic-bezier(0.23, 1, 0.32, 1) forwards;
             }
           `}</style>
           <div className="relative">
              <img src="/logo.png" alt="Logo" className="w-40 h-40 object-contain animate-premium-splash" />
              <div className="absolute inset-0 bg-emerald-500/20 blur-3xl rounded-full scale-150 -z-10 animate-pulse opacity-30" />
           </div>
           <h1 className="text-3xl font-black text-[#111827] tracking-tighter text-center mt-4 uppercase">
              DIA <span className="font-thin text-emerald-500">AI</span>
           </h1>
        </div>
      )}
      
      {/* Header */}
      <header className="flex items-center justify-between mb-8 pt-6 relative z-10 w-full px-2">
         <div className="w-10" /> 
         <div className="flex items-center gap-1.5 translate-x-1">
            <img src="/logo.png" alt="Logo" className="w-6 h-6 object-contain" />
            <h1 className="text-2xl font-black text-[#111827] tracking-tighter">
               DIA <span className="font-light bg-clip-text text-transparent bg-gradient-to-r from-emerald-500 to-cyan-500">AI</span>
            </h1>
         </div>
         <Link 
           href="/settings"
           onClick={() => window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light')}
           className="w-10 h-10 flex items-center justify-center nm-outset nm-active rounded-xl text-gray-400"
         >
           <Settings className="w-5 h-5" />
         </Link>
      </header>

      <div className="space-y-8 relative z-10">
        
        {/* Sugar Section */}
        {!result && (
          <div className="space-y-2 animate-fade-in-up">
            <label className="text-[10px] font-black text-gray-500 ml-1 uppercase tracking-widest">
              {t.current_sugar}
            </label>
            <div className="nm-inset rounded-[2.5rem] p-10 flex flex-col items-center justify-center relative overflow-hidden">
               {isFetchingCgm && (
                 <div className="absolute top-4 right-4">
                    <Loader2 className="w-5 h-5 animate-spin text-emerald-500" />
                 </div>
               )}
               {cgmData && (
                 <div className="absolute left-6 top-1/2 -translate-y-1/2 flex flex-col items-center text-emerald-500">
                    <span className="text-2xl font-black">{cgmData.sgv}</span>
                    <span className="text-lg font-black">{getTrendArrow(cgmData.direction)}</span>
                 </div>
               )}
               <input 
                 type="number"
                 inputMode="decimal"
                 value={sugar}
                 onChange={(e) => handleSugarChange(e.target.value)}
                 placeholder="5.5"
                 className={cn(
                   "w-full bg-transparent text-center text-7xl font-black text-[#111827] focus:outline-none placeholder:text-gray-200",
                   sugarError ? "text-red-500" : ""
                 )}
               />
            </div>
            {sugarError && (
              <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-xs font-medium border border-red-100 flex gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {sugarError}
              </div>
            )}
          </div>
        )}

        <input 
            type="file" 
            accept="image/*" 
            multiple
            capture="environment" 
            ref={fileInputCameraRef}
            onChange={handleFileChange}
            className="hidden"
        />
        <input 
            type="file" 
            accept="image/*" 
            multiple
            ref={fileInputGalleryRef}
            onChange={handleFileChange}
            className="hidden"
        />

        {/* Action Button / Previews */}
        {!result && (
          <div className="space-y-6">
             {previewUrls.length > 0 ? (
                <div className="space-y-6">
                  <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                    {previewUrls.map((p: string, i: number) => (
                      <div key={i} className="relative group flex-shrink-0">
                        <img src={p} alt="Food" className="w-32 h-32 rounded-2xl object-cover shadow-lg border-2 border-white" />
                        <button 
                          onClick={() => setCalculatorState(prev => ({
                            ...prev,
                            previewUrls: prev.previewUrls.filter((_: string, idx: number) => idx !== i),
                            base64Images: prev.base64Images.filter((_: string, idx: number) => idx !== i)
                          }))}
                          className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white shadow-lg"
                        >
                           ×
                        </button>
                      </div>
                    ))}
                  </div>
                  
                  {isPhotoLoading && (
                    <div className="w-full nm-inset rounded-[2rem] p-10 flex flex-col items-center justify-center gap-4 animate-fade-in-up">
                       <Loader2 className="w-16 h-16 animate-spin text-emerald-500" />
                       <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">{t.analyzing}...</span>
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-500 ml-1 uppercase tracking-widest">
                       {t.description_label}
                    </label>
                    <div className="nm-inset rounded-[2rem] p-1 flex items-center pr-4">
                      <input 
                        type="text" 
                        placeholder={t.clarification_placeholder}
                        value={foodText}
                        onChange={(e) => setFoodText(e.target.value)}
                        className="w-full bg-transparent px-5 py-4 text-sm font-bold text-[#111827] focus:outline-none"
                      />
                      <VoiceRecorder onTranscription={(text) => setFoodText(prev => prev ? `${prev} ${text}` : text)} />
                    </div>
                  </div>

                  <div className="flex flex-col gap-4 pt-2">
                    <button 
                      onClick={handleStartAnalysis}
                      disabled={isPhotoLoading}
                      className="w-full nm-primary nm-active rounded-[2rem] p-5 text-white font-black uppercase tracking-widest transition-all"
                    >
                      {isPhotoLoading ? t.analyzing : t.analyze_btn}
                    </button>
                    <button 
                      onClick={handleResetAnalysis}
                      className="w-full nm-outset nm-active p-5 rounded-[2rem] text-gray-500 font-bold uppercase tracking-widest"
                    >
                      {t.cancel}
                    </button>
                  </div>
                </div>
             ) : (
                <div className="flex flex-col items-center justify-center py-6 gap-8">
                  <div className="flex flex-wrap items-center justify-center gap-4 w-full">
                    {/* Camera Button */}
                    <button
                      onClick={() => fileInputCameraRef.current?.click()}
                      disabled={!sugar || !!sugarError}
                      className={cn(
                          "w-36 h-36 rounded-[2.5rem] flex flex-col items-center justify-center gap-2 transition-all duration-300 active:scale-95 group",
                          (!sugar || sugarError) ? "opacity-40 grayscale" : "nm-outset nm-active p-6"
                      )}
                    >
                      <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center shadow-[0_0_20px_rgba(52,211,153,0.2)]">
                          <Camera className="w-6 h-6 text-emerald-500" />
                      </div>
                      <span className="text-[10px] font-black text-[#111827] uppercase tracking-widest text-center leading-tight">
                         {t.camera_btn || "Camera"}
                      </span>
                    </button>

                    {/* Gallery Button */}
                    <button
                      onClick={() => fileInputGalleryRef.current?.click()}
                      disabled={!sugar || !!sugarError}
                      className={cn(
                          "w-36 h-36 rounded-[2.5rem] flex flex-col items-center justify-center gap-2 transition-all duration-300 active:scale-95 group",
                          (!sugar || sugarError) ? "opacity-40 grayscale" : "nm-outset nm-active p-6"
                      )}
                    >
                      <div className="w-12 h-12 rounded-full bg-cyan-50 flex items-center justify-center shadow-[0_0_20px_rgba(6,182,212,0.2)]">
                          <ImageIcon className="w-6 h-6 text-cyan-500" />
                      </div>
                      <span className="text-[10px] font-black text-[#111827] uppercase tracking-widest text-center leading-tight">
                         {t.gallery_btn || "Gallery"}
                      </span>
                    </button>

                    {/* Voice Option */}
                    <div className="flex flex-col items-center gap-3 mt-2">
                      <VoiceRecorder 
                        disabled={!sugar || !!sugarError}
                        onTranscription={(text) => setFoodText(text)} 
                      />
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t.voice_button}</span>
                    </div>
                  </div>

                  {!sugar && (
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest animate-pulse">
                       {t.enter_sugar_first}
                    </p>
                  )}
                  {foodText && (
                    <div className="w-full nm-inset rounded-3xl p-6 animate-fade-in-up">
                       <p className="text-sm font-bold text-[#111827] italic">"{foodText}"</p>
                       <button 
                        onClick={handleStartAnalysis}
                        className="mt-4 w-full nm-primary nm-active p-3 rounded-2xl text-white text-[10px] font-black uppercase tracking-widest"
                       >
                         {t.analyze_btn}
                       </button>
                    </div>
                  )}
                </div>
             )}
          </div>
        )}

        {/* Results */}
        {result && aiData && (
          <div className="space-y-8 animate-fade-in-up">
             <div className="nm-inset rounded-[3rem] p-10 flex flex-col items-center space-y-4">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t.recommended_dose}</span>
                <div className="flex items-center gap-3">
                   <h2 className="text-5xl font-black bg-clip-text text-transparent bg-gradient-to-br from-emerald-500 to-cyan-600 tracking-tighter">
                      {result.dose_max}
                   </h2>
                   <span className="text-xl font-black text-cyan-600 uppercase">{t.units}</span>
                </div>
             </div>

             <div className="grid grid-cols-2 gap-4">
                <div className="nm-outset-sm rounded-3xl p-4 flex flex-col items-center">
                   <span className="text-[10px] font-bold text-gray-400 uppercase">{t.ai_estimate_prefix}</span>
                   <span className="text-xl font-black">{result.xe_max} ХЕ</span>
                </div>
                <div className="nm-outset-sm rounded-3xl p-4 flex flex-col items-center">
                   <span className="text-[10px] font-bold text-gray-400 uppercase">{t.coef_label}</span>
                   <span className="text-xl font-black">{result.coef}</span>
                </div>
             </div>

             <div className="flex flex-col gap-4">
                <button onClick={handleSaveLog} className="w-full nm-primary nm-active p-5 rounded-[2.5rem] text-white font-black uppercase tracking-widest">
                   {t.save_and_inject}
                </button>
                <button onClick={handleResetAnalysis} className="w-full nm-outset nm-active p-5 rounded-[2.5rem] text-gray-500 font-bold uppercase tracking-widest">
                   {t.recalculate}
                </button>
             </div>
          </div>
        )}

      </div>

      {toastMessage && (
          <div className="fixed bottom-32 left-0 right-0 flex justify-center z-50 px-4">
              <div className="bg-gray-900 text-white px-5 py-3 rounded-full flex items-center gap-3 shadow-2xl">
                  {toastMessage}
              </div>
          </div>
      )}

    </main>
  );
}
