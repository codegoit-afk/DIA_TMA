"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, TrendingUp, Download, Activity, Droplets, Syringe } from "lucide-react";
import { useUser } from "@/components/providers/TelegramProvider";
import { cn } from "@/lib/utils/utils";
import axios from "axios";

declare global { interface Window { Telegram?: any; } }

type DailyAvg = { date: string; avg_sugar: number; count: number };
type AnalyticsData = {
  total_logs: number;
  avg_sugar: number;
  avg_xe: number;
  avg_dose: number;
  tir_low: number;
  tir_target: number;
  tir_high: number;
  daily_avg: DailyAvg[];
};

const PERIODS = [7, 30] as const;

// --- SVG Sparkline Component ---
function Sparkline({ data }: { data: DailyAvg[] }) {
  if (!data || data.length < 2) return (
    <div className="h-32 flex items-center justify-center text-gray-400 text-[10px] font-black uppercase tracking-widest">
       Недостатньо даних
    </div>
  );

  const W = 300;
  const H = 100;
  const PAD = 20;

  const values = data.map(d => d.avg_sugar);
  const min = Math.min(...values, 3.9); // Ensure we see target range
  const max = Math.max(...values, 10);
  const range = max - min || 1;

  const toX = (i: number) => PAD + (i / (data.length - 1)) * (W - PAD * 2);
  const toY = (v: number) => H - PAD - ((v - min) / range) * (H - PAD * 2);

  const points = data.map((d, i) => `${toX(i)},${toY(d.avg_sugar)}`).join(' ');

  return (
    <div className="nm-inset rounded-[2rem] p-4 bg-[#F8F4F0]">
       <svg viewBox={`0 0 ${W} ${H}`} className="w-full overflow-visible">
         {/* Reference Lines */}
         <line x1={PAD} y1={toY(10)} x2={W-PAD} y2={toY(10)} stroke="#fb7185" strokeWidth="1" strokeDasharray="4 4" opacity="0.3" />
         <line x1={PAD} y1={toY(3.9)} x2={W-PAD} y2={toY(3.9)} stroke="#34d399" strokeWidth="1" strokeDasharray="4 4" opacity="0.3" />
         
         <defs>
           <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
             <stop offset="0%" stopColor="#34d399" stopOpacity="0.2" />
             <stop offset="100%" stopColor="#34d399" stopOpacity="0" />
           </linearGradient>
         </defs>
         
         <polygon
           points={`${toX(0)},${H-PAD} ${points} ${toX(data.length-1)},${H-PAD}`}
           fill="url(#sparkGrad)"
         />
         
         <polyline
           points={points}
           fill="none"
           stroke="#34d399"
           strokeWidth="3"
           strokeLinecap="round"
           strokeLinejoin="round"
         />

         {data.map((d, i) => (
           <circle 
              key={i} 
              cx={toX(i)} 
              cy={toY(d.avg_sugar)} 
              r="4" 
              fill="#F8F4F0" 
              stroke={d.avg_sugar > 10 ? '#fb7185' : d.avg_sugar < 3.9 ? '#F59E0B' : '#34d399'} 
              strokeWidth="2" 
           />
         ))}
       </svg>
    </div>
  );
}

// --- TIR Bar ---
function TirBar({ t, low, target, high }: { t: any; low: number; target: number; high: number }) {
  return (
    <div className="space-y-4">
      <div className="nm-inset rounded-full h-8 p-1 flex overflow-hidden">
        {low > 0 && (
          <div className="bg-amber-400 rounded-l-full flex items-center justify-center text-[10px] font-black text-white" style={{ width: `${low}%` }}>
            {low >= 10 ? `${low}%` : ''}
          </div>
        )}
        {target > 0 && (
          <div className="bg-emerald-500 flex items-center justify-center text-[10px] font-black text-white flex-1" style={{ width: `${target}%` }}>
            {target >= 10 ? `${target}%` : ''}
          </div>
        )}
        {high > 0 && (
          <div className="bg-rose-500 rounded-r-full flex items-center justify-center text-[10px] font-black text-white" style={{ width: `${high}%` }}>
            {high >= 10 ? `${high}%` : ''}
          </div>
        )}
      </div>
      <div className="flex justify-between px-2">
         <div className="flex flex-col items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-amber-400" />
            <span className="text-[8px] font-black text-gray-400 uppercase tracking-tighter">Low</span>
         </div>
         <div className="flex flex-col items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-[8px] font-black text-gray-400 uppercase tracking-tighter">Target</span>
         </div>
         <div className="flex flex-col items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-rose-500" />
            <span className="text-[8px] font-black text-gray-400 uppercase tracking-tighter">High</span>
         </div>
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  const { user, t, language } = useUser();
  const [period, setPeriod] = useState<7 | 30>(7);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Show BackButton on Analytics
    // @ts-ignore
    const WebApp = window.Telegram?.WebApp;
    if (WebApp) {
      WebApp.BackButton.show();
      WebApp.BackButton.onClick(() => {
          window.location.href = '/';
      });
    }
  }, []);

  const load = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const res = await axios.get(`/api/analytics?telegram_id=${user.telegram_id}&days=${period}`);
      if (res.data.success) setData(res.data.data);
    } finally {
      setIsLoading(false);
    }
  }, [user, period]);

  useEffect(() => { load(); }, [load]);

  const handleExport = () => {
    if (!user) return;
    window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('medium');
    window.open(`/api/export/csv?telegram_id=${user.telegram_id}&days=${period}`, '_blank');
  };

  const statCards = data ? [
    { label: t.avg_sugar, value: data.avg_sugar, unit: 'ммоль', icon: Droplets, color: data.avg_sugar > 8.5 ? 'text-amber-600' : 'text-emerald-600' },
    { label: t.avg_xe, value: data.avg_xe, unit: 'ХО', icon: Activity, color: 'text-cyan-600' },
    { label: t.avg_dose, value: data.avg_dose, unit: 'од.', icon: Syringe, color: 'text-purple-600' },
  ] : [];

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
            {t.analytics_title || "Тренди"}
         </h1>
         <button
           onClick={handleExport}
           className="w-10 h-10 flex items-center justify-center nm-outset nm-active rounded-xl text-emerald-500 transition-all"
         >
           <Download className="w-5 h-5" />
         </button>
      </header>

      {/* Period Selector */}
      <div className="nm-inset rounded-[2rem] p-1.5 flex gap-1 mb-8">
        {[7, 30].map(p => (
          <button
            key={p}
            onClick={() => { setPeriod(p as any); window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light'); }}
            className={cn(
              "flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all",
              period === p ? "nm-outset text-emerald-500 bg-[#F8F4F0]" : "text-gray-400 opacity-60"
            )}
          >
            {p === 7 ? t.days_7 : t.days_30}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="nm-outset rounded-[2.5rem] p-8 h-32 animate-pulse" />
          ))}
        </div>
      ) : !data || data.total_logs === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in-up">
           <div className="w-16 h-16 nm-inset rounded-full flex items-center justify-center mb-6">
              <TrendingUp className="w-8 h-8 text-gray-300" />
           </div>
           <p className="text-[#111827] font-black uppercase tracking-widest text-xs opacity-60 mb-2">{t.no_data}</p>
           <p className="text-gray-400 text-[10px] font-bold max-w-[200px] uppercase tracking-tighter opacity-80">{t.no_data_desc}</p>
        </div>
      ) : (
        <div className="space-y-8 animate-fade-in-up">
          {/* Stats Row */}
          <div className="grid grid-cols-3 gap-4 px-1">
            {statCards.map((card, i) => (
              <div key={i} className="nm-outset rounded-[2rem] p-4 flex flex-col items-center text-center">
                <card.icon className={cn("w-3.5 h-3.5 mb-2 opacity-50", card.color)} />
                <span className={cn("text-xl font-black leading-none", card.color)}>{card.value}</span>
                <span className="text-[7px] font-black text-gray-400 uppercase tracking-widest mt-1">{card.unit}</span>
                <span className="text-[8px] font-bold text-gray-500 uppercase mt-2 leading-tight">{card.label}</span>
              </div>
            ))}
          </div>

          {/* TIR Section */}
          <section className="nm-outset rounded-[2.5rem] p-8 space-y-6">
            <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center">
                 <Activity className="w-4 h-4 text-emerald-500" />
              </div>
              <h2 className="text-xs font-black text-[#111827] uppercase tracking-widest">{t.tir_title}</h2>
            </div>
            <TirBar t={t} low={data.tir_low} target={data.tir_target} high={data.tir_high} />
            <p className="text-[8px] font-bold text-gray-400 text-center uppercase tracking-widest opacity-60">{t.tir_target_range}</p>
          </section>

          {/* Sparkline */}
          {data.daily_avg.length >= 2 && (
            <section className="nm-outset rounded-[2.5rem] p-8 space-y-6">
              <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
                <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center">
                   <TrendingUp className="w-4 h-4 text-blue-500" />
                </div>
                <h2 className="text-xs font-black text-[#111827] uppercase tracking-widest">{t.daily_avg_title}</h2>
              </div>
              <Sparkline data={data.daily_avg} />
              <div className="flex justify-between px-2">
                 <span className="text-[8px] font-black text-gray-400 uppercase">{new Date(data.daily_avg[0].date).toLocaleDateString(language, { day: 'numeric', month: 'short' })}</span>
                 <span className="text-[8px] font-black text-gray-400 uppercase">{new Date(data.daily_avg[data.daily_avg.length - 1].date).toLocaleDateString(language, { day: 'numeric', month: 'short' })}</span>
              </div>
            </section>
          )}

          {/* Export Button */}
          <button 
             onClick={handleExport}
             className="w-full nm-outset nm-active bg-[#111827] p-6 rounded-[2rem] text-white font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 shadow-xl"
          >
             <Download className="w-4 h-4 text-emerald-400" />
             {t.download_csv}
          </button>
          
          <p className="text-center text-[8px] font-bold text-gray-300 uppercase tracking-widest pb-10">
             {t.export_desc.replace('{days}', period.toString())}
          </p>
        </div>
      )}
    </main>
  );
}
