import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import DepotRetrait from '@/models/DepotRetrait';

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    await dbConnect();
    await DepotRetrait.findByIdAndDelete(id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
