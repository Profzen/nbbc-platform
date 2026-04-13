"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Capacitor } from '@capacitor/core';
import { Users, CreditCard, BarChart3, Settings, ShieldCheck, Megaphone, PenTool, BookOpen, Menu, X, Globe, Package, Activity } from 'lucide-react';
import LogoutButton from './LogoutButton';

interface SidebarClientProps {
  session: any;
  pendingKyc: number;
}

export default function SidebarClient({ session, pendingKyc }: SidebarClientProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isNativeApp, setIsNativeApp] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setIsNativeApp(Capacitor.isNativePlatform());
  }, []);

  // Masquer la sidebar sur les pages publiques
  if (pathname.startsWith('/login')) return null;
  if (pathname.startsWith('/kyc/') && pathname.length > 10) return null;
  if (pathname.startsWith('/sign/')) return null;

  const isAdmin = (session?.user as any)?.role === 'SUPER_ADMIN';

  const navLinks = [
    { href: '/', label: 'Dashboard', icon: BarChart3 },
    { href: '/clients', label: 'Clients', icon: Users },
    { href: '/cartes', label: 'Cartes & Comptes', icon: CreditCard },
    { href: '/signatures', label: 'E-Signature', icon: PenTool },
    { href: '/comptabilite', label: 'Comptabilité', icon: BookOpen },
    { href: '/kyc', label: 'Vérification KYC', icon: ShieldCheck, badge: pendingKyc },
    { href: '/marketing', label: 'Marketing', icon: Megaphone },
    { href: '/materiel', label: 'Matériel', icon: Package },
    { href: '/nos-sites', label: 'Nos sites', icon: Globe },
    ...(isAdmin ? [{ href: '/logs', label: 'Journal d\'activité', icon: Activity }] : []),
  ];

  const mobileTabs = [
    { href: '/', label: 'Accueil', icon: BarChart3 },
    { href: '/clients', label: 'Clients', icon: Users },
    { href: '/cartes', label: 'Comptes', icon: CreditCard },
    { href: '/marketing', label: 'Market', icon: Megaphone },
    { href: '/parametres', label: 'Réglages', icon: Settings },
  ];

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={`lg:hidden fixed left-4 z-40 p-2 bg-slate-900 text-white rounded-lg shadow-lg ${isNativeApp ? 'top-2' : 'top-4'}`}
        style={isNativeApp ? { top: 'max(0.5rem, env(safe-area-inset-top))' } : undefined}
      >
        <Menu size={24} />
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside
        className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white flex flex-col h-full transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:relative lg:translate-x-0 lg:flex
      `}
      >
        <div className="p-5 flex items-center justify-between border-b border-slate-800 bg-slate-950/40">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-14 h-14 rounded-xl bg-white/95 shadow-lg shadow-blue-900/35 border border-blue-100/80 flex items-center justify-center shrink-0">
              <img src="/nbbcl.png" alt="NBBC" width={46} height={46} className="object-contain" />
            </div>
            <div className="min-w-0">
              <div className="font-black text-3xl leading-none tracking-wide text-blue-300">NBBC</div>
              <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Platform</div>
            </div>
          </div>
          <button onClick={() => setIsOpen(false)} className="lg:hidden text-slate-400 hover:text-white">
            <X size={24} />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive ? 'bg-blue-600 text-white shadow-md shadow-blue-900/20' : 'hover:bg-slate-800 text-slate-300'
                }`}
              >
                <Icon size={20} />
                <span className="font-medium text-sm">{link.label}</span>
                {link.badge !== undefined && link.badge > 0 && (
                  <span className="ml-auto bg-amber-400 text-amber-900 text-xs font-bold px-2 py-0.5 rounded-full">
                    {link.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800 space-y-3">
          <Link
            href="/parametres"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-3 px-4 py-2 hover:text-white text-slate-400 transition-colors rounded-lg hover:bg-slate-800"
          >
            <Settings size={20} />
            <span className="text-sm">Paramètres</span>
          </Link>

          <div className="pt-3 border-t border-slate-800/50">
            <div className="flex items-center gap-3 px-4 py-2 mb-2 text-slate-300">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-sm font-bold shadow-sm">
                {session?.user?.name?.[0] || 'U'}
              </div>
              <div className="text-sm overflow-hidden">
                <div className="font-bold truncate text-xs">{session?.user?.name}</div>
                <div className="text-[10px] text-slate-500 truncate lowercase">{(session?.user as any)?.role || 'Utilisateur'}</div>
              </div>
            </div>
            <LogoutButton />
          </div>
        </div>
      </aside>

      <nav className={`lg:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 pb-[max(env(safe-area-inset-bottom),0px)] ${isNativeApp ? 'block' : 'hidden'}`}>
        <div className="grid grid-cols-5">
          {mobileTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = pathname === tab.href;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex flex-col items-center justify-center gap-1 py-2.5 text-[11px] font-semibold transition-colors ${isActive ? 'text-blue-600' : 'text-slate-500'}`}
              >
                <Icon size={18} />
                <span>{tab.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
