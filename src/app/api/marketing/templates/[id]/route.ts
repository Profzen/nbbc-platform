import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import CampaignTemplate from '@/models/CampaignTemplate';

// GET /api/marketing/templates/[id]
export async function GET(_req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  await dbConnect();
  const template = await CampaignTemplate.findById(id);
  if (!template) return NextResponse.json({ success: false, error: 'Template introuvable' }, { status: 404 });
  return NextResponse.json({ success: true, data: template });
}

// PUT /api/marketing/templates/[id]
export async function PUT(req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  await dbConnect();
  const body = await req.json();
  const template = await CampaignTemplate.findByIdAndUpdate(id, body, { new: true });
  if (!template) return NextResponse.json({ success: false, error: 'Template introuvable' }, { status: 404 });
  return NextResponse.json({ success: true, data: template });
}

// DELETE /api/marketing/templates/[id]
export async function DELETE(_req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  await dbConnect();
  await CampaignTemplate.findByIdAndDelete(id);
  return NextResponse.json({ success: true });
}

// POST /api/marketing/templates/[id]/use — Incrémenter le compteur d'utilisation
export async function PATCH(_req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  await dbConnect();
  const template = await CampaignTemplate.findByIdAndUpdate(id, { $inc: { usageCount: 1 } }, { new: true });
  return NextResponse.json({ success: true, data: template });
}
