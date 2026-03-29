import dbConnect from '@/lib/mongodb';
import Campaign from '@/models/Campaign';
import DeliveryLog from '@/models/DeliveryLog';

export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  try {
    await dbConnect();

    const campaign = await Campaign.findById(id);
    if (!campaign) {
      return Response.json({ success: false, error: 'Campagne non trouvée' }, { status: 404 });
    }

    // Récupérer les logs de livraison pour cette campagne
    const logs = await DeliveryLog.find({ campaign: id });
    const statuses = {
      SENT: logs.filter(l => l.status === 'SENT').length,
      FAILED: logs.filter(l => l.status === 'FAILED').length,
      BOUNCED: logs.filter(l => l.status === 'BOUNCED').length,
      OPENED: logs.filter(l => l.status === 'OPENED').length,
      CLICKED: logs.filter(l => l.status === 'CLICKED').length,
    };

    const failureReasons = {} as Record<string, number>;
    logs.forEach(log => {
      if (log.errorMessage) {
        failureReasons[log.errorMessage] = (failureReasons[log.errorMessage] || 0) + 1;
      }
    });

    const analytics = {
      totalDestinataires: campaign.nombreDestinataires || 0,
      statuses,
      tauxDelivrance: campaign.nombreDestinataires ? Math.round((statuses.SENT / campaign.nombreDestinataires) * 100) : 0,
      tauxOuverture: logs.length > 0 ? Math.round((statuses.OPENED / logs.length) * 100) : 0,
      tauxClic: logs.length > 0 ? Math.round((statuses.CLICKED / logs.length) * 100) : 0,
      failureReasons,
      dateEnvoi: campaign.dateEnvoi,
      courierLogs: logs.slice(0, 50).map(l => ({
        email: l.email,
        status: l.status,
        errorMessage: l.errorMessage,
        sentAt: l.sentAt,
      })),
    };

    return Response.json({ success: true, data: analytics });
  } catch (err: any) {
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}
