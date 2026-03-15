import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Compte from '@/models/Compte';

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    await dbConnect();
    const body = await request.json();
    const compte = await Compte.findByIdAndUpdate(id, body, { new: true });
    if (!compte) return NextResponse.json({ success: false, error: 'Compte introuvable' }, { status: 404 });
    return NextResponse.json({ success: true, data: compte });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    await dbConnect();
    await Compte.findByIdAndUpdate(id, { actif: false });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
