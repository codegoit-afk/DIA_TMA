"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Save, Plus, Trash2, ShieldCheck, ChevronRight, Settings, TrendingUp, Syringe } from "lucide-react";
import { CoefMatrixRow } from "@/types";
import { useUser } from "@/components/providers/TelegramProvider";
import { cn } from "@/lib/utils/utils";
import axios from "axios";

declare global {
  interface Window {
    Telegram?: any;
  }
}

export default function SettingsPage() {
  const { t, user, language, setLanguage } = useUser();
  const [hypoThreshold, setHypoThreshold] = useState("3.9");
  const [targetSugar, setTargetSugar] = useState("5.5");
  const [xeWeight, setXeWeight] = useState("12");
  const [isSaving, setIsSaving] = useState(false);
  
  // CGM Settings
  const [cgmType, setCgmType] = useState<'none' | 'nightscout'>('none');
  const [nightscoutUrl, setNightscoutUrl] = useState("");
  const [nightscoutToken, setNightscoutToken] = useState("");

  // IOB / Basal Settings
  const [insulinDia, setInsulinDia] = useState("4");

  const [isAdmin, setIsAdmin] = useState(false);
  const [matrix, setMatrix] = useState<CoefMatrixRow[]>([
    { min: 1.0, max: 8.0, coef: 2.0 },
    { min: 8.1, max: 15.0, coef: 1.5 },
    { min: 15.1, max: 99.0, coef: 1.0 }
  ]);

  const handleAddRow = () => {
    const lastRow = matrix[matrix.length - 1];
    setMatrix([...matrix, { min: lastRow ? lastRow.max + 0.1 : 1.0, max: 99.0, coef: 1.0 }]);
  };

  const handleUpdateRow = (index: number, field: keyof CoefMatrixRow, value: string) => {
    const newMatrix = [...matrix];
    newMatrix[index][field] = parseFloat(value) || 0;
    setMatrix(newMatrix);
  };

  const handleRemoveRow = (index: number) => {
    setMatrix(matrix.filter((_, i) => i !== index));
  };

  useEffect(() => {
    async function loadProfile() {
      if (!user) return;
      try {
        const res = await axios.get(`/api/profile?telegram_id=${user.telegram_id}`);
        if (res.data.success && res.data.data) {
          const profile = res.data.data;
          if (profile.hypo_threshold) setHypoThreshold(profile.hypo_threshold.toString());
          if (profile.target_sugar) setTargetSugar(profile.target_sugar.toString());
          if (profile.xe_weight) setXeWeight(profile.xe_weight.toString());
          if (profile.coef_matrix && profile.coef_matrix.length > 0) {
            setMatrix(profile.coef_matrix);
          }
          if (profile.cgm_settings) {
            setCgmType(profile.cgm_settings.type || 'none');
            setNightscoutUrl(profile.cgm_settings.nightscout_url || "");
            setNightscoutToken(profile.cgm_settings.nightscout_token || "");
          }
          if (profile.insulin_dia) setInsulinDia(profile.insulin_dia.toString());
        }
        
        // Check if user is admin
        const adminRes = await axios.get(`/api/admin/check?telegram_id=${user.telegram_id}`);
        if (adminRes.data.success && adminRes.data.isAdmin) setIsAdmin(true);
      } catch (e) {
        console.error("Failed to load profile", e);
      }
    }
    loadProfile();
  }, [user]);

  useEffect(() => {
    // Show BackButton on subpages
    // @ts-ignore
    const WebApp = window.Telegram?.WebApp;
    if (WebApp) {
      WebApp.BackButton.show();
      WebApp.BackButton.onClick(() => {
          window.location.href = '/';
      });
    }
  }, []);

  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      const res = await axios.post('/api/profile', {
        telegram_id: user.telegram_id,
        hypo_threshold: parseFloat(hypoThreshold),
        target_sugar_ideal: parseFloat(targetSugar),
        xe_weight: parseInt(xeWeight),
        coef_matrix: matrix,
        cgm_settings: {
          type: cgmType,
          nightscout_url: nightscoutUrl,
          nightscout_token: nightscoutToken
        },
        insulin_dia: parseFloat(insulinDia),
        language: language // Save language preference too
      });
      if (res.data.success) {
        window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success');
        alert(t.save_success || "Збережено!");
      }
    } catch (e) {
      console.error(e);
      alert("Error saving settings.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <main className="min-h-screen p-4 max-w-[375px] mx-auto pb-32 relative bg-[#F8F4F0]">
      {/* Header */}
      <header className="flex items-center justify-between mb-8 pt-6 relative z-10 w-full px-2">
         <Link 
           href="/"
           onClick={() => window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light')}
           className="w-10 h-10 flex items-center justify-center nm-outset nm-active rounded-xl text-gray-400 transition-all"
         >
           <ArrowLeft className="w-5 h-5" />
         </Link>
         <h1 className="text-xl font-black text-[#111827] tracking-tight uppercase">
            {t.settings}
         </h1>
         <div className="w-10" />
      </header>

      <div className="space-y-8 relative z-10">
        
        {/* Language Selector */}
        <section className="space-y-3 animate-fade-in-up">
           <label className="text-xs font-black text-gray-500 ml-2 uppercase tracking-widest">{t.language_label || "Мова / Язык"}</label>
           <div className="nm-inset rounded-3xl p-1.5 flex gap-1">
              {(['ua', 'ru', 'en'] as const).map((lang) => (
                <button
                  key={lang}
                  onClick={() => {
                    window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('medium');
                    setLanguage(lang);
                  }}
                  className={cn(
                    "flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all",
                    language === lang 
                      ? "nm-outset bg-[#F8F4F0] text-emerald-500 scale-100" 
                      : "text-gray-400 opacity-60 hover:opacity-100"
                  )}
                >
                  {lang === 'ua' ? 'Ukrainian' : lang === 'ru' ? 'Russian' : 'English'}
                </button>
              ))}
           </div>
        </section>

        {/* Basic Settings */}
        <section className="space-y-6 nm-outset rounded-[2.5rem] p-6 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
          <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
             <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center">
                <Settings className="w-4 h-4 text-emerald-500" />
             </div>
             <h2 className="text-sm font-black text-[#111827] uppercase tracking-wider">{t.basic_settings}</h2>
          </div>
          
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 min-h-[2rem] flex items-end">
                {t.hypo_threshold}
              </label>
              <div className="nm-inset rounded-2xl p-0.5">
                 <input 
                   type="number" step="0.1" value={hypoThreshold} onChange={(e) => setHypoThreshold(e.target.value)}
                   className="w-full bg-transparent p-3 text-center text-xl font-black text-[#111827] focus:outline-none"
                 />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 min-h-[2rem] flex items-end">
                {t.target_sugar}
              </label>
              <div className="nm-inset rounded-2xl p-0.5">
                 <input 
                   type="number" step="0.1" value={targetSugar} onChange={(e) => setTargetSugar(e.target.value)}
                   className="w-full bg-transparent p-3 text-center text-xl font-black text-[#111827] focus:outline-none"
                 />
              </div>
            </div>
          </div>

          <div className="space-y-3">
             <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{t.xe_weight_label}</label>
             <div className="nm-inset rounded-2xl p-1 flex gap-1">
                {[10, 11, 12, 15].map(w => (
                  <button 
                    key={w}
                    onClick={() => {
                        window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light');
                        setXeWeight(w.toString());
                    }}
                    className={cn(
                        "flex-1 py-2 text-xs font-black rounded-xl transition-all",
                        xeWeight === w.toString() ? "nm-outset text-emerald-500" : "text-gray-400"
                    )}
                  >
                    {w}г
                  </button>
                ))}
             </div>
          </div>

          <div className="space-y-3">
             <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{t.insulin_dia_label}</label>
             <div className="nm-inset rounded-2xl p-1 flex gap-1 overflow-x-auto scrollbar-hide">
                {[3, 3.5, 4, 4.5, 5].map(d => (
                  <button
                    key={d}
                    onClick={() => {
                      window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light');
                      setInsulinDia(d.toString());
                    }}
                    className={cn(
                        "flex-1 min-w-[50px] py-2 text-xs font-black rounded-xl transition-all",
                        insulinDia === d.toString() ? "nm-outset text-cyan-500" : "text-gray-400"
                    )}
                  >
                    {d}ч
                  </button>
                ))}
             </div>
          </div>
        </section>

        {/* Matrix Settings */}
        <section className="space-y-6 nm-outset rounded-[2.5rem] p-6 animate-fade-in-up" style={{ animationDelay: '200ms' }}>
          <div className="flex items-center justify-between border-b border-gray-100 pb-4">
             <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-cyan-50 flex items-center justify-center">
                   <TrendingUp className="w-4 h-4 text-cyan-500" />
                </div>
                <h2 className="text-sm font-black text-[#111827] uppercase tracking-wider">{t.matrix_settings}</h2>
             </div>
             <button 
               onClick={() => {
                   window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('medium');
                   handleAddRow();
               }} 
               className="w-8 h-8 nm-outset nm-active rounded-full flex items-center justify-center text-emerald-500"
             >
               <Plus className="w-4 h-4" />
             </button>
          </div>
          
          <div className="space-y-4 pt-2">
            {matrix.map((row, idx) => (
              <div key={idx} className="flex gap-2 items-center group">
                 <div className="nm-inset rounded-xl p-1 flex-1">
                    <input 
                      type="number" step="0.1" value={row.min} onChange={(e) => handleUpdateRow(idx, 'min', e.target.value)}
                      className="w-full bg-transparent text-center font-bold text-[#111827] text-xs focus:outline-none"
                    />
                 </div>
                 <span className="text-gray-300">→</span>
                 <div className="nm-inset rounded-xl p-1 flex-1">
                    <input 
                      type="number" step="0.1" value={row.max} onChange={(e) => handleUpdateRow(idx, 'max', e.target.value)}
                      className="w-full bg-transparent text-center font-bold text-[#111827] text-xs focus:outline-none"
                    />
                 </div>
                 <span className="text-gray-300">=</span>
                 <div className="nm-outset nm-active rounded-xl p-1 w-16 bg-emerald-50/50">
                    <input 
                      type="number" step="0.1" value={row.coef} onChange={(e) => handleUpdateRow(idx, 'coef', e.target.value)}
                      className="w-full bg-transparent text-center font-black text-emerald-600 text-sm focus:outline-none"
                    />
                 </div>
                 <button onClick={() => handleRemoveRow(idx)} className="text-gray-300 hover:text-red-500 p-1 transition-colors">
                   <Trash2 className="w-4 h-4" />
                 </button>
              </div>
            ))}
          </div>
        </section>

        {/* CGM Integration */}
        <section className="space-y-6 nm-outset rounded-[2.5rem] p-6 animate-fade-in-up" style={{ animationDelay: '300ms' }}>
           <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
              <div className="w-8 h-8 rounded-xl bg-purple-50 flex items-center justify-center">
                 <Syringe className="w-4 h-4 text-purple-500" />
              </div>
              <h2 className="text-sm font-black text-[#111827] uppercase tracking-wider">{t.cgm_integration}</h2>
           </div>

           <div className="space-y-4">
              <div className="space-y-2">
                 <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{t.cgm_source}</label>
                 <div className="nm-inset rounded-2xl p-1">
                    <select 
                      value={cgmType} 
                      onChange={(e) => setCgmType(e.target.value as any)}
                      className="w-full bg-transparent p-3 text-sm font-bold text-[#111827] focus:outline-none appearance-none"
                    >
                      <option value="none">Отключено / Disabled</option>
                      <option value="nightscout">Nightscout</option>
                     </select>
                  </div>
                  {cgmType === 'nightscout' && (
                    <div className="mx-1 mt-2 p-3 rounded-2xl bg-blue-50/50 border border-blue-100/50">
                       <p className="text-[10px] leading-relaxed text-blue-600 font-medium">
                         <span className="font-black uppercase mr-1">{t.cgm_how_to}</span>
                         {t.cgm_instruction}
                       </p>
                    </div>
                  )}
               </div>

              {cgmType === 'nightscout' && (
                <div className="space-y-4 animate-fade-in-up">
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">URL</label>
                      <div className="nm-inset rounded-2xl p-1">
                         <input 
                           type="url" 
                           value={nightscoutUrl} 
                           onChange={(e) => setNightscoutUrl(e.target.value)}
                           placeholder="https://my.nightscout.io"
                           className="w-full bg-transparent p-3 text-sm font-medium text-[#111827] focus:outline-none"
                         />
                      </div>
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{t.cgm_token}</label>
                      <div className="nm-inset rounded-2xl p-1">
                         <input 
                           type="password" 
                           value={nightscoutToken} 
                           onChange={(e) => setNightscoutToken(e.target.value)}
                           className="w-full bg-transparent p-3 text-sm font-medium text-[#111827] focus:outline-none"
                         />
                      </div>
                   </div>
                </div>
              )}
           </div>
        </section>

        {/* Support Section */}
        <section className="animate-fade-in-up" style={{ animationDelay: '400ms' }}>
           <a 
             href="https://t.me/dia_ai_support" 
             target="_blank"
             onClick={() => window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('medium')}
             className="flex items-center justify-between nm-outset nm-active p-5 rounded-[2rem] bg-white group transition-all"
           >
              <div className="flex items-center gap-4">
                 <div className="w-10 h-10 rounded-2xl bg-indigo-50 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <div className="w-5 h-5 text-indigo-500">
                       <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                       </svg>
                    </div>
                 </div>
                 <span className="text-xs font-black text-[#111827] uppercase tracking-wider">{t.contact_devs}</span>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-indigo-400" />
           </a>
        </section>

        {/* Save Button */}
        <button 
           onClick={() => {
              window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('heavy');
              handleSave();
           }}
           disabled={isSaving}
           className="w-full nm-outset nm-active bg-emerald-500 p-6 rounded-[2rem] text-white font-black uppercase tracking-widest shadow-[inset_0_0_20px_rgba(255,255,255,0.2)] disabled:opacity-50"
        >
           {isSaving ? '...' : t.save}
        </button>

        {isAdmin && (
           <Link 
             href="/admin"
             className="flex items-center justify-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest hover:text-emerald-500 transition-colors pt-4 pb-10"
           >
              <ShieldCheck className="w-4 h-4" />
              Admin Panel
           </Link>
        )}
      </div>
    </main>
  );
}
