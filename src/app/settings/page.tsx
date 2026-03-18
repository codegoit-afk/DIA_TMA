"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Save, Plus, Trash2, ShieldCheck, ChevronRight } from "lucide-react";
import { CoefMatrixRow } from "@/types";
import { useUser } from "@/components/providers/TelegramProvider";
import axios from "axios";

declare global {
  interface Window {
    Telegram?: any;
  }
}

export default function SettingsPage() {
  const { t, user } = useUser();
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
        insulin_dia: parseFloat(insulinDia)
      });
      if (res.data.success) {
        // Use custom snackbar instead of alert if possible, else standard alert for now
        if (window.Telegram?.WebApp?.HapticFeedback) {
            window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
        }
        alert(t.save_success || "Настройки успешно сохранены!");
      }
    } catch (e) {
      console.error(e);
      alert("Ошибка при сохранении настроек.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <main className="min-h-screen p-4 max-w-md mx-auto pb-24 relative overflow-hidden">
      {/* Background Decorative Blob */}
      <div className="absolute top-40 right-0 -mr-20 w-64 h-64 bg-purple-500/10 rounded-full blur-[80px] pointer-events-none" />
      <div className="absolute bottom-40 left-0 -ml-20 w-64 h-64 bg-indigo-500/10 rounded-full blur-[80px] pointer-events-none" />

      {/* Header */}
      <header className="flex items-center gap-4 mb-8 pt-4 relative z-10">
        <Link href="/" className="p-2 -ml-2 rounded-full hover:bg-white/10 transition-colors text-slate-300 backdrop-blur-sm">
          <ArrowLeft className="w-6 h-6" />
        </Link>
        <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400 tracking-tight">{t.settings}</h1>
      </header>

      <div className="space-y-8 relative z-10">
        {/* Basic Settings */}
        <section className="space-y-4 bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl p-6 rounded-3xl animate-fade-in-up">
          <h2 className="text-lg font-extrabold tracking-tight text-white border-b border-white/10 pb-3">{t.basic_settings}</h2>
          
          <div className="grid grid-cols-2 gap-5 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-500 tracking-wide">{t.hypo_threshold}</label>
              <input 
                type="number" step="0.1" value={hypoThreshold} onChange={(e) => setHypoThreshold(e.target.value)}
                className="w-full bg-black/20 rounded-xl p-3 text-white text-xl font-bold border border-white/10 focus:ring-2 focus:ring-emerald-500/50 focus:outline-none transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-500 tracking-wide">{t.target_sugar}</label>
              <input 
                type="number" step="0.1" value={targetSugar} onChange={(e) => setTargetSugar(e.target.value)}
                className="w-full bg-black/20 rounded-xl p-3 text-white text-xl font-bold border border-white/10 focus:ring-2 focus:ring-emerald-500/50 focus:outline-none transition-all"
              />
            </div>
            <div className="space-y-1.5 col-span-2 pt-2">
              <label className="text-xs font-medium text-gray-500 tracking-wide">{t.xe_weight_label}</label>
              {/* iOS Style Segmented Control */}
              <div className="flex bg-black/40 rounded-xl overflow-hidden p-1 shadow-inner border border-white/5">
                {[10, 11, 12, 15].map(w => (
                  <button 
                    key={w}
                    onClick={() => {
                        setXeWeight(w.toString());
                        if (window.Telegram?.WebApp?.HapticFeedback) {
                            window.Telegram.WebApp.HapticFeedback.impactOccurred('light');
                        }
                    }}
                    className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all duration-300 ${xeWeight === w.toString() ? 'bg-gradient-to-r from-emerald-400 to-cyan-500 text-gray-900 shadow-md' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                  >
                    {w}г
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5 col-span-2 pt-3">
              <label className="text-xs font-medium text-gray-500 tracking-wide">{t.insulin_dia_label || "Длительность действия инсулина (DIA, ч)"}</label>
              <div className="flex bg-black/40 rounded-xl overflow-hidden p-1 shadow-inner border border-white/5">
                {[3, 3.5, 4, 4.5, 5].map(d => (
                  <button
                    key={d}
                    onClick={() => {
                      setInsulinDia(d.toString());
                      window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light');
                    }}
                    className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all duration-300 ${insulinDia === d.toString() ? 'bg-gradient-to-r from-purple-400 to-indigo-500 text-white shadow-md' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                  >
                    {d}ч
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* CGM Settings */}
        <section className="space-y-4 bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl p-6 rounded-3xl animate-fade-in-up"  style={{ animationDelay: '100ms' }}>
          <h2 className="text-lg font-extrabold tracking-tight text-white border-b border-white/10 pb-3">{t.cgm_integration || "Интеграция CGM (Мониторинг)"}</h2>
          
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-500 tracking-wide">{t.cgm_source || "Источник данных"}</label>
              <select 
                value={cgmType} 
                onChange={(e) => setCgmType(e.target.value as any)}
                className="w-full bg-black/20 rounded-xl p-3 text-white text-base font-bold border border-white/10 focus:ring-2 focus:ring-emerald-500/50 focus:outline-none appearance-none transition-all"
              >
                <option value="none" className="text-gray-900 bg-white">Отключено</option>
                <option value="nightscout" className="text-gray-900 bg-white">Nightscout</option>
              </select>
            </div>

            {cgmType === 'nightscout' && (
              <>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-500 tracking-wide">Nightscout URL</label>
                  <input 
                    type="url" 
                    placeholder="https://my-cgm.com"
                    value={nightscoutUrl} 
                    onChange={(e) => setNightscoutUrl(e.target.value)}
                    className="w-full bg-black/20 rounded-xl p-3 text-white text-sm font-medium border border-white/10 focus:ring-2 focus:ring-emerald-500/50 focus:outline-none transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-500 tracking-wide">{t.cgm_token || "Токен API (Опционально)"}</label>
                  <input 
                    type="password" 
                    placeholder="Только если сайт закрыт"
                    value={nightscoutToken} 
                    onChange={(e) => setNightscoutToken(e.target.value)}
                    className="w-full bg-black/20 rounded-xl p-3 text-white text-sm font-medium border border-white/10 focus:ring-2 focus:ring-emerald-500/50 focus:outline-none transition-all"
                  />
                </div>
              </>
            )}
          </div>
        </section>

        {/* Matrix Settings */}
        <section className="space-y-4 bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl p-6 rounded-3xl animate-fade-in-up" style={{ animationDelay: '200ms' }}>
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h2 className="text-lg font-extrabold tracking-tight text-white">{t.matrix_settings}</h2>
            <button 
              onClick={() => {
                  handleAddRow();
                  if (window.Telegram?.WebApp?.HapticFeedback) {
                      window.Telegram.WebApp.HapticFeedback.impactOccurred('medium');
                  }
              }} 
              className="text-emerald-400 p-1 px-2 hover:bg-emerald-400/10 rounded-lg flex items-center gap-1.5 text-sm font-bold transition-colors">
              <Plus className="w-4 h-4" /> {t.add}
            </button>
          </div>
          
          <div className="space-y-3 pt-2">
            <div className="flex text-xs font-medium text-gray-500 tracking-wide px-1">
              <span className="flex-1">{t.xe_from}</span>
              <span className="flex-1 text-center">{t.xe_to}</span>
              <span className="w-20 text-right pr-6">{t.ins_per_xe}</span>
            </div>

            {matrix.map((row, idx) => (
              <div key={idx} className="flex gap-3 items-center p-1 group transition-all">
                <input 
                  type="number" step="0.1" value={row.min} onChange={(e) => handleUpdateRow(idx, 'min', e.target.value)}
                  className="w-full bg-black/20 text-white text-center font-bold focus:ring-2 focus:ring-emerald-500/50 border border-white/10 rounded-xl p-2 transition-all"
                />
                <span className="text-gray-600 font-bold opacity-80">→</span>
                <input 
                  type="number" step="0.1" value={row.max} onChange={(e) => handleUpdateRow(idx, 'max', e.target.value)}
                  className="w-full bg-black/20 text-white text-center font-bold focus:ring-2 focus:ring-emerald-500/50 border border-white/10 rounded-xl p-2 transition-all"
                />
                <span className="text-gray-600 font-bold opacity-80">=</span>
                <input 
                  type="number" step="0.1" value={row.coef} onChange={(e) => handleUpdateRow(idx, 'coef', e.target.value)}
                  className="w-20 bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 border border-emerald-500/30 text-emerald-300 text-center font-black focus:ring-2 focus:ring-emerald-400/50 focus:bg-emerald-500/30 rounded-xl p-2 ml-auto transition-all"
                />
                <button onClick={() => handleRemoveRow(idx)} className="text-gray-500 hover:text-red-400 p-2 ml-1 transition-colors rounded-xl hover:bg-red-500/10 opacity-0 group-hover:opacity-100">
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        </section>

        <button 
          onClick={() => {
              if (window.Telegram?.WebApp?.HapticFeedback) {
                  window.Telegram.WebApp.HapticFeedback.impactOccurred('heavy');
              }
              handleSave();
          }}
          disabled={isSaving}
          className="w-full bg-gradient-to-r from-emerald-400 to-cyan-500 hover:opacity-90 text-gray-900 p-4 rounded-3xl font-black text-lg flex items-center justify-center gap-3 transition-all active:scale-[0.98] shadow-2xl shadow-emerald-500/20 disabled:opacity-50 mt-10"
        >
          <Save className="w-6 h-6" />
          {isSaving ? 'Сохранение...' : t.save}
        </button>

        {isAdmin && (
          <div className="mt-8 pt-8 border-t border-white/10">
            <Link 
              href="/admin"
              className="w-full bg-white/5 border border-white/10 hover:bg-white/10 p-4 rounded-3xl font-bold flex items-center justify-between transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/10 rounded-xl group-hover:scale-110 transition-transform">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                </div>
                <div className="text-left">
                    <div className="text-white">Панель администратора</div>
                    <div className="text-[10px] text-gray-600 font-bold uppercase tracking-widest">👑 Только для создателя</div>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-700 group-hover:text-emerald-400 transition-colors" />
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
