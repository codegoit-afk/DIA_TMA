"use client";

import Link from "next/link";
import { ArrowLeft, Clock, Syringe, Camera } from "lucide-react";
import { format } from "date-fns";
import { ru, uk, enUS } from "date-fns/locale";
import { FoodLog } from "@/types";
import { useUser } from "@/components/providers/TelegramProvider";
import { useEffect, useState } from "react";
import axios from "axios";

declare global {
  interface Window {
    Telegram?: any;
  }
}

export default function LogsPage() {
  const { t, language, user } = useUser();
  const [logs, setLogs] = useState<FoodLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLogs() {
      if (!user) return;
      try {
        const res = await axios.get(`/api/log?telegram_id=${user.telegram_id}`);
        if (res.data.success) {
          setLogs(res.data.data);
        }
      } catch (e) {
        console.error("Failed to fetch logs", e);
      } finally {
        setLoading(false);
      }
    }
    fetchLogs();
  }, [user]);
  
  const getLocale = () => {
    switch(language) {
      case 'ua': return uk;
      case 'en': return enUS;
      default: return ru;
    }
  };

  return (
    <main className="min-h-screen p-4 max-w-md mx-auto pb-24 relative overflow-hidden">
      {/* Background Decorative Blob */}
      <div className="absolute top-20 left-0 -ml-20 w-64 h-64 bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Header */}
      <header className="flex items-center gap-4 mb-8 pt-4 relative z-10 w-full">
        <Link 
            href="/" 
            onClick={() => window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light')}
            className="p-3 bg-white/5 backdrop-blur-md border border-white/10 rounded-full text-gray-400 hover:text-white transition-all shadow-lg hover:shadow-[0_0_15px_rgba(255,255,255,0.1)]"
        >
          <ArrowLeft className="w-6 h-6" />
        </Link>
        <h1 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400 tracking-tight">{t.logs_title}</h1>
      </header>

      <div className="relative z-10">
        
        {loading ? (
             <div className="space-y-6 pl-8 relative">
                {/* Skeleton Timeline Line */}
                <div className="absolute left-3 top-2 bottom-0 w-[2px] bg-white/5" />
                
                {[1,2,3].map(i => (
                    <div key={i} className="relative animate-pulse">
                        <div className="absolute -left-[1.6rem] top-2 w-3 h-3 rounded-full bg-white/10" />
                        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-5 h-32" />
                    </div>
                ))}
             </div>
        ) : (
          <div className="space-y-6 relative pl-8">
            {/* Timeline Vertical Line */}
            {logs.length > 0 && <div className="absolute left-3 top-4 bottom-8 w-[2px] bg-white/5" />}

            {logs.map((log, idx) => {
                const isHigh = log.current_sugar > 7.8;
                const isLow = log.current_sugar < 4.0;
                const statusColor = isHigh ? "bg-amber-500" : isLow ? "bg-red-500" : "bg-emerald-500";
                const statusShadow = isHigh ? "shadow-[0_0_10px_rgba(245,158,11,0.5)]" : isLow ? "shadow-[0_0_10px_rgba(239,68,68,0.5)]" : "shadow-[0_0_10px_rgba(16,185,129,0.5)]";

                return (
                  <div key={log.id} className="relative animate-fade-in-up" style={{ animationDelay: `${idx * 100}ms` }}>
                    
                    {/* Timeline Dot */}
                    <div className={`absolute -left-[1.65rem] top-6 w-3.5 h-3.5 rounded-full ${statusColor} ${statusShadow} border-2 border-[#030712] z-10`} />
                    {/* Log Card */}
                    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-5 shadow-2xl relative overflow-hidden transition-all hover:bg-white/10 hover:border-white/20">
                      
                      {/* Top row: Time & Sugar Badge */}
                      <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-1.5 text-gray-400 text-xs font-bold tracking-widest uppercase">
                          <Clock className="w-4 h-4 text-gray-500" />
                          <span>{format(new Date(log.created_at), 'd MMM, HH:mm', { locale: getLocale() })}</span>
                        </div>
                        
                        <div className={`px-2.5 py-1 rounded-lg text-xs font-black tracking-wide border ${
                          isHigh ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' :
                          isLow ? 'bg-red-500/10 text-red-400 border-red-500/30' :
                          'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        }`}>
                          {log.current_sugar} ммоль
                        </div>
                      </div>

                      {/* Middle row: XE and Badges */}
                      <div className="flex items-end justify-between mb-4">
                        <div className="flex flex-col">
                          <div className="flex items-baseline gap-1.5">
                              <span className="text-3xl font-black text-white leading-none">{log.total_xe}</span>
                              <span className="text-sm font-bold text-gray-500">ХЕ</span>
                          </div>
                          <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mt-1">{t.carbs_label}</span>
                        </div>
                      </div>

                      {/* Bottom row: Insulin dose Badge */}
                      <div className="pt-4 border-t border-white/5 flex justify-between items-center">
                        <div className="bg-cyan-500/10 border border-cyan-500/20 px-3 py-1.5 rounded-xl flex items-center gap-2 text-cyan-400 shadow-inner">
                          <Syringe className="w-4 h-4" />
                          <span className="font-extrabold text-sm tracking-wide">{log.actual_dose} ед.</span>
                        </div>
                        
                        {log.recommended_dose !== log.actual_dose && log.recommended_dose && (
                           <span className="text-[10px] uppercase tracking-widest font-bold text-gray-500 bg-black/20 px-2 py-1 rounded-md border border-white/5">
                             {t.ai_suggested} {log.recommended_dose}
                           </span>
                        )}
                      </div>

                    </div>
                  </div>
                );
            })}

            {logs.length === 0 && (
              <div className="text-center py-12 text-gray-500 bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl">
                <p className="font-bold tracking-widest uppercase text-sm">{t.history_empty}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
