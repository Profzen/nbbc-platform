import { v2 as cloudinary } from 'cloudinary';
import { NextResponse } from 'next/server';

const cloudName = process.env.CLOUDINARY_CLOUD_NAME || process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY || process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

cloudinary.config({
  cloud_name: cloudName,
  api_key: apiKey,
  api_secret: apiSecret,
});

export async function POST(request: Request) {
  if (!cloudName || !apiKey || !apiSecret) {
    return NextResponse.json(
      {
        error:
          'Configuration Cloudinary incomplète. Définissez CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY et CLOUDINARY_API_SECRET (et NEXT_PUBLIC_CLOUDINARY_API_KEY côté client).',
      },
      { status: 500 }
    );
  }

  const body = await request.json();
  const { paramsToSign } = body;

  if (!paramsToSign) {
    return NextResponse.json({ error: 'Paramètres de signature manquants.' }, { status: 400 });
  }

  try {
    const signature = cloudinary.utils.api_sign_request(paramsToSign, apiSecret);
    return NextResponse.json({ signature, apiKey, cloudName });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
