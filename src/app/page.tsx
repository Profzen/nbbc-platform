import Link from 'next/link';
import dbConnect from '@/lib/mongodb';
import Client from '@/models/Client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function Dashboard() {
  await dbConnect();
  const session = await getServerSession(authOptions);
  
  const totalClients = await Client.countDocuments();
  const pendingKyc = await Client.countDocuments({ statutKyc: 'EN_ATTENTE' });
  const activeAccounts = await Client.countDocuments({ servicesUtilises: { $not: { $size: 0 } } });

  const latestClients = await Client.find({}).sort({ createdAt: -1 }).limit(3);

  return (
    <div className="p-8">
      <header className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Vue d'ensemble</h1>
          <p className="text-slate-500 mt-1">Bienvenue sur le tableau de bord de gestion NBBC.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold shadow-md">
            {session?.user?.name?.[0]?.toUpperCase() || 'U'}
          </div>
        </div>
      </header>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {[
          { title: "Total Clients", value: totalClients.toString(), color: "bg-blue-50 text-blue-700", border: "border-blue-200" },
          { title: "Comptes Associés", value: activeAccounts.toString(), color: "bg-emerald-50 text-emerald-700", border: "border-emerald-200" },
          { title: "KYC en attente", value: pendingKyc.toString(), color: "bg-amber-50 text-amber-700", border: "border-amber-200" },
          { title: "Revenus (30j)", value: "N/A", color: "bg-purple-50 text-purple-700", border: "border-purple-200" },
        ].map((kpi, idx) => (
          <div key={idx} className={`p-6 rounded-2xl border ${kpi.border} ${kpi.color} shadow-sm transition-transform hover:scale-105 cursor-default`}>
            <h3 className="font-medium opacity-80">{kpi.title}</h3>
            <p className="text-3xl font-bold mt-2">{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <h2 className="text-xl font-bold text-slate-800 mb-4">Clients Récents</h2>
        {latestClients.length === 0 ? (
          <div className="text-slate-500 text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-300">
            Aucun client enregistré. Allez dans <Link href="/clients" className="text-blue-600 font-medium hover:underline">Clients</Link> pour commencer.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden">
            {latestClients.map(c => (
              <div key={c._id.toString()} className="p-4 flex justify-between items-center hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 text-indigo-700 font-bold flex items-center justify-center shadow-sm border border-indigo-200 text-sm">
                    {c.prenom[0]?.toUpperCase()}{c.nom[0]?.toUpperCase()}
                  </div>
                  <div>
                    <p className="font-bold text-slate-800">{c.prenom} {c.nom}</p>
                    <p className="text-xs text-slate-500">{c.email}</p>
                  </div>
                </div>
                <div className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
                  {c.typeClient?.replace('_', ' ')}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
