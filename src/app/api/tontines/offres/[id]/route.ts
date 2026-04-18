import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import TontineOffre from '@/models/TontineOffre';
import TontineAdhesion from '@/models/TontineAdhesion';
import TontineTour from '@/models/TontineTour';

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

    return NextResponse.json({
      success: true,
      data: {
        role,
        offre,
        tours,
        adhesions,
        monAdhesion,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
