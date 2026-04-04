"use client";

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import SignatureCanvas from 'react-signature-canvas';
import { PenTool, CheckCircle, AlertTriangle, FileText, Download, MapPin } from 'lucide-react';
import { uploadFileToCloudinary } from '@/lib/cloudinary-upload-client';
import LoadingSpinner from '@/components/LoadingSpinner';
import PdfViewer from '@/components/PdfViewer';

export default function SignaturePage() {
  const params = useParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  /** Page + position where the signature will be placed (coordinates relative to that page element) */
  const [signaturePlacement, setSignaturePlacement] = useState<{ pageNum: number; xRatio: number; yRatio: number } | null>(null);
  /** Click position held while modal is open, applied when user validates their signature */
  const [pendingClick, setPendingClick] = useState<{ pageNum: number; xRatio: number; yRatio: number } | null>(null);
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
      if (json.success) {
        setData(json.data);
      }
      else setError(json.error);
    } catch (e: any) {
      setError('Erreur de connexion.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Called when the user clicks on a page of the PDF.
   * Coordinates are relative to the clicked page element — this is what we send to the backend.
   */
  const onPdfClick = (pageNum: number, xRatio: number, yRatio: number) => {
    if (signatureDataUrl) {
      // Signature already drawn — just move the placement
      setSignaturePlacement({ pageNum, xRatio, yRatio });
    } else {
      // No signature yet — remember click location and open draw modal
      setPendingClick({ pageNum, xRatio, yRatio });
      setShowSignatureModal(true);
    }
  };

  const saveSignatureFromPad = () => {
    if (!sigCanvas.current || sigCanvas.current.isEmpty()) {
      setActionError('Veuillez dessiner votre signature avant de continuer.');
      return;
    }

    const dataUrl = sigCanvas.current.getCanvas().toDataURL('image/png');
    setSignatureDataUrl(dataUrl);
    setActionError(null);

    if (pendingClick) {
      setSignaturePlacement(pendingClick);
      setPendingClick(null);
    }
    setShowSignatureModal(false);
  };

  const clearSignature = () => {
    sigCanvas.current?.clear();
    setSignatureDataUrl(null);
    setSignaturePlacement(null);
    setPendingClick(null);
  };

  const submitSignature = async () => {
    if (!signatureDataUrl || !signaturePlacement) {
      setActionError('Cliquez sur le document à l\'endroit où vous souhaitez apposer votre signature.');
      return;
    }

    setActionError(null);
    setSubmitting(true);
    try {
      const blob = await (await fetch(signatureDataUrl)).blob();
      const file = new File([blob], 'signature.png', { type: 'image/png' });
      const uploadData = await uploadFileToCloudinary(file, {
        folder: 'signatures',
        resourceType: 'image',
      });

      const res = await fetch(`/api/signatures/${token}/sign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signatureImageUrl: uploadData.secureUrl,
          signatureImagePublicId: uploadData.publicId,
          placement: {
            xRatio: signaturePlacement.xRatio,
            yRatio: signaturePlacement.yRatio,
            widthRatio: 0.18,
            pageIndex: signaturePlacement.pageNum - 1,
          },
        })
      });

      const json = await readJsonSafely(res, 'Réponse invalide lors de la validation de signature.');
      if (json.success) {
        setSuccess(true);
      }
      else setActionError(json.error || "Erreur lors de la validation finale.");

    } catch (e: any) {
      console.error('Erreur signature:', e);
      setActionError("Erreur technique : " + (e.message || 'Vérifiez la console pour plus de détails.'));
    } finally {
      setSubmitting(false);
    }
  };

  const isReady = !!signatureDataUrl && !!signaturePlacement;

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
            {documentProxyUrl && (
              <a
                href={`${documentProxyUrl}?download=1`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-bold text-emerald-700 hover:bg-emerald-100"
              >
                <Download size={16} /> Ouvrir le document signé
              </a>
            )}
            <p className="text-sm text-slate-400 mt-4">Vous pouvez fermer cette page.</p>
          </div>
        </div>
      ) : (
        <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-6">

          <header className="bg-white rounded-2xl p-5 shadow-sm flex items-center gap-4">
            <div className="w-11 h-11 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center shrink-0">
              <FileText size={22} />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-slate-800">Action requise : Signature</h1>
              <p className="text-slate-500 text-sm">Lisez le document puis cliquez à l'endroit exact où vous souhaitez signer.</p>
            </div>
          </header>

          <main className="bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col h-[78vh] sm:h-[740px] border border-slate-200">
            <div className="bg-slate-50 border-b border-slate-200 px-4 md:px-6 py-3 shrink-0">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="font-semibold text-slate-700 text-sm truncate">{data.titreDocument}</span>
                <div className="flex items-center gap-3 shrink-0">
                  {signatureDataUrl ? (
                    <button
                      type="button"
                      onClick={() => setShowSignatureModal(true)}
                      className="text-sm font-bold flex items-center gap-1.5 text-emerald-600 hover:text-emerald-800"
                    >
                      <PenTool size={15} />
                      Modifier la signature
                    </button>
                  ) : (
                    <span className="text-sm text-indigo-600 font-medium flex items-center gap-1.5">
                      <MapPin size={15} />
                      Cliquez sur le document pour signer
                    </span>
                  )}
                  {data.typeSource === 'UPLOAD' && (
                    <button
                      type="button"
                      onClick={downloadDocument}
                      disabled={downloading}
                      className="text-sm font-bold text-slate-500 flex items-center gap-1.5 hover:text-slate-700 disabled:opacity-50"
                    >
                      <Download size={15} />
                      {downloading ? 'Chargement...' : 'Télécharger'}
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="relative flex-1 overflow-hidden">
              {data.typeSource === 'TEMPLATE' ? (
                <div className="h-full overflow-y-auto">
                  <div className="bg-white min-h-full border border-slate-200 text-slate-700">
                    <div
                      className="prose prose-slate max-w-none p-6 md:p-12 prose-p:leading-relaxed prose-a:text-indigo-600"
                      dangerouslySetInnerHTML={{ __html: data.contenuGele || '' }}
                    />
                  </div>
                </div>
              ) : (
                <PdfViewer
                  url={documentProxyUrl}
                  onPageClick={onPdfClick}
                  signatureOverlay={signatureDataUrl && signaturePlacement ? {
                    pageNum: signaturePlacement.pageNum,
                    xRatio: signaturePlacement.xRatio,
                    yRatio: signaturePlacement.yRatio,
                    imageUrl: signatureDataUrl,
                    widthPercent: 18,
                  } : undefined}
                />
              )}
            </div>
          </main>

          <section className="bg-white rounded-2xl p-4 sm:p-5 shadow-xl border border-slate-200">
            {actionError && (
              <div className="mb-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {actionError}
              </div>
            )}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              {isReady ? (
                <p className="text-xs sm:text-sm text-emerald-600 font-medium flex items-center gap-1.5">
                  <MapPin size={14} className="shrink-0" />
                  Signature placée — page {signaturePlacement!.pageNum}. Cliquez ailleurs sur le document pour déplacer.
                </p>
              ) : signatureDataUrl ? (
                <p className="text-xs sm:text-sm text-indigo-600 font-medium">
                  Cliquez sur le document à l'endroit où vous souhaitez apposer votre signature.
                </p>
              ) : (
                <p className="text-xs sm:text-sm text-slate-500">
                  Cliquez sur le document à l'endroit exact où vous souhaitez signer.
                </p>
              )}
              <button
                onClick={submitSignature}
                disabled={submitting || !isReady}
                className="w-full sm:w-auto px-8 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 transition-all disabled:opacity-50 flex justify-center items-center"
              >
                {submitting ? (
                  <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div> Traitement...</>
                ) : 'Confirmer et Signer'}
              </button>
            </div>
          </section>

          {showSignatureModal && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="font-bold text-slate-800">Dessinez votre signature</h3>
                  <button
                    onClick={() => { setShowSignatureModal(false); setPendingClick(null); }}
                    className="text-slate-400 hover:text-slate-700"
                  >✕</button>
                </div>
                <div className="p-5 space-y-4">
                  <div className="border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 relative overflow-hidden">
                    <SignatureCanvas
                      ref={sigCanvas}
                      penColor="#1e293b"
                      canvasProps={{ className: 'w-full h-48 cursor-crosshair' }}
                    />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={clearSignature} className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50">
                      Effacer
                    </button>
                    <button onClick={saveSignatureFromPad} className="ml-auto px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold">
                      Utiliser cette signature
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
