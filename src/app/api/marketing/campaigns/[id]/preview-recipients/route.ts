import dbConnect from '@/lib/mongodb';
import Campaign from '@/models/Campaign';
import Client from '@/models/Client';
import GroupeClient from '@/models/GroupeClient';

export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  try {
    await dbConnect();

    const campaign = await Campaign.findById(id).populate('groupeIds destinataireIds');
    if (!campaign) return Response.json({ success: false, error: 'Campagne non trouvée' }, { status: 404 });

    const recipients = new Map<string, any>();

    // Résoudre les destinataires selon le type de ciblage
    if (campaign.cibleType === 'TOUS') {
      const clients = await Client.find({});
      clients.forEach(c => recipients.set(c._id.toString(), c));
    } else if (campaign.cibleType === 'TYPE_CLIENT') {
      const clients = await Client.find({ typeClient: campaign.cible });
      clients.forEach(c => recipients.set(c._id.toString(), c));
    } else if (campaign.cibleType === 'GROUPES') {
      const groupes = await GroupeClient.find({ _id: { $in: campaign.groupeIds } }).populate('clientIds');
      groupes.forEach(g => {
        (g.clientIds as any[]).forEach(c => recipients.set(c._id.toString(), c));
      });
    } else if (campaign.cibleType === 'SELECTIONNES') {
      const clients = await Client.find({ _id: { $in: campaign.destinataireIds } });
      clients.forEach(c => recipients.set(c._id.toString(), c));
    }

    const grouped = {
      total: recipients.size,
      byType: {} as Record<string, number>,
      list: Array.from(recipients.values()).slice(0, 100), // Limitations à 100 pour l'aperçu
      hasMore: recipients.size > 100,
    };

    Array.from(recipients.values()).forEach(c => {
      grouped.byType[c.typeClient] = (grouped.byType[c.typeClient] || 0) + 1;
    });

    return Response.json({ success: true, data: grouped });
  } catch (err: any) {
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}
