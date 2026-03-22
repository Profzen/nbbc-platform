"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Plus, Search, MoreVertical, Users, Phone, PenTool, Upload, Globe2, Building2, Layers, X } from 'lucide-react';
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

type ImportResult = {
  totalRows: number;
  created: number;
  updated: number;
  skipped: number;
};

type ColumnMapping = {
  firstName: string | null;
  lastName: string | null;
  middleName: string | null;
  email: string | null;
  phone: string | null;
  country: string | null;
  company: string | null;
  customField: string | null;
  notes: string | null;
};

const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#6366f1', '#f97316'];

export default function ClientsPage() {
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [importing, setImporting] = useState(false);
  const [importMessage, setImportMessage] = useState('');
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [showMappingModal, setShowMappingModal] = useState(false);
  const [csvColumns, setCsvColumns] = useState<string[]>([]);
  const [csvSamples, setCsvSamples] = useState<any[]>([]);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({
    firstName: null,
    lastName: null,
    middleName: null,
    email: null,
    phone: null,
    country: null,
    company: null,
    customField: null,
    notes: null,
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
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
      .sort((a, b) => b.value - a.value);

    const byCountry = Array.from(countryCount.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

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

  const handleCsvSelect = async (file: File) => {
    setSelectedFile(file);
    
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/clients/import/preview', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (data.success) {
        setCsvColumns(data.data.columns);
        setCsvSamples(data.data.sampleRows);
        setColumnMapping(data.data.detectedMapping || columnMapping);
        setShowMappingModal(true);
      }
    } catch (error) {
      console.error('Error previewing CSV:', error);
    }
  };

  const handleImport = async () => {
    if (!selectedFile) return;

    setImporting(true);
    setImportMessage('Import en cours...');
    setImportResult(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('mapping', JSON.stringify(columnMapping));

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
      setShowMappingModal(false);
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
              if (file) handleCsvSelect(file);
            }}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-2.5 rounded-xl font-medium shadow-sm flex items-center gap-2"
          >
            <Upload size={18} />
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Layers size={18} className="text-blue-600" />
            <h2 className="text-sm font-bold text-slate-700">Distribution par Service</h2>
          </div>
          {dashboard.byService.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={dashboard.byService.slice(0, 6)}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {dashboard.byService.slice(0, 6).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-slate-400">
              Aucune donnée
            </div>
          )}
          <div className="mt-4 space-y-1 text-xs">
            {dashboard.byService.slice(0, 6).map((item, idx) => (
              <div key={item.name} className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></span>
                <span className="text-slate-600">{item.name}</span>
                <span className="ml-auto font-bold text-slate-800">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Globe2 size={18} className="text-green-600" />
            <h2 className="text-sm font-bold text-slate-700">Distribution par Pays</h2>
          </div>
          {dashboard.byCountry.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={dashboard.byCountry.slice(0, 8)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" fontSize={12} tick={{ fill: '#64748b' }} />
                <YAxis fontSize={12} tick={{ fill: '#64748b' }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px' }}
                />
                <Bar dataKey="value" fill="#10b981" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-slate-400">
              Aucune donnée
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Building2 size={18} className="text-purple-600" />
            <h2 className="text-sm font-bold text-slate-700">Distribution par Type</h2>
          </div>
          {dashboard.byType.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={dashboard.byType} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" fontSize={12} tick={{ fill: '#64748b' }} />
                <YAxis dataKey="name" type="category" fontSize={12} tick={{ fill: '#64748b' }} width={100} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px' }}
                />
                <Bar dataKey="value" fill="#8b5cf6" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-slate-400">
              Aucune donnée
            </div>
          )}
        </div>
      </div>

      {showMappingModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 p-6 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-slate-800">Mapping des Colonnes</h2>
                <p className="text-sm text-slate-500 mt-1">Mappez les colonnes de votre CSV à nos champs</p>
              </div>
              <button
                onClick={() => setShowMappingModal(false)}
                className="p-2 hover:bg-slate-100 rounded-lg"
              >
                <X size={20} className="text-slate-400" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { key: 'firstName', label: 'Prénom' },
                  { key: 'lastName', label: 'Nom' },
                  { key: 'middleName', label: 'Deuxième Prénom' },
                  { key: 'email', label: 'Email' },
                  { key: 'phone', label: 'Téléphone' },
                  { key: 'country', label: 'Pays' },
                  { key: 'company', label: 'Entreprise' },
                  { key: 'customField', label: 'Service/Domaine' },
                ].map((field) => (
                  <div key={field.key}>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      {field.label}
                    </label>
                    <select
                      value={columnMapping[field.key as keyof ColumnMapping] || ''}
                      onChange={(e) =>
                        setColumnMapping({
                          ...columnMapping,
                          [field.key]: e.target.value || null,
                        })
                      }
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white hover:border-slate-300 focus:outline-none focus:border-blue-500"
                    >
                      <option value="">-- Non mappé --</option>
                      {csvColumns.map((col) => (
                        <option key={col} value={col}>
                          {col}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-700 mb-3">Aperçu des données</h3>
                <div className="bg-slate-50 rounded-lg overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-100">
                        {csvColumns.map((col) => (
                          <th key={col} className="px-3 py-2 text-left text-slate-700 font-semibold whitespace-nowrap">
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {csvSamples.map((row, idx) => (
                        <tr key={idx} className="border-b border-slate-200 hover:bg-slate-100">
                          {csvColumns.map((col) => (
                            <td key={col} className="px-3 py-2 text-slate-600 whitespace-nowrap text-xs">
                              {row[col] || '—'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-200">
                <button
                  onClick={() => setShowMappingModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 font-medium"
                >
                  Annuler
                </button>
                <button
                  onClick={handleImport}
                  disabled={importing}
                  className="ml-auto px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg font-medium disabled:opacity-60 flex items-center gap-2"
                >
                  {importing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Importation...
                    </>
                  ) : (
                    <>
                      <Upload size={16} />
                      Importer
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center gap-3 bg-slate-50 rounded-lg px-4 py-2">
            <Search size={18} className="text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher par nom, prénom ou email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent flex-1 outline-none text-slate-700 placeholder-slate-400"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold text-slate-700">Nom</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-slate-700">Email</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-slate-700">Téléphone</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-slate-700">Pays</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-slate-700">Services</th>
                <th className="px-6 py-3 text-right text-xs font-bold text-slate-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                  </td>
                </tr>
              ) : (
                filteredClients.map((client) => (
                  <tr key={client._id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-3 text-sm font-medium text-slate-800">{client.nom} {client.prenom}</td>
                    <td className="px-6 py-3 text-sm text-slate-600">{client.email}</td>
                    <td className="px-6 py-3 text-sm text-slate-600">{client.telephone || '—'}</td>
                    <td className="px-6 py-3 text-sm text-slate-600">{client.paysResidence || '—'}</td>
                    <td className="px-6 py-3 text-sm">
                      <div className="flex flex-wrap gap-1">
                        {(client.servicesUtilises || []).map((service: string) => (
                          <span key={service} className="inline-block bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-medium">
                            {service}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-3 text-right">
                      <button className="p-2 hover:bg-slate-200 rounded-lg transition-colors">
                        <MoreVertical size={16} className="text-slate-400" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          {!loading && filteredClients.length === 0 && (
            <div className="px-6 py-12 text-center text-slate-500">
              Aucun client trouvé
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
