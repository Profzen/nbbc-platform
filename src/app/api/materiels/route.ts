import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import Materiel from '@/models/Materiel';
import { logActivity } from '@/lib/activity-logger';

export async function GET() {
  await dbConnect();
  const materiels = await Materiel.find({}).sort({ createdAt: -1 });
  return NextResponse.json({ success: true, data: materiels });
}

export async function POST(request: Request) {
  await dbConnect();
  const session = await getServerSession(authOptions);
  const body = await request.json();
  const { categorie, categorieAutre, nombre, couleur, description, etat } = body;

  if (!categorie) {
    return NextResponse.json({ success: false, error: 'La catégorie est requise.' }, { status: 400 });
  }

  try {
    const materiel = await Materiel.create({
      categorie,
      categorieAutre: categorie === 'AUTRE' ? categorieAutre : undefined,
      nombre: nombre || 1,
      couleur,
      description,
      etat: etat || 'FONCTIONNEL',
    });

    const label = categorie === 'AUTRE' ? categorieAutre || 'Autre' : categorie;
    await logActivity(
      'Matériel ajouté',
      `${label} x${nombre || 1} (${etat || 'FONCTIONNEL'})`,
      { id: (session?.user as any)?.id, name: session?.user?.name || '', role: (session?.user as any)?.role }
    );

    return NextResponse.json({ success: true, data: materiel }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
