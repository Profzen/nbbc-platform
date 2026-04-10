import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import SignatureRequest from '@/models/SignatureRequest';
import '@/models/Client';

// POPULATE pour récupérer info du client et détails du modèle lors de l'affichage en admin
export async function GET() {
  try {
    await dbConnect();
    const requests = await SignatureRequest.find()
      .populate('clientId', 'nom prenom email')
      .populate('templateId', 'nom')
      .sort({ createdAt: -1 });

    return NextResponse.json({ success: true, data: requests });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
