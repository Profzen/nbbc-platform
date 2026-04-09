import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Transaction from '@/models/Transaction';
import Compte from '@/models/Compte';
import { getPreferredRate } from '@/lib/accounting';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { logActivity } from '@/lib/activity-logger';

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    await dbConnect();
    const body = await request.json();

    const comptes = await Compte.find({ actif: true }).lean();
    const existingTransactions = await Transaction.find({ _id: { $ne: id } }, { type: 1, date: 1, quantite: 1, txCurrency: 1, amountFCFA: 1 }).lean();

    const quantite = Number(body?.quantite || 0);
    const prixUnitaire = Number(body?.prixUnitaire || 0);
    const montant = body?.montant !== undefined && body?.montant !== null && body?.montant !== ''
      ? Number(body.montant)
      : quantite * prixUnitaire;
    const txCurrency = String(body?.txCurrency || 'FCFA').toUpperCase();
    const rateUsed = Number(body?.rateUsed || getPreferredRate(txCurrency, body?.date, comptes as any, existingTransactions as any));
    const amountFCFA = txCurrency === 'FCFA' ? montant : Math.round(montant * rateUsed * 100) / 100;

    const transaction = await Transaction.findByIdAndUpdate(id, {
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
    }, { new: true });
    if (!transaction) {
      return NextResponse.json({ success: false, error: 'Transaction introuvable' }, { status: 404 });
    }

    const sessionPut = await getServerSession(authOptions);
    await logActivity('Transaction modifiée', `${transaction.type} — ${transaction.description || ''} (${transaction.amountFCFA} FCFA)`, {
      id: (sessionPut?.user as any)?.id,
      name: sessionPut?.user?.name || '',
      role: (sessionPut?.user as any)?.role
    });

    return NextResponse.json({ success: true, data: transaction });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    await dbConnect();
    
    const deleted = await Transaction.findByIdAndDelete(id);

    const sessionDel = await getServerSession(authOptions);
    await logActivity('Transaction supprimée', `${deleted?.type || ''} — ${deleted?.description || ''} (${deleted?.amountFCFA || 0} FCFA)`, {
      id: (sessionDel?.user as any)?.id,
      name: sessionDel?.user?.name || '',
      role: (sessionDel?.user as any)?.role
    });

    return NextResponse.json({ success: true, message: 'Transaction supprimée' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
