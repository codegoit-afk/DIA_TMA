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
  const { user, t, language } = useUser();
  const [foods, setFoods] = useState<MyFood[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Add food modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newXe, setNewXe] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    // Show BackButton on My Foods
    // @ts-ignore
    const WebApp = window.Telegram?.WebApp;
    if (WebApp) {
      WebApp.BackButton.show();
      WebApp.BackButton.onClick(() => {
          window.location.href = '/';
      });
    }
  }, []);

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
      setToastMessage(t.food_saved || "Збережено!");
      setShowAddModal(false);
      setNewName(""); setNewXe(""); setNewDesc("");
      loadFoods();
    } catch (e) {
      setToastMessage(t.save_error || "Помилка");
    } finally {
      setIsAdding(false);
    }
  };

  const handleDelete = async (id: string) => {
    window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('medium');
    try {
      await axios.delete(`/api/my-foods?id=${id}`);
      setFoods(prev => prev.filter(f => f.id !== id));
      setToastMessage(t.food_deleted || "Видалено");
    } catch (e) {
      setToastMessage(t.save_error || "Помилка");
    }
  };

  const filtered = foods.filter(f =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
            {t.my_foods_title || "Страви"}
         </h1>
         <button
           onClick={() => { setShowAddModal(true); window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('medium'); }}
           className="w-10 h-10 flex items-center justify-center nm-outset nm-active rounded-xl text-emerald-500 transition-all"
         >
           <Plus className="w-5 h-5" />
         </button>
      </header>

      {/* Search */}
      {(foods.length > 3 || searchQuery) && (
        <div className="mb-6 z-10 animate-fade-in-up">
           <div className="nm-inset rounded-2xl flex items-center px-4 py-1">
              <Search className="w-4 h-4 text-gray-400 mr-2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t.search_foods || "Пошук..."}
                className="w-full bg-transparent py-3 text-sm font-bold text-[#111827] focus:outline-none"
              />
           </div>
        </div>
      )}

      {/* List */}
      <div className="space-y-6 relative z-10">
        {isLoading ? (
           <div className="space-y-4">
              {[1, 2, 3].map((_, i) => (
                <div key={i} className="nm-outset rounded-[2rem] p-6 h-24 animate-pulse" />
              ))}
           </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in-up">
            <div className="w-16 h-16 nm-inset rounded-full flex items-center justify-center mb-6">
              <UtensilsCrossed className="w-8 h-8 text-gray-300" />
            </div>
            <p className="text-[#111827] font-black uppercase tracking-widest text-xs opacity-60 mb-2">{t.my_foods_empty_title || "Список порожній"}</p>
            <p className="text-gray-400 text-[10px] font-bold max-w-[200px] uppercase tracking-tighter opacity-80">{t.my_foods_empty_desc || "Зберігайте страви для швидкого розрахунку"}</p>
          </div>
        ) : (
          <div className="space-y-6">
            {filtered.map((food, idx) => (
              <div
                key={food.id}
                className="nm-outset rounded-[2.5rem] p-5 flex items-center gap-4 animate-fade-in-up group overflow-hidden relative"
                style={{ animationDelay: `${idx * 60}ms` }}
              >
                {/* XE Badge */}
                <div className="nm-inset rounded-2xl flex flex-col items-center justify-center w-14 h-14 bg-emerald-50/10">
                   <span className="text-lg font-black text-emerald-600 leading-none">{food.xe}</span>
                   <span className="text-[8px] text-emerald-500/60 font-black uppercase tracking-widest">ХО</span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0 pr-2">
                  <p className="text-[#111827] font-black text-sm truncate uppercase tracking-tight">{food.name}</p>
                  {food.description && (
                    <p className="text-gray-400 text-[10px] mt-0.5 truncate font-bold">{food.description}</p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <Link
                    href={`/?quick_food=${encodeURIComponent(food.name)}&quick_xe=${food.xe}`}
                    onClick={() => window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light')}
                    className="w-10 h-10 flex items-center justify-center nm-outset nm-active rounded-xl text-emerald-500"
                  >
                    <Syringe className="w-4 h-4" />
                  </Link>
                  <button
                    onClick={() => handleDelete(food.id)}
                    className="w-10 h-10 flex items-center justify-center text-gray-200 hover:text-red-400 transition-all opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Food Modal (Bottom Sheet) */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-[#F8F4F0]/80 backdrop-blur-sm" onClick={() => setShowAddModal(false)} />
          <div className="relative w-full max-w-[375px] bg-[#F8F4F0] border-t border-white rounded-t-[3rem] p-8 space-y-6 shadow-[0_-20px_40px_rgba(0,0,0,0.05)] animate-in slide-in-from-bottom duration-300">
            <div className="w-12 h-1.5 nm-inset rounded-full mx-auto mb-4" />
            
            <h2 className="text-sm font-black text-[#111827] uppercase tracking-widest text-center">{t.add_food_title || "Нова страва"}</h2>

            <div className="space-y-4">
               <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{t.food_name_label || "Назва"}</label>
                  <div className="nm-inset rounded-2xl p-0.5">
                    <input
                      type="text"
                      placeholder={t.food_name_placeholder || "Напр., Вівсянка..."}
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      className="w-full bg-transparent px-4 py-4 text-sm font-bold text-[#111827] focus:outline-none"
                    />
                  </div>
               </div>

               <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{t.food_xe_label || "Кількість ХО"}</label>
                  <div className="nm-inset rounded-2xl p-0.5">
                    <input
                      type="number"
                      step="0.1"
                      placeholder="3.5"
                      value={newXe}
                      onChange={(e) => setNewXe(e.target.value)}
                      className="w-full bg-transparent px-4 py-4 text-sm font-bold text-[#111827] focus:outline-none"
                    />
                  </div>
               </div>

               <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{t.description_label || "Опис (опціонально)"}</label>
                  <div className="nm-inset rounded-2xl p-0.5">
                    <input
                      type="text"
                      placeholder="..."
                      value={newDesc}
                      onChange={(e) => setNewDesc(e.target.value)}
                      className="w-full bg-transparent px-4 py-4 text-sm font-bold text-[#111827] focus:outline-none"
                    />
                  </div>
               </div>
            </div>

            <div className="flex gap-4 pt-4">
                <button
                   onClick={() => setShowAddModal(false)}
                   className="flex-1 py-4 font-black uppercase tracking-widest text-[10px] text-gray-500 nm-outset nm-active rounded-2xl"
                >
                   {t.cancel || "Скасувати"}
                </button>
                <button
                   onClick={handleAdd}
                   disabled={!newName || !newXe || isAdding}
                   className="flex-[2] py-4 bg-emerald-500 text-white font-black uppercase tracking-widest text-[10px] nm-outset nm-active rounded-2xl disabled:opacity-50"
                >
                   {isAdding ? "..." : (t.save || "Зберегти")}
                </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-32 left-0 right-0 flex justify-center z-50 pointer-events-none px-4">
           <div className="nm-outset bg-white/90 px-6 py-3 rounded-full shadow-xl">
             <span className="text-[10px] font-black text-[#111827] uppercase tracking-widest">{toastMessage}</span>
          </div>
        </div>
      )}
    </main>
  );
}
