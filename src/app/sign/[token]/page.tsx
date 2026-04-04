"use client";

import { useState, useEffect, useRef, type MouseEvent, type PointerEvent as ReactPointerEvent } from 'react';
import { useParams } from 'next/navigation';
import SignatureCanvas from 'react-signature-canvas';
import { PenTool, CheckCircle, AlertTriangle, FileText, Download, MapPin } from 'lucide-react';
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
  const [signaturePreviewUrl, setSignaturePreviewUrl] = useState<string | null>(null);
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [placementMode, setPlacementMode] = useState(false);
  const [draggingSignature, setDraggingSignature] = useState(false);
  const [selectedPage, setSelectedPage] = useState(1);
  const [placement, setPlacement] = useState({ xRatio: 0.8, yRatio: 0.88, widthRatio: 0.26 });
  /** Pixel position of the chosen placement inside the document viewport (for visual feedback) */
  const [placementPixels, setPlacementPixels] = useState<{ x: number; y: number } | null>(null);
  /** Bounding rect of the visible document surface used for precise placement */
  const [documentSurfaceRect, setDocumentSurfaceRect] = useState<DOMRect | null>(null);
  const sigCanvas = useRef<SignatureCanvas | null>(null);
  const documentAreaRef = useRef<HTMLDivElement | null>(null);
  const documentSurfaceRef = useRef<HTMLDivElement | null>(null);
  const recipientDisplayName = data?.clientId?.prenom || data?.clientNomLibre || 'Client';
  const token = Array.isArray(params.token) ? params.token[0] : params.token;
  const documentProxyUrl = token ? `/api/signatures/${token}/document` : '';

  useEffect(() => {
    fetchData();
  }, [token]);

  useEffect(() => {
    if (!placementMode && !placementPixels) return;

    const syncDocumentSurfaceRect = () => {
      if (documentSurfaceRef.current) {
        setDocumentSurfaceRect(documentSurfaceRef.current.getBoundingClientRect());
      }
    };

    syncDocumentSurfaceRect();
    window.addEventListener('resize', syncDocumentSurfaceRect);
    window.addEventListener('scroll', syncDocumentSurfaceRect, true);
    return () => {
      window.removeEventListener('resize', syncDocumentSurfaceRect);
      window.removeEventListener('scroll', syncDocumentSurfaceRect, true);
    };
  }, [placementMode, placementPixels]);

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
        setSelectedPage(1);
      }
      else setError(json.error);
    } catch (e: any) {
      setError('Erreur de connexion.');
    } finally {
      setLoading(false);
    }
  };

  const clearSignature = () => {
    sigCanvas.current?.clear();
    setSignaturePreviewUrl(null);
    setSignatureDataUrl(null);
    setPlacementMode(false);
    setPlacementPixels(null);
    setDraggingSignature(false);
  };

  const syncDocumentSurfaceRect = () => {
    if (!documentSurfaceRef.current) return null;
    const rect = documentSurfaceRef.current.getBoundingClientRect();
    setDocumentSurfaceRect(rect);
    return rect;
  };

  const updatePlacementFromClientPoint = (clientX: number, clientY: number) => {
    const rect = syncDocumentSurfaceRect();
    if (!rect) return;

    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const xRatio = Math.min(0.95, Math.max(0.05, x / rect.width));
    const yRatio = Math.min(0.95, Math.max(0.05, y / rect.height));

    setPlacementPixels({
      x: xRatio * rect.width,
      y: yRatio * rect.height,
    });
    setPlacement((currentPlacement) => ({
      ...currentPlacement,
      xRatio,
      yRatio,
    }));
  };

  const saveSignatureFromPad = () => {
    if (!sigCanvas.current || sigCanvas.current.isEmpty()) {
      setActionError('Veuillez dessiner votre signature avant de continuer.');
      return;
    }

    const dataUrl = sigCanvas.current.getCanvas().toDataURL('image/png');
    setSignatureDataUrl(dataUrl);
    setSignaturePreviewUrl(dataUrl);
    setActionError(null);
    setShowSignatureModal(false);
    // Auto-start placement mode — capture rect after modal close animation
    setTimeout(() => {
      syncDocumentSurfaceRect();
      setPlacementPixels(null);
      setPlacementMode(true);
    }, 120);
  };

  const startPlacement = () => {
    if (!signatureDataUrl) {
      setActionError("Dessinez d'abord votre signature.");
      setShowSignatureModal(true);
      return;
    }
    syncDocumentSurfaceRect();
    setActionError(null);
    setPlacementPixels(null);
    setPlacementMode(true);
  };

  /**
   * Called when the user clicks the fixed placement overlay.
   * This overlay sits on top of the iframe too, unlike the outer div's
   * click handler which the iframe blocks (cross-origin pointer events).
   */
  const onPlacementOverlayClick = (event: MouseEvent<HTMLDivElement>) => {
    updatePlacementFromClientPoint(event.clientX, event.clientY);
    setPlacementMode(false);
  };

  const onSignaturePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!placementPixels) return;
    event.preventDefault();
    event.stopPropagation();
    syncDocumentSurfaceRect();
    setDraggingSignature(true);
    event.currentTarget.setPointerCapture(event.pointerId);
    updatePlacementFromClientPoint(event.clientX, event.clientY);
  };

  const onSignaturePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!draggingSignature) return;
    event.preventDefault();
    updatePlacementFromClientPoint(event.clientX, event.clientY);
  };

  const stopDraggingSignature = (event?: ReactPointerEvent<HTMLDivElement>) => {
    if (event?.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setDraggingSignature(false);
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
    if (!signatureDataUrl) {
      setActionError('Veuillez dessiner votre signature avant de confirmer.');
      return;
    }

    setActionError(null);
    setSubmitting(true);
    try {
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
          signatureImagePublicId: uploadData.publicId,
          placement: {
            ...placement,
            pageIndex: data?.typeSource === 'UPLOAD' ? Math.max(0, selectedPage - 1) : undefined,
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

  // Step state helpers
  const step1Done = !!signatureDataUrl;
  const step2Done = !!placementPixels;
  const signaturePreviewWidth = documentSurfaceRect
    ? Math.round(documentSurfaceRect.width * placement.widthRatio)
    : 240;

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
      {/* Fixed placement overlay — covers entire doc area viewport including iframe
          (iframes swallow pointer events; this overlay sits on top fixed) */}
      {placementMode && documentSurfaceRect && (
        <div
          className="fixed z-40 cursor-crosshair"
          style={{
            left: `${documentSurfaceRect.left}px`,
            top: `${documentSurfaceRect.top}px`,
            width: `${documentSurfaceRect.width}px`,
            height: `${documentSurfaceRect.height}px`,
            background: 'rgba(99, 102, 241, 0.10)',
          }}
          onClick={onPlacementOverlayClick}
        >
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="bg-indigo-900/85 text-white px-5 py-3 rounded-2xl text-sm font-bold shadow-2xl flex items-center gap-2">
              <MapPin size={16} className="shrink-0" />
              Cliquez ici pour placer votre signature
            </div>
          </div>
        </div>
      )}

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
            <p className="text-sm text-slate-400">Vous pouvez fermer cette page.</p>
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
              <p className="text-slate-500 text-sm">Veuillez lire le document et apposer votre signature.</p>
            </div>
          </header>

          <main className="bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col h-[78vh] sm:h-[740px] border border-slate-200">
            <div className="bg-slate-50 border-b border-slate-200 px-4 md:px-6 py-3 shrink-0 space-y-2.5">
              {/* Step progress */}
              <div className="flex items-center gap-1.5 text-[11px] sm:text-xs">
                <div className={`flex items-center gap-1 font-semibold ${step1Done ? 'text-emerald-600' : 'text-indigo-600'}`}>
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-black shrink-0 ${step1Done ? 'bg-emerald-500' : 'bg-indigo-500'}`}>
                    {step1Done ? '✓' : '1'}
                  </span>
                  <span className="hidden sm:inline">Dessiner la signature</span>
                  <span className="sm:hidden">Signature</span>
                </div>
                <span className="text-slate-300 mx-0.5">→</span>
                <div className={`flex items-center gap-1 font-semibold ${step2Done ? 'text-emerald-600' : step1Done ? 'text-indigo-600' : 'text-slate-400'}`}>
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-black shrink-0 ${step2Done ? 'bg-emerald-500' : step1Done ? 'bg-indigo-500' : 'bg-slate-300'}`}>
                    {step2Done ? '✓' : '2'}
                  </span>
                  <span className="hidden sm:inline">Placer sur le document</span>
                  <span className="sm:hidden">Placer</span>
                </div>
                <span className="text-slate-300 mx-0.5">→</span>
                <div className={`flex items-center gap-1 font-semibold ${step1Done && step2Done ? 'text-indigo-600' : 'text-slate-400'}`}>
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-black shrink-0 ${step1Done && step2Done ? 'bg-indigo-500' : 'bg-slate-300'}`}>
                    3
                  </span>
                  <span className="hidden sm:inline">Confirmer</span>
                  <span className="sm:hidden">OK</span>
                </div>
              </div>
              {/* Action buttons */}
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="font-semibold text-slate-700 text-sm truncate">{data.titreDocument}</span>
                <div className="flex items-center gap-3 shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowSignatureModal(true)}
                    className={`text-sm font-bold flex items-center gap-1.5 ${step1Done ? 'text-emerald-600 hover:text-emerald-800' : 'text-indigo-600 hover:text-indigo-800'}`}
                  >
                    <PenTool size={15} />
                    {step1Done ? 'Modifier la signature' : 'Dessiner la signature'}
                  </button>
                  {step1Done && (
                    <button
                      type="button"
                      onClick={startPlacement}
                      className={`text-sm font-bold flex items-center gap-1.5 ${step2Done ? 'text-emerald-600 hover:text-emerald-800' : 'text-indigo-600 hover:text-indigo-800'}`}
                    >
                      <MapPin size={15} />
                      {step2Done ? "Changer l'emplacement" : 'Placer la signature'}
                    </button>
                  )}
                  {data.typeSource === 'UPLOAD' && (
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <label htmlFor="signature-page" className="font-semibold">Page</label>
                      <input
                        id="signature-page"
                        type="number"
                        min={1}
                        value={selectedPage}
                        onChange={(event) => {
                          const rawValue = Number(event.target.value || 1);
                          setSelectedPage(Number.isFinite(rawValue) ? Math.max(1, Math.floor(rawValue)) : 1);
                        }}
                        className="w-20 rounded-lg border border-slate-300 px-2 py-1 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                      />
                    </div>
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

            <div
              ref={documentAreaRef}
              className="relative flex-1 overflow-y-auto bg-slate-100 p-2 md:p-6"
            >
              <div
                ref={documentSurfaceRef}
                className="relative bg-white min-h-full rounded-xl shadow-sm border border-slate-200 text-slate-700 overflow-hidden"
              >
                {data.typeSource === 'TEMPLATE' ? (
                  <div className="prose prose-slate max-w-none p-6 md:p-12 prose-p:leading-relaxed prose-a:text-indigo-600" dangerouslySetInnerHTML={{ __html: data.contenuGele || '' }} />
                ) : (
                  <iframe src={documentProxyUrl} className="w-full h-full min-h-[500px] border-0 rounded-lg" title="Document PDF" />
                )}

                {placementPixels && signaturePreviewUrl && !placementMode && (
                  <div
                    className="absolute z-30 touch-none"
                    style={{
                      left: `${placement.xRatio * 100}%`,
                      top: `${placement.yRatio * 100}%`,
                      transform: 'translate(-50%, -50%)',
                    }}
                    onPointerDown={onSignaturePointerDown}
                    onPointerMove={onSignaturePointerMove}
                    onPointerUp={stopDraggingSignature}
                    onPointerCancel={stopDraggingSignature}
                  >
                    <div className="flex flex-col items-center gap-1 pointer-events-auto select-none">
                      <img
                        src={signaturePreviewUrl}
                        alt="Aperçu signature"
                        className={`rounded-lg border-2 bg-white/95 shadow-2xl ${draggingSignature ? 'border-emerald-500 shadow-emerald-200' : 'border-indigo-400'}`}
                        style={{ width: `${signaturePreviewWidth}px` }}
                      />
                      <span className={`text-[11px] px-2 py-0.5 rounded-full text-white ${draggingSignature ? 'bg-emerald-600' : 'bg-indigo-600/90'}`}>
                        {draggingSignature ? 'Déplacement...' : 'Glissez pour ajuster'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </main>

          <section className="bg-white rounded-2xl p-4 sm:p-5 shadow-xl border border-slate-200">
            {actionError && (
              <div className="mb-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {actionError}
              </div>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              {step2Done ? (
                <p className="text-xs sm:text-sm text-emerald-600 font-medium flex items-center gap-1.5">
                  <MapPin size={14} className="shrink-0" />
                  Emplacement choisi. Vous pouvez encore faire glisser la signature avant de confirmer.
                </p>
              ) : step1Done ? (
                <p className="text-xs sm:text-sm text-indigo-600 font-medium">
                  Cliquez sur "Placer la signature" puis touchez le document à l'endroit voulu.
                </p>
              ) : (
                <p className="text-xs sm:text-sm text-slate-500">
                  Commencez par dessiner votre signature via le bouton en haut.
                </p>
              )}
              <button
                onClick={submitSignature}
                disabled={submitting || !step1Done || !step2Done}
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
                  <button onClick={() => setShowSignatureModal(false)} className="text-slate-400 hover:text-slate-700">✕</button>
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
