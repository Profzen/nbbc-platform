"use client";

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Users, Repeat, PiggyBank, CheckCircle2, AlertCircle, Clock, Trophy, Calendar, RefreshCw } from 'lucide-react';
import LoadingSpinner from '@/components/LoadingSpinner';

type Role = 'SUPER_ADMIN' | 'AGENT' | 'ANALYSTE' | 'COMPLIANCE' | 'TONTINE_CLIENT';
type Categorie = 'EPARGNE' | 'CLASSIQUE';
type Statut = 'BROUILLON' | 'OUVERTE' | 'COMPLETE' | 'EN_COURS' | 'SUSPENDUE' | 'CLOTUREE';
type Moyen = 'CRYPTO' | 'MOBILE_MONEY' | 'CARTE' | 'BANQUE' | 'MANUEL';

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

interface Adhesion {
  _id: string;
  offreId: Offre;
  statut: 'EN_ATTENTE' | 'VALIDEE' | 'REFUSEE' | 'RETIREE';
  moyenPaiementChoisi: Moyen;
  paymentStatus?: 'NONE' | 'PENDING' | 'SUCCESS' | 'FAILED' | 'EXPIRED' | 'CANCELLED';
  paymentIdentifier?: string;
  paygateTxReference?: string;
  paygatePaymentReference?: string;
  ordrePassage?: number;
  createdAt: string;
  monTour?: MonTour | null;
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

const MOYENS: Moyen[] = ['MANUEL', 'MOBILE_MONEY', 'BANQUE', 'CARTE', 'CRYPTO'];
const PAYMENT_NETWORKS = ['FLOOZ', 'TMONEY'] as const;

const TOUR_STATUT_LABEL: Record<string, string> = {
  PLANIFIE: 'Planifié',
  PAYE: 'Payé ✓',
  REPORTE: 'Reporté',
  ANNULE: 'Annulé',
};

const PAYMENT_STATUS_LABEL: Record<string, string> = {
  NONE: 'Sans paiement en ligne',
  PENDING: 'Paiement en attente',
  SUCCESS: 'Paiement confirme',
  FAILED: 'Paiement echoue',
  EXPIRED: 'Paiement expire',
  CANCELLED: 'Paiement annule',
};

export default function TontinesPage() {
  const router = useRouter();
  const [payload, setPayload] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
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

  const handleJoin = async (offre: Offre) => {
    const moyen = selectedMoyens[offre._id] || offre.moyensPaiementAcceptes?.[0] || 'MANUEL';
    const paymentNetwork = selectedNetworks[offre._id] || 'FLOOZ';
    setJoiningId(offre._id);
    setError(null);
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
        const redirectUrl = data?.data?.payment?.redirectUrl;
        if (redirectUrl) {
          window.location.href = redirectUrl;
          return;
        }
        const refreshed = await loadTontines();
        if (refreshed.success) {
          setPayload(refreshed.data as ApiResponse);
        }
      }
    } catch {
      setError("Erreur réseau pendant l'adhésion.");
    }
    setJoiningId(null);
  };

  const handleRetryPayment = async (offreId: string, adhesionId: string) => {
    setRetryingId(adhesionId);
    setError(null);
    try {
      const res = await fetch(`/api/tontines/offres/${offreId}/adhesions/${adhesionId}/repay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error || 'Reprise impossible.');
      } else {
        window.location.href = data.data.redirectUrl;
        return;
      }
    } catch {
      setError('Erreur réseau.');
    }
    setRetryingId(null);
  };

  const handleDelete = async (offre: Offre) => {
    if (!confirm(`Supprimer l'offre "${offre.nom}" ? Cette action supprimera aussi toutes les adhésions et tours associés.`)) return;
    setDeletingId(offre._id);
    setError(null);
    try {
      const res = await fetch(`/api/tontines/offres/${offre._id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!data.success) {
        setError(data.error || 'Suppression impossible.');
      } else {
        const refreshed = await loadTontines();
        if (refreshed.success) setPayload(refreshed.data as ApiResponse);
      }
    } catch {
      setError('Erreur réseau pendant la suppression.');
    }
    setDeletingId(null);
  };

  const verifyPayment = async (offreId: string, adhesionId: string) => {
    setVerifyingId(adhesionId);
    setError(null);
    try {
      const res = await fetch(`/api/tontines/offres/${offreId}/adhesions/${adhesionId}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error || 'Verification impossible.');
      } else {
        const refreshed = await loadTontines();
        if (refreshed.success) {
          setPayload(refreshed.data as ApiResponse);
        }
      }
    } catch {
      setError('Erreur reseau pendant la verification de paiement.');
    }
    setVerifyingId(null);
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 pt-20 md:pt-8 space-y-6">
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Tontines</h1>
          <p className="text-slate-600 mt-1">
            {isClient
              ? 'Les deux modèles coexistent: le client choisit l’offre qui lui convient.'
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

      {isClient && (
        <section className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-cyan-50 p-5 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">Parcours client simplifie</h2>
          <p className="mt-1 text-sm text-slate-700">
            1) Choisir une offre, 2) Choisir Mobile Money, 3) Payer sur la page securisee PayGate, 4) Revenir et verifier le statut.
          </p>
        </section>
      )}

      {isClient && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-slate-900">Mes Tontines</h2>
            <span className="text-sm text-slate-500">{(payload?.mesAdhesions || []).length} adhésion(s)</span>
          </div>

          {(payload?.mesAdhesions || []).length === 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500">
              Vous n'avez pas encore adhéré à une tontine. Choisissez une offre ci-dessous.
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {(payload?.mesAdhesions || []).map((adhesion) => {
              const offre = adhesion.offreId;
              const isValidated = adhesion.statut === 'VALIDEE';
              const isPayPending = adhesion.paymentStatus === 'PENDING';
              const isPayRetryable = ['FAILED', 'EXPIRED', 'CANCELLED'].includes(adhesion.paymentStatus || '');
              const isPaySuccess = adhesion.paymentStatus === 'SUCCESS';
              const isManualWaiting = adhesion.statut === 'EN_ATTENTE' && adhesion.paymentStatus === 'NONE';
              const isMobileMoney = adhesion.moyenPaiementChoisi === 'MOBILE_MONEY';

              return (
                <div key={adhesion._id} className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col">
                  {/* En-tête coloré selon statut */}
                  <div className={`px-4 py-3 flex items-center justify-between border-b ${
                    isValidated ? 'bg-emerald-50 border-emerald-100' : 'bg-amber-50 border-amber-100'
                  }`}>
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="inline-flex items-center gap-1 rounded-full bg-white/80 border px-2 py-0.5 text-xs font-semibold text-slate-700 flex-shrink-0">
                        {offre?.categorie === 'CLASSIQUE' ? <Repeat className="w-3 h-3" /> : <PiggyBank className="w-3 h-3" />}
                        {offre?.categorie === 'CLASSIQUE' ? 'Classique' : 'Épargne'}
                      </span>
                      <p className="font-bold text-slate-900 truncate">{offre?.nom || 'Offre supprimée'}</p>
                    </div>
                    <span className={`ml-2 flex-shrink-0 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
                      isValidated ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {isValidated ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                      {isValidated ? 'Validée' : 'En attente'}
                    </span>
                  </div>

                  {/* Corps */}
                  <div className="p-4 space-y-3 flex-1">
                    {/* Chiffres clés */}
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="rounded-lg bg-slate-50 px-3 py-2">
                        <p className="text-xs text-slate-500">Cotisation</p>
                        <p className="font-semibold text-slate-900">{offre?.montantCotisation?.toLocaleString('fr-FR')} XOF</p>
                        <p className="text-xs text-slate-400">{offre?.frequence ? FREQUENCE_LABEL[offre.frequence] : ''}</p>
                      </div>
                      <div className="rounded-lg bg-slate-50 px-3 py-2">
                        <p className="text-xs text-slate-500">Lot à recevoir</p>
                        <p className="font-semibold text-slate-900">{offre?.montantLot?.toLocaleString('fr-FR')} XOF</p>
                        {adhesion.ordrePassage && <p className="text-xs text-slate-400">Passage #{adhesion.ordrePassage}</p>}
                      </div>
                    </div>

                    {/* Mon tour programmé */}
                    {adhesion.monTour && (
                      <div className="rounded-lg bg-indigo-50 border border-indigo-100 px-3 py-2 text-sm">
                        <p className="text-xs font-semibold text-indigo-600 mb-1 flex items-center gap-1">
                          <Trophy className="w-3 h-3" /> Mon tour programmé
                        </p>
                        <p className="text-slate-700 font-medium">Tour #{adhesion.monTour.numeroTour} — {adhesion.monTour.montantLot?.toLocaleString('fr-FR')} XOF</p>
                        <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                          <Calendar className="w-3 h-3" />
                          Prévu le {new Date(adhesion.monTour.datePrevue).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
                          {' · '}{TOUR_STATUT_LABEL[adhesion.monTour.statut] || adhesion.monTour.statut}
                        </p>
                      </div>
                    )}

                    {/* Statut paiement Mobile Money */}
                    {isMobileMoney && (
                      <div className={`rounded-lg px-3 py-2 text-sm border ${
                        isPaySuccess ? 'bg-emerald-50 border-emerald-100' :
                        isPayPending ? 'bg-blue-50 border-blue-100' :
                        isPayRetryable ? 'bg-red-50 border-red-100' :
                        'bg-slate-50 border-slate-100'
                      }`}>
                        <p className={`font-medium text-xs ${
                          isPaySuccess ? 'text-emerald-700' :
                          isPayPending ? 'text-blue-700' :
                          isPayRetryable ? 'text-red-700' : 'text-slate-600'
                        }`}>
                          Mobile Money · {PAYMENT_STATUS_LABEL[adhesion.paymentStatus || 'NONE']}
                        </p>
                        {adhesion.paygatePaymentReference && (
                          <p className="text-xs text-slate-500 mt-0.5">Réf: {adhesion.paygatePaymentReference}</p>
                        )}
                      </div>
                    )}

                    {/* Attente validation manuelle */}
                    {!isMobileMoney && isManualWaiting && (
                      <div className="rounded-lg bg-amber-50 border border-amber-100 px-3 py-2 text-xs text-amber-700">
                        En attente de validation manuelle par l'équipe.
                      </div>
                    )}

                    <p className="text-xs text-slate-400">
                      Adhésion le {new Date(adhesion.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
                    </p>
                  </div>

                  {/* Actions */}
                  {(isPayPending || isPayRetryable) && (
                    <div className="px-4 pb-4 flex gap-2">
                      {isPayPending && (
                        <button
                          onClick={() => verifyPayment(String(offre?._id || ''), adhesion._id)}
                          disabled={verifyingId === adhesion._id}
                          className="flex-1 rounded-lg border border-blue-300 bg-white px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-60"
                        >
                          {verifyingId === adhesion._id ? 'Vérification...' : 'Vérifier le paiement'}
                        </button>
                      )}
                      {isPayRetryable && isMobileMoney && (
                        <button
                          onClick={() => handleRetryPayment(String(offre?._id || ''), adhesion._id)}
                          disabled={retryingId === adhesion._id}
                          className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-orange-500 text-white px-3 py-2 text-sm font-semibold hover:bg-orange-600 disabled:opacity-60"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          {retryingId === adhesion._id ? 'Préparation...' : 'Retenter le paiement'}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section className="space-y-3">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-2">
          <h2 className="text-xl font-semibold text-slate-900">
            {isClient ? 'Choisissez votre modèle' : 'Catalogue des offres'}
          </h2>
          {isClient && (
            <p className="text-sm text-slate-500">
              Épargne et classique rotative sont proposées ensemble. Vous pouvez adhérer à l’un ou l’autre selon votre besoin.
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
                    <p className="font-semibold text-slate-900">{offre.montantCotisation} XOF</p>
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
                    <p className="font-semibold text-slate-900">{offre.montantLot} XOF</p>
                  </div>
                </div>

                <div className="text-xs text-slate-600">
                  Statut: <span className="font-semibold">{STATUT_LABEL[offre.statut]}</span> • Tours: {offre.nombreTours} • Durée estimée: {offre.dureeSemaines} semaines
                </div>

                {isClient && (
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-slate-700">Moyen de paiement</label>
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
                        <label className="block text-sm font-medium text-slate-700">Operateur mobile money</label>
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
                          Vous serez redirige vers la page securisee PayGate pour finaliser le paiement.
                        </p>
                      </>
                    )}
                    <button
                      onClick={() => handleJoin(offre)}
                      disabled={joiningId === offre._id || (offre.placesRestantes || 0) <= 0}
                      className="w-full rounded-lg bg-emerald-600 text-white py-2.5 font-semibold hover:bg-emerald-700 disabled:opacity-60"
                    >
                      {joiningId === offre._id ? 'Preparation...' : 'Adherer et payer'}
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
