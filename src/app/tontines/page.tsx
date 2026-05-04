"use client";

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  PiggyBank,
  Plus,
  RefreshCw,
  Repeat,
  Trophy,
  Users,
  Wallet,
} from 'lucide-react';
import LoadingSpinner from '@/components/LoadingSpinner';

type Role = 'SUPER_ADMIN' | 'AGENT' | 'ANALYSTE' | 'COMPLIANCE' | 'TONTINE_CLIENT';
type Categorie = 'EPARGNE' | 'CLASSIQUE';
type Statut = 'BROUILLON' | 'OUVERTE' | 'COMPLETE' | 'EN_COURS' | 'SUSPENDUE' | 'CLOTUREE';
type Moyen = 'CRYPTO' | 'MOBILE_MONEY' | 'CARTE' | 'BANQUE' | 'MANUEL';
type EcheanceStatut = 'A_PREVOIR' | 'EN_ATTENTE' | 'EN_RETARD' | 'PAYEE' | 'ANNULEE';
type PaymentStatus = 'NONE' | 'PENDING' | 'SUCCESS' | 'FAILED' | 'EXPIRED' | 'CANCELLED';

interface Offre {
  _id: string;
  nom: string;
  categorie: Categorie;
  description?: string;
  montantCotisation: number;
  frequence: 'HEBDOMADAIRE' | 'BI_HEBDOMADAIRE' | 'MENSUELLE';
  nombreMembresCible: number;
  moyensPaiementAcceptes: Moyen[];
  montantLot: number;
  nombreTours: number;
  dureeSemaines: number;
  statut: Statut;
  nbAdherents?: number;
  nbAdhesionsValidees?: number;
  placesRestantes?: number;
}

interface MonTour {
  _id: string;
  numeroTour: number;
  datePrevue: string;
  statut: 'PLANIFIE' | 'PAYE' | 'REPORTE' | 'ANNULE';
  montantLot: number;
}

interface Echeance {
  _id: string;
  numeroEcheance: number;
  dateEcheance: string;
  montantPrevu: number;
  montantPaye: number;
  statut: EcheanceStatut;
  paymentStatus: PaymentStatus;
  moyenPaiementChoisi: Moyen;
  validationStatus?: 'NOT_REQUIRED' | 'PENDING' | 'APPROVED' | 'REJECTED';
  validationNote?: string;
  paygatePaymentReference?: string;
  paidAt?: string;
}

interface Adhesion {
  _id: string;
  offreId: Offre;
  statut: 'EN_ATTENTE' | 'VALIDEE' | 'REFUSEE' | 'RETIREE';
  moyenPaiementChoisi: Moyen;
  ordrePassage?: number;
  createdAt: string;
  monTour?: MonTour | null;
  echeances?: Echeance[];
}

interface ApiResponse {
  role: Role;
  offres: Offre[];
  mesAdhesions?: Adhesion[];
}

const FREQUENCE_LABEL: Record<Offre['frequence'], string> = {
  HEBDOMADAIRE: 'Hebdomadaire',
  BI_HEBDOMADAIRE: 'Chaque 2 semaines',
  MENSUELLE: 'Mensuelle',
};

const STATUT_LABEL: Record<Statut, string> = {
  BROUILLON: 'Brouillon',
  OUVERTE: 'Ouverte',
  COMPLETE: 'Complète',
  EN_COURS: 'En cours',
  SUSPENDUE: 'Suspendue',
  CLOTUREE: 'Clôturée',
};

const ECHEANCE_STATUT_LABEL: Record<EcheanceStatut, string> = {
  A_PREVOIR: 'À venir',
  EN_ATTENTE: 'À payer',
  EN_RETARD: 'En retard',
  PAYEE: 'Payée',
  ANNULEE: 'Annulée',
};

const TOUR_STATUT_LABEL: Record<string, string> = {
  PLANIFIE: 'Planifié',
  PAYE: 'Payé',
  REPORTE: 'Reporté',
  ANNULE: 'Annulé',
};

const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  NONE: 'Aucun paiement lancé',
  PENDING: 'Paiement en attente',
  SUCCESS: 'Paiement confirmé',
  FAILED: 'Paiement échoué',
  EXPIRED: 'Paiement expiré',
  CANCELLED: 'Paiement annulé',
};

const MOYENS: Moyen[] = ['MANUEL', 'MOBILE_MONEY', 'BANQUE', 'CARTE', 'CRYPTO'];
const PAYMENT_NETWORKS = ['FLOOZ', 'TMONEY'] as const;

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

export default function TontinesPage() {
  const router = useRouter();
  const [payload, setPayload] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [payingEcheanceId, setPayingEcheanceId] = useState<string | null>(null);
  const [verifyingEcheanceId, setVerifyingEcheanceId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [openAdhesionId, setOpenAdhesionId] = useState<string | null>(null);
  const [selectedMoyens, setSelectedMoyens] = useState<Record<string, Moyen>>({});
  const [selectedNetworks, setSelectedNetworks] = useState<Record<string, string>>({});

  const loadTontines = async () => {
    const res = await fetch('/api/tontines');
    return res.json();
  };

  useEffect(() => {
    let mounted = true;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await loadTontines();
        if (!mounted) return;
        if (!data.success) {
          setError(data.error || 'Impossible de charger les tontines.');
        } else {
          setPayload(data.data as ApiResponse);
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
  }, []);

  const role = payload?.role;
  const isClient = role === 'TONTINE_CLIENT';

  const adheredOfferIds = useMemo(() => {
    const set = new Set<string>();
    for (const adhesion of payload?.mesAdhesions || []) {
      set.add(String(adhesion.offreId?._id || ''));
    }
    return set;
  }, [payload?.mesAdhesions]);

  const offresDisponibles = useMemo(() => {
    const all = payload?.offres || [];
    if (!isClient) return all;
    return all.filter((offre) => !adheredOfferIds.has(offre._id) && (offre.statut === 'OUVERTE' || offre.statut === 'EN_COURS'));
  }, [payload?.offres, isClient, adheredOfferIds]);

  const refreshPayload = async () => {
    const refreshed = await loadTontines();
    if (refreshed.success) {
      setPayload(refreshed.data as ApiResponse);
    } else {
      setError(refreshed.error || 'Impossible de recharger les données.');
    }
  };

  const handleJoin = async (offre: Offre) => {
    const moyen = selectedMoyens[offre._id] || offre.moyensPaiementAcceptes?.[0] || 'MANUEL';
    const paymentNetwork = selectedNetworks[offre._id] || 'FLOOZ';
    setJoiningId(offre._id);
    setError(null);
    setNotice(null);

    try {
      const res = await fetch(`/api/tontines/offres/${offre._id}/adhesions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ moyenPaiementChoisi: moyen, paymentNetwork }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error || 'Adhésion impossible.');
      } else {
        await refreshPayload();
        setNotice(`Adhésion enregistrée à ${offre.nom}. Vos échéances sont maintenant disponibles.`);
      }
    } catch {
      setError("Erreur réseau pendant l'adhésion.");
    }

    setJoiningId(null);
  };

  const handlePayEcheance = async (offreId: string, adhesionId: string, echeanceId: string) => {
    setPayingEcheanceId(echeanceId);
    setError(null);
    setNotice(null);

    try {
      const res = await fetch(`/api/tontines/offres/${offreId}/adhesions/${adhesionId}/echeances/${echeanceId}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error || 'Paiement impossible.');
      } else {
        const redirectUrl = data?.data?.payment?.redirectUrl;
        if (redirectUrl) {
          window.location.href = redirectUrl;
          return;
        }

        await refreshPayload();
        setNotice('Échéance mise à jour avec succès.');
      }
    } catch {
      setError('Erreur réseau pendant le traitement du paiement.');
    }

    setPayingEcheanceId(null);
  };

  const verifyEcheancePayment = async (offreId: string, adhesionId: string, echeanceId: string) => {
    setVerifyingEcheanceId(echeanceId);
    setError(null);
    setNotice(null);

    try {
      const res = await fetch(`/api/tontines/offres/${offreId}/adhesions/${adhesionId}/echeances/${echeanceId}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error || 'Vérification impossible.');
      } else {
        await refreshPayload();
        setNotice('Statut de paiement actualisé.');
      }
    } catch {
      setError('Erreur réseau pendant la vérification du paiement.');
    }

    setVerifyingEcheanceId(null);
  };

  const handleDelete = async (offre: Offre) => {
    if (!confirm(`Supprimer l'offre "${offre.nom}" ? Cette action supprimera aussi toutes les adhésions, échéances et tours associés.`)) return;

    setDeletingId(offre._id);
    setError(null);

    try {
      const res = await fetch(`/api/tontines/offres/${offre._id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!data.success) {
        setError(data.error || 'Suppression impossible.');
      } else {
        await refreshPayload();
      }
    } catch {
      setError('Erreur réseau pendant la suppression.');
    }

    setDeletingId(null);
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 pt-20 md:pt-8 space-y-6">
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Tontines</h1>
          <p className="text-slate-600 mt-1">
            {isClient
              ? 'Vous adhérez sans payer immédiatement. Chaque tontine ouvre ensuite un vrai suivi avec échéancier, statut et actions par échéance.'
              : 'Créez et pilotez les deux modèles de tontine en parallèle.'}
          </p>
        </div>
        {!isClient && (
          <button
            onClick={() => router.push('/tontines/nouveau')}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-white font-semibold hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            Nouvelle offre
          </button>
        )}
      </header>

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

      {isClient && (
        <section className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-cyan-50 p-5 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">Nouveau flux client</h2>
          <p className="mt-1 text-sm text-slate-700">
            1) Vous adhérez à la tontine, 2) l'échéancier se crée automatiquement, 3) vous payez chaque échéance au moment voulu, 4) vous recevez des rappels email avant les dates limites.
          </p>
        </section>
      )}

      {isClient && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-slate-900">Mes Tontines</h2>
            <span className="text-sm text-slate-500">{(payload?.mesAdhesions || []).length} adhésion(s)</span>
          </div>

          {(payload?.mesAdhesions || []).length === 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500">
              Vous n'avez pas encore adhéré à une tontine. Choisissez une offre ci-dessous.
            </div>
          )}

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {(payload?.mesAdhesions || []).map((adhesion) => {
              const offre = adhesion.offreId;
              const echeances = adhesion.echeances || [];
              const payees = echeances.filter((item) => item.statut === 'PAYEE').length;
              const enRetard = echeances.filter((item) => item.statut === 'EN_RETARD').length;
              const prochaineEcheance = echeances.find((item) => item.statut !== 'PAYEE' && item.statut !== 'ANNULEE') || null;
              const open = openAdhesionId === adhesion._id;

              return (
                <article key={adhesion._id} className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                  <div className="px-4 py-4 border-b border-slate-200 flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                            {offre?.categorie === 'CLASSIQUE' ? <Repeat className="w-3 h-3" /> : <PiggyBank className="w-3 h-3" />}
                            {offre?.categorie === 'CLASSIQUE' ? 'Classique' : 'Épargne'}
                          </span>
                          <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                            <Wallet className="w-3 h-3" />
                            {adhesion.moyenPaiementChoisi}
                          </span>
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 mt-2 truncate">{offre?.nom || 'Offre supprimée'}</h3>
                        <p className="text-sm text-slate-600 mt-1">{offre?.description || 'Suivi détaillé de vos cotisations et échéances.'}</p>
                      </div>
                      <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${enRetard > 0 ? 'bg-red-100 text-red-700' : payees === echeances.length && echeances.length > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                        {enRetard > 0 ? <AlertCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                        {enRetard > 0 ? `${enRetard} en retard` : payees === echeances.length && echeances.length > 0 ? 'Plan terminé' : 'Suivi actif'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                      <div className="rounded-lg bg-slate-50 p-3">
                        <p className="text-slate-500 text-xs">Cotisation</p>
                        <p className="font-semibold text-slate-900">{formatCurrency(offre?.montantCotisation)}</p>
                        <p className="text-xs text-slate-400">{offre?.frequence ? FREQUENCE_LABEL[offre.frequence] : ''}</p>
                      </div>
                      <div className="rounded-lg bg-slate-50 p-3">
                        <p className="text-slate-500 text-xs">Échéances payées</p>
                        <p className="font-semibold text-slate-900">{payees}/{echeances.length}</p>
                        <p className="text-xs text-slate-400">{formatCurrency(payees * Number(offre?.montantCotisation || 0))}</p>
                      </div>
                      <div className="rounded-lg bg-slate-50 p-3">
                        <p className="text-slate-500 text-xs">Prochaine échéance</p>
                        <p className="font-semibold text-slate-900">{prochaineEcheance ? `#${prochaineEcheance.numeroEcheance}` : 'Aucune'}</p>
                        <p className="text-xs text-slate-400">{prochaineEcheance ? formatDate(prochaineEcheance.dateEcheance) : 'Plan complété'}</p>
                      </div>
                      <div className="rounded-lg bg-slate-50 p-3">
                        <p className="text-slate-500 text-xs">Lot / objectif</p>
                        <p className="font-semibold text-slate-900">{formatCurrency(offre?.montantLot)}</p>
                        {adhesion.ordrePassage ? <p className="text-xs text-slate-400">Passage #{adhesion.ordrePassage}</p> : <p className="text-xs text-slate-400">Adhésion {formatDate(adhesion.createdAt)}</p>}
                      </div>
                    </div>

                    {adhesion.monTour && (
                      <div className="rounded-lg bg-indigo-50 border border-indigo-100 px-3 py-2 text-sm">
                        <p className="text-xs font-semibold text-indigo-600 mb-1 flex items-center gap-1">
                          <Trophy className="w-3 h-3" /> Mon tour programmé
                        </p>
                        <p className="text-slate-700 font-medium">Tour #{adhesion.monTour.numeroTour} — {formatCurrency(adhesion.monTour.montantLot)}</p>
                        <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                          <Calendar className="w-3 h-3" />
                          Prévu le {formatDate(adhesion.monTour.datePrevue)} · {TOUR_STATUT_LABEL[adhesion.monTour.statut] || adhesion.monTour.statut}
                        </p>
                      </div>
                    )}

                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs text-slate-400">Adhésion enregistrée le {formatDate(adhesion.createdAt)}</p>
                      <button
                        onClick={() => setOpenAdhesionId((prev) => (prev === adhesion._id ? null : adhesion._id))}
                        className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
                      >
                        {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        {open ? 'Masquer le suivi' : 'Ouvrir le suivi'}
                      </button>
                    </div>
                  </div>

                  {open && (
                    <div className="p-4 space-y-4">
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                          <thead>
                            <tr className="text-left text-slate-500 border-b border-slate-200">
                              <th className="py-2 pr-3 font-medium">Échéance</th>
                              <th className="py-2 pr-3 font-medium">Date</th>
                              <th className="py-2 pr-3 font-medium">Montant</th>
                              <th className="py-2 pr-3 font-medium">Statut</th>
                              <th className="py-2 pr-3 font-medium">Paiement</th>
                              <th className="py-2 font-medium">Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {echeances.map((echeance) => {
                              const isPending = echeance.paymentStatus === 'PENDING';
                              const isRetryable = ['FAILED', 'EXPIRED', 'CANCELLED'].includes(echeance.paymentStatus);
                              const isPaid = echeance.statut === 'PAYEE';
                              const isMobileMoney = echeance.moyenPaiementChoisi === 'MOBILE_MONEY';
                              const isWaitingAdmin = !isMobileMoney && echeance.validationStatus === 'PENDING';

                              return (
                                <tr key={echeance._id} className="border-b border-slate-100 last:border-0 align-top">
                                  <td className="py-3 pr-3">
                                    <div className="font-semibold text-slate-900">#{echeance.numeroEcheance}</div>
                                    <div className="text-xs text-slate-500">{isMobileMoney ? 'Paiement en ligne' : 'Paiement déclaré'}</div>
                                  </td>
                                  <td className="py-3 pr-3 text-slate-700">{formatDate(echeance.dateEcheance)}</td>
                                  <td className="py-3 pr-3 text-slate-700">
                                    {formatCurrency(echeance.montantPrevu)}
                                    {isPaid && (
                                      <div className="text-xs text-slate-500">Payée le {formatDate(echeance.paidAt)}</div>
                                    )}
                                  </td>
                                  <td className="py-3 pr-3">
                                    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${getEcheanceBadgeClass(echeance.statut)}`}>
                                      {ECHEANCE_STATUT_LABEL[echeance.statut]}
                                    </span>
                                  </td>
                                  <td className="py-3 pr-3">
                                    <div className="text-slate-700">{isWaitingAdmin ? 'En attente de validation agent' : PAYMENT_STATUS_LABEL[echeance.paymentStatus]}</div>
                                    {echeance.paygatePaymentReference && (
                                      <div className="text-xs text-slate-500">Réf: {echeance.paygatePaymentReference}</div>
                                    )}
                                    {echeance.validationNote && (
                                      <div className="text-xs text-slate-500">{echeance.validationNote}</div>
                                    )}
                                  </td>
                                  <td className="py-3">
                                    {isPaid ? (
                                      <span className="inline-flex items-center gap-1 text-emerald-700 text-sm font-semibold">
                                        <CheckCircle2 className="w-4 h-4" /> Réglée
                                      </span>
                                    ) : isPending && isMobileMoney ? (
                                      <button
                                        onClick={() => verifyEcheancePayment(String(offre?._id || ''), adhesion._id, echeance._id)}
                                        disabled={verifyingEcheanceId === echeance._id}
                                        className="rounded-lg border border-blue-300 bg-white px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-60"
                                      >
                                        {verifyingEcheanceId === echeance._id ? 'Vérification...' : 'Vérifier'}
                                      </button>
                                    ) : isWaitingAdmin ? (
                                      <span className="inline-flex items-center gap-1 text-amber-700 text-sm font-semibold">
                                        <Clock className="w-4 h-4" /> Validation agent
                                      </span>
                                    ) : (
                                      <button
                                        onClick={() => handlePayEcheance(String(offre?._id || ''), adhesion._id, echeance._id)}
                                        disabled={payingEcheanceId === echeance._id}
                                        className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 text-white px-3 py-2 text-sm font-semibold hover:bg-emerald-700 disabled:opacity-60"
                                      >
                                        {isRetryable && <RefreshCw className="w-4 h-4" />}
                                        {payingEcheanceId === echeance._id
                                          ? 'Traitement...'
                                          : isRetryable
                                            ? 'Retenter'
                                            : echeance.statut === 'A_PREVOIR'
                                              ? 'Payer en avance'
                                              : isMobileMoney
                                                ? 'Payer'
                                                : 'Déclarer payé'}
                                      </button>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </section>
      )}

      <section className="space-y-3">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-2">
          <h2 className="text-xl font-semibold text-slate-900">
            {isClient ? 'Choisissez une tontine' : 'Catalogue des offres'}
          </h2>
          {isClient && (
            <p className="text-sm text-slate-500">
              L'adhésion crée votre plan de cotisation. Le moyen choisi ci-dessous sera appliqué par défaut à vos prochaines échéances.
            </p>
          )}
        </div>

        {offresDisponibles.length === 0 && (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500">
            Aucune offre disponible pour le moment.
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {offresDisponibles.map((offre) => {
            const isClassique = offre.categorie === 'CLASSIQUE';
            const moyens = offre.moyensPaiementAcceptes?.length ? offre.moyensPaiementAcceptes : MOYENS;
            const selected = selectedMoyens[offre._id] || moyens[0];
            const selectedNetwork = selectedNetworks[offre._id] || 'FLOOZ';

            return (
              <article key={offre._id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">{offre.nom}</h3>
                    <p className="text-sm text-slate-600 mt-1">{offre.description || 'Sans description.'}</p>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                    {isClassique ? <Repeat className="w-3.5 h-3.5" /> : <PiggyBank className="w-3.5 h-3.5" />}
                    {isClassique ? 'Classique' : 'Épargne'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-lg bg-slate-100 p-3">
                    <p className="text-slate-500">Cotisation</p>
                    <p className="font-semibold text-slate-900">{formatCurrency(offre.montantCotisation)}</p>
                  </div>
                  <div className="rounded-lg bg-slate-100 p-3">
                    <p className="text-slate-500">Fréquence</p>
                    <p className="font-semibold text-slate-900">{FREQUENCE_LABEL[offre.frequence]}</p>
                  </div>
                  <div className="rounded-lg bg-slate-100 p-3">
                    <p className="text-slate-500">Participants</p>
                    <p className="font-semibold text-slate-900 inline-flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" />
                      {offre.nbAdhesionsValidees || 0}/{offre.nombreMembresCible}
                    </p>
                  </div>
                  <div className="rounded-lg bg-slate-100 p-3">
                    <p className="text-slate-500">Lot/Tour</p>
                    <p className="font-semibold text-slate-900">{formatCurrency(offre.montantLot)}</p>
                  </div>
                </div>

                <div className="text-xs text-slate-600">
                  Statut: <span className="font-semibold">{STATUT_LABEL[offre.statut]}</span> • Tours: {offre.nombreTours} • Durée estimée: {offre.dureeSemaines} semaines
                </div>

                {isClient && (
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-slate-700">Moyen de paiement par défaut</label>
                    <select
                      value={selected}
                      onChange={(e) =>
                        setSelectedMoyens((prev) => ({ ...prev, [offre._id]: e.target.value as Moyen }))
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    >
                      {moyens.map((m) => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                    {selected === 'MOBILE_MONEY' && (
                      <>
                        <label className="block text-sm font-medium text-slate-700">Opérateur mobile money</label>
                        <select
                          value={selectedNetwork}
                          onChange={(e) =>
                            setSelectedNetworks((prev) => ({ ...prev, [offre._id]: e.target.value }))
                          }
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                        >
                          {PAYMENT_NETWORKS.map((network) => (
                            <option key={network} value={network}>{network}</option>
                          ))}
                        </select>
                        <p className="text-xs text-slate-500">
                          Ce moyen sera utilisé lorsque vous cliquerez sur “Payer” pour une échéance donnée.
                        </p>
                      </>
                    )}
                    <button
                      onClick={() => handleJoin(offre)}
                      disabled={joiningId === offre._id || (offre.placesRestantes || 0) <= 0}
                      className="w-full rounded-lg bg-emerald-600 text-white py-2.5 font-semibold hover:bg-emerald-700 disabled:opacity-60"
                    >
                      {joiningId === offre._id ? 'Enregistrement...' : 'Adhérer sans payer maintenant'}
                    </button>
                  </div>
                )}

                {!isClient && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => router.push(`/tontines/${offre._id}`)}
                      className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
                    >
                      Voir le détail
                    </button>
                    <button
                      onClick={() => handleDelete(offre)}
                      disabled={deletingId === offre._id}
                      className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:opacity-60"
                    >
                      {deletingId === offre._id ? 'Suppression...' : 'Supprimer'}
                    </button>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}