"use client";

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { ShieldCheck, Camera, Upload, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { CldUploadWidget } from 'next-cloudinary';

type Step = 'loading' | 'invalid' | 'form' | 'selfie' | 'policy' | 'submitted' | 'already_done';

export default function KycPublicPage() {
  const { token } = useParams();
  const [step, setStep] = useState<Step>('loading');
  const [formData, setFormData] = useState({ nom: '', prenom: '', email: '', telephone: '' });
  const [photoId, setPhotoId] = useState<{ url: string; publicId: string } | null>(null);
  const [selfie, setSelfie] = useState<string | null>(null);
  const [selfieBlob, setSelfieBlob] = useState<Blob | null>(null);
  const [selfieUploaded, setSelfieUploaded] = useState<{ url: string; publicId: string } | null>(null);
  const [politiqueAcceptee, setPolitiqueAcceptee] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    (async () => {
      const res = await fetch(`/api/kyc/${token}`);
      const data = await res.json();
      if (!data.success) {
        setStep(data.error?.includes('déjà') ? 'already_done' : 'invalid');
      } else {
        setStep('form');
      }
    })();
  }, [token]);

  // Démarrer la caméra
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setStep('selfie');
    } catch {
      setError("Impossible d'accéder à votre caméra. Veuillez autoriser l'accès.");
    }
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  };

  // Capturer la photo
  const capturePhoto = () => {
    const canvas = document.createElement('canvas');
    const video = videoRef.current!;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')!.drawImage(video, 0, 0);
    canvas.toBlob(blob => {
      setSelfieBlob(blob);
      setSelfie(canvas.toDataURL('image/jpeg'));
      stopCamera();
    }, 'image/jpeg', 0.85);
  };

  // Uploader le selfie sur Cloudinary via API
  const uploadSelfie = async () => {
    if (!selfieBlob) return;
    setLoading(true);
    try {
      const formDataUpload = new FormData();
      formDataUpload.append('file', selfieBlob, 'selfie.jpg');
      formDataUpload.append('upload_preset', 'ml_default');

      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`,
        { method: 'POST', body: formDataUpload }
      );
      const data = await res.json();
      setSelfieUploaded({ url: data.secure_url, publicId: data.public_id });
      setStep('policy');
    } catch {
      setError("Erreur lors de l'envoi du selfie. Réessayez.");
    } finally {
      setLoading(false);
    }
  };

  // Soumission finale
  const handleSubmit = async () => {
    if (!politiqueAcceptee) { setError('Vous devez accepter la politique.'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/kyc/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          photoIdUrl: photoId?.url,
          photoIdPublicId: photoId?.publicId,
          selfieUrl: selfieUploaded?.url,
          selfiePublicId: selfieUploaded?.publicId,
          politiqueAcceptee: true,
        })
      });
      const data = await res.json();
      if (data.success) { setStep('submitted'); }
      else { setError(data.error || 'Erreur.'); }
    } catch { setError('Erreur serveur.'); } 
    finally { setLoading(false); }
  };

  if (step === 'loading') return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-blue-950 flex items-center justify-center">
      <Loader2 className="text-white animate-spin" size={48} />
    </div>
  );

  if (step === 'invalid') return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-blue-950 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-10 text-center max-w-md shadow-2xl">
        <div className="w-20 h-20 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertTriangle size={40} className="text-rose-500" />
        </div>
        <h1 className="text-2xl font-bold text-slate-800 mb-2">Lien invalide</h1>
        <p className="text-slate-500">Ce lien de vérification KYC est invalide ou a expiré. Contactez NBBC pour obtenir un nouveau lien.</p>
      </div>
    </div>
  );

  if (step === 'already_done') return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-blue-950 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-10 text-center max-w-md shadow-2xl">
        <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle size={40} className="text-amber-500" />
        </div>
        <h1 className="text-2xl font-bold text-slate-800 mb-2">Déjà soumis</h1>
        <p className="text-slate-500">Votre demande de vérification KYC a déjà été soumise. Notre équipe est en train de la traiter.</p>
      </div>
    </div>
  );

  if (step === 'submitted') return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-blue-950 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-10 text-center max-w-md shadow-2xl">
        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <ShieldCheck size={40} className="text-emerald-500" />
        </div>
        <h1 className="text-2xl font-bold text-slate-800 mb-2">Demande envoyée ! 🎉</h1>
        <p className="text-slate-500">Votre demande de vérification KYC a bien été reçue. Nous vous informerons par email dès qu'elle sera traitée (sous 24-48h).</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-blue-950 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-8 text-white text-center">
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
            <ShieldCheck size={32} />
          </div>
          <h1 className="text-2xl font-bold">Vérification d'identité</h1>
          <p className="text-blue-100 text-sm mt-1">Processus sécurisé NBBC</p>
        </div>

        {/* Étapes */}
        <div className="flex border-b border-slate-100">
          {['Informations', 'Photo ID', 'Selfie', 'Validation'].map((label, i) => {
            const stepIndex = { form: 0, selfie: 2, policy: 3 }[step as string] ?? (step === 'loading' ? -1 : 1);
            const isActive = i === stepIndex;
            const isDone = i < (stepIndex ?? 0);
            return (
              <div key={i} className={`flex-1 py-3 text-center text-xs font-bold border-b-2 transition-colors ${isActive ? 'border-blue-600 text-blue-600' : isDone ? 'border-emerald-400 text-emerald-500' : 'border-transparent text-slate-400'}`}>
                {isDone ? '✓ ' : `${i+1}. `}{label}
              </div>
            );
          })}
        </div>

        <div className="p-8">
          {error && (
            <div className="mb-6 bg-rose-50 border border-rose-200 text-rose-600 text-sm px-4 py-3 rounded-xl">
              {error}
            </div>
          )}

          {/* ÉTAPE 1 : Informations */}
          {step === 'form' && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Prénom *</label>
                  <input type="text" required value={formData.prenom} onChange={e => setFormData({...formData, prenom: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all text-sm" placeholder="Jean" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Nom *</label>
                  <input type="text" required value={formData.nom} onChange={e => setFormData({...formData, nom: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all text-sm" placeholder="Dupont" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Email *</label>
                <input type="email" required value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all text-sm" placeholder="jean.dupont@email.com" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Téléphone</label>
                <input type="tel" value={formData.telephone} onChange={e => setFormData({...formData, telephone: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all text-sm" placeholder="+1 555 000 0000" />
              </div>

              {/* Upload Photo ID */}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-2 uppercase tracking-wide">Pièce d'identité *</label>
                {photoId ? (
                  <div className="flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                    <img src={photoId.url} alt="ID" className="w-16 h-12 object-cover rounded-lg" />
                    <div>
                      <p className="text-sm font-bold text-emerald-700">Photo uploadée ✓</p>
                      <button onClick={() => setPhotoId(null)} className="text-xs text-slate-400 hover:text-rose-500">Supprimer</button>
                    </div>
                  </div>
                ) : (
                  <CldUploadWidget signatureEndpoint="/api/cloudinary/sign" onSuccess={(result: any) => { const info = result.info; setPhotoId({ url: info.secure_url, publicId: info.public_id }); }} options={{ maxFiles: 1 }}>
                    {({ open }) => (
                      <button type="button" onClick={() => open()} className="w-full border-2 border-dashed border-slate-200 hover:border-blue-400 hover:bg-blue-50 rounded-xl p-6 flex flex-col items-center gap-2 text-slate-400 transition-all">
                        <Upload size={24} />
                        <span className="text-sm font-medium">Cliquez pour uploader votre pièce d'identité</span>
                        <span className="text-xs">Passeport, CNI, Permis de conduire</span>
                      </button>
                    )}
                  </CldUploadWidget>
                )}
              </div>

              <button
                onClick={() => { if (!formData.nom || !formData.prenom || !formData.email || !photoId) { setError('Veuillez remplir tous les champs obligatoires et uploader votre pièce d\'identité.'); return; } setError(''); startCamera(); }}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3.5 rounded-xl font-bold shadow-lg shadow-blue-500/30 transition-transform hover:-translate-y-0.5 flex items-center justify-center gap-2"
              >
                Continuer <Camera size={20} />
              </button>
            </div>
          )}

          {/* ÉTAPE 2 : Selfie */}
          {step === 'selfie' && (
            <div className="space-y-5">
              <div className="text-center mb-4">
                <h2 className="text-lg font-bold text-slate-800">Selfie de vérification</h2>
                <p className="text-slate-500 text-sm mt-1">Regardez directement la caméra et assurez-vous d'être dans un endroit bien éclairé.</p>
              </div>

              {selfie ? (
                <div className="space-y-4">
                  <img src={selfie} alt="Selfie" className="w-full rounded-2xl border-4 border-emerald-300" />
                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => { setSelfie(null); setSelfieBlob(null); startCamera(); }} className="py-2.5 rounded-xl border border-slate-300 text-slate-600 font-bold text-sm hover:bg-slate-50">Reprendre</button>
                    <button onClick={uploadSelfie} disabled={loading} className="py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-70">
                      {loading ? <Loader2 size={18} className="animate-spin" /> : 'Valider ce selfie'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <video ref={videoRef} autoPlay playsInline muted className="w-full rounded-2xl bg-slate-900 aspect-video object-cover" />
                  <button onClick={capturePhoto} className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3.5 rounded-xl font-bold shadow-lg flex items-center justify-center gap-2">
                    <Camera size={20} /> Prendre le selfie
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ÉTAPE 3 : Politique */}
          {step === 'policy' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-bold text-slate-800 mb-3">Politique Anti-Fraude</h2>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 max-h-48 overflow-y-auto text-xs text-slate-600 space-y-2 leading-relaxed">
                  <p><strong>Déclaration sur l'honneur :</strong></p>
                  <p>Je soussigné(e) certifie que les informations fournies dans ce formulaire sont exactes et sincères. Je confirme que les documents d'identité téléchargés sont authentiques et m'appartiennent.</p>
                  <p>Je reconnais que toute tentative de fraude, usurpation d'identité, ou soumission de documents falsifiés constitue une infraction pénale et expose son auteur à des poursuites judiciaires.</p>
                  <p>NBBC se dégage de toute responsabilité en cas de fraude commise par le déclarant. Les données collectées sont traitées conformément aux réglementations en vigueur (RGPD) dans le seul but de vérifier votre identité et de vous offrir nos services financiers.</p>
                  <p>En acceptant cette politique, vous consentez au traitement de vos données biométriques (selfie) à des fins de vérification d'identité uniquement.</p>
                </div>
              </div>

              <label className="flex items-start gap-3 cursor-pointer p-4 bg-slate-50 rounded-xl border border-slate-200 hover:border-blue-300 transition-colors">
                <input type="checkbox" checked={politiqueAcceptee} onChange={e => setPolitiqueAcceptee(e.target.checked)} className="mt-0.5 w-5 h-5 accent-blue-600 shrink-0" />
                <span className="text-sm font-medium text-slate-700">J'ai lu et j'accepte la politique anti-fraude de NBBC. Je certifie sur l'honneur l'exactitude des informations fournies.</span>
              </label>

              <button
                onClick={handleSubmit}
                disabled={loading || !politiqueAcceptee}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3.5 rounded-xl font-bold shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 size={20} className="animate-spin" /> : <><ShieldCheck size={20} /> Envoyer ma demande KYC</>}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
