"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Plus, Send, Trash2, Edit3, X, Mail, Users, Clock, CheckCircle,
  AlertCircle, Copy, Megaphone, Search, UserCheck,
  FolderOpen, Globe, Eye, MessageSquare, Layers, Tag,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
type CibleType = 'TOUS' | 'TYPE_CLIENT' | 'GROUPES' | 'SELECTIONNES';
type Canal = 'EMAIL' | 'SMS';
type Tab = 'campagnes' | 'groupes';

interface Client { _id: string; nom: string; prenom: string; email: string; telephone?: string; typeClient: string; }
interface Groupe { _id: string; nom: string; description?: string; couleur: string; clientIds: Client[]; }

const TYPES_CLIENT = ['PARTICULIER', 'ENTREPRISE', 'INVESTISSEUR', 'PARTENAIRE'];

const COULEURS_GROUPE = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e',
  '#f97316', '#eab308', '#22c55e', '#14b8a6', '#3b82f6', '#64748b',
];

const TEMPLATES = [
  {
    nom: 'Bienvenue',
    sujet: 'Bienvenue chez NBBC ! 🎉',
    contenu: `<p>Bonjour <strong>{{prenom}}</strong>,</p>\n<p>Nous sommes ravis de vous accueillir sur la plateforme NBBC. Votre compte est maintenant actif et prêt à l'emploi.</p>\n<p>Nos services incluent :</p>\n<ul>\n<li>Transferts Zelle, CashApp, Wire et PayPal</li>\n<li>Gestion de votre portefeuille crypto</li>\n<li>Transferts internationaux en Euro et WISE</li>\n</ul>\n<p>Pour toute question, notre équipe est disponible 7j/7.</p>\n<p>Cordialement,<br><strong>L'équipe NBBC</strong></p>`,
  },
  {
    nom: 'Relance KYC',
    sujet: "Action requise : Complétez votre vérification d'identité",
    contenu: `<p>Bonjour <strong>{{prenom}}</strong>,</p>\n<p>Pour accéder à l'ensemble de nos services, nous avons besoin de vérifier votre identité (KYC).</p>\n<p>Cette étape rapide (moins de 5 minutes) vous permettra d'accéder à :</p>\n<ul>\n<li>Les virements illimités</li>\n<li>Les transferts crypto</li>\n<li>L'ensemble de nos produits premium</li>\n</ul>\n<p>Cliquez sur le lien fourni par votre agent pour compléter votre dossier.</p>\n<p><strong>L'équipe NBBC</strong></p>`,
  },
  {
    nom: 'Promotion',
    sujet: 'Offre spéciale NBBC – Ne manquez pas cette opportunité',
    contenu: `<p>Bonjour <strong>{{prenom}}</strong>,</p>\n<p>Nous avons une offre exceptionnelle pour vous ce mois-ci !</p>\n<p>[Décrivez votre offre ici]</p>\n<p>Cette offre est valable jusqu'au [date]. N'hésitez pas à nous contacter pour en profiter.</p>\n<p>Merci de votre confiance,<br><strong>L'équipe NBBC</strong></p>`,
  },
  {
    nom: 'Information',
    sujet: 'Information importante de NBBC',
    contenu: `<p>Bonjour <strong>{{prenom}}</strong>,</p>\n<p>Nous souhaitons vous informer d'une mise à jour importante concernant nos services.</p>\n<p>[Saisissez votre message ici]</p>\n<p>Merci de votre confiance.<br><strong>L'équipe NBBC</strong></p>`,
  },
];
// ─── Composant principal ───────────────────────────────────────────────────────
export default function MarketingPage() {
  const [activeTab, setActiveTab] = useState<Tab>('campagnes');

  // --- État campagnes
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loadingCampaigns, setLoadingCampaigns] = useState(true);
  const [showCampModal, setShowCampModal] = useState(false);
  const [editCamp, setEditCamp] = useState<any>(null);
  const [sending, setSending] = useState<string | null>(null);
  const [sendResult, setSendResult] = useState<any>(null);
  const [showPreview, setShowPreview] = useState(false);

  // --- État groupes
  const [groupes, setGroupes] = useState<Groupe[]>([]);
  const [loadingGroupes, setLoadingGroupes] = useState(true);
  const [showGroupeModal, setShowGroupeModal] = useState(false);
  const [editGroupe, setEditGroupe] = useState<Groupe | null>(null);

  // --- Tous les clients (lazy)
  const [allClients, setAllClients] = useState<Client[]>([]);
  const [clientsLoaded, setClientsLoaded] = useState(false);
  const [clientSearch, setClientSearch] = useState('');

  // --- Formulaire campagne
  const [campForm, setCampForm] = useState({
    titre: '', sujet: '', contenu: '', canal: 'EMAIL' as Canal,
    cibleType: 'TOUS' as CibleType, cible: 'TOUS',
    groupeIds: [] as string[], destinataireIds: [] as string[],
  });

  // --- Formulaire groupe
  const [groupeForm, setGroupeForm] = useState({
    nom: '', description: '', couleur: '#6366f1', clientIds: [] as string[],
  });
  const [groupeClientSearch, setGroupeClientSearch] = useState('');

  // ─── Fetch ─────────────────────────────────────────────────────────────────
  const fetchCampaigns = useCallback(async () => {
    setLoadingCampaigns(true);
    const res = await fetch('/api/marketing/campaigns');
    const data = await res.json();
    if (data.success) setCampaigns(data.data);
    setLoadingCampaigns(false);
  }, []);

  const fetchGroupes = useCallback(async () => {
    setLoadingGroupes(true);
    const res = await fetch('/api/marketing/groupes');
    const data = await res.json();
    if (data.success) setGroupes(data.data);
    setLoadingGroupes(false);
  }, []);

  const loadClients = useCallback(async () => {
    if (clientsLoaded) return;
    const res = await fetch('/api/clients?limit=9999');
    const data = await res.json();
    if (data.success) setAllClients(data.data || []);
    setClientsLoaded(true);
  }, [clientsLoaded]);

  useEffect(() => { fetchCampaigns(); fetchGroupes(); }, [fetchCampaigns, fetchGroupes]);

  // ─── Campagne helpers ───────────────────────────────────────────────────────
  const openNewCamp = useCallback(async () => {
    await loadClients();
    setCampForm({ titre: '', sujet: '', contenu: '', canal: 'EMAIL', cibleType: 'TOUS', cible: 'TOUS', groupeIds: [], destinataireIds: [] });
    setClientSearch('');
    setShowPreview(false);
    setEditCamp(null);
    setShowCampModal(true);
  }, [loadClients]);

  const openEditCamp = async (c: any) => {
    await loadClients();
    setCampForm({
      titre: c.titre, sujet: c.sujet, contenu: c.contenu, canal: c.canal || 'EMAIL',
      cibleType: c.cibleType || 'TOUS', cible: c.cible || 'TOUS',
      groupeIds: c.groupeIds || [], destinataireIds: c.destinataireIds || [],
    });
    setClientSearch('');
    setShowPreview(false);
    setEditCamp(c);
    setShowCampModal(true);
  };

  const saveCamp = async () => {
    const url = editCamp ? `/api/marketing/campaigns/${editCamp._id}` : '/api/marketing/campaigns';
    const method = editCamp ? 'PUT' : 'POST';
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(campForm) });
    const data = await res.json();
    if (data.success) { setShowCampModal(false); fetchCampaigns(); }
  };

  const deleteCamp = async (id: string) => {
    if (!confirm('Supprimer cette campagne ?')) return;
    await fetch(`/api/marketing/campaigns/${id}`, { method: 'DELETE' });
    fetchCampaigns();
  };

  const sendCamp = async (id: string) => {
    if (!confirm('Envoyer cette campagne maintenant à tous les destinataires ?')) return;
    setSending(id); setSendResult(null);
    const res = await fetch(`/api/marketing/campaigns/${id}/send`, { method: 'POST' });
    const data = await res.json();
    setSendResult(data); setSending(null); fetchCampaigns();
  };

  const toggleDestinataire = (cid: string) => {
    setCampForm(f => ({
      ...f,
      destinataireIds: f.destinataireIds.includes(cid)
        ? f.destinataireIds.filter(x => x !== cid)
        : [...f.destinataireIds, cid],
    }));
  };

  const toggleGroupeCamp = (gid: string) => {
    setCampForm(f => ({
      ...f,
      groupeIds: f.groupeIds.includes(gid)
        ? f.groupeIds.filter(x => x !== gid)
        : [...f.groupeIds, gid],
    }));
  };

  const estimatedCount = useMemo(() => {
    if (campForm.cibleType === 'TOUS') return allClients.length || '?';
    if (campForm.cibleType === 'TYPE_CLIENT') {
      if (campForm.cible === 'TOUS') return allClients.length || '?';
      return allClients.filter(c => c.typeClient === campForm.cible).length || '?';
    }
    if (campForm.cibleType === 'GROUPES') {
      const ids = new Set<string>();
      groupes.filter(g => campForm.groupeIds.includes(g._id)).forEach(g => g.clientIds.forEach(c => ids.add(c._id)));
      return ids.size;
    }
    if (campForm.cibleType === 'SELECTIONNES') return campForm.destinataireIds.length;
    return 0;
  }, [campForm, allClients, groupes]);

  const filteredClients = useMemo(() => {
    const q = clientSearch.toLowerCase();
    return q ? allClients.filter(c => `${c.nom} ${c.prenom} ${c.email}`.toLowerCase().includes(q)) : allClients;
  }, [allClients, clientSearch]);

  // ─── Groupe helpers ─────────────────────────────────────────────────────────
  const openNewGroupe = async () => {
    await loadClients();
    setGroupeForm({ nom: '', description: '', couleur: '#6366f1', clientIds: [] });
    setGroupeClientSearch('');
    setEditGroupe(null);
    setShowGroupeModal(true);
  };

  const openEditGroupe = async (g: Groupe) => {
    await loadClients();
    setGroupeForm({ nom: g.nom, description: g.description || '', couleur: g.couleur, clientIds: g.clientIds.map(c => c._id) });
    setGroupeClientSearch('');
    setEditGroupe(g);
    setShowGroupeModal(true);
  };

  const saveGroupe = async () => {
    const url = editGroupe ? `/api/marketing/groupes/${editGroupe._id}` : '/api/marketing/groupes';
    const method = editGroupe ? 'PUT' : 'POST';
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(groupeForm) });
    const data = await res.json();
    if (data.success) { setShowGroupeModal(false); fetchGroupes(); }
  };

  const deleteGroupe = async (id: string) => {
    if (!confirm('Supprimer ce groupe ? Les clients ne seront pas supprimés.')) return;
    await fetch(`/api/marketing/groupes/${id}`, { method: 'DELETE' });
    fetchGroupes();
  };

  const toggleGroupeClient = (cid: string) => {
    setGroupeForm(f => ({
      ...f,
      clientIds: f.clientIds.includes(cid) ? f.clientIds.filter(x => x !== cid) : [...f.clientIds, cid],
    }));
  };

  const filteredGroupeClients = useMemo(() => {
    const q = groupeClientSearch.toLowerCase();
    return q ? allClients.filter(c => `${c.nom} ${c.prenom} ${c.email}`.toLowerCase().includes(q)) : allClients;
  }, [allClients, groupeClientSearch]);

  // ─── Ciblage label ─────────────────────────────────────────────────────────
  const getCibleLabel = (c: any) => ({
    TOUS: 'Tous les clients',
    TYPE_CLIENT: `Type: ${c.cible}`,
    GROUPES: `${c.groupeIds?.length || 0} groupe(s)`,
    SELECTIONNES: `${c.destinataireIds?.length || 0} client(s) sélectionné(s)`,
  }[c.cibleType as string] ?? c.cible);

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">

      {/* ─── MODAL CAMPAGNE ──────────────────────────────────────────────────── */}
      {showCampModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4">
          <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-3xl max-h-[95vh] flex flex-col overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-600 to-purple-700 px-6 py-4 flex justify-between items-center shrink-0">
              <h2 className="text-white font-bold text-lg">{editCamp ? 'Modifier la campagne' : 'Nouvelle campagne'}</h2>
              <button onClick={() => setShowCampModal(false)} className="text-white/70 hover:text-white"><X size={22} /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-5">
              {/* Titre */}
              <div>
                <label className="label-xs">Nom de la campagne *</label>
                <input type="text" value={campForm.titre} onChange={e => setCampForm({ ...campForm, titre: e.target.value })}
                  className="input-base" placeholder="Ex : Newsletter Avril 2026" />
              </div>

              {/* Canal */}
              <div>
                <label className="label-xs">Canal d'envoi</label>
                <div className="flex gap-3">
                  {(['EMAIL', 'SMS'] as Canal[]).map(c => (
                    <label key={c} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 cursor-pointer transition-all text-sm font-bold ${campForm.canal === c ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-500 hover:border-indigo-200'}`}>
                      <input type="radio" className="hidden" checked={campForm.canal === c} onChange={() => setCampForm({ ...campForm, canal: c })} />
                      {c === 'EMAIL' ? <Mail size={16} /> : <MessageSquare size={16} />}
                      {c === 'EMAIL' ? 'Email' : 'SMS (bientôt)'}
                    </label>
                  ))}
                </div>
              </div>

              {/* Mode ciblage */}
              <div>
                <label className="label-xs">Mode de ciblage</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { val: 'TOUS', icon: Globe, label: 'Tous les clients', desc: 'Envoyer à toute la base' },
                    { val: 'TYPE_CLIENT', icon: Tag, label: 'Par type de client', desc: 'Filtre par catégorie' },
                    { val: 'GROUPES', icon: Layers, label: 'Par groupe', desc: 'Groupes personnalisés' },
                    { val: 'SELECTIONNES', icon: UserCheck, label: 'Sélection manuelle', desc: 'Choisissez un par un' },
                  ].map(({ val, icon: Icon, label, desc }) => (
                    <label key={val} className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${campForm.cibleType === val ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 hover:border-indigo-200'}`}>
                      <input type="radio" className="hidden" checked={campForm.cibleType === val} onChange={() => setCampForm({ ...campForm, cibleType: val as CibleType, destinataireIds: [], groupeIds: [] })} />
                      <Icon size={18} className={campForm.cibleType === val ? 'text-indigo-600 mt-0.5' : 'text-slate-400 mt-0.5'} />
                      <div>
                        <div className="font-bold text-slate-700 text-sm">{label}</div>
                        <div className="text-xs text-slate-400">{desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Sous-sélection : type */}
              {campForm.cibleType === 'TYPE_CLIENT' && (
                <div>
                  <label className="label-xs">Type de client</label>
                  <select value={campForm.cible} onChange={e => setCampForm({ ...campForm, cible: e.target.value })} className="input-base">
                    <option value="TOUS">Tous les types</option>
                    {TYPES_CLIENT.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              )}

              {/* Sous-sélection : groupes */}
              {campForm.cibleType === 'GROUPES' && (
                <div>
                  <label className="label-xs">Groupes ({campForm.groupeIds.length} sélectionné{campForm.groupeIds.length > 1 ? 's' : ''})</label>
                  {groupes.length === 0 ? (
                    <p className="text-sm text-slate-400 bg-slate-50 rounded-xl p-4">Aucun groupe. Créez-en dans l'onglet Groupes.</p>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {groupes.map(g => (
                        <label key={g._id} className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${campForm.groupeIds.includes(g._id) ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 hover:border-indigo-200'}`}>
                          <input type="checkbox" checked={campForm.groupeIds.includes(g._id)} onChange={() => toggleGroupeCamp(g._id)} className="accent-indigo-600 w-4 h-4" />
                          <div className="w-3 h-3 rounded-full shrink-0" style={{ background: g.couleur }} />
                          <div className="flex-1 min-w-0">
                            <div className="font-bold text-slate-700 text-sm truncate">{g.nom}</div>
                            <div className="text-xs text-slate-400">{g.clientIds.length} membre{g.clientIds.length > 1 ? 's' : ''}</div>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Sous-sélection : clients individuels */}
              {campForm.cibleType === 'SELECTIONNES' && (
                <div>
                  <label className="label-xs">Clients ({campForm.destinataireIds.length} sélectionné{campForm.destinataireIds.length > 1 ? 's' : ''})</label>
                  <div className="relative mb-2">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type="text" value={clientSearch} onChange={e => setClientSearch(e.target.value)} placeholder="Rechercher…"
                      className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:border-indigo-400" />
                  </div>
                  <div className="max-h-52 overflow-y-auto space-y-1.5 border border-slate-200 rounded-xl p-2">
                    {filteredClients.length === 0 && <p className="text-xs text-slate-400 text-center py-4">Aucun client trouvé</p>}
                    {filteredClients.map(c => (
                      <label key={c._id} className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors ${campForm.destinataireIds.includes(c._id) ? 'bg-indigo-50' : 'hover:bg-slate-50'}`}>
                        <input type="checkbox" checked={campForm.destinataireIds.includes(c._id)} onChange={() => toggleDestinataire(c._id)} className="accent-indigo-600 w-4 h-4 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-slate-700 text-sm truncate">{c.prenom} {c.nom}</div>
                          <div className="text-xs text-slate-400 truncate">{c.email}</div>
                        </div>
                        <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full shrink-0">{c.typeClient}</span>
                      </label>
                    ))}
                  </div>
                  {campForm.destinataireIds.length > 0 && (
                    <button onClick={() => setCampForm(f => ({ ...f, destinataireIds: [] }))} className="text-xs text-rose-500 hover:underline mt-1">Tout désélectionner</button>
                  )}
                </div>
              )}

              {/* Compteur estimé */}
              <div className="flex items-center gap-2 p-3 bg-indigo-50 rounded-xl border border-indigo-100">
                <Users size={16} className="text-indigo-600 shrink-0" />
                <span className="text-sm font-bold text-indigo-700">
                  {estimatedCount} destinataire{Number(estimatedCount) !== 1 ? 's' : ''} estimé{Number(estimatedCount) !== 1 ? 's' : ''}
                </span>
                {!clientsLoaded && <span className="text-xs text-slate-400">(chargement…)</span>}
              </div>

              {/* Objet */}
              {campForm.canal === 'EMAIL' && (
                <div>
                  <label className="label-xs">Objet de l'email *</label>
                  <input type="text" value={campForm.sujet} onChange={e => setCampForm({ ...campForm, sujet: e.target.value })}
                    className="input-base" placeholder="Ex : Mise à jour importante..." />
                </div>
              )}

              {/* Templates */}
              {campForm.canal === 'EMAIL' && (
                <div>
                  <label className="label-xs">Partir d'un template</label>
                  <div className="flex gap-2 flex-wrap">
                    {TEMPLATES.map(tpl => (
                      <button key={tpl.nom} type="button"
                        onClick={() => setCampForm(f => ({ ...f, sujet: tpl.sujet, contenu: tpl.contenu }))}
                        className="px-3 py-1.5 text-xs font-bold bg-slate-100 hover:bg-indigo-100 hover:text-indigo-700 text-slate-600 rounded-lg transition-colors flex items-center gap-1.5">
                        <Copy size={12} /> {tpl.nom}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Contenu */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="label-xs">{campForm.canal === 'EMAIL' ? 'Contenu HTML *' : 'Message SMS *'}</label>
                  {campForm.canal === 'EMAIL' && (
                    <span className="text-xs text-slate-400">
                      Variables : <code className="bg-slate-100 px-1 rounded">{'{{prenom}}'}</code> <code className="bg-slate-100 px-1 rounded">{'{{nom}}'}</code>
                    </span>
                  )}
                </div>
                <textarea
                  value={campForm.contenu}
                  onChange={e => setCampForm({ ...campForm, contenu: e.target.value })}
                  rows={campForm.canal === 'EMAIL' ? 10 : 4}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-500 text-sm font-mono resize-none focus:outline-none"
                  placeholder={campForm.canal === 'EMAIL' ? '<p>Bonjour {{prenom}},</p>...' : 'Bonjour {{prenom}}, votre message ici...'}
                />
                {campForm.canal === 'SMS' && <p className="text-xs text-slate-400 mt-1">{campForm.contenu.length} / 160 caractères recommandés</p>}
              </div>

              {/* Aperçu */}
              {campForm.canal === 'EMAIL' && campForm.contenu && (
                <div>
                  <button type="button" onClick={() => setShowPreview(p => !p)}
                    className="flex items-center gap-2 text-xs font-bold text-indigo-600 hover:text-indigo-800">
                    <Eye size={13} /> {showPreview ? 'Masquer l\'aperçu' : 'Aperçu du rendu email'}
                  </button>
                  {showPreview && (
                    <div className="mt-2 rounded-xl border border-slate-200 overflow-hidden">
                      <div className="bg-slate-700 px-4 py-2 text-xs text-slate-300 flex items-center gap-2">
                        <Mail size={12} /> {campForm.sujet}
                      </div>
                      <div className="bg-slate-50 p-4 max-h-60 overflow-y-auto text-sm text-slate-700" dangerouslySetInnerHTML={{ __html: campForm.contenu }} />
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="p-5 border-t border-slate-100 flex gap-3 shrink-0 bg-slate-50/50">
              <button onClick={() => setShowCampModal(false)} className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-100">Annuler</button>
              <button
                onClick={saveCamp}
                disabled={
                  !campForm.titre || !campForm.sujet || !campForm.contenu ||
                  (campForm.cibleType === 'SELECTIONNES' && campForm.destinataireIds.length === 0) ||
                  (campForm.cibleType === 'GROUPES' && campForm.groupeIds.length === 0)
                }
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold shadow-lg disabled:opacity-50">
                {editCamp ? 'Sauvegarder' : 'Créer la campagne'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL GROUPE ─────────────────────────────────────────────────────── */}
      {showGroupeModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4">
          <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-2xl max-h-[95vh] flex flex-col overflow-hidden">
            <div className="bg-gradient-to-r from-teal-600 to-emerald-600 px-6 py-4 flex justify-between items-center shrink-0">
              <h2 className="text-white font-bold text-lg">{editGroupe ? 'Modifier le groupe' : 'Nouveau groupe'}</h2>
              <button onClick={() => setShowGroupeModal(false)} className="text-white/70 hover:text-white"><X size={22} /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label-xs">Nom du groupe *</label>
                  <input type="text" value={groupeForm.nom} onChange={e => setGroupeForm({ ...groupeForm, nom: e.target.value })}
                    className="input-base" placeholder="Ex : VIP, Crypto, Zone Afrique…" />
                </div>
                <div>
                  <label className="label-xs">Description</label>
                  <input type="text" value={groupeForm.description} onChange={e => setGroupeForm({ ...groupeForm, description: e.target.value })}
                    className="input-base" placeholder="Optionnel" />
                </div>
              </div>

              <div>
                <label className="label-xs">Couleur du groupe</label>
                <div className="flex gap-2 flex-wrap mt-1">
                  {COULEURS_GROUPE.map(col => (
                    <button key={col} type="button" onClick={() => setGroupeForm({ ...groupeForm, couleur: col })}
                      className={`w-7 h-7 rounded-full transition-transform ${groupeForm.couleur === col ? 'ring-2 ring-offset-2 ring-slate-400 scale-110' : 'hover:scale-110'}`}
                      style={{ background: col }} />
                  ))}
                  <input type="color" value={groupeForm.couleur} onChange={e => setGroupeForm({ ...groupeForm, couleur: e.target.value })}
                    className="w-7 h-7 rounded-full cursor-pointer border-2 border-slate-200" title="Couleur personnalisée" />
                </div>
              </div>

              <div>
                <label className="label-xs">Membres ({groupeForm.clientIds.length} sélectionné{groupeForm.clientIds.length > 1 ? 's' : ''})</label>
                <div className="relative mb-2">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type="text" value={groupeClientSearch} onChange={e => setGroupeClientSearch(e.target.value)}
                    placeholder="Rechercher un client…" className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:border-teal-400" />
                </div>
                <div className="flex gap-2 mb-2">
                  <button type="button" onClick={() => setGroupeForm(f => ({ ...f, clientIds: allClients.map(c => c._id) }))}
                    className="text-xs text-teal-600 font-bold hover:underline">Tout sélectionner</button>
                  <span className="text-slate-300">|</span>
                  <button type="button" onClick={() => setGroupeForm(f => ({ ...f, clientIds: [] }))}
                    className="text-xs text-rose-500 font-bold hover:underline">Tout désélectionner</button>
                </div>
                <div className="max-h-60 overflow-y-auto space-y-1.5 border border-slate-200 rounded-xl p-2">
                  {filteredGroupeClients.length === 0 && <p className="text-xs text-slate-400 text-center py-4">Aucun client</p>}
                  {filteredGroupeClients.map(c => (
                    <label key={c._id} className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors ${groupeForm.clientIds.includes(c._id) ? 'bg-teal-50' : 'hover:bg-slate-50'}`}>
                      <input type="checkbox" checked={groupeForm.clientIds.includes(c._id)} onChange={() => toggleGroupeClient(c._id)} className="accent-teal-600 w-4 h-4 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-slate-700 text-sm truncate">{c.prenom} {c.nom}</div>
                        <div className="text-xs text-slate-400 truncate">{c.email}{c.telephone ? ` · ${c.telephone}` : ''}</div>
                      </div>
                      <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full shrink-0">{c.typeClient}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-5 border-t border-slate-100 flex gap-3 shrink-0 bg-slate-50/50">
              <button onClick={() => setShowGroupeModal(false)} className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-100">Annuler</button>
              <button onClick={saveGroupe} disabled={!groupeForm.nom.trim()}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 text-white font-bold shadow-lg disabled:opacity-50">
                {editGroupe ? 'Sauvegarder' : 'Créer le groupe'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── TOAST ───────────────────────────────────────────────────────────── */}
      {sendResult && (
        <div className={`fixed bottom-6 right-6 z-50 p-5 rounded-2xl shadow-2xl max-w-sm ${sendResult.success ? 'bg-emerald-50 border border-emerald-200' : 'bg-rose-50 border border-rose-200'}`}>
          <div className="flex justify-between items-start mb-2">
            <h4 className={`font-bold ${sendResult.success ? 'text-emerald-800' : 'text-rose-800'}`}>
              {sendResult.success ? '✅ Campagne envoyée !' : '❌ Erreur d\'envoi'}
            </h4>
            <button onClick={() => setSendResult(null)} className="text-slate-400 hover:text-slate-600 ml-4"><X size={16} /></button>
          </div>
          {sendResult.success
            ? <p className="text-emerald-700 text-sm">{sendResult.data?.envoyes} envoyé(s) · {sendResult.data?.echecs} échec(s) sur {sendResult.data?.total} destinataires.</p>
            : <p className="text-rose-600 text-sm">{sendResult.error}</p>
          }
        </div>
      )}

      {/* ─── HEADER ──────────────────────────────────────────────────────────── */}
      <header className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center mb-6 sm:mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">Marketing & Campagnes</h1>
          <p className="text-slate-500 mt-1 text-sm">Envoi groupé email par type, groupes ou sélection individuelle.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={openNewGroupe}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm shadow transition-all">
            <FolderOpen size={17} /> Nouveau groupe
          </button>
          <button onClick={openNewCamp}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold text-sm shadow-md transition-all">
            <Plus size={17} /> Nouvelle campagne
          </button>
        </div>
      </header>

      {/* ─── KPI ─────────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-7">
        {[
          { label: 'Campagnes', value: campaigns.length, icon: Megaphone, color: 'from-indigo-500 to-purple-600' },
          { label: 'Envoyées', value: campaigns.filter(c => c.statut === 'ENVOYE').length, icon: CheckCircle, color: 'from-emerald-500 to-teal-600' },
          { label: 'Brouillons', value: campaigns.filter(c => c.statut === 'BROUILLON').length, icon: Edit3, color: 'from-amber-500 to-orange-600' },
          { label: 'Groupes clients', value: groupes.length, icon: Layers, color: 'from-teal-500 to-cyan-600' },
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

      {/* ─── ONGLETS ─────────────────────────────────────────────────────────── */}
      <div className="flex gap-1 mb-6 bg-slate-100 p-1 rounded-xl w-fit">
        {([
          { id: 'campagnes', label: 'Campagnes', icon: Megaphone },
          { id: 'groupes', label: 'Groupes de clients', icon: Layers },
        ] as { id: Tab; label: string; icon: React.ElementType }[]).map(t => {
          const Icon = t.icon;
          return (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-2 px-5 py-2 rounded-lg font-bold text-sm transition-all ${activeTab === t.id ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              <Icon size={16} /> {t.label}
            </button>
          );
        })}
      </div>

      {/* ─── ONGLET CAMPAGNES ────────────────────────────────────────────────── */}
      {activeTab === 'campagnes' && (
        <div className="space-y-4">
          {loadingCampaigns ? (
            <div className="text-center py-12 text-slate-400">
              <div className="w-7 h-7 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              Chargement…
            </div>
          ) : campaigns.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-200">
              <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Megaphone size={30} className="text-indigo-300" />
              </div>
              <h3 className="text-lg font-bold text-slate-700">Aucune campagne</h3>
              <p className="text-slate-400 mt-1 mb-5 text-sm">Créez votre première campagne pour communiquer avec vos clients.</p>
              <button onClick={openNewCamp} className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-indigo-700 text-sm">
                Créer une campagne
              </button>
            </div>
          ) : campaigns.map(c => (
            <div key={c._id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 hover:shadow-md transition-all">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className="font-bold text-slate-800">{c.titre}</h3>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${c.statut === 'ENVOYE' ? 'bg-emerald-100 text-emerald-700' : c.statut === 'ECHEC' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>
                      {c.statut === 'ENVOYE' ? '✅ Envoyée' : c.statut === 'ECHEC' ? '❌ Erreur' : '✏️ Brouillon'}
                    </span>
                    <span className="text-xs bg-indigo-50 text-indigo-600 font-semibold px-2 py-0.5 rounded-full">
                      {c.canal === 'SMS' ? '💬 SMS' : '📧 Email'}
                    </span>
                    <span className="text-xs bg-slate-100 text-slate-500 font-semibold px-2 py-0.5 rounded-full">
                      🎯 {getCibleLabel(c)}
                    </span>
                  </div>
                  <p className="text-slate-500 text-sm flex items-center gap-2 mb-2">
                    <Mail size={13} className="text-slate-400 shrink-0" />
                    <span className="truncate">{c.sujet}</span>
                  </p>
                  {c.statut === 'ENVOYE' && (
                    <div className="flex flex-wrap gap-4 text-sm">
                      <span className="flex items-center gap-1.5 text-slate-500"><Users size={13} className="text-slate-400" /><b className="text-slate-700">{c.nombreDestinataires}</b> destinataires</span>
                      <span className="flex items-center gap-1.5 text-emerald-600"><CheckCircle size={13} /><b>{c.nombreEnvoyes}</b> envoyés</span>
                      {c.nombreEchecs > 0 && <span className="flex items-center gap-1.5 text-rose-500"><AlertCircle size={13} /><b>{c.nombreEchecs}</b> échecs</span>}
                      {c.dateEnvoi && <span className="flex items-center gap-1.5 text-slate-400"><Clock size={13} />{new Date(c.dateEnvoi).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {c.statut !== 'ENVOYE' && (
                    <button onClick={() => openEditCamp(c)} className="p-2 bg-slate-100 hover:bg-indigo-100 hover:text-indigo-600 text-slate-500 rounded-xl transition-colors" title="Modifier">
                      <Edit3 size={15} />
                    </button>
                  )}
                  {c.statut !== 'ENVOYE' && (
                    <button onClick={() => sendCamp(c._id)} disabled={sending === c._id}
                      className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold rounded-xl shadow-md disabled:opacity-60 text-sm">
                      {sending === c._id ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Send size={14} />}
                      {sending === c._id ? 'Envoi…' : 'Envoyer'}
                    </button>
                  )}
                  {c.statut !== 'ENVOYE' && (
                    <button onClick={() => deleteCamp(c._id)} className="p-2 bg-slate-100 hover:bg-rose-100 hover:text-rose-500 text-slate-400 rounded-xl transition-colors" title="Supprimer">
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─── ONGLET GROUPES ──────────────────────────────────────────────────── */}
      {activeTab === 'groupes' && (
        <div className="space-y-4">
          {loadingGroupes ? (
            <div className="text-center py-12 text-slate-400">
              <div className="w-7 h-7 border-2 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              Chargement…
            </div>
          ) : groupes.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-200">
              <div className="w-16 h-16 bg-teal-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Layers size={30} className="text-teal-300" />
              </div>
              <h3 className="text-lg font-bold text-slate-700">Aucun groupe</h3>
              <p className="text-slate-400 mt-1 mb-5 text-sm">Les groupes permettent de cibler des ensembles précis de clients dans vos campagnes.</p>
              <button onClick={openNewGroupe} className="bg-teal-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-teal-700 text-sm">
                Créer un groupe
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {groupes.map(g => (
                <div key={g._id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 hover:shadow-md transition-all">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl shrink-0 flex items-center justify-center text-white font-bold text-base shadow-md"
                        style={{ background: g.couleur }}>
                        {g.nom.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-slate-800 truncate">{g.nom}</div>
                        {g.description && <div className="text-xs text-slate-400 truncate">{g.description}</div>}
                      </div>
                    </div>
                    <div className="flex gap-1 ml-2 shrink-0">
                      <button onClick={() => openEditGroupe(g)} className="p-1.5 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"><Edit3 size={14} /></button>
                      <button onClick={() => deleteGroupe(g._id)} className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"><Trash2 size={14} /></button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-slate-600 mb-3">
                    <Users size={14} className="text-slate-400" />
                    <span><b className="text-slate-800">{g.clientIds.length}</b> membre{g.clientIds.length > 1 ? 's' : ''}</span>
                  </div>

                  {g.clientIds.length > 0 && (
                    <div className="space-y-1 max-h-28 overflow-y-auto mb-4">
                      {g.clientIds.slice(0, 5).map(c => (
                        <div key={c._id} className="flex items-center gap-2 text-xs text-slate-600 bg-slate-50 px-2.5 py-1.5 rounded-lg">
                          <div className="w-5 h-5 rounded-full bg-gradient-to-br from-slate-400 to-slate-600 text-white flex items-center justify-center font-bold text-[10px] shrink-0">
                            {c.prenom?.[0]}{c.nom?.[0]}
                          </div>
                          <span className="truncate font-medium">{c.prenom} {c.nom}</span>
                        </div>
                      ))}
                      {g.clientIds.length > 5 && (
                        <div className="text-xs text-slate-400 text-center py-1">+{g.clientIds.length - 5} autre{g.clientIds.length - 5 > 1 ? 's' : ''}</div>
                      )}
                    </div>
                  )}

                  <button
                    onClick={() => { setActiveTab('campagnes'); openNewCamp().then(() => setCampForm(f => ({ ...f, cibleType: 'GROUPES', groupeIds: [g._id] }))); }}
                    className="w-full flex items-center justify-center gap-2 py-2 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-colors">
                    <Send size={13} /> Lancer une campagne
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <style jsx global>{`
        .label-xs { display:block; font-size:.7rem; font-weight:700; color:#475569; margin-bottom:6px; text-transform:uppercase; letter-spacing:.05em; }
        .input-base { width:100%; padding:.75rem 1rem; border-radius:.75rem; border:1px solid #e2e8f0; background:#f8fafc; font-size:.875rem; transition:all .15s; outline:none; }
        .input-base:focus { background:#fff; border-color:#818cf8; box-shadow:0 0 0 3px rgba(99,102,241,.1); }
      `}</style>
    </div>
  );
}
