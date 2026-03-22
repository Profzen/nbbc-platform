"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Plus, Search, MoreVertical, Users, Phone, PenTool, Upload, Globe2, Building2, Layers } from 'lucide-react';

type ImportResult = {
  totalRows: number;
  created: number;
  updated: number;
  skipped: number;
};

export default function ClientsPage() {
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [importing, setImporting] = useState(false);
  const [importMessage, setImportMessage] = useState('');
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredClients = clients.filter(c => 
    c.nom?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.prenom?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const dashboard = useMemo(() => {
    const serviceCount = new Map<string, number>();
    const countryCount = new Map<string, number>();
    const typeCount = new Map<string, number>();

    clients.forEach((client) => {
      const services = client.servicesUtilises?.length ? client.servicesUtilises : ['AUTRE'];
      services.forEach((service: string) => {
        serviceCount.set(service, (serviceCount.get(service) || 0) + 1);
      });

      const country = (client.paysResidence || 'INCONNU').toUpperCase();
      countryCount.set(country, (countryCount.get(country) || 0) + 1);

      const type = client.typeClient || 'PARTICULIER';
      typeCount.set(type, (typeCount.get(type) || 0) + 1);
    });

    const byService = Array.from(serviceCount.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);

    const byCountry = Array.from(countryCount.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);

    const byType = Array.from(typeCount.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    return { byService, byCountry, byType };
  }, [clients]);

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

  const handleCsvImport = async (file: File) => {
    setImporting(true);
    setImportMessage('Import en cours...');
    setImportResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/clients/import', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || 'Erreur import CSV.');
      }

      setImportResult(data.data);
      setImportMessage('Import terminé avec succès.');
      fetchClients();
    } catch (error: any) {
      setImportMessage(error.message || 'Erreur pendant l\'import.');
    } finally {
      setImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);


  return (
    <div className="p-8 max-w-7xl mx-auto">
      <header className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Gestion des Clients</h1>
          <p className="text-slate-500 mt-1">Gérez votre portefeuille clients et pilotez la répartition par service, type et pays.</p>
        </div>
        <div className="flex items-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleCsvImport(file);
            }}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-2.5 rounded-xl font-medium shadow-sm flex items-center gap-2 disabled:opacity-60"
          >
            {importing ? <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div> : <Upload size={18} />}
            Importer CSV
          </button>
          <Link 
            href="/clients/nouveau" 
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-5 py-2.5 rounded-xl font-medium shadow-md shadow-blue-500/30 flex items-center gap-2 transition-all hover:scale-105 active:scale-95"
          >
            <Plus size={20} />
            Nouveau Client
          </Link>
        </div>
      </header>

      {(importMessage || importResult) && (
        <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          {importMessage && <p className="text-sm text-slate-700 font-medium">{importMessage}</p>}
          {importResult && (
            <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div className="bg-slate-50 rounded-lg px-3 py-2"><span className="text-slate-500">Lignes</span><p className="font-bold text-slate-800">{importResult.totalRows}</p></div>
              <div className="bg-emerald-50 rounded-lg px-3 py-2"><span className="text-emerald-600">Créés</span><p className="font-bold text-emerald-700">{importResult.created}</p></div>
              <div className="bg-blue-50 rounded-lg px-3 py-2"><span className="text-blue-600">Mis à jour</span><p className="font-bold text-blue-700">{importResult.updated}</p></div>
              <div className="bg-amber-50 rounded-lg px-3 py-2"><span className="text-amber-600">Ignorés</span><p className="font-bold text-amber-700">{importResult.skipped}</p></div>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-slate-700">Par Service</h2>
            <Layers size={16} className="text-slate-400" />
          </div>
          <div className="space-y-2">
            {dashboard.byService.slice(0, 5).map((item) => (
              <div key={item.name} className="flex items-center justify-between text-sm">
                <span className="font-medium text-slate-600">{item.name}</span>
                <span className="font-bold text-slate-800">{item.value}</span>
              </div>
            ))}
            {dashboard.byService.length === 0 && <p className="text-sm text-slate-400">Aucune donnée</p>}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-slate-700">Par Pays</h2>
            <Globe2 size={16} className="text-slate-400" />
          </div>
          <div className="space-y-2">
            {dashboard.byCountry.slice(0, 5).map((item) => (
              <div key={item.name} className="flex items-center justify-between text-sm">
                <span className="font-medium text-slate-600">{item.name}</span>
                <span className="font-bold text-slate-800">{item.value}</span>
              </div>
            ))}
            {dashboard.byCountry.length === 0 && <p className="text-sm text-slate-400">Aucune donnée</p>}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-slate-700">Par Type Client</h2>
            <Building2 size={16} className="text-slate-400" />
          </div>
          <div className="space-y-2">
            {dashboard.byType.map((item) => (
              <div key={item.name} className="flex items-center justify-between text-sm">
                <span className="font-medium text-slate-600">{item.name.replace('_', ' ')}</span>
                <span className="font-bold text-slate-800">{item.value}</span>
              </div>
            ))}
            {dashboard.byType.length === 0 && <p className="text-sm text-slate-400">Aucune donnée</p>}
          </div>
        </div>
      </div>

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
