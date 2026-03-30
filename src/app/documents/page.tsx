"use client";

import { useState, useEffect, useRef, type ChangeEvent } from 'react';
import { FileText, Search, User, CheckCircle, Clock } from 'lucide-react';
import { uploadFileToCloudinary } from '@/lib/cloudinary-upload-client';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function DocumentsPage() {
  const [clients, setClients] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = () => {
    fetch('/api/clients')
      .then(res => res.json())
      .then(data => {
        if(data.success) {
          setClients(data.data);
        }
        setLoading(false);
      })
      .catch(err => setLoading(false));
  };

  const filteredClients = clients.filter(c => 
    c.nom?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.prenom?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleUploadSuccess = async (result: any) => {
    if (!selectedClient) return;
    
    const info = result.info;
    const documentData = {
      nom: info.original_filename || 'Document KYC',
      url: info.secure_url,
      format: info.format,
      publicId: info.public_id,
    };

    try {
      const res = await fetch(`/api/clients/${selectedClient._id}/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(documentData)
      });
      const data = await res.json();
      if (data.success) {
        // Rafraîchir les données du client
        setSelectedClient(data.data);
        fetchClients(); // Rafraîchir la liste générale
      }
    } catch (e) {
      console.error(e);
    }
  };

  const onPickFiles = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (!selectedClient || files.length === 0) return;

    setUploading(true);
    try {
      for (const file of files.slice(0, 5)) {
        const uploaded = await uploadFileToCloudinary(file, {
          folder: 'kyc-documents',
          resourceType: 'auto',
        });

        await handleUploadSuccess({
          info: {
            original_filename: uploaded.originalFilename,
            secure_url: uploaded.secureUrl,
            format: uploaded.format,
            public_id: uploaded.publicId,
          },
        });
      }
    } catch (e: any) {
      alert(e?.message || 'Upload impossible. Vérifiez la configuration Cloudinary.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto min-h-[calc(100vh-4rem)] flex flex-col">
      <header className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center mb-6 sm:mb-8 shrink-0">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">Documents KYC</h1>
          <p className="text-slate-500 mt-1 text-sm sm:text-base">Consultez et validez les documents d'identité et justificatifs de vos clients.</p>
        </div>
      </header>

      <div className="flex flex-col lg:flex-row gap-4 sm:gap-6 flex-1 overflow-visible lg:overflow-hidden">
        {/* Barre latérale des clients */}
        <div className="w-full lg:w-1/3 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden relative min-h-[320px] lg:min-h-0">
          <div className="p-4 border-b border-slate-100 bg-slate-50 relative z-10">
            <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
              <Search size={18} className="text-slate-400" /> Recherche
            </h3>
            <input 
              type="text" 
              placeholder="Nom du client..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm mb-1 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {loading ? (
              <LoadingSpinner className="p-4" label="Chargement des clients..." size="sm" />
            ) : filteredClients.map(client => (
              <button 
                key={client._id}
                onClick={() => setSelectedClient(client)}
                className={`w-full text-left p-3 rounded-xl flex items-center gap-3 transition-colors mb-1 ${selectedClient?._id === client._id ? 'bg-emerald-50 border border-emerald-100' : 'hover:bg-slate-50 border border-transparent'}`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${selectedClient?._id === client._id ? 'bg-emerald-200 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>
                  {client.prenom[0]}{client.nom[0]}
                </div>
                <div className="overflow-hidden">
                  <div className={`font-bold truncate ${selectedClient?._id === client._id ? 'text-emerald-800' : 'text-slate-700'}`}>
                    {client.prenom} {client.nom}
                  </div>
                  <div className="text-xs text-slate-400 truncate flex items-center gap-1 mt-0.5">
                    {client.statutKyc === 'VALIDE' ? <CheckCircle size={12} className="text-emerald-500"/> : <Clock size={12} className="text-amber-500"/>}
                    {client.documents?.length || 0} document(s)
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Espace Document */}
        <div className="w-full lg:w-2/3 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden relative min-h-[420px]">
          {selectedClient ? (
            <>
              <div className="p-4 sm:p-6 border-b border-slate-100 flex flex-col gap-4 lg:flex-row lg:justify-between lg:items-center bg-slate-50/50">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center text-slate-600">
                    <User size={24} />
                  </div>
                  <div>
                    <h2 className="text-lg sm:text-xl font-bold text-slate-800">{selectedClient.prenom} {selectedClient.nom}</h2>
                    <p className="text-xs sm:text-sm text-slate-500 break-all">{selectedClient.email} • {selectedClient.typeClient}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".pdf,.png,.jpg,.jpeg,.webp"
                    className="hidden"
                    onChange={onPickFiles}
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-medium shadow transition-colors disabled:opacity-60 inline-flex items-center gap-2"
                  >
                    {uploading ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                        Upload en cours...
                      </>
                    ) : (
                      'Ajouter un Document'
                    )}
                  </button>
                </div>
              </div>

              <div className="flex-1 p-4 sm:p-6 overflow-y-auto bg-slate-50/30">
                {!selectedClient.documents || selectedClient.documents.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center text-slate-400">
                    <FileText size={48} className="mb-4 opacity-50" />
                    <p>Aucun document KYC associé à ce profil pour le moment.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedClient.documents.map((doc: any, i: number) => (
                      <a 
                        key={i} 
                        href={doc.url} 
                        target="_blank" 
                        rel="noreferrer"
                        className="p-4 bg-white border border-slate-200 rounded-xl hover:border-emerald-300 hover:shadow-md transition-all group flex items-start gap-4"
                      >
                        <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400 group-hover:bg-emerald-50 group-hover:text-emerald-500 transition-colors">
                          <FileText size={24} />
                        </div>
                        <div className="overflow-hidden flex-1">
                          <h4 className="font-bold text-sm text-slate-700 truncate group-hover:text-emerald-700">{doc.nom}</h4>
                          <p className="text-xs text-slate-400 uppercase mt-0.5">{doc.format} • {new Date(doc.dateRecep).toLocaleDateString()}</p>
                          <span className="inline-block mt-2 text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-700">
                            {doc.status}
                          </span>
                        </div>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-12 text-center bg-slate-50 border-dashed border-2 border-slate-200 m-4 sm:m-8 rounded-2xl">
                <User size={48} className="text-slate-300 mb-4" />
                <h3 className="text-lg font-bold text-slate-700">Sélectionnez un profil</h3>
                <p className="text-slate-500 mt-2 max-w-sm">
                  Choisissez un client dans la liste de gauche pour consulter ou uploader ses documents d'identité (KYC).
                </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
