import { NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import dbConnect from '@/lib/mongodb';
import SignatureRequest from '@/models/SignatureRequest';

type ParsedCloudinaryUrl = {
  resourceType: string;
  deliveryType: string;
  publicId: string;
  format: string;
};

function parseCloudinaryUrl(fileUrl: string): ParsedCloudinaryUrl | null {
  try {
    const url = new URL(fileUrl);
    const marker = '/upload/';
    const markerIndex = url.pathname.indexOf(marker);

    if (markerIndex === -1) return null;

    const beforeUpload = url.pathname.slice(0, markerIndex).split('/').filter(Boolean);
    const afterUpload = url.pathname.slice(markerIndex + marker.length).split('/').filter(Boolean);

    const resourceType = beforeUpload[1] || 'image';
    const deliveryType = beforeUpload[2] || 'upload';

    if (afterUpload.length === 0) return null;

    if (/^v\d+$/.test(afterUpload[0])) {
      afterUpload.shift();
    }

    if (afterUpload.length === 0) return null;

    const lastPart = afterUpload[afterUpload.length - 1];
    const dotIndex = lastPart.lastIndexOf('.');

    if (dotIndex <= 0) return null;

    const format = lastPart.slice(dotIndex + 1);
    afterUpload[afterUpload.length - 1] = lastPart.slice(0, dotIndex);
    const publicId = afterUpload.join('/');

    if (!publicId) return null;

    return { resourceType, deliveryType, publicId, format };
  } catch {
    return null;
  }
}

async function fetchFromCandidateUrls(urls: string[]) {
  for (const candidateUrl of urls) {
    try {
      const response = await fetch(candidateUrl);
      if (response.ok) {
        return response;
      }
    } catch {
      // Continue to next candidate URL.
    }
  }

  return null;
}

export async function GET(request: Request, context: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await context.params;
    const searchParams = new URL(request.url).searchParams;
    const shouldDownload = searchParams.get('download') === '1';

    await dbConnect();

    const signatureRequest = await SignatureRequest.findOne({ token });
    if (!signatureRequest) {
      return NextResponse.json({ success: false, error: 'Lien de signature invalide ou expiré.' }, { status: 404 });
    }

    if (signatureRequest.typeSource !== 'UPLOAD' || !signatureRequest.fichierPdfUrl) {
      return NextResponse.json({ success: false, error: 'Aucun document PDF disponible pour cette demande.' }, { status: 400 });
    }

    const candidateUrls: string[] = [signatureRequest.fichierPdfUrl];

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME || process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY || process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (cloudName && apiKey && apiSecret) {
      cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
      });

      const parsed = parseCloudinaryUrl(signatureRequest.fichierPdfUrl);
      if (parsed) {
        const expiresAt = Math.floor(Date.now() / 1000) + 300;

        candidateUrls.push(
          cloudinary.utils.private_download_url(parsed.publicId, parsed.format, {
            resource_type: parsed.resourceType,
            type: parsed.deliveryType,
            expires_at: expiresAt,
          })
        );

        candidateUrls.push(
          cloudinary.url(parsed.publicId, {
            secure: true,
            sign_url: true,
            resource_type: parsed.resourceType,
            type: parsed.deliveryType,
            format: parsed.format,
          })
        );
      }
    }

    const upstreamResponse = await fetchFromCandidateUrls(candidateUrls);
    if (!upstreamResponse) {
      return NextResponse.json(
        {
          success: false,
          error: 'Impossible de récupérer le PDF (accès Cloudinary refusé).',
        },
        { status: 502 }
      );
    }

    const fileBuffer = await upstreamResponse.arrayBuffer();
    const safeName = (signatureRequest.titreDocument || 'document').replace(/[^a-zA-Z0-9-_]/g, '_');
    const headers = new Headers();

    headers.set('Content-Type', upstreamResponse.headers.get('content-type') || 'application/pdf');
    headers.set(
      'Content-Disposition',
      `${shouldDownload ? 'attachment' : 'inline'}; filename="${safeName}.pdf"`
    );
    headers.set('Cache-Control', 'private, max-age=60');

    return new NextResponse(fileBuffer, {
      status: 200,
      headers,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
