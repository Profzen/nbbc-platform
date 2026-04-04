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

type CandidateAsset = {
  publicId: string;
  resourceType: string;
  deliveryType: string;
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

function buildSignedCandidateUrls(asset: CandidateAsset) {
  const expiresAt = Math.floor(Date.now() / 1000) + 300;

  const resourceTypes = Array.from(new Set([asset.resourceType, 'image', 'raw']));
  const deliveryTypes = Array.from(new Set([asset.deliveryType, 'upload', 'private', 'authenticated']));

  const urls: string[] = [];

  for (const resourceType of resourceTypes) {
    for (const deliveryType of deliveryTypes) {
      urls.push(
        cloudinary.utils.private_download_url(asset.publicId, asset.format, {
          resource_type: resourceType,
          type: deliveryType,
          expires_at: expiresAt,
          attachment: true,
        })
      );

      urls.push(
        cloudinary.url(asset.publicId, {
          secure: true,
          sign_url: true,
          resource_type: resourceType,
          type: deliveryType,
          format: asset.format,
        })
      );
    }
  }

  return urls;
}

function buildPreviewImageUrl(asset: CandidateAsset) {
  return cloudinary.url(asset.publicId, {
    secure: true,
    resource_type: 'image',
    type: asset.deliveryType || 'upload',
    transformation: [
      {
        format: 'png',
        page: 1,
      },
    ],
  });
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

    const effectivePdfUrl = signatureRequest.signedDocumentUrl || signatureRequest.fichierPdfUrl;
    const effectivePdfPublicId = signatureRequest.signedDocumentPublicId || signatureRequest.fichierPdfPublicId;
    const effectiveResourceType = signatureRequest.signedDocumentUrl ? 'raw' : signatureRequest.fichierPdfResourceType;
    const effectiveDeliveryType = signatureRequest.signedDocumentUrl ? 'upload' : signatureRequest.fichierPdfDeliveryType;
    const effectiveFormat = signatureRequest.signedDocumentUrl ? 'pdf' : signatureRequest.fichierPdfFormat;

    const hasSignedPdf = Boolean(signatureRequest.signedDocumentUrl);
    if (!effectivePdfUrl || (!hasSignedPdf && signatureRequest.typeSource !== 'UPLOAD')) {
      return NextResponse.json({ success: false, error: 'Aucun document PDF disponible pour cette demande.' }, { status: 400 });
    }

    const candidateUrls: string[] = [String(effectivePdfUrl)];

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME || process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY || process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    const asset: CandidateAsset = {
      publicId: String(effectivePdfPublicId || ''),
      resourceType: String(effectiveResourceType || 'image'),
      deliveryType: String(effectiveDeliveryType || 'upload'),
      format: String(effectiveFormat || 'pdf'),
    };

    if (!asset.publicId) {
      const parsed = parseCloudinaryUrl(String(effectivePdfUrl));
      if (parsed) {
        asset.publicId = parsed.publicId;
        asset.resourceType = parsed.resourceType;
        asset.deliveryType = parsed.deliveryType;
        asset.format = parsed.format;
      }
    }

    if (cloudName && apiKey && apiSecret) {
      cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
      });

      if (asset.publicId) {
        candidateUrls.push(...buildSignedCandidateUrls(asset));
      }
    }

    const upstreamResponse = await fetchFromCandidateUrls(candidateUrls);
    if (!upstreamResponse) {
      if (!shouldDownload && cloudName && asset.publicId) {
        const previewImageUrl = buildPreviewImageUrl(asset);
        const fallbackHtml = `<!DOCTYPE html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Aperçu du document</title>
    <style>
      body { margin: 0; font-family: Arial, sans-serif; background: #f8fafc; color: #0f172a; }
      .wrap { padding: 24px; }
      .alert { background: #fff7ed; border: 1px solid #fdba74; border-radius: 8px; padding: 12px; margin-bottom: 16px; font-size: 14px; }
      img { width: 100%; max-width: 960px; display: block; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; background: white; }
    </style>
  </head>
  <body>
    <div class="wrap">
      <div class="alert">Aperçu PDF direct indisponible. Affichage de la première page en image.</div>
      <img src="${previewImageUrl}" alt="Aperçu du document" />
    </div>
  </body>
</html>`;

        return new NextResponse(fallbackHtml, {
          status: 200,
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': 'private, max-age=60',
          },
        });
      }

      return NextResponse.json({ success: false, error: 'Impossible de récupérer le PDF (accès Cloudinary refusé).' }, { status: 502 });
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
