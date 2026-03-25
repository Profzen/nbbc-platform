import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import SignatureRequest from '@/models/SignatureRequest';
import Client from '@/models/Client';

export async function POST(request: Request, context: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await context.params;
    await dbConnect();
    const body = await request.json();
    const { signatureImageUrl, signatureImagePublicId } = body;

    if (!signatureImageUrl) {
      return NextResponse.json({ success: false, error: 'La signature est manquante.' }, { status: 400 });
    }

    const signatureRequest = await SignatureRequest.findOne({ token });
    if (!signatureRequest) {
      return NextResponse.json({ success: false, error: 'Lien de signature invalide.' }, { status: 404 });
    }

    if (signatureRequest.statut !== 'EN_ATTENTE') {
      return NextResponse.json({ success: false, error: 'Ce document a déjà été traité.' }, { status: 400 });
    }

    // Récupérer l'IP pour la conserver
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'Unknown IP';

    signatureRequest.statut = 'SIGNE';
    signatureRequest.signatureImageUrl = signatureImageUrl;
    signatureRequest.signatureImagePublicId = signatureImagePublicId;
    signatureRequest.dateSignature = new Date();
    signatureRequest.ipSignature = ip;

    await signatureRequest.save();

    // -- Ajout automatique du document signé au client (si lié à la base) --
    const client = signatureRequest.clientId ? await Client.findById(signatureRequest.clientId) : null;
    if (client) {
      client.documents.push({
        nom: `Contrat Signé - ${signatureRequest.titreDocument}`,
        url: signatureRequest.typeSource === 'UPLOAD' ? signatureRequest.fichierPdfUrl : signatureImageUrl, 
        // Si c'est un upload, le doc officiel est le PDF, sinon c'est l'image de la signature comme preuve, 
        // L'idéal plus tard est de générer le PDF complet. Pour l'heure, on donne le lien existant.
        format: signatureRequest.typeSource === 'UPLOAD' ? 'pdf' : 'png',
        publicId: signatureRequest.typeSource === 'UPLOAD' ? undefined : signatureImagePublicId,
        status: 'VALIDE',
        dateRecep: new Date()
      });
      await client.save();
    }

    return NextResponse.json({ success: true, message: 'Document signé avec succès !' });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
