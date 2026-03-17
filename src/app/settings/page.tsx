"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Save, Plus, Trash2 } from "lucide-react";
import { CoefMatrixRow } from "@/types";
import { useUser } from "@/components/providers/TelegramProvider";

export default function SettingsPage() {
  const { t } = useUser();
  const [hypoThreshold, setHypoThreshold] = useState("3.9");
  const [targetSugar, setTargetSugar] = useState("5.5");
  const [xeWeight, setXeWeight] = useState("12");
  
  const [matrix, setMatrix] = useState<CoefMatrixRow[]>([
    { min: 4.0, max: 7.0, coef: 1.0 },
    { min: 7.1, max: 10.0, coef: 1.5 },
  ]);

  const handleAddRow = () => {
    const lastRow = matrix[matrix.length - 1];
    setMatrix([...matrix, { min: lastRow ? lastRow.max + 0.1 : 4.0, max: 20.0, coef: 2.0 }]);
  };

  const handleUpdateRow = (index: number, field: keyof CoefMatrixRow, value: string) => {
    const newMatrix = [...matrix];
    newMatrix[index][field] = parseFloat(value) || 0;
    setMatrix(newMatrix);
  };

  const handleRemoveRow = (index: number) => {
    setMatrix(matrix.filter((_, i) => i !== index));
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
        <section className="space-y-4 glass-panel p-6 rounded-3xl animate-fade-in-up">
          <h2 className="text-lg font-semibold text-slate-200 border-b border-white/10 pb-3">{t.basic_settings}</h2>
          
          <div className="grid grid-cols-2 gap-5 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-400 tracking-wide">{t.hypo_threshold}</label>
              <input 
                type="number" step="0.1" value={hypoThreshold} onChange={(e) => setHypoThreshold(e.target.value)}
                className="w-full glass-input rounded-xl p-3 text-white focus:border-indigo-500/50 focus:bg-white/5 focus:outline-none transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-400 tracking-wide">{t.target_sugar}</label>
              <input 
                type="number" step="0.1" value={targetSugar} onChange={(e) => setTargetSugar(e.target.value)}
                className="w-full glass-input rounded-xl p-3 text-white focus:border-indigo-500/50 focus:bg-white/5 focus:outline-none transition-all"
              />
            </div>
            <div className="space-y-1.5 col-span-2 pt-2">
              <label className="text-xs font-medium text-slate-400 tracking-wide">{t.xe_weight_label}</label>
              <div className="flex glass-input rounded-xl overflow-hidden p-1 shadow-inner">
                {[10, 11, 12, 15].map(w => (
                  <button 
                    key={w}
                    onClick={() => setXeWeight(w.toString())}
                    className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all duration-300 ${xeWeight === w.toString() ? 'bg-indigo-500/80 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                  >
                    {w}г
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Matrix Settings */}
        <section className="space-y-4 glass-panel p-6 rounded-3xl animate-fade-in-up" style={{ animationDelay: '150ms' }}>
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h2 className="text-lg font-semibold text-slate-200">{t.matrix_settings}</h2>
            <button onClick={handleAddRow} className="text-indigo-400 p-1 px-2 hover:bg-white/10 rounded-lg flex items-center gap-1.5 text-sm font-semibold transition-colors">
              <Plus className="w-4 h-4" /> {t.add}
            </button>
          </div>
          
          <div className="space-y-3 pt-2">
            <div className="flex text-xs font-semibold text-slate-500 tracking-wide px-1">
              <span className="flex-1">{t.sugar_from}</span>
              <span className="flex-1 text-center">{t.sugar_to}</span>
              <span className="w-20 text-right pr-6">{t.ins_per_xe}</span>
            </div>

            {matrix.map((row, idx) => (
              <div key={idx} className="flex gap-2 items-center glass-input p-2.5 rounded-2xl group transition-all hover:border-indigo-500/30">
                <input 
                  type="number" step="0.1" value={row.min} onChange={(e) => handleUpdateRow(idx, 'min', e.target.value)}
                  className="w-full bg-transparent text-white text-center font-semibold focus:outline-none focus:bg-white/5 rounded-lg p-1.5 transition-colors"
                />
                <span className="text-indigo-300 font-bold opacity-60">-</span>
                <input 
                  type="number" step="0.1" value={row.max} onChange={(e) => handleUpdateRow(idx, 'max', e.target.value)}
                  className="w-full bg-transparent text-white text-center font-semibold focus:outline-none focus:bg-white/5 rounded-lg p-1.5 transition-colors"
                />
                <span className="text-indigo-300 font-bold opacity-60">={'>'}</span>
                <input 
                  type="number" step="0.1" value={row.coef} onChange={(e) => handleUpdateRow(idx, 'coef', e.target.value)}
                  className="w-16 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 text-indigo-300 text-center font-bold focus:outline-none focus:border-indigo-400/50 focus:bg-indigo-500/30 rounded-lg p-1.5 ml-auto transition-colors"
                />
                <button onClick={() => handleRemoveRow(idx)} className="text-slate-500 hover:text-red-400 p-1.5 ml-1 transition-colors rounded-lg hover:bg-red-500/10 opacity-0 group-hover:opacity-100">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </section>

        <button className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-medium p-4 rounded-2xl flex items-center justify-center gap-2 transition-all duration-300 mt-8 shadow-[0_8px_30px_rgb(16,185,129,0.3)] border border-white/10 active:scale-95 group relative overflow-hidden animate-fade-in-up" style={{ animationDelay: '300ms' }}>
          <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
          <Save className="w-5 h-5 relative z-10" />
          <span className="relative z-10">{t.save_settings}</span>
        </button>
      </div>
    </main>
  );
}
