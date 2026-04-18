import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import DepotRetrait from '@/models/DepotRetrait';
import { round2 } from '@/lib/accounting';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { logActivity } from '@/lib/activity-logger';

const VALID_TYPES = ['DEPOT', 'RETRAIT', 'GAIN', 'EPARGNE_DEPOT', 'EPARGNE_RETRAIT'] as const;

export async function GET() {
  try {
    await dbConnect();
    const operations = await DepotRetrait.find()
      .populate('compteId', 'nom')
      .populate('compteDebitId', 'nom')
      .populate('compteCreditId', 'nom')
      .populate('compteFraisCreditId', 'nom')
      .sort({ date: -1 });
    return NextResponse.json({ success: true, data: operations });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await dbConnect();
    const body = await request.json();
    const type = String(body?.type || 'DEPOT').toUpperCase();
    if (!VALID_TYPES.includes(type as (typeof VALID_TYPES)[number])) {
      return NextResponse.json({ success: false, error: 'Type d\'opération invalide.' }, { status: 400 });
    }

    const quantite = Number(body?.quantite || 1);
    const montantUnitaire = Number(body?.montantUnitaire ?? body?.montant ?? 0);
    const montant = round2(Number(body?.montant ?? (quantite * montantUnitaire)));
    const fraisPourcentage = type === 'EPARGNE_DEPOT' ? round2(Number(body?.fraisPourcentage ?? 3.4)) : undefined;
    const fraisMontant = type === 'EPARGNE_DEPOT' ? round2(Number(body?.fraisMontant ?? (montant * Number(fraisPourcentage || 0)) / 100)) : undefined;
    const montantNet = type === 'EPARGNE_DEPOT' ? round2(Number(body?.montantNet ?? (montant - Number(fraisMontant || 0)))) : undefined;

    const op = await DepotRetrait.create({
      type,
      date: body?.date,
      montant,
      quantite,
      montantUnitaire,
      montantNet,
      fraisPourcentage,
      fraisMontant,
      operateur: String(body?.operateur || '').trim(),
      compteId: body?.compteId || undefined,
      compteDebitId: body?.compteDebitId || undefined,
      compteCreditId: body?.compteCreditId || undefined,
      compteFraisCreditId: body?.compteFraisCreditId || undefined,
      description: String(body?.description || '').trim() || undefined,
      notes: String(body?.notes || '').trim() || undefined,
    });

    const session = await getServerSession(authOptions);
    await logActivity('Dépôt/Retrait créé', `${op.type} — ${op.montant} (${op.operateur || ''})`, {
      id: (session?.user as any)?.id,
      name: session?.user?.name || '',
      role: (session?.user as any)?.role
    });

    return NextResponse.json({ success: true, data: op }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
