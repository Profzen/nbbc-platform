import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import CampaignTemplate from '@/models/CampaignTemplate';

// GET /api/marketing/templates — Liste tous les templates
export async function GET() {
  await dbConnect();
  const templates = await CampaignTemplate.find({}).sort({ usageCount: -1, createdAt: -1 });
  return NextResponse.json({ success: true, data: templates });
}

// POST /api/marketing/templates — Créer un nouveau template
export async function POST(req: Request) {
  await dbConnect();
  const body = await req.json();
  const { nom, description, canal, sujet, contenu, categorie } = body;

  if (!nom || !sujet || !contenu) {
    return NextResponse.json({ success: false, error: 'Nom, sujet et contenu sont requis.' }, { status: 400 });
  }

  const template = await CampaignTemplate.create({ nom, description, canal: canal || 'EMAIL', sujet, contenu, categorie: categorie || 'Autre' });
  return NextResponse.json({ success: true, data: template }, { status: 201 });
}
