import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Carte from '@/models/Carte';

// GET : Lister les comptes (optionnel: filtrer par clientId)
export async function GET(request: Request) {
  await dbConnect();
  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get('clientId');
  
  const filter = clientId ? { clientId } : {};
  const cartes = await Carte.find(filter)
    .populate('clientId', 'nom prenom email')
    .sort({ createdAt: -1 });
  
  return NextResponse.json({ success: true, data: cartes });
}

// POST : Créer un nouveau compte
export async function POST(request: Request) {
  await dbConnect();
  const body = await request.json();
  
  try {
    const carte = await Carte.create(body);
    await carte.populate('clientId', 'nom prenom email');
    return NextResponse.json({ success: true, data: carte }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
