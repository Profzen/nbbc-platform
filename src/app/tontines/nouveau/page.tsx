"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, AlertCircle, CheckCircle } from 'lucide-react';
import LoadingSpinner from '@/components/LoadingSpinner';

type Role = 'SUPER_ADMIN' | 'AGENT' | 'ANALYSTE' | 'COMPLIANCE' | 'TONTINE_CLIENT';
type Categorie = 'EPARGNE' | 'CLASSIQUE';
type Frequence = 'HEBDOMADAIRE' | 'BI_HEBDOMADAIRE' | 'MENSUELLE';
type DureeUnite = 'SEMAINE' | 'MOIS' | 'ANNEE';
type Moyen = 'CRYPTO' | 'MOBILE_MONEY' | 'CARTE' | 'BANQUE' | 'MANUEL';

const ALL_MOYENS: Moyen[] = ['MANUEL', 'MOBILE_MONEY', 'BANQUE', 'CARTE', 'CRYPTO'];

export default function NouvelleOffreTontinePage() {
  const router = useRouter();
  const [loadingRole, setLoadingRole] = useState(true);
  const [role, setRole] = useState<Role | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    nom: '',
    categorie: 'EPARGNE' as Categorie,
    description: '',
    montantCotisation: '',
    frequence: 'HEBDOMADAIRE' as Frequence,
    nombreMembresCible: '5',
    dureeValeur: '12',
    dureeUnite: 'MOIS' as DureeUnite,
    dateDebutPrevue: '',
    moyensPaiementAcceptes: ['MANUEL'] as Moyen[],
  });

  const computeEpargneEcheances = () => {
    const dureeValeur = Math.max(0, Math.floor(Number(formData.dureeValeur) || 0));
    const dureeUnite = formData.dureeUnite;
    const frequence = formData.frequence;

    if (dureeValeur <= 0) return 0;

    if (dureeUnite === 'ANNEE') {
      if (frequence === 'HEBDOMADAIRE') return dureeValeur * 52;
      if (frequence === 'BI_HEBDOMADAIRE') return dureeValeur * 26;
      return dureeValeur * 12;
    }

    if (dureeUnite === 'MOIS') {
      if (frequence === 'HEBDOMADAIRE') return dureeValeur * 4;
      if (frequence === 'BI_HEBDOMADAIRE') return dureeValeur * 2;
      return dureeValeur;
    }

    if (frequence === 'HEBDOMADAIRE') return dureeValeur;
    if (frequence === 'BI_HEBDOMADAIRE') return Math.floor(dureeValeur / 2);
    return Math.floor(dureeValeur / 4);
  };

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/tontines');
        const data = await res.json();
        if (data.success) {
          setRole(data.data?.role || null);
        }
      } catch {
        setError('Impossible de vérifier le rôle utilisateur.');
      }
      setLoadingRole(false);
    })();
  }, []);

  const canCreate = role === 'SUPER_ADMIN' || role === 'AGENT';

  const toggleMoyen = (moyen: Moyen) => {
    setFormData((prev) => {
      const has = prev.moyensPaiementAcceptes.includes(moyen);
      const next = has
        ? prev.moyensPaiementAcceptes.filter((m) => m !== moyen)
        : [...prev.moyensPaiementAcceptes, moyen];

      return {
        ...prev,
        moyensPaiementAcceptes: next.length > 0 ? next : ['MANUEL'],
      };
    });
  };

  const submit = async () => {
    setError(null);
    setSuccess(null);

    const montant = Number(formData.montantCotisation);
    if (!formData.nom.trim()) {
      setError('Le nom de l\'offre est obligatoire.');
      return;
    }
    if (!Number.isFinite(montant) || montant <= 0) {
      setError('Le montant de cotisation est invalide.');
      return;
    }

    if (formData.categorie === 'EPARGNE') {
      const dureeValeur = Number(formData.dureeValeur);
      if (!Number.isFinite(dureeValeur) || dureeValeur <= 0) {
        setError('La durée totale de la tontine épargne est obligatoire.');
        return;
      }

      if (computeEpargneEcheances() < 1) {
        setError('Durée incohérente avec la fréquence choisie.');
        return;
      }
    }

    const payload = {
      nom: formData.nom.trim(),
      categorie: formData.categorie,
      description: formData.description.trim() || undefined,
      montantCotisation: montant,
      frequence: formData.frequence,
      nombreMembresCible: formData.categorie === 'CLASSIQUE' ? Number(formData.nombreMembresCible) : 1,
      dureeValeur: formData.categorie === 'EPARGNE' ? Number(formData.dureeValeur) : undefined,
      dureeUnite: formData.categorie === 'EPARGNE' ? formData.dureeUnite : undefined,
      dateDebutPrevue: formData.dateDebutPrevue || undefined,
      moyensPaiementAcceptes: formData.moyensPaiementAcceptes,
    };

    setSaving(true);
    try {
      const res = await fetch('/api/tontines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error || 'Création impossible.');
      } else {
        setSuccess('Offre créée avec succès.');
        setTimeout(() => {
          router.push('/tontines');
        }, 1200);
      }
    } catch {
      setError('Erreur réseau pendant la création.');
    }
    setSaving(false);
  };

  if (loadingRole) return <LoadingSpinner />;

  if (!canCreate) {
    return (
      <div className="min-h-screen p-4 md:p-8 pt-20 md:pt-8 bg-slate-50">
        <button
          onClick={() => router.push('/tontines')}
          className="inline-flex items-center gap-2 text-slate-700 hover:text-slate-900"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour aux tontines
        </button>
        <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-800">
          Seuls les profils Admin/Agent peuvent créer une tontine. Les clients adhèrent uniquement aux offres existantes.
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 pt-20 md:pt-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <button
          onClick={() => router.push('/tontines')}
          className="inline-flex items-center gap-2 text-slate-700 hover:text-slate-900"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour
        </button>

        <header>
          <h1 className="text-3xl font-bold text-slate-900">Nouvelle offre tontine</h1>
            <p className="text-slate-600 mt-1">Créez une tontine &Eacute;pargne ou Classique rotative.</p>
        </header>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700 inline-flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}
        {success && (
          <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-green-700 inline-flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            {success}
          </div>
        )}

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nom de l'offre</label>
            <input
              type="text"
              value={formData.nom}
              onChange={(e) => setFormData((prev) => ({ ...prev, nom: e.target.value }))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              placeholder="ex: Tontine Quartier A - Avril"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Catégorie</label>
            <select
              value={formData.categorie}
              onChange={(e) => setFormData((prev) => ({ ...prev, categorie: e.target.value as Categorie }))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
            >
              <option value="EPARGNE">Épargne (solo)</option>
              <option value="CLASSIQUE">Classique rotative (groupe)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 min-h-24"
              placeholder="Contexte, règles, publics visés..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Cotisation (XOF)</label>
              <input
                type="number"
                min="1"
                step="1"
                value={formData.montantCotisation}
                onChange={(e) => setFormData((prev) => ({ ...prev, montantCotisation: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Fréquence</label>
              <select
                value={formData.frequence}
                onChange={(e) => setFormData((prev) => ({ ...prev, frequence: e.target.value as Frequence }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
              >
                <option value="HEBDOMADAIRE">Hebdomadaire</option>
                <option value="BI_HEBDOMADAIRE">Chaque 2 semaines</option>
                <option value="MENSUELLE">Mensuelle</option>
              </select>
            </div>
          </div>

          {formData.categorie === 'CLASSIQUE' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nombre de participants cible</label>
              <input
                type="number"
                min="2"
                step="1"
                value={formData.nombreMembresCible}
                onChange={(e) => setFormData((prev) => ({ ...prev, nombreMembresCible: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
              />
            </div>
          )}

          {formData.categorie === 'EPARGNE' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Durée totale</label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={formData.dureeValeur}
                  onChange={(e) => setFormData((prev) => ({ ...prev, dureeValeur: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Unité de durée</label>
                <select
                  value={formData.dureeUnite}
                  onChange={(e) => setFormData((prev) => ({ ...prev, dureeUnite: e.target.value as DureeUnite }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                >
                  <option value="SEMAINE">Semaine(s)</option>
                  <option value="MOIS">Mois</option>
                  <option value="ANNEE">Année(s)</option>
                </select>
              </div>
              <div className="md:col-span-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800">
                Échéances prévues: <span className="font-semibold">{computeEpargneEcheances()}</span>
                {' '}({formData.frequence.toLowerCase().replace('_', ' ')})
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Date de début prévue (optionnel)</label>
            <input
              type="date"
              value={formData.dateDebutPrevue}
              onChange={(e) => setFormData((prev) => ({ ...prev, dateDebutPrevue: e.target.value }))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </div>

          <div>
            <p className="text-sm font-medium text-slate-700 mb-2">Moyens de paiement acceptés</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {ALL_MOYENS.map((moyen) => {
                const active = formData.moyensPaiementAcceptes.includes(moyen);
                return (
                  <button
                    key={moyen}
                    type="button"
                    onClick={() => toggleMoyen(moyen)}
                    className={`rounded-lg border px-3 py-2 text-sm font-semibold ${active ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-300 text-slate-700 hover:bg-slate-50'}`}
                  >
                    {moyen}
                  </button>
                );
              })}
            </div>
          </div>

          <button
            onClick={submit}
            disabled={saving}
            className="w-full rounded-lg bg-blue-600 py-2.5 font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {saving ? 'Création en cours...' : "Créer l&apos;offre"}
          </button>
        </div>
      </div>
    </div>
  );
}
