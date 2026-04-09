import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Compte from '@/models/Compte';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { logActivity } from '@/lib/activity-logger';

export async function GET() {
  try {
    await dbConnect();
    const comptes = await Compte.find({ actif: true }).sort({ createdAt: 1 });
    return NextResponse.json({ success: true, data: comptes });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await dbConnect();
    const body = await request.json();

    const devise = String(body?.devise || 'FCFA').toUpperCase();
    const fallbackRate = devise === 'FCFA' ? 1 : 590;
    const tauxFCFA = Number(body?.tauxFCFA ?? body?.taux ?? fallbackRate);
    const soldeInitialUnites = Number(body?.soldeInitialUnites ?? body?.soldeInitial ?? body?.solde ?? 0);

    const compte = await Compte.create({
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
    });

    const session = await getServerSession(authOptions);
    await logActivity('Compte créé', `${compte.nom} (${compte.devise})`, {
      id: (session?.user as any)?.id,
      name: session?.user?.name || '',
      role: (session?.user as any)?.role
    });

    return NextResponse.json({ success: true, data: compte }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
