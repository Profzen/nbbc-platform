"use client";

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import SignatureCanvas from 'react-signature-canvas';
import { PenTool, CheckCircle, AlertTriangle, FileText, Download } from 'lucide-react';

export default function SignaturePage() {
  const params = useParams();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const sigCanvas = useRef<SignatureCanvas | null>(null);

  useEffect(() => {
    fetchData();
  }, [params.token]);

  const fetchData = async () => {
    try {
      const res = await fetch(`/api/signatures/${params.token}`);
      const json = await res.json();
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

  const submitSignature = async () => {
    if (!sigCanvas.current || sigCanvas.current.isEmpty()) {
      alert('Veuillez dessiner votre signature avant de confirmer.');
      return;
    }

    setSubmitting(true);
    try {
      // 1. Convertir le canvas en image base64
      const signatureDataUrl = sigCanvas.current.getTrimmedCanvas().toDataURL('image/png');

      // 2. Convertir le dataURL en Blob réel (nécessaire pour Cloudinary)
      const blob = await (await fetch(signatureDataUrl)).blob();
      const fd = new FormData();
      fd.append('file', blob, 'signature.png');
      fd.append('upload_preset', 'ml_default');

      const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`, {
        method: 'POST',
        body: fd
      });
      const uploadData = await uploadRes.json();

      if (!uploadData.secure_url) {
        console.error('Cloudinary error:', uploadData);
        throw new Error("Erreur d'upload Cloudinary : " + (uploadData.error?.message || 'inconnu'));
      }

      // 3. Valider la signature côté backend NBBC
      const res = await fetch(`/api/signatures/${params.token}/sign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signatureImageUrl: uploadData.secure_url,
          signatureImagePublicId: uploadData.public_id
        })
      });

      const json = await res.json();
      if (json.success) setSuccess(true);
      else setError(json.error || "Erreur lors de la validation finale.");

    } catch (e: any) {
      console.error('Erreur signature:', e);
      setError("Erreur technique : " + (e.message || 'Vérifiez la console pour plus de détails.'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">Chargement sécurisé...</div>;

  if (error || data?.statut !== 'EN_ATTENTE') return (
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
            <h1 className="text-2xl font-black text-slate-800 mb-3">Merci, {data.clientId.prenom} !</h1>
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
                <a href={data.fichierPdfUrl} target="_blank" className="text-sm font-bold text-indigo-600 flex items-center gap-1.5 hover:text-indigo-800">
                  <Download size={16} /> Télécharger
                </a>
              )}
            </div>
            
            <div className="flex-1 overflow-y-auto bg-slate-100 p-2 md:p-6">
              <div className="bg-white min-h-full rounded-xl shadow-sm border border-slate-200 text-slate-700 p-6 md:p-12">
                {data.typeSource === 'TEMPLATE' ? (
                  <div className="prose prose-slate max-w-none prose-p:leading-relaxed prose-a:text-indigo-600" dangerouslySetInnerHTML={{ __html: data.contenuGele || '' }} />
                ) : (
                  <iframe src={data.fichierPdfUrl} className="w-full h-full min-h-[500px] border-0 rounded-lg" title="Document PDF" />
                )}
              </div>
            </div>
          </main>

          <section className="bg-white rounded-2xl p-6 shadow-xl border border-slate-200">
            <div className="mb-4 flex items-center gap-2 text-slate-800">
              <PenTool size={20} className="text-indigo-600" />
              <h3 className="font-bold text-lg">Votre signature</h3>
            </div>
            
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
