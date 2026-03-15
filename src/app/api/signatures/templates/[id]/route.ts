import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import TemplateContrat from '@/models/TemplateContrat';

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    await dbConnect();
    const body = await request.json();

    const template = await TemplateContrat.findByIdAndUpdate(id, body, { new: true });
    
    if (!template) {
      return NextResponse.json({ success: false, error: 'Template introuvable' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: template });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    await dbConnect();

    // Au lieu de supprimer on le désactive pour préserver l'historique des signatures passées
    const template = await TemplateContrat.findByIdAndUpdate(id, { actif: false }, { new: true });
    
    if (!template) {
      return NextResponse.json({ success: false, error: 'Template introuvable' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Template désactivé avec succès' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
