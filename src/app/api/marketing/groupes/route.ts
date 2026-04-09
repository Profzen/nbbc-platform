import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import GroupeClient from '@/models/GroupeClient';

export async function GET() {
  try {
    await dbConnect();
    const groupes = await GroupeClient.find({})
      .populate('clientIds', 'nom prenom email telephone typeClient')
      .sort({ createdAt: -1 });
    return NextResponse.json({ success: true, data: groupes });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  await dbConnect();
  const body = await request.json();
  const { nom, description, couleur, clientIds } = body;

  if (!nom?.trim()) {
    return NextResponse.json({ success: false, error: 'Le nom du groupe est requis.' }, { status: 400 });
  }

  try {
    const groupe = await GroupeClient.create({ nom: nom.trim(), description, couleur, clientIds: clientIds || [] });
    const populated = await groupe.populate('clientIds', 'nom prenom email telephone typeClient');
    return NextResponse.json({ success: true, data: populated }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
