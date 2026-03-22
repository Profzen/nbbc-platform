"use client";

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Users, CreditCard, FileText, BarChart3, Settings, ShieldCheck, Megaphone, PenTool, BookOpen, Menu, X } from 'lucide-react';
import LogoutButton from './LogoutButton';

interface SidebarClientProps {
  session: any;
  pendingKyc: number;
}

export default function SidebarClient({ session, pendingKyc }: SidebarClientProps) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  // Masquer la sidebar sur les pages publiques
  if (pathname.startsWith('/login')) return null;
  if (pathname.startsWith('/register')) return null;
  if (pathname.startsWith('/kyc/') && pathname.length > 10) return null;
  if (pathname.startsWith('/sign/')) return null;

  const navLinks = [
    { href: '/', label: 'Dashboard', icon: BarChart3 },
    { href: '/clients', label: 'Clients', icon: Users },
    { href: '/cartes', label: 'Cartes & Comptes', icon: CreditCard },
    { href: '/signatures', label: 'E-Signature', icon: PenTool },
    { href: '/comptabilite', label: 'Comptabilité', icon: BookOpen },
    { href: '/kyc', label: 'Vérification KYC', icon: ShieldCheck, badge: pendingKyc },
    { href: '/marketing', label: 'Marketing', icon: Megaphone },
  ];

  return (
    <>
      {/* BOUTON HAMBURGER (MOBILE ONLY) */}
      <button 
        onClick={() => setIsOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-40 p-2 bg-slate-900 text-white rounded-lg shadow-lg"
      >
        <Menu size={24} />
      </button>

      {/* OVERLAY (MOBILE ONLY) */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* SIDEBAR */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white flex flex-col h-full transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:relative lg:translate-x-0 lg:flex
      `}>
        <div className="p-6 flex items-center justify-between border-b border-slate-800">
          <span className="font-bold text-2xl tracking-wider text-blue-400">NBBC</span>
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
    </>
  );
}
