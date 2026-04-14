"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, AlertCircle, CheckCircle } from 'lucide-react';

export default function NouveauTontinePage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    periodicite: 'HEBDOMADAIRE',
    dureeMois: 3,
    montantVersement: '',
    compteDestinationType: 'CRYPTO',
    compteDestinationLibelle: '',
    compteDestinationReference: '',
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'montantVersement' ? parseFloat(value) || '' : value
    }));
  };

  const validateStep1 = () => {
    if (!formData.montantVersement || formData.montantVersement <= 0) {
      setError('Le montant du versement doit être supérieur à 0');
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (!formData.compteDestinationLibelle.trim()) {
      setError('Le libellé du compte de destination est obligatoire');
      return false;
    }
    return true;
  };

  const handleNextStep = () => {
    setError(null);
    if (step === 1 && validateStep1()) {
      setStep(2);
    } else if (step === 2 && validateStep2()) {
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const payload = {
        ...formData,
        montantVersement: Number(formData.montantVersement),
        devise: 'XOF',
      };

      const res = await fetch('/api/tontines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!data.success) {
        setError(data.error || 'Erreur lors de la création de la tontine');
        setLoading(false);
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        router.push('/tontines');
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Erreur de connexion');
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 flex items-center justify-center p-4 pt-20 md:pt-0">
        <div className="bg-white rounded-lg shadow-xl p-8 text-center max-w-md w-full">
          <div className="mb-6 flex justify-center">
            <div className="bg-green-100 p-3 rounded-full">
              <CheckCircle className="w-12 h-12 text-green-600" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Tontine créée ✓</h2>
          <p className="text-slate-600 mb-6">Votre contrat d'épargne programmée a été créé avec succès</p>
          <p className="text-sm text-slate-500">Redirection en cours...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-4 md:p-8 pt-20 md:pt-8">
      <div className="max-w-2xl mx-auto">
        {/* Back Button */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-6 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Retour
        </button>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Nouvelle tontine</h1>
          <p className="text-slate-600 mt-2">Créez un contrat d'épargne programmée</p>
        </div>

        {/* Progress Indicator */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex-1">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all ${
                step >= 1 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'
              }`}
            >
              1
            </div>
            <p className="text-sm text-slate-600 mt-2 text-center">Paramètres</p>
          </div>
          <div className="flex-1 h-1 mx-2 bg-slate-200 relative top-5">
            <div
              className={`h-full transition-all ${step >= 2 ? 'w-full bg-blue-600' : 'w-0'}`}
            />
          </div>
          <div className="flex-1">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all ${
                step >= 2 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'
              }`}
            >
              2
            </div>
            <p className="text-sm text-slate-600 mt-2 text-center">Destination</p>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold">Erreur</p>
              <p className="text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* Form */}
        <div className="bg-white rounded-lg shadow-lg p-6 md:p-8">
          {step === 1 ? (
            <div className="space-y-6">
              {/* Periodicité */}
              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-2">
                  Périodicité des versements
                </label>
                <select
                  name="periodicite"
                  value={formData.periodicite}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                >
                  <option value="JOURNALIERE">Quotidien (chaque jour)</option>
                  <option value="HEBDOMADAIRE">Hebdomadaire (chaque semaine)</option>
                </select>
              </div>

              {/* Durée */}
              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-2">
                  Durée du contrat
                </label>
                <select
                  name="dureeMois"
                  value={formData.dureeMois}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                >
                  <option value={3}>3 mois</option>
                  <option value={6}>6 mois</option>
                </select>
              </div>

              {/* Montant */}
              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-2">
                  Montant par versement (XOF)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    name="montantVersement"
                    placeholder="ex: 10000"
                    value={formData.montantVersement}
                    onChange={handleInputChange}
                    min="1"
                    step="100"
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  />
                  <span className="absolute right-4 top-3 text-slate-500">XOF</span>
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  Vous verserez {formData.montantVersement ? formData.montantVersement : '—'} XOF {
                    formData.periodicite === 'JOURNALIERE' ? 'chaque jour' : 'chaque semaine'
                  }
                </p>
              </div>

              {/* Info Box */}
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-900">
                  <strong>Frais plateforme:</strong> 10%
                  <br />
                  <strong>Pénalité sortie anticipée:</strong> 10%
                  <br />
                  <strong>Pénalité défaut de versement:</strong> 10%
                </p>
              </div>

              {/* Next Button */}
              <button
                onClick={handleNextStep}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-blue-800 transition-all shadow-md"
              >
                Suivant
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Type de compte */}
              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-2">
                  Type de compte de destination
                </label>
                <select
                  name="compteDestinationType"
                  value={formData.compteDestinationType}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                >
                  <option value="CRYPTO">Crypto-monnaie (Bitcoin, Ethereum...)</option>
                  <option value="MOBILE_MONEY">Mobile Money (Airtel, Orange...)</option>
                  <option value="CARTE">Carte bancaire</option>
                  <option value="BANQUE">Compte bancaire</option>
                </select>
                <p className="text-xs text-slate-500 mt-2">
                  C'est là que seront versés vos gains à la maturation du contrat
                </p>
              </div>

              {/* Libellé du compte */}
              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-2">
                  Libellé/Identifiant du compte
                </label>
                <input
                  type="text"
                  name="compteDestinationLibelle"
                  placeholder="ex: Mon portefeuille Bitcoin, Mon compte Orange..."
                  value={formData.compteDestinationLibelle}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                />
              </div>

              {/* Référence optionnelle */}
              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-2">
                  Référence du compte (optionnel)
                </label>
                <input
                  type="text"
                  name="compteDestinationReference"
                  placeholder="ex: Adresse Bitcoin, Numéro de compte..."
                  value={formData.compteDestinationReference}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                />
              </div>

              {/* Summary */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                <h3 className="font-semibold text-slate-900 mb-3">Résumé du contrat</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-slate-500">Périodicité</p>
                    <p className="font-semibold text-slate-900">
                      {formData.periodicite === 'JOURNALIERE' ? 'Quotidien' : 'Hebdomadaire'}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-500">Durée</p>
                    <p className="font-semibold text-slate-900">{formData.dureeMois} mois</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Montant/versement</p>
                    <p className="font-semibold text-slate-900">{formData.montantVersement} XOF</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Destination</p>
                    <p className="font-semibold text-slate-900 truncate">{formData.compteDestinationLibelle}</p>
                  </div>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 border border-slate-300 text-slate-900 py-3 rounded-lg font-semibold hover:bg-slate-50 transition-all"
                >
                  Retour
                </button>
                <button
                  onClick={handleNextStep}
                  disabled={loading}
                  className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 text-white py-3 rounded-lg font-semibold hover:from-green-700 hover:to-emerald-700 transition-all shadow-md disabled:opacity-50"
                >
                  {loading ? 'Création en cours...' : 'Créer la tontine'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Info */}
        <p className="text-xs text-slate-500 text-center mt-6">
          Vos données de compte de destination sont sécurisées et chiffrées
        </p>
      </div>
    </div>
  );
}
