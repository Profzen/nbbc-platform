import { ITontineAdhesion } from '@/models/TontineAdhesion';
import { ITontineOffre, TontineFrequence } from '@/models/TontineOffre';
import { TontineAdhesionEcheanceStatut } from '@/models/TontineAdhesionEcheance';

export function getFrequencyWeeks(frequence: TontineFrequence | string) {
  if (frequence === 'HEBDOMADAIRE') return 1;
  if (frequence === 'BI_HEBDOMADAIRE') return 2;
  return 4;
}

export function addWeeks(date: Date, weeks: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + weeks * 7);
  return next;
}

export function resolveEcheanceStatut(dateEcheance: Date, paid: boolean, now = new Date()): TontineAdhesionEcheanceStatut {
  if (paid) return 'PAYEE';

  const due = new Date(dateEcheance);
  const current = new Date(now);
  due.setHours(0, 0, 0, 0);
  current.setHours(0, 0, 0, 0);

  if (due.getTime() > current.getTime()) {
    return 'A_PREVOIR';
  }

  if (due.getTime() === current.getTime()) {
    return 'EN_ATTENTE';
  }

  return 'EN_RETARD';
}

export function getEffectiveEcheanceStatut(echeance: { dateEcheance: Date | string; statut: string; montantPrevu?: number; montantPaye?: number }, now = new Date()): TontineAdhesionEcheanceStatut {
  if (echeance.statut === 'PAYEE' || Number(echeance.montantPaye || 0) >= Number(echeance.montantPrevu || 0)) {
    return 'PAYEE';
  }

  if (echeance.statut === 'ANNULEE') {
    return 'ANNULEE';
  }

  return resolveEcheanceStatut(new Date(echeance.dateEcheance), false, now);
}

export function applyPaygateStatusToEcheance(echeance: any, internalStatus: string, statusPayload: any) {
  echeance.paymentRawStatus = String(statusPayload?.status || '');
  echeance.paygateTxReference = String(statusPayload?.tx_reference || echeance.paygateTxReference || '');
  echeance.paygatePaymentReference = String(statusPayload?.payment_reference || echeance.paygatePaymentReference || '');
  echeance.paygatePaymentMethod = String(statusPayload?.payment_method || echeance.paygatePaymentMethod || '');

  if (internalStatus === 'SUCCESS') {
    echeance.paymentStatus = 'SUCCESS';
    echeance.statut = 'PAYEE';
    echeance.montantPaye = echeance.montantPrevu;
    echeance.paidAt = new Date();
    echeance.validationStatus = 'NOT_REQUIRED';
    return;
  }

  if (internalStatus === 'PENDING') {
    echeance.paymentStatus = 'PENDING';
    echeance.statut = getEffectiveEcheanceStatut(echeance);
    return;
  }

  if (internalStatus === 'EXPIRED') {
    echeance.paymentStatus = 'EXPIRED';
    echeance.statut = getEffectiveEcheanceStatut(echeance);
    return;
  }

  if (internalStatus === 'CANCELLED') {
    echeance.paymentStatus = 'CANCELLED';
    echeance.statut = getEffectiveEcheanceStatut(echeance);
    return;
  }

  echeance.paymentStatus = 'FAILED';
  echeance.statut = getEffectiveEcheanceStatut(echeance);
}

export function markEcheanceAsPaid(echeance: any) {
  echeance.paymentStatus = 'SUCCESS';
  echeance.statut = 'PAYEE';
  echeance.montantPaye = echeance.montantPrevu;
  echeance.paidAt = new Date();
  echeance.validationStatus = 'APPROVED';
}

export function markEcheanceAwaitingValidation(echeance: any, note?: string, preuveReference?: string, preuveNote?: string) {
  echeance.paymentStatus = 'PENDING';
  echeance.validationStatus = 'PENDING';
  echeance.validationRequestedAt = new Date();
  echeance.validationNote = note || '';
  if (preuveReference) echeance.preuveReference = preuveReference;
  if (preuveNote) echeance.preuveNote = preuveNote;
}

export function rejectEcheancePayment(echeance: any, note?: string) {
  echeance.paymentStatus = 'FAILED';
  echeance.validationStatus = 'REJECTED';
  echeance.validationNote = note || '';
  echeance.validatedAt = new Date();
}

export function buildAdhesionEcheances(offre: Pick<ITontineOffre, '_id' | 'nombreTours' | 'montantCotisation' | 'frequence' | 'dateDebutPrevue'>, adhesion: Pick<ITontineAdhesion, '_id' | 'clientUserId' | 'moyenPaiementChoisi' | 'createdAt'>) {
  const total = Number(offre.nombreTours || 0);
  const periodWeeks = getFrequencyWeeks(String(offre.frequence));
  const startDate = offre.dateDebutPrevue ? new Date(offre.dateDebutPrevue) : new Date(adhesion.createdAt || new Date());

  return Array.from({ length: total }, (_, index) => {
    const dateEcheance = addWeeks(startDate, index * periodWeeks);
    return {
      adhesionId: adhesion._id,
      offreId: offre._id,
      clientUserId: adhesion.clientUserId,
      numeroEcheance: index + 1,
      dateEcheance,
      montantPrevu: offre.montantCotisation,
      montantPaye: 0,
      statut: resolveEcheanceStatut(dateEcheance, false),
      moyenPaiementChoisi: adhesion.moyenPaiementChoisi,
      paymentStatus: 'NONE' as const,
      validationStatus: adhesion.moyenPaiementChoisi === 'MOBILE_MONEY' ? 'NOT_REQUIRED' as const : 'NOT_REQUIRED' as const,
    };
  });
}