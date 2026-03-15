import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Campaign from '@/models/Campaign';

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  await dbConnect();
  const campaign = await Campaign.findById(id);
  if (!campaign) return NextResponse.json({ success: false, error: 'Introuvable' }, { status: 404 });
  return NextResponse.json({ success: true, data: campaign });
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  await dbConnect();
  const body = await request.json();
  const campaign = await Campaign.findByIdAndUpdate(id, body, { new: true });
  if (!campaign) return NextResponse.json({ success: false, error: 'Introuvable' }, { status: 404 });
  return NextResponse.json({ success: true, data: campaign });
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  await dbConnect();
  const campaign = await Campaign.findById(id);
  if (!campaign) return NextResponse.json({ success: false, error: 'Introuvable' }, { status: 404 });
  if (campaign.statut === 'ENVOYE') {
    return NextResponse.json({ success: false, error: 'Une campagne envoyée ne peut pas être supprimée.' }, { status: 403 });
  }
  await campaign.deleteOne();
  return NextResponse.json({ success: true });
}
