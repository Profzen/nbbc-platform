import { NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import dbConnect from '@/lib/mongodb';
import SignatureRequest from '@/models/SignatureRequest';

function configureCloudinary() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME || process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY || process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    return false;
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
  });
  return true;
}

async function safeDestroy(publicId?: string, options?: { resource_type?: string; type?: string }) {
  if (!publicId) return;

  try {
    await cloudinary.uploader.destroy(publicId, {
      invalidate: true,
      resource_type: options?.resource_type || 'image',
      type: options?.type || 'upload',
    });
  } catch {
    // Suppression best-effort: on continue même si Cloudinary refuse.
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await dbConnect();
    const { id } = await context.params;

    const signatureRequest = await SignatureRequest.findById(id);
    if (!signatureRequest) {
      return NextResponse.json({ success: false, error: 'Demande introuvable.' }, { status: 404 });
    }

    if (configureCloudinary()) {
      await safeDestroy(signatureRequest.signatureImagePublicId, { resource_type: 'image', type: 'upload' });
      await safeDestroy(signatureRequest.fichierPdfPublicId, {
        resource_type: signatureRequest.fichierPdfResourceType || 'raw',
        type: signatureRequest.fichierPdfDeliveryType || 'upload',
      });
    }

    await signatureRequest.deleteOne();
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Suppression impossible.' }, { status: 500 });
  }
}
