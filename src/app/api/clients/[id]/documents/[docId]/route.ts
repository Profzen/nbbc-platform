import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Client from '@/models/Client';
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string; docId: string }> }
) {
  try {
    const { id: clientId, docId } = await context.params;

    await dbConnect();

    const client = await Client.findById(clientId);
    if (!client) {
      return NextResponse.json({ success: false, error: 'Client non trouvé' }, { status: 404 });
    }

    const document = client.documents.id(docId);
    if (!document) {
      return NextResponse.json({ success: false, error: 'Document non trouvé' }, { status: 404 });
    }

    // Supprimer sur Cloudinary si un publicId existe
    if (document.publicId) {
      try {
        await cloudinary.uploader.destroy(document.publicId);
      } catch (cloudinaryError) {
        console.error("Erreur suppression Cloudinary:", cloudinaryError);
        // On continue même si l'image Cloudinary n'a pas pu être supprimée
      }
    }

    // Supprimer le document du tableau MongoDB
    client.documents.pull(docId);
    await client.save();

    return NextResponse.json({ success: true, message: 'Document supprimé' });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
