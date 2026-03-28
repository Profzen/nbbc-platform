import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import KycRequest from '@/models/KycRequest';
import Client from '@/models/Client';
import { v2 as cloudinary } from 'cloudinary';
import { sendKycSubmissionAdminEmail, sendKycSubmissionClientEmail } from '@/lib/kyc-email';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY || process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// GET : Vérifier si un token est valide
export async function GET(request: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  await dbConnect();

  const kycRequest = await KycRequest.findOne({ token });
  if (!kycRequest) {
    return NextResponse.json({ success: false, error: 'Lien invalide ou expiré.' }, { status: 404 });
  }
  if (kycRequest.dateSubmission) {
    return NextResponse.json({ success: false, error: 'Cette demande a déjà été soumise.' }, { status: 400 });
  }

  return NextResponse.json({ success: true, data: { token: kycRequest.token, clientId: kycRequest.clientId } });
}

// POST : Soumettre le formulaire KYC
export async function POST(request: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  await dbConnect();

  const kycRequest = await KycRequest.findOne({ token });
  if (!kycRequest) {
    return NextResponse.json({ success: false, error: 'Lien invalide.' }, { status: 404 });
  }
  if (kycRequest.dateSubmission) {
    return NextResponse.json({ success: false, error: 'Déjà soumis.' }, { status: 400 });
  }

  const body = await request.json();
  const {
    nom,
    prenom,
    email,
    telephone,
    photoIdUrl,
    photoIdPublicId,
    selfieDataUrl,
    politiqueAcceptee,
  } = body;

  if (!politiqueAcceptee) {
    return NextResponse.json({ success: false, error: 'Vous devez accepter la politique.' }, { status: 400 });
  }

  if (!nom || !prenom || !email || !photoIdUrl || !photoIdPublicId || !selfieDataUrl) {
    return NextResponse.json(
      { success: false, error: 'Informations incomplètes. Merci de remplir tous les champs et joindre les photos.' },
      { status: 400 }
    );
  }

  let selfieUrl = '';
  let selfiePublicId = '';

  try {
    const uploadedSelfie = await cloudinary.uploader.upload(String(selfieDataUrl), {
      folder: 'nbbc/kyc/selfies',
      resource_type: 'image',
    });
    selfieUrl = uploadedSelfie.secure_url;
    selfiePublicId = uploadedSelfie.public_id;
  } catch (error) {
    console.error('Erreur upload selfie KYC:', error);
    return NextResponse.json(
      { success: false, error: "Erreur lors de l'envoi du selfie. Veuillez réessayer." },
      { status: 500 }
    );
  }

  kycRequest.nom = nom;
  kycRequest.prenom = prenom;
  kycRequest.email = email;
  kycRequest.telephone = telephone;
  kycRequest.photoIdUrl = photoIdUrl;
  kycRequest.photoIdPublicId = photoIdPublicId;
  kycRequest.selfieUrl = selfieUrl;
  kycRequest.selfiePublicId = selfiePublicId;
  kycRequest.politiqueAcceptee = true;
  kycRequest.dateSubmission = new Date();
  kycRequest.statutKyc = 'EN_ATTENTE';

  await kycRequest.save();

  await Promise.allSettled([
    sendKycSubmissionClientEmail({ prenom, nom, email }),
    sendKycSubmissionAdminEmail({ prenom, nom, email }, String(kycRequest._id)),
  ]);

  return NextResponse.json({ success: true, message: 'Demande KYC soumise avec succès.' });
}
