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
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [selectedUserLogs, setSelectedUserLogs] = useState<UserLog[]>([]);
  const [viewingUser, setViewingUser] = useState<UserProfile | null>(null);

  const checkAuthAndLoad = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      // First, check stats to see if we're authorized
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
      <header className="flex items-center gap-4 mb-8 pt-4 relative z-10">
        <Link href="/" className="p-2 -ml-2 rounded-full hover:bg-white/10 transition-colors text-slate-300">
          <ArrowLeft className="w-6 h-6" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-indigo-400 tracking-tight">
              Панель управления
            </h1>
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
          </div>
          <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-0.5">Администратор</p>
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
        <div className="space-y-6 z-10 relative">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Всего пользователей', value: stats?.total_users, icon: Users, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
              { label: 'Запросы за 24 ч', value: stats?.logs_24h, icon: BarChart3, color: 'text-indigo-400', bg: 'bg-indigo-500/10 border-indigo-500/20' },
              { label: 'Активны за неделю', value: stats?.active_7d, icon: Activity, color: 'text-cyan-400', bg: 'bg-cyan-500/10 border-cyan-500/20' },
              { label: 'Уведомлений ушло', value: stats?.reminders_sent, icon: Clock, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
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

          {/* User List */}
          <section className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-bold text-white tracking-tight">Пользователи</h2>
              <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-3 py-1.5 rounded-full">
                <Search className="w-3.5 h-3.5 text-gray-500" />
                <input 
                  type="text" 
                  placeholder="Поиск..." 
                  value={search} 
                  onChange={(e) => setSearch(e.target.value)}
                  className="bg-transparent border-none text-xs text-white placeholder-gray-600 focus:outline-none w-24"
                />
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden divide-y divide-white/10">
              {filteredUsers.length === 0 ? (
                <div className="p-10 text-center text-gray-500 text-sm">Пользователи не найдены</div>
              ) : (
                filteredUsers.map(u => (
                  <button 
                    key={u.telegram_id}
                    onClick={() => loadUserLogs(u)}
                    className="w-full p-4 flex items-center justify-between hover:bg-white/[0.03] transition-colors active:bg-white/[0.08]"
                  >
                    <div className="flex flex-col items-start gap-1">
                      <span className="font-bold text-white text-sm">
                        {u.first_name || 'User'} {u.username && <span className="text-gray-500 font-medium"> @{u.username}</span>}
                      </span>
                      <div className="flex items-center gap-3 text-[10px] font-bold text-gray-600 uppercase">
                        <span>L: {u.total_logs}</span>
                        <span>ID: {u.telegram_id}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right mr-2">
                        <div className="text-[10px] text-gray-500 font-bold uppercase tracking-tighter">Last Active</div>
                        <div className="text-[10px] text-emerald-400 font-black">
                          {u.last_active ? new Date(u.last_active).toLocaleDateString('ru-RU') : 'Never'}
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-700" />
                    </div>
                  </button>
                ))
              )}
            </div>
          </section>
        </div>
      )}

      {/* User Detail Modal (simplistic overlay for speed) */}
      {viewingUser && (
        <div className="fixed inset-0 z-50 bg-[#030712]/95 backdrop-blur-md animate-in fade-in flex flex-col transform transition-transform">
          <header className="p-6 border-b border-white/10 flex items-center justify-between">
            <div>
              <h3 className="text-xl font-black text-white">{viewingUser.first_name || viewingUser.username}</h3>
              <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-1">Последние 50 записей</p>
            </div>
            <button 
              onClick={() => setViewingUser(null)}
              className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center border border-white/10 text-white font-bold"
            >
              ✕
            </button>
          </header>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {selectedUserLogs.map(log => (
              <div key={log.id} className="bg-white/5 border border-white/10 p-4 rounded-2xl flex items-center justify-between">
                <div>
                  <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">
                    {new Date(log.created_at).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-lg font-black text-white">{log.current_sugar} <span className="text-[10px] font-bold text-cyan-400 uppercase">Sugar</span></div>
                    <div className="text-lg font-black text-white">{log.total_xe} <span className="text-[10px] font-bold text-amber-400 uppercase">XE</span></div>
                  </div>
                </div>
                <div className="bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-xl">
                  <span className="text-lg font-black text-emerald-400">{log.actual_dose} <span className="text-[8px] uppercase">Unit</span></span>
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
