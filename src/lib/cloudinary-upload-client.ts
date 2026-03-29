type SignResponse = {
  signature: string;
  apiKey: string;
  cloudName: string;
};

export type CloudinaryUploadResult = {
  secureUrl: string;
  publicId: string;
  resourceType: string;
  deliveryType: string;
  format: string;
  originalFilename: string;
};

type UploadOptions = {
  folder: string;
  resourceType?: 'auto' | 'image' | 'raw';
};

async function readJsonSafe(response: Response, fallbackMessage: string) {
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    const raw = await response.text();
    throw new Error(raw || fallbackMessage);
  }
  return response.json();
}

export async function uploadFileToCloudinary(file: File, options: UploadOptions): Promise<CloudinaryUploadResult> {
  const timestamp = Math.floor(Date.now() / 1000);
  const resourceType = options.resourceType || 'auto';

  const signResponse = await fetch('/api/cloudinary/sign', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      paramsToSign: {
        timestamp,
        folder: options.folder,
      },
    }),
  });

  if (!signResponse.ok) {
    const payload = await readJsonSafe(signResponse, 'Signature Cloudinary impossible.').catch(() => null);
    throw new Error(payload?.error || 'Signature Cloudinary impossible.');
  }

  const signData = (await readJsonSafe(signResponse, 'Réponse Cloudinary invalide.')) as SignResponse;
  if (!signData?.signature || !signData?.apiKey || !signData?.cloudName) {
    throw new Error('Réponse de signature Cloudinary incomplète.');
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('api_key', signData.apiKey);
  formData.append('timestamp', String(timestamp));
  formData.append('signature', signData.signature);
  formData.append('folder', options.folder);

  const uploadResponse = await fetch(
    `https://api.cloudinary.com/v1_1/${signData.cloudName}/${resourceType}/upload`,
    { method: 'POST', body: formData }
  );

  const uploadData = await readJsonSafe(uploadResponse, 'Réponse Cloudinary invalide pendant upload.');
  if (!uploadResponse.ok || !uploadData?.secure_url || !uploadData?.public_id) {
    throw new Error(uploadData?.error?.message || 'Upload Cloudinary échoué.');
  }

  return {
    secureUrl: uploadData.secure_url,
    publicId: uploadData.public_id,
    resourceType: uploadData.resource_type || resourceType,
    deliveryType: uploadData.type || 'upload',
    format: uploadData.format || '',
    originalFilename: uploadData.original_filename || file.name,
  };
}
