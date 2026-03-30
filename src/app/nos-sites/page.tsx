"use client";

import { FormEvent, useEffect, useState } from 'react';
import { Globe, Plus, Save, Trash2, ExternalLink, Shield } from 'lucide-react';
import LoadingSpinner from '@/components/LoadingSpinner';

type CompanySite = {
  _id: string;
  name: string;
  publicUrl?: string;
  adminUrl?: string;
};

export default function NosSitesPage() {
  const [sites, setSites] = useState<CompanySite[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const [newSite, setNewSite] = useState({
    name: '',
    publicUrl: '',
    adminUrl: '',
  });

  const fetchSites = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/company-sites', { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Impossible de charger les sites.');
      }
      setSites(json.data || []);
    } catch (e: any) {
      setError(e.message || 'Impossible de charger les sites.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSites();
  }, []);

  const updateDraft = (id: string, field: keyof Omit<CompanySite, '_id'>, value: string) => {
    setSites((prev) => prev.map((site) => (site._id === id ? { ...site, [field]: value } : site)));
  };

  const saveSite = async (site: CompanySite) => {
    setSavingId(site._id);
    setError('');
    setMessage('');
    try {
      const res = await fetch('/api/company-sites', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: site._id,
          name: site.name,
          publicUrl: site.publicUrl || '',
          adminUrl: site.adminUrl || '',
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Impossible de sauvegarder ce site.');
      }

      setSites((prev) => prev.map((item) => (item._id === json.data._id ? json.data : item)));
      setMessage('Site mis à jour avec succès.');
    } catch (e: any) {
      setError(e.message || 'Impossible de sauvegarder ce site.');
    } finally {
      setSavingId(null);
    }
  };

  const deleteSite = async (id: string) => {
    setDeletingId(id);
    setError('');
    setMessage('');
    try {
      const res = await fetch('/api/company-sites', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Impossible de supprimer ce site.');
      }

      setSites((prev) => prev.filter((site) => site._id !== id));
      setMessage('Site supprimé.');
    } catch (e: any) {
      setError(e.message || 'Impossible de supprimer ce site.');
    } finally {
      setDeletingId(null);
    }
  };

  const createSite = async (e: FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError('');
    setMessage('');
    try {
      const res = await fetch('/api/company-sites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSite),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Impossible de créer le site.');
      }

      setSites((prev) => [...prev, json.data]);
      setNewSite({ name: '', publicUrl: '', adminUrl: '' });
      setMessage('Nouveau site ajouté.');
    } catch (e: any) {
      setError(e.message || 'Impossible de créer le site.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <header className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">Nos sites</h1>
        <p className="text-slate-500 mt-1 text-sm sm:text-base">Gérez les sites de la société et leurs accès public/admin.</p>
      </header>

      {error && (
        <div className="mb-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      {message && (
        <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {message}
        </div>
      )}

      <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Plus size={18} className="text-blue-600" />
          <h2 className="text-lg font-bold text-slate-800">Ajouter un site</h2>
        </div>

        <form onSubmit={createSite} className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            type="text"
            placeholder="Nom du site"
            value={newSite.name}
            onChange={(e) => setNewSite((prev) => ({ ...prev, name: e.target.value }))}
            className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            required
          />
          <input
            type="url"
            placeholder="Lien public (https://...)"
            value={newSite.publicUrl}
            onChange={(e) => setNewSite((prev) => ({ ...prev, publicUrl: e.target.value }))}
            className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
          <input
            type="url"
            placeholder="Lien admin (https://...)"
            value={newSite.adminUrl}
            onChange={(e) => setNewSite((prev) => ({ ...prev, adminUrl: e.target.value }))}
            className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />

          <div className="md:col-span-3">
            <button
              type="submit"
              disabled={creating || !newSite.name.trim()}
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2.5 rounded-xl disabled:opacity-60"
            >
              {creating ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <Plus size={16} />} {creating ? 'Ajout en cours...' : 'Ajouter le site'}
            </button>
          </div>
        </form>
      </section>

      <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Globe size={18} className="text-indigo-600" />
          <h2 className="text-lg font-bold text-slate-800">Sites configurés</h2>
        </div>

        {loading ? (
          <LoadingSpinner label="Chargement des sites..." size="sm" className="py-4" />
        ) : sites.length === 0 ? (
          <p className="text-sm text-slate-500">Aucun site configuré.</p>
        ) : (
          <div className="space-y-4">
            {sites.map((site) => (
              <div key={site._id} className="border border-slate-200 rounded-xl p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <input
                    type="text"
                    value={site.name}
                    onChange={(e) => updateDraft(site._id, 'name', e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                  <input
                    type="url"
                    value={site.publicUrl || ''}
                    onChange={(e) => updateDraft(site._id, 'publicUrl', e.target.value)}
                    placeholder="Lien public (https://...)"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                  <input
                    type="url"
                    value={site.adminUrl || ''}
                    onChange={(e) => updateDraft(site._id, 'adminUrl', e.target.value)}
                    placeholder="Lien admin (https://...)"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => saveSite(site)}
                    disabled={savingId === site._id}
                    className="inline-flex items-center gap-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-3 py-1.5 disabled:opacity-60"
                  >
                    {savingId === site._id ? <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <Save size={14} />} {savingId === site._id ? 'Enregistrement...' : 'Enregistrer'}
                  </button>

                  <button
                    type="button"
                    onClick={() => deleteSite(site._id)}
                    disabled={deletingId === site._id}
                    className="inline-flex items-center gap-1 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm font-semibold px-3 py-1.5 hover:bg-rose-100 disabled:opacity-60"
                  >
                    {deletingId === site._id ? <span className="w-3.5 h-3.5 border-2 border-rose-300 border-t-rose-700 rounded-full animate-spin" /> : <Trash2 size={14} />} {deletingId === site._id ? 'Suppression...' : 'Supprimer'}
                  </button>

                  {site.publicUrl && (
                    <a
                      href={site.publicUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 text-sm font-semibold px-3 py-1.5 hover:bg-slate-200"
                    >
                      Public <ExternalLink size={14} />
                    </a>
                  )}

                  {site.adminUrl && (
                    <a
                      href={site.adminUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 text-sm font-semibold px-3 py-1.5 hover:bg-indigo-100"
                    >
                      Admin <ExternalLink size={14} />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="mt-6 inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-100 text-slate-600 text-xs border border-slate-200">
        <Shield size={14} /> Les modifications sont enregistrées en base de données.
      </div>
    </div>
  );
}
