import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import TontineOffre from '@/models/TontineOffre';
import TontineAdhesion from '@/models/TontineAdhesion';
import TontineAdhesionEcheance from '@/models/TontineAdhesionEcheance';
import TontineTour from '@/models/TontineTour';
import { getEffectiveEcheanceStatut } from '@/lib/tontine-schedule';

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

    const offre = await TontineOffre.findById(id).populate('createdBy', 'name email role').lean();
    if (!offre) {
      return NextResponse.json({ success: false, error: 'Offre introuvable.' }, { status: 404 });
    }

    const [tours, adhesions, monAdhesion] = await Promise.all([
      TontineTour.find({ offreId: id }).populate('beneficiaireUserId', 'name email role').sort({ numeroTour: 1 }).lean(),
      role === 'TONTINE_CLIENT'
        ? Promise.resolve([])
        : TontineAdhesion.find({ offreId: id }).populate('clientUserId', 'name email role').sort({ ordrePassage: 1, createdAt: 1 }).lean(),
      role === 'TONTINE_CLIENT'
        ? TontineAdhesion.findOne({ offreId: id, clientUserId: userId }).lean()
        : Promise.resolve(null),
    ]);

    const adhesionIds = [
      ...adhesions.map((item: any) => String(item._id)),
      ...(monAdhesion ? [String((monAdhesion as any)._id)] : []),
    ];

    const echeancesRaw = adhesionIds.length > 0
      ? await TontineAdhesionEcheance.find({ adhesionId: { $in: adhesionIds } })
          .sort({ numeroEcheance: 1 })
          .populate('validatedBy', 'name email role')
          .lean()
      : [];

    const echeancesByAdhesion = new Map<string, any[]>();
    for (const echeance of echeancesRaw) {
      const key = String(echeance.adhesionId);
      const next = {
        ...echeance,
        statut: getEffectiveEcheanceStatut(echeance),
      };
      const list = echeancesByAdhesion.get(key) || [];
      list.push(next);
      echeancesByAdhesion.set(key, list);
    }

    const adhesionsWithEcheances = adhesions.map((item: any) => ({
      ...item,
      echeances: echeancesByAdhesion.get(String(item._id)) || [],
    }));

    const monAdhesionWithEcheances = monAdhesion
      ? {
          ...monAdhesion,
          echeances: echeancesByAdhesion.get(String((monAdhesion as any)._id)) || [],
        }
      : null;

    return NextResponse.json({
      success: true,
      data: {
        role,
        offre,
        tours,
        adhesions: adhesionsWithEcheances,
        monAdhesion: monAdhesionWithEcheances,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Accès refusé.' }, { status: 403 });
    }

    const role = (session.user as any)?.role;
    if (role !== 'SUPER_ADMIN' && role !== 'AGENT') {
      return NextResponse.json({ success: false, error: 'Action non autorisée.' }, { status: 403 });
    }

    const { id } = await context.params;
    await dbConnect();

    const offre = await TontineOffre.findById(id).lean();
    if (!offre) {
      return NextResponse.json({ success: false, error: 'Offre introuvable.' }, { status: 404 });
    }

    // Refuse si l'offre est EN_COURS et a des adhésions validées
    if ((offre as any).statut === 'EN_COURS') {
      const nbValidees = await TontineAdhesion.countDocuments({ offreId: id, statut: 'VALIDEE' });
      if (nbValidees > 0) {
        return NextResponse.json(
          { success: false, error: 'Impossible de supprimer une tontine en cours avec des membres validés.' },
          { status: 400 }
        );
      }
    }

    // Suppression en cascade
    await Promise.all([
      TontineAdhesion.deleteMany({ offreId: id }),
      TontineAdhesionEcheance.deleteMany({ offreId: id }),
      TontineTour.deleteMany({ offreId: id }),
      TontineOffre.findByIdAndDelete(id),
    ]);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
