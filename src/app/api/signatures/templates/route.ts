import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import TemplateContrat from '@/models/TemplateContrat';

export async function GET() {
  try {
    await dbConnect();
    const templates = await TemplateContrat.find({ actif: true }).sort({ createdAt: -1 });
    return NextResponse.json({ success: true, data: templates });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await dbConnect();
    const body = await request.json();
    
    if (!body.nom || !body.contenuHtml) {
      return NextResponse.json({ success: false, error: 'Nom et contenu HTML requis.' }, { status: 400 });
    }

    const template = await TemplateContrat.create({
      nom: body.nom,
      contenuHtml: body.contenuHtml,
      actif: true
    });
    
    return NextResponse.json({ success: true, data: template }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
