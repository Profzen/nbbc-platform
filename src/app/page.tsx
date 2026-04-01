"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { Users, CreditCard, ShieldCheck, Clock, Download, ArrowRight, Globe } from 'lucide-react';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6'];

export default function Dashboard() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/stats')
      .then(r => r.json())
      .then(d => { if (d.success) setStats(d.data); })
      .finally(() => setLoading(false));
  }, []);

  const exportCSV = () => window.open('/api/export/clients', '_blank');

  if (loading) return (
    <div className="flex items-center justify-center h-full min-h-[60vh]">
      <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  const { totaux, monthlyData, clientsByType, clientsByService, cartesByType, topPays } = stats || {};

  const kpiCards = [
    { title: 'Total Clients', value: totaux?.totalClients ?? 0, icon: Users, color: 'from-blue-500 to-indigo-600', link: '/clients' },
    { title: 'Comptes Enregistrés', value: totaux?.totalCartes ?? 0, icon: CreditCard, color: 'from-emerald-500 to-teal-600', link: '/cartes' },
    { title: 'KYC Validés', value: totaux?.kycValide ?? 0, icon: ShieldCheck, color: 'from-green-500 to-emerald-600', link: '/kyc' },
    { title: 'KYC En attente', value: totaux?.kycEnAttente ?? 0, icon: Clock, color: 'from-amber-500 to-orange-600', link: '/kyc' },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* HEADER */}
      <header className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">Tableau de bord</h1>
          <p className="text-slate-500 mt-1 text-sm sm:text-base">Vue d'ensemble de la plateforme NBBC — {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
        </div>
        <button onClick={exportCSV} className="w-full sm:w-auto justify-center flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white px-5 py-2.5 rounded-xl font-medium transition-colors shadow">
          <Download size={18} /> Exporter Clients CSV
        </button>
      </header>

      {/* KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        {kpiCards.map((kpi, i) => {
          const Icon = kpi.icon;
          return (
            <Link key={i} href={kpi.link} className="relative bg-white rounded-2xl border border-slate-100 shadow-sm p-6 hover:shadow-md transition-all hover:-translate-y-0.5 group overflow-hidden">
              <div className={`absolute top-0 right-0 w-24 h-24 rounded-full bg-gradient-to-br ${kpi.color} opacity-10 -mr-8 -mt-8`}></div>
              <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${kpi.color} text-white flex items-center justify-center mb-4 shadow-lg`}>
                <Icon size={22} />
              </div>
              <p className="text-sm font-semibold text-slate-500">{kpi.title}</p>
              <p className="text-3xl font-black text-slate-800 mt-1">{kpi.value}</p>
              <div className="flex items-center gap-1 text-xs font-bold text-slate-400 mt-2 group-hover:text-blue-600 transition-colors">
                Voir détails <ArrowRight size={12} />
              </div>
            </Link>
          );
        })}
      </div>

      {/* GRAPHIQUES LIGNE 1 */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">
        {/* Évolution mensuelle */}
        <div className="min-w-0 overflow-hidden xl:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-6">
          <h2 className="text-lg font-bold text-slate-800 mb-1">Nouveaux Clients</h2>
          <p className="text-sm text-slate-400 mb-5">Évolution sur les 12 derniers mois</p>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={monthlyData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorClients" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="mois" tick={{ fontSize: 12, fill: '#94a3b8' }} />
              <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} allowDecimals={false} />
              <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 40px rgba(0,0,0,0.1)' }} />
              <Area type="monotone" dataKey="clients" name="Clients" stroke="#6366f1" strokeWidth={2.5} fill="url(#colorClients)" dot={{ fill: '#6366f1', r: 4 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Type de clients */}
        <div className="min-w-0 overflow-hidden bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-6">
          <h2 className="text-lg font-bold text-slate-800 mb-1">Types de Clients</h2>
          <p className="text-sm text-slate-400 mb-4">Répartition actuelle</p>
          {clientsByType?.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={clientsByType} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                    {clientsByType.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 mt-2">
                {clientsByType.map((d: any, i: number) => (
                  <div key={i} className="flex justify-between items-center text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
                      <span className="text-slate-600 font-medium capitalize">{d.name}</span>
                    </div>
                    <span className="font-bold text-slate-800">{d.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-40 flex items-center justify-center text-slate-300 text-sm">Aucune donnée</div>
          )}
        </div>
      </div>

      {/* GRAPHIQUES LIGNE 2 */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Services utilisés */}
        <div className="min-w-0 overflow-hidden xl:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-6">
          <h2 className="text-lg font-bold text-slate-800 mb-1">Services Utilisés</h2>
          <p className="text-sm text-slate-400 mb-5">Distribution des services parmi tous les clients</p>
          {clientsByService?.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={clientsByService} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#94a3b8' }} />
                <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
                <Bar dataKey="value" name="Clients" radius={[6, 6, 0, 0]}>
                  {clientsByService.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-slate-300 text-sm">Aucun service enregistré</div>
          )}
        </div>

        {/* Top Pays + Accès Rapide */}
        <div className="space-y-4">
          {/* Top Pays */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-6">
            <h2 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Globe size={18} className="text-slate-400" /> Top Pays
            </h2>
            <div className="space-y-3">
              {topPays?.length > 0 ? topPays.map((p: any, i: number) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-xs font-black text-slate-400 w-4">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-semibold text-slate-700 truncate">{p.pays}</span>
                      <span className="text-xs font-bold text-slate-500">{p.count}</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${(p.count / (topPays[0]?.count || 1)) * 100}%`, backgroundColor: COLORS[i % COLORS.length] }}></div>
                    </div>
                  </div>
                </div>
              )) : <p className="text-slate-300 text-sm">Aucune donnée</p>}
            </div>
          </div>

          {/* Accès Rapide */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-4 sm:p-6 text-white">
            <h2 className="text-base font-bold mb-4">Accès Rapide</h2>
            <div className="space-y-2">
              {[
                { label: 'Nouveau Client', href: '/clients/nouveau', emoji: '👤' },
                { label: 'Demandes KYC', href: '/kyc', emoji: '🔍' },
                { label: 'Nouveau Compte', href: '/cartes', emoji: '💳' },
              ].map(item => (
                <Link key={item.href} href={item.href} className="flex items-center gap-3 p-3 bg-white/10 hover:bg-white/20 rounded-xl transition-colors">
                  <span>{item.emoji}</span>
                  <span className="text-sm font-semibold">{item.label}</span>
                  <ArrowRight size={14} className="ml-auto opacity-60" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
