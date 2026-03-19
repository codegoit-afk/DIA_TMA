"use client";

import Link from "next/link";
import { ArrowLeft, Clock, Syringe, Camera, History as HistoryIcon } from "lucide-react";
import { format } from "date-fns";
import { ru, uk, enUS } from "date-fns/locale";
import { FoodLog } from "@/types";
import { useUser } from "@/components/providers/TelegramProvider";
import { cn } from "@/lib/utils/utils";
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
  
  const getLocale = () => {
    switch(language) {
      case 'ua': return uk;
      case 'en': return enUS;
      default: return ru;
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
            {t.history}
         </h1>
         <div className="w-10" />
      </header>

      <div className="relative z-10 space-y-6">
        
        {loading ? (
           <div className="space-y-6">
              {[1,2,3].map(i => (
                  <div key={i} className="nm-outset rounded-[2rem] p-6 h-32 animate-pulse" />
              ))}
           </div>
        ) : (
          <div className="space-y-6">
            {logs.map((log, idx) => {
                const isHigh = log.current_sugar > 7.8;
                const isLow = log.current_sugar < 4.0;
                
                return (
                  <div key={log.id} className="nm-outset rounded-[2.5rem] p-6 animate-fade-in-up relative overflow-hidden" style={{ animationDelay: `${idx * 100}ms` }}>
                    
                    {/* Status accent */}
                    <div className={cn(
                        "absolute top-0 right-0 w-1.5 h-full opacity-30",
                        isHigh ? "bg-amber-500" : isLow ? "bg-red-500" : "bg-emerald-500"
                    )} />

                    {/* Top row: Time & Sugar Badge */}
                    <div className="flex justify-between items-center mb-4">
                      <div className="flex items-center gap-1.5 text-gray-400 text-[10px] font-black tracking-widest uppercase">
                        <Clock className="w-3.5 h-3.5 text-gray-400" />
                        <span>{format(new Date(log.created_at), 'd MMM, HH:mm', { locale: getLocale() })}</span>
                      </div>
                      
                      <div className={cn(
                        "nm-inset rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest",
                        isHigh ? "text-amber-600" : isLow ? "text-red-600" : "text-emerald-600"
                      )}>
                        {log.current_sugar} ммоль
                      </div>
                    </div>

                    {/* Middle row: XE and Dose */}
                    <div className="flex items-center justify-between gap-4 py-2">
                       <div className="flex flex-col gap-1">
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t.carbs_label}</span>
                          <div className="flex items-baseline gap-1">
                             <span className="text-2xl font-black text-[#111827]">{log.total_xe}</span>
                             <span className="text-xs font-bold text-gray-400">ХО</span>
                          </div>
                       </div>

                       <div className="nm-inset rounded-2xl p-1 flex-1 max-w-[120px]">
                          <div className="flex flex-col items-center py-2 bg-emerald-50/20 rounded-xl">
                             <div className="flex items-center gap-1 text-emerald-600">
                                <Syringe className="w-3.5 h-3.5" />
                                <span className="text-xl font-black">{log.actual_dose}</span>
                             </div>
                             <span className="text-[8px] font-black text-emerald-500 uppercase tracking-tighter">{t.units}</span>
                          </div>
                       </div>
                    </div>

                    {/* Suggestions (if different) */}
                    {log.recommended_dose !== log.actual_dose && log.recommended_dose && (
                       <div className="mt-4 pt-4 border-t border-gray-50 flex justify-center">
                          <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest opacity-60">
                             {t.ai_suggested} {log.recommended_dose}
                          </span>
                       </div>
                    )}

                  </div>
                );
            })}

            {logs.length === 0 && (
              <div className="nm-inset rounded-[2.5rem] p-12 text-center text-gray-400 flex flex-col items-center gap-4">
                <HistoryIcon className="w-12 h-12 opacity-20" />
                <p className="font-black uppercase tracking-widest text-xs opacity-40">{t.history_empty}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
