import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Campaign from '@/models/Campaign';

export async function GET() {
  await dbConnect();
  const campaigns = await Campaign.find({}).sort({ createdAt: -1 });
  return NextResponse.json({ success: true, data: campaigns });
}

export async function POST(request: Request) {
  await dbConnect();
  const body = await request.json();
  try {
    const campaign = await Campaign.create(body);
    return NextResponse.json({ success: true, data: campaign }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
