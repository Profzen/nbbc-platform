import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Client from '@/models/Client';

export async function GET() {
  try {
    await dbConnect();
    const clients = await Client.find({}).sort({ createdAt: -1 });
    return NextResponse.json({ success: true, data: clients });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

export async function POST(req: Request) {
  try {
    await dbConnect();
    const body = await req.json();
    const client = await Client.create(body);
    return NextResponse.json({ success: true, data: client }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
