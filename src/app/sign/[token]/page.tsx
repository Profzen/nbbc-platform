"use client";

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import SignatureCanvas from 'react-signature-canvas';
import { PenTool, CheckCircle, AlertTriangle, FileText, Download } from 'lucide-react';
import { uploadFileToCloudinary } from '@/lib/cloudinary-upload-client';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function SignaturePage() {
  const params = useParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const sigCanvas = useRef<SignatureCanvas | null>(null);
  const recipientDisplayName = data?.clientId?.prenom || data?.clientNomLibre || 'Client';
  const token = Array.isArray(params.token) ? params.token[0] : params.token;
  const documentProxyUrl = token ? `/api/signatures/${token}/document` : '';

  useEffect(() => {
    fetchData();
  }, [token]);

  const readJsonSafely = async (response: Response, fallbackMessage: string) => {
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      return response.json();
    }

    const rawText = await response.text();
    try {
      return JSON.parse(rawText);
    } catch {
      throw new Error(fallbackMessage);
    }
  };

  const fetchData = async () => {
    if (!token) {
      setError('Lien de signature invalide.');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`/api/signatures/${token}`);
      const json = await readJsonSafely(res, 'Réponse invalide du serveur.');
      if (json.success) setData(json.data);
      else setError(json.error);
    } catch (e: any) {
      setError('Erreur de connexion.');
    } finally {
      setLoading(false);
    }
  };

  const clearSignature = () => {
    sigCanvas.current?.clear();
  };

  const downloadDocument = async () => {
    if (!documentProxyUrl) {
      setActionError('Lien de document invalide.');
      return;
    }

    setActionError(null);
    setDownloading(true);
    try {
      const response = await fetch(`${documentProxyUrl}?download=1`);
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || 'Impossible de télécharger le document.');
      }

      const blob = await response.blob();
      const fileName = `${(data?.titreDocument || 'document').replace(/[^a-zA-Z0-9-_]/g, '_')}.pdf`;
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (e: any) {
      setActionError(e?.message || 'Erreur pendant le téléchargement.');
    } finally {
      setDownloading(false);
    }
  };

  const submitSignature = async () => {
    if (!sigCanvas.current || sigCanvas.current.isEmpty()) {
      alert('Veuillez dessiner votre signature avant de confirmer.');
      return;
    }

    setActionError(null);
    setSubmitting(true);
    try {
      // 1. Convertir le canvas en image base64
      const signatureDataUrl = sigCanvas.current.getCanvas().toDataURL('image/png');

      // 2. Convertir le dataURL en Blob réel (nécessaire pour Cloudinary)
      const blob = await (await fetch(signatureDataUrl)).blob();
      const file = new File([blob], 'signature.png', { type: 'image/png' });
      const uploadData = await uploadFileToCloudinary(file, {
        folder: 'signatures',
        resourceType: 'image',
      });

      // 3. Valider la signature côté backend NBBC
      const res = await fetch(`/api/signatures/${token}/sign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signatureImageUrl: uploadData.secureUrl,
          signatureImagePublicId: uploadData.publicId
        })
      });

      const json = await readJsonSafely(res, 'Réponse invalide lors de la validation de signature.');
      if (json.success) setSuccess(true);
      else setActionError(json.error || "Erreur lors de la validation finale.");

    } catch (e: any) {
      console.error('Erreur signature:', e);
      setActionError("Erreur technique : " + (e.message || 'Vérifiez la console pour plus de détails.'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <LoadingSpinner size="lg" label="Chargement sécurisé..." />
    </div>
  );

  if ((error && !data) || (data?.statut && data.statut !== 'EN_ATTENTE')) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl p-8 shadow-xl text-center border border-slate-200">
        <div className={`w-20 h-20 rounded-full mx-auto flex items-center justify-center mb-6 ${data?.statut === 'SIGNE' || success ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
          {data?.statut === 'SIGNE' || success ? <CheckCircle size={40} /> : <AlertTriangle size={40} />}
        </div>
        <h1 className="text-2xl font-black text-slate-800 mb-2">
          {data?.statut === 'SIGNE' || success ? 'Document déjà signé' : 'Accès impossible'}
        </h1>
        <p className="text-slate-500">{error || "Ce document a déjà été traité et signé ou a été annulé par l'administration."}</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-100">
      {success ? (
        <div className="min-h-screen flex flex-col items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-3xl p-10 shadow-2xl text-center border-t-4 border-t-emerald-500">
            <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle size={48} />
            </div>
            <h1 className="text-2xl font-black text-slate-800 mb-3">Merci, {recipientDisplayName} !</h1>
            <p className="text-slate-500 mb-6">Votre signature a bien été enregistrée et transmise à nos équipes sécurisées.</p>
            <p className="text-sm text-slate-400">Vous pouvez fermer cette page.</p>
          </div>
        </div>
      ) : (
        <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-6">
          
          <header className="bg-white rounded-2xl p-6 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center shrink-0">
              <FileText size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800">Action requise : Signature</h1>
              <p className="text-slate-500 text-sm">Veuillez lire le document ci-dessous et apposer votre signature.</p>
            </div>
          </header>

          <main className="bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col h-[600px] border border-slate-200">
            <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex justify-between items-center shrink-0">
              <h2 className="font-bold text-slate-700">{data.titreDocument}</h2>
              {data.typeSource === 'UPLOAD' && (
                <button
                  type="button"
                  onClick={downloadDocument}
                  disabled={downloading}
                  className="text-sm font-bold text-indigo-600 flex items-center gap-1.5 hover:text-indigo-800 disabled:opacity-60"
                >
                  <Download size={16} /> {downloading ? 'Téléchargement...' : 'Télécharger'}
                </button>
              )}
            </div>
            
            <div className="flex-1 overflow-y-auto bg-slate-100 p-2 md:p-6">
              <div className="bg-white min-h-full rounded-xl shadow-sm border border-slate-200 text-slate-700 p-6 md:p-12">
                {data.typeSource === 'TEMPLATE' ? (
                  <div className="prose prose-slate max-w-none prose-p:leading-relaxed prose-a:text-indigo-600" dangerouslySetInnerHTML={{ __html: data.contenuGele || '' }} />
                ) : (
                  <iframe src={documentProxyUrl} className="w-full h-full min-h-[500px] border-0 rounded-lg" title="Document PDF" />
                )}
              </div>
            </div>
          </main>

          <section className="bg-white rounded-2xl p-6 shadow-xl border border-slate-200">
            <div className="mb-4 flex items-center gap-2 text-slate-800">
              <PenTool size={20} className="text-indigo-600" />
              <h3 className="font-bold text-lg">Votre signature</h3>
            </div>

            {actionError && (
              <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {actionError}
              </div>
            )}
            
            <div className="border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 relative overflow-hidden group">
              <SignatureCanvas 
                ref={sigCanvas}
                penColor="#1e293b"
                canvasProps={{ className: 'w-full h-48 cursor-crosshair' }}
              />
              <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={clearSignature} className="bg-white text-slate-500 text-xs font-bold px-3 py-1.5 rounded-lg shadow-sm border border-slate-200 hover:text-rose-500">
                  Effacer
                </button>
              </div>
            </div>
            
            <p className="text-xs text-slate-400 mt-3 text-center">
              Signez dans la case ci-dessus à l'aide de votre souris ou de votre doigt.
            </p>

            <div className="mt-6 flex justify-end">
              <button 
                onClick={submitSignature} 
                disabled={submitting}
                className="w-full md:w-auto px-8 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 transition-all disabled:opacity-50 flex justify-center items-center"
              >
                {submitting ? (
                  <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div> Traitement...</>
                ) : 'Confirmer et Signer'}
              </button>
            </div>
          </section>

        </div>
      )}
    </div>
  );
}
