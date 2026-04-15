import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import TontineContract from '@/models/TontineContract';
import TontineEcheance from '@/models/TontineEcheance';
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

    const echeances = await TontineEcheance.find({ contractId: id }).sort({ indexEcheance: 1 }).lean();
    return NextResponse.json({ success: true, data: echeances });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const access = await ensureAccess(id);
    if (access.error) return access.error;
    if (!access.session || !access.contract) {
      return NextResponse.json({ success: false, error: 'Accès refusé.' }, { status: 403 });
    }

    const body = await request.json();
    const items = Array.isArray(body?.echeances) ? body.echeances : null;
    const defaultIndex = Number(body?.indexEcheance || 1);

    const payloads = items?.length
      ? items.map((item: any, index: number) => ({
          contractId: id,
          userId: access.contract?.userId,
          indexEcheance: Number(item?.indexEcheance || index + 1),
          dateEcheance: item?.dateEcheance,
          montantAttendu: Number(item?.montantAttendu || access.contract?.montantVersement || 0),
          montantRecu: Number(item?.montantRecu || 0),
          statut: item?.statut || 'EN_ATTENTE',
          penaliteMontant: Number(item?.penaliteMontant || 0),
        }))
      : [{
          contractId: id,
          userId: access.contract.userId,
          indexEcheance: defaultIndex,
          dateEcheance: body?.dateEcheance,
          montantAttendu: Number(body?.montantAttendu || access.contract.montantVersement || 0),
          montantRecu: Number(body?.montantRecu || 0),
          statut: body?.statut || 'EN_ATTENTE',
          penaliteMontant: Number(body?.penaliteMontant || 0),
        }];

    const created = await TontineEcheance.insertMany(payloads);

    await logActivity('Échéances tontine ajoutées', `${created.length} échéance(s)`, {
      id: (access.session.user as any)?.id,
      name: access.session.user?.name || '',
      role: (access.session.user as any)?.role,
    });

    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}