import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Transaction from '@/models/Transaction';
import Compte from '@/models/Compte';
import { getPreferredRate } from '@/lib/accounting';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { logActivity } from '@/lib/activity-logger';

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
    // Trouver la devise et le taux du compte crédité (si fourni)
    let creditAccountDevise = undefined;
    let creditAccountTaux = 1;
    if (body?.accountCreditId) {
      const creditAccount = comptes.find((c) => String(c._id) === String(body.accountCreditId));
      if (creditAccount) {
        creditAccountDevise = creditAccount.devise;
        creditAccountTaux = Number(creditAccount.tauxFCFA || 1);
      }
    }
    // Nouvelle règle stricte :
    // - Si la devise de la transaction = devise du compte crédité, montant FCFA = montant (pas de taux)
    // - Si la devise de la transaction est FCFA, montant FCFA = montant
    // - Sinon, montant FCFA = montant × taux du compte crédité (si dispo, sinon 1)
    let rateUsed = 1;
    let amountFCFA = montant;
    if (txCurrency === 'FCFA') {
      amountFCFA = montant;
      rateUsed = 1;
    } else if (creditAccountDevise && txCurrency === creditAccountDevise) {
      amountFCFA = montant;
      rateUsed = 1;
    } else {
      amountFCFA = montant * (creditAccountTaux || 1);
      rateUsed = creditAccountTaux || 1;
    }
    amountFCFA = Math.round(amountFCFA * 100) / 100;

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

    const session = await getServerSession(authOptions);
    await logActivity('Transaction créée', `${transaction.type} — ${transaction.description || ''} (${transaction.amountFCFA} FCFA)`, {
      id: (session?.user as any)?.id,
      name: session?.user?.name || '',
      role: (session?.user as any)?.role
    });

    return NextResponse.json({ success: true, data: transaction }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
