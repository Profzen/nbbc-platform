import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import TontineAdhesion from '@/models/TontineAdhesion';
import { checkPaygateStatusByIdentifier, mapPaygateStatusToInternal } from '@/lib/paygate';

function applyPaymentStatus(adhesion: any, internalStatus: string, statusPayload: any) {
  adhesion.paymentRawStatus = String(statusPayload?.status || '');
  adhesion.paygateTxReference = String(statusPayload?.tx_reference || adhesion.paygateTxReference || '');
  adhesion.paygatePaymentReference = String(statusPayload?.payment_reference || adhesion.paygatePaymentReference || '');
  adhesion.paygatePaymentMethod = String(statusPayload?.payment_method || adhesion.paygatePaymentMethod || '');

  if (internalStatus === 'SUCCESS') {
    adhesion.paymentStatus = 'SUCCESS';
    adhesion.statut = 'VALIDEE';
    return;
  }

  if (internalStatus === 'PENDING') {
    adhesion.paymentStatus = 'PENDING';
    adhesion.statut = 'EN_ATTENTE';
    return;
  }

  if (internalStatus === 'EXPIRED') {
    adhesion.paymentStatus = 'EXPIRED';
    adhesion.statut = 'EN_ATTENTE';
    return;
  }

  if (internalStatus === 'CANCELLED') {
    adhesion.paymentStatus = 'CANCELLED';
    adhesion.statut = 'EN_ATTENTE';
    return;
  }

  adhesion.paymentStatus = 'FAILED';
  adhesion.statut = 'EN_ATTENTE';
}

export async function POST(_request: Request, context: { params: Promise<{ id: string; adhesionId: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Acces refuse.' }, { status: 403 });
    }

    const role = (session.user as any)?.role;
    const userId = (session.user as any)?.id;
    const { id, adhesionId } = await context.params;

    await dbConnect();
    const adhesion = await TontineAdhesion.findOne({ _id: adhesionId, offreId: id });
    if (!adhesion) {
      return NextResponse.json({ success: false, error: 'Adhesion introuvable.' }, { status: 404 });
    }

    if (role === 'TONTINE_CLIENT' && String(adhesion.clientUserId) !== String(userId)) {
      return NextResponse.json({ success: false, error: 'Acces refuse.' }, { status: 403 });
    }

    if (!adhesion.paymentIdentifier) {
      return NextResponse.json({ success: false, error: 'Aucune transaction PayGate liee.' }, { status: 400 });
    }

    const statusPayload = await checkPaygateStatusByIdentifier(String(adhesion.paymentIdentifier));
    const internalStatus = mapPaygateStatusToInternal(String(statusPayload?.status || ''));
    applyPaymentStatus(adhesion, internalStatus, statusPayload);
    await adhesion.save();

    return NextResponse.json({ success: true, data: adhesion });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Verification impossible.' }, { status: 500 });
  }
}
