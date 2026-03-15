import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Client from '@/models/Client';

export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await dbConnect();
    const params = await context.params;
    const client = await Client.findById(params.id);
    if (!client) {
      return NextResponse.json({ success: false, error: 'Client not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: client });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

export async function PUT(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await dbConnect();
    const params = await context.params;
    const body = await req.json();
    const client = await Client.findByIdAndUpdate(params.id, body, {
      new: true,
      runValidators: true,
    });
    if (!client) {
      return NextResponse.json({ success: false, error: 'Client not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: client });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

export async function DELETE(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await dbConnect();
    const params = await context.params;
    const deletedClient = await Client.deleteOne({ _id: params.id });
    if (!deletedClient.deletedCount) {
      return NextResponse.json({ success: false, error: 'Client not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: {} });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
