import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import SignatureRequest from '@/models/SignatureRequest';
import Client from '@/models/Client';
import { v2 as cloudinary } from 'cloudinary';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

type Placement = {
  xRatio?: number;
  yRatio?: number;
  widthRatio?: number;
};

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

function buildSignedCandidateUrls(asset: { publicId: string; resourceType: string; deliveryType: string; format: string }) {
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

async function fetchFromCandidateUrls(urls: string[]) {
  for (const candidateUrl of urls) {
    try {
      const response = await fetch(candidateUrl);
      if (response.ok) return response;
    } catch {
      // continue
    }
  }
  return null;
}

async function getPdfBuffer(fileUrl: string, publicId?: string, resourceType = 'image', deliveryType = 'upload', format = 'pdf') {
  const candidateUrls: string[] = [fileUrl];
  if (publicId) {
    candidateUrls.push(
      ...buildSignedCandidateUrls({ publicId, resourceType, deliveryType, format })
    );
  }

  const response = await fetchFromCandidateUrls(candidateUrls);
  if (!response) {
    throw new Error('Impossible de récupérer le PDF source.');
  }

  return Buffer.from(await response.arrayBuffer());
}

async function uploadPdfBufferToCloudinary(pdfBuffer: Buffer, token: string) {
  const dataUri = `data:application/pdf;base64,${pdfBuffer.toString('base64')}`;
  const uploaded = await cloudinary.uploader.upload(dataUri, {
    folder: 'signatures/signed-documents',
    public_id: `signed-${token}-${Date.now()}`,
    resource_type: 'raw',
    format: 'pdf',
    type: 'upload',
  });

  return {
    secureUrl: uploaded.secure_url,
    publicId: uploaded.public_id,
  };
}

function htmlToPlainLines(html: string) {
  const normalized = html
    .replace(/<\s*br\s*\/?\s*>/gi, '\n')
    .replace(/<\s*\/p\s*>/gi, '\n\n')
    .replace(/<\s*li\s*>/gi, '\n- ')
    .replace(/<\s*\/li\s*>/gi, '')
    .replace(/<\s*\/h[1-6]\s*>/gi, '\n\n')
    .replace(/<\s*h[1-6][^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\r/g, '');

  return normalized
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function wrapTextToWidth(text: string, maxCharsPerLine = 95) {
  const words = text.split(/\s+/);
  const wrapped: string[] = [];
  let current = '';

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > maxCharsPerLine && current) {
      wrapped.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }

  if (current) wrapped.push(current);
  return wrapped;
}

async function createPdfFromFrozenHtml(html: string, title: string) {
  const pdfDoc = await PDFDocument.create();
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let page = pdfDoc.addPage([595, 842]);
  const margin = 44;
  const contentWidth = page.getWidth() - margin * 2;
  let y = page.getHeight() - margin;

  page.drawText(title || 'Document de signature', {
    x: margin,
    y,
    size: 16,
    font: fontBold,
    color: rgb(0.11, 0.17, 0.3),
  });
  y -= 28;

  const lines = htmlToPlainLines(html || '');
  for (const paragraph of lines) {
    const wrapped = wrapTextToWidth(paragraph, 100);
    for (const line of wrapped) {
      if (y < margin + 18) {
        page = pdfDoc.addPage([595, 842]);
        y = page.getHeight() - margin;
      }
      page.drawText(line, {
        x: margin,
        y,
        size: 11,
        font: fontRegular,
        color: rgb(0.12, 0.15, 0.2),
        maxWidth: contentWidth,
      });
      y -= 16;
    }
    y -= 8;
  }

  return Buffer.from(await pdfDoc.save());
}

function resolvePublicIdFromUrl(url?: string | null) {
  if (!url) return undefined;
  return parseCloudinaryUrl(url)?.publicId;
}

async function buildSignedPdf(params: {
  sourcePdfBuffer: Buffer;
  signatureImageBuffer: Buffer;
  isPng: boolean;
  placement: Placement;
}) {
  const pdfDoc = await PDFDocument.load(params.sourcePdfBuffer);
  const targetPage = pdfDoc.getPages()[pdfDoc.getPageCount() - 1];
  const pageWidth = targetPage.getWidth();
  const pageHeight = targetPage.getHeight();

  const embeddedSignature = params.isPng
    ? await pdfDoc.embedPng(params.signatureImageBuffer)
    : await pdfDoc.embedJpg(params.signatureImageBuffer);

  const defaultWidthRatio = 0.26;
  const widthRatio = Math.min(0.45, Math.max(0.12, Number(params.placement.widthRatio || defaultWidthRatio)));
  const drawWidth = pageWidth * widthRatio;
  const drawHeight = (embeddedSignature.height / embeddedSignature.width) * drawWidth;

  const xRatio = Math.min(0.95, Math.max(0.05, Number(params.placement.xRatio || 0.8)));
  const yRatio = Math.min(0.95, Math.max(0.05, Number(params.placement.yRatio || 0.88)));
  const x = Math.min(pageWidth - drawWidth - 12, Math.max(12, xRatio * pageWidth - drawWidth / 2));
  const y = Math.min(pageHeight - drawHeight - 12, Math.max(12, (1 - yRatio) * pageHeight - drawHeight / 2));

  targetPage.drawImage(embeddedSignature, {
    x,
    y,
    width: drawWidth,
    height: drawHeight,
  });

  return Buffer.from(await pdfDoc.save());
}

export async function POST(request: Request, context: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await context.params;
    await dbConnect();
    const body = await request.json();
    const { signatureImageUrl, signatureImagePublicId, placement } = body as {
      signatureImageUrl: string;
      signatureImagePublicId?: string;
      placement?: Placement;
    };

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

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME || process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY || process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    if (!cloudName || !apiKey || !apiSecret) {
      return NextResponse.json({ success: false, error: 'Configuration Cloudinary incomplète côté serveur.' }, { status: 500 });
    }

    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
    });

    // Récupérer l'IP pour la conserver
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'Unknown IP';

    signatureRequest.statut = 'SIGNE';
    signatureRequest.signatureImageUrl = signatureImageUrl;
    signatureRequest.signatureImagePublicId = signatureImagePublicId;
    signatureRequest.signaturePlacementX = Number(placement?.xRatio || 0.8);
    signatureRequest.signaturePlacementY = Number(placement?.yRatio || 0.88);
    signatureRequest.signaturePlacementWidth = Number(placement?.widthRatio || 0.26);
    signatureRequest.dateSignature = new Date();
    signatureRequest.ipSignature = ip;

    const signatureResp = await fetch(signatureImageUrl);
    if (!signatureResp.ok) {
      throw new Error('Impossible de récupérer la signature pour composer le PDF final.');
    }

    const signatureContentType = (signatureResp.headers.get('content-type') || '').toLowerCase();
    const signatureImageBuffer = Buffer.from(await signatureResp.arrayBuffer());

    let sourcePdfBuffer: Buffer | null = null;

    if (signatureRequest.typeSource === 'UPLOAD' && signatureRequest.fichierPdfUrl) {
      const parsedPdf = parseCloudinaryUrl(signatureRequest.fichierPdfUrl);
      sourcePdfBuffer = await getPdfBuffer(
        signatureRequest.fichierPdfUrl,
        String(signatureRequest.fichierPdfPublicId || parsedPdf?.publicId || ''),
        String(signatureRequest.fichierPdfResourceType || parsedPdf?.resourceType || 'image'),
        String(signatureRequest.fichierPdfDeliveryType || parsedPdf?.deliveryType || 'upload'),
        String(signatureRequest.fichierPdfFormat || parsedPdf?.format || 'pdf')
      );
    } else if (signatureRequest.typeSource === 'TEMPLATE') {
      sourcePdfBuffer = await createPdfFromFrozenHtml(
        String(signatureRequest.contenuGele || ''),
        String(signatureRequest.titreDocument || 'Document de signature')
      );
    }

    if (sourcePdfBuffer) {
      const signedPdf = await buildSignedPdf({
        sourcePdfBuffer,
        signatureImageBuffer,
        isPng: signatureContentType.includes('png'),
        placement: placement || {},
      });

      const uploadedSigned = await uploadPdfBufferToCloudinary(signedPdf, token);
      signatureRequest.signedDocumentUrl = uploadedSigned.secureUrl;
      signatureRequest.signedDocumentPublicId = uploadedSigned.publicId;
    }

    await signatureRequest.save();

    // -- Ajout automatique du document signé au client (si lié à la base) --
    const client = signatureRequest.clientId ? await Client.findById(signatureRequest.clientId) : null;
    if (client) {
      const signedDocUrl = signatureRequest.signedDocumentUrl
        || (signatureRequest.typeSource === 'UPLOAD' ? signatureRequest.fichierPdfUrl : signatureImageUrl);

      const signedDocPublicId = signatureRequest.signedDocumentPublicId
        || (signatureRequest.typeSource === 'UPLOAD'
          ? signatureRequest.fichierPdfPublicId || resolvePublicIdFromUrl(signatureRequest.fichierPdfUrl)
          : signatureImagePublicId || resolvePublicIdFromUrl(signatureImageUrl));

      if (!signedDocUrl || !signedDocPublicId) {
        return NextResponse.json({ success: false, error: 'Impossible d’enregistrer le document signé: référence Cloudinary manquante.' }, { status: 500 });
      }

      client.documents.push({
        nom: `Contrat Signé - ${signatureRequest.titreDocument}`,
        url: signedDocUrl,
        format: signatureRequest.signedDocumentUrl ? 'pdf' : 'png',
        publicId: String(signedDocPublicId),
        status: 'VALIDE',
        dateRecep: new Date()
      });
      await client.save();
    }

    return NextResponse.json({
      success: true,
      message: 'Document signé avec succès !',
      data: {
        signedDocumentUrl: signatureRequest.signedDocumentUrl || null,
      },
    });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
