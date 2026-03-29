import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Campaign from '@/models/Campaign';
import Client from '@/models/Client';
import GroupeClient from '@/models/GroupeClient';
import DeliveryLog from '@/models/DeliveryLog';
import { sendMail } from '@/lib/mailer';

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  await dbConnect();

  const campaign = await Campaign.findById(id);
  if (!campaign) return NextResponse.json({ success: false, error: 'Campagne introuvable' }, { status: 404 });
  if (campaign.statut === 'ENVOYE') {
    return NextResponse.json({ success: false, error: 'Campagne déjà envoyée.' }, { status: 400 });
  }

  // --- Résolution des destinataires selon le mode de ciblage ---
  let clients: { email: string; nom: string; prenom: string }[] = [];

  const cibleType = campaign.cibleType || 'TOUS';

  if (cibleType === 'SELECTIONNES' && campaign.destinataireIds?.length) {
    clients = await Client.find({ _id: { $in: campaign.destinataireIds } }).select('email nom prenom');
  } else if (cibleType === 'GROUPES' && campaign.groupeIds?.length) {
    const groupes = await GroupeClient.find({ _id: { $in: campaign.groupeIds } }).populate('clientIds', 'email nom prenom');
    const seen = new Set<string>();
    for (const g of groupes) {
      for (const c of (g as any).clientIds) {
        if (!seen.has(String(c._id))) {
          seen.add(String(c._id));
          clients.push({ email: c.email, nom: c.nom, prenom: c.prenom });
        }
      }
    }
  } else if (cibleType === 'TYPE_CLIENT') {
    const filter = campaign.cible === 'TOUS' ? {} : { typeClient: campaign.cible };
    clients = await Client.find(filter).select('email nom prenom');
  } else {
    // TOUS
    clients = await Client.find({}).select('email nom prenom');
  }

  if (clients.length === 0) {
    return NextResponse.json({ success: false, error: 'Aucun destinataire dans cette cible.' }, { status: 400 });
  }

  campaign.nombreDestinataires = clients.length;
  let envoyes = 0;
  let echecs = 0;

  // Récupérer les IDs de clients pour les logs
  const clientMap = new Map<string, string>();
  const allClients = await Client.find({ email: { $in: clients.map(c => c.email) } }).select('_id email');
  allClients.forEach(c => clientMap.set(c.email, c._id.toString()));

  // Envoi séquentiel par batch de 5 pour ne pas saturer le serveur SMTP
  const BATCH = 5;
  for (let i = 0; i < clients.length; i += BATCH) {
    const batch = clients.slice(i, i + BATCH);

    await Promise.allSettled(batch.map(async (client) => {
      const personalizedHtml = campaign.contenu
        .replace(/\{\{nom\}\}/g, client.nom || '')
        .replace(/\{\{prenom\}\}/g, client.prenom || '')
        .replace(/\{\{email\}\}/g, client.email || '');

      const result = await sendMail({
        to: client.email,
        subject: campaign.sujet,
        html: wrapTemplate(personalizedHtml, campaign.sujet),
      });

      const log = new (await import('@/models/DeliveryLog')).default({
        campaign: id,
        recipient: clientMap.get(client.email) || null,
        email: client.email,
        status: result.success ? 'SENT' : 'FAILED',
        errorMessage: result.success ? null : 'Échec d\'envoi SMTP',
      });
      await log.save();

      if (result.success) envoyes++;
      else echecs++;
    }));

    // Pause de 300 ms entre les batches pour respecter les limites SMTP
    if (i + BATCH < clients.length) {
      await new Promise(r => setTimeout(r, 300));
    }
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

function wrapTemplate(content: string, title: string): string {
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
        <tr><td style="background:linear-gradient(135deg,#1e3a5f,#2563eb);border-radius:16px 16px 0 0;padding:32px 40px;text-align:center;">
          <p style="color:#93c5fd;font-size:13px;font-weight:600;letter-spacing:3px;margin:0 0 8px;">NBBC PLATFORM</p>
          <h1 style="color:white;font-size:24px;font-weight:800;margin:0;">${title}</h1>
        </td></tr>
        <tr><td style="background:white;padding:40px;border-radius:0 0 16px 16px;color:#334155;font-size:15px;line-height:1.7;">
          ${content}
        </td></tr>
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
