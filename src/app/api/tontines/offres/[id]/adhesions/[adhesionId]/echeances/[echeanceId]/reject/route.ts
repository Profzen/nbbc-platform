import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import TontineAdhesion from '@/models/TontineAdhesion';
import TontineAdhesionEcheance from '@/models/TontineAdhesionEcheance';
import { getEffectiveEcheanceStatut, rejectEcheancePayment } from '@/lib/tontine-schedule';

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string; adhesionId: string; echeanceId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Accès refusé.' }, { status: 403 });
    }

    const role = (session.user as any)?.role;
    if (role !== 'SUPER_ADMIN' && role !== 'AGENT') {
      return NextResponse.json({ success: false, error: 'Action non autorisée.' }, { status: 403 });
    }

    const { id, adhesionId, echeanceId } = await context.params;
    const body = await request.json().catch(() => ({}));
    const note = String(body?.note || '').trim();

    await dbConnect();

    const [adhesion, echeance] = await Promise.all([
      TontineAdhesion.findOne({ _id: adhesionId, offreId: id }),
      TontineAdhesionEcheance.findOne({ _id: echeanceId, adhesionId, offreId: id }),
    ]);

    if (!adhesion || !echeance) {
      return NextResponse.json({ success: false, error: 'Ressource introuvable.' }, { status: 404 });
    }

    rejectEcheancePayment(echeance, note || 'Demande refusée par un agent.');
    echeance.validatedBy = (session.user as any)?.id;
    echeance.montantPaye = 0;
    echeance.statut = getEffectiveEcheanceStatut(echeance);
    await echeance.save();

    return NextResponse.json({ success: true, data: { echeance } });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Refus impossible.' }, { status: 500 });
  }
}