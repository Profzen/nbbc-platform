/**
 * POST /api/marketing/scheduled
 * Déclenché par un cron Vercel toutes les heures.
 * Cherche les campagnes planifiées dont la date est dépassée et les envoie.
 *
 * Configuration Vercel cron : voir vercel.json
 * Sécurité : vérification de CRON_SECRET en header Authorization
 */
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Campaign from '@/models/Campaign';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  // Sécurité : seul Vercel cron (ou un appel avec le bon secret) peut déclencher
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 401 });
  }

  await dbConnect();

  // Trouver les campagnes planifiées prêtes à être envoyées
  const due = await Campaign.find({
    isScheduled: true,
    statut: 'BROUILLON',
    scheduledAt: { $lte: new Date() },
  });

  if (due.length === 0) {
    return NextResponse.json({ success: true, message: 'Aucune campagne planifiée à envoyer.', sent: 0 });
  }

  const results: { id: string; titre: string; ok: boolean; detail: any }[] = [];

  for (const campaign of due) {
    try {
      // Appel interne à l'endpoint d'envoi existant
      const origin = req.headers.get('origin') || process.env.NEXTAUTH_URL || 'http://localhost:3000';
      const res = await fetch(`${origin}/api/marketing/campaigns/${campaign._id}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      results.push({ id: String(campaign._id), titre: campaign.titre, ok: data.success, detail: data.data });
    } catch (err: any) {
      results.push({ id: String(campaign._id), titre: campaign.titre, ok: false, detail: err.message });
    }
  }

  return NextResponse.json({ success: true, sent: results.filter(r => r.ok).length, results });
}
