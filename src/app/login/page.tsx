"use client";

import { useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { ShieldCheck, Lock } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [logoError, setLogoError] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await signIn("credentials", {
      email: email.trim().toLowerCase(),
      password,
      redirect: false,
    });

    if (res?.error) {
      setError(res.error);
      setLoading(false);
    } else {
      router.push("/");
      router.refresh();
    }
  };

  return (
    <div className="min-h-[100dvh] bg-slate-50 flex flex-col justify-start sm:justify-center items-center p-4 pt-6 sm:pt-4 pb-[max(env(safe-area-inset-bottom),1rem)] overflow-y-auto">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl shadow-slate-200/50 p-8 border border-slate-100 relative overflow-hidden">
        {/* Décoration arriere plan */}
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-600 to-indigo-600"></div>
        
        <div className="text-center mb-8 mt-2">
          <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-blue-100 shadow-inner overflow-hidden">
            {!logoError ? (
              <img src="/nbbcl.png" alt="Logo NBBC" width={48} height={48} className="object-contain" onError={() => setLogoError(true)} />
            ) : (
              <span className="text-xs font-bold text-blue-700">NBBC</span>
            )}
          </div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Espace Sécurisé NBBC</h1>
          <p className="text-slate-500 text-sm mt-2">Connectez-vous pour accéder à votre tableau de bord</p>
        </div>

        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-600 text-sm px-4 py-3 rounded-xl mb-6 flex items-start gap-2">
            <Lock size={16} className="mt-0.5 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Adresse Email</label>
            <input 
              type="email" 
              required
              autoComplete="email"
              className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-slate-50 focus:bg-white"
              placeholder="admin@nbbc.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Mot de passe</label>
            <input 
              type="password" 
              required
              autoComplete="current-password"
              className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-slate-50 focus:bg-white"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white py-3.5 rounded-xl font-bold shadow-lg shadow-blue-500/30 transition-transform hover:-translate-y-0.5 active:translate-y-0 flex justify-center items-center gap-2 mt-4 disabled:opacity-70 disabled:transform-none"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : "Connexion"}
          </button>
        </form>

        <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
          <div className="font-semibold text-slate-800 mb-1">Nouveau client ?</div>
          <p className="mb-3">Créez votre compte NBBC directement en quelques secondes.</p>
          <Link
            href="/register"
            className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 font-bold text-white transition-colors hover:bg-slate-800"
          >
            Créer un compte client
          </Link>
        </div>

      </div>
      <p className="text-slate-400 text-sm mt-8">© {new Date().getFullYear()} Plateforme NBBC. Accès restreint.</p>
    </div>
  );
}
