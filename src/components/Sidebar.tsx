import Link from 'next/link';
import { Users, CreditCard, FileText, BarChart3, Settings, ShieldCheck, Megaphone, PenTool, BookOpen } from 'lucide-react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import LogoutButton from './LogoutButton';
import dbConnect from '@/lib/mongodb';
import KycRequest from '@/models/KycRequest';
import { headers } from 'next/headers';

export default async function Sidebar() {
  const session = await getServerSession(authOptions);
  if (!session) return null;

  // Masquer la sidebar sur les pages publiques KYC (/kyc/UUID)
  const headersList = await headers();
  const pathname = headersList.get('x-current-path') || '';
  if (/^\/kyc\/[0-9a-f-]{36}/.test(pathname)) return null;
  if (/^\/sign\//.test(pathname)) return null;

  await dbConnect();
  const pendingKyc = await KycRequest.countDocuments({ dateSubmission: { $exists: true, $ne: null }, statutKyc: 'EN_ATTENTE' });

  return (
    <aside className="w-64 bg-slate-900 text-white flex flex-col h-screen sticky top-0">
      <div className="p-6 font-bold text-2xl tracking-wider text-blue-400 border-b border-slate-800">
        NBBC Platform
      </div>
      <nav className="flex-1 p-4 space-y-2">
        <Link href="/" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-800 text-slate-300 transition-colors">
          <BarChart3 size={20} />
          Dashboard
        </Link>
        <Link href="/clients" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-800 text-slate-300 transition-colors">
          <Users size={20} />
          Clients
        </Link>
        <Link href="/cartes" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-800 text-slate-300 transition-colors">
          <CreditCard size={20} />
          Cartes & Comptes
        </Link>
        <Link href="/signatures" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-800 text-slate-300 transition-colors">
          <PenTool size={20} />
          E-Signature
        </Link>
        <Link href="/comptabilite" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-800 text-slate-300 transition-colors">
          <BookOpen size={20} />
          Comptabilité
        </Link>
        <Link href="/kyc" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-800 text-slate-300 transition-colors">
          <ShieldCheck size={20} />
          Vérification KYC
          {pendingKyc > 0 && (
            <span className="ml-auto bg-amber-400 text-amber-900 text-xs font-bold px-2 py-0.5 rounded-full">
              {pendingKyc}
            </span>
          )}
        </Link>
        <Link href="/marketing" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-slate-800 text-slate-300 transition-colors">
          <Megaphone size={20} />
          Marketing
        </Link>
      </nav>
      <div className="p-4 border-t border-slate-800 space-y-3">
        <Link href="/parametres" className="flex items-center gap-3 px-4 py-2 hover:text-white text-slate-400 transition-colors rounded-lg hover:bg-slate-800">
          <Settings size={20} />
          Paramètres
        </Link>
        
        
        <div className="pt-3 border-t border-slate-800/50">
          <div className="flex items-center gap-3 px-4 py-2 mb-2 text-slate-300">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-sm font-bold shadow-sm">
              {session?.user?.name?.[0] || 'U'}
            </div>
            <div className="text-sm overflow-hidden">
              <div className="font-bold truncate">{session?.user?.name}</div>
              <div className="text-xs text-slate-500 truncate">{(session?.user as any)?.role || 'Utilisateur'}</div>
            </div>
          </div>
          <LogoutButton />
        </div>
      </div>
    </aside>
  );
}
