import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import TontineAdhesion from '@/models/TontineAdhesion';
import TontineAdhesionEcheance from '@/models/TontineAdhesionEcheance';
import { checkPaygateStatusByIdentifier, mapPaygateStatusToInternal } from '@/lib/paygate';
import { applyPaygateStatusToEcheance } from '@/lib/tontine-schedule';

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string; adhesionId: string; echeanceId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Accès refusé.' }, { status: 403 });
    }

    const role = (session.user as any)?.role;
    const userId = (session.user as any)?.id;
    const { id, adhesionId, echeanceId } = await context.params;

    await dbConnect();

    const [adhesion, echeance] = await Promise.all([
      TontineAdhesion.findOne({ _id: adhesionId, offreId: id }),
      TontineAdhesionEcheance.findOne({ _id: echeanceId, adhesionId, offreId: id }),
    ]);

    if (!adhesion || !echeance) {
      return NextResponse.json({ success: false, error: 'Ressource introuvable.' }, { status: 404 });
    }

    if (role === 'TONTINE_CLIENT' && String(adhesion.clientUserId) !== String(userId)) {
      return NextResponse.json({ success: false, error: 'Accès refusé.' }, { status: 403 });
    }

    if (!echeance.paymentIdentifier) {
      return NextResponse.json({ success: false, error: 'Aucune transaction PayGate liée à cette échéance.' }, { status: 400 });
    }

    const statusPayload = await checkPaygateStatusByIdentifier(String(echeance.paymentIdentifier));
    const internalStatus = mapPaygateStatusToInternal(String(statusPayload?.status || ''));
    applyPaygateStatusToEcheance(echeance, internalStatus, statusPayload);
    await echeance.save();

    return NextResponse.json({ success: true, data: { echeance } });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Vérification impossible.' }, { status: 500 });
  }
}