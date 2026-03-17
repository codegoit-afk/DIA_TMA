"use client";

import Link from "next/link";
import { ArrowLeft, Clock, Syringe, Camera } from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { FoodLog } from "@/types";

// Mock data for UI
const mockLogs: FoodLog[] = [
  {
    id: "1",
    telegram_id: 123,
    current_sugar: 6.5,
    total_xe: 4.5,
    recommended_dose: 6,
    actual_dose: 6,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(), // 4h ago
  },
  {
    id: "2",
    telegram_id: 123,
    current_sugar: 9.2,
    total_xe: 3.0,
    recommended_dose: 5.5,
    actual_dose: 6,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
  }
];

export default function LogsPage() {
  return (
    <main className="min-h-screen bg-slate-950 p-4 max-w-md mx-auto pb-24">
      {/* Header */}
      <header className="flex items-center gap-4 mb-6 pt-4">
        <Link href="/" className="p-2 -ml-2 rounded-full hover:bg-slate-800 transition-colors text-slate-300">
          <ArrowLeft className="w-6 h-6" />
        </Link>
        <h1 className="text-2xl font-bold text-white">История</h1>
      </header>

      <div className="space-y-4">
        {mockLogs.map((log) => (
          <div key={log.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 relative overflow-hidden">
            
            {/* Top row: Time & Sugar */}
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2 text-slate-400 text-sm">
                <Clock className="w-4 h-4" />
                <span>{format(new Date(log.created_at), 'd MMM, HH:mm', { locale: ru })}</span>
              </div>
              
              <div className={`px-2 py-1 rounded-md text-sm font-bold ${
                log.current_sugar > 7.8 ? 'bg-orange-500/20 text-orange-400' :
                log.current_sugar < 4.0 ? 'bg-red-500/20 text-red-400' :
                'bg-emerald-500/20 text-emerald-400'
              }`}>
                {log.current_sugar} ммоль
              </div>
            </div>

            {/* Middle row: XE and Photo icon */}
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-2xl font-bold text-white">{log.total_xe} ХЕ</span>
                <span className="text-xs text-slate-500">Углеводы</span>
              </div>
              <div className="bg-slate-800 p-2 rounded-xl text-slate-400">
                <Camera className="w-6 h-6" />
              </div>
            </div>

            {/* Bottom row: Insulin dose */}
            <div className="pt-3 border-t border-slate-800/50 flex justify-between items-center">
              <div className="flex items-center gap-2 text-blue-400">
                <Syringe className="w-5 h-5" />
                <span className="font-semibold text-lg">{log.actual_dose} ед.</span>
              </div>
              {log.recommended_dose !== log.actual_dose && log.recommended_dose && (
                 <span className="text-xs text-slate-500">
                   (ИИ советовал: {log.recommended_dose})
                 </span>
              )}
            </div>

          </div>
        ))}

        {mockLogs.length === 0 && (
          <div className="text-center py-12 text-slate-500">
            <p>История пуста</p>
          </div>
        )}
      </div>
    </main>
  );
}
