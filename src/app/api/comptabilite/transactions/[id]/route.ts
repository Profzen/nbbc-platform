import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Transaction from '@/models/Transaction';

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    await dbConnect();
    const body = await request.json();
    
    if (body.quantite && body.prixUnitaire) {
      body.montant = body.quantite * body.prixUnitaire;
    }

    const transaction = await Transaction.findByIdAndUpdate(id, body, { new: true });
    if (!transaction) {
      return NextResponse.json({ success: false, error: 'Transaction introuvable' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: transaction });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    await dbConnect();
    
    await Transaction.findByIdAndDelete(id);
    return NextResponse.json({ success: true, message: 'Transaction supprimée' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
