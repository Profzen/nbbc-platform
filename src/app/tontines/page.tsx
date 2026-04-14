"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, ChevronDown, AlertCircle, CheckCircle, Clock, Eye, ArrowRight } from 'lucide-react';
import LoadingSpinner from '@/components/LoadingSpinner';

type TontineStatut = 'DRAFT' | 'ACTIVE' | 'LATE' | 'AT_RISK' | 'EVICTED' | 'WITHDRAWN' | 'MATURED' | 'PAID_OUT' | 'FAILED_PAYOUT';

interface TontineContract {
  _id: string;
  userId: string;
  periodicite: 'JOURNALIERE' | 'HEBDOMADAIRE';
  dureeMois: 3 | 6;
  montantVersement: number;
  devise: string;
  compteDestinationType: string;
  compteDestinationLibelle: string;
  compteDestinationReference?: string;
  statut: TontineStatut;
  dateSouscription: string;
  dateDebut: string;
  dateFinPrevue: string;
  fraisPlateformePercent: number;
  penaliteSortiePercent: number;
  penaliteDefautPercent: number;
  nombreVersementsManques: number;
}

const STATUT_CONFIG: Record<TontineStatut, { color: string; bg: string; label: string; icon: any }> = {
  DRAFT: { color: 'text-slate-700', bg: 'bg-slate-100', label: 'Brouillon', icon: Clock },
  ACTIVE: { color: 'text-green-700', bg: 'bg-green-100', label: 'Actif', icon: CheckCircle },
  LATE: { color: 'text-yellow-700', bg: 'bg-yellow-100', label: 'En retard', icon: AlertCircle },
  AT_RISK: { color: 'text-orange-700', bg: 'bg-orange-100', label: 'À risque', icon: AlertCircle },
  EVICTED: { color: 'text-red-700', bg: 'bg-red-100', label: 'Expulsé', icon: AlertCircle },
  WITHDRAWN: { color: 'text-gray-500', bg: 'bg-gray-100', label: 'Retiré', icon: Eye },
  MATURED: { color: 'text-blue-700', bg: 'bg-blue-100', label: 'Mûr', icon: CheckCircle },
  PAID_OUT: { color: 'text-emerald-700', bg: 'bg-emerald-100', label: 'Remboursé', icon: CheckCircle },
  FAILED_PAYOUT: { color: 'text-red-700', bg: 'bg-red-100', label: 'Remboursement échoué', icon: AlertCircle },
};

export default function TontinesPage() {
  const router = useRouter();
  const [contracts, setContracts] = useState<TontineContract[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchContracts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/tontines');
      const data = await res.json();
      if (data.success) {
        setContracts(data.data || []);
      } else {
        setError(data.error || 'Erreur lors du chargement des contrats');
      }
    } catch (err) {
      setError('Erreur de connexion');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchContracts();
  }, [fetchContracts]);

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('fr-FR', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const calculateDaysRemaining = (dateFinPrevue: string) => {
    const now = new Date();
    const end = new Date(dateFinPrevue);
    const days = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return days;
  };

  const getStatusIcon = (statut: TontineStatut) => {
    const Icon = STATUT_CONFIG[statut]?.icon || AlertCircle;
    return <Icon className={`w-4 h-4 ${STATUT_CONFIG[statut]?.color}`} />;
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-8 pt-20 md:pt-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Mes Tontines</h1>
          <p className="text-slate-600 mt-2">Suivez vos contrats d'épargne programmée</p>
        </div>
        <button
          onClick={() => router.push('/tontines/nouveau')}
          className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-md"
        >
          <Plus className="w-5 h-5" />
          Nouvelle tontine
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}

      {/* Empty State */}
      {contracts.length === 0 && !loading && (
        <div className="text-center py-16">
          <Eye className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-600 text-lg">Aucune tontine pour le moment</p>
          <p className="text-slate-500 text-sm mt-2">Créez votre première tontine d'épargne programmée</p>
          <button
            onClick={() => router.push('/tontines/nouveau')}
            className="mt-6 inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-all"
          >
            <Plus className="w-4 h-4" />
            Créer une tontine
          </button>
        </div>
      )}

      {/* Mobile Card Layout */}
      <div className="md:hidden space-y-4">
        {contracts.map((contract) => {
          const isExpanded = expandedId === contract._id;
          const daysRemaining = calculateDaysRemaining(contract.dateFinPrevue);
          const config = STATUT_CONFIG[contract.statut];
          
          return (
            <div key={contract._id} className="bg-white rounded-lg shadow-md overflow-hidden border border-slate-200">
              {/* Card Header */}
              <div className="p-4 bg-slate-50 border-b border-slate-200">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-900">{contract.periodicite === 'JOURNALIERE' ? 'Quotidien' : 'Hebdomadaire'}</h3>
                    <p className="text-sm text-slate-600">{contract.dureeMois} mois</p>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${config.bg}`}>
                    {getStatusIcon(contract.statut)}
                    <span className={config.color}>{config.label}</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div>
                    <p className="text-xs text-slate-500">Montant/versement</p>
                    <p className="font-semibold text-slate-900">{contract.montantVersement} {contract.devise}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Jours restants</p>
                    <p className="font-semibold text-slate-900">{Math.max(0, daysRemaining)}</p>
                  </div>
                </div>
              </div>

              <div className="px-4 pb-3">
                <button
                  onClick={() => router.push(`/tontines/${contract._id}`)}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100"
                >
                  Voir détail
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              {/* Expandable Details */}
              <button
                onClick={() => setExpandedId(isExpanded ? null : contract._id)}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors border-t border-slate-200"
              >
                <span className="text-slate-700 font-medium text-sm">Voir plus</span>
                <ChevronDown
                  className={`w-5 h-5 text-slate-500 transition-transform ${
                    isExpanded ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {isExpanded && (
                <div className="px-4 py-4 bg-slate-50 border-t border-slate-200 grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-slate-500">Destination</p>
                    <p className="font-medium text-slate-900">{contract.compteDestinationType}</p>
                    <p className="text-xs text-slate-600 mt-1">{contract.compteDestinationLibelle}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Frais plateforme</p>
                    <p className="font-medium text-slate-900">{contract.fraisPlateformePercent}%</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Début</p>
                    <p className="font-medium text-slate-900">{formatDate(contract.dateDebut)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Fin prévue</p>
                    <p className="font-medium text-slate-900">{formatDate(contract.dateFinPrevue)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Pénalité sortie</p>
                    <p className="font-medium text-slate-900">{contract.penaliteSortiePercent}%</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Pénalité défaut</p>
                    <p className="font-medium text-slate-900">{contract.penaliteDefautPercent}%</p>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Desktop Table Layout */}
      <div className="hidden md:block">
        <div className="bg-white rounded-lg shadow-md overflow-hidden border border-slate-200">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">Périodicité</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">Durée</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">Montant</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">Destination</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">Fin prévue</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">Statut</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">Jours</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">Action</th>
              </tr>
            </thead>
            <tbody>
              {contracts.map((contract) => {
                const daysRemaining = calculateDaysRemaining(contract.dateFinPrevue);
                const config = STATUT_CONFIG[contract.statut];
                
                return (
                  <tr key={contract._id} className="border-b border-slate-200 hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-sm text-slate-900 font-medium">
                      {contract.periodicite === 'JOURNALIERE' ? 'Quotidien' : 'Hebdomadaire'}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-700">{contract.dureeMois} mois</td>
                    <td className="px-6 py-4 text-sm font-semibold text-slate-900">
                      {contract.montantVersement} {contract.devise}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-700">{contract.compteDestinationLibelle}</td>
                    <td className="px-6 py-4 text-sm text-slate-700">{formatDate(contract.dateFinPrevue)}</td>
                    <td className="px-6 py-4">
                      <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${config.bg}`}>
                        {getStatusIcon(contract.statut)}
                        <span className={config.color}>{config.label}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-slate-900">
                      {Math.max(0, daysRemaining)}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => router.push(`/tontines/${contract._id}`)}
                        className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                      >
                        Détail
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
