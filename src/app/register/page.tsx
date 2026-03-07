"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { UserPlus, Lock } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Une erreur est survenue");
      }

      // Inscription réussie : rediriger vers la page de login avec un succès
      router.push("/login?registered=true");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl shadow-slate-200/50 p-8 border border-slate-100 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-emerald-500 to-teal-500"></div>
        
        <div className="text-center mb-8 mt-2">
          <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-emerald-100 shadow-inner">
            <UserPlus size={32} />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Créer un compte NBBC</h1>
          <p className="text-slate-500 text-sm mt-2">Inscrivez-vous pour rejoindre l'espace sécurisé</p>
        </div>

        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-600 text-sm px-4 py-3 rounded-xl mb-6 flex items-start gap-2">
            <Lock size={16} className="mt-0.5 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Nom complet</label>
            <input 
              type="text" 
              required
              className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all bg-slate-50 focus:bg-white"
              placeholder="Ex: Jean Dupont"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Adresse Email</label>
            <input 
              type="email" 
              required
              className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all bg-slate-50 focus:bg-white"
              placeholder="jean@email.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Mot de passe</label>
            <input 
              type="password" 
              required
              minLength={6}
              className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all bg-slate-50 focus:bg-white"
              placeholder="••••••••"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            />
          </div>
          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white py-3.5 rounded-xl font-bold shadow-lg shadow-emerald-500/30 transition-transform hover:-translate-y-0.5 active:translate-y-0 flex justify-center items-center gap-2 mt-4 disabled:opacity-70 disabled:transform-none"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : "Créer mon compte"}
          </button>
        </form>

        <p className="text-center text-sm text-slate-500 mt-8 font-medium">
          Déjà un compte ?{' '}
          <Link href="/login" className="text-blue-600 hover:text-blue-700 hover:underline">
            Se connecter
          </Link>
        </p>
      </div>
    </div>
  );
}
