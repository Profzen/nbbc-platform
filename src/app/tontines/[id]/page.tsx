"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle, AlertCircle, Wallet, CalendarDays } from 'lucide-react';
import LoadingSpinner from '@/components/LoadingSpinner';

type TontineStatut = 'DRAFT' | 'ACTIVE' | 'LATE' | 'AT_RISK' | 'EVICTED' | 'WITHDRAWN' | 'MATURED' | 'PAID_OUT' | 'FAILED_PAYOUT';
type EcheanceStatut = 'A_PREVOIR' | 'EN_ATTENTE' | 'EN_RETARD' | 'PAYEE' | 'ANNULEE';
type Rail = 'CRYPTO' | 'MOBILE_MONEY' | 'CARTE' | 'BANQUE' | 'MANUEL';

interface TontineContract {
  _id: string;
  periodicite: 'JOURNALIERE' | 'HEBDOMADAIRE';
  dureeMois: 3 | 6;
  montantVersement: number;
  devise: string;
  compteDestinationType: string;
  compteDestinationLibelle: string;
  compteDestinationReference?: string;
  statut: TontineStatut;
  dateDebut: string;
  dateFinPrevue: string;
}

interface Echeance {
  _id: string;
  indexEcheance: number;
  dateEcheance: string;
  montantAttendu: number;
  montantRecu: number;
  statut: EcheanceStatut;
}

interface Versement {
  _id: string;
  montant: number;
  devise: string;
  railPaiement: Rail;
  statut: 'EN_ATTENTE' | 'SUCCES' | 'ECHEC' | 'REMBOURSE';
  referenceProvider?: string;
  createdAt: string;
}

const RAILS: Rail[] = ['CRYPTO', 'MOBILE_MONEY', 'CARTE', 'BANQUE', 'MANUEL'];

export default function TontineDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = String(params?.id || '');

  const [contract, setContract] = useState<TontineContract | null>(null);
  const [echeances, setEcheances] = useState<Echeance[]>([]);
  const [versements, setVersements] = useState<Versement[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [form, setForm] = useState({
    montant: '',
    railPaiement: 'MANUEL' as Rail,
    referenceProvider: '',
    echeanceId: '',
  });

  const refreshData = useCallback(async () => {
    if (!id) return;

    setLoading(true);
    setError(null);
    try {
      const [contractRes, echeancesRes, versementsRes] = await Promise.all([
        fetch(`/api/tontines/${id}`),
        fetch(`/api/tontines/${id}/echeances`),
        fetch(`/api/tontines/${id}/versements`),
      ]);

      const [contractJson, echeancesJson, versementsJson] = await Promise.all([
        contractRes.json(),
        echeancesRes.json(),
        versementsRes.json(),
      ]);

      if (!contractJson.success) {
        setError(contractJson.error || 'Impossible de charger le contrat.');
        setLoading(false);
        return;
      }

      setContract(contractJson.data || null);
      setEcheances(echeancesJson.success ? (echeancesJson.data || []) : []);
      setVersements(versementsJson.success ? (versementsJson.data || []) : []);
    } catch {
      setError('Erreur de connexion.');
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  const progress = useMemo(() => {
    const total = echeances.reduce((sum, e) => sum + (e.montantAttendu || 0), 0);
    const paid = echeances.reduce((sum, e) => sum + (e.montantRecu || 0), 0);
    const percent = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0;
    return { total, paid, percent };
  }, [echeances]);

  const pendingEcheances = useMemo(
    () => echeances.filter((e) => e.statut !== 'PAYEE' && e.statut !== 'ANNULEE'),
    [echeances]
  );

  const handleSubmitVersement = async () => {
    if (!id) return;
    const montant = Number(form.montant);
    if (!montant || montant <= 0) {
      setError('Montant invalide.');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const payload = {
        montant,
        devise: contract?.devise || 'XOF',
        railPaiement: form.railPaiement,
        referenceProvider: form.referenceProvider.trim() || undefined,
        echeanceId: form.echeanceId || undefined,
        statut: 'SUCCES',
      };

      const res = await fetch(`/api/tontines/${id}/versements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!data.success) {
        setError(data.error || 'Le versement a échoué.');
        setSaving(false);
        return;
      }

      setSuccess('Versement enregistré avec succès.');
      setForm({ montant: '', railPaiement: 'MANUEL', referenceProvider: '', echeanceId: '' });
      await refreshData();
    } catch {
      setError('Erreur réseau pendant l\'enregistrement du versement.');
    }
    setSaving(false);
  };

  if (loading) return <LoadingSpinner />;
  if (!contract) {
    return (
      <div className="min-h-screen p-4 md:p-8 pt-20 md:pt-8">
        <button
          onClick={() => router.push('/tontines')}
          className="mb-6 inline-flex items-center gap-2 text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour aux tontines
        </button>
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">Contrat introuvable.</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 pt-20 md:pt-8 space-y-6">
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={() => router.push('/tontines')}
          className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour
        </button>
      </div>

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

      <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Contrat tontine</h1>
            <p className="text-sm text-slate-600">
              {contract.periodicite === 'JOURNALIERE' ? 'Quotidien' : 'Hebdomadaire'} • {contract.dureeMois} mois
            </p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-blue-700 text-sm font-semibold">
            <Wallet className="w-4 h-4" />
            {contract.statut}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div className="rounded-lg bg-slate-100 p-3">
            <p className="text-slate-500">Montant/versement</p>
            <p className="font-semibold text-slate-900">{contract.montantVersement} {contract.devise}</p>
          </div>
          <div className="rounded-lg bg-slate-100 p-3">
            <p className="text-slate-500">Début</p>
            <p className="font-semibold text-slate-900">{new Date(contract.dateDebut).toLocaleDateString('fr-FR')}</p>
          </div>
          <div className="rounded-lg bg-slate-100 p-3">
            <p className="text-slate-500">Fin prévue</p>
            <p className="font-semibold text-slate-900">{new Date(contract.dateFinPrevue).toLocaleDateString('fr-FR')}</p>
          </div>
          <div className="rounded-lg bg-slate-100 p-3">
            <p className="text-slate-500">Destination</p>
            <p className="font-semibold text-slate-900 truncate">{contract.compteDestinationType}</p>
            <p className="text-xs text-slate-600 truncate">{contract.compteDestinationLibelle}</p>
          </div>
        </div>

        <div>
          <div className="flex justify-between text-sm mb-1 text-slate-700">
            <span>Progression</span>
            <span>{progress.paid} / {progress.total} {contract.devise}</span>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
            <div className="h-full bg-emerald-600" style={{ width: `${progress.percent}%` }} />
          </div>
          <p className="text-xs text-slate-500 mt-1">{progress.percent}% encaissé</p>
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
          <h2 className="text-lg font-semibold text-slate-900">Enregistrer un versement</h2>
          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className="text-sm font-medium text-slate-700">Montant</label>
              <input
                type="number"
                min="1"
                step="1"
                value={form.montant}
                onChange={(e) => setForm((prev) => ({ ...prev, montant: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                placeholder={`ex: ${contract.montantVersement}`}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Rail de paiement</label>
              <select
                value={form.railPaiement}
                onChange={(e) => setForm((prev) => ({ ...prev, railPaiement: e.target.value as Rail }))}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              >
                {RAILS.map((rail) => (
                  <option key={rail} value={rail}>{rail}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Référence provider (optionnel)</label>
              <input
                type="text"
                value={form.referenceProvider}
                onChange={(e) => setForm((prev) => ({ ...prev, referenceProvider: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                placeholder="ex: txn_12345"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Associer à une échéance</label>
              <select
                value={form.echeanceId}
                onChange={(e) => setForm((prev) => ({ ...prev, echeanceId: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              >
                <option value="">Aucune (versement libre)</option>
                {pendingEcheances.map((echeance) => (
                  <option key={echeance._id} value={echeance._id}>
                    Echéance #{echeance.indexEcheance} - {new Date(echeance.dateEcheance).toLocaleDateString('fr-FR')} ({echeance.montantRecu}/{echeance.montantAttendu})
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={handleSubmitVersement}
              disabled={saving}
              className="mt-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 font-semibold disabled:opacity-60"
            >
              {saving ? 'Enregistrement...' : 'Valider le versement'}
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-3">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-slate-600" />
            <h2 className="text-lg font-semibold text-slate-900">Échéances</h2>
          </div>
          <div className="space-y-2 max-h-[420px] overflow-auto pr-1">
            {echeances.length === 0 && <p className="text-sm text-slate-500">Aucune échéance générée.</p>}
            {echeances.map((e) => (
              <div key={e._id} className="rounded-lg border border-slate-200 p-3 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-slate-900">Echéance #{e.indexEcheance}</p>
                  <span className="text-xs rounded-full bg-slate-100 px-2 py-0.5 text-slate-700">{e.statut}</span>
                </div>
                <p className="text-slate-600">Date: {new Date(e.dateEcheance).toLocaleDateString('fr-FR')}</p>
                <p className="text-slate-600">Montant: {e.montantRecu}/{e.montantAttendu} {contract.devise}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <h2 className="text-lg font-semibold text-slate-900 mb-3">Historique des versements</h2>
        <div className="space-y-2">
          {versements.length === 0 && <p className="text-sm text-slate-500">Aucun versement pour le moment.</p>}
          {versements.map((v) => (
            <div key={v._id} className="rounded-lg border border-slate-200 p-3 flex flex-col md:flex-row md:items-center md:justify-between gap-2 text-sm">
              <div>
                <p className="font-semibold text-slate-900">{v.montant} {v.devise} via {v.railPaiement}</p>
                <p className="text-slate-600">{new Date(v.createdAt).toLocaleString('fr-FR')}</p>
              </div>
              <div className="text-right">
                <p className="text-slate-700">Statut: {v.statut}</p>
                {v.referenceProvider && <p className="text-xs text-slate-500">Ref: {v.referenceProvider}</p>}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
