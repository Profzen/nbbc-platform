"use client";

import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Edit3, X, Monitor, Smartphone, Cable, Battery, Cpu, HelpCircle, CheckCircle, AlertTriangle, Package } from 'lucide-react';

type Categorie = 'TELEPHONE' | 'CHARGEUR' | 'CABLE' | 'PC' | 'UC' | 'AUTRE';
type Etat = 'FONCTIONNEL' | 'DYSFONCTIONNEL';

interface Materiel {
  _id: string;
  categorie: Categorie;
  categorieAutre?: string;
  nombre: number;
  couleur?: string;
  description?: string;
  etat: Etat;
  createdAt: string;
}

const CATEGORIES: { value: Categorie; label: string; icon: React.ElementType }[] = [
  { value: 'TELEPHONE', label: 'Téléphone', icon: Smartphone },
  { value: 'CHARGEUR', label: 'Chargeur', icon: Battery },
  { value: 'CABLE', label: 'Câble', icon: Cable },
  { value: 'PC', label: 'PC', icon: Monitor },
  { value: 'UC', label: 'UC', icon: Cpu },
  { value: 'AUTRE', label: 'Autre', icon: HelpCircle },
];

const CATEGORY_COLORS: Record<Categorie, string> = {
  TELEPHONE: 'from-blue-500 to-indigo-600',
  CHARGEUR: 'from-amber-500 to-orange-600',
  CABLE: 'from-emerald-500 to-teal-600',
  PC: 'from-violet-500 to-purple-600',
  UC: 'from-rose-500 to-pink-600',
  AUTRE: 'from-slate-500 to-slate-700',
};

function getCatLabel(m: Materiel) {
  return m.categorie === 'AUTRE' ? m.categorieAutre || 'Autre' : CATEGORIES.find(c => c.value === m.categorie)?.label || m.categorie;
}
function getCatIcon(cat: Categorie) {
  return CATEGORIES.find(c => c.value === cat)?.icon || Package;
}

export default function MaterielPage() {
  const [materiels, setMateriels] = useState<Materiel[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<Materiel | null>(null);
  const [filterCat, setFilterCat] = useState<Categorie | 'ALL'>('ALL');
  const [filterEtat, setFilterEtat] = useState<Etat | 'ALL'>('ALL');

  const [form, setForm] = useState({
    categorie: 'TELEPHONE' as Categorie,
    categorieAutre: '',
    nombre: '1',
    couleur: '',
    description: '',
    etat: 'FONCTIONNEL' as Etat,
  });
  const [savingMat, setSavingMat] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const fetchMateriels = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/materiels');
    const data = await res.json();
    if (data.success) setMateriels(data.data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchMateriels(); }, [fetchMateriels]);

  const openNew = () => {
    setForm({ categorie: 'TELEPHONE', categorieAutre: '', nombre: '1', couleur: '', description: '', etat: 'FONCTIONNEL' });
    setEditItem(null);
    setShowModal(true);
  };

  const openEdit = (m: Materiel) => {
    setForm({
      categorie: m.categorie,
      categorieAutre: m.categorieAutre || '',
      nombre: String(m.nombre),
      couleur: m.couleur || '',
      description: m.description || '',
      etat: m.etat,
    });
    setEditItem(m);
    setShowModal(true);
  };

  const save = async () => {
    setSavingMat(true);
    try {
      const payload = { ...form, nombre: parseInt(form.nombre) || 1 };
      const url = editItem ? `/api/materiels/${editItem._id}` : '/api/materiels';
      const method = editItem ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (data.success) { setShowModal(false); fetchMateriels(); }
    } finally { setSavingMat(false); }
  };

  const remove = async (id: string) => {
    if (!confirm('Supprimer ce matériel ?')) return;
    setRemovingId(id);
    try {
      await fetch(`/api/materiels/${id}`, { method: 'DELETE' });
      fetchMateriels();
    } finally { setRemovingId(null); }
  };

  const toggleEtat = async (m: Materiel) => {
    setTogglingId(m._id);
    try {
      const newEtat: Etat = m.etat === 'FONCTIONNEL' ? 'DYSFONCTIONNEL' : 'FONCTIONNEL';
      await fetch(`/api/materiels/${m._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ etat: newEtat }),
      });
      fetchMateriels();
    } finally { setTogglingId(null); }
  };

  const filtered = materiels.filter(m => {
    if (filterCat !== 'ALL' && m.categorie !== filterCat) return false;
    if (filterEtat !== 'ALL' && m.etat !== filterEtat) return false;
    return true;
  });

  const stats = {
    total: materiels.reduce((s, m) => s + m.nombre, 0),
    fonctionnel: materiels.filter(m => m.etat === 'FONCTIONNEL').reduce((s, m) => s + m.nombre, 0),
    dysfonctionnel: materiels.filter(m => m.etat === 'DYSFONCTIONNEL').reduce((s, m) => s + m.nombre, 0),
    categories: new Set(materiels.map(m => m.categorie)).size,
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
            <div className="bg-gradient-to-r from-violet-600 to-purple-700 px-6 py-4 flex justify-between items-center shrink-0">
              <h2 className="text-white font-bold text-lg">{editItem ? 'Modifier le matériel' : 'Nouveau matériel'}</h2>
              <button onClick={() => setShowModal(false)} className="text-white/70 hover:text-white"><X size={22} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* Catégorie */}
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-slate-500">Catégorie *</label>
                <div className="grid grid-cols-3 gap-2">
                  {CATEGORIES.map(({ value, label, icon: Icon }) => (
                    <button key={value} type="button"
                      onClick={() => setForm(f => ({ ...f, categorie: value }))}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-sm font-bold transition-all ${form.categorie === value ? 'border-violet-500 bg-violet-50 text-violet-700' : 'border-slate-200 text-slate-500 hover:border-violet-200'}`}>
                      <Icon size={16} /> {label}
                    </button>
                  ))}
                </div>
              </div>

              {form.categorie === 'AUTRE' && (
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-slate-500">Préciser *</label>
                  <input type="text" value={form.categorieAutre} onChange={e => setForm(f => ({ ...f, categorieAutre: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:outline-none focus:border-violet-400" placeholder="Ex : Imprimante" />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-slate-500">Nombre *</label>
                  <input type="number" min="1" value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:outline-none focus:border-violet-400" />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-slate-500">Couleur</label>
                  <input type="text" value={form.couleur} onChange={e => setForm(f => ({ ...f, couleur: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:outline-none focus:border-violet-400" placeholder="Ex : Noir, Blanc..." />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-slate-500">Description</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm resize-none focus:outline-none focus:border-violet-400" placeholder="Petite description..." />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-slate-500">État initial</label>
                <div className="flex gap-3">
                  {([{ val: 'FONCTIONNEL', label: 'Fonctionnel', icon: CheckCircle, color: 'emerald' }, { val: 'DYSFONCTIONNEL', label: 'Dysfonctionnel', icon: AlertTriangle, color: 'rose' }] as const).map(({ val, label, icon: Icon, color }) => (
                    <button key={val} type="button" onClick={() => setForm(f => ({ ...f, etat: val }))}
                      className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 text-sm font-bold transition-all ${form.etat === val ? `border-${color}-500 bg-${color}-50 text-${color}-700` : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}>
                      <Icon size={16} /> {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="p-5 border-t border-slate-100 flex gap-3 shrink-0 bg-slate-50/50">
              <button onClick={() => setShowModal(false)} className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-100">Annuler</button>
              <button onClick={save} disabled={savingMat || !form.categorie || (form.categorie === 'AUTRE' && !form.categorieAutre.trim())}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-purple-700 text-white font-bold hover:from-violet-700 hover:to-purple-800 disabled:opacity-50 shadow-md inline-flex items-center justify-center gap-2">
                {savingMat ? <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Enregistrement...</> : editItem ? 'Enregistrer' : 'Ajouter'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-black text-slate-800">Matériel</h1>
          <p className="text-sm text-slate-500 mt-1">Inventaire du matériel de l&apos;entreprise</p>
        </div>
        <button onClick={openNew}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-purple-700 text-white font-bold text-sm shadow-md hover:from-violet-700 hover:to-purple-800 transition-all">
          <Plus size={17} /> Ajouter un matériel
        </button>
      </header>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total', value: stats.total, icon: Package, color: 'from-slate-500 to-slate-700' },
          { label: 'Fonctionnels', value: stats.fonctionnel, icon: CheckCircle, color: 'from-emerald-500 to-teal-600' },
          { label: 'Dysfonctionnels', value: stats.dysfonctionnel, icon: AlertTriangle, color: 'from-rose-500 to-red-600' },
          { label: 'Catégories', value: stats.categories, icon: Monitor, color: 'from-violet-500 to-purple-600' },
        ].map((kpi, i) => {
          const Icon = kpi.icon;
          return (
            <div key={i} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${kpi.color} text-white flex items-center justify-center shadow shrink-0`}>
                <Icon size={19} />
              </div>
              <div>
                <div className="text-xl font-black text-slate-800">{kpi.value}</div>
                <div className="text-xs text-slate-500 font-medium">{kpi.label}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap gap-2 mb-5">
        <select value={filterCat} onChange={e => setFilterCat(e.target.value as any)}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 focus:outline-none focus:border-violet-400">
          <option value="ALL">Toutes catégories</option>
          {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
        <select value={filterEtat} onChange={e => setFilterEtat(e.target.value as any)}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 focus:outline-none focus:border-violet-400">
          <option value="ALL">Tous états</option>
          <option value="FONCTIONNEL">Fonctionnel</option>
          <option value="DYSFONCTIONNEL">Dysfonctionnel</option>
        </select>
      </div>

      {/* Liste */}
      {loading ? (
        <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-200">
          <Package size={40} className="text-slate-200 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-700">Aucun matériel</h3>
          <p className="text-slate-400 text-sm mt-1 mb-5">Commencez par ajouter votre premier matériel.</p>
          <button onClick={openNew} className="bg-violet-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-violet-700 text-sm">
            Ajouter un matériel
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(m => {
            const Icon = getCatIcon(m.categorie);
            const isFonc = m.etat === 'FONCTIONNEL';
            return (
              <div key={m._id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 hover:shadow-md transition-all">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${CATEGORY_COLORS[m.categorie]} text-white flex items-center justify-center shadow-md shrink-0`}>
                      <Icon size={18} />
                    </div>
                    <div>
                      <div className="font-bold text-slate-800">{getCatLabel(m)}</div>
                      <div className="text-xs text-slate-400">x{m.nombre}{m.couleur ? ` · ${m.couleur}` : ''}</div>
                    </div>
                  </div>
                  <div className="flex gap-1 ml-2 shrink-0">
                    <button onClick={() => openEdit(m)} className="p-1.5 text-slate-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-colors"><Edit3 size={14} /></button>
                    <button onClick={() => remove(m._id)} disabled={removingId === m._id} className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors disabled:opacity-50">
                      {removingId === m._id ? <span className="w-3.5 h-3.5 border-2 border-rose-400 border-t-transparent rounded-full animate-spin inline-block" /> : <Trash2 size={14} />}
                    </button>
                  </div>
                </div>

                {m.description && <p className="text-xs text-slate-500 mb-3 line-clamp-2">{m.description}</p>}

                <div className="flex items-center justify-between">
                  <button onClick={() => toggleEtat(m)} disabled={togglingId === m._id}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer disabled:opacity-50 ${isFonc ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'bg-rose-50 text-rose-700 hover:bg-rose-100'}`}>
                    {togglingId === m._id ? <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" /> : isFonc ? <CheckCircle size={13} /> : <AlertTriangle size={13} />}
                    {isFonc ? 'Fonctionnel' : 'Dysfonctionnel'}
                  </button>
                  <span className="text-[10px] text-slate-400">{new Date(m.createdAt).toLocaleDateString('fr-FR')}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
