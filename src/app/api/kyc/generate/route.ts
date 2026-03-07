import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import dbConnect from '@/lib/mongodb';
import KycRequest from '@/models/KycRequest';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { clientId } = body;

    await dbConnect();

    const token = randomUUID();

    const kycRequest = await KycRequest.create({
      token,
      clientId: clientId || undefined,
    });

    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const link = `${baseUrl}/kyc/${token}`;

    return NextResponse.json({ success: true, link, token, id: kycRequest._id });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
