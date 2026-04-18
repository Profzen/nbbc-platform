import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import DepotRetrait from '@/models/DepotRetrait';
import { round2 } from '@/lib/accounting';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { logActivity } from '@/lib/activity-logger';

const VALID_TYPES = ['DEPOT', 'RETRAIT', 'GAIN', 'EPARGNE_DEPOT', 'EPARGNE_RETRAIT'] as const;

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
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

    const op = await DepotRetrait.findByIdAndUpdate(id, {
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
    }, { new: true });

    if (!op) {
      return NextResponse.json({ success: false, error: 'Opération introuvable' }, { status: 404 });
    }

    const sessionPut = await getServerSession(authOptions);
    await logActivity('Dépôt/Retrait modifié', `${op.type} — ${op.montant} (${op.operateur || ''})`, {
      id: (sessionPut?.user as any)?.id,
      name: sessionPut?.user?.name || '',
      role: (sessionPut?.user as any)?.role
    });

    return NextResponse.json({ success: true, data: op });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    await dbConnect();
    const deleted = await DepotRetrait.findByIdAndDelete(id);

    const sessionDel = await getServerSession(authOptions);
    await logActivity('Dépôt/Retrait supprimé', `${deleted?.type || ''} — ${deleted?.montant || 0}`, {
      id: (sessionDel?.user as any)?.id,
      name: sessionDel?.user?.name || '',
      role: (sessionDel?.user as any)?.role
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
