import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import DepotRetrait from '@/models/DepotRetrait';

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    await dbConnect();
    const body = await request.json();

    const quantite = Number(body?.quantite || 1);
    const montantUnitaire = Number(body?.montantUnitaire ?? body?.montant ?? 0);
    const montant = Number(body?.montant ?? (quantite * montantUnitaire));

    const op = await DepotRetrait.findByIdAndUpdate(id, {
      type: String(body?.type || 'DEPOT').toUpperCase(),
      date: body?.date,
      montant,
      quantite,
      montantUnitaire,
      operateur: String(body?.operateur || '').trim(),
      compteId: body?.compteId || undefined,
      compteDebitId: body?.compteDebitId || undefined,
      compteCreditId: body?.compteCreditId || undefined,
      description: String(body?.description || '').trim() || undefined,
      notes: String(body?.notes || '').trim() || undefined,
    }, { new: true });

    if (!op) {
      return NextResponse.json({ success: false, error: 'Opération introuvable' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: op });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    await dbConnect();
    await DepotRetrait.findByIdAndDelete(id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
