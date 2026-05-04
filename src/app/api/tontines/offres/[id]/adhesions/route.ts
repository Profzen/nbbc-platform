import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import TontineOffre from '@/models/TontineOffre';
import TontineAdhesion from '@/models/TontineAdhesion';
import TontineAdhesionEcheance from '@/models/TontineAdhesionEcheance';
import TontineTour from '@/models/TontineTour';
import { logActivity } from '@/lib/activity-logger';
import { addWeeks, buildAdhesionEcheances, getFrequencyWeeks } from '@/lib/tontine-schedule';

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

    const existing = await TontineAdhesion.findOne({ offreId: offre._id, clientUserId });
    if (existing) {
      return NextResponse.json({ success: false, error: 'Vous avez déjà adhéré à cette tontine.' }, { status: 409 });
    }

    const validatedCount = await TontineAdhesion.countDocuments({ offreId: offre._id, statut: 'VALIDEE' });

    if (offre.categorie === 'CLASSIQUE' && validatedCount >= offre.nombreMembresCible) {
      return NextResponse.json({ success: false, error: 'La tontine classique est déjà complète.' }, { status: 400 });
    }

    const adhesion = await TontineAdhesion.create({
      offreId: offre._id,
      clientUserId,
      statut: 'VALIDEE',
      moyenPaiementChoisi,
      paymentProvider: undefined,
      paymentStatus: 'NONE',
      paymentIdentifier: undefined,
      ordrePassage: offre.categorie === 'CLASSIQUE' ? validatedCount + 1 : 1,
    });

    const echeancesPayload = buildAdhesionEcheances(offre, adhesion);
    if (echeancesPayload.length > 0) {
      await TontineAdhesionEcheance.insertMany(echeancesPayload);
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

    return NextResponse.json({ success: true, data: { adhesion, echeancesCount: echeancesPayload.length } }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
