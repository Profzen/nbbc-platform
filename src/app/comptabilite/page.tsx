"use client";

import { useState, useEffect, useCallback } from 'react';
import { TrendingUp, ShoppingCart, Receipt, Wallet, CreditCard, Plus, X, Trash2, Search, BarChart3, BookOpen, ArrowDownCircle, ArrowUpCircle, Landmark, Edit3 } from 'lucide-react';

type TxType = 'ACHAT' | 'VENTE' | 'DEPENSE' | 'DETTE';

const TX_TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
  { id: 'ACHAT', label: 'Achats', icon: ShoppingCart },
  { id: 'VENTE', label: 'Ventes', icon: TrendingUp },
  { id: 'DEPENSE', label: 'Dépenses', icon: Receipt },
  { id: 'DETTE', label: 'Dettes', icon: CreditCard },
  { id: 'DEPOT', label: 'Dépôts / Retraits', icon: ArrowDownCircle },
  { id: 'COMPTES', label: 'Gestion de Comptes', icon: Landmark },
];

const TYPE_CONFIG = {
  ACHAT: { label: 'Achat', color: 'bg-blue-50 text-blue-700 border-blue-200', tiersLabel: 'Fournisseur' },
  VENTE: { label: 'Vente', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', tiersLabel: 'Client' },
  DEPENSE: { label: 'Dépense', color: 'bg-red-50 text-red-700 border-red-200', tiersLabel: 'Bénéficiaire' },
  DETTE: { label: 'Dette', color: 'bg-amber-50 text-amber-700 border-amber-200', tiersLabel: 'Créancier' },
};

const EMPTY_TX = { type: 'ACHAT' as TxType, date: new Date().toISOString().split('T')[0], description: '', quantite: '', prixUnitaire: '', montant: '', compte: '', tiers: '', notes: '' };
const EMPTY_DEPOT = { type: 'DEPOT' as 'DEPOT'|'RETRAIT', date: new Date().toISOString().split('T')[0], montant: '', operateur: 'Flooz', description: '', notes: '' };
const EMPTY_COMPTE = { nom: '', type: 'Espèces' as string, solde: '', description: '' };

function fmt(n: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XAF', maximumFractionDigits: 0 }).format(n);
}

const OPERATEURS = ['Flooz', 'T-Money', 'Mobile Money', 'Virement bancaire', 'Espèces', 'Chèque', 'Autre'];
const COMPTE_TYPES = ['Espèces', 'Banque', 'Mobile Money', 'Chèque', 'Autre'];

export default function ComptabilitePage() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [transactions, setTransactions] = useState<any[]>([]);
  const [depots, setDepots] = useState<any[]>([]);
  const [comptes, setComptes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modals
  const [showTxModal, setShowTxModal] = useState(false);
  const [showDepotModal, setShowDepotModal] = useState(false);
  const [showCompteModal, setShowCompteModal] = useState(false);
  
  // Forms
  const [txForm, setTxForm] = useState({ ...EMPTY_TX });
  const [depotForm, setDepotForm] = useState({ ...EMPTY_DEPOT });
  const [compteForm, setCompteForm] = useState({ ...EMPTY_COMPTE, editId: '' });
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [r1, r2, r3] = await Promise.all([
        fetch('/api/comptabilite/transactions').then(r => r.json()),
        fetch('/api/comptabilite/depots').then(r => r.json()),
        fetch('/api/comptabilite/comptes').then(r => r.json()),
      ]);
      if (r1.success) setTransactions(r1.data);
      if (r2.success) setDepots(r2.data);
      if (r3.success) setComptes(r3.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const filtered = transactions.filter(t => {
    if (!['dashboard', 'DEPOT', 'COMPTES'].includes(activeTab) && t.type !== activeTab) return false;
    if (!search || ['dashboard', 'DEPOT', 'COMPTES'].includes(activeTab)) return true;
    const s = search.toLowerCase();
    return t.description?.toLowerCase().includes(s) || t.tiers?.toLowerCase().includes(s);
  });

  const filteredDepots = depots.filter(d => {
    if (!search) return true;
    const s = search.toLowerCase();
    return d.operateur?.toLowerCase().includes(s) || d.description?.toLowerCase().includes(s);
  });

  // KPIs
  const totalByType = (type: TxType) => transactions.filter(t => t.type === type).reduce((a, t) => a + t.montant, 0);
  const ca = totalByType('VENTE');
  const achats = totalByType('ACHAT');
  const depenses = totalByType('DEPENSE');
  const dettes = totalByType('DETTE');
  const benefice = ca - achats - depenses;
  const totalDepots = depots.filter(d => d.type === 'DEPOT').reduce((a, d) => a + d.montant, 0);
  const totalRetraits = depots.filter(d => d.type === 'RETRAIT').reduce((a, d) => a + d.montant, 0);

  // Monthly bar chart
  const getMonthlyData = () => {
    const months: Record<string, Record<string, number>> = {};
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      months[key] = { ACHAT: 0, VENTE: 0, DEPENSE: 0 };
    }
    transactions.forEach(t => {
      const d = new Date(t.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (months[key]) months[key][t.type] = (months[key][t.type] || 0) + t.montant;
    });
    return Object.entries(months).map(([k, v]) => ({ month: k.slice(5), ...v }));
  };
  const monthlyData = getMonthlyData();
  const maxVal = Math.max(...monthlyData.flatMap(m => [m.ACHAT, m.VENTE, m.DEPENSE]), 1);

  // --- Save Transaction ---
  const saveTx = async () => {
    setSaving(true);
    try {
      const payload: any = { ...txForm };
      if (payload.quantite && payload.prixUnitaire) {
        payload.quantite = parseFloat(payload.quantite);
        payload.prixUnitaire = parseFloat(payload.prixUnitaire);
        payload.montant = payload.quantite * payload.prixUnitaire;
      } else {
        payload.montant = parseFloat(payload.montant) || 0;
      }
      const res = await fetch('/api/comptabilite/transactions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (data.success) { setShowTxModal(false); setTxForm({ ...EMPTY_TX }); fetchAll(); }
    } finally { setSaving(false); }
  };

  // --- Save Dépôt/Retrait ---
  const saveDepot = async () => {
    setSaving(true);
    try {
      const payload = { ...depotForm, montant: parseFloat(depotForm.montant) || 0 };
      const res = await fetch('/api/comptabilite/depots', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (data.success) { setShowDepotModal(false); setDepotForm({ ...EMPTY_DEPOT }); fetchAll(); }
    } finally { setSaving(false); }
  };

  // --- Save/Edit Compte ---
  const saveCompte = async () => {
    setSaving(true);
    try {
      const { editId, ...payload } = compteForm;
      const url = editId ? `/api/comptabilite/comptes/${editId}` : '/api/comptabilite/comptes';
      const method = editId ? 'PUT' : 'POST';
      const body = { ...payload, solde: parseFloat((payload.solde as any) || '0') };
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json();
      if (data.success) { setShowCompteModal(false); setCompteForm({ ...EMPTY_COMPTE, editId: '' }); fetchAll(); }
    } finally { setSaving(false); }
  };

  const deleteTx = async (id: string) => { if (!confirm('Supprimer ?')) return; await fetch(`/api/comptabilite/transactions/${id}`, { method: 'DELETE' }); fetchAll(); };
  const deleteDepot = async (id: string) => { if (!confirm('Supprimer ?')) return; await fetch(`/api/comptabilite/depots/${id}`, { method: 'DELETE' }); fetchAll(); };
  const deleteCompte = async (id: string) => { if (!confirm('Désactiver ce compte ?')) return; await fetch(`/api/comptabilite/comptes/${id}`, { method: 'DELETE' }); fetchAll(); };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      
      <header className="flex justify-between items-start">
        <div className="flex items-center gap-4">
          <img src="/nbbcl.png" alt="NBBC" className="h-10 object-contain" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          <div>
            <h1 className="text-3xl font-black text-slate-800">Comptabilité</h1>
            <p className="text-slate-500 mt-1">Gestion des transactions & suivi financier</p>
          </div>
        </div>
        <div className="flex gap-2">
          {activeTab === 'DEPOT' && (
            <button onClick={() => { setDepotForm({ ...EMPTY_DEPOT }); setShowDepotModal(true); }} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-md shadow-indigo-200 text-sm"><Plus size={16}/> Dépôt/Retrait</button>
          )}
          {activeTab === 'COMPTES' && (
            <button onClick={() => { setCompteForm({ ...EMPTY_COMPTE, editId: '' }); setShowCompteModal(true); }} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-md shadow-indigo-200 text-sm"><Plus size={16}/> Nouveau Compte</button>
          )}
          {!['DEPOT', 'COMPTES'].includes(activeTab) && (
            <button onClick={() => { setTxForm({ ...EMPTY_TX, type: (activeTab !== 'dashboard' ? activeTab : 'ACHAT') as TxType }); setShowTxModal(true); }} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-md shadow-indigo-200 text-sm"><Plus size={16}/> Nouvelle Transaction</button>
          )}
        </div>
      </header>

      {/* TABS */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-2xl overflow-x-auto">
        {TX_TABS.map(tab => {
          const Icon = tab.icon;
          return (
            <button key={tab.id} onClick={() => { setActiveTab(tab.id); setSearch(''); }} className={`flex-1 min-w-max flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl font-bold text-xs transition-all ${activeTab === tab.id ? 'bg-white shadow-md text-indigo-700' : 'text-slate-500 hover:text-slate-700'}`}>
              <Icon size={14} /> {tab.label}
            </button>
          );
        })}
      </div>

      {/* ============= DASHBOARD ============= */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Chiffre d'affaires", val: ca, icon: TrendingUp, color: 'bg-emerald-500', sub: 'Total ventes' },
              { label: 'Total Achats', val: achats, icon: ShoppingCart, color: 'bg-blue-500', sub: 'Coûts cumulés' },
              { label: 'Total Dépenses', val: depenses, icon: Receipt, color: 'bg-red-500', sub: 'Dépenses cumulées' },
              { label: 'Bénéfice estimé', val: benefice, icon: Wallet, color: benefice >= 0 ? 'bg-indigo-500' : 'bg-rose-500', sub: 'CA - Achats - Dépenses' },
            ].map(kpi => { const Icon = kpi.icon; return (
              <div key={kpi.label} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
                <div className="flex justify-between items-start mb-4">
                  <p className="text-sm text-slate-500 font-medium">{kpi.label}</p>
                  <div className={`w-9 h-9 ${kpi.color} rounded-xl flex items-center justify-center text-white shrink-0`}><Icon size={18} /></div>
                </div>
                <p className={`text-xl font-black ${kpi.val < 0 ? 'text-red-600' : 'text-slate-800'}`}>{fmt(kpi.val)}</p>
                <p className="text-xs text-slate-400 mt-1">{kpi.sub}</p>
              </div>
            );})}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {dettes > 0 && <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3"><CreditCard size={20} className="text-amber-600 shrink-0"/><div><p className="text-xs font-bold text-amber-700">Dettes en cours</p><p className="text-lg font-black text-amber-900">{fmt(dettes)}</p></div></div>}
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center gap-3"><ArrowDownCircle size={20} className="text-emerald-600 shrink-0"/><div><p className="text-xs font-bold text-emerald-700">Total Dépôts</p><p className="text-lg font-black text-emerald-900">{fmt(totalDepots)}</p></div></div>
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-center gap-3"><ArrowUpCircle size={20} className="text-rose-600 shrink-0"/><div><p className="text-xs font-bold text-rose-700">Total Retraits</p><p className="text-lg font-black text-rose-900">{fmt(totalRetraits)}</p></div></div>
          </div>

          {/* Soldes des comptes */}
          {comptes.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {comptes.map(c => (
                <div key={c._id} className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white" style={{ backgroundColor: c.couleur || '#6366f1' }}><Landmark size={18}/></div>
                  <div><p className="text-xs text-slate-500 font-bold">{c.nom}</p><p className="font-black text-slate-800">{fmt(c.solde)}</p></div>
                </div>
              ))}
            </div>
          )}

          {/* Bar chart */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h2 className="font-bold text-slate-800 mb-6">Évolution mensuelle (6 mois)</h2>
            <div className="flex items-end gap-3 h-40">
              {monthlyData.map(m => (
                <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                  <div className="flex items-end gap-0.5 w-full h-32">
                    <div className="flex-1 bg-blue-200 rounded-t" style={{ height: `${(m.ACHAT / maxVal) * 100}%` }} />
                    <div className="flex-1 bg-emerald-300 rounded-t" style={{ height: `${(m.VENTE / maxVal) * 100}%` }} />
                    <div className="flex-1 bg-red-200 rounded-t" style={{ height: `${(m.DEPENSE / maxVal) * 100}%` }} />
                  </div>
                  <span className="text-xs text-slate-400 font-medium">{m.month}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-4 mt-4 text-xs font-semibold text-slate-500">
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-blue-200 rounded-sm block"/>Achats</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-emerald-300 rounded-sm block"/>Ventes</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-red-200 rounded-sm block"/>Dépenses</span>
            </div>
          </div>
        </div>
      )}

      {/* ============= TRANSACTIONS (Achats, Ventes, Dépenses, Dettes) ============= */}
      {['ACHAT','VENTE','DEPENSE','DETTE'].includes(activeTab) && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
            <div className="flex items-center gap-3">
              <h2 className="font-bold text-slate-800">{TYPE_CONFIG[activeTab as TxType].label}s</h2>
              <span className="text-xs text-slate-400 font-bold">{filtered.length} — {fmt(filtered.reduce((a, t) => a + t.montant, 0))}</span>
            </div>
            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2">
              <Search size={14} className="text-slate-400" />
              <input type="text" placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)} className="outline-none text-sm w-40" />
            </div>
          </div>
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wide border-b border-slate-100">
              <tr>
                <th className="px-5 py-3">Date</th>
                <th className="px-3 py-3">Description</th>
                <th className="px-3 py-3">{TYPE_CONFIG[activeTab as TxType].tiersLabel}</th>
                <th className="px-3 py-3">Compte</th>
                <th className="px-3 py-3 text-right">Montant</th>
                <th className="px-3 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? <tr><td colSpan={6} className="py-10 text-center text-slate-400">Chargement...</td></tr>
              : filtered.length === 0 ? <tr><td colSpan={6} className="py-10 text-center text-slate-400">Aucune entrée.</td></tr>
              : filtered.map(t => (
                <tr key={t._id} className="hover:bg-slate-50 group transition">
                  <td className="px-5 py-3 text-slate-500">{new Date(t.date).toLocaleDateString('fr-FR')}</td>
                  <td className="px-3 py-3 font-semibold text-slate-800">{t.description}</td>
                  <td className="px-3 py-3 text-slate-500">{t.tiers || '—'}</td>
                  <td className="px-3 py-3 text-slate-500">{t.compte || '—'}</td>
                  <td className="px-3 py-3 text-right font-bold text-slate-800">{fmt(t.montant)}</td>
                  <td className="px-3 py-3 text-right"><button onClick={() => deleteTx(t._id)} className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-red-500 rounded-lg transition"><Trash2 size={14}/></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ============= DÉPÔTS / RETRAITS ============= */}
      {activeTab === 'DEPOT' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 flex items-center gap-4"><ArrowDownCircle size={28} className="text-emerald-600"/><div><p className="text-sm text-emerald-700 font-bold">Total Dépôts</p><p className="text-2xl font-black text-emerald-900">{fmt(totalDepots)}</p></div></div>
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-5 flex items-center gap-4"><ArrowUpCircle size={28} className="text-rose-600"/><div><p className="text-sm text-rose-700 font-bold">Total Retraits</p><p className="text-2xl font-black text-rose-900">{fmt(totalRetraits)}</p></div></div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between bg-slate-50 items-center">
              <h2 className="font-bold text-slate-800">Opérations ({filteredDepots.length})</h2>
              <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2">
                <Search size={14} className="text-slate-400"/>
                <input type="text" placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)} className="outline-none text-sm w-36"/>
              </div>
            </div>
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wide border-b border-slate-100">
                <tr><th className="px-5 py-3">Date</th><th className="px-3 py-3">Type</th><th className="px-3 py-3">Opérateur</th><th className="px-3 py-3">Description</th><th className="px-3 py-3 text-right">Montant</th><th className="px-3 py-3"></th></tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredDepots.length === 0 ? <tr><td colSpan={6} className="py-10 text-center text-slate-400">Aucune opération enregistrée.</td></tr>
                : filteredDepots.map(d => (
                  <tr key={d._id} className="hover:bg-slate-50 group transition">
                    <td className="px-5 py-3 text-slate-500">{new Date(d.date).toLocaleDateString('fr-FR')}</td>
                    <td className="px-3 py-3">
                      <span className={`inline-flex items-center gap-1 text-xs font-black uppercase px-2 py-0.5 rounded border ${d.type === 'DEPOT' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
                        {d.type === 'DEPOT' ? <ArrowDownCircle size={12}/> : <ArrowUpCircle size={12}/>}
                        {d.type}
                      </span>
                    </td>
                    <td className="px-3 py-3 font-medium text-slate-700">{d.operateur}</td>
                    <td className="px-3 py-3 text-slate-500">{d.description || '—'}</td>
                    <td className="px-3 py-3 text-right font-bold text-slate-800">{fmt(d.montant)}</td>
                    <td className="px-3 py-3 text-right"><button onClick={() => deleteDepot(d._id)} className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-red-500 rounded-lg transition"><Trash2 size={14}/></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============= GESTION DE COMPTES ============= */}
      {activeTab === 'COMPTES' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {comptes.map(c => (
              <div key={c._id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 group relative">
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white shrink-0" style={{ background: c.couleur || '#6366f1' }}><Landmark size={22}/></div>
                  <div className="flex-1">
                    <h3 className="font-bold text-slate-800">{c.nom}</h3>
                    <p className="text-xs text-slate-500">{c.type}</p>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                    <button onClick={() => { setCompteForm({ nom: c.nom, type: c.type, solde: c.solde, description: c.description || '', editId: c._id }); setShowCompteModal(true); }} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"><Edit3 size={14}/></button>
                    <button onClick={() => deleteCompte(c._id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={14}/></button>
                  </div>
                </div>
                {c.description && <p className="text-xs text-slate-400 mb-3">{c.description}</p>}
                <div className="border-t border-slate-100 pt-3">
                  <p className="text-xs text-slate-500 mb-0.5">Solde actuel</p>
                  <p className={`text-2xl font-black ${c.solde < 0 ? 'text-red-600' : 'text-slate-800'}`}>{fmt(c.solde)}</p>
                </div>
              </div>
            ))}

            <button onClick={() => { setCompteForm({ ...EMPTY_COMPTE, editId: '' }); setShowCompteModal(true); }} className="bg-white rounded-2xl border-2 border-dashed border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/30 transition flex flex-col items-center justify-center min-h-[160px] text-slate-400 hover:text-indigo-600">
              <Plus size={28} className="mb-2"/><span className="font-bold text-sm">Ajouter un compte</span>
            </button>
          </div>
        </div>
      )}

      {/* ============= MODAL TRANSACTION ============= */}
      {showTxModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b flex justify-between items-center bg-slate-50 shrink-0">
              <h2 className="font-bold text-slate-800">Nouvelle Transaction</h2>
              <button onClick={() => setShowTxModal(false)}><X size={20} className="text-slate-400"/></button>
            </div>
            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-2">Type *</label>
                <div className="grid grid-cols-4 gap-2">
                  {(['ACHAT','VENTE','DEPENSE','DETTE'] as TxType[]).map(t => (
                    <button key={t} onClick={() => setTxForm(f => ({ ...f, type: t }))} className={`py-2 rounded-xl text-xs font-bold border transition ${txForm.type === t ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}>{TYPE_CONFIG[t].label}</button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1.5">Date *</label><input type="date" value={txForm.date} onChange={e => setTxForm(f => ({ ...f, date: e.target.value }))} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm"/></div>
                <div><label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1.5">Compte</label>
                  <select value={txForm.compte} onChange={e => setTxForm(f => ({ ...f, compte: e.target.value }))} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm">
                    <option value="">—</option>
                    {comptes.map(c => <option key={c._id} value={c.nom}>{c.nom}</option>)}
                    <option>Caisse</option><option>Banque</option><option>Mobile Money</option>
                  </select>
                </div>
              </div>
              <div><label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1.5">Description *</label><input type="text" value={txForm.description} onChange={e => setTxForm(f => ({ ...f, description: e.target.value }))} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm" placeholder="Ex: Achat fournitures..."/></div>
              <div><label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1.5">{TYPE_CONFIG[txForm.type].tiersLabel}</label><input type="text" value={txForm.tiers} onChange={e => setTxForm(f => ({ ...f, tiers: e.target.value }))} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm"/></div>
              <div className="grid grid-cols-3 gap-3">
                <div><label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1.5">Qté</label><input type="number" value={txForm.quantite} onChange={e => setTxForm(f => ({ ...f, quantite: e.target.value }))} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm"/></div>
                <div><label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1.5">P.U.</label><input type="number" value={txForm.prixUnitaire} onChange={e => setTxForm(f => ({ ...f, prixUnitaire: e.target.value }))} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm"/></div>
                <div><label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1.5">Montant *</label><input type="number" value={txForm.montant} onChange={e => setTxForm(f => ({ ...f, montant: e.target.value }))} placeholder={txForm.quantite && txForm.prixUnitaire ? String(parseFloat(txForm.quantite||'0') * parseFloat(txForm.prixUnitaire||'0')) : ''} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm"/></div>
              </div>
            </div>
            <div className="p-5 border-t flex gap-3 bg-slate-50 shrink-0">
              <button onClick={() => setShowTxModal(false)} className="flex-1 py-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-600">Annuler</button>
              <button onClick={saveTx} disabled={!txForm.description || saving} className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl disabled:opacity-50">{saving ? 'Enregistrement...' : 'Enregistrer'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ============= MODAL DÉPÔT/RETRAIT ============= */}
      {showDepotModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b flex justify-between items-center bg-slate-50 shrink-0">
              <h2 className="font-bold text-slate-800">Nouveau Dépôt / Retrait</h2>
              <button onClick={() => setShowDepotModal(false)}><X size={20} className="text-slate-400"/></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-2">Opération *</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['DEPOT','RETRAIT'] as const).map(t => (
                    <button key={t} onClick={() => setDepotForm(f => ({ ...f, type: t }))} className={`py-2.5 rounded-xl text-sm font-bold border transition ${depotForm.type === t ? (t === 'DEPOT' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-rose-500 bg-rose-50 text-rose-700') : 'border-slate-200 text-slate-500'}`}>
                      {t === 'DEPOT' ? '⬇ Dépôt' : '⬆ Retrait'}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1.5">Date *</label><input type="date" value={depotForm.date} onChange={e => setDepotForm(f => ({ ...f, date: e.target.value }))} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm"/></div>
                <div><label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1.5">Montant (FCFA) *</label><input type="number" value={depotForm.montant} onChange={e => setDepotForm(f => ({ ...f, montant: e.target.value }))} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm"/></div>
              </div>
              <div><label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1.5">Opérateur *</label>
                <select value={depotForm.operateur} onChange={e => setDepotForm(f => ({ ...f, operateur: e.target.value }))} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm">
                  {OPERATEURS.map(op => <option key={op}>{op}</option>)}
                </select>
              </div>
              <div><label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1.5">Description</label><input type="text" value={depotForm.description} onChange={e => setDepotForm(f => ({ ...f, description: e.target.value }))} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm" placeholder="Ex: Virement client Dupont..."/></div>
            </div>
            <div className="p-5 border-t flex gap-3 bg-slate-50 shrink-0">
              <button onClick={() => setShowDepotModal(false)} className="flex-1 py-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-600">Annuler</button>
              <button onClick={saveDepot} disabled={!depotForm.montant || saving} className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl disabled:opacity-50">{saving ? 'Enregistrement...' : 'Enregistrer'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ============= MODAL COMPTE ============= */}
      {showCompteModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b flex justify-between items-center bg-slate-50">
              <h2 className="font-bold text-slate-800">{compteForm.editId ? 'Modifier le compte' : 'Nouveau Compte'}</h2>
              <button onClick={() => setShowCompteModal(false)}><X size={20} className="text-slate-400"/></button>
            </div>
            <div className="p-6 space-y-4">
              <div><label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1.5">Nom du compte *</label><input type="text" value={compteForm.nom} onChange={e => setCompteForm(f => ({ ...f, nom: e.target.value }))} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm" placeholder="Ex: Caisse principale, Compte BNI..."/></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1.5">Type</label>
                  <select value={compteForm.type} onChange={e => setCompteForm(f => ({ ...f, type: e.target.value }))} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm">
                    {COMPTE_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div><label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1.5">Solde initial (FCFA)</label><input type="number" value={compteForm.solde} onChange={e => setCompteForm(f => ({ ...f, solde: e.target.value }))} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm"/></div>
              </div>
              <div><label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1.5">Description</label><input type="text" value={compteForm.description} onChange={e => setCompteForm(f => ({ ...f, description: e.target.value }))} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm"/></div>
            </div>
            <div className="p-5 border-t flex gap-3 bg-slate-50">
              <button onClick={() => setShowCompteModal(false)} className="flex-1 py-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-600">Annuler</button>
              <button onClick={saveCompte} disabled={!compteForm.nom || saving} className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl disabled:opacity-50">{saving ? 'Enregistrement...' : compteForm.editId ? 'Mettre à jour' : 'Créer'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
