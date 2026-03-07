"use client";

import { CreditCard, Wallet, Plus, Search } from 'lucide-react';

export default function CartesPage() {
  return (
    <div className="p-8 max-w-7xl mx-auto">
      <header className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Cartes & Comptes</h1>
          <p className="text-slate-500 mt-1">Gérez les moyens de paiement, les comptes Zelle, CashApp et bancaires associés aux clients.</p>
        </div>
        <button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-5 py-2.5 rounded-xl font-medium shadow-md flex items-center gap-2 transition-all">
          <Plus size={20} />
          Nouveau Compte
        </button>
      </header>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-16 text-center">
        <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-blue-50 text-blue-500 mb-6 border-8 border-blue-50/50">
          <Wallet size={36} />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Aucun moyen de paiement enregistré</h2>
        <p className="text-slate-500 max-w-md mx-auto mb-8">
          La base de données des cartes et comptes n'est pas encore synchronisée ou est vide. Commencez par lier un nouveau compte Zelle ou bancaire à un client.
        </p>
        <button className="bg-slate-900 text-white px-6 py-3 rounded-xl font-medium shadow transition-all hover:bg-slate-800">
          Enregistrer un compte
        </button>
      </div>
    </div>
  );
}
