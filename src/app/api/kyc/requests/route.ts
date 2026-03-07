import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import KycRequest from '@/models/KycRequest';

export async function GET(request: Request) {
  await dbConnect();

  const { searchParams } = new URL(request.url);
  const statut = searchParams.get('statut');

  const filter: any = { dateSubmission: { $exists: true, $ne: null } };
  if (statut && statut !== 'ALL') {
    filter.statutKyc = statut;
  }

  const requests = await KycRequest.find(filter)
    .populate('clientId', 'nom prenom email')
    .sort({ dateSubmission: -1 });

  // Compter par statut pour les badges
  const counts = {
    EN_ATTENTE: await KycRequest.countDocuments({ dateSubmission: { $exists: true, $ne: null }, statutKyc: 'EN_ATTENTE' }),
    VALIDE: await KycRequest.countDocuments({ dateSubmission: { $exists: true, $ne: null }, statutKyc: 'VALIDE' }),
    REJETE: await KycRequest.countDocuments({ dateSubmission: { $exists: true, $ne: null }, statutKyc: 'REJETE' }),
  };

  return NextResponse.json({ success: true, data: requests, counts });
}
