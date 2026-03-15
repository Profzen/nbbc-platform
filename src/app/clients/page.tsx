"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Search, MoreVertical, Users, Phone, PenTool } from 'lucide-react';
export default function ClientsPage() {
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredClients = clients.filter(c => 
    c.nom?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.prenom?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const fetchClients = () => {
    fetch('/api/clients')
      .then(res => res.json())
      .then(data => {
        if(data.success) {
          setClients(data.data);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchClients();
  }, []);


  return (
    <div className="p-8 max-w-7xl mx-auto">
      <header className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Gestion des Clients</h1>
          <p className="text-slate-500 mt-1">Gérez votre portefeuille de clients et leurs informations liées aux services financiers NBBC.</p>
        </div>
        <Link 
          href="/clients/nouveau" 
          className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-5 py-2.5 rounded-xl font-medium shadow-md shadow-blue-500/30 flex items-center gap-2 transition-all hover:scale-105 active:scale-95"
        >
          <Plus size={20} />
          Nouveau Client
        </Link>
      </header>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div className="relative w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Rechercher par nom, email..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-white"
            />
          </div>
          <div className="text-sm text-slate-500 font-medium bg-slate-100 px-3 py-1 rounded-lg">
            {filteredClients.length} client(s) affiché(s)
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-sm border-b border-slate-200">
                <th className="px-6 py-4 font-semibold uppercase tracking-wider text-xs">Client</th>
                <th className="px-6 py-4 font-semibold uppercase tracking-wider text-xs">Email</th>
                <th className="px-6 py-4 font-semibold uppercase tracking-wider text-xs">Type & Pays</th>
                <th className="px-6 py-4 font-semibold uppercase tracking-wider text-xs">Téléphone</th>
                <th className="px-6 py-4 font-semibold text-right"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    Chargement des clients...
                  </td>
                </tr>
              ) : filteredClients.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center">
                    <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-blue-500 mb-4">
                      <Users size={32} />
                    </div>
                    <h3 className="text-lg font-medium text-slate-900">Aucun résultat</h3>
                    <p className="text-slate-500 mb-4 text-sm max-w-sm mx-auto mt-1">
                      {clients.length === 0 ? "Vous n'avez pas encore de clients dans votre base de données." : "Aucun client ne correspond à votre recherche."}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredClients.map((client) => (
                  <tr key={client._id} className="border-b border-slate-100 font-medium hover:bg-slate-50/80 transition-colors group cursor-pointer">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm shadow-sm border border-indigo-200">
                          {client.prenom[0]?.toUpperCase()}{client.nom[0]?.toUpperCase()}
                        </div>
                        <div>
                          <div className="text-slate-800 font-bold group-hover:text-blue-600 transition-colors">
                            {client.prenom} {client.nom}
                          </div>
                        <div className="flex gap-1 mt-1">
                          {client.servicesUtilises?.slice(0, 3).map((service: string) => (
                            <span key={service} className="text-[10px] bg-slate-200 text-slate-600 px-1.5 rounded-sm">
                              {service}
                            </span>
                          ))}
                          {client.servicesUtilises?.length > 3 && (
                            <span className="text-[10px] bg-slate-200 text-slate-600 px-1.5 rounded-sm">+{client.servicesUtilises.length - 3}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-slate-700 text-sm font-semibold">{client.email}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1 items-start">
                      <span className="bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-md text-xs font-bold border border-slate-200">
                        {client.typeClient?.replace('_', ' ')}
                      </span>
                      <span className="text-slate-500 text-xs font-medium">{client.paysResidence}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-slate-600 font-semibold text-sm">
                      <Phone size={14} className="text-slate-400" />
                      {client.telephone || <span className="text-slate-300 font-normal italic">Non renseigné</span>}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Link href={`/signatures`} className="p-2 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition-colors border border-transparent hover:border-indigo-100 flex items-center gap-1.5 text-xs font-bold" title="Créer une demande de signature">
                        <PenTool size={16} /> Signer
                      </Link>
                      <button className="p-2 text-slate-400 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition-colors">
                        <MoreVertical size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
