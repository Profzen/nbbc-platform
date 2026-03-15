"use client";

import { useState, useEffect, useCallback } from 'react';
import {
  Plus, Send, Trash2, Edit3, X, Mail, Users, Clock, CheckCircle,
  AlertCircle, Eye, Copy, Megaphone
} from 'lucide-react';

const CIBLES = [
  { value: 'TOUS', label: 'Tous les clients', desc: 'Envoyer à tous les clients enregistrés' },
  { value: 'PARTICULIER', label: 'Particuliers uniquement', desc: 'Clients de type Particulier' },
  { value: 'ENTREPRISE', label: 'Entreprises uniquement', desc: 'Clients de type Entreprise' },
  { value: 'INVESTISSEUR', label: 'Investisseurs', desc: 'Clients de type Investisseur' },
  { value: 'PARTENAIRE', label: 'Partenaires', desc: 'Clients de type Partenaire' },
];

const TEMPLATES = [
  {
    nom: 'Bienvenue',
    sujet: 'Bienvenue chez NBBC ! 🎉',
    contenu: `<p>Bonjour <strong>{{prenom}}</strong>,</p>
<p>Nous sommes ravis de vous accueillir sur la plateforme NBBC. Votre compte est maintenant actif et prêt à l'emploi.</p>
<p>Nos services incluent :</p>
<ul>
<li>Transferts Zelle, CashApp, Wire et PayPal</li>
<li>Gestion de votre portefeuille crypto</li>
<li>Transferts internationaux en Euro et WISE</li>
</ul>
<p>Pour toute question, notre équipe est à votre disposition.</p>
<p><strong>L'équipe NBBC</strong></p>`
  },
  {
    nom: 'Relance KYC',
    sujet: 'Action requise : Complétez votre vérification d\'identité',
    contenu: `<p>Bonjour <strong>{{prenom}}</strong>,</p>
<p>Afin de vous offrir l'ensemble de nos services, nous avons besoin de vérifier votre identité (KYC).</p>
<p>Cette étape rapide (moins de 5 minutes) vous permettra d'accéder à :</p>
<ul>
<li>Les virements illimités</li>
<li>Les transferts crypto</li>
<li>L'ensemble de nos produits premium</li>
</ul>
<p>Cliquez sur le lien fourni par votre agent pour compléter votre dossier.</p>
<p><strong>L'équipe NBBC</strong></p>`
  },
  {
    nom: 'Information',
    sujet: 'Information importante de NBBC',
    contenu: `<p>Bonjour <strong>{{prenom}}</strong>,</p>
<p>Nous souhaitons vous informer d'une mise à jour importante concernant nos services.</p>
<p>[Saisissez votre message ici]</p>
<p>Merci de votre confiance.</p>
<p><strong>L'équipe NBBC</strong></p>`
  }
];

type ModalMode = 'new' | 'edit' | 'preview' | null;

export default function MarketingPage() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [editTarget, setEditTarget] = useState<any>(null);
  const [sending, setSending] = useState<string | null>(null);
  const [sendResult, setSendResult] = useState<any>(null);
  const [formData, setFormData] = useState({
    titre: '', sujet: '', contenu: '', cible: 'TOUS'
  });

  const fetchCampaigns = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/marketing/campaigns');
    const data = await res.json();
    if (data.success) setCampaigns(data.data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchCampaigns(); }, [fetchCampaigns]);

  const openNew = () => {
    setFormData({ titre: '', sujet: '', contenu: '', cible: 'TOUS' });
    setEditTarget(null);
    setModalMode('new');
  };

  const openEdit = (c: any) => {
    setFormData({ titre: c.titre, sujet: c.sujet, contenu: c.contenu, cible: c.cible });
    setEditTarget(c);
    setModalMode('edit');
  };

  const applyTemplate = (tpl: typeof TEMPLATES[0]) => {
    setFormData(prev => ({ ...prev, sujet: tpl.sujet, contenu: tpl.contenu }));
  };

  const handleSave = async () => {
    const url = editTarget ? `/api/marketing/campaigns/${editTarget._id}` : '/api/marketing/campaigns';
    const method = editTarget ? 'PUT' : 'POST';
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData) });
    const data = await res.json();
    if (data.success) { setModalMode(null); fetchCampaigns(); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cette campagne ?')) return;
    await fetch(`/api/marketing/campaigns/${id}`, { method: 'DELETE' });
    fetchCampaigns();
  };

  const handleSend = async (id: string) => {
    if (!confirm('Envoyer cette campagne maintenant à tous les destinataires ?')) return;
    setSending(id);
    setSendResult(null);
    const res = await fetch(`/api/marketing/campaigns/${id}/send`, { method: 'POST' });
    const data = await res.json();
    setSendResult(data);
    setSending(null);
    fetchCampaigns();
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* MODAL */}
      {(modalMode === 'new' || modalMode === 'edit') && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-600 to-purple-700 px-8 py-5 flex justify-between items-center shrink-0">
              <h2 className="text-white font-bold text-xl">{modalMode === 'new' ? 'Nouvelle Campagne' : 'Modifier la Campagne'}</h2>
              <button onClick={() => setModalMode(null)} className="text-white/60 hover:text-white"><X size={24} /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-5">
              {/* Titre */}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Nom de la campagne *</label>
                <input type="text" value={formData.titre} onChange={e => setFormData({...formData, titre: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-500 text-sm" placeholder="Ex : Newsletter Mars 2026" />
              </div>

              {/* Cible */}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-2 uppercase tracking-wide">Public cible *</label>
                <div className="grid grid-cols-2 gap-2">
                  {CIBLES.map(c => (
                    <label key={c.value} className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${formData.cible === c.value ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 hover:border-indigo-200'}`}>
                      <input type="radio" name="cible" value={c.value} checked={formData.cible === c.value} onChange={() => setFormData({...formData, cible: c.value})} className="mt-0.5 accent-indigo-600" />
                      <div>
                        <div className="font-bold text-slate-700 text-sm">{c.label}</div>
                        <div className="text-xs text-slate-400">{c.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Objet */}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Objet de l'email *</label>
                <input type="text" value={formData.sujet} onChange={e => setFormData({...formData, sujet: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-500 text-sm" placeholder="Ex : Mise à jour de nos services..." />
              </div>

              {/* Templates */}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-2 uppercase tracking-wide">Partir d'un template</label>
                <div className="flex gap-2 flex-wrap">
                  {TEMPLATES.map(tpl => (
                    <button key={tpl.nom} type="button" onClick={() => applyTemplate(tpl)} className="px-3 py-1.5 text-xs font-bold bg-slate-100 hover:bg-indigo-100 hover:text-indigo-700 text-slate-600 rounded-lg transition-colors flex items-center gap-1.5">
                      <Copy size={12} /> {tpl.nom}
                    </button>
                  ))}
                </div>
              </div>

              {/* Contenu */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide">Contenu de l'email * (HTML)</label>
                  <span className="text-xs text-slate-400">Variables : <code className="bg-slate-100 px-1 rounded">{'{{prenom}}'}</code> <code className="bg-slate-100 px-1 rounded">{'{{nom}}'}</code> <code className="bg-slate-100 px-1 rounded">{'{{email}}'}</code></span>
                </div>
                <textarea
                  value={formData.contenu}
                  onChange={e => setFormData({...formData, contenu: e.target.value})}
                  rows={10}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-500 text-sm font-mono resize-none"
                  placeholder="<p>Bonjour {{prenom}},</p>..."
                />
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 flex gap-3 shrink-0 bg-slate-50/50">
              <button onClick={() => setModalMode(null)} className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-100">Annuler</button>
              <button onClick={handleSave} disabled={!formData.titre || !formData.sujet || !formData.contenu} className="flex-1 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold shadow-lg disabled:opacity-50">
                {editTarget ? 'Sauvegarder' : 'Créer la campagne'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Résultat d'envoi */}
      {sendResult && (
        <div className={`fixed bottom-6 right-6 z-50 p-5 rounded-2xl shadow-2xl max-w-sm ${sendResult.success ? 'bg-emerald-50 border border-emerald-200' : 'bg-rose-50 border border-rose-200'}`}>
          <div className="flex justify-between items-start mb-2">
            <h4 className={`font-bold ${sendResult.success ? 'text-emerald-800' : 'text-rose-800'}`}>
              {sendResult.success ? '✅ Campagne envoyée !' : '❌ Erreur d\'envoi'}
            </h4>
            <button onClick={() => setSendResult(null)} className="text-slate-400 hover:text-slate-600 ml-4"><X size={16}/></button>
          </div>
          {sendResult.success && (
            <p className="text-emerald-700 text-sm">
              {sendResult.data?.envoyes} email(s) envoyés • {sendResult.data?.echecs} échec(s) sur {sendResult.data?.total} destinataires.
            </p>
          )}
          {!sendResult.success && <p className="text-rose-600 text-sm">{sendResult.error}</p>}
        </div>
      )}

      {/* HEADER */}
      <header className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Marketing & Campagnes</h1>
          <p className="text-slate-500 mt-1">Créez et envoyez des campagnes email personnalisées à vos clients.</p>
        </div>
        <button onClick={openNew} className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-5 py-2.5 rounded-xl font-medium shadow-md flex items-center gap-2 transition-all hover:scale-105">
          <Plus size={20} /> Nouvelle Campagne
        </button>
      </header>

      {/* Stats rapides */}
      <div className="grid grid-cols-3 gap-5 mb-8">
        {[
          { label: 'Total Campagnes', value: campaigns.length, icon: Megaphone, color: 'from-indigo-500 to-purple-600' },
          { label: 'Envoyées', value: campaigns.filter(c => c.statut === 'ENVOYE').length, icon: CheckCircle, color: 'from-emerald-500 to-teal-600' },
          { label: 'Brouillons', value: campaigns.filter(c => c.statut === 'BROUILLON').length, icon: Edit3, color: 'from-amber-500 to-orange-600' },
        ].map((kpi, i) => {
          const Icon = kpi.icon;
          return (
            <div key={i} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${kpi.color} text-white flex items-center justify-center shadow-lg`}>
                <Icon size={22} />
              </div>
              <div>
                <div className="text-2xl font-black text-slate-800">{kpi.value}</div>
                <div className="text-sm text-slate-500 font-medium">{kpi.label}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Liste campagnes */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-12 text-slate-400">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            Chargement...
          </div>
        ) : campaigns.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-200">
            <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Megaphone size={36} className="text-indigo-300" />
            </div>
            <h3 className="text-lg font-bold text-slate-700">Aucune campagne</h3>
            <p className="text-slate-400 mt-1 mb-5">Créez votre première campagne email pour communiquer avec vos clients.</p>
            <button onClick={openNew} className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-indigo-700">Créer une campagne</button>
          </div>
        ) : campaigns.map(c => (
          <div key={c._id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 hover:shadow-md transition-all">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1 flex-wrap">
                  <h3 className="font-bold text-slate-800 text-lg">{c.titre}</h3>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                    c.statut === 'ENVOYE' ? 'bg-emerald-100 text-emerald-700' :
                    c.statut === 'ECHEC' ? 'bg-rose-100 text-rose-700' :
                    'bg-amber-100 text-amber-700'
                  }`}>
                    {c.statut === 'ENVOYE' ? '✅ Envoyée' : c.statut === 'ECHEC' ? '❌ Erreur' : '✏️ Brouillon'}
                  </span>
                  <span className="text-xs font-semibold px-2 py-1 bg-slate-100 text-slate-600 rounded-full">
                    🎯 {CIBLES.find(t => t.value === c.cible)?.label || c.cible}
                  </span>
                </div>
                <p className="text-slate-500 text-sm mb-3 flex items-center gap-2">
                  <Mail size={14} className="text-slate-400" /> {c.sujet}
                </p>

                {c.statut === 'ENVOYE' && (
                  <div className="flex gap-5 text-sm">
                    <div className="flex items-center gap-1.5 text-slate-500">
                      <Users size={14} className="text-slate-400" />
                      <span className="font-bold text-slate-700">{c.nombreDestinataires}</span> destinataires
                    </div>
                    <div className="flex items-center gap-1.5 text-emerald-600">
                      <CheckCircle size={14} />
                      <span className="font-bold">{c.nombreEnvoyes}</span> envoyés
                    </div>
                    {c.nombreEchecs > 0 && (
                      <div className="flex items-center gap-1.5 text-rose-500">
                        <AlertCircle size={14} />
                        <span className="font-bold">{c.nombreEchecs}</span> échecs
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 text-slate-400">
                      <Clock size={14} />
                      {c.dateEnvoi ? new Date(c.dateEnvoi).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {c.statut !== 'ENVOYE' && (
                  <button onClick={() => openEdit(c)} className="p-2.5 bg-slate-100 hover:bg-indigo-100 hover:text-indigo-600 text-slate-500 rounded-xl transition-colors">
                    <Edit3 size={16} />
                  </button>
                )}
                {c.statut !== 'ENVOYE' && (
                  <button
                    onClick={() => handleSend(c._id)}
                    disabled={sending === c._id}
                    className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold rounded-xl shadow-md shadow-indigo-500/30 disabled:opacity-60 transition-all text-sm"
                  >
                    {sending === c._id ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : <Send size={16} />}
                    {sending === c._id ? 'Envoi...' : 'Envoyer'}
                  </button>
                )}
                {c.statut !== 'ENVOYE' && (
                  <button onClick={() => handleDelete(c._id)} className="p-2.5 bg-slate-100 hover:bg-rose-100 hover:text-rose-500 text-slate-400 rounded-xl transition-colors">
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
