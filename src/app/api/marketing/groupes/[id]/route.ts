import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import GroupeClient from '@/models/GroupeClient';

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  await dbConnect();
  const groupe = await GroupeClient.findById(id).populate('clientIds', 'nom prenom email telephone typeClient');
  if (!groupe) return NextResponse.json({ success: false, error: 'Groupe introuvable' }, { status: 404 });
  return NextResponse.json({ success: true, data: groupe });
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  await dbConnect();
  const body = await request.json();
  const { nom, description, couleur, clientIds } = body;

  if (!nom?.trim()) {
    return NextResponse.json({ success: false, error: 'Le nom du groupe est requis.' }, { status: 400 });
  }

  const groupe = await GroupeClient.findByIdAndUpdate(
    id,
    { nom: nom.trim(), description, couleur, clientIds: clientIds || [] },
    { new: true }
  ).populate('clientIds', 'nom prenom email telephone typeClient');

  if (!groupe) return NextResponse.json({ success: false, error: 'Groupe introuvable' }, { status: 404 });
  return NextResponse.json({ success: true, data: groupe });
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  await dbConnect();
  const groupe = await GroupeClient.findById(id);
  if (!groupe) return NextResponse.json({ success: false, error: 'Groupe introuvable' }, { status: 404 });
  await groupe.deleteOne();
  return NextResponse.json({ success: true });
}
