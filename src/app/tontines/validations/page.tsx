"use client";

import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, ClipboardList, RefreshCw, XCircle } from 'lucide-react';
import LoadingSpinner from '@/components/LoadingSpinner';

interface Echeance {
  _id: string;
  numeroEcheance: number;
  dateEcheance: string;
  montantPrevu: number;
  montantPaye: number;
  statut: string;
  moyenPaiementChoisi: string;
  validationStatus: string;
  validationRequestedAt?: string;
  validationNote?: string;
  preuveReference?: string;
  preuveNote?: string;
  adhesionId?: { moyenPaiementChoisi?: string; ordrePassage?: number } | null;
  offreId?: { nom?: string; categorie?: string } | null;
  clientUserId?: { name?: string; email?: string } | null;
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
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function TontineValidationsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [echeances, setEcheances] = useState<Echeance[]>([]);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/tontines/validations');
      const data = await res.json();
      if (!data.success) {
        setError(data.error || 'Impossible de charger les validations.');
      } else {
        setEcheances(data.data.echeances || []);
      }
    } catch {
      setError('Erreur réseau.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDecision = async (echeanceId: string, action: 'approve' | 'reject') => {
    const note = window.prompt(
      action === 'approve' ? 'Note de validation (optionnel)' : 'Motif du refus (optionnel)',
      action === 'approve' ? 'Échéance validée par un agent.' : 'Demande refusée par un agent.'
    );
    if (note === null) return; // user cancelled prompt

    setProcessingId(echeanceId);
    setError(null);
    setNotice(null);

    try {
      const res = await fetch('/api/tontines/validations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ echeanceId, action, note: note || '' }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error || 'Action impossible.');
      } else {
        setNotice(action === 'approve' ? 'Échéance validée.' : 'Échéance refusée.');
        await load();
      }
    } catch {
      setError('Erreur réseau.');
    }

    setProcessingId(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 pt-20 md:pt-8 space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div className="inline-flex items-center gap-3">
          <ClipboardList className="w-6 h-6 text-slate-700" />
          <h1 className="text-2xl font-bold text-slate-900">Validations tontines en attente</h1>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Actualiser
        </button>
      </div>

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

      {loading && <LoadingSpinner />}

      {!loading && echeances.length === 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
          <ClipboardList className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-600 font-medium">Aucune échéance en attente de validation.</p>
          <p className="text-sm text-slate-400 mt-1">Toutes les déclarations de paiement ont été traitées.</p>
        </div>
      )}

      {!loading && echeances.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm text-slate-500">{echeances.length} échéance{echeances.length > 1 ? 's' : ''} en attente</p>
          {echeances.map((echeance) => (
            <div
              key={echeance._id}
              className="rounded-xl border border-slate-200 bg-white p-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 shadow-sm"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-slate-900 text-sm">
                    {echeance.clientUserId?.name || echeance.clientUserId?.email || 'Client inconnu'}
                  </p>
                  <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
                    {echeance.offreId?.nom || 'Offre inconnue'}
                  </span>
                  <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                    Échéance #{echeance.numeroEcheance}
                  </span>
                </div>
                <p className="text-sm text-slate-700">
                  Montant: <span className="font-medium">{formatCurrency(echeance.montantPrevu)}</span>
                  {' '}• Moyen: <span className="font-medium">{echeance.moyenPaiementChoisi}</span>
                  {' '}• Échéance prévue le {formatDate(echeance.dateEcheance).split(' à')[0]}
                </p>
                <p className="text-xs text-slate-500">
                  Déclaré le {formatDate(echeance.validationRequestedAt || echeance.dateEcheance)}
                </p>
                {echeance.preuveReference && (
                  <div className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 border border-blue-200 px-3 py-1.5 text-sm">
                    <span className="font-semibold text-blue-800">Référence preuve:</span>
                    <span className="font-mono text-blue-700">{echeance.preuveReference}</span>
                  </div>
                )}
                {echeance.preuveNote && (
                  <p className="text-sm text-slate-600">Note client: {echeance.preuveNote}</p>
                )}
                {echeance.validationNote && !echeance.preuveNote && (
                  <p className="text-sm text-slate-500">Note: {echeance.validationNote}</p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => handleDecision(echeance._id, 'approve')}
                  disabled={processingId === echeance._id}
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {processingId === echeance._id ? 'Traitement...' : 'Valider'}
                </button>
                <button
                  onClick={() => handleDecision(echeance._id, 'reject')}
                  disabled={processingId === echeance._id}
                  className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:opacity-60"
                >
                  <XCircle className="w-4 h-4" />
                  Refuser
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
