"use client";

import { useState, useEffect, useCallback } from 'react';
import { PenTool, FileText, Upload, Plus, Edit3, Trash2, Eye, Link2, CheckCircle, Clock, X, Code } from 'lucide-react';
import { CldUploadWidget } from 'next-cloudinary';

const TABS = [
  { id: 'requests', label: 'Demandes de Signatures', icon: PenTool },
  { id: 'templates', label: 'Modèles de Contrats', icon: FileText },
];

function htmlToEditableText(html: string): string {
  if (!html) return '';
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .trim();
}

export default function SignaturesAdminPage() {
  const cloudinaryApiKey = process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY;
  const hasCloudinaryApiKey = Boolean(cloudinaryApiKey);

  const [activeTab, setActiveTab] = useState('requests');
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  
  // Modals
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  
  // Forms
  const [requestForm, setRequestForm] = useState({ clientId: '', titre: '', typeSource: 'TEMPLATE', templateId: '', fichierPdfUrl: '' });
  const [templateForm, setTemplateForm] = useState({ id: '', nom: '', contenuTexte: '' });

  // Nouvellement généré
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [resReq, resTpl, resCli] = await Promise.all([
      fetch('/api/signatures/requests'),
      fetch('/api/signatures/templates'),
      fetch('/api/clients')
    ]);
    const reqData = await resReq.json();
    const tplData = await resTpl.json();
    const cliData = await resCli.json();

    if (reqData.success) setRequests(reqData.data);
    if (tplData.success) setTemplates(tplData.data);
    if (cliData.success) setClients(cliData.data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // --- Actions Templates ---
  const saveTemplate = async () => {
    const isEdit = !!templateForm.id;
    const url = isEdit ? `/api/signatures/templates/${templateForm.id}` : '/api/signatures/templates';
    const method = isEdit ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method, headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nom: templateForm.nom, contenuTexte: templateForm.contenuTexte })
    });
    
    if (res.ok) {
      setShowTemplateModal(false);
      fetchAll();
    }
  };

  const deleteTemplate = async (id: string) => {
    if(!confirm("Désactiver ce modèle ?")) return;
    await fetch(`/api/signatures/templates/${id}`, { method: 'DELETE' });
    fetchAll();
  };

  // --- Actions Requests ---
  const generateRequest = async () => {
    const res = await fetch('/api/signatures/requests/generate', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientId: requestForm.clientId,
        titreDocument: requestForm.titre,
        typeSource: requestForm.typeSource,
        templateId: requestForm.templateId || undefined,
        fichierPdfUrl: requestForm.fichierPdfUrl || undefined,
      })
    });
    const data = await res.json();
    
    if (data.success) {
      setGeneratedLink(window.location.origin + data.urlSignature);
      fetchAll();
    } else {
      alert("Erreur: " + data.error);
    }
  };

  const copyLink = (link: string) => {
    navigator.clipboard.writeText(link);
    alert('Lien copié dans le presse-papiers');
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      
      {/* HEADER */}
      <header className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-black text-slate-800">E-Signature</h1>
          <p className="text-slate-500 mt-1">Gérez vos contrats, modèles et demandes de signature électroniques.</p>
        </div>
        
        {activeTab === 'requests' ? (
          <button onClick={() => { setRequestForm({ clientId: '', titre: '', typeSource: 'TEMPLATE', templateId: '', fichierPdfUrl: '' }); setGeneratedLink(null); setShowRequestModal(true); }} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-md shadow-indigo-200 transition flex items-center gap-2">
            <Plus size={18} /> Nouvelle Demande
          </button>
        ) : (
          <button onClick={() => { setTemplateForm({ id: '', nom: '', contenuTexte: '' }); setShowTemplateModal(true); }} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-md shadow-indigo-200 transition flex items-center gap-2">
            <Plus size={18} /> Nouveau Modèle
          </button>
        )}
      </header>

      {/* TABS */}
      <div className="flex gap-2 border-b border-slate-200">
        {TABS.map(tab => {
          const Icon = tab.icon;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`px-5 py-3 border-b-2 font-bold flex items-center gap-2 transition-colors ${activeTab === tab.id ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
              <Icon size={18} /> {tab.label}
            </button>
          )
        })}
      </div>

      {loading ? (
        <div className="text-center py-20 text-slate-400">Chargement...</div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          
          {/* TAB : REQUÊTES */}
          {activeTab === 'requests' && (
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 font-bold">
                <tr>
                  <th className="px-6 py-4">Document</th>
                  <th className="px-6 py-4">Client</th>
                  <th className="px-6 py-4">Source</th>
                  <th className="px-6 py-4">Statut</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {requests.length === 0 ? (
                  <tr><td colSpan={5} className="py-12 text-center text-slate-400">Aucune demande trouvée.</td></tr>
                ) : requests.map(req => (
                  <tr key={req._id} className="hover:bg-slate-50 transition">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-800">{req.titreDocument}</div>
                      <div className="text-xs text-slate-400">{new Date(req.createdAt).toLocaleDateString('fr-FR')}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-700">{req.clientId?.nom} {req.clientId?.prenom}</div>
                      <div className="text-xs text-slate-400">{req.clientId?.email}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 text-[10px] font-black tracking-widest uppercase rounded-md border ${
                        req.typeSource === 'UPLOAD' ? 'bg-orange-50 text-orange-600 border-orange-100' : 'bg-blue-50 text-blue-600 border-blue-100'
                      }`}>
                        {req.typeSource}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-full ${
                        req.statut === 'SIGNE' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {req.statut === 'SIGNE' ? <CheckCircle size={14}/> : <Clock size={14}/>}
                        {req.statut === 'SIGNE' ? 'Signé' : 'En attente'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {req.statut === 'EN_ATTENTE' ? (
                        <button onClick={() => copyLink(window.location.origin + `/sign/${req.token}`)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg flex items-center justify-center ml-auto" title="Copier le lien public">
                          <Link2 size={18} />
                        </button>
                      ) : (
                        <a href={req.signatureImageUrl} target="_blank" className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg flex items-center justify-center ml-auto" title="Voir la signature">
                          <Eye size={18} />
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* TAB : TEMPLATES */}
          {activeTab === 'templates' && (
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {templates.map(tpl => (
                <div key={tpl._id} className="border border-slate-200 rounded-xl p-5 hover:border-indigo-300 transition shadow-sm relative group bg-white">
                  <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center mb-4">
                    <FileText size={24} />
                  </div>
                  <h3 className="font-bold text-slate-800 text-lg mb-1">{tpl.nom}</h3>
                  <p className="text-xs text-slate-400 mb-4">Créé le {new Date(tpl.createdAt).toLocaleDateString()}</p>
                  
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity absolute top-5 right-5">
                    <button onClick={() => { setTemplateForm({ id: tpl._id, nom: tpl.nom, contenuTexte: tpl.contenuTexte || htmlToEditableText(tpl.contenuHtml || '') }); setShowTemplateModal(true); }} className="p-2 bg-slate-100 text-slate-600 hover:text-indigo-600 rounded-lg"><Edit3 size={16}/></button>
                    <button onClick={() => deleteTemplate(tpl._id)} className="p-2 bg-slate-100 text-slate-600 hover:text-rose-600 rounded-lg"><Trash2 size={16}/></button>
                  </div>
                </div>
              ))}
              
              <button onClick={() => { setTemplateForm({ id: '', nom: '', contenuTexte: '' }); setShowTemplateModal(true); }} className="border-2 border-dashed border-slate-200 rounded-xl p-5 hover:border-indigo-400 hover:bg-indigo-50/50 transition flex flex-col items-center justify-center text-slate-400 hover:text-indigo-600 min-h-[180px]">
                <Plus size={32} className="mb-2" />
                <span className="font-bold">Créer un modèle</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* MODAL : REQUEST */}
      {showRequestModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
              <h2 className="font-bold text-lg text-slate-800">Émettre une demande de signature</h2>
              <button onClick={() => setShowRequestModal(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-5 flex-1">
              {!generatedLink ? (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Client cible *</label>
                    <select value={requestForm.clientId} onChange={e => setRequestForm({...requestForm, clientId: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50">
                      <option value="">Sélectionnez un client</option>
                      {clients.map(c => <option key={c._id} value={c._id}>{c.nom} {c.prenom} - {c.email}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Titre de la demande *</label>
                    <input type="text" placeholder="Ex: Contrat d'ouverture de compte" value={requestForm.titre} onChange={e => setRequestForm({...requestForm, titre: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Source du document *</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button onClick={() => setRequestForm({...requestForm, typeSource: 'TEMPLATE'})} className={`p-4 border-2 rounded-xl flex flex-col items-center gap-2 ${requestForm.typeSource === 'TEMPLATE' ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}>
                        <Code size={24} /> <span className="font-bold text-sm">Généré via Modèle</span>
                      </button>
                      <button onClick={() => setRequestForm({...requestForm, typeSource: 'UPLOAD'})} className={`p-4 border-2 rounded-xl flex flex-col items-center gap-2 ${requestForm.typeSource === 'UPLOAD' ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}>
                        <Upload size={24} /> <span className="font-bold text-sm">Upload PDF</span>
                      </button>
                    </div>
                  </div>

                  {requestForm.typeSource === 'TEMPLATE' ? (
                     <div>
                     <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Choix du modèle *</label>
                     <select value={requestForm.templateId} onChange={e => setRequestForm({...requestForm, templateId: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50">
                       <option value="">Sélectionnez un modèle</option>
                       {templates.map(t => <option key={t._id} value={t._id}>{t.nom}</option>)}
                     </select>
                   </div>
                  ) : (
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Fichier PDF *</label>
                      {requestForm.fichierPdfUrl ? (
                        <div className="bg-emerald-50 text-emerald-700 px-4 py-3 rounded-xl border border-emerald-200 font-medium flex justify-between items-center">
                          <span>✅ PDF Uploadé avec succès</span>
                          <button onClick={()=> setRequestForm({...requestForm, fichierPdfUrl: ''})} className="text-emerald-900"><X size={16}/></button>
                        </div>
                      ) : (
                        <CldUploadWidget 
                          apiKey={cloudinaryApiKey}
                          signatureEndpoint={hasCloudinaryApiKey ? '/api/cloudinary/sign' : undefined}
                          uploadPreset={hasCloudinaryApiKey ? undefined : 'ml_default'}
                          onSuccess={(res:any) => setRequestForm({...requestForm, fichierPdfUrl: res.info.secure_url})}
                          options={{ clientAllowedFormats: ['pdf'], maxFiles: 1 }}
                        >
                          {({ open }) => (
                            <button onClick={(_)=>open()} className="w-full py-8 border-2 border-dashed border-indigo-200 rounded-xl bg-indigo-50 flex flex-col items-center text-indigo-600 hover:bg-indigo-100 transition">
                              <Upload size={24} className="mb-2"/> <span className="font-bold">Cliquez pour ajouter le PDF</span>
                            </button>
                          )}
                        </CldUploadWidget>
                      )}
                      {!hasCloudinaryApiKey && (
                        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-2">
                          Configuration Cloudinary publique absente: upload en mode non-signé (upload preset).
                        </p>
                      )}
                    </div>
                  )}

                  <button onClick={generateRequest} disabled={!requestForm.clientId || !requestForm.titre || (requestForm.typeSource === 'TEMPLATE' ? !requestForm.templateId : !requestForm.fichierPdfUrl)} className="w-full py-3.5 mt-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg disabled:opacity-50">
                     Générer le lien de signature
                  </button>
                </>
              ) : (
                <div className="text-center py-6">
                  <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4"><CheckCircle size={40}/></div>
                  <h3 className="text-xl font-bold text-slate-800 mb-2">Demande créée avec succès !</h3>
                  <p className="text-slate-500 text-sm mb-6">Le document est prêt à être signé. Partagez ce lien unique et sécurisé à votre client.</p>
                  
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center gap-3">
                    <input type="text" readOnly value={generatedLink} className="flex-1 bg-transparent text-sm font-medium text-indigo-600 outline-none" />
                    <button onClick={() => copyLink(generatedLink)} className="bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-indigo-200">COPIER</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL : TEMPLATE */}
      {showTemplateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
              <h2 className="font-bold text-lg text-slate-800">{templateForm.id ? 'Modifier le modèle' : 'Créer un modèle de contrat'}</h2>
              <button onClick={() => setShowTemplateModal(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Nom du modèle *</label>
                <input type="text" value={templateForm.nom} onChange={e => setTemplateForm({...templateForm, nom: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-500" placeholder="Ex: Contrat Partenaire B2B" />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest">Contenu du contrat *</label>
                  <span className="text-xs text-slate-500">Variables : <code className="bg-slate-100 px-1 rounded text-pink-600">{'{{nom}}'}</code> <code className="bg-slate-100 px-1 rounded text-pink-600">{'{{prenom}}'}</code> <code className="bg-slate-100 px-1 rounded text-pink-600">{'{{email}}'}</code> <code className="bg-slate-100 px-1 rounded text-pink-600">{'{{date}}'}</code></span>
                </div>
                <textarea rows={16} value={templateForm.contenuTexte} onChange={e => setTemplateForm({...templateForm, contenuTexte: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 text-sm resize-none" placeholder="Écrivez votre contrat naturellement ici, sans code HTML..." />
              </div>
            </div>

            <div className="p-5 border-t border-slate-100 bg-slate-50 shrink-0 flex gap-3">
              <button onClick={() => setShowTemplateModal(false)} className="flex-1 py-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-100">Annuler</button>
              <button onClick={saveTemplate} disabled={!templateForm.nom || !templateForm.contenuTexte} className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg disabled:opacity-50">Sauvegarder</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
