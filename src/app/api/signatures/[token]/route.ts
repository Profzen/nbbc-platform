import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import SignatureRequest from '@/models/SignatureRequest';
import '@/models/Client';

export async function GET(request: Request, context: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await context.params;
    await dbConnect();

    const signatureRequest = await SignatureRequest.findOne({ token }).populate('clientId', 'nom prenom');
    if (!signatureRequest) {
      return NextResponse.json({ success: false, error: 'Lien de signature invalide ou expiré.' }, { status: 404 });
    }

    // On retourne les infos pour que l'interface React les affiche
    return NextResponse.json({ success: true, data: signatureRequest });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
