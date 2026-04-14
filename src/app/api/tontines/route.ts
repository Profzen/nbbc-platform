import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import TontineContract from '@/models/TontineContract';
import TontineEcheance from '@/models/TontineEcheance';
import { logActivity } from '@/lib/activity-logger';

function generateEcheances(dateDebut: Date, dateFinPrevue: Date, periodicite: 'JOURNALIERE' | 'HEBDOMADAIRE') {
  const dates: Date[] = [];
  const cursor = new Date(dateDebut);
  const stepDays = periodicite === 'JOURNALIERE' ? 1 : 7;

  cursor.setDate(cursor.getDate() + stepDays);
  while (cursor <= dateFinPrevue) {
    dates.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + stepDays);
  }

  if (dates.length === 0) {
    dates.push(new Date(dateFinPrevue));
  }

  return dates;
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Accès refusé.' }, { status: 403 });
    }

    await dbConnect();
    const role = (session.user as any)?.role;
    const userId = (session.user as any)?.id;
    const filter = role === 'TONTINE_CLIENT' ? { userId } : {};

    const contracts = await TontineContract.find(filter)
      .populate('userId', 'name email role')
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ success: true, data: contracts });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Accès refusé.' }, { status: 403 });
    }

    const role = (session.user as any)?.role;
    const body = await request.json();
    const userId = role === 'TONTINE_CLIENT' ? (session.user as any)?.id : String(body?.userId || '').trim();
    const periodicite = String(body?.periodicite || '').trim().toUpperCase();
    const dureeMois = Number(body?.dureeMois);
    const montantVersement = Number(body?.montantVersement);
    const devise = String(body?.devise || 'XOF').trim().toUpperCase();
    const compteDestinationType = String(body?.compteDestinationType || '').trim().toUpperCase();
    const compteDestinationLibelle = String(body?.compteDestinationLibelle || '').trim();
    const compteDestinationReference = String(body?.compteDestinationReference || '').trim();

    if (!userId || !periodicite || !dureeMois || !montantVersement || !compteDestinationType || !compteDestinationLibelle) {
      return NextResponse.json({ success: false, error: 'Champs obligatoires manquants.' }, { status: 400 });
    }

    if (!['JOURNALIERE', 'HEBDOMADAIRE'].includes(periodicite)) {
      return NextResponse.json({ success: false, error: 'Périodicité invalide.' }, { status: 400 });
    }

    if (![3, 6].includes(dureeMois)) {
      return NextResponse.json({ success: false, error: 'Durée invalide.' }, { status: 400 });
    }

    if (!['CRYPTO', 'MOBILE_MONEY', 'CARTE', 'BANQUE'].includes(compteDestinationType)) {
      return NextResponse.json({ success: false, error: 'Destination de paiement invalide.' }, { status: 400 });
    }

    await dbConnect();

    const dateDebut = new Date();
    const dateFinPrevue = new Date(dateDebut);
    dateFinPrevue.setMonth(dateFinPrevue.getMonth() + dureeMois);

    const contract = await TontineContract.create({
      userId,
      periodicite,
      dureeMois,
      montantVersement,
      devise,
      compteDestinationType,
      compteDestinationLibelle,
      compteDestinationReference: compteDestinationReference || undefined,
      statut: 'ACTIVE',
      dateSouscription: dateDebut,
      dateDebut,
      dateFinPrevue,
      acceptationConditionsAt: new Date(),
      fraisPlateformePercent: 10,
      penaliteSortiePercent: 10,
      penaliteDefautPercent: 10,
    });

    const echeanceDates = generateEcheances(
      dateDebut,
      dateFinPrevue,
      periodicite as 'JOURNALIERE' | 'HEBDOMADAIRE'
    );

    if (echeanceDates.length > 0) {
      await TontineEcheance.insertMany(
        echeanceDates.map((dateEcheance, index) => ({
          contractId: contract._id,
          userId: contract.userId,
          indexEcheance: index + 1,
          dateEcheance,
          montantAttendu: contract.montantVersement,
          montantRecu: 0,
          statut: 'EN_ATTENTE',
          penaliteMontant: 0,
        }))
      );
    }

    await logActivity('Tontine souscrite', `${periodicite} / ${dureeMois} mois / ${montantVersement} ${devise} / ${echeanceDates.length} échéances`, {
      id: (session.user as any)?.id,
      name: session.user?.name || '',
      role,
    });

    return NextResponse.json({ success: true, data: contract }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}