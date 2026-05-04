"use client";

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  AlertCircle,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock,
  History,
  Mail,
  PiggyBank,
  RefreshCw,
  Repeat,
  ShieldCheck,
  Users,
  Wallet,
  XCircle,
} from 'lucide-react';
import LoadingSpinner from '@/components/LoadingSpinner';

type Role = 'SUPER_ADMIN' | 'AGENT' | 'ANALYSTE' | 'COMPLIANCE' | 'TONTINE_CLIENT';
type Categorie = 'EPARGNE' | 'CLASSIQUE';
type EcheanceStatut = 'A_PREVOIR' | 'EN_ATTENTE' | 'EN_RETARD' | 'PAYEE' | 'ANNULEE';
type PaymentStatus = 'NONE' | 'PENDING' | 'SUCCESS' | 'FAILED' | 'EXPIRED' | 'CANCELLED';
type ValidationStatus = 'NOT_REQUIRED' | 'PENDING' | 'APPROVED' | 'REJECTED';

interface Offre {
  _id: string;
  nom: string;
  categorie: Categorie;
  description?: string;
  montantCotisation: number;
  frequence: string;
  nombreMembresCible: number;
  montantLot: number;
  nombreTours: number;
  dureeSemaines: number;
  statut: string;
}

interface Echeance {
  _id: string;
  numeroEcheance: number;
  dateEcheance: string;
  montantPrevu: number;
  montantPaye: number;
  statut: EcheanceStatut;
  paymentStatus: PaymentStatus;
  validationStatus: ValidationStatus;
  validationNote?: string;
  validationRequestedAt?: string;
  validatedAt?: string;
  validatedBy?: { name?: string; email?: string } | null;
  paidAt?: string;
  moyenPaiementChoisi: string;
  paygatePaymentReference?: string;
  reminderOneDaySentAt?: string;
  reminderTwoDaysSentAt?: string;
  preuveReference?: string;
  preuveNote?: string;
}

interface Adhesion {
  _id: string;
  statut: string;
  moyenPaiementChoisi: string;
  ordrePassage?: number;
  createdAt: string;
  clientUserId?: {
    name?: string;
    email?: string;
  };
  echeances?: Echeance[];
}

interface Tour {
  _id: string;
  numeroTour: number;
  montantLot: number;
  datePrevue: string;
  statut: string;
  beneficiaireUserId?: {
    name?: string;
    email?: string;
  };
}

interface Payload {
  role: Role;
  offre: Offre;
  adhesions: Adhesion[];
  tours: Tour[];
  monAdhesion: Adhesion | null;
}

function formatCurrency(value?: number) {
  return `${Number(value || 0).toLocaleString('fr-FR')} XOF`;
}

function formatDate(value?: string) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

function getEcheanceBadgeClass(statut: EcheanceStatut) {
  if (statut === 'PAYEE') return 'bg-emerald-100 text-emerald-700';
  if (statut === 'EN_RETARD') return 'bg-red-100 text-red-700';
  if (statut === 'EN_ATTENTE') return 'bg-amber-100 text-amber-700';
  if (statut === 'ANNULEE') return 'bg-slate-200 text-slate-600';
  return 'bg-blue-100 text-blue-700';
}

function getValidationBadgeClass(statut: ValidationStatus) {
  if (statut === 'APPROVED') return 'bg-emerald-100 text-emerald-700';
  if (statut === 'REJECTED') return 'bg-red-100 text-red-700';
  if (statut === 'PENDING') return 'bg-amber-100 text-amber-700';
  return 'bg-slate-100 text-slate-700';
}

export default function TontineOffreDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = String(params?.id || '');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [payload, setPayload] = useState<Payload | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [proofForm, setProofForm] = useState<{ echeanceId: string; adhesionId: string } | null>(null);
  const [proofReference, setProofReference] = useState('');
  const [proofNote, setProofNote] = useState('');

  const loadDetail = async () => {
    const res = await fetch(`/api/tontines/offres/${id}`);
    return res.json();
  };

  useEffect(() => {
    let mounted = true;

    (async () => {
      if (!id) return;
      setLoading(true);
      setError(null);

      try {
        const data = await loadDetail();
        if (!mounted) return;
        if (!data.success) {
          setError(data.error || 'Impossible de charger cette offre.');
        } else {
          setPayload(data.data);
        }
      } catch {
        if (mounted) setError('Erreur réseau.');
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [id]);

  const refresh = async () => {
    const data = await loadDetail();
    if (data.success) {
      setPayload(data.data);
    } else {
      setError(data.error || 'Impossible de recharger les données.');
    }
  };

  const handleDeclare = async (adhesionId: string, echeanceId: string) => {
    if (!proofForm || proofForm.echeanceId !== echeanceId) {
      setProofReference('');
      setProofNote('');
      setProofForm({ echeanceId, adhesionId });
      return;
    }

    if (!proofReference.trim()) {
      setError('La référence de paiement est obligatoire.');
      return;
    }

    setProcessingId(echeanceId);
    setError(null);
    setNotice(null);
    setProofForm(null);

    try {
      const res = await fetch(`/api/tontines/offres/${id}/adhesions/${adhesionId}/echeances/${echeanceId}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          note: 'Paiement déclaré par le client, en attente de validation.',
          preuveReference: proofReference.trim(),
          preuveNote: proofNote.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error || 'Déclaration impossible.');
      } else {
        await refresh();
        setNotice('Déclaration envoyée. Un agent va valider votre paiement.');
      }
    } catch {
      setError('Erreur réseau.');
    }

    setProcessingId(null);
    setProofReference('');
    setProofNote('');
  };

  const handleDecision = async (adhesionId: string, echeanceId: string, action: 'approve' | 'reject') => {
    const note = window.prompt(
      action === 'approve' ? 'Note de validation (optionnel)' : 'Motif du refus (optionnel)',
      action === 'approve' ? 'Échéance validée par un agent.' : 'Demande refusée par un agent.'
    ) || '';

    setProcessingId(echeanceId);
    setError(null);
    setNotice(null);

    try {
      const res = await fetch(`/api/tontines/offres/${id}/adhesions/${adhesionId}/echeances/${echeanceId}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error || 'Action impossible.');
      } else {
        await refresh();
        setNotice(action === 'approve' ? 'Échéance validée.' : 'Échéance refusée.');
      }
    } catch {
      setError('Erreur réseau.');
    }

    setProcessingId(null);
  };

  const clientHistory = useMemo(() => {
    const echeances = payload?.monAdhesion?.echeances || [];
    return [...echeances]
      .filter((item) => item.paymentStatus !== 'NONE' || item.validationStatus !== 'NOT_REQUIRED')
      .sort((a, b) => new Date(b.validationRequestedAt || b.paidAt || b.dateEcheance).getTime() - new Date(a.validationRequestedAt || a.paidAt || a.dateEcheance).getTime());
  }, [payload?.monAdhesion?.echeances]);

  const reminderHistory = useMemo(() => {
    const echeances = payload?.monAdhesion?.echeances || [];
    return echeances.flatMap((item) => {
      const rows: Array<{ key: string; label: string; sentAt: string; numeroEcheance: number }> = [];
      if (item.reminderTwoDaysSentAt) {
        rows.push({ key: `${item._id}-2`, label: 'Rappel envoyé à J-2', sentAt: item.reminderTwoDaysSentAt, numeroEcheance: item.numeroEcheance });
      }
      if (item.reminderOneDaySentAt) {
        rows.push({ key: `${item._id}-1`, label: 'Rappel envoyé à J-1', sentAt: item.reminderOneDaySentAt, numeroEcheance: item.numeroEcheance });
      }
      return rows;
    }).sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime());
  }, [payload?.monAdhesion?.echeances]);

  if (loading) return <LoadingSpinner />;

  if (!payload?.offre) {
    return (
      <div className="min-h-screen bg-slate-50 p-4 md:p-8 pt-20 md:pt-8">
        <button onClick={() => router.push('/tontines')} className="inline-flex items-center gap-2 text-slate-700 hover:text-slate-900">
          <ArrowLeft className="w-4 h-4" />
          Retour
        </button>
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">Offre introuvable.</div>
      </div>
    );
  }

  const { offre, role, adhesions, tours, monAdhesion } = payload;
  const isClient = role === 'TONTINE_CLIENT';
  const clientEcheances = monAdhesion?.echeances || [];
  const nextDue = clientEcheances.find((item) => item.statut !== 'PAYEE' && item.statut !== 'ANNULEE') || null;
  const payees = clientEcheances.filter((item) => item.statut === 'PAYEE').length;
  const pendingValidations = adhesions.flatMap((adhesion) => (adhesion.echeances || []).map((echeance) => ({ adhesion, echeance }))).filter(({ echeance }) => echeance.validationStatus === 'PENDING');

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 pt-20 md:pt-8 space-y-5">
      <button onClick={() => router.push('/tontines')} className="inline-flex items-center gap-2 text-slate-700 hover:text-slate-900">
        <ArrowLeft className="w-4 h-4" />
        Retour
      </button>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700 inline-flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {notice && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-700 inline-flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          {notice}
        </div>
      )}

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{offre.nom}</h1>
            <p className="text-slate-600 mt-1">{offre.description || 'Sans description.'}</p>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
            {offre.categorie === 'CLASSIQUE' ? <Repeat className="w-3.5 h-3.5" /> : <PiggyBank className="w-3.5 h-3.5" />}
            {offre.categorie === 'CLASSIQUE' ? 'Classique' : 'Épargne'}
          </span>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
          <div className="rounded-lg bg-slate-100 p-3">
            <p className="text-slate-500">Cotisation</p>
            <p className="font-semibold text-slate-900">{formatCurrency(offre.montantCotisation)}</p>
          </div>
          <div className="rounded-lg bg-slate-100 p-3">
            <p className="text-slate-500">Fréquence</p>
            <p className="font-semibold text-slate-900">{offre.frequence}</p>
          </div>
          <div className="rounded-lg bg-slate-100 p-3">
            <p className="text-slate-500">Lot / objectif</p>
            <p className="font-semibold text-slate-900">{formatCurrency(offre.montantLot)}</p>
          </div>
          <div className="rounded-lg bg-slate-100 p-3">
            <p className="text-slate-500">Statut</p>
            <p className="font-semibold text-slate-900">{offre.statut}</p>
          </div>
        </div>
      </section>

      {isClient && (
        <>
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
            <h2 className="text-lg font-semibold text-slate-900">Mon suivi détaillé</h2>
            {!monAdhesion && <p className="text-sm text-slate-500">Aucune adhésion active sur cette offre.</p>}
            {monAdhesion && (
              <>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
                  <div className="rounded-lg bg-slate-100 p-3">
                    <p className="text-slate-500">Moyen choisi</p>
                    <p className="font-semibold text-slate-900">{monAdhesion.moyenPaiementChoisi}</p>
                  </div>
                  <div className="rounded-lg bg-slate-100 p-3">
                    <p className="text-slate-500">Échéances réglées</p>
                    <p className="font-semibold text-slate-900">{payees}/{clientEcheances.length}</p>
                  </div>
                  <div className="rounded-lg bg-slate-100 p-3">
                    <p className="text-slate-500">Prochaine échéance</p>
                    <p className="font-semibold text-slate-900">{nextDue ? `#${nextDue.numeroEcheance}` : 'Aucune'}</p>
                    <p className="text-xs text-slate-500">{nextDue ? formatDate(nextDue.dateEcheance) : 'Plan terminé'}</p>
                  </div>
                  <div className="rounded-lg bg-slate-100 p-3">
                    <p className="text-slate-500">Ordre de passage</p>
                    <p className="font-semibold text-slate-900">{typeof monAdhesion.ordrePassage === 'number' ? `#${monAdhesion.ordrePassage}` : '-'}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-slate-900 inline-flex items-center gap-2"><CalendarDays className="w-4 h-4" /> Échéancier complet</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="text-left text-slate-500 border-b border-slate-200">
                          <th className="py-2 pr-3">#</th>
                          <th className="py-2 pr-3">Date</th>
                          <th className="py-2 pr-3">Montant</th>
                          <th className="py-2 pr-3">Statut</th>
                          <th className="py-2 pr-3">Validation</th>
                          <th className="py-2 pr-3">Référence preuve</th>
                          <th className="py-2">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {clientEcheances.map((echeance) => {
                          const isActionable = echeance.statut !== 'PAYEE' && echeance.statut !== 'ANNULEE' && echeance.validationStatus !== 'PENDING' && monAdhesion?.moyenPaiementChoisi !== 'MOBILE_MONEY';
                          const isPendingForm = proofForm?.echeanceId === echeance._id;
                          return (
                            <tr key={echeance._id} className="border-b border-slate-100 last:border-0">
                              <td className="py-3 pr-3 font-semibold text-slate-900">#{echeance.numeroEcheance}</td>
                              <td className="py-3 pr-3 text-slate-700">{formatDate(echeance.dateEcheance)}</td>
                              <td className="py-3 pr-3 text-slate-700">{formatCurrency(echeance.montantPrevu)}</td>
                              <td className="py-3 pr-3">
                                <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${getEcheanceBadgeClass(echeance.statut)}`}>
                                  {echeance.statut}
                                </span>
                              </td>
                              <td className="py-3 pr-3">
                                <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${getValidationBadgeClass(echeance.validationStatus)}`}>
                                  {echeance.validationStatus}
                                </span>
                              </td>
                              <td className="py-3 pr-3 text-slate-600 text-xs">{echeance.preuveReference || '-'}</td>
                              <td className="py-3">
                                {echeance.validationStatus === 'PENDING' && (
                                  <span className="text-xs text-amber-600 font-medium">En attente admin</span>
                                )}
                                {isActionable && (
                                  <button
                                    onClick={() => handleDeclare(monAdhesion!._id, echeance._id)}
                                    disabled={processingId === echeance._id}
                                    className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                                  >
                                    {isPendingForm ? 'Confirmer' : 'Déclarer payé'}
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {proofForm && (
                    <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 space-y-3">
                      <p className="text-sm font-semibold text-blue-800">Déclarer le paiement — Échéance #{clientEcheances.find(e => e._id === proofForm.echeanceId)?.numeroEcheance}</p>
                      <p className="text-xs text-blue-600">Renseignez la référence de votre virement, reçu ou numéro de transaction.</p>
                      <div className="space-y-2">
                        <label className="block text-xs font-semibold text-blue-800">Référence / Numéro de reçu <span className="text-red-500">*</span></label>
                        <input
                          type="text"
                          value={proofReference}
                          onChange={(e) => setProofReference(e.target.value)}
                          placeholder="Ex: TXN-12345, REF-789, VIR-ABC..."
                          className="w-full rounded-lg border border-blue-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="block text-xs font-semibold text-blue-800">Note complémentaire (optionnel)</label>
                        <input
                          type="text"
                          value={proofNote}
                          onChange={(e) => setProofNote(e.target.value)}
                          placeholder="Informations supplémentaires..."
                          className="w-full rounded-lg border border-blue-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleDeclare(proofForm.adhesionId, proofForm.echeanceId)}
                          disabled={!proofReference.trim() || processingId === proofForm.echeanceId}
                          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          {processingId === proofForm.echeanceId ? 'Envoi...' : 'Confirmer la déclaration'}
                        </button>
                        <button
                          onClick={() => { setProofForm(null); setProofReference(''); setProofNote(''); }}
                          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          Annuler
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </section>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
              <h2 className="text-lg font-semibold text-slate-900 inline-flex items-center gap-2"><History className="w-4 h-4" /> Historique des versements</h2>
              {clientHistory.length === 0 && <p className="text-sm text-slate-500">Aucun versement ou demande de validation enregistré pour le moment.</p>}
              {clientHistory.map((item) => (
                <div key={item._id} className="rounded-lg border border-slate-200 p-3 text-sm space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-slate-900">Échéance #{item.numeroEcheance}</p>
                    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${getValidationBadgeClass(item.validationStatus)}`}>
                      {item.validationStatus}
                    </span>
                  </div>
                  <p className="text-slate-700">Montant: {formatCurrency(item.montantPrevu)} • Paiement: {item.paymentStatus}</p>
                  <p className="text-slate-500">Soumis le {formatDate(item.validationRequestedAt || item.paidAt || item.dateEcheance)}</p>
                  {item.preuveReference && <p className="text-blue-700 font-medium">Référence: {item.preuveReference}</p>}
                  {item.validationNote && <p className="text-slate-600">Note: {item.validationNote}</p>}
                </div>
              ))}
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
              <h2 className="text-lg font-semibold text-slate-900 inline-flex items-center gap-2"><Mail className="w-4 h-4" /> Historique des rappels</h2>
              {reminderHistory.length === 0 && <p className="text-sm text-slate-500">Aucun rappel envoyé pour cette tontine pour le moment.</p>}
              {reminderHistory.map((item) => (
                <div key={item.key} className="rounded-lg border border-slate-200 p-3 text-sm">
                  <p className="font-semibold text-slate-900">Échéance #{item.numeroEcheance}</p>
                  <p className="text-slate-700">{item.label}</p>
                  <p className="text-slate-500">Envoyé le {formatDate(item.sentAt)}</p>
                </div>
              ))}
            </section>
          </div>
        </>
      )}

      {!isClient && (
        <>
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
            <h2 className="text-lg font-semibold text-slate-900 inline-flex items-center gap-2"><ShieldCheck className="w-4 h-4" /> Validations en attente</h2>
            {pendingValidations.length === 0 && <p className="text-sm text-slate-500">Aucune échéance non-Mobile Money en attente de validation.</p>}
            {pendingValidations.map(({ adhesion, echeance }) => (
              <div key={echeance._id} className="rounded-lg border border-slate-200 p-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 text-sm">
                <div>
                  <p className="font-semibold text-slate-900">{adhesion.clientUserId?.name || adhesion.clientUserId?.email || 'Client'} • Échéance #{echeance.numeroEcheance}</p>
                  <p className="text-slate-700">Montant: {formatCurrency(echeance.montantPrevu)} • Moyen: {echeance.moyenPaiementChoisi}</p>
                  <p className="text-slate-500">Demandé le {formatDate(echeance.validationRequestedAt || echeance.dateEcheance)}</p>
                  {echeance.preuveReference && (
                    <p className="text-blue-700 font-medium">Référence preuve: {echeance.preuveReference}</p>
                  )}
                  {echeance.preuveNote && (
                    <p className="text-slate-600">Note client: {echeance.preuveNote}</p>
                  )}
                  {echeance.validationNote && !echeance.preuveNote && (
                    <p className="text-slate-600">Note: {echeance.validationNote}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDecision(adhesion._id, echeance._id, 'approve')}
                    disabled={processingId === echeance._id}
                    className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    {processingId === echeance._id ? 'Traitement...' : 'Valider'}
                  </button>
                  <button
                    onClick={() => handleDecision(adhesion._id, echeance._id, 'reject')}
                    disabled={processingId === echeance._id}
                    className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:opacity-60"
                  >
                    <XCircle className="w-4 h-4" />
                    Refuser
                  </button>
                </div>
              </div>
            ))}
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900 mb-3 inline-flex items-center gap-2"><Users className="w-4 h-4" /> Adhésions et échéances</h2>
            <div className="space-y-4">
              {adhesions.length === 0 && <p className="text-sm text-slate-500">Aucune adhésion pour le moment.</p>}
              {adhesions.map((item) => (
                <div key={item._id} className="rounded-lg border border-slate-200 p-4 space-y-3">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 text-sm">
                    <div>
                      <p className="font-semibold text-slate-900">{item.clientUserId?.name || item.clientUserId?.email || 'Client'}</p>
                      <p className="text-slate-600">Paiement: {item.moyenPaiementChoisi}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-slate-800">{item.statut}</p>
                      {typeof item.ordrePassage === 'number' && <p className="text-slate-500">Ordre #{item.ordrePassage}</p>}
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="text-left text-slate-500 border-b border-slate-200">
                          <th className="py-2 pr-3">#</th>
                          <th className="py-2 pr-3">Date</th>
                          <th className="py-2 pr-3">Montant</th>
                          <th className="py-2 pr-3">Statut</th>
                          <th className="py-2 pr-3">Validation</th>
                          <th className="py-2">Suivi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(item.echeances || []).map((echeance) => (
                          <tr key={echeance._id} className="border-b border-slate-100 last:border-0">
                            <td className="py-2 pr-3 font-semibold text-slate-900">#{echeance.numeroEcheance}</td>
                            <td className="py-2 pr-3 text-slate-700">{formatDate(echeance.dateEcheance)}</td>
                            <td className="py-2 pr-3 text-slate-700">{formatCurrency(echeance.montantPrevu)}</td>
                            <td className="py-2 pr-3"><span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${getEcheanceBadgeClass(echeance.statut)}`}>{echeance.statut}</span></td>
                            <td className="py-2 pr-3"><span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${getValidationBadgeClass(echeance.validationStatus)}`}>{echeance.validationStatus}</span></td>
                            <td className="py-2 text-slate-600">{echeance.validationNote || (echeance.validatedBy?.name ? `Traité par ${echeance.validatedBy.name}` : '-')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </>
      )}

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900 mb-3 inline-flex items-center gap-2"><CalendarDays className="w-4 h-4" /> Tours de rotation</h2>
        <div className="space-y-2">
          {tours.length === 0 && (
            <p className="text-sm text-slate-500">Les tours seront planifiés automatiquement dès que la tontine classique est complète.</p>
          )}
          {tours.map((tour) => (
            <div key={tour._id} className="rounded-lg border border-slate-200 p-3 flex flex-col md:flex-row md:items-center md:justify-between gap-2 text-sm">
              <div className="inline-flex items-center gap-2">
                <Wallet className="w-4 h-4 text-slate-500" />
                <span className="font-semibold text-slate-900">Tour #{tour.numeroTour}</span>
                <span className="text-slate-600">{formatCurrency(tour.montantLot)}</span>
              </div>
              <div className="text-slate-700">
                {tour.beneficiaireUserId?.name || tour.beneficiaireUserId?.email || 'Bénéficiaire'} • {formatDate(tour.datePrevue)} • {tour.statut}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}