import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Compte from '@/models/Compte';

export async function GET() {
  try {
    await dbConnect();
    const comptes = await Compte.find({ actif: true }).sort({ createdAt: 1 });
    return NextResponse.json({ success: true, data: comptes });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await dbConnect();
    const body = await request.json();
    const compte = await Compte.create(body);
    return NextResponse.json({ success: true, data: compte }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
