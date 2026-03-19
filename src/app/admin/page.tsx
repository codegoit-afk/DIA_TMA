"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, Users, Activity, BarChart3, Search, Clock, ChevronRight, AlertCircle, ShieldCheck } from "lucide-react";
import { useUser } from "@/components/providers/TelegramProvider";
import axios from "axios";

declare global { interface Window { Telegram?: any; } }

type AdminStats = {
  total_users: number;
  logs_24h: number;
  active_7d: number;
  reminders_sent: number;
};

type UserProfile = {
  telegram_id: number;
  username?: string;
  first_name?: string;
  created_at: string;
  last_active: string | null;
  total_logs: number;
};

type UserLog = {
    id: string;
    created_at: string;
    current_sugar: number;
    total_xe: number;
    actual_dose: number;
};

export default function AdminPage() {
  const { user, t } = useUser();
  const [activeTab, setActiveTab] = useState<'stats' | 'users' | 'broadcast'>('stats');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [selectedUserLogs, setSelectedUserLogs] = useState<UserLog[]>([]);
  const [viewingUser, setViewingUser] = useState<UserProfile | null>(null);

  // Broadcast state
  const [bcMessage, setBcMessage] = useState("");
  const [bcBtnText, setBcBtnText] = useState("");
  const [bcBtnUrl, setBcBtnUrl] = useState("");
  const [bcLoading, setBcLoading] = useState(false);
  const [bcResult, setBcResult] = useState<any>(null);

  useEffect(() => {
    // Show BackButton on Admin
    // @ts-ignore
    const WebApp = window.Telegram?.WebApp;
    if (WebApp) {
      WebApp.BackButton.show();
    }
  }, []);

  const checkAuthAndLoad = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const statsRes = await axios.get(`/api/admin/stats?telegram_id=${user.telegram_id}`);
      if (statsRes.data.success) {
        setIsAuthorized(true);
        setStats(statsRes.data.data);
        const usersRes = await axios.get(`/api/admin/users?telegram_id=${user.telegram_id}`);
        if (usersRes.data.success) setUsers(usersRes.data.data);
      } else {
        setIsAuthorized(false);
      }
    } catch (e: any) {
      if (e.response?.status === 401) setIsAuthorized(false);
      else console.error("Admin error", e);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => { checkAuthAndLoad(); }, [checkAuthAndLoad]);

  const loadUserLogs = async (targetUser: UserProfile) => {
    if (!user) return;
    window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light');
    setViewingUser(targetUser);
    try {
      const res = await axios.get(`/api/admin/user-logs?telegram_id=${user.telegram_id}&target_user_id=${targetUser.telegram_id}`);
      if (res.data.success) setSelectedUserLogs(res.data.data);
    } catch (e) { console.error("Logs error", e); }
  };

  const handleBroadcast = async () => {
    if (!user || !bcMessage) return;
    setBcLoading(true);
    setBcResult(null);
    try {
      const res = await axios.post('/api/admin/broadcast', {
        telegram_id: user.telegram_id,
        message: bcMessage,
        button_text: bcBtnText,
        button_url: bcBtnUrl
      });
      setBcResult(res.data.data);
      if (res.data.success) {
         setBcMessage("");
         setBcBtnText("");
         setBcBtnUrl("");
      }
    } catch (e: any) {
      alert("Broadcast failed: " + (e.response?.data?.error || e.message));
    } finally {
      setBcLoading(false);
    }
  };

  const filteredUsers = users.filter(u => 
    u.username?.toLowerCase().includes(search.toLowerCase()) || 
    u.first_name?.toLowerCase().includes(search.toLowerCase()) ||
    u.telegram_id.toString().includes(search)
  );

  if (isAuthorized === false) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-[#030712]">
        <AlertCircle className="w-16 h-16 text-rose-500 mb-4 opacity-50" />
        <h1 className="text-2xl font-bold text-white mb-2">Доступ ограничен</h1>
        <p className="text-gray-500 max-w-xs">У вас нет прав администратора для просмотра этого раздела.</p>
        <Link href="/" className="mt-8 px-6 py-3 bg-white/5 border border-white/10 rounded-2xl text-white font-bold transition-all hover:bg-white/10">
            Вернуться назад
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-4 max-w-md mx-auto pb-32 bg-[#030712] relative overflow-hidden">
      {/* Background Blobs */}
      <div className="absolute top-20 -left-10 w-64 h-64 bg-emerald-500/10 rounded-full blur-[80px] pointer-events-none" />
      <div className="absolute bottom-40 -right-10 w-64 h-64 bg-indigo-500/10 rounded-full blur-[80px] pointer-events-none" />

      {/* Header */}
      <header className="mb-6 pt-4 relative z-10">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/" className="p-2 -ml-2 rounded-full hover:bg-white/10 transition-colors text-slate-300">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-indigo-400 tracking-tight">
                Центр управления
              </h1>
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
            </div>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.2em] mt-0.5">Панель администратора</p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex p-1 bg-white/5 border border-white/10 rounded-2xl">
          {[
            { id: 'stats', label: 'Статистика', icon: BarChart3 },
            { id: 'users', label: 'Юзеры', icon: Users },
            { id: 'broadcast', label: 'Рассылка', icon: Activity }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-black transition-all ${
                activeTab === tab.id 
                  ? 'bg-white/10 text-white shadow-lg' 
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      {isLoading ? (
        <div className="space-y-6 animate-pulse z-10 relative">
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-white/5 rounded-3xl" />)}
          </div>
          <div className="h-64 bg-white/5 rounded-3xl" />
        </div>
      ) : (
        <div className="z-10 relative">
          
          {activeTab === 'stats' && (
            <div className="grid grid-cols-2 gap-3 animate-in fade-in slide-in-from-bottom-2">
              {[
                { label: 'Всего юзеров', value: stats?.total_users, icon: Users, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
                { label: 'Запросы 24ч', value: stats?.logs_24h, icon: BarChart3, color: 'text-indigo-400', bg: 'bg-indigo-500/10 border-indigo-500/20' },
                { label: 'Активны 7дн', value: stats?.active_7d, icon: Activity, color: 'text-cyan-400', bg: 'bg-cyan-500/10 border-cyan-500/20' },
                { label: 'Напоминания', value: stats?.reminders_sent, icon: Clock, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
              ].map((s, i) => (
                <div key={i} className={`p-4 rounded-3xl border ${s.bg} flex flex-col justify-between h-28`}>
                  <s.icon className={`w-5 h-5 ${s.color}`} />
                  <div>
                    <div className="text-2xl font-black text-white">{s.value}</div>
                    <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{s.label}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'users' && (
            <section className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
              <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-4 py-3 rounded-2xl">
                <Search className="w-4 h-4 text-gray-500" />
                <input 
                  type="text" 
                  placeholder="Поиск по имени, @username или ID..." 
                  value={search} 
                  onChange={(e) => setSearch(e.target.value)}
                  className="bg-transparent border-none text-sm text-white placeholder-gray-600 focus:outline-none w-full font-bold"
                />
              </div>

              <div className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden divide-y divide-white/10">
                {filteredUsers.length === 0 ? (
                  <div className="p-10 text-center text-gray-500 text-sm">Юзеры не найдены</div>
                ) : (
                  filteredUsers.map(u => (
                    <button 
                      key={u.telegram_id}
                      onClick={() => loadUserLogs(u)}
                      className="w-full p-4 flex items-center justify-between hover:bg-white/[0.03] transition-colors active:bg-white/[0.08]"
                    >
                      <div className="flex flex-col items-start gap-1">
                        <span className="font-bold text-white text-sm">
                          {u.first_name || 'Пользователь'} {u.username && <span className="text-gray-500 font-medium text-xs ml-1">@{u.username}</span>}
                        </span>
                        <div className="flex items-center gap-3 text-[10px] font-bold text-gray-600 uppercase tracking-widest">
                          <span>ЛОГИ: {u.total_logs}</span>
                          <span>ID: {u.telegram_id}</span>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-700" />
                    </button>
                  ))
                )}
              </div>
            </section>
          )}

          {activeTab === 'broadcast' && (
            <section className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
               <div className="bg-white/5 border border-white/10 p-6 rounded-[2.5rem] space-y-4">
                  <div className="space-y-2">
                     <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Текст сообщения (поддерживается HTML)</label>
                     <textarea 
                        value={bcMessage}
                        onChange={(e) => setBcMessage(e.target.value)}
                        placeholder="Привет! У нас новая крутая фича..."
                        className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm text-white focus:outline-none focus:border-emerald-500/50 min-h-[120px] font-medium"
                     />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Текст кнопки</label>
                        <input 
                            type="text"
                            value={bcBtnText}
                            onChange={(e) => setBcBtnText(e.target.value)}
                            placeholder="Открыть приложение"
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Ссылка кнопки</label>
                        <input 
                            type="text"
                            value={bcBtnUrl}
                            onChange={(e) => setBcBtnUrl(e.target.value)}
                            placeholder="https://..."
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none"
                        />
                    </div>
                  </div>

                  <button 
                    disabled={bcLoading || !bcMessage}
                    onClick={handleBroadcast}
                    className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 ${
                        bcLoading ? 'bg-gray-800 text-gray-500' : 'bg-emerald-500 text-black active:scale-95 shadow-lg shadow-emerald-500/20'
                    }`}
                  >
                    {bcLoading ? 'Рассылка...' : 'Запустить рассылку'}
                    {!bcLoading && <Activity className="w-4 h-4" />}
                  </button>

                  {bcResult && (
                    <div className="p-4 bg-white/5 border border-white/10 rounded-2xl text-xs space-y-1">
                        <p className="text-emerald-400 font-bold">Успешно отправлено {bcResult.success} пользователям</p>
                        {bcResult.failed > 0 && <p className="text-rose-400 font-bold">Ошибок: {bcResult.failed}</p>}
                    </div>
                  )}
               </div>
            </section>
          )}

        </div>
      )}

      {/* User Detail Modal */}
      {viewingUser && (
        <div className="fixed inset-0 z-50 bg-[#030712]/95 backdrop-blur-md animate-in fade-in flex flex-col transform transition-transform">
          <header className="p-6 border-b border-white/10 flex items-center justify-between">
            <div>
              <h3 className="text-xl font-black text-white">{viewingUser.first_name || viewingUser.username}</h3>
              <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-1">Профиль пользователя</p>
            </div>
            <button 
              onClick={() => setViewingUser(null)}
              className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center border border-white/10 text-white font-bold"
            >
              ✕
            </button>
          </header>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
             <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="p-4 bg-white/5 border border-white/10 rounded-2xl">
                    <div className="text-[10px] text-gray-500 font-black uppercase mb-1">Всего логов</div>
                    <div className="text-xl font-black text-white">{viewingUser.total_logs}</div>
                </div>
                <div className="p-4 bg-white/5 border border-white/10 rounded-2xl">
                    <div className="text-[10px] text-gray-500 font-black uppercase mb-1">Последняя активность</div>
                    <div className="text-sm font-black text-emerald-400">
                        {viewingUser.last_active ? new Date(viewingUser.last_active).toLocaleString('ru-RU') : 'Никогда'}
                    </div>
                </div>
             </div>
            
            <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1 mb-2">Последняя активность</h4>
            {selectedUserLogs.map(log => (
              <div key={log.id} className="bg-white/5 border border-white/10 p-4 rounded-2xl flex items-center justify-between">
                <div>
                  <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">
                    {new Date(log.created_at).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-lg font-black text-white">{log.current_sugar} <span className="text-[10px] font-bold text-cyan-400 uppercase">С</span></div>
                    <div className="text-lg font-black text-white">{log.total_xe} <span className="text-[10px] font-bold text-amber-400 uppercase">ХЕ</span></div>
                  </div>
                </div>
                <div className="bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-xl">
                  <span className="text-lg font-black text-emerald-400">{log.actual_dose} <span className="text-[8px] uppercase">Ед</span></span>
                </div>
              </div>
            ))}
            {selectedUserLogs.length === 0 && <div className="text-center text-gray-600 py-10">Записей не найдено</div>}
          </div>
        </div>
      )}
    </main>
  );
}
