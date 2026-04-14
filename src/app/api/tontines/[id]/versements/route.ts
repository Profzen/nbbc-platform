import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import TontineContract from '@/models/TontineContract';
import TontineEcheance from '@/models/TontineEcheance';
import TontineVersement from '@/models/TontineVersement';
import { logActivity } from '@/lib/activity-logger';

async function ensureAccess(contractId: string) {
  const session = await getServerSession(authOptions);
  if (!session) return { session: null, contract: null, error: NextResponse.json({ success: false, error: 'Accès refusé.' }, { status: 403 }) };

  await dbConnect();
  const contract = await TontineContract.findById(contractId);
  if (!contract) {
    return { session, contract: null, error: NextResponse.json({ success: false, error: 'Contrat introuvable.' }, { status: 404 }) };
  }

  const role = (session.user as any)?.role;
  const userId = (session.user as any)?.id;
  if (role === 'TONTINE_CLIENT' && String(contract.userId) !== String(userId)) {
    return { session, contract: null, error: NextResponse.json({ success: false, error: 'Accès refusé.' }, { status: 403 }) };
  }

  return { session, contract, error: null };
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const access = await ensureAccess(id);
    if (access.error) return access.error;

    const versements = await TontineVersement.find({ contractId: id }).sort({ createdAt: -1 }).lean();
    return NextResponse.json({ success: true, data: versements });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const access = await ensureAccess(id);
    if (access.error || !access.session || !access.contract) return access.error;

    const body = await request.json();
    const montant = Number(body?.montant);
    const devise = String(body?.devise || access.contract.devise || 'XOF').trim().toUpperCase();
    const railPaiement = String(body?.railPaiement || 'MANUEL').trim().toUpperCase();
    const referenceProvider = String(body?.referenceProvider || '').trim();
    const idempotencyKey = String(body?.idempotencyKey || '').trim();
    const echeanceId = String(body?.echeanceId || '').trim();

    if (!montant || montant <= 0) {
      return NextResponse.json({ success: false, error: 'Montant invalide.' }, { status: 400 });
    }

    if (!['CRYPTO', 'MOBILE_MONEY', 'CARTE', 'BANQUE', 'MANUEL'].includes(railPaiement)) {
      return NextResponse.json({ success: false, error: 'Rail de paiement invalide.' }, { status: 400 });
    }

    const versement = await TontineVersement.create({
      contractId: id,
      echeanceId: echeanceId || undefined,
      userId: access.contract.userId,
      montant,
      devise,
      railPaiement,
      referenceProvider: referenceProvider || undefined,
      idempotencyKey: idempotencyKey || undefined,
      statut: body?.statut || 'SUCCES',
      transactionHash: body?.transactionHash || undefined,
      metadata: body?.metadata || undefined,
    });

    if (echeanceId) {
      const echeance = await TontineEcheance.findById(echeanceId);
      if (echeance && String(echeance.contractId) === String(id)) {
        const nextAmount = (echeance.montantRecu || 0) + montant;
        echeance.montantRecu = nextAmount;
        echeance.datePaiement = nextAmount >= echeance.montantAttendu ? new Date() : echeance.datePaiement;
        echeance.statut = nextAmount >= echeance.montantAttendu ? 'PAYEE' : 'EN_ATTENTE';
        await echeance.save();
      }
    }

    await logActivity('Versement tontine', `${montant} ${devise} via ${railPaiement}`, {
      id: (access.session.user as any)?.id,
      name: access.session.user?.name || '',
      role: (access.session.user as any)?.role,
    });

    return NextResponse.json({ success: true, data: versement }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}