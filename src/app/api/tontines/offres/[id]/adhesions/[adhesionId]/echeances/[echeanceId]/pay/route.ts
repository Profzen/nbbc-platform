import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import TontineOffre from '@/models/TontineOffre';
import TontineAdhesion from '@/models/TontineAdhesion';
import TontineAdhesionEcheance from '@/models/TontineAdhesionEcheance';
import { buildPaygateHostedPaymentUrl, isPaygateEnabled } from '@/lib/paygate';
import { markEcheanceAwaitingValidation } from '@/lib/tontine-schedule';

const RETRYABLE_STATUSES = new Set(['FAILED', 'EXPIRED', 'CANCELLED']);

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

    const [offre, adhesion, echeance] = await Promise.all([
      TontineOffre.findById(id).lean(),
      TontineAdhesion.findOne({ _id: adhesionId, offreId: id }),
      TontineAdhesionEcheance.findOne({ _id: echeanceId, adhesionId, offreId: id }),
    ]);

    if (!offre || !adhesion || !echeance) {
      return NextResponse.json({ success: false, error: 'Ressource introuvable.' }, { status: 404 });
    }

    if (role === 'TONTINE_CLIENT' && String(adhesion.clientUserId) !== String(userId)) {
      return NextResponse.json({ success: false, error: 'Accès refusé.' }, { status: 403 });
    }

    if (echeance.statut === 'PAYEE') {
      return NextResponse.json({ success: true, data: { echeance } });
    }

    const moyenPaiement = adhesion.moyenPaiementChoisi;

    if (moyenPaiement === 'MOBILE_MONEY') {
      if (!isPaygateEnabled()) {
        return NextResponse.json({ success: false, error: 'Paiement mobile money indisponible: configuration PayGate manquante.' }, { status: 400 });
      }

      if (echeance.paymentStatus === 'PENDING' && echeance.paymentIdentifier) {
        const redirectUrl = buildPaygateHostedPaymentUrl({
          amount: echeance.montantPrevu,
          identifier: String(echeance.paymentIdentifier),
          description: `Echeance ${echeance.numeroEcheance} - ${String((offre as any).nom || 'tontine')}`,
        });
        return NextResponse.json({ success: true, data: { echeance, payment: { provider: 'PAYGATE', redirectUrl } } });
      }

      const mustRotateIdentifier = !echeance.paymentIdentifier || RETRYABLE_STATUSES.has(String(echeance.paymentStatus || ''));
      if (mustRotateIdentifier) {
        echeance.paymentIdentifier = `NBBC-ECH-${String(id)}-${String(adhesion.clientUserId)}-${echeance.numeroEcheance}-${Date.now()}`;
      }

      echeance.paymentProvider = 'PAYGATE';
      echeance.paymentStatus = 'PENDING';
      echeance.paygateTxReference = '';
      echeance.paygatePaymentReference = '';
      echeance.paymentRawStatus = '';
      await echeance.save();

      const redirectUrl = buildPaygateHostedPaymentUrl({
        amount: echeance.montantPrevu,
        identifier: String(echeance.paymentIdentifier),
        description: `Echeance ${echeance.numeroEcheance} - ${String((offre as any).nom || 'tontine')}`,
      });

      return NextResponse.json({ success: true, data: { echeance, payment: { provider: 'PAYGATE', redirectUrl } } });
    }

    const body = await _request.json().catch(() => ({}));
    const note = String(body?.note || '').trim();
    const preuveReference = String(body?.preuveReference || '').trim();
    const preuveNote = String(body?.preuveNote || '').trim();

    if (echeance.validationStatus === 'PENDING') {
      return NextResponse.json({
        success: true,
        data: { echeance, message: 'Votre déclaration de paiement est déjà en attente de validation.' },
      });
    }

    markEcheanceAwaitingValidation(echeance, note || 'Paiement déclaré par le client, en attente de validation.', preuveReference || undefined, preuveNote || undefined);
    await echeance.save();

    return NextResponse.json({
      success: true,
      data: { echeance, message: 'Déclaration enregistrée. Un agent va valider cette échéance.' },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Paiement impossible.' }, { status: 500 });
  }
}