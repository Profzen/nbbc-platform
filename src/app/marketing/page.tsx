"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Plus, Send, Trash2, Edit3, X, Mail, Users, Clock, CheckCircle,
  AlertCircle, Copy, Megaphone, Search, UserCheck,
  FolderOpen, Globe, Eye, MessageSquare, Layers, Tag,
  BarChart2, BookMarked, Calendar, Save, ChevronDown, ChevronUp,
} from 'lucide-react';
import LoadingSpinner from '@/components/LoadingSpinner';

// ─── Types ────────────────────────────────────────────────────────────────────
type CibleType = 'TOUS' | 'TYPE_CLIENT' | 'GROUPES' | 'SELECTIONNES';
type Canal = 'EMAIL' | 'SMS';
type Tab = 'campagnes' | 'groupes' | 'analytiques';

interface CampaignTemplate {
  _id: string;
  nom: string;
  sujet: string;
  contenu: string;
  canal: Canal;
  categorie: string;
  usageCount: number;
}

interface AnalyticsData {
  total: number;
  sent: number;
  failed: number;
  deliveryRate: number;
  openRate: number;
  clickRate: number;
  failureReasons: { reason: string; count: number }[];
  logs: { email: string; status: string; sentAt: string; errorMessage?: string }[];
}

interface Client { _id: string; nom: string; prenom: string; email: string; telephone?: string; typeClient: string; paysResidence?: string; servicesUtilises?: string[]; }
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
  const [savingCamp, setSavingCamp] = useState(false);
  const [deletingCamp, setDeletingCamp] = useState<string | null>(null);
  const [openingCamp, setOpeningCamp] = useState(false);

  // --- État groupes
  const [groupes, setGroupes] = useState<Groupe[]>([]);
  const [loadingGroupes, setLoadingGroupes] = useState(true);
  const [showGroupeModal, setShowGroupeModal] = useState(false);
  const [editGroupe, setEditGroupe] = useState<Groupe | null>(null);
  const [savingGroupe, setSavingGroupe] = useState(false);
  const [deletingGroupe, setDeletingGroupe] = useState<string | null>(null);
  const [openingGroupe, setOpeningGroupe] = useState(false);

  // --- Tous les clients (lazy)
  const [allClients, setAllClients] = useState<Client[]>([]);
  const [clientsLoaded, setClientsLoaded] = useState(false);
  const [clientSearch, setClientSearch] = useState('');

  // --- Templates DB
  const [dbTemplates, setDbTemplates] = useState<CampaignTemplate[]>([]);
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const [templateNom, setTemplateNom] = useState('');
  const [templateCategorie, setTemplateCategorie] = useState('');
  const [savingTemplate, setSavingTemplate] = useState(false);

  // --- Analytics
  const [analyticsId, setAnalyticsId] = useState<string | null>(null);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);

  // --- Formulaire campagne
  const [campForm, setCampForm] = useState({
    titre: '', sujet: '', contenu: '', canal: 'EMAIL' as Canal,
    cibleType: 'TOUS' as CibleType, cible: 'TOUS',
    groupeIds: [] as string[], destinataireIds: [] as string[],
    isScheduled: false, scheduledAt: '',
  });

  // --- Formulaire groupe
  const [groupeForm, setGroupeForm] = useState({
    nom: '', description: '', couleur: '#6366f1', clientIds: [] as string[],
  });
  const [groupeClientSearch, setGroupeClientSearch] = useState('');
  const [generatingDefaults, setGeneratingDefaults] = useState(false);

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
    try {
      const res = await fetch('/api/marketing/groupes');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.success) setGroupes(data.data);
    } catch (e) {
      console.error('Erreur chargement groupes:', e);
    }
    setLoadingGroupes(false);
  }, []);

  const fetchDbTemplates = useCallback(async () => {
    const res = await fetch('/api/marketing/templates');
    const data = await res.json();
    if (data.success) setDbTemplates(data.data);
  }, []);

  const fetchAnalytics = useCallback(async (id: string) => {
    if (analyticsId === id) { setAnalyticsId(null); setAnalyticsData(null); return; }
    setAnalyticsId(id);
    setAnalyticsData(null);
    setLoadingAnalytics(true);
    const res = await fetch(`/api/marketing/campaigns/${id}/analytics`);
    const data = await res.json();
    if (data.success) setAnalyticsData(data.data);
    setLoadingAnalytics(false);
  }, [analyticsId]);

  const loadClients = useCallback(async () => {
    if (clientsLoaded) return;
    const res = await fetch('/api/clients?limit=9999');
    const data = await res.json();
    if (data.success) setAllClients(data.data || []);
    setClientsLoaded(true);
  }, [clientsLoaded]);

  useEffect(() => { fetchCampaigns(); fetchGroupes(); fetchDbTemplates(); }, [fetchCampaigns, fetchGroupes, fetchDbTemplates]);

  // ─── Campagne helpers ───────────────────────────────────────────────────────
  const openNewCamp = useCallback(async () => {
    setOpeningCamp(true);
    try {
      await loadClients();
      setCampForm({ titre: '', sujet: '', contenu: '', canal: 'EMAIL', cibleType: 'TOUS', cible: 'TOUS', groupeIds: [], destinataireIds: [], isScheduled: false, scheduledAt: '' });
      setClientSearch('');
      setShowPreview(false);
      setShowSaveTemplate(false);
      setTemplateNom('');
      setTemplateCategorie('');
      setEditCamp(null);
      setShowCampModal(true);
    } finally { setOpeningCamp(false); }
  }, [loadClients]);

  const openEditCamp = async (c: any) => {
    setOpeningCamp(true);
    try {
      await loadClients();
      setCampForm({
        titre: c.titre, sujet: c.sujet, contenu: c.contenu, canal: c.canal || 'EMAIL',
        cibleType: c.cibleType || 'TOUS', cible: c.cible || 'TOUS',
        groupeIds: c.groupeIds || [], destinataireIds: c.destinataireIds || [],
        isScheduled: c.isScheduled || false,
        scheduledAt: c.scheduledAt ? new Date(c.scheduledAt).toISOString().slice(0, 16) : '',
      });
      setClientSearch('');
      setShowPreview(false);
      setShowSaveTemplate(false);
      setTemplateNom('');
      setTemplateCategorie('');
      setEditCamp(c);
      setShowCampModal(true);
    } finally { setOpeningCamp(false); }
  };

  const saveCamp = async () => {
    setSavingCamp(true);
    try {
      const payload = {
        ...campForm,
        sujet: campForm.canal === 'SMS' ? (campForm.sujet || campForm.titre) : campForm.sujet,
        scheduledAt: campForm.isScheduled && campForm.scheduledAt ? new Date(campForm.scheduledAt).toISOString() : null,
      };
      const url = editCamp ? `/api/marketing/campaigns/${editCamp._id}` : '/api/marketing/campaigns';
      const method = editCamp ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (data.success) { setShowCampModal(false); fetchCampaigns(); }
    } finally { setSavingCamp(false); }
  };

  const saveAsTemplate = async () => {
    if (!templateNom.trim()) return;
    setSavingTemplate(true);
    const res = await fetch('/api/marketing/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nom: templateNom, sujet: campForm.sujet, contenu: campForm.contenu, canal: campForm.canal, categorie: templateCategorie }),
    });
    const data = await res.json();
    if (data.success) { setShowSaveTemplate(false); setTemplateNom(''); setTemplateCategorie(''); fetchDbTemplates(); }
    setSavingTemplate(false);
  };

  const loadTemplate = async (tpl: CampaignTemplate) => {
    setCampForm(f => ({ ...f, sujet: tpl.sujet, contenu: tpl.contenu, canal: tpl.canal }));
    // Incrémenter le compteur d'utilisation
    fetch(`/api/marketing/templates/${tpl._id}`, { method: 'PATCH' }).catch(() => {});
  };

  const deleteCamp = async (id: string) => {
    if (!confirm('Supprimer cette campagne ?')) return;
    setDeletingCamp(id);
    try {
      await fetch(`/api/marketing/campaigns/${id}`, { method: 'DELETE' });
      fetchCampaigns();
    } finally { setDeletingCamp(null); }
  };

  const sendCamp = async (id: string) => {
    if (!confirm('Envoyer cette campagne maintenant à tous les destinataires ?')) return;
    setSending(id); setSendResult(null);
    try {
      const res = await fetch(`/api/marketing/campaigns/${id}/send`, { method: 'POST' });
      const data = await res.json();
      setSendResult(data);
    } catch (e: any) {
      setSendResult({ success: false, error: e.message || 'Erreur réseau' });
    }
    setSending(null); fetchCampaigns();
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
    setOpeningGroupe(true);
    try {
      await loadClients();
      setGroupeForm({ nom: '', description: '', couleur: '#6366f1', clientIds: [] });
      setGroupeClientSearch('');
      setEditGroupe(null);
      setShowGroupeModal(true);
    } finally { setOpeningGroupe(false); }
  };

  const openEditGroupe = async (g: Groupe) => {
    setOpeningGroupe(true);
    try {
      await loadClients();
      setGroupeForm({ nom: g.nom, description: g.description || '', couleur: g.couleur, clientIds: g.clientIds.map(c => c._id) });
      setGroupeClientSearch('');
      setEditGroupe(g);
      setShowGroupeModal(true);
    } finally { setOpeningGroupe(false); }
  };

  const saveGroupe = async () => {
    setSavingGroupe(true);
    try {
      const url = editGroupe ? `/api/marketing/groupes/${editGroupe._id}` : '/api/marketing/groupes';
      const method = editGroupe ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(groupeForm) });
      const data = await res.json();
      if (data.success) { setShowGroupeModal(false); fetchGroupes(); }
    } finally { setSavingGroupe(false); }
  };

  const deleteGroupe = async (id: string) => {
    if (!confirm('Supprimer ce groupe ? Les clients ne seront pas supprimés.')) return;
    setDeletingGroupe(id);
    try {
      await fetch(`/api/marketing/groupes/${id}`, { method: 'DELETE' });
      fetchGroupes();
    } finally { setDeletingGroupe(null); }
  };

  const toggleGroupeClient = (cid: string) => {
    setGroupeForm(f => ({
      ...f,
      clientIds: f.clientIds.includes(cid) ? f.clientIds.filter(x => x !== cid) : [...f.clientIds, cid],
    }));
  };

  const generateDefaultGroups = async () => {
    await loadClients();
    setGeneratingDefaults(true);
    try {
      const existingNames = new Set(groupes.map(g => g.nom));
      const groupsToCreate: { nom: string; description: string; couleur: string; clientIds: string[] }[] = [];

      // --- Groupes par pays ---
      const byCountry = new Map<string, string[]>();
      allClients.forEach(c => {
        const pays = (c.paysResidence || '').trim();
        if (!pays) return;
        if (!byCountry.has(pays)) byCountry.set(pays, []);
        byCountry.get(pays)!.push(c._id);
      });
      const countryColors = ['#3b82f6', '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#14b8a6', '#22c55e', '#64748b'];
      let ci = 0;
      byCountry.forEach((ids, pays) => {
        const nom = `🌍 ${pays}`;
        if (!existingNames.has(nom)) {
          groupsToCreate.push({ nom, description: `Clients résidant en/au ${pays}`, couleur: countryColors[ci % countryColors.length], clientIds: ids });
          ci++;
        }
      });

      // --- Groupes par service ---
      const SERVICE_LABELS: Record<string, string> = {
        ZELLE: 'Zelle', CASH_APP: 'CashApp', WIRE: 'Wire', PAYPAL: 'PayPal',
        CRYPTO: 'Crypto', EURO: 'Euro', WISE: 'Wise', AUTRE: 'Autre',
      };
      const byService = new Map<string, string[]>();
      allClients.forEach(c => {
        (c.servicesUtilises || []).forEach(s => {
          if (!byService.has(s)) byService.set(s, []);
          byService.get(s)!.push(c._id);
        });
      });
      const serviceColors = ['#22c55e', '#14b8a6', '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899', '#f97316', '#64748b'];
      let si = 0;
      byService.forEach((ids, service) => {
        const label = SERVICE_LABELS[service] || service;
        const nom = `⚡ ${label}`;
        if (!existingNames.has(nom)) {
          groupsToCreate.push({ nom, description: `Clients utilisant ${label}`, couleur: serviceColors[si % serviceColors.length], clientIds: ids });
          si++;
        }
      });

      // Créer les groupes via l'API
      for (const g of groupsToCreate) {
        await fetch('/api/marketing/groupes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(g),
        });
      }

      await fetchGroupes();
    } finally {
      setGeneratingDefaults(false);
    }
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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
                {!clientsLoaded && <span className="inline-flex"><LoadingSpinner size="sm" label="" className="!gap-0 [&>p]:hidden" /></span>}
              </div>

              {/* Objet */}
              {campForm.canal === 'EMAIL' && (
                <div>
                  <label className="label-xs">Objet de l'email *</label>
                  <input type="text" value={campForm.sujet} onChange={e => setCampForm({ ...campForm, sujet: e.target.value })}
                    className="input-base" placeholder="Ex : Mise à jour importante..." />
                </div>
              )}

              {/* Templates locaux */}
              {campForm.canal === 'EMAIL' && (
                <div>
                  <label className="label-xs">Partir d'un template prédéfini</label>
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

              {/* Templates DB sauvegardés */}
              {dbTemplates.filter(t => t.canal === campForm.canal || !t.canal).length > 0 && (
                <div>
                  <label className="label-xs">Mes templates sauvegardés ({dbTemplates.filter(t => t.canal === campForm.canal || !t.canal).length})</label>
                  <div className="flex gap-2 flex-wrap">
                    {dbTemplates.filter(t => t.canal === campForm.canal || !t.canal).map(tpl => (
                      <button key={tpl._id} type="button"
                        onClick={() => loadTemplate(tpl)}
                        className="px-3 py-1.5 text-xs font-bold bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg transition-colors flex items-center gap-1.5 border border-purple-100">
                        <BookMarked size={12} /> {tpl.nom}
                        {tpl.usageCount > 0 && <span className="text-purple-400">×{tpl.usageCount}</span>}
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

              {/* Sauvegarder comme template */}
              {campForm.contenu && (
                <div className="border border-dashed border-purple-200 rounded-xl p-4 bg-purple-50/50">
                  <button type="button" onClick={() => setShowSaveTemplate(p => !p)}
                    className="flex items-center gap-2 text-xs font-bold text-purple-700 hover:text-purple-900 w-full">
                    <Save size={13} />
                    Sauvegarder comme template réutilisable
                    {showSaveTemplate ? <ChevronUp size={13} className="ml-auto" /> : <ChevronDown size={13} className="ml-auto" />}
                  </button>
                  {showSaveTemplate && (
                    <div className="mt-3 space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="label-xs">Nom du template *</label>
                          <input type="text" value={templateNom} onChange={e => setTemplateNom(e.target.value)}
                            className="input-base" placeholder="Ex : Promo Été 2026" />
                        </div>
                        <div>
                          <label className="label-xs">Catégorie</label>
                          <input type="text" value={templateCategorie} onChange={e => setTemplateCategorie(e.target.value)}
                            className="input-base" placeholder="Ex : Newsletter" />
                        </div>
                      </div>
                      <button type="button" onClick={saveAsTemplate} disabled={!templateNom.trim() || savingTemplate}
                        className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl disabled:opacity-50 transition-colors">
                        {savingTemplate ? <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <BookMarked size={13} />}
                        {savingTemplate ? 'Sauvegarde...' : 'Sauvegarder le template'}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Planification */}
              <div className="border border-dashed border-amber-200 rounded-xl p-4 bg-amber-50/50">
                <div className="flex items-center gap-3">
                  <Calendar size={16} className="text-amber-600 shrink-0" />
                  <div className="flex-1">
                    <div className="text-sm font-bold text-amber-800">Envoi programmé</div>
                    <div className="text-xs text-amber-600">Le cron Vercel vérifie toutes les heures</div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" checked={campForm.isScheduled}
                      onChange={e => setCampForm(f => ({ ...f, isScheduled: e.target.checked, scheduledAt: e.target.checked ? f.scheduledAt : '' }))} />
                    <div className="w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
                  </label>
                </div>
                {campForm.isScheduled && (
                  <div className="mt-3">
                    <label className="label-xs">Date et heure d'envoi *</label>
                    <input type="datetime-local" value={campForm.scheduledAt}
                      onChange={e => setCampForm(f => ({ ...f, scheduledAt: e.target.value }))}
                      min={new Date().toISOString().slice(0, 16)}
                      className="input-base" />
                    {campForm.scheduledAt && (
                      <p className="text-xs text-amber-700 mt-1 font-medium">
                        ⏰ Envoi prévu le {new Date(campForm.scheduledAt).toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="p-5 border-t border-slate-100 flex gap-3 shrink-0 bg-slate-50/50">
              <button onClick={() => setShowCampModal(false)} disabled={savingCamp} className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-100 disabled:opacity-50">Annuler</button>
              <button
                onClick={saveCamp}
                disabled={
                  savingCamp ||
                  !campForm.titre || !campForm.contenu ||
                  (campForm.canal === 'EMAIL' && !campForm.sujet) ||
                  (campForm.cibleType === 'SELECTIONNES' && campForm.destinataireIds.length === 0) ||
                  (campForm.cibleType === 'GROUPES' && campForm.groupeIds.length === 0) ||
                  (campForm.isScheduled && !campForm.scheduledAt)
                }
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold shadow-lg disabled:opacity-50 flex items-center justify-center gap-2">
                {savingCamp && <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
                {savingCamp ? 'Enregistrement...' : editCamp ? 'Sauvegarder' : campForm.isScheduled ? '⏰ Planifier l\'envoi' : 'Créer la campagne'}
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
              <button onClick={() => setShowGroupeModal(false)} disabled={savingGroupe} className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-100 disabled:opacity-50">Annuler</button>
              <button onClick={saveGroupe} disabled={!groupeForm.nom.trim() || savingGroupe}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 text-white font-bold shadow-lg disabled:opacity-50 flex items-center justify-center gap-2">
                {savingGroupe && <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
                {savingGroupe ? 'Enregistrement...' : editGroupe ? 'Sauvegarder' : 'Créer le groupe'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── TOAST ───────────────────────────────────────────────────────────── */}
      {sendResult && (
        <div className={`fixed bottom-4 left-4 right-4 sm:bottom-6 sm:left-auto sm:right-6 z-50 p-5 rounded-2xl shadow-2xl max-w-sm sm:max-w-md ${sendResult.success ? 'bg-emerald-50 border border-emerald-200' : 'bg-rose-50 border border-rose-200'}`}>
          <div className="flex justify-between items-start mb-2">
            <h4 className={`font-bold ${sendResult.success ? 'text-emerald-800' : 'text-rose-800'}`}>
              {sendResult.success ? '✅ Campagne envoyée !' : '❌ Erreur d\'envoi'}
            </h4>
            <button onClick={() => setSendResult(null)} className="text-slate-400 hover:text-slate-600 ml-4"><X size={16} /></button>
          </div>
          {sendResult.success
            ? <>
                <p className="text-emerald-700 text-sm">{sendResult.data?.envoyes} envoyé(s) · {sendResult.data?.echecs} échec(s) sur {sendResult.data?.total} destinataires.</p>
                {sendResult.data?.errors?.length > 0 && (
                  <div className="mt-2 text-xs text-rose-600 bg-rose-50 rounded-lg p-2 max-h-32 overflow-y-auto">
                    <p className="font-semibold mb-1">Détails des échecs :</p>
                    {sendResult.data.errors.map((e: string, i: number) => <p key={i}>• {e}</p>)}
                  </div>
                )}
              </>
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
          <button onClick={openNewGroupe} disabled={openingGroupe}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm shadow transition-all disabled:opacity-60">
            {openingGroupe ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <FolderOpen size={17} />}
            {openingGroupe ? 'Chargement...' : 'Nouveau groupe'}
          </button>
          <button onClick={openNewCamp} disabled={openingCamp}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold text-sm shadow-md transition-all disabled:opacity-60">
            {openingCamp ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <Plus size={17} />}
            {openingCamp ? 'Chargement...' : 'Nouvelle campagne'}
          </button>
        </div>
      </header>

      {/* ─── KPI ─────────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-7">
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
      <div className="flex gap-1 mb-6 bg-slate-100 p-1 rounded-xl overflow-x-auto whitespace-nowrap w-full sm:w-fit">
        {([
          { id: 'campagnes', label: 'Campagnes', icon: Megaphone },
          { id: 'groupes', label: 'Groupes de clients', icon: Layers },
          { id: 'analytiques', label: 'Analytiques', icon: BarChart2 },
        ] as { id: Tab; label: string; icon: React.ElementType }[]).map(t => {
          const Icon = t.icon;
          return (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={`shrink-0 flex items-center gap-2 px-5 py-2 rounded-lg font-bold text-sm transition-all ${activeTab === t.id ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              <Icon size={16} /> {t.label}
            </button>
          );
        })}
      </div>

      {/* ─── ONGLET CAMPAGNES ────────────────────────────────────────────────── */}
      {activeTab === 'campagnes' && (
        <div className="space-y-4">
          {loadingCampaigns ? (
            <LoadingSpinner className="py-12" label="Chargement..." size="md" />
          ) : campaigns.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-200">
              <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Megaphone size={30} className="text-indigo-300" />
              </div>
              <h3 className="text-lg font-bold text-slate-700">Aucune campagne</h3>
              <p className="text-slate-400 mt-1 mb-5 text-sm">Créez votre première campagne pour communiquer avec vos clients.</p>
              <button onClick={openNewCamp} disabled={openingCamp} className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-indigo-700 text-sm disabled:opacity-60 flex items-center gap-2 mx-auto">
                {openingCamp && <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
                {openingCamp ? 'Chargement...' : 'Créer une campagne'}
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
                    {c.isScheduled && c.statut === 'BROUILLON' && (
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-200">
                        ⏰ Planifiée {c.scheduledAt ? new Date(c.scheduledAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}
                      </span>
                    )}
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
                    <button onClick={() => openEditCamp(c)} disabled={openingCamp} className="p-2 bg-slate-100 hover:bg-indigo-100 hover:text-indigo-600 text-slate-500 rounded-xl transition-colors disabled:opacity-50" title="Modifier">
                      {openingCamp ? <span className="w-4 h-4 border-2 border-indigo-400/40 border-t-indigo-600 rounded-full animate-spin" /> : <Edit3 size={15} />}
                    </button>
                  )}
                  {c.statut === 'ENVOYE' && (
                    <button onClick={() => { setActiveTab('analytiques'); fetchAnalytics(c._id); }}
                      className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-indigo-50 text-slate-500 hover:text-indigo-700 font-bold rounded-xl text-sm transition-colors" title="Voir les analytics">
                      <BarChart2 size={14} /> Stats
                    </button>
                  )}
                  {c.statut !== 'ENVOYE' && (
                    <button onClick={() => sendCamp(c._id)} disabled={sending === c._id}
                      className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold rounded-xl shadow-md disabled:opacity-60 text-sm">
                      {sending === c._id ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Send size={14} />}
                      {sending === c._id ? 'Envoi...' : 'Envoyer'}
                    </button>
                  )}
                  {c.statut !== 'ENVOYE' && (
                    <button onClick={() => deleteCamp(c._id)} disabled={deletingCamp === c._id} className="p-2 bg-slate-100 hover:bg-rose-100 hover:text-rose-500 text-slate-400 rounded-xl transition-colors disabled:opacity-50" title="Supprimer">
                      {deletingCamp === c._id ? <span className="w-4 h-4 border-2 border-rose-400/40 border-t-rose-500 rounded-full animate-spin" /> : <Trash2 size={15} />}
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
            <LoadingSpinner className="py-12" label="Chargement..." size="md" />
          ) : groupes.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-200">
              <div className="w-16 h-16 bg-teal-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Layers size={30} className="text-teal-300" />
              </div>
              <h3 className="text-lg font-bold text-slate-700">Aucun groupe</h3>
              <p className="text-slate-400 mt-1 mb-5 text-sm">Les groupes permettent de cibler des ensembles précis de clients dans vos campagnes.</p>
              <div className="flex gap-3 flex-wrap justify-center">
                <button onClick={openNewGroupe} disabled={openingGroupe} className="bg-teal-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-teal-700 text-sm disabled:opacity-60 flex items-center gap-2">
                  {openingGroupe && <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
                  {openingGroupe ? 'Chargement...' : 'Créer un groupe'}
                </button>
                <button onClick={generateDefaultGroups} disabled={generatingDefaults}
                  className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-indigo-700 text-sm disabled:opacity-60 flex items-center gap-2">
                  {generatingDefaults ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <Globe size={15} />}
                  {generatingDefaults ? 'Génération...' : 'Générer groupes par défaut'}
                </button>
              </div>
            </div>
          ) : (
            <>
            <div className="flex justify-end mb-3">
              <button onClick={generateDefaultGroups} disabled={generatingDefaults}
                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-700 text-sm font-bold hover:bg-indigo-100 disabled:opacity-60 transition-colors">
                {generatingDefaults ? <span className="w-3.5 h-3.5 border-2 border-indigo-400/40 border-t-indigo-600 rounded-full animate-spin" /> : <Globe size={14} />}
                {generatingDefaults ? 'Génération...' : 'Générer groupes par défaut'}
              </button>
            </div>
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
                      <button onClick={() => openEditGroupe(g)} disabled={openingGroupe} className="p-1.5 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors disabled:opacity-50">
                        {openingGroupe ? <span className="w-3.5 h-3.5 border-2 border-teal-400/40 border-t-teal-600 rounded-full animate-spin" /> : <Edit3 size={14} />}
                      </button>
                      <button onClick={() => deleteGroupe(g._id)} disabled={deletingGroupe === g._id} className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors disabled:opacity-50">
                        {deletingGroupe === g._id ? <span className="w-3.5 h-3.5 border-2 border-rose-400/40 border-t-rose-500 rounded-full animate-spin" /> : <Trash2 size={14} />}
                      </button>
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
            </>
          )}
        </div>
      )}

      {/* ─── ONGLET ANALYTIQUES ──────────────────────────────────────────────── */}
      {activeTab === 'analytiques' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <BarChart2 size={18} className="text-indigo-600" />
            <h2 className="font-bold text-slate-700">Statistiques des campagnes envoyées</h2>
          </div>

          {campaigns.filter(c => c.statut === 'ENVOYE').length === 0 ? (
            <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-200">
              <BarChart2 size={40} className="text-slate-200 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-slate-700">Aucune campagne envoyée</h3>
              <p className="text-slate-400 text-sm mt-1">Les stats apparaîtront ici après l&apos;envoi d&apos;une campagne.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {campaigns.filter(c => c.statut === 'ENVOYE').map(c => (
                <div key={c._id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  {/* Header campagne */}
                  <button
                    className="w-full flex items-center justify-between p-5 text-left hover:bg-slate-50 transition-colors"
                    onClick={() => fetchAnalytics(c._id)}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                        <CheckCircle size={16} />
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-slate-800 truncate">{c.titre}</div>
                        <div className="text-xs text-slate-400">{c.canal === 'SMS' ? '💬 SMS' : '📧 Email'} · {c.nombreDestinataires} destinataires · {c.dateEnvoi ? new Date(c.dateEnvoi).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : ''}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 ml-4">
                      <div className="text-right hidden sm:block">
                        <div className="font-black text-emerald-700">{c.nombreDestinataires ? Math.round((c.nombreEnvoyes / c.nombreDestinataires) * 100) : 0}%</div>
                        <div className="text-xs text-slate-400">délivrance</div>
                      </div>
                      {analyticsId === c._id ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
                    </div>
                  </button>

                  {/* Panel analytics */}
                  {analyticsId === c._id && (
                    <div className="border-t border-slate-100 p-5">
                      {loadingAnalytics ? (
                        <LoadingSpinner className="py-4" label="Chargement des analytics..." size="sm" />
                      ) : analyticsData ? (
                        <div className="space-y-5">
                          {/* KPIs */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                            {[
                              { label: 'Destinataires', value: analyticsData.total, color: 'text-slate-700', bg: 'bg-slate-50' },
                              { label: 'Envoyés', value: analyticsData.sent, color: 'text-emerald-700', bg: 'bg-emerald-50' },
                              { label: 'Échecs', value: analyticsData.failed, color: 'text-rose-700', bg: 'bg-rose-50' },
                              { label: 'Taux délivrance', value: `${analyticsData.deliveryRate}%`, color: 'text-indigo-700', bg: 'bg-indigo-50' },
                            ].map(kpi => (
                              <div key={kpi.label} className={`${kpi.bg} rounded-xl p-3 text-center`}>
                                <div className={`text-2xl font-black ${kpi.color}`}>{kpi.value}</div>
                                <div className="text-xs text-slate-500 mt-0.5">{kpi.label}</div>
                              </div>
                            ))}
                          </div>

                          {/* Barre de progression délivrance */}
                          <div>
                            <div className="flex justify-between text-xs text-slate-500 mb-1">
                              <span>Taux de délivrance</span>
                              <span className="font-bold text-emerald-700">{analyticsData.deliveryRate}%</span>
                            </div>
                            <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                              <div className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full transition-all"
                                style={{ width: `${analyticsData.deliveryRate}%` }} />
                            </div>
                          </div>

                          {/* Erreurs fréquentes */}
                          {analyticsData.failureReasons?.length > 0 && (
                            <div>
                              <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Top erreurs</div>
                              <div className="space-y-1.5">
                                {analyticsData.failureReasons.slice(0, 3).map((r: any, i: number) => (
                                  <div key={i} className="flex items-center justify-between bg-rose-50 px-3 py-2 rounded-lg text-xs">
                                    <span className="text-rose-700 font-medium truncate mr-2">{r.reason}</span>
                                    <span className="text-rose-500 font-bold shrink-0">{r.count}×</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Derniers logs */}
                          {analyticsData.logs?.length > 0 && (
                            <div>
                              <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Derniers envois ({analyticsData.logs.length})</div>
                              <div className="max-h-48 overflow-y-auto space-y-1 border border-slate-100 rounded-xl p-2">
                                {analyticsData.logs.slice(0, 20).map((log: any, i: number) => (
                                  <div key={i} className="flex items-center gap-2 text-xs px-2 py-1.5 rounded-lg hover:bg-slate-50">
                                    <span className={`w-2 h-2 rounded-full shrink-0 ${log.status === 'SENT' ? 'bg-emerald-400' : log.status === 'FAILED' ? 'bg-rose-400' : 'bg-amber-400'}`} />
                                    <span className="text-slate-600 truncate flex-1">{log.email}</span>
                                    <span className={`font-bold shrink-0 ${log.status === 'SENT' ? 'text-emerald-600' : 'text-rose-600'}`}>{log.status}</span>
                                    {log.sentAt && <span className="text-slate-300 shrink-0">{new Date(log.sentAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-slate-400 text-sm text-center py-4">Aucune donnée disponible pour cette campagne.</p>
                      )}
                    </div>
                  )}
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
