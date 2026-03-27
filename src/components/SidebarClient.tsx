"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Users, CreditCard, BarChart3, Settings, ShieldCheck, Megaphone, PenTool, BookOpen, Menu, X, Globe, ExternalLink, Plus, Pencil, Trash2 } from 'lucide-react';
import LogoutButton from './LogoutButton';

interface SidebarClientProps {
  session: any;
  pendingKyc: number;
}

interface CompanySite {
  _id: string;
  name: string;
  publicUrl: string;
  adminUrl: string;
}

export default function SidebarClient({ session, pendingKyc }: SidebarClientProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSitesEditorOpen, setIsSitesEditorOpen] = useState(false);
  const [sitesLoading, setSitesLoading] = useState(true);
  const [sitesError, setSitesError] = useState<string | null>(null);
  const [companySites, setCompanySites] = useState<CompanySite[]>([]);
  const [newSite, setNewSite] = useState({ name: '', publicUrl: '', adminUrl: '' });
  const [savingSiteId, setSavingSiteId] = useState<string | null>(null);
  const [creatingSite, setCreatingSite] = useState(false);
  const [deletingSiteId, setDeletingSiteId] = useState<string | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    loadSites();
  }, []);

  const loadSites = async () => {
    setSitesLoading(true);
    setSitesError(null);
    try {
      const res = await fetch('/api/company-sites', { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Impossible de charger les sites.');
      }

      setCompanySites((json.data || []).map((site: any) => ({
        _id: site._id,
        name: site.name || '',
        publicUrl: site.publicUrl || '',
        adminUrl: site.adminUrl || '',
      })));
    } catch (error: any) {
      setSitesError(error?.message || 'Impossible de charger les sites.');
    } finally {
      setSitesLoading(false);
    }
  };

  // Masquer la sidebar sur les pages publiques
  if (pathname.startsWith('/login')) return null;
  if (pathname.startsWith('/kyc/') && pathname.length > 10) return null;
  if (pathname.startsWith('/sign/')) return null;

  const navLinks = [
    { href: '/', label: 'Dashboard', icon: BarChart3 },
    { href: '/clients', label: 'Clients', icon: Users },
    { href: '/cartes', label: 'Cartes & Comptes', icon: CreditCard },
    { href: '/signatures', label: 'E-Signature', icon: PenTool },
    { href: '/comptabilite', label: 'Comptabilité', icon: BookOpen },
    { href: '/kyc', label: 'Vérification KYC', icon: ShieldCheck, badge: pendingKyc },
    { href: '/marketing', label: 'Marketing', icon: Megaphone },
  ];

  const updateCompanySiteDraft = (id: string, field: keyof Omit<CompanySite, '_id'>, value: string) => {
    setCompanySites((prev) =>
      prev.map((site) => (site._id === id ? { ...site, [field]: value } : site))
    );
  };

  const saveCompanySite = async (site: CompanySite) => {
    setSavingSiteId(site._id);
    setSitesError(null);
    try {
      const res = await fetch('/api/company-sites', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: site._id,
          name: site.name,
          publicUrl: site.publicUrl,
          adminUrl: site.adminUrl,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Impossible d\'enregistrer le site.');
      }
      setCompanySites((prev) => prev.map((item) => (item._id === json.data._id ? json.data : item)));
    } catch (error: any) {
      setSitesError(error.message || 'Impossible d\'enregistrer le site.');
    } finally {
      setSavingSiteId(null);
    }
  };

  const addCompanySite = async () => {
    setCreatingSite(true);
    setSitesError(null);
    try {
      const res = await fetch('/api/company-sites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSite),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Impossible d\'ajouter le site.');
      }

      setCompanySites((prev) => [...prev, json.data]);
      setNewSite({ name: '', publicUrl: '', adminUrl: '' });
    } catch (error: any) {
      setSitesError(error.message || 'Impossible d\'ajouter le site.');
    } finally {
      setCreatingSite(false);
    }
  };

  const removeCompanySite = async (id: string) => {
    setDeletingSiteId(id);
    setSitesError(null);
    try {
      const res = await fetch('/api/company-sites', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Impossible de supprimer le site.');
      }

      setCompanySites((prev) => prev.filter((site) => site._id !== id));
    } catch (error: any) {
      setSitesError(error.message || 'Impossible de supprimer le site.');
    } finally {
      setDeletingSiteId(null);
    }
  };

  return (
    <>
      {/* BOUTON HAMBURGER (MOBILE ONLY) */}
      <button 
        onClick={() => setIsOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-40 p-2 bg-slate-900 text-white rounded-lg shadow-lg"
      >
        <Menu size={24} />
      </button>

      {/* OVERLAY (MOBILE ONLY) */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* SIDEBAR */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white flex flex-col h-full transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:relative lg:translate-x-0 lg:flex
      `}>
        <div className="p-6 flex items-center justify-between border-b border-slate-800">
          <span className="font-bold text-2xl tracking-wider text-blue-400">NBBC</span>
          <button onClick={() => setIsOpen(false)} className="lg:hidden text-slate-400 hover:text-white">
            <X size={24} />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            return (
              <Link 
                key={link.href}
                href={link.href} 
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive ? 'bg-blue-600 text-white shadow-md shadow-blue-900/20' : 'hover:bg-slate-800 text-slate-300'
                }`}
              >
                <Icon size={20} />
                <span className="font-medium text-sm">{link.label}</span>
                {link.badge !== undefined && link.badge > 0 && (
                  <span className="ml-auto bg-amber-400 text-amber-900 text-xs font-bold px-2 py-0.5 rounded-full">
                    {link.badge}
                  </span>
                )}
              </Link>
            );
          })}

          <div className="mt-6 pt-4 border-t border-slate-800">
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-2 text-slate-300">
                <Globe size={16} />
                <span className="text-xs uppercase tracking-wider font-bold">Nos sites</span>
              </div>
              <button
                type="button"
                onClick={() => setIsSitesEditorOpen((prev) => !prev)}
                className="text-[11px] px-2 py-1 rounded-md bg-slate-800 text-slate-200 hover:bg-slate-700"
              >
                <span className="inline-flex items-center gap-1">
                  <Pencil size={12} /> {isSitesEditorOpen ? 'Fermer' : 'Modifier'}
                </span>
              </button>
            </div>

            <div className="mt-3 space-y-2">
              {sitesLoading && (
                <p className="text-xs text-slate-400 px-2">Chargement des sites...</p>
              )}

              {!sitesLoading && companySites.length === 0 && (
                <p className="text-xs text-slate-400 px-2">Aucun site configuré.</p>
              )}

              {companySites.map((site) => (
                <div key={site._id} className="rounded-lg border border-slate-800 bg-slate-900/40 p-3">
                  <p className="text-sm font-semibold text-slate-100 truncate">{site.name || 'Site sans nom'}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {site.publicUrl ? (
                      <a
                        href={site.publicUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-md bg-blue-600/20 px-2 py-1 text-[11px] font-semibold text-blue-200 hover:bg-blue-600/30"
                      >
                        Public <ExternalLink size={12} />
                      </a>
                    ) : (
                      <span className="inline-flex items-center rounded-md bg-slate-800 px-2 py-1 text-[11px] text-slate-400">Public non renseigné</span>
                    )}

                    {site.adminUrl ? (
                      <a
                        href={site.adminUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-md bg-emerald-600/20 px-2 py-1 text-[11px] font-semibold text-emerald-200 hover:bg-emerald-600/30"
                      >
                        Admin <ExternalLink size={12} />
                      </a>
                    ) : (
                      <span className="inline-flex items-center rounded-md bg-slate-800 px-2 py-1 text-[11px] text-slate-400">Admin non renseigné</span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {isSitesEditorOpen && (
              <div className="mt-3 space-y-3 rounded-xl border border-slate-800 bg-slate-900/70 p-3">
                {sitesError && (
                  <div className="rounded-md border border-rose-500/40 bg-rose-500/10 px-2 py-1.5 text-xs text-rose-200">
                    {sitesError}
                  </div>
                )}

                {companySites.map((site) => (
                  <div key={`editor-${site._id}`} className="rounded-lg border border-slate-800 bg-slate-900 p-3 space-y-2">
                    <input
                      type="text"
                      placeholder="Nom du site (ex: Site officiel)"
                      value={site.name}
                      onChange={(e) => updateCompanySiteDraft(site._id, 'name', e.target.value)}
                      className="w-full rounded-md border border-slate-700 bg-slate-800 px-2 py-1.5 text-xs text-slate-100 placeholder:text-slate-500"
                    />
                    <input
                      type="url"
                      placeholder="Lien public (https://...)"
                      value={site.publicUrl}
                      onChange={(e) => updateCompanySiteDraft(site._id, 'publicUrl', e.target.value)}
                      className="w-full rounded-md border border-slate-700 bg-slate-800 px-2 py-1.5 text-xs text-slate-100 placeholder:text-slate-500"
                    />
                    <input
                      type="url"
                      placeholder="Lien admin (https://...)"
                      value={site.adminUrl}
                      onChange={(e) => updateCompanySiteDraft(site._id, 'adminUrl', e.target.value)}
                      className="w-full rounded-md border border-slate-700 bg-slate-800 px-2 py-1.5 text-xs text-slate-100 placeholder:text-slate-500"
                    />

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => saveCompanySite(site)}
                        disabled={savingSiteId === site._id}
                        className="inline-flex items-center gap-1 rounded-md bg-blue-600/20 px-2 py-1 text-[11px] font-semibold text-blue-200 hover:bg-blue-600/30 disabled:opacity-60"
                      >
                        {savingSiteId === site._id ? 'Enregistrement...' : 'Enregistrer'}
                      </button>
                      <button
                        type="button"
                        onClick={() => removeCompanySite(site._id)}
                        disabled={deletingSiteId === site._id}
                        className="inline-flex items-center gap-1 rounded-md bg-rose-600/20 px-2 py-1 text-[11px] font-semibold text-rose-200 hover:bg-rose-600/30 disabled:opacity-60"
                      >
                        <Trash2 size={12} /> {deletingSiteId === site._id ? 'Suppression...' : 'Supprimer'}
                      </button>
                    </div>
                  </div>
                ))}

                <div className="rounded-lg border border-dashed border-slate-700 bg-slate-900 p-3 space-y-2">
                  <p className="text-[11px] uppercase tracking-wide text-slate-400 font-semibold">Ajouter un site</p>
                  <input
                    type="text"
                    placeholder="Nom du site"
                    value={newSite.name}
                    onChange={(e) => setNewSite((prev) => ({ ...prev, name: e.target.value }))}
                    className="w-full rounded-md border border-slate-700 bg-slate-800 px-2 py-1.5 text-xs text-slate-100 placeholder:text-slate-500"
                  />
                  <input
                    type="url"
                    placeholder="Lien public (https://...)"
                    value={newSite.publicUrl}
                    onChange={(e) => setNewSite((prev) => ({ ...prev, publicUrl: e.target.value }))}
                    className="w-full rounded-md border border-slate-700 bg-slate-800 px-2 py-1.5 text-xs text-slate-100 placeholder:text-slate-500"
                  />
                  <input
                    type="url"
                    placeholder="Lien admin (https://...)"
                    value={newSite.adminUrl}
                    onChange={(e) => setNewSite((prev) => ({ ...prev, adminUrl: e.target.value }))}
                    className="w-full rounded-md border border-slate-700 bg-slate-800 px-2 py-1.5 text-xs text-slate-100 placeholder:text-slate-500"
                  />
                  <button
                    type="button"
                    onClick={addCompanySite}
                    disabled={creatingSite || !newSite.name.trim()}
                    className="w-full inline-flex items-center justify-center gap-1 rounded-md bg-slate-800 px-2 py-2 text-xs font-semibold text-slate-100 hover:bg-slate-700 disabled:opacity-60"
                  >
                    <Plus size={14} /> {creatingSite ? 'Ajout...' : 'Ajouter le site'}
                  </button>
                  </div>
              </div>
            )}
          </div>
        </nav>

        <div className="p-4 border-t border-slate-800 space-y-3">
          <Link 
            href="/parametres" 
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-3 px-4 py-2 hover:text-white text-slate-400 transition-colors rounded-lg hover:bg-slate-800"
          >
            <Settings size={20} />
            <span className="text-sm">Paramètres</span>
          </Link>
          
          <div className="pt-3 border-t border-slate-800/50">
            <div className="flex items-center gap-3 px-4 py-2 mb-2 text-slate-300">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-sm font-bold shadow-sm">
                {session?.user?.name?.[0] || 'U'}
              </div>
              <div className="text-sm overflow-hidden">
                <div className="font-bold truncate text-xs">{session?.user?.name}</div>
                <div className="text-[10px] text-slate-500 truncate lowercase">{(session?.user as any)?.role || 'Utilisateur'}</div>
              </div>
            </div>
            <LogoutButton />
          </div>
        </div>
      </aside>
    </>
  );
}
