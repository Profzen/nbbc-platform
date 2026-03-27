import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import DepotRetrait from '@/models/DepotRetrait';

export async function GET() {
  try {
    await dbConnect();
    const operations = await DepotRetrait.find().populate('compteId', 'nom').sort({ date: -1 });
    return NextResponse.json({ success: true, data: operations });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await dbConnect();
    const body = await request.json();
    const quantite = Number(body?.quantite || 1);
    const montantUnitaire = Number(body?.montantUnitaire ?? body?.montant ?? 0);
    const montant = Number(body?.montant ?? (quantite * montantUnitaire));

    const op = await DepotRetrait.create({
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
    });
    return NextResponse.json({ success: true, data: op }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
