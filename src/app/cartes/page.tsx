"use client";

import { useState, useEffect, useCallback } from 'react';
import { Plus, Search, CreditCard, Wallet, X, Trash2, ChevronDown, CheckCircle, PauseCircle } from 'lucide-react';
import LoadingSpinner from '@/components/LoadingSpinner';

const TYPE_CONFIG: Record<string, { color: string; bg: string; label: string; icon: string }> = {
  ZELLE:    { color: 'text-purple-700', bg: 'bg-purple-100', label: 'Zelle',    icon: 'Z' },
  CASH_APP: { color: 'text-emerald-700', bg: 'bg-emerald-100', label: 'Cash App', icon: '$' },
  WIRE:     { color: 'text-blue-700',   bg: 'bg-blue-100',   label: 'Wire',    icon: 'W' },
  PAYPAL:   { color: 'text-indigo-700', bg: 'bg-indigo-100', label: 'PayPal',  icon: 'P' },
  CRYPTO:   { color: 'text-amber-700',  bg: 'bg-amber-100',  label: 'Crypto',  icon: '₿' },
  EURO:     { color: 'text-sky-700',    bg: 'bg-sky-100',    label: 'Euro',    icon: '€' },
  WISE:     { color: 'text-teal-700',   bg: 'bg-teal-100',   label: 'Wise',    icon: 'W' },
  AUTRE:    { color: 'text-slate-700',  bg: 'bg-slate-100',  label: 'Autre',   icon: '?' },
};

const TYPES = Object.keys(TYPE_CONFIG);
const DEVISES = ['USD', 'EUR', 'GBP', 'CAD', 'BTC', 'ETH', 'USDT', 'XOF', 'Autre'];

type ModalMode = 'add' | 'edit' | null;

export default function CartesPage() {
  const [cartes, setCartes] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [editTarget, setEditTarget] = useState<any>(null);
  const [formData, setFormData] = useState({
    clientId: '', type: 'ZELLE', identifiant: '', titulaire: '',
    banque: '', devise: 'USD', notes: '', statut: 'ACTIF'
  });
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const fetchCartes = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/cartes');
    const data = await res.json();
    if (data.success) setCartes(data.data);
    setLoading(false);
  }, []);

  const fetchClients = useCallback(async () => {
    const res = await fetch('/api/clients');
    const data = await res.json();
    if (data.success) setClients(data.data);
  }, []);

  useEffect(() => { fetchCartes(); fetchClients(); }, [fetchCartes, fetchClients]);

  const openAddModal = () => {
    setFormData({ clientId: '', type: 'ZELLE', identifiant: '', titulaire: '', banque: '', devise: 'USD', notes: '', statut: 'ACTIF' });
    setEditTarget(null);
    setModalMode('add');
  };

  const openEditModal = (carte: any) => {
    setFormData({
      clientId: carte.clientId?._id || '',
      type: carte.type,
      identifiant: carte.identifiant,
      titulaire: carte.titulaire || '',
      banque: carte.banque || '',
      devise: carte.devise || 'USD',
      notes: carte.notes || '',
      statut: carte.statut,
    });
    setEditTarget(carte);
    setModalMode('edit');
  };

  const handleSave = async () => {
    if (!formData.clientId || !formData.identifiant) return;
    setSaving(true);
    try {
      const url = modalMode === 'edit' ? `/api/cartes/${editTarget._id}` : '/api/cartes';
      const method = modalMode === 'edit' ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData) });
      const data = await res.json();
      if (data.success) { setModalMode(null); fetchCartes(); }
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/cartes/${id}`, { method: 'DELETE' });
    setConfirmDelete(null);
    fetchCartes();
  };

  const filtered = cartes.filter(c => {
    const matchType = filterType === 'ALL' || c.type === filterType;
    const q = searchQuery.toLowerCase();
    const matchSearch = !q || c.identifiant?.toLowerCase().includes(q) ||
      c.clientId?.nom?.toLowerCase().includes(q) || c.clientId?.prenom?.toLowerCase().includes(q) ||
      c.banque?.toLowerCase().includes(q);
    return matchType && matchSearch;
  });

  const stats = TYPES.reduce((acc, t) => { acc[t] = cartes.filter(c => c.type === t).length; return acc; }, {} as Record<string, number>);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* MODALE AJOUT/ÉDITION */}
      {modalMode && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[92vh] flex flex-col">
            <div className="bg-gradient-to-r from-slate-800 to-slate-900 px-8 py-6 flex justify-between items-center">
              <h2 className="text-white font-bold text-xl">{modalMode === 'add' ? 'Nouveau Compte' : 'Modifier le Compte'}</h2>
              <button onClick={() => setModalMode(null)} className="text-slate-400 hover:text-white transition-colors"><X size={24} /></button>
            </div>
            <div className="p-4 sm:p-6 lg:p-8 space-y-5 overflow-y-auto">
              {/* Client */}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Client *</label>
                <select value={formData.clientId} onChange={e => setFormData({...formData, clientId: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-500 text-sm">
                  <option value="">— Sélectionner un client —</option>
                  {clients.map(c => <option key={c._id} value={c._id}>{c.prenom} {c.nom} ({c.email})</option>)}
                </select>
              </div>
              {/* Type + Devise */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Type *</label>
                  <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-500 text-sm">
                    {TYPES.map(t => <option key={t} value={t}>{TYPE_CONFIG[t].label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Devise</label>
                  <select value={formData.devise} onChange={e => setFormData({...formData, devise: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-500 text-sm">
                    {DEVISES.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              </div>
              {/* Identifiant */}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">
                  Identifiant / Numéro *
                  <span className="ml-2 text-slate-400 font-normal normal-case">
                    {formData.type === 'ZELLE' ? 'Email ou téléphone' : formData.type === 'CASH_APP' ? '$Cashtag' : formData.type === 'CRYPTO' ? 'Adresse wallet' : formData.type === 'WIRE' ? 'N° de compte' : 'Identifiant du compte'}
                  </span>
                </label>
                <input type="text" value={formData.identifiant} onChange={e => setFormData({...formData, identifiant: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-500 text-sm font-mono" placeholder={formData.type === 'CASH_APP' ? '$exemple' : formData.type === 'ZELLE' ? 'jean@email.com' : '...'} />
              </div>
              {/* Titulaire + Banque */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Titulaire</label>
                  <input type="text" value={formData.titulaire} onChange={e => setFormData({...formData, titulaire: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-500 text-sm" placeholder="Nom du titulaire" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Banque / Plateforme</label>
                  <input type="text" value={formData.banque} onChange={e => setFormData({...formData, banque: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-500 text-sm" placeholder="Bank of America, Coinbase..." />
                </div>
              </div>
              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Notes</label>
                <textarea value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} rows={2} className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-500 text-sm resize-none" placeholder="Informations supplémentaires..." />
              </div>
              {/* Boutons */}
              <div className="flex gap-3 pt-2">
                <button onClick={() => setModalMode(null)} className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-colors">Annuler</button>
                <button onClick={handleSave} disabled={saving || !formData.clientId || !formData.identifiant} className="flex-1 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold shadow-lg shadow-blue-500/30 disabled:opacity-50 transition-all inline-flex items-center justify-center gap-2">
                  {saving ? <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Enregistrement...</> : modalMode === 'add' ? 'Créer le compte' : 'Sauvegarder'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODALE SUPPRESSION */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 sm:p-8 max-w-sm w-[calc(100vw-2rem)] sm:w-full text-center shadow-2xl">
            <div className="w-16 h-16 bg-rose-100 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 size={28} />
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-2">Supprimer ce compte ?</h3>
            <p className="text-slate-500 text-sm mb-6">Cette action est irréversible.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50">Annuler</button>
              <button onClick={() => handleDelete(confirmDelete)} className="flex-1 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold">Supprimer</button>
            </div>
          </div>
        </div>
      )}

      {/* HEADER */}
      <header className="flex flex-col gap-4 md:flex-row md:justify-between md:items-center mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">Cartes & Comptes</h1>
          <p className="text-slate-500 mt-1 text-sm sm:text-base">Gérez les comptes Zelle, CashApp, Wire, Crypto et autres moyens de paiement.</p>
        </div>
        <button onClick={openAddModal} className="w-full md:w-auto justify-center bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-5 py-2.5 rounded-xl font-medium shadow-md shadow-blue-500/30 flex items-center gap-2 transition-all hover:scale-105">
          <Plus size={20} /> Nouveau Compte
        </button>
      </header>

      {/* STATS PAR TYPE */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        {TYPES.filter(t => stats[t] > 0 || t === 'ZELLE' || t === 'CASH_APP' || t === 'CRYPTO' || t === 'WIRE').slice(0, 4).map(type => {
          const cfg = TYPE_CONFIG[type];
          return (
            <div key={type} className={`p-5 rounded-2xl border border-slate-100 bg-white shadow-sm flex items-center gap-4 cursor-pointer transition-all hover:scale-105 ${filterType === type ? 'ring-2 ring-blue-500' : ''}`} onClick={() => setFilterType(filterType === type ? 'ALL' : type)}>
              <div className={`w-12 h-12 rounded-xl ${cfg.bg} ${cfg.color} flex items-center justify-center text-xl font-black`}>{cfg.icon}</div>
              <div>
                <div className="font-bold text-2xl text-slate-800">{stats[type] || 0}</div>
                <div className="text-slate-500 text-sm font-medium">{cfg.label}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* BARRE DE RECHERCHE + FILTRE */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 flex-wrap gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input type="text" placeholder="Rechercher un client, compte..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white" />
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setFilterType('ALL')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${filterType === 'ALL' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>Tous ({cartes.length})</button>
            {TYPES.filter(t => stats[t] > 0).map(t => {
              const cfg = TYPE_CONFIG[t];
              return (
                <button key={t} onClick={() => setFilterType(filterType === t ? 'ALL' : t)} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${filterType === t ? `${cfg.bg} ${cfg.color}` : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                  {cfg.label} ({stats[t]})
                </button>
              );
            })}
          </div>
        </div>

        {/* TABLE */}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs border-b border-slate-200">
                <th className="px-6 py-4 font-semibold uppercase tracking-wider">Client</th>
                <th className="px-6 py-4 font-semibold uppercase tracking-wider">Type</th>
                <th className="px-6 py-4 font-semibold uppercase tracking-wider">Identifiant / Compte</th>
                <th className="px-6 py-4 font-semibold uppercase tracking-wider">Banque / Plateforme</th>
                <th className="px-6 py-4 font-semibold uppercase tracking-wider">Devise</th>
                <th className="px-6 py-4 font-semibold uppercase tracking-wider">Statut</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                  <LoadingSpinner label="Chargement..." size="sm" />
                </td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-16 text-center">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Wallet size={28} className="text-slate-400" />
                  </div>
                  <h3 className="font-bold text-slate-700">Aucun compte trouvé</h3>
                  <p className="text-slate-400 text-sm mt-1">{cartes.length === 0 ? 'Cliquez sur "Nouveau Compte" pour commencer.' : 'Aucun résultat pour cette recherche.'}</p>
                </td></tr>
              ) : filtered.map(carte => {
                const cfg = TYPE_CONFIG[carte.type] || TYPE_CONFIG.AUTRE;
                return (
                  <tr key={carte._id} className="border-b border-slate-100 hover:bg-slate-50/80 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-black border border-indigo-200">
                          {carte.clientId?.prenom?.[0]}{carte.clientId?.nom?.[0]}
                        </div>
                        <div>
                          <div className="font-bold text-slate-800 text-sm">{carte.clientId?.prenom} {carte.clientId?.nom}</div>
                          <div className="text-xs text-slate-400">{carte.clientId?.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${cfg.bg} ${cfg.color}`}>
                        <span className="font-black">{cfg.icon}</span> {cfg.label}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-mono text-sm text-slate-700 bg-slate-100 px-3 py-1 rounded-lg">{carte.identifiant}</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">{carte.banque || '—'}</td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded">{carte.devise}</span>
                    </td>
                    <td className="px-6 py-4">
                      {carte.statut === 'ACTIF'
                        ? <span className="flex items-center gap-1 text-emerald-700 text-xs font-bold"><CheckCircle size={14}/> Actif</span>
                        : <span className="flex items-center gap-1 text-amber-700 text-xs font-bold"><PauseCircle size={14}/> {carte.statut}</span>
                      }
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex gap-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openEditModal(carte)} className="p-2 bg-slate-100 hover:bg-blue-100 hover:text-blue-600 text-slate-500 rounded-lg transition-colors text-xs font-bold">Modifier</button>
                        <button onClick={() => setConfirmDelete(carte._id)} className="p-2 bg-slate-100 hover:bg-rose-100 hover:text-rose-600 text-slate-500 rounded-lg transition-colors"><Trash2 size={14}/></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
