"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, User, Briefcase } from 'lucide-react';

export default function NouveauClient() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nom: '', prenom: '', email: '', telephone: '', paysResidence: '', 
    typeClient: 'PARTICULIER', servicesUtilises: [] as string[]
  });

  const availableServices = ['ZELLE', 'CASH_APP', 'WIRE', 'PAYPAL', 'CRYPTO', 'EURO', 'WISE', 'AUTRE'];

  const handleServiceToggle = (service: string) => {
    setFormData(prev => ({
      ...prev,
      servicesUtilises: prev.servicesUtilises.includes(service)
        ? prev.servicesUtilises.filter(s => s !== service)
        : [...prev.servicesUtilises, service]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      const data = await res.json();
      if(data.success) {
        router.push('/clients');
        router.refresh(); // Rafraîchir la liste
      } else {
        alert('Erreur: ' + data.error);
      }
    } catch (err) {
      console.error(err);
      alert("Une erreur est survenue lors de l'enregistrement.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <Link href="/clients" className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-blue-600 mb-4 transition-colors">
          <ArrowLeft size={16} className="mr-1" /> Retour à la liste
        </Link>
        <h1 className="text-3xl font-bold text-slate-800">Ajouter un Client</h1>
        <p className="text-slate-500 mt-1">Créez un nouveau profil client dans la base de données NBBC.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Section Identité */}
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
          <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2 border-b border-slate-100 pb-4">
            <User className="text-blue-500" size={20} /> Identité & Contact
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Prénom <span className="text-red-500">*</span></label>
              <input required type="text" className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-slate-50 focus:bg-white" value={formData.prenom} onChange={e => setFormData({...formData, prenom: e.target.value})} placeholder="Jean" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Nom <span className="text-red-500">*</span></label>
              <input required type="text" className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-slate-50 focus:bg-white" value={formData.nom} onChange={e => setFormData({...formData, nom: e.target.value})} placeholder="Dupont" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Email <span className="text-red-500">*</span></label>
              <input required type="email" className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-slate-50 focus:bg-white" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} placeholder="jean.dupont@email.com" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Téléphone</label>
              <input type="tel" className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-slate-50 focus:bg-white" value={formData.telephone} onChange={e => setFormData({...formData, telephone: e.target.value})} placeholder="+33 6 12 34 56 78" />
            </div>
          </div>
        </div>

        {/* Section Profil NBBC */}
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
          <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2 border-b border-slate-100 pb-4">
            <Briefcase className="text-blue-500" size={20} /> Profil & Services
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Pays de résidence <span className="text-red-500">*</span></label>
              <input required type="text" className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-slate-50 focus:bg-white" value={formData.paysResidence} onChange={e => setFormData({...formData, paysResidence: e.target.value})} placeholder="France, Canada, etc." />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Type de Client</label>
              <select className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-slate-50 focus:bg-white font-semibold" value={formData.typeClient} onChange={e => setFormData({...formData, typeClient: e.target.value})}>
                <option value="PARTICULIER">Particulier</option>
                <option value="ENTREPRISE">Entreprise</option>
                <option value="INVESTISSEUR">Investisseur</option>
                <option value="PARTENAIRE">Partenaire</option>
              </select>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-3">Produits & Services utilisés</label>
            <div className="flex flex-wrap gap-3">
              {availableServices.map(service => {
                const isSelected = formData.servicesUtilises.includes(service);
                return (
                  <button
                    type="button"
                    key={service}
                    onClick={() => handleServiceToggle(service)}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all shadow-sm flex items-center ${isSelected ? 'bg-indigo-100 text-indigo-700 border-indigo-300 border-2' : 'bg-white text-slate-600 border-slate-200 border hover:border-blue-300 hover:bg-blue-50'}`}
                  >
                    {service.replace('_', ' ')}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4 pb-12">
          <button 
            type="submit" 
            disabled={loading}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-8 py-3.5 rounded-xl font-bold shadow-lg shadow-blue-500/30 flex items-center gap-2 transition-transform hover:-translate-y-1 hover:shadow-xl active:translate-y-0 disabled:opacity-70 disabled:transform-none"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <><Save size={20} /> Enregistrer le client</>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
