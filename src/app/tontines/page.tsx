"use client";

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Users, Repeat, PiggyBank, CheckCircle2, AlertCircle } from 'lucide-react';
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

interface Adhesion {
  _id: string;
  offreId: Offre;
  statut: 'EN_ATTENTE' | 'VALIDEE' | 'REFUSEE' | 'RETIREE';
  moyenPaiementChoisi: Moyen;
  paymentStatus?: 'NONE' | 'PENDING' | 'SUCCESS' | 'FAILED' | 'EXPIRED' | 'CANCELLED';
  paymentIdentifier?: string;
  paygateTxReference?: string;
  ordrePassage?: number;
  createdAt: string;
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
        <section className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900 mb-3">Mes adhésions</h2>
          <div className="space-y-3">
            {(payload?.mesAdhesions || []).length === 0 && (
              <p className="text-sm text-slate-500">Vous n'avez encore adhéré à aucune tontine.</p>
            )}
            {(payload?.mesAdhesions || []).map((adhesion) => (
              <div key={adhesion._id} className="rounded-lg border border-slate-200 p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                <div>
                  <p className="font-semibold text-slate-900">{adhesion.offreId?.nom || 'Offre supprimée'}</p>
                  <p className="text-sm text-slate-600">
                    {adhesion.offreId?.categorie === 'CLASSIQUE' ? 'Classique rotative' : 'Épargne'} • {adhesion.moyenPaiementChoisi}
                  </p>
                  {adhesion.paymentStatus && (
                    <p className="text-xs text-slate-500 mt-1">{PAYMENT_STATUS_LABEL[adhesion.paymentStatus] || adhesion.paymentStatus}</p>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-emerald-700 text-xs font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {adhesion.statut}
                  </div>
                  {adhesion.paymentStatus === 'PENDING' && (
                    <button
                      onClick={() => verifyPayment(String(adhesion.offreId?._id || ''), adhesion._id)}
                      disabled={verifyingId === adhesion._id}
                      className="rounded-lg border border-blue-300 bg-white px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-60"
                    >
                      {verifyingId === adhesion._id ? 'Verification...' : 'Verifier paiement'}
                    </button>
                  )}
                </div>
              </div>
            ))}
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
                  <button
                    onClick={() => router.push(`/tontines/${offre._id}`)}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
                  >
                    Voir le détail
                  </button>
                )}
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
