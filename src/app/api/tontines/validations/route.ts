import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import TontineAdhesionEcheance from '@/models/TontineAdhesionEcheance';
import TontineAdhesion from '@/models/TontineAdhesion';
import TontineOffre from '@/models/TontineOffre';
import User from '@/models/User';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Accès refusé.' }, { status: 403 });
    }

    const role = (session.user as any)?.role;
    if (role !== 'SUPER_ADMIN' && role !== 'AGENT') {
      return NextResponse.json({ success: false, error: 'Action non autorisée.' }, { status: 403 });
    }

    await dbConnect();

    // Register models to avoid "Schema hasn't been registered" errors
    void TontineAdhesion;
    void TontineOffre;
    void User;

    const echeances = await TontineAdhesionEcheance.find({ validationStatus: 'PENDING' })
      .sort({ validationRequestedAt: 1 })
      .populate('adhesionId', 'moyenPaiementChoisi ordrePassage')
      .populate('offreId', 'nom categorie montantCotisation frequence')
      .populate('clientUserId', 'name email')
      .lean();

    return NextResponse.json({ success: true, data: { echeances } });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Erreur serveur.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Accès refusé.' }, { status: 403 });
    }

    const role = (session.user as any)?.role;
    if (role !== 'SUPER_ADMIN' && role !== 'AGENT') {
      return NextResponse.json({ success: false, error: 'Action non autorisée.' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const { echeanceId, action, note } = body as { echeanceId?: string; action?: 'approve' | 'reject'; note?: string };

    if (!echeanceId || !action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ success: false, error: 'Paramètres invalides.' }, { status: 400 });
    }

    await dbConnect();

    const echeance = await TontineAdhesionEcheance.findById(echeanceId);
    if (!echeance) {
      return NextResponse.json({ success: false, error: 'Échéance introuvable.' }, { status: 404 });
    }

    if (echeance.validationStatus !== 'PENDING') {
      return NextResponse.json({ success: false, error: 'Cette échéance n\'est plus en attente de validation.' }, { status: 409 });
    }

    if (action === 'approve') {
      echeance.paymentStatus = 'SUCCESS';
      echeance.statut = 'PAYEE';
      echeance.montantPaye = echeance.montantPrevu;
      echeance.paidAt = new Date();
      echeance.validationStatus = 'APPROVED';
      echeance.validatedAt = new Date();
      echeance.validatedBy = (session.user as any)?.id;
      echeance.validationNote = String(note || 'Validé par un agent.').trim();
    } else {
      echeance.paymentStatus = 'FAILED';
      echeance.validationStatus = 'REJECTED';
      echeance.validationNote = String(note || 'Refusé par un agent.').trim();
      echeance.validatedAt = new Date();
      echeance.validatedBy = (session.user as any)?.id;
    }

    await echeance.save();

    return NextResponse.json({ success: true, data: { echeance } });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Action impossible.' }, { status: 500 });
  }
}
