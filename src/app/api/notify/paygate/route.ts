import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import TontineAdhesion from '@/models/TontineAdhesion';
import TontineAdhesionEcheance from '@/models/TontineAdhesionEcheance';
import { checkPaygateStatusByIdentifier, mapPaygateStatusToInternal } from '@/lib/paygate';
import { applyPaygateStatusToEcheance } from '@/lib/tontine-schedule';

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

export async function POST(request: Request) {
  try {
    await dbConnect();

    const body = await request.json();
    const identifier = String(body?.identifier || '').trim();
    if (!identifier) {
      return NextResponse.json({ success: false, error: 'Identifier manquant.' }, { status: 400 });
    }

    const echeance = await TontineAdhesionEcheance.findOne({ paymentIdentifier: identifier });
    if (echeance) {
      const statusPayload = await checkPaygateStatusByIdentifier(identifier);
      const internalStatus = mapPaygateStatusToInternal(String(statusPayload?.status || ''));
      applyPaygateStatusToEcheance(echeance, internalStatus, statusPayload);
      await echeance.save();

      return NextResponse.json({ success: true, data: { echeanceId: echeance._id, paymentStatus: echeance.paymentStatus } });
    }

    const adhesion = await TontineAdhesion.findOne({ paymentIdentifier: identifier });
    if (!adhesion) {
      return NextResponse.json({ success: false, error: 'Adhesion introuvable.' }, { status: 404 });
    }

    const statusPayload = await checkPaygateStatusByIdentifier(identifier);
    const internalStatus = mapPaygateStatusToInternal(String(statusPayload?.status || ''));
    applyPaymentStatus(adhesion, internalStatus, statusPayload);
    await adhesion.save();

    return NextResponse.json({ success: true, data: { adhesionId: adhesion._id, paymentStatus: adhesion.paymentStatus } });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Erreur callback PayGate.' }, { status: 500 });
  }
}
