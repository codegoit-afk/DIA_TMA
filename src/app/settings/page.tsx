"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Save, Plus, Trash2 } from "lucide-react";
import { CoefMatrixRow } from "@/types";

export default function SettingsPage() {
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
    <main className="min-h-screen bg-slate-950 p-4 max-w-md mx-auto pb-24">
      {/* Header */}
      <header className="flex items-center gap-4 mb-8 pt-4">
        <Link href="/" className="p-2 -ml-2 rounded-full hover:bg-slate-800 transition-colors text-slate-300">
          <ArrowLeft className="w-6 h-6" />
        </Link>
        <h1 className="text-2xl font-bold text-white">Настройки</h1>
      </header>

      <div className="space-y-8">
        {/* Basic Settings */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-300 border-b border-slate-800 pb-2">Базовые параметры</h2>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs text-slate-400">Порог гипо (ммоль/л)</label>
              <input 
                type="number" step="0.1" value={hypoThreshold} onChange={(e) => setHypoThreshold(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-white focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-slate-400">Идеальный сахар</label>
              <input 
                type="number" step="0.1" value={targetSugar} onChange={(e) => setTargetSugar(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-white focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div className="space-y-1 col-span-2">
              <label className="text-xs text-slate-400">Вес 1 ХЕ (в граммах углеводов)</label>
              <div className="flex bg-slate-900 border border-slate-800 rounded-xl overflow-hidden p-1">
                {[10, 11, 12, 15].map(w => (
                  <button 
                    key={w}
                    onClick={() => setXeWeight(w.toString())}
                    className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${xeWeight === w.toString() ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
                  >
                    {w}г
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Matrix Settings */}
        <section className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <h2 className="text-lg font-semibold text-slate-300">Матрица коэффициентов</h2>
            <button onClick={handleAddRow} className="text-blue-400 p-1 hover:bg-slate-800 rounded flex items-center gap-1 text-sm font-medium">
              <Plus className="w-4 h-4" /> Добавить
            </button>
          </div>
          
          <div className="space-y-3">
            <div className="flex text-xs text-slate-500 px-1">
              <span className="flex-1">Сахар ОТ</span>
              <span className="flex-1 text-center">Сахар ДО</span>
              <span className="w-20 text-right pr-8">Инс на 1 ХЕ</span>
            </div>

            {matrix.map((row, idx) => (
              <div key={idx} className="flex gap-2 items-center bg-slate-900 p-2 rounded-xl border border-slate-800/50">
                <input 
                  type="number" step="0.1" value={row.min} onChange={(e) => handleUpdateRow(idx, 'min', e.target.value)}
                  className="w-full bg-transparent text-white text-center font-medium focus:outline-none focus:bg-slate-800 rounded p-1"
                />
                <span className="text-slate-500">-</span>
                <input 
                  type="number" step="0.1" value={row.max} onChange={(e) => handleUpdateRow(idx, 'max', e.target.value)}
                  className="w-full bg-transparent text-white text-center font-medium focus:outline-none focus:bg-slate-800 rounded p-1"
                />
                <span className="text-slate-500">={'>'}</span>
                <input 
                  type="number" step="0.1" value={row.coef} onChange={(e) => handleUpdateRow(idx, 'coef', e.target.value)}
                  className="w-16 bg-blue-900/30 text-blue-300 text-center font-bold focus:outline-none focus:bg-blue-900/50 rounded p-1 ml-auto"
                />
                <button onClick={() => handleRemoveRow(idx)} className="text-slate-600 hover:text-red-400 p-1">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </section>

        <button className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium p-4 rounded-xl flex items-center justify-center gap-2 transition-colors mt-8 shadow-lg shadow-emerald-900/20 active:scale-95">
          <Save className="w-5 h-5" />
          Сохранить настройки
        </button>
      </div>
    </main>
  );
}
