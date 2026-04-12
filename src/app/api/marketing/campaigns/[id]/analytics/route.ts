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
      ACCEPTED: logs.filter(l => l.status === 'ACCEPTED').length,
      DELIVERED: logs.filter(l => l.status === 'DELIVERED').length,
      IN_PROCESS: logs.filter(l => l.status === 'IN_PROCESS').length,
      BLOCKED: logs.filter(l => l.status === 'BLOCKED').length,
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

    const failureReasonsList = Object.entries(failureReasons)
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count);

    const analytics = {
      totalDestinataires: campaign.nombreDestinataires || 0,
      canal: campaign.canal,
      statuses,
      totalEnvoyes: statuses.SENT + statuses.ACCEPTED + statuses.DELIVERED + statuses.IN_PROCESS,
      totalLivres: statuses.DELIVERED,
      tauxDelivrance: campaign.nombreDestinataires ? Math.round((statuses.DELIVERED / campaign.nombreDestinataires) * 100) : 0,
      tauxOuverture: logs.length > 0 ? Math.round((statuses.OPENED / logs.length) * 100) : 0,
      tauxClic: logs.length > 0 ? Math.round((statuses.CLICKED / logs.length) * 100) : 0,
      failureReasons: failureReasonsList,
      dateEnvoi: campaign.dateEnvoi,
      logs: logs.slice(0, 50).map(l => ({
        email: l.email,
        status: l.status,
        errorMessage: l.errorMessage,
        sentAt: l.sentAt,
        provider: l.provider,
        messageId: l.messageId,
        traceStatus: l.traceStatus,
        traceRoute: l.traceRoute,
      })),
    };

    return Response.json({ success: true, data: analytics });
  } catch (err: any) {
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}
