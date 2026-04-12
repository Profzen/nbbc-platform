import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import Client from '@/models/Client';
import { logActivity } from '@/lib/activity-logger';
import { normalizeCountryCode } from '@/lib/countries';

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
    const session = await getServerSession(authOptions);
    const body = await req.json();
    const countryCode = normalizeCountryCode(body?.paysResidence);
    if (!countryCode) {
      return NextResponse.json({ success: false, error: 'Pays de residence invalide.' }, { status: 400 });
    }
    const client = await Client.create({
      ...body,
      paysResidence: countryCode,
    });
    await logActivity('Client créé', `${client.prenom} ${client.nom} (${client.email})`, { id: (session?.user as any)?.id, name: session?.user?.name || '', role: (session?.user as any)?.role });
    return NextResponse.json({ success: true, data: client }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
