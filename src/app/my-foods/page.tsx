"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2, Syringe, UtensilsCrossed, Search } from "lucide-react";
import { useUser } from "@/components/providers/TelegramProvider";
import axios from "axios";

declare global {
  interface Window { Telegram?: any; }
}

type MyFood = {
  id: string;
  name: string;
  xe: number;
  description?: string;
  created_at: string;
};

export default function MyFoodsPage() {
  const { user, t } = useUser();
  const [foods, setFoods] = useState<MyFood[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Add food modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newXe, setNewXe] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 2500);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const loadFoods = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const res = await axios.get(`/api/my-foods?telegram_id=${user.telegram_id}`);
      if (res.data.success) setFoods(res.data.data);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => { loadFoods(); }, [loadFoods]);

  const handleAdd = async () => {
    if (!user || !newName || !newXe) return;
    setIsAdding(true);
    try {
      await axios.post('/api/my-foods', {
        telegram_id: user.telegram_id,
        name: newName,
        xe: parseFloat(newXe),
        description: newDesc || null
      });
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success');
      setToastMessage(t.food_saved || "Блюдо сохранено!");
      setShowAddModal(false);
      setNewName(""); setNewXe(""); setNewDesc("");
      loadFoods();
    } catch (e) {
      setToastMessage(t.save_error || "Ошибка сохранения");
    } finally {
      setIsAdding(false);
    }
  };

  const handleDelete = async (id: string) => {
    window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('medium');
    try {
      await axios.delete(`/api/my-foods?id=${id}`);
      setFoods(prev => prev.filter(f => f.id !== id));
      setToastMessage(t.food_deleted || "Блюдо удалено");
    } catch (e) {
      setToastMessage(t.save_error || "Ошибка");
    }
  };

  const filtered = foods.filter(f =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <main className="min-h-screen p-4 max-w-md mx-auto pb-28 relative overflow-hidden">
      {/* Decorative blobs */}
      <div className="absolute top-40 right-0 -mr-20 w-64 h-64 bg-amber-500/10 rounded-full blur-[80px] pointer-events-none" />
      <div className="absolute bottom-40 left-0 -ml-20 w-64 h-64 bg-orange-500/10 rounded-full blur-[80px] pointer-events-none" />

      {/* Header */}
      <header className="flex items-center gap-4 mb-6 pt-4 relative z-10">
        <Link href="/" className="p-2 -ml-2 rounded-full hover:bg-white/10 transition-colors text-slate-300">
          <ArrowLeft className="w-6 h-6" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-amber-400 to-orange-400 tracking-tight">
            {t.my_foods_title || "Моя еда"}
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">{foods.length} {t.my_foods_count || "блюд сохранено"}</p>
        </div>
        <button
          onClick={() => { setShowAddModal(true); window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('medium'); }}
          className="p-3 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl text-gray-900 shadow-[0_0_20px_rgba(251,191,36,0.3)] active:scale-95 transition-transform"
        >
          <Plus className="w-5 h-5" />
        </button>
      </header>

      {/* Search */}
      {foods.length > 3 && (
        <div className="relative mb-4 z-10">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t.search_foods || "Поиск блюд..."}
            className="w-full bg-white/5 border border-white/10 rounded-2xl pl-10 pr-4 py-3 text-white font-medium text-sm focus:ring-2 focus:ring-amber-500/50 focus:outline-none"
          />
        </div>
      )}

      {/* List */}
      <div className="space-y-3 relative z-10">
        {isLoading ? (
          // Skeleton loaders
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white/5 rounded-3xl p-5 animate-pulse">
              <div className="h-4 bg-white/10 rounded-full w-2/3 mb-3" />
              <div className="h-3 bg-white/5 rounded-full w-1/3" />
            </div>
          ))
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-20 h-20 bg-amber-500/10 rounded-full flex items-center justify-center mb-4">
              <UtensilsCrossed className="w-10 h-10 text-amber-500/50" />
            </div>
            <p className="text-gray-400 font-semibold text-lg">{t.my_foods_empty_title || "Список пуст"}</p>
            <p className="text-gray-600 text-sm mt-2 max-w-[220px]">{t.my_foods_empty_desc || "Сохраняй свои стандартные блюда для быстрого добавления"}</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="mt-6 bg-gradient-to-r from-amber-400 to-orange-500 text-gray-900 font-bold px-6 py-3 rounded-2xl active:scale-95 transition-transform shadow-[0_0_15px_rgba(251,191,36,0.3)]"
            >
              {t.add_first_meal || "+ Добавить блюдо"}
            </button>
          </div>
        ) : (
          filtered.map((food, idx) => (
            <div
              key={food.id}
              className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-5 flex items-center gap-4 animate-fade-in-up group"
              style={{ animationDelay: `${idx * 60}ms` }}
            >
              {/* XE Badge */}
              <div className="flex-shrink-0 w-14 h-14 bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 rounded-2xl flex flex-col items-center justify-center">
                <span className="text-xl font-black text-amber-400 leading-none">{food.xe}</span>
                <span className="text-[9px] text-amber-500/80 font-bold uppercase tracking-wider">ХЕ</span>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-white font-bold text-base truncate">{food.name}</p>
                {food.description && (
                  <p className="text-gray-500 text-xs mt-0.5 truncate">{food.description}</p>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <Link
                  href={`/?quick_food=${encodeURIComponent(food.name)}&quick_xe=${food.xe}`}
                  onClick={() => window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light')}
                  className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400 hover:bg-amber-500/20 active:scale-95 transition-all"
                  title="Добавить в журнал"
                >
                  <Syringe className="w-4 h-4" />
                </Link>
                <button
                  onClick={() => handleDelete(food.id)}
                  className="p-2.5 text-gray-600 hover:text-red-400 hover:bg-red-500/10 rounded-xl opacity-0 group-hover:opacity-100 transition-all active:scale-95"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Food Modal (Bottom Sheet) */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-end">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowAddModal(false)} />
          <div className="relative w-full max-w-md mx-auto bg-[#0f1115] border border-white/10 rounded-t-[2rem] p-6 space-y-5 shadow-2xl animate-in slide-in-from-bottom duration-300">
            <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-2" />
            <h2 className="text-xl font-extrabold text-white">{t.add_food_title || "Новое блюдо"}</h2>

            <div className="space-y-3">
              <input
                type="text"
                placeholder={t.food_name_placeholder || "Название (напр., Овсянка с молоком)"}
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-white font-medium focus:ring-2 focus:ring-amber-500/50 focus:outline-none"
                autoFocus
              />
              <input
                type="number"
                step="0.5"
                placeholder={t.food_xe_placeholder || "Количество ХЕ (напр., 3.5)"}
                value={newXe}
                onChange={(e) => setNewXe(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-white font-medium focus:ring-2 focus:ring-amber-500/50 focus:outline-none"
              />
              <input
                type="text"
                placeholder={t.food_desc_placeholder || "Описание (необязательно)"}
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-white font-medium focus:ring-2 focus:ring-amber-500/50 focus:outline-none"
              />
            </div>

            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 bg-white/5 border border-white/10 text-gray-400 p-4 rounded-2xl font-bold active:scale-95 transition-transform"
              >
                {t.cancel || "Отмена"}
              </button>
              <button
                onClick={handleAdd}
                disabled={!newName || !newXe || isAdding}
                className="flex-[2] bg-gradient-to-r from-amber-400 to-orange-500 text-gray-900 p-4 rounded-2xl font-extrabold active:scale-95 transition-transform disabled:opacity-50 shadow-[0_0_20px_rgba(251,191,36,0.3)]"
              >
                {isAdding ? "..." : (t.save || "Сохранить")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-32 left-0 right-0 flex justify-center z-50 pointer-events-none px-4">
          <div className="bg-gray-900 border border-white/10 text-white px-5 py-3 rounded-full shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-bottom-2">
            <span className="text-sm font-semibold">{toastMessage}</span>
          </div>
        </div>
      )}
    </main>
  );
}
