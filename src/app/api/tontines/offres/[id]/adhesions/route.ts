import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import TontineOffre from '@/models/TontineOffre';
import TontineAdhesion from '@/models/TontineAdhesion';
import TontineTour from '@/models/TontineTour';
import { logActivity } from '@/lib/activity-logger';
import { buildPaygateHostedPaymentUrl, isPaygateEnabled } from '@/lib/paygate';

const ROLES_CAN_MANAGE = new Set(['SUPER_ADMIN', 'AGENT']);

function addWeeks(date: Date, weeks: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + weeks * 7);
  return next;
}

function getFrequencyWeeks(frequence: string) {
  if (frequence === 'HEBDOMADAIRE') return 1;
  if (frequence === 'BI_HEBDOMADAIRE') return 2;
  return 4;
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Accès refusé.' }, { status: 403 });
    }

    const role = (session.user as any)?.role;
    const userId = (session.user as any)?.id;
    const { id } = await context.params;

    await dbConnect();

    if (role === 'TONTINE_CLIENT') {
      const mine = await TontineAdhesion.find({ offreId: id, clientUserId: userId }).lean();
      return NextResponse.json({ success: true, data: mine });
    }

    const adhesions = await TontineAdhesion.find({ offreId: id })
      .populate('clientUserId', 'name email role')
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ success: true, data: adhesions });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Accès refusé.' }, { status: 403 });
    }

    const role = (session.user as any)?.role;
    const userId = (session.user as any)?.id;
    const { id } = await context.params;

    await dbConnect();

    const offre = await TontineOffre.findById(id);
    if (!offre) {
      return NextResponse.json({ success: false, error: 'Offre introuvable.' }, { status: 404 });
    }

    if (!['OUVERTE', 'COMPLETE', 'EN_COURS'].includes(offre.statut)) {
      return NextResponse.json({ success: false, error: 'Cette offre n\'est pas ouverte aux adhésions.' }, { status: 400 });
    }

    const body = await request.json();
    const requestedUserId = String(body?.userId || '').trim();
    const clientUserId = role === 'TONTINE_CLIENT' ? userId : (requestedUserId || userId);
    const moyenPaiementChoisi = String(body?.moyenPaiementChoisi || 'MANUEL').trim().toUpperCase();
    const paymentNetwork = String(body?.paymentNetwork || '').trim().toUpperCase();

    if (!clientUserId) {
      return NextResponse.json({ success: false, error: 'Utilisateur cible introuvable.' }, { status: 400 });
    }

    if (!offre.moyensPaiementAcceptes.includes(moyenPaiementChoisi)) {
      return NextResponse.json({ success: false, error: 'Moyen de paiement non autorisé pour cette offre.' }, { status: 400 });
    }

    if (role === 'TONTINE_CLIENT' && moyenPaiementChoisi === 'CARTE') {
      return NextResponse.json(
        { success: false, error: 'Le paiement carte n\'est pas encore active sur ce canal.' },
        { status: 400 }
      );
    }

    if (role === 'TONTINE_CLIENT' && moyenPaiementChoisi === 'MOBILE_MONEY' && !isPaygateEnabled()) {
      return NextResponse.json(
        { success: false, error: 'Paiement mobile money indisponible: configuration PayGate manquante.' },
        { status: 400 }
      );
    }

    const existing = await TontineAdhesion.findOne({ offreId: offre._id, clientUserId });
    if (existing) {
      if (existing.statut === 'EN_ATTENTE' && existing.paymentStatus === 'PENDING' && existing.paymentIdentifier) {
        const redirectUrl = buildPaygateHostedPaymentUrl({
          amount: offre.montantCotisation,
          identifier: existing.paymentIdentifier,
          description: `Adhesion tontine ${offre.nom}`,
          network: paymentNetwork || undefined,
        });
        return NextResponse.json({
          success: true,
          data: {
            adhesion: existing,
            payment: {
              provider: 'PAYGATE',
              mode: 'HOSTED_PAGE',
              redirectUrl,
            },
          },
        });
      }
      return NextResponse.json({ success: false, error: 'Vous avez déjà adhéré à cette tontine.' }, { status: 409 });
    }

    const validatedCount = await TontineAdhesion.countDocuments({ offreId: offre._id, statut: 'VALIDEE' });

    if (offre.categorie === 'CLASSIQUE' && validatedCount >= offre.nombreMembresCible) {
      return NextResponse.json({ success: false, error: 'La tontine classique est déjà complète.' }, { status: 400 });
    }

    const shouldUsePaygate =
      role === 'TONTINE_CLIENT' &&
      ['MOBILE_MONEY'].includes(moyenPaiementChoisi) &&
      isPaygateEnabled();

    const paymentIdentifier = shouldUsePaygate
      ? `NBBC-${String(offre._id)}-${String(clientUserId)}-${Date.now()}`
      : undefined;

    const initialStatut = shouldUsePaygate ? 'EN_ATTENTE' : 'VALIDEE';
    const initialPaymentStatus = shouldUsePaygate ? 'PENDING' : 'NONE';

    const adhesion = await TontineAdhesion.create({
      offreId: offre._id,
      clientUserId,
      statut: initialStatut,
      moyenPaiementChoisi,
      paymentProvider: shouldUsePaygate ? 'PAYGATE' : undefined,
      paymentStatus: initialPaymentStatus,
      paymentIdentifier,
      ordrePassage: offre.categorie === 'CLASSIQUE' ? validatedCount + 1 : 1,
    });

    if (shouldUsePaygate && paymentIdentifier) {
      const redirectUrl = buildPaygateHostedPaymentUrl({
        amount: offre.montantCotisation,
        identifier: paymentIdentifier,
        description: `Adhesion tontine ${offre.nom}`,
        network: paymentNetwork || undefined,
      });

      await logActivity('Adhésion tontine (paiement en attente)', `${offre.nom} - ${offre.categorie}`, {
        id: (session.user as any)?.id,
        name: session.user?.name || '',
        role,
      });

      return NextResponse.json(
        {
          success: true,
          data: {
            adhesion,
            payment: {
              provider: 'PAYGATE',
              mode: 'HOSTED_PAGE',
              redirectUrl,
            },
          },
        },
        { status: 201 }
      );
    }

    const validatedAfterInsert = validatedCount + 1;
    if (offre.categorie === 'CLASSIQUE') {
      if (validatedAfterInsert >= offre.nombreMembresCible) {
        const existingTours = await TontineTour.countDocuments({ offreId: offre._id });
        if (existingTours === 0) {
          const adhesionsValidees = await TontineAdhesion.find({ offreId: offre._id, statut: 'VALIDEE' })
            .sort({ ordrePassage: 1, createdAt: 1 })
            .lean();

          const startDate = offre.dateDebutPrevue ? new Date(offre.dateDebutPrevue) : new Date();
          const periodWeeks = getFrequencyWeeks(String(offre.frequence));

          const toursPayload = adhesionsValidees.map((item, index) => ({
            offreId: offre._id,
            numeroTour: index + 1,
            beneficiaireUserId: item.clientUserId,
            montantLot: offre.montantLot,
            datePrevue: addWeeks(startDate, index * periodWeeks),
            statut: 'PLANIFIE',
          }));

          if (toursPayload.length > 0) {
            await TontineTour.insertMany(toursPayload);
          }
        }
        offre.statut = 'EN_COURS';
      } else {
        offre.statut = 'OUVERTE';
      }
    }

    if (offre.categorie === 'EPARGNE') {
      offre.statut = 'EN_COURS';
    }

    await offre.save();

    await logActivity('Adhésion tontine', `${offre.nom} - ${offre.categorie}`, {
      id: (session.user as any)?.id,
      name: session.user?.name || '',
      role,
    });

    return NextResponse.json({ success: true, data: adhesion }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
