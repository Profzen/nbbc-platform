"use client";

import { useState, useEffect, useCallback } from 'react';
import { Clock, User, ChevronDown, AlertCircle, Activity } from 'lucide-react';

interface LogEntry {
  _id: string;
  action: string;
  detail?: string;
  userName?: string;
  userRole?: string;
  createdAt: string;
}

export default function LogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchLogs = useCallback(async (skip = 0, append = false) => {
    if (!append) setLoading(true); else setLoadingMore(true);
    try {
      const res = await fetch(`/api/logs?skip=${skip}&limit=${skip === 0 ? 20 : 10}`);
      const data = await res.json();
      if (data.success) {
        setLogs(prev => append ? [...prev, ...data.data] : data.data);
        setTotal(data.total);
        setHasMore(data.hasMore);
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const loadMore = () => { fetchLogs(logs.length, true); };

  const formatDate = (d: string) => {
    const date = new Date(d);
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const roleColor = (role?: string) => {
    if (role === 'SUPER_ADMIN') return 'bg-red-100 text-red-700';
    if (role === 'AGENT') return 'bg-blue-100 text-blue-700';
    if (role === 'ANALYSTE') return 'bg-amber-100 text-amber-700';
    if (role === 'COMPLIANCE') return 'bg-emerald-100 text-emerald-700';
    return 'bg-slate-100 text-slate-600';
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
      <header className="mb-6">
        <h1 className="text-2xl font-black text-slate-800 flex items-center gap-3">
          <Activity size={24} className="text-indigo-600" /> Journal d&apos;activité
        </h1>
        <p className="text-sm text-slate-500 mt-1">Historique de toutes les actions effectuées sur la plateforme ({total} au total)</p>
      </header>

      {loading ? (
        <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" /></div>
      ) : logs.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-200">
          <AlertCircle size={40} className="text-slate-200 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-700">Aucune activité enregistrée</h3>
        </div>
      ) : (
        <div className="space-y-2">
          {logs.map(log => (
            <div key={log._id} className="bg-white rounded-xl border border-slate-200 px-5 py-4 flex items-start gap-4 hover:shadow-sm transition-all">
              <div className="w-9 h-9 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 mt-0.5">
                <Activity size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-slate-800 text-sm">{log.action}</span>
                  {log.detail && <span className="text-xs text-slate-500 truncate max-w-xs">— {log.detail}</span>}
                </div>
                <div className="flex items-center gap-3 mt-1.5">
                  {log.userName && (
                    <span className="flex items-center gap-1 text-xs text-slate-500">
                      <User size={11} /> {log.userName}
                    </span>
                  )}
                  {log.userRole && (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${roleColor(log.userRole)}`}>
                      {log.userRole}
                    </span>
                  )}
                  <span className="flex items-center gap-1 text-xs text-slate-400">
                    <Clock size={11} /> {formatDate(log.createdAt)}
                  </span>
                </div>
              </div>
            </div>
          ))}

          {hasMore && (
            <div className="text-center pt-4">
              <button onClick={loadMore} disabled={loadingMore}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm transition-colors disabled:opacity-60">
                {loadingMore ? (
                  <span className="w-4 h-4 border-2 border-slate-400/40 border-t-slate-600 rounded-full animate-spin" />
                ) : (
                  <ChevronDown size={16} />
                )}
                {loadingMore ? 'Chargement...' : 'Voir plus'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
