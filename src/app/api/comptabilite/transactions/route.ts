import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Transaction from '@/models/Transaction';
import Compte from '@/models/Compte';
import { getPreferredRate } from '@/lib/accounting';

export async function GET(request: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    
    const filter = type ? { type } : {};
    const transactions = await Transaction.find(filter).sort({ date: -1 });
    
    return NextResponse.json({ success: true, data: transactions });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await dbConnect();
    const body = await request.json();

    const comptes = await Compte.find({ actif: true }).lean();
    const existingTransactions = await Transaction.find({}, { type: 1, date: 1, quantite: 1, txCurrency: 1, amountFCFA: 1 }).lean();

    const quantite = Number(body?.quantite || 0);
    const prixUnitaire = Number(body?.prixUnitaire || 0);
    const montant = body?.montant !== undefined && body?.montant !== null && body?.montant !== ''
      ? Number(body.montant)
      : quantite * prixUnitaire;
    const txCurrency = String(body?.txCurrency || 'FCFA').toUpperCase();
    const rateUsed = Number(body?.rateUsed || getPreferredRate(txCurrency, body?.date, comptes as any, existingTransactions as any));
    const amountFCFA = txCurrency === 'FCFA' ? montant : Math.round(montant * rateUsed * 100) / 100;

    const transaction = await Transaction.create({
      type: String(body?.type || 'ACHAT').toUpperCase(),
      date: body?.date,
      description: String(body?.description || '').trim(),
      quantite: quantite || undefined,
      prixUnitaire: prixUnitaire || undefined,
      montant,
      compte: String(body?.compte || '').trim() || undefined,
      tiers: String(body?.tiers || '').trim() || undefined,
      txCurrency,
      rateUsed,
      amountFCFA,
      accountDebitId: body?.accountDebitId || undefined,
      accountCreditId: body?.accountCreditId || undefined,
      notes: String(body?.notes || '').trim() || undefined,
    });
    return NextResponse.json({ success: true, data: transaction }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
