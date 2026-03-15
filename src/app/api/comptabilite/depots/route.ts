import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import DepotRetrait from '@/models/DepotRetrait';

export async function GET() {
  try {
    await dbConnect();
    const operations = await DepotRetrait.find().populate('compteId', 'nom').sort({ date: -1 });
    return NextResponse.json({ success: true, data: operations });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await dbConnect();
    const body = await request.json();
    const op = await DepotRetrait.create(body);
    return NextResponse.json({ success: true, data: op }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
