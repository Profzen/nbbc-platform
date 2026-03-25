import { NextResponse } from 'next/server';
import crypto from 'crypto';
import dbConnect from '@/lib/mongodb';
import SignatureRequest from '@/models/SignatureRequest';
import TemplateContrat from '@/models/TemplateContrat';
import Client from '@/models/Client';

export async function POST(request: Request) {
  try {
    await dbConnect();
    const body = await request.json();
    const { clientId, clientNomLibre, typeSource, templateId, fichierPdfUrl, titreDocument } = body;

    if ((!clientId && !clientNomLibre) || !typeSource || !titreDocument) {
      return NextResponse.json({ success: false, error: 'Paramètres manquants' }, { status: 400 });
    }

    let client: any = null;
    if (clientId) {
      client = await Client.findById(clientId);
      if (!client) {
        return NextResponse.json({ success: false, error: 'Client introuvable' }, { status: 404 });
      }
    }

    const nomLibreNettoye = typeof clientNomLibre === 'string' ? clientNomLibre.trim() : '';

    const nomComplet = client ? `${client.nom || ''} ${client.prenom || ''}`.trim() : nomLibreNettoye;
    const [nomLibre, ...restPrenomLibre] = nomComplet.split(/\s+/).filter(Boolean);
    const prenomLibre = restPrenomLibre.join(' ');

    let contenuGele = undefined;

    // Si c'est un TEMPLATE, on fusionne les variables du client dans le HTML immédiatement
    if (typeSource === 'TEMPLATE') {
      if (!templateId) return NextResponse.json({ success: false, error: 'Mode TEMPLATE : templateId requis.' }, { status: 400 });
      
      const template = await TemplateContrat.findById(templateId);
      if (!template) return NextResponse.json({ success: false, error: 'Modèle introuvable.' }, { status: 404 });

      // Fusion des données de base du client dans le HTML
      contenuGele = template.contenuHtml
        .replace(/\{\{nom\}\}/gi, client?.nom || nomLibre || '')
        .replace(/\{\{prenom\}\}/gi, client?.prenom || prenomLibre || '')
        .replace(/\{\{email\}\}/gi, client?.email || '')
        .replace(/\{\{pays\}\}/gi, client?.paysResidence || '')
        .replace(/\{\{date\}\}/gi, new Date().toLocaleDateString('fr-FR'));
    } 
    // Sinon c'est un UPLOAD
    else if (typeSource === 'UPLOAD') {
      if (!fichierPdfUrl) {
        return NextResponse.json({ success: false, error: 'Mode UPLOAD : fichier PDF manquant.' }, { status: 400 });
      }
    } else {
      return NextResponse.json({ success: false, error: 'Type de source invalide.' }, { status: 400 });
    }

    // Génération du token unique de signature
    const token = crypto.randomUUID();

    const signatureRequest = await SignatureRequest.create({
      token,
      clientId: client?._id,
      clientNomLibre: !client ? nomLibreNettoye : undefined,
      titreDocument,
      typeSource,
      templateId: typeSource === 'TEMPLATE' ? templateId : undefined,
      fichierPdfUrl: typeSource === 'UPLOAD' ? fichierPdfUrl : undefined,
      contenuGele,
      statut: 'EN_ATTENTE'
    });

    // Retourne aussi l'URL complète pour que l'admin puisse la copier,
    // ou qu'on l'envoie via Resend juste après.
    return NextResponse.json({ 
      success: true, 
      data: signatureRequest,
      urlSignature: `/sign/${token}` 
    }, { status: 201 });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
