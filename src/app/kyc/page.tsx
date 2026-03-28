"use client";

import { useState, useEffect, useCallback } from 'react';
import { ShieldCheck, Clock, XCircle, Eye, Check, X, Link2, Copy, CheckCheck, FileText } from 'lucide-react';
import { generateKycPdf } from '@/lib/pdf-generator';

type TabType = 'EN_ATTENTE' | 'VALIDE' | 'REJETE';

export default function KycAdminPage() {
  const [activeTab, setActiveTab] = useState<TabType>('EN_ATTENTE');
  const [requests, setRequests] = useState<any[]>([]);
  const [counts, setCounts] = useState({ EN_ATTENTE: 0, VALIDE: 0, REJETE: 0 });
  const [loading, setLoading] = useState(true);
  const [selectedReq, setSelectedReq] = useState<any>(null);
  const [rejectNote, setRejectNote] = useState('');
  const [imageModal, setImageModal] = useState<string | null>(null);
  const [generatedLink, setGeneratedLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/kyc/requests?statut=${activeTab}`);
    const data = await res.json();
    if (data.success) { setRequests(data.data); setCounts(data.counts); }
    setLoading(false);
  }, [activeTab]);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  const generateLink = async (clientId?: string) => {
    const res = await fetch('/api/kyc/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId })
    });
    const data = await res.json();
    if (data.success) { setGeneratedLink(data.link); }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(generatedLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDecision = async (id: string, statutKyc: string, notesAdmin?: string) => {
    setActionLoading(true);
    await fetch(`/api/kyc/requests/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ statutKyc, notesAdmin })
    });
    setSelectedReq(null);
    fetchRequests();
    setActionLoading(false);
  };

  const tabs = [
    { key: 'EN_ATTENTE', label: 'En attente', count: counts.EN_ATTENTE, icon: Clock, color: 'amber' },
    { key: 'VALIDE', label: 'Validés', count: counts.VALIDE, icon: ShieldCheck, color: 'emerald' },
    { key: 'REJETE', label: 'Rejetés', count: counts.REJETE, icon: XCircle, color: 'rose' },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Image Modal */}
      {imageModal && (
        <div onClick={() => setImageModal(null)} className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 cursor-zoom-out">
          <img src={imageModal} alt="Document" className="max-h-[90vh] max-w-[90vw] object-contain rounded-2xl shadow-2xl" onClick={e => e.stopPropagation()} />
        </div>
      )}

      <header className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center mb-6 sm:mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Vérification KYC</h1>
          <p className="text-slate-500 mt-1">Validez les demandes d'identité reçues depuis les liens envoyés aux clients.</p>
        </div>
        <button
          onClick={() => generateLink()}
          className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-5 py-2.5 rounded-xl font-medium shadow-md flex items-center gap-2"
        >
          <Link2 size={18} /> Générer un lien KYC
        </button>
      </header>

      {/* Lien généré */}
      {generatedLink && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-2xl flex items-center gap-4">
          <div className="flex-1 overflow-hidden">
            <p className="text-xs font-bold text-blue-600 mb-1 uppercase">Lien KYC généré — À envoyer au client</p>
            <p className="text-slate-700 text-sm font-mono truncate bg-white px-3 py-2 rounded-lg border border-blue-100">{generatedLink}</p>
          </div>
          <button onClick={copyLink} className={`shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-colors ${copied ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>
            {copied ? <><CheckCheck size={16}/>Copié !</> : <><Copy size={16}/>Copier</>}
          </button>
        </div>
      )}

      {/* Onglets */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as TabType)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${isActive ? `bg-${tab.color}-100 text-${tab.color}-700 shadow-sm` : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
            >
              <Icon size={16} />
              {tab.label}
              <span className={`px-2 py-0.5 rounded-full text-xs ${isActive ? `bg-${tab.color}-200` : 'bg-slate-200'}`}>
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Liste + Détail */}
      <div className="flex flex-col xl:flex-row gap-6">
        {/* Liste des demandes */}
        <div className="flex-1 space-y-3">
          {loading ? (
            <div className="text-center py-12 text-slate-400">Chargement...</div>
          ) : requests.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
              <p className="text-slate-400 font-medium">Aucune demande {activeTab === 'EN_ATTENTE' ? 'en attente' : activeTab === 'VALIDE' ? 'validée' : 'rejetée'}</p>
            </div>
          ) : requests.map(req => (
            <div
              key={req._id}
              onClick={() => setSelectedReq(req)}
              className={`bg-white p-5 rounded-2xl border cursor-pointer transition-all hover:shadow-md ${selectedReq?._id === req._id ? 'border-blue-400 shadow-md shadow-blue-100' : 'border-slate-200'}`}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4 min-w-0">
                  {req.selfieUrl ? (
                    <img src={req.selfieUrl} alt="Selfie" className="w-12 h-12 rounded-full object-cover border-2 border-slate-200" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 font-bold text-sm">
                      {req.prenom?.[0]}{req.nom?.[0]}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="font-bold text-slate-800 truncate">{req.prenom} {req.nom}</p>
                    <p className="text-sm text-slate-500 truncate">{req.email}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{req.dateSubmission ? new Date(req.dateSubmission).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}</p>
                  </div>
                </div>
                <div className="text-left sm:text-right">
                  {req.photoIdUrl && (
                    <button onClick={e => { e.stopPropagation(); setImageModal(req.photoIdUrl); }} className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1">
                      <Eye size={14} /> Voir ID
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Panneau de décision */}
        {selectedReq && (
          <div className="w-full xl:w-96 shrink-0 bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-6 h-fit xl:sticky xl:top-4">
            <h3 className="font-bold text-slate-800 text-lg mb-4">Dossier KYC</h3>

            <div className="flex gap-3 mb-5">
              {selectedReq.photoIdUrl && (
                <div className="flex-1">
                  <p className="text-xs font-bold text-slate-500 mb-1.5 uppercase">Pièce d'identité</p>
                  <div className="relative group">
                    <img src={selectedReq.photoIdUrl} alt="ID" className="w-full h-28 object-cover rounded-xl border border-slate-200" />
                    <button onClick={() => setImageModal(selectedReq.photoIdUrl)} className="absolute inset-0 bg-black/0 group-hover:bg-black/40 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                      <Eye className="text-white" size={24} />
                    </button>
                  </div>
                </div>
              )}
              {selectedReq.selfieUrl && (
                <div className="flex-1">
                  <p className="text-xs font-bold text-slate-500 mb-1.5 uppercase">Selfie</p>
                  <div className="relative group">
                    <img src={selectedReq.selfieUrl} alt="Selfie" className="w-full h-28 object-cover rounded-xl border border-slate-200" />
                    <button onClick={() => setImageModal(selectedReq.selfieUrl)} className="absolute inset-0 bg-black/0 group-hover:bg-black/40 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                      <Eye className="text-white" size={24} />
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2 text-sm mb-5">
              {[['Nom complet', `${selectedReq.prenom} ${selectedReq.nom}`], ['Email', selectedReq.email], ['Téléphone', selectedReq.telephone || '-']].map(([label, value]) => (
                <div key={label} className="flex justify-between py-2 border-b border-slate-50">
                  <span className="text-slate-500 font-medium">{label}</span>
                  <span className="font-bold text-slate-700">{value}</span>
                </div>
              ))}
            </div>

            <button
              onClick={() => generateKycPdf(selectedReq)}
              className="w-full mb-6 flex items-center justify-center gap-2 py-3 rounded-xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-50 transition-all shadow-sm"
            >
              <FileText size={18} className="text-blue-600" />
              Télécharger l'attestation KYC (PDF)
            </button>
            <p className="text-xs text-slate-500 -mt-4 mb-5">
              Ce PDF est un récapitulatif du dossier (identité, statut et dates), pas une copie de la pièce d'identité.
            </p>

            {activeTab === 'EN_ATTENTE' && (
              <>
                <textarea
                  placeholder="Note de l'admin (optionnel, affiché si rejeté)..."
                  value={rejectNote}
                  onChange={e => setRejectNote(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm bg-slate-50 focus:bg-white focus:border-blue-500 mb-4 resize-none"
                  rows={3}
                />
                <div className="grid grid-cols-2 gap-3">
                  <button disabled={actionLoading} onClick={() => handleDecision(selectedReq._id, 'REJETE', rejectNote)} className="flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-rose-200 text-rose-600 font-bold hover:bg-rose-50 transition-colors disabled:opacity-50">
                    <X size={18} /> Rejeter
                  </button>
                  <button disabled={actionLoading} onClick={() => handleDecision(selectedReq._id, 'VALIDE')} className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-colors disabled:opacity-50">
                    <Check size={18} /> Valider
                  </button>
                </div>
              </>
            )}

            {activeTab === 'REJETE' && selectedReq.notesAdmin && (
              <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl">
                <p className="text-xs font-bold text-rose-600 mb-1">Motif du rejet :</p>
                <p className="text-sm text-slate-600">{selectedReq.notesAdmin}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
