"use client";
import { LogOut } from 'lucide-react';
import { signOut } from 'next-auth/react';

export default function LogoutButton() {
  return (
    <button 
      onClick={() => signOut({ callbackUrl: '/login' })}
      className="flex items-center gap-3 px-4 py-2 hover:bg-rose-500/10 hover:text-rose-400 text-slate-400 transition-colors w-full rounded-lg text-left"
    >
      <LogOut size={20} />
      Déconnexion
    </button>
  );
}
