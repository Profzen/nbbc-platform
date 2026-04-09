import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import Materiel from '@/models/Materiel';
import { logActivity } from '@/lib/activity-logger';

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  await dbConnect();
  const session = await getServerSession(authOptions);
  const body = await request.json();

  const materiel = await Materiel.findByIdAndUpdate(id, body, { new: true, runValidators: true });
  if (!materiel) return NextResponse.json({ success: false, error: 'Matériel introuvable' }, { status: 404 });

  const label = materiel.categorie === 'AUTRE' ? materiel.categorieAutre || 'Autre' : materiel.categorie;

  if (body.etat) {
    await logActivity(
      'État matériel modifié',
      `${label} → ${body.etat}`,
      { id: (session?.user as any)?.id, name: session?.user?.name || '', role: (session?.user as any)?.role }
    );
  } else {
    await logActivity(
      'Matériel modifié',
      label,
      { id: (session?.user as any)?.id, name: session?.user?.name || '', role: (session?.user as any)?.role }
    );
  }

  return NextResponse.json({ success: true, data: materiel });
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  await dbConnect();
  const session = await getServerSession(authOptions);

  const materiel = await Materiel.findById(id);
  if (!materiel) return NextResponse.json({ success: false, error: 'Matériel introuvable' }, { status: 404 });

  const label = materiel.categorie === 'AUTRE' ? materiel.categorieAutre || 'Autre' : materiel.categorie;
  await materiel.deleteOne();

  await logActivity(
    'Matériel supprimé',
    `${label} x${materiel.nombre}`,
    { id: (session?.user as any)?.id, name: session?.user?.name || '', role: (session?.user as any)?.role }
  );

  return NextResponse.json({ success: true });
}
