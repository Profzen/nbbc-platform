import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import TontineContract from '@/models/TontineContract';

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Accès refusé.' }, { status: 403 });
    }

    const { id } = await context.params;
    await dbConnect();
    const contract = await TontineContract.findById(id).populate('userId', 'name email role');

    if (!contract) {
      return NextResponse.json({ success: false, error: 'Contrat introuvable.' }, { status: 404 });
    }

    const role = (session.user as any)?.role;
    const userId = (session.user as any)?.id;
    if (role === 'TONTINE_CLIENT' && String(contract.userId?._id || contract.userId) !== String(userId)) {
      return NextResponse.json({ success: false, error: 'Accès refusé.' }, { status: 403 });
    }

    return NextResponse.json({ success: true, data: contract });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}