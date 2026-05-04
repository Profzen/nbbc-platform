import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import TontineAdhesionEcheance from '@/models/TontineAdhesionEcheance';
import TontineOffre from '@/models/TontineOffre';
import { sendMail } from '@/lib/mailer';
import { getEffectiveEcheanceStatut } from '@/lib/tontine-schedule';

export const dynamic = 'force-dynamic';

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function diffInDays(from: Date, to: Date) {
  return Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / 86400000);
}

function buildReminderHtml(params: { clientName: string; offreNom: string; numeroEcheance: number; dateEcheance: Date; montantPrevu: number; joursRestants: number }) {
  const label = params.joursRestants === 1 ? 'demain' : `dans ${params.joursRestants} jours`;
  return `
    <div style="font-family:Arial,sans-serif;line-height:1.5;color:#0f172a;">
      <h2 style="margin:0 0 12px;">Rappel d'échéance tontine</h2>
      <p>Bonjour ${params.clientName},</p>
      <p>Votre échéance <strong>#${params.numeroEcheance}</strong> pour la tontine <strong>${params.offreNom}</strong> arrive <strong>${label}</strong>.</p>
      <p><strong>Montant:</strong> ${params.montantPrevu.toLocaleString('fr-FR')} XOF</p>
      <p><strong>Date d'échéance:</strong> ${params.dateEcheance.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
      <p>Connectez-vous à votre espace client NBBC pour régler cette échéance.</p>
      <p style="color:#64748b;font-size:12px;">Email généré automatiquement par NBBC Platform.</p>
    </div>
  `;
}

export async function POST(req: Request) {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 401 });
  }

  await dbConnect();

  const today = new Date();
  const upperBound = new Date();
  upperBound.setDate(upperBound.getDate() + 2);
  upperBound.setHours(23, 59, 59, 999);

  const dueSoon = await TontineAdhesionEcheance.find({
    statut: { $in: ['A_PREVOIR', 'EN_ATTENTE', 'EN_RETARD'] },
    dateEcheance: { $lte: upperBound },
  }).lean();

  if (dueSoon.length === 0) {
    return NextResponse.json({ success: true, reminded: 0, updatedStatuses: 0, message: 'Aucune échéance à traiter.' });
  }

  const userIds = Array.from(new Set(dueSoon.map((item) => String(item.clientUserId))));
  const offreIds = Array.from(new Set(dueSoon.map((item) => String(item.offreId))));

  const [users, offres] = await Promise.all([
    User.find({ _id: { $in: userIds } }).lean(),
    TontineOffre.find({ _id: { $in: offreIds } }).lean(),
  ]);

  const usersById = new Map(users.map((user) => [String(user._id), user]));
  const offresById = new Map(offres.map((offre) => [String(offre._id), offre]));

  let reminded = 0;
  let updatedStatuses = 0;

  for (const item of dueSoon) {
    const effectiveStatus = getEffectiveEcheanceStatut(item, today);
    if (effectiveStatus !== item.statut) {
      await TontineAdhesionEcheance.updateOne({ _id: item._id }, { $set: { statut: effectiveStatus } });
      updatedStatuses += 1;
      item.statut = effectiveStatus;
    }

    if (item.statut === 'PAYEE' || item.statut === 'ANNULEE' || item.validationStatus === 'PENDING') {
      continue;
    }

    const joursRestants = diffInDays(today, new Date(item.dateEcheance));
    if (![1, 2].includes(joursRestants)) {
      continue;
    }

    if (joursRestants === 1 && item.reminderOneDaySentAt) {
      continue;
    }

    if (joursRestants === 2 && item.reminderTwoDaysSentAt) {
      continue;
    }

    const user = usersById.get(String(item.clientUserId));
    const offre = offresById.get(String(item.offreId));
    if (!user?.email || !offre?.nom) {
      continue;
    }

    const mailResult = await sendMail({
      to: user.email,
      subject: `Rappel échéance tontine - ${offre.nom}`,
      html: buildReminderHtml({
        clientName: user.name || 'Client',
        offreNom: offre.nom,
        numeroEcheance: item.numeroEcheance,
        dateEcheance: new Date(item.dateEcheance),
        montantPrevu: Number(item.montantPrevu || 0),
        joursRestants,
      }),
    });

    if (!mailResult.success && !(mailResult as any).skipped) {
      continue;
    }

    const field = joursRestants === 1 ? 'reminderOneDaySentAt' : 'reminderTwoDaysSentAt';
    await TontineAdhesionEcheance.updateOne({ _id: item._id }, { $set: { [field]: new Date() } });
    reminded += 1;
  }

  return NextResponse.json({ success: true, reminded, updatedStatuses });
}