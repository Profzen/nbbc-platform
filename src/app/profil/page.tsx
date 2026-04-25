"use client";

import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { UserCircle, Mail, ShieldCheck, Trash2, FileText, LogOut } from 'lucide-react';

export default function ProfilPage() {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const userName = session?.user?.name || 'Utilisateur';
  const userEmail = session?.user?.email || '';
  const userInitial = userName.trim().charAt(0).toUpperCase() || 'U';

  return (
    <div className="max-w-lg mx-auto px-4 py-10 space-y-6">

      {/* Avatar + infos */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex items-center gap-5">
        <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-2xl font-black text-white shadow-md flex-shrink-0">
          {userInitial}
        </div>
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-slate-900 truncate">{userName}</h1>
          <div className="flex items-center gap-1.5 text-slate-500 text-sm mt-0.5">
            <Mail size={13} />
            <span className="truncate">{userEmail}</span>
          </div>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 text-xs font-semibold px-2.5 py-0.5 rounded-full">
              <ShieldCheck size={11} />
              Client NBBC
            </span>
          </div>
        </div>
      </div>

      {/* Liens utiles */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm divide-y divide-slate-100">
        <Link
          href="/privacy"
          className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors rounded-t-2xl"
        >
          <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
            <FileText size={18} className="text-blue-600" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-medium text-slate-800 text-sm">Règles de confidentialité</div>
            <div className="text-xs text-slate-500">Comment nous traitons vos données</div>
          </div>
          <span className="text-slate-300 text-lg">›</span>
        </Link>

        <div className="px-5 py-4">
          <div className="flex items-center gap-4">
            <div className="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0">
              <Trash2 size={18} className="text-red-500" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-medium text-slate-800 text-sm">Supprimer mon compte</div>
              <div className="text-xs text-slate-500">Suppression définitive de votre compte et données</div>
            </div>
          </div>
          <div className="mt-4 bg-red-50 border border-red-100 rounded-xl p-4">
            <p className="text-sm text-red-700 mb-3">
              ⚠️ Cette action est <strong>irréversible</strong>. Toutes vos données personnelles seront effacées.
            </p>
            <Link
              href="/delete-account"
              className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors w-full justify-center"
            >
              <Trash2 size={15} />
              Demander la suppression de mon compte
            </Link>
          </div>
        </div>
      </div>

      {/* Déconnexion */}
      <button
        onClick={() => signOut({ callbackUrl: '/login' })}
        className="w-full flex items-center justify-center gap-2 bg-white border border-slate-200 rounded-2xl px-5 py-4 text-slate-700 font-semibold text-sm hover:bg-slate-50 transition-colors shadow-sm"
      >
        <LogOut size={16} className="text-slate-500" />
        Se déconnecter
      </button>

    </div>
  );
}
