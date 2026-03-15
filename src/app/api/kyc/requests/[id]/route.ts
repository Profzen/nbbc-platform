import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import KycRequest from '@/models/KycRequest';
import Client from '@/models/Client';
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  await dbConnect();

  const body = await request.json();
  const { statutKyc, notesAdmin } = body;

  if (!['VALIDE', 'REJETE'].includes(statutKyc)) {
    return NextResponse.json({ success: false, error: 'Statut invalide.' }, { status: 400 });
  }

  const kycRequest = await KycRequest.findById(id);
  if (!kycRequest) {
    return NextResponse.json({ success: false, error: 'Demande introuvable.' }, { status: 404 });
  }

  kycRequest.statutKyc = statutKyc;
  kycRequest.notesAdmin = notesAdmin || '';
  kycRequest.dateValidation = new Date();
  await kycRequest.save();

  // Si validé et lié à un client → mettre à jour le statut KYC du client
  if (statutKyc === 'VALIDE' && kycRequest.clientId) {
    await Client.findByIdAndUpdate(kycRequest.clientId, {
      statutKyc: 'VALIDE',
      kycRequestId: kycRequest._id,
    });
  } else if (statutKyc === 'REJETE') {
    if (kycRequest.clientId) {
      await Client.findByIdAndUpdate(kycRequest.clientId, {
        statutKyc: 'REJETE',
      });
    }
    
    // Nettoyage Cloudinary des pièces d'identité et selfies rejetés
    try {
      if (kycRequest.photoIdPublicId) await cloudinary.uploader.destroy(kycRequest.photoIdPublicId);
      if (kycRequest.selfiePublicId) await cloudinary.uploader.destroy(kycRequest.selfiePublicId);
    } catch (error) {
      console.error("Erreur suppression Cloudinary (KYC):", error);
    }
  }

  return NextResponse.json({ success: true, data: kycRequest });
}

