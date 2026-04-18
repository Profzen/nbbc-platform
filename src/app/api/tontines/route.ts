import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import TontineOffre, { TontineCategorie, TontineFrequence, TontineMoyenPaiement } from '@/models/TontineOffre';
import TontineAdhesion from '@/models/TontineAdhesion';
import { logActivity } from '@/lib/activity-logger';

const ROLES_CAN_CREATE_OFFRE = new Set(['SUPER_ADMIN', 'AGENT']);
const FREQUENCES: TontineFrequence[] = ['HEBDOMADAIRE', 'BI_HEBDOMADAIRE', 'MENSUELLE'];
const MOYENS_PAIEMENT: TontineMoyenPaiement[] = ['CRYPTO', 'MOBILE_MONEY', 'CARTE', 'BANQUE', 'MANUEL'];

function getFrequencyWeeks(frequence: TontineFrequence) {
  if (frequence === 'HEBDOMADAIRE') return 1;
  if (frequence === 'BI_HEBDOMADAIRE') return 2;
  return 4;
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

    const offres = await TontineOffre.find({})
      .populate('createdBy', 'name email role')
      .sort({ createdAt: -1 })
      .lean();

    const offresWithStats = await Promise.all(
      offres.map(async (offre) => {
        const [nbAdherents, nbAdhesionsValidees] = await Promise.all([
          TontineAdhesion.countDocuments({ offreId: offre._id }),
          TontineAdhesion.countDocuments({ offreId: offre._id, statut: 'VALIDEE' }),
        ]);

        return {
          ...offre,
          nbAdherents,
          nbAdhesionsValidees,
          placesRestantes: Math.max(0, (offre.nombreMembresCible || 1) - nbAdhesionsValidees),
        };
      })
    );

    if (role === 'TONTINE_CLIENT') {
      const mesAdhesions = await TontineAdhesion.find({ clientUserId: userId })
        .populate('offreId')
        .sort({ createdAt: -1 })
        .lean();

      return NextResponse.json({
        success: true,
        data: {
          role,
          offres: offresWithStats.filter((offre) => ['OUVERTE', 'COMPLETE', 'EN_COURS'].includes(offre.statut)),
          mesAdhesions,
        },
      });
    }

    return NextResponse.json({ success: true, data: { role, offres: offresWithStats } });
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
    if (!ROLES_CAN_CREATE_OFFRE.has(role)) {
      return NextResponse.json(
        { success: false, error: 'Seuls les admins/agents peuvent créer une tontine.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const nom = String(body?.nom || '').trim();
    const categorie = String(body?.categorie || '').trim().toUpperCase() as TontineCategorie;
    const description = String(body?.description || '').trim();
    const montantCotisation = Number(body?.montantCotisation);
    const frequence = String(body?.frequence || '').trim().toUpperCase() as TontineFrequence;
    const dateDebutPrevue = body?.dateDebutPrevue ? new Date(body.dateDebutPrevue) : undefined;

    const moyensPaiementAcceptesRaw = Array.isArray(body?.moyensPaiementAcceptes)
      ? body.moyensPaiementAcceptes
      : ['MANUEL'];
    const moyensPaiementAcceptes = moyensPaiementAcceptesRaw
      .map((value: string) => String(value || '').trim().toUpperCase())
      .filter((value: string) => MOYENS_PAIEMENT.includes(value as TontineMoyenPaiement)) as TontineMoyenPaiement[];

    if (!nom || !categorie || !montantCotisation || !frequence) {
      return NextResponse.json({ success: false, error: 'Champs obligatoires manquants.' }, { status: 400 });
    }

    if (!['EPARGNE', 'CLASSIQUE'].includes(categorie)) {
      return NextResponse.json({ success: false, error: 'Catégorie invalide.' }, { status: 400 });
    }

    if (!FREQUENCES.includes(frequence)) {
      return NextResponse.json({ success: false, error: 'Fréquence invalide.' }, { status: 400 });
    }

    if (moyensPaiementAcceptes.length === 0) {
      return NextResponse.json({ success: false, error: 'Aucun moyen de paiement valide fourni.' }, { status: 400 });
    }

    await dbConnect();

    let nombreMembresCible = 1;
    if (categorie === 'CLASSIQUE') {
      nombreMembresCible = Number(body?.nombreMembresCible);
      if (!Number.isFinite(nombreMembresCible) || nombreMembresCible < 2) {
        return NextResponse.json(
          { success: false, error: 'Une tontine classique nécessite au moins 2 participants.' },
          { status: 400 }
        );
      }
    }

    const periodiciteSemaines = getFrequencyWeeks(frequence);
    const montantLot = montantCotisation * nombreMembresCible;
    const nombreTours = categorie === 'CLASSIQUE' ? nombreMembresCible : 1;
    const dureeSemaines = nombreTours * periodiciteSemaines;

    const offre = await TontineOffre.create({
      nom,
      categorie,
      description: description || undefined,
      montantCotisation,
      frequence,
      nombreMembresCible,
      moyensPaiementAcceptes,
      montantLot,
      nombreTours,
      dureeSemaines,
      dateDebutPrevue,
      statut: 'OUVERTE',
      createdBy: (session.user as any)?.id,
    });

    await logActivity(
      'Offre tontine créée',
      `${offre.nom} (${offre.categorie}) - ${offre.montantCotisation} XOF - ${offre.frequence}`,
      {
      id: (session.user as any)?.id,
      name: session.user?.name || '',
      role,
      }
    );

    return NextResponse.json({ success: true, data: offre }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}