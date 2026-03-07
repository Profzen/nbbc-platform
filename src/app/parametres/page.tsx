"use client";

import { Settings, Shield, Bell, User } from 'lucide-react';

export default function ParametresPage() {
  return (
    <div className="p-8 max-w-5xl mx-auto">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800">Paramètres</h1>
        <p className="text-slate-500 mt-1">Gérez les préférences de votre plateforme et votre compte utilisateur.</p>
      </header>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex min-h-[500px]">
        {/* Sidebar des params */}
        <div className="w-64 bg-slate-50 border-r border-slate-200 p-4">
          <nav className="space-y-1">
            <button className="w-full text-left px-4 py-2.5 bg-white text-blue-600 font-medium rounded-lg shadow-sm border border-slate-200 flex items-center gap-3">
              <User size={18} /> Mon Profil
            </button>
            <button className="w-full text-left px-4 py-2.5 text-slate-600 hover:bg-slate-100 font-medium rounded-lg flex items-center gap-3 transition-colors">
              <Shield size={18} /> Sécurité
            </button>
            <button className="w-full text-left px-4 py-2.5 text-slate-600 hover:bg-slate-100 font-medium rounded-lg flex items-center gap-3 transition-colors">
              <Bell size={18} /> Notifications
            </button>
          </nav>
        </div>

        {/* Contenu */}
        <div className="flex-1 p-8">
          <h2 className="text-xl font-bold text-slate-800 mb-6">Mon Profil</h2>
          <div className="space-y-6 max-w-md">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Nom d'affichage</label>
              <input type="text" className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-500 cursor-not-allowed" value="..." disabled />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Email de connexion</label>
              <input type="email" className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-500 cursor-not-allowed" value="..." disabled />
            </div>
            <div className="pt-4 border-t border-slate-100">
              <button className="bg-blue-600 text-white px-6 py-2.5 rounded-lg font-medium shadow hover:bg-blue-700">
                Enregistrer les modifications
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
