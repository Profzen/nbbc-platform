import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Campaign from '@/models/Campaign';
import Client from '@/models/Client';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'NBBC Platform <noreply@nbbc.com>';

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  await dbConnect();

  const campaign = await Campaign.findById(id);
  if (!campaign) return NextResponse.json({ success: false, error: 'Campagne introuvable' }, { status: 404 });
  if (campaign.statut === 'ENVOYE') {
    return NextResponse.json({ success: false, error: 'Campagne déjà envoyée.' }, { status: 400 });
  }

  // Récupérer les destinataires selon la cible
  const filter = campaign.cible === 'TOUS' ? {} : { typeClient: campaign.cible };
  const clients = await Client.find(filter).select('email nom prenom');

  if (clients.length === 0) {
    return NextResponse.json({ success: false, error: 'Aucun destinataire dans cette cible.' }, { status: 400 });
  }

  campaign.nombreDestinataires = clients.length;
  let envoyes = 0;
  let echecs = 0;

  // Envoi par batch de 10 pour respecter les limites de rate
  for (let i = 0; i < clients.length; i += 10) {
    const batch = clients.slice(i, i + 10);
    
    await Promise.allSettled(batch.map(async (client) => {
      try {
        const personalizedHtml = campaign.contenu
          .replace(/\{\{nom\}\}/g, client.nom)
          .replace(/\{\{prenom\}\}/g, client.prenom)
          .replace(/\{\{email\}\}/g, client.email);

        await resend.emails.send({
          from: FROM_EMAIL,
          to: client.email,
          subject: campaign.sujet,
          html: wrapTemplate(personalizedHtml, campaign.sujet, client.prenom),
        });
        envoyes++;
      } catch {
        echecs++;
      }
    }));
  }

  campaign.nombreEnvoyes = envoyes;
  campaign.nombreEchecs = echecs;
  campaign.statut = echecs === clients.length ? 'ECHEC' : 'ENVOYE';
  campaign.dateEnvoi = new Date();
  await campaign.save();

  return NextResponse.json({
    success: true,
    data: { envoyes, echecs, total: clients.length }
  });
}

function wrapTemplate(content: string, title: string, prenom: string): string {
  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,#1e3a5f,#2563eb);border-radius:16px 16px 0 0;padding:32px 40px;text-align:center;">
          <p style="color:#93c5fd;font-size:13px;font-weight:600;letter-spacing:3px;margin:0 0 8px;">NBBC PLATFORM</p>
          <h1 style="color:white;font-size:24px;font-weight:800;margin:0;">${title}</h1>
        </td></tr>
        <!-- Body -->
        <tr><td style="background:white;padding:40px;border-radius:0 0 16px 16px;color:#334155;font-size:15px;line-height:1.7;">
          ${content}
        </td></tr>
        <!-- Footer -->
        <tr><td style="padding:24px 40px;text-align:center;">
          <p style="color:#94a3b8;font-size:12px;margin:0;">
            Vous recevez cet email car vous êtes client NBBC.<br>
            © ${new Date().getFullYear()} NBBC Platform. Tous droits réservés.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
