"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, AlertCircle, Users, CalendarDays, Wallet } from 'lucide-react';
import LoadingSpinner from '@/components/LoadingSpinner';

type Role = 'SUPER_ADMIN' | 'AGENT' | 'ANALYSTE' | 'COMPLIANCE' | 'TONTINE_CLIENT';
type Categorie = 'EPARGNE' | 'CLASSIQUE';

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

export default function TontineOffreDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = String(params?.id || '');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [payload, setPayload] = useState<Payload | null>(null);

  useEffect(() => {
    let mounted = true;

    (async () => {
      if (!id) return;
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(`/api/tontines/offres/${id}`);
        const data = await res.json();
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

  if (loading) return <LoadingSpinner />;

  if (!payload?.offre) {
    return (
      <div className="min-h-screen bg-slate-50 p-4 md:p-8 pt-20 md:pt-8">
        <button
          onClick={() => router.push('/tontines')}
          className="inline-flex items-center gap-2 text-slate-700 hover:text-slate-900"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour
        </button>
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">Offre introuvable.</div>
      </div>
    );
  }

  const { offre, role, adhesions, tours, monAdhesion } = payload;
  const isClient = role === 'TONTINE_CLIENT';

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 pt-20 md:pt-8 space-y-5">
      <button
        onClick={() => router.push('/tontines')}
        className="inline-flex items-center gap-2 text-slate-700 hover:text-slate-900"
      >
        <ArrowLeft className="w-4 h-4" />
        Retour
      </button>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700 inline-flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
        <h1 className="text-2xl font-bold text-slate-900">{offre.nom}</h1>
        <p className="text-slate-600">{offre.description || 'Sans description.'}</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
          <div className="rounded-lg bg-slate-100 p-3">
            <p className="text-slate-500">Catégorie</p>
            <p className="font-semibold text-slate-900">{offre.categorie === 'CLASSIQUE' ? 'Classique rotative' : 'Épargne'}</p>
          </div>
          <div className="rounded-lg bg-slate-100 p-3">
            <p className="text-slate-500">Cotisation</p>
            <p className="font-semibold text-slate-900">{offre.montantCotisation} XOF</p>
          </div>
          <div className="rounded-lg bg-slate-100 p-3">
            <p className="text-slate-500">Lot par tour</p>
            <p className="font-semibold text-slate-900">{offre.montantLot} XOF</p>
          </div>
          <div className="rounded-lg bg-slate-100 p-3">
            <p className="text-slate-500">Statut</p>
            <p className="font-semibold text-slate-900">{offre.statut}</p>
          </div>
        </div>
      </section>

      {isClient && (
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 mb-2">Mon adhésion</h2>
          {!monAdhesion && <p className="text-sm text-slate-500">Aucune adhésion active sur cette offre.</p>}
          {monAdhesion && (
            <div className="rounded-lg border border-slate-200 p-3 text-sm">
              <p className="font-semibold text-slate-900">Statut: {monAdhesion.statut}</p>
              <p className="text-slate-600">Paiement: {monAdhesion.moyenPaiementChoisi}</p>
              {typeof monAdhesion.ordrePassage === 'number' && (
                <p className="text-slate-600">Ordre de passage: #{monAdhesion.ordrePassage}</p>
              )}
            </div>
          )}
        </section>
      )}

      {!isClient && (
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 mb-3 inline-flex items-center gap-2">
            <Users className="w-4 h-4" />
            Adhésions
          </h2>
          <div className="space-y-2">
            {adhesions.length === 0 && <p className="text-sm text-slate-500">Aucune adhésion pour le moment.</p>}
            {adhesions.map((item) => (
              <div key={item._id} className="rounded-lg border border-slate-200 p-3 flex items-center justify-between gap-2 text-sm">
                <div>
                  <p className="font-semibold text-slate-900">{item.clientUserId?.name || item.clientUserId?.email || 'Client'}</p>
                  <p className="text-slate-600">Paiement: {item.moyenPaiementChoisi}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-slate-800">{item.statut}</p>
                  {typeof item.ordrePassage === 'number' && <p className="text-slate-500">Ordre #{item.ordrePassage}</p>}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900 mb-3 inline-flex items-center gap-2">
          <CalendarDays className="w-4 h-4" />
          Tours de rotation
        </h2>
        <div className="space-y-2">
          {tours.length === 0 && (
            <p className="text-sm text-slate-500">Les tours seront planifiés automatiquement dès que la tontine classique est complète.</p>
          )}
          {tours.map((tour) => (
            <div key={tour._id} className="rounded-lg border border-slate-200 p-3 flex flex-col md:flex-row md:items-center md:justify-between gap-2 text-sm">
              <div className="inline-flex items-center gap-2">
                <Wallet className="w-4 h-4 text-slate-500" />
                <span className="font-semibold text-slate-900">Tour #{tour.numeroTour}</span>
                <span className="text-slate-600">{tour.montantLot} XOF</span>
              </div>
              <div className="text-slate-700">
                {tour.beneficiaireUserId?.name || tour.beneficiaireUserId?.email || 'Bénéficiaire'} • {new Date(tour.datePrevue).toLocaleDateString('fr-FR')} • {tour.statut}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
