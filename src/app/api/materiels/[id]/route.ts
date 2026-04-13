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

  const existing = await Materiel.findById(id);
  if (!existing) return NextResponse.json({ success: false, error: 'Matériel introuvable' }, { status: 404 });

  const nextValues = {
    categorie: body.categorie ?? existing.categorie,
    categorieAutre: body.categorie === 'AUTRE' || (!body.categorie && existing.categorie === 'AUTRE')
      ? (body.categorieAutre ?? existing.categorieAutre)
      : undefined,
    nombre: body.nombre ?? existing.nombre,
    couleur: body.couleur ?? existing.couleur,
    description: body.description ?? existing.description,
    etat: body.etat ?? existing.etat,
    actif: existing.actif !== false,
    deletedAt: existing.deletedAt || null,
  };

  const materiel = await Materiel.findByIdAndUpdate(
    id,
    {
      $set: {
        ...body,
        categorieAutre: nextValues.categorieAutre,
      },
      $push: {
        history: {
          at: new Date(),
          action: 'UPDATED',
          categorie: nextValues.categorie,
          categorieAutre: nextValues.categorieAutre,
          nombre: Number(nextValues.nombre || 1),
          couleur: nextValues.couleur,
          description: nextValues.description,
          etat: nextValues.etat,
          deleted: false,
        },
      },
    },
    { new: true, runValidators: true }
  );

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
  await Materiel.findByIdAndUpdate(id, {
    $set: {
      actif: false,
      deletedAt: new Date(),
    },
    $push: {
      history: {
        at: new Date(),
        action: 'DELETED',
        categorie: materiel.categorie,
        categorieAutre: materiel.categorieAutre,
        nombre: materiel.nombre,
        couleur: materiel.couleur,
        description: materiel.description,
        etat: materiel.etat,
        deleted: true,
      },
    },
  });

  await logActivity(
    'Matériel supprimé',
    `${label} x${materiel.nombre}`,
    { id: (session?.user as any)?.id, name: session?.user?.name || '', role: (session?.user as any)?.role }
  );

  return NextResponse.json({ success: true });
}
