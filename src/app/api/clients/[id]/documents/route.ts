import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Client from '@/models/Client';

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id: clientId } = await context.params;
    
    const documentData = await request.json();
    
    await dbConnect();

    const client = await Client.findById(clientId);
    if (!client) {
      return NextResponse.json({ success: false, error: 'Client non trouvé' }, { status: 404 });
    }

    client.documents.push({
      nom: documentData.nom,
      url: documentData.url,
      format: documentData.format,
      publicId: documentData.publicId,
      status: 'VALIDE', // Auto-validé suite à l'upload pour l'instant
      dateRecep: new Date()
    });

    await client.save();

    return NextResponse.json({ success: true, data: client });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
