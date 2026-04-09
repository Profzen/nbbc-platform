import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Compte from '@/models/Compte';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { logActivity } from '@/lib/activity-logger';

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    await dbConnect();
    const body = await request.json();

    const devise = String(body?.devise || 'FCFA').toUpperCase();
    const fallbackRate = devise === 'FCFA' ? 1 : 590;
    const tauxFCFA = Number(body?.tauxFCFA ?? body?.taux ?? fallbackRate);
    const soldeInitialUnites = Number(body?.soldeInitialUnites ?? body?.soldeInitial ?? body?.solde ?? 0);

    const compte = await Compte.findByIdAndUpdate(id, {
      nom: String(body?.nom || '').trim(),
      type: String(body?.type || 'Autre').trim(),
      devise,
      tauxFCFA,
      soldeInitialUnites,
      solde: devise === 'FCFA' ? soldeInitialUnites : soldeInitialUnites * tauxFCFA,
      description: String(body?.description || '').trim() || undefined,
      couleur: String(body?.couleur || '#2563eb'),
      ordre: Number(body?.ordre || 0),
      actif: body?.actif !== false,
    }, { new: true });
    if (!compte) return NextResponse.json({ success: false, error: 'Compte introuvable' }, { status: 404 });

    const sessionPut = await getServerSession(authOptions);
    await logActivity('Compte modifié', `${compte.nom} (${compte.devise})`, {
      id: (sessionPut?.user as any)?.id,
      name: sessionPut?.user?.name || '',
      role: (sessionPut?.user as any)?.role
    });

    return NextResponse.json({ success: true, data: compte });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    await dbConnect();
    const deleted = await Compte.findByIdAndUpdate(id, { actif: false }, { new: false });

    const sessionDel = await getServerSession(authOptions);
    await logActivity('Compte désactivé', `${deleted?.nom || id}`, {
      id: (sessionDel?.user as any)?.id,
      name: sessionDel?.user?.name || '',
      role: (sessionDel?.user as any)?.role
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
