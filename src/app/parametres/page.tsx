"use client";

import { FormEvent, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Shield, UserPlus, Users } from 'lucide-react';
import LoadingSpinner from '@/components/LoadingSpinner';

type UserItem = {
  _id?: string;
  id?: string;
  name: string;
  email: string;
  role: string;
  createdAt?: string;
};

export default function ParametresPage() {
  const { data: session, status } = useSession();
  const currentRole = (session?.user as any)?.role;
  const isSuperAdmin = currentRole === 'SUPER_ADMIN';

  const [users, setUsers] = useState<UserItem[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'AGENT',
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const fetchUsers = async () => {
    if (!isSuperAdmin) return;
    setLoadingUsers(true);
    setError('');
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Impossible de charger les utilisateurs.');
      }
      setUsers(data.data || []);
    } catch (err: any) {
      setError(err.message || 'Erreur chargement utilisateurs.');
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleCreateUser = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          role: formData.role,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Création du compte impossible.');
      }

      setMessage('Compte agent créé avec succès.');
      setFormData({ name: '', email: '', password: '', role: 'AGENT' });
      fetchUsers();
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la création du compte.');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (status === 'authenticated' && isSuperAdmin) {
      fetchUsers();
    }
  }, [status, isSuperAdmin]);

  if (status === 'loading') {
    return (
      <div className="p-8 max-w-5xl mx-auto">
        <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
          <LoadingSpinner label="Chargement..." size="sm" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800">Paramètres</h1>
        <p className="text-slate-500 mt-1">Gestion des accès à la plateforme.</p>
      </header>

      {!isSuperAdmin ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-semibold border border-amber-200 mb-4">
            <Shield size={14} />
            Accès restreint
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Section réservée au SUPER_ADMIN</h2>
          <p className="text-slate-600 text-sm">Vous pouvez consulter les paramètres, mais la création de comptes est limitée au SUPER_ADMIN.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-5">
              <UserPlus size={18} className="text-blue-600" />
              <h2 className="text-lg font-bold text-slate-800">Créer un compte agent</h2>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Nom</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Email</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Mot de passe</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={formData.password}
                  onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Rôle</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData((prev) => ({ ...prev, role: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  <option value="AGENT">AGENT</option>
                </select>
              </div>

              {error && <p className="text-sm text-rose-600">{error}</p>}
              {message && <p className="text-sm text-emerald-600">{message}</p>}

              <button
                type="submit"
                disabled={saving}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-xl disabled:opacity-60 inline-flex items-center justify-center gap-2"
              >
                {saving ? <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Création en cours...</> : 'Créer le compte'}
              </button>
            </form>
          </section>

          <section className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-5">
              <Users size={18} className="text-indigo-600" />
              <h2 className="text-lg font-bold text-slate-800">Utilisateurs existants</h2>
            </div>

            {loadingUsers ? (
              <LoadingSpinner label="Chargement des utilisateurs..." size="sm" className="py-4" />
            ) : users.length === 0 ? (
              <p className="text-sm text-slate-500">Aucun utilisateur trouvé.</p>
            ) : (
              <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                {users.map((u) => (
                  <div key={u._id || u.id || u.email} className="border border-slate-200 rounded-xl p-3">
                    <p className="font-semibold text-slate-800 text-sm">{u.name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{u.email}</p>
                    <div className="mt-2 inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                      {u.role}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
