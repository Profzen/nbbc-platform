import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Carte from '@/models/Carte';

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  await dbConnect();
  const carte = await Carte.findById(id).populate('clientId', 'nom prenom email');
  if (!carte) return NextResponse.json({ success: false, error: 'Introuvable' }, { status: 404 });
  return NextResponse.json({ success: true, data: carte });
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  await dbConnect();
  const body = await request.json();
  const carte = await Carte.findByIdAndUpdate(id, body, { new: true, runValidators: true })
    .populate('clientId', 'nom prenom email');
  if (!carte) return NextResponse.json({ success: false, error: 'Introuvable' }, { status: 404 });
  return NextResponse.json({ success: true, data: carte });
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  await dbConnect();
  const carte = await Carte.findByIdAndDelete(id);
  if (!carte) return NextResponse.json({ success: false, error: 'Introuvable' }, { status: 404 });
  return NextResponse.json({ success: true, message: 'Compte supprimé' });
}
