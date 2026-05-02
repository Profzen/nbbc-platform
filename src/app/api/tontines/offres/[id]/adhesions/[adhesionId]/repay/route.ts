import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import TontineOffre from '@/models/TontineOffre';
import TontineAdhesion from '@/models/TontineAdhesion';
import { buildPaygateHostedPaymentUrl, isPaygateEnabled } from '@/lib/paygate';

const RETRYABLE_STATUSES = new Set(['FAILED', 'EXPIRED', 'CANCELLED']);

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string; adhesionId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Accès refusé.' }, { status: 403 });
    }

    const role = (session.user as any)?.role;
    const userId = (session.user as any)?.id;

    if (role !== 'TONTINE_CLIENT') {
      return NextResponse.json({ success: false, error: 'Réservé aux clients.' }, { status: 403 });
    }

    const { id, adhesionId } = await context.params;

    await dbConnect();

    const [offre, adhesion] = await Promise.all([
      TontineOffre.findById(id).lean(),
      TontineAdhesion.findOne({ _id: adhesionId, offreId: id, clientUserId: userId }),
    ]);

    if (!offre) {
      return NextResponse.json({ success: false, error: 'Offre introuvable.' }, { status: 404 });
    }
    if (!adhesion) {
      return NextResponse.json({ success: false, error: 'Adhésion introuvable.' }, { status: 404 });
    }

    if (!RETRYABLE_STATUSES.has(adhesion.paymentStatus)) {
      return NextResponse.json(
        { success: false, error: `Impossible de relancer: statut actuel "${adhesion.paymentStatus}".` },
        { status: 400 }
      );
    }

    if (!isPaygateEnabled()) {
      return NextResponse.json({ success: false, error: 'PayGate non configuré.' }, { status: 400 });
    }

    // New unique identifier for the retry
    const newIdentifier = `NBBC-${String(id)}-${String(userId)}-${Date.now()}`;
    adhesion.paymentIdentifier = newIdentifier;
    adhesion.paymentStatus = 'PENDING';
    adhesion.paygateTxReference = '';
    adhesion.paygatePaymentReference = '';
    adhesion.paymentRawStatus = '';
    await adhesion.save();

    const redirectUrl = buildPaygateHostedPaymentUrl({
      amount: (offre as any).montantCotisation,
      identifier: newIdentifier,
      description: `Adhesion tontine ${(offre as any).nom}`,
    });

    return NextResponse.json({ success: true, data: { redirectUrl } });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
