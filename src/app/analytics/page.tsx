"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, TrendingUp, Download, Activity, Droplets, Syringe } from "lucide-react";
import { useUser } from "@/components/providers/TelegramProvider";
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
    <div className="h-24 flex items-center justify-center text-gray-600 text-sm">Недостаточно данных</div>
  );

  const W = 340;
  const H = 80;
  const PAD = 10;

  const values = data.map(d => d.avg_sugar);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const toX = (i: number) => PAD + (i / (data.length - 1)) * (W - PAD * 2);
  const toY = (v: number) => H - PAD - ((v - min) / range) * (H - PAD * 2);

  const points = data.map((d, i) => `${toX(i)},${toY(d.avg_sugar)}`).join(' ');

  // Danger zone (>10 mmol/L) line
  const dangerY = toY(10);
  const hypoY = toY(3.9);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full overflow-visible">
      {/* Danger zone shading */}
      {max > 10 && (
        <rect x={PAD} y={PAD} width={W - PAD * 2} height={Math.max(0, dangerY - PAD)} fill="rgba(251,113,133,0.08)" rx="4" />
      )}
      {/* Hypo zone shading */}
      {min < 3.9 && (
        <rect x={PAD} y={hypoY} width={W - PAD * 2} height={Math.max(0, H - PAD - hypoY)} fill="rgba(251,191,36,0.08)" rx="4" />
      )}
      {/* Target zone reference line */}
      <line x1={PAD} y1={dangerY} x2={W - PAD} y2={dangerY} stroke="rgba(251,113,133,0.4)" strokeDasharray="4 3" strokeWidth="1" />
      <text x={W - PAD - 2} y={dangerY - 3} fill="rgba(251,113,133,0.6)" fontSize="8" textAnchor="end">10</text>
      
      {/* Gradient fill under line */}
      <defs>
        <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#34d399" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#34d399" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon
        points={`${toX(0)},${H - PAD} ${points} ${toX(data.length - 1)},${H - PAD}`}
        fill="url(#sparkGrad)"
      />
      
      {/* Main line */}
      <polyline
        points={points}
        fill="none"
        stroke="#34d399"
        strokeWidth="2.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      
      {/* Data points */}
      {data.map((d, i) => (
        <circle key={i} cx={toX(i)} cy={toY(d.avg_sugar)} r="3"
          fill={d.avg_sugar > 10 ? '#fb7185' : d.avg_sugar < 3.9 ? '#fbbf24' : '#34d399'}
          stroke="#030712" strokeWidth="1.5"
        />
      ))}
    </svg>
  );
}

// --- TIR Bar ---
function TirBar({ low, target, high }: { low: number; target: number; high: number }) {
  return (
    <div className="space-y-3">
      <div className="flex h-6 rounded-full overflow-hidden gap-0.5 shadow-inner bg-black/20">
        {low > 0 && (
          <div className="bg-amber-400/80 flex items-center justify-center text-[10px] font-black text-amber-900 transition-all" style={{ width: `${low}%` }}>
            {low >= 8 ? `${low}%` : ''}
          </div>
        )}
        {target > 0 && (
          <div className="bg-emerald-400/80 flex items-center justify-center text-[10px] font-black text-emerald-900 flex-1 transition-all" style={{ width: `${target}%` }}>
            {target >= 10 ? `${target}%` : ''}
          </div>
        )}
        {high > 0 && (
          <div className="bg-rose-400/80 flex items-center justify-center text-[10px] font-black text-rose-900 transition-all" style={{ width: `${high}%` }}>
            {high >= 8 ? `${high}%` : ''}
          </div>
        )}
      </div>
      <div className="flex justify-between text-xs text-gray-500 font-medium">
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-amber-400/80 inline-block" /> Гипо {low}%</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-400/80 inline-block" /> В цели {target}%</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-rose-400/80 inline-block" /> Высокий {high}%</span>
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  const { user, t } = useUser();
  const [period, setPeriod] = useState<7 | 30>(7);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Show BackButton on Analytics
    // @ts-ignore
    const WebApp = window.Telegram?.WebApp;
    if (WebApp) {
      WebApp.BackButton.show();
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
    { label: 'Средний сахар', value: data.avg_sugar, unit: 'ммоль/л', icon: Droplets, color: data.avg_sugar > 10 ? 'from-rose-500/20 to-orange-500/20 border-rose-500/30' : 'from-emerald-500/20 to-cyan-500/20 border-emerald-500/30', textColor: data.avg_sugar > 10 ? 'text-rose-400' : 'text-emerald-400' },
    { label: 'Средние ХЕ', value: data.avg_xe, unit: 'ХЕ', icon: Activity, color: 'from-blue-500/20 to-purple-500/20 border-blue-500/30', textColor: 'text-blue-400' },
    { label: 'Средняя доза', value: data.avg_dose, unit: 'ед.', icon: Syringe, color: 'from-purple-500/20 to-indigo-500/20 border-purple-500/30', textColor: 'text-purple-400' },
  ] : [];

  return (
    <main className="min-h-screen p-4 max-w-md mx-auto pb-32 relative overflow-hidden">
      {/* Glow blobs */}
      <div className="absolute top-40 -right-20 w-64 h-64 bg-emerald-500/10 rounded-full blur-[80px] pointer-events-none" />
      <div className="absolute bottom-60 -left-20 w-64 h-64 bg-blue-500/10 rounded-full blur-[80px] pointer-events-none" />

      {/* Header */}
      <header className="flex items-center gap-4 mb-6 pt-4 relative z-10">
        <Link href="/" className="p-2 -ml-2 rounded-full hover:bg-white/10 transition-colors text-slate-300">
          <ArrowLeft className="w-6 h-6" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400 tracking-tight">
            {t.analytics_title || "Аналитика"}
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">{data ? `${data.total_logs} записей` : '—'}</p>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-1.5 px-3 py-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-xl text-xs font-bold active:scale-95 transition-transform"
        >
          <Download className="w-3.5 h-3.5" />
          CSV
        </button>
      </header>

      {/* Period Selector */}
      <div className="flex bg-black/40 rounded-2xl overflow-hidden p-1 shadow-inner border border-white/5 mb-5 relative z-10">
        {PERIODS.map(p => (
          <button
            key={p}
            onClick={() => { setPeriod(p); window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light'); }}
            className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all duration-300 ${period === p ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-md' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
          >
            {p} {p === 7 ? 'дней' : 'дней'}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-4 relative z-10">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white/5 rounded-3xl p-5 animate-pulse h-28" />
          ))}
        </div>
      ) : !data || data.total_logs === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center relative z-10">
          <div className="w-20 h-20 bg-blue-500/10 rounded-full flex items-center justify-center mb-4">
            <TrendingUp className="w-10 h-10 text-blue-500/50" />
          </div>
          <p className="text-gray-400 font-semibold text-lg">Нет данных</p>
          <p className="text-gray-600 text-sm mt-2 max-w-[220px]">Начни использовать калькулятор, чтобы здесь появились твои тренды</p>
        </div>
      ) : (
        <div className="space-y-4 relative z-10">
          {/* Stats Row */}
          <div className="grid grid-cols-3 gap-3">
            {statCards.map((card, i) => (
              <div key={i} className={`bg-gradient-to-br ${card.color} backdrop-blur-xl border rounded-2xl p-3 flex flex-col items-center text-center animate-fade-in-up`} style={{ animationDelay: `${i * 60}ms` }}>
                <card.icon className={`w-4 h-4 ${card.textColor} mb-1`} />
                <span className={`text-2xl font-black ${card.textColor} leading-none`}>{card.value}</span>
                <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider mt-0.5">{card.unit}</span>
                <span className="text-[9px] text-gray-600 mt-1 leading-tight">{card.label}</span>
              </div>
            ))}
          </div>

          {/* TIR Section */}
          <section className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-5 space-y-4 animate-fade-in-up" style={{ animationDelay: '80ms' }}>
            <h2 className="text-sm font-extrabold text-white tracking-tight flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              Время в целевом диапазоне (TIR)
            </h2>
            <TirBar low={data.tir_low} target={data.tir_target} high={data.tir_high} />
            <p className="text-[10px] text-gray-600 text-center">Целевой диапазон: 3.9 – 10.0 ммоль/л</p>
          </section>

          {/* Sparkline */}
          {data.daily_avg.length >= 2 && (
            <section className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-5 space-y-3 animate-fade-in-up" style={{ animationDelay: '120ms' }}>
              <h2 className="text-sm font-extrabold text-white tracking-tight flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-400" />
                Средний сахар по дням
              </h2>
              <div className="overflow-x-auto">
                <Sparkline data={data.daily_avg} />
              </div>
              <div className="flex justify-between text-[9px] text-gray-600 font-medium px-2">
                {data.daily_avg.length > 0 && (
                  <>
                    <span>{new Date(data.daily_avg[0].date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}</span>
                    <span>{new Date(data.daily_avg[data.daily_avg.length - 1].date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}</span>
                  </>
                )}
              </div>
            </section>
          )}

          {/* Export Section */}
          <section className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-5 animate-fade-in-up" style={{ animationDelay: '160ms' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-white">Экспорт для врача</p>
                <p className="text-xs text-gray-500 mt-0.5">CSV-файл за последние {period} дней</p>
              </div>
              <button
                onClick={handleExport}
                className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl text-xs font-extrabold active:scale-95 transition-transform shadow-[0_0_15px_rgba(99,102,241,0.3)]"
              >
                <Download className="w-3.5 h-3.5" />
                Скачать CSV
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
