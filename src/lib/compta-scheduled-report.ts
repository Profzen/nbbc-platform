import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Transaction from '@/models/Transaction';
import DepotRetrait from '@/models/DepotRetrait';
import Compte from '@/models/Compte';
import Materiel from '@/models/Materiel';
import ComptaDailyReport from '@/models/ComptaDailyReport';
import { buildDailyComptaPdfBundle } from '@/lib/compta-daily-report';
import { sendMail } from '@/lib/mailer';
import { logActivity } from '@/lib/activity-logger';

type RunComptaScheduledReportOptions = {
  recipient?: string;
  force?: boolean;
  scheduleLabel?: string;
  requireCronSecret?: boolean;
};

function getReportDate(timeZone: string) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function getUtcRangeFromReportDate(reportDate: string) {
  const start = new Date(`${reportDate}T00:00:00.000Z`);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start, end };
}

function toISODate(value?: string | Date) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
}

function isOnOrBeforeDate(value: string | Date | undefined, maxDate: string) {
  if (!value || !maxDate) return false;
  return toISODate(value) <= maxDate;
}

function getMaterialSnapshot(material: any, targetDate: string) {
  const history = [...(material.history || [])].sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
  const lastRelevant = history.filter((entry: any) => isOnOrBeforeDate(entry.at, targetDate)).pop();

  if (lastRelevant) {
    if (lastRelevant.deleted || lastRelevant.action === 'DELETED') return null;
    return {
      ...material,
      categorie: lastRelevant.categorie,
      categorieAutre: lastRelevant.categorieAutre,
      nomAppareil: lastRelevant.nomAppareil,
      imei: lastRelevant.imei,
      nombre: Number(lastRelevant.nombre || 1),
      couleur: lastRelevant.couleur,
      description: lastRelevant.description,
      etat: lastRelevant.etat,
      actif: true,
    };
  }

  if (!isOnOrBeforeDate(material.createdAt, targetDate)) return null;
  if (material.actif === false && material.deletedAt && !isOnOrBeforeDate(material.deletedAt, targetDate)) {
    return { ...material, actif: true };
  }
  if (material.actif === false && material.deletedAt && isOnOrBeforeDate(material.deletedAt, targetDate)) return null;
  return material;
}

export async function runComptaScheduledReport(req: Request, options: RunComptaScheduledReportOptions = {}) {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  const url = new URL(req.url);
  const force = options.force ?? url.searchParams.get('force') === '1';
  const recipientFromQuery = (url.searchParams.get('recipient') || '').trim().toLowerCase();
  const scheduleLabel = options.scheduleLabel || (url.searchParams.get('scheduleLabel') || '').trim();

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const requireCronSecret = options.requireCronSecret ?? true;

  if (requireCronSecret && cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ success: false, error: 'Non autorise' }, { status: 401 });
  }

  const defaultRecipient = process.env.COMPTA_DAILY_RECIPIENT || 'bowonoudoerazak@gmail.com';
  const recipient = (options.recipient || recipientFromQuery || defaultRecipient).trim().toLowerCase();
  if (!emailPattern.test(recipient)) {
    await logActivity('Export comptable planifie invalide', `Destinataire invalide: ${recipient}`);
    return NextResponse.json({ success: false, error: 'Destinataire email invalide.' }, { status: 400 });
  }

  const timeZone = process.env.COMPTA_REPORT_TIMEZONE || 'Africa/Lome';
  const reportDate = getReportDate(timeZone);

  await dbConnect();

  await logActivity(
    'Export comptable planifie declenche',
    `Date ${reportDate} vers ${recipient}${scheduleLabel ? ` (horaire ${scheduleLabel})` : ''}${force ? ' - force' : ''}`
  );

  if (!force) {
    const alreadySent = await ComptaDailyReport.findOne({ reportDate, status: 'SENT' }).lean();
    if (alreadySent) {
      await logActivity(
        'Export comptable planifie ignore',
        `Date ${reportDate} deja envoyee vers ${alreadySent.recipient}${scheduleLabel ? ` (horaire ${scheduleLabel})` : ''}`
      );
      return NextResponse.json({ success: true, skipped: true, reportDate, message: 'Rapport deja envoye pour cette date.' });
    }
  }

  const { start, end } = getUtcRangeFromReportDate(reportDate);

  const [comptesRaw, transactionsDayRaw, transactionsUpToRaw, depotsDayRaw, depotsUpToRaw, materielsRaw] = await Promise.all([
    Compte.find({ actif: true }).lean(),
    Transaction.find({ date: { $gte: start, $lt: end } }).sort({ date: 1 }).lean(),
    Transaction.find({ date: { $lt: end } }).sort({ date: 1 }).lean(),
    DepotRetrait.find({ date: { $gte: start, $lt: end } }).sort({ date: 1 }).lean(),
    DepotRetrait.find({ date: { $lt: end } }).sort({ date: 1 }).lean(),
    Materiel.find({}).lean(),
  ]);

  const comptes = comptesRaw.map((c: any) => ({ ...c, _id: String(c._id) }));
  const transactionsDay = transactionsDayRaw.map((t: any) => ({ ...t, _id: String(t._id), date: String(t.date), accountDebitId: t.accountDebitId ? String(t.accountDebitId) : null, accountCreditId: t.accountCreditId ? String(t.accountCreditId) : null }));
  const transactionsUpToDay = transactionsUpToRaw.map((t: any) => ({ ...t, _id: String(t._id), date: String(t.date), accountDebitId: t.accountDebitId ? String(t.accountDebitId) : null, accountCreditId: t.accountCreditId ? String(t.accountCreditId) : null }));
  const depotsDay = depotsDayRaw.map((d: any) => ({ ...d, _id: String(d._id), date: String(d.date), compteId: d.compteId ? String(d.compteId) : null, compteDebitId: d.compteDebitId ? String(d.compteDebitId) : null, compteCreditId: d.compteCreditId ? String(d.compteCreditId) : null }));
  const depotsUpToDay = depotsUpToRaw.map((d: any) => ({ ...d, _id: String(d._id), date: String(d.date), compteId: d.compteId ? String(d.compteId) : null, compteDebitId: d.compteDebitId ? String(d.compteDebitId) : null, compteCreditId: d.compteCreditId ? String(d.compteCreditId) : null }));
  const materielsEtat = materielsRaw
    .map((material: any) => getMaterialSnapshot(material, reportDate))
    .filter((material: any) => Boolean(material))
    .map((m: any) => ({
      categorie: m.categorie === 'AUTRE' ? (m.categorieAutre || 'Autre') : m.categorie,
      nomAppareil: m.nomAppareil,
      imei: m.imei,
      nombre: Number(m.nombre || 0),
      couleur: m.couleur,
      etat: m.etat,
      description: m.description,
    }));

  const { attachments, summaryDay, summaryUpToDay } = await buildDailyComptaPdfBundle({
    reportDate,
    comptes,
    transactionsDay,
    transactionsUpToDay,
    depotsDay,
    depotsUpToDay,
    materielsEtat,
  });

  const subject = `Resume comptable du jour - ${reportDate}`;
  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.5;color:#0f172a;">
      <h2 style="margin:0 0 12px 0;">Resume du jour ${reportDate}</h2>
      <p>Veuillez trouver en pieces jointes les PDF automatiques du jour:</p>
      <ul>
        <li>Etat global</li>
        <li>Achats</li>
        <li>Ventes</li>
        <li>Depenses</li>
        <li>Dettes</li>
        <li>Gains cumules</li>
        <li>Épargne cumulee</li>
        <li>Depots / Retraits</li>
        <li>Gestion de compte (etat fin de journee)</li>
        <li>Etat du materiel</li>
      </ul>
      <p><strong>Totaux du jour:</strong></p>
      <ul>
        <li>Achats: ${summaryDay.totals.achats}</li>
        <li>Ventes: ${summaryDay.totals.ventes}</li>
        <li>Depenses: ${summaryDay.totals.depenses}</li>
        <li>Dettes: ${summaryDay.totals.dettes}</li>
      </ul>
      <p><strong>Total disponible (cumule fin de journee):</strong> ${summaryUpToDay.totals.totalDisponible}</p>
      <p><strong>Épargne cumulée:</strong> ${summaryUpToDay.totals.totalEpargne}</p>
      <p style="color:#64748b;font-size:12px;">Email genere automatiquement par NBBC Platform.</p>
    </div>
  `;

  const mailResult = await sendMail({
    to: recipient,
    subject,
    html,
    attachments: attachments.map((a) => ({ filename: a.filename, content: a.content, contentType: a.contentType })),
  });

  if (!mailResult.success) {
    await ComptaDailyReport.findOneAndUpdate(
      { reportDate },
      {
        reportDate,
        recipient,
        sentAt: new Date(),
        attachmentsCount: attachments.length,
        status: 'FAILED',
        errorMessage: (mailResult as any).error || 'SMTP non configure',
      },
      { upsert: true, new: true }
    );
    await logActivity(
      'Export comptable planifie echec',
      `Date ${reportDate} vers ${recipient}${scheduleLabel ? ` (horaire ${scheduleLabel})` : ''} - ${((mailResult as any).error || 'SMTP non configure')}`
    );
    return NextResponse.json({ success: false, reportDate, error: (mailResult as any).error || 'Email non envoye' }, { status: 500 });
  }

  await ComptaDailyReport.findOneAndUpdate(
    { reportDate },
    {
      reportDate,
      recipient,
      sentAt: new Date(),
      attachmentsCount: attachments.length,
      status: 'SENT',
      errorMessage: null,
    },
    { upsert: true, new: true }
  );

  await logActivity(
    'Export comptable planifie envoye',
    `Date ${reportDate} vers ${recipient} (${attachments.length} PDFs)${scheduleLabel ? ` - horaire ${scheduleLabel}` : ''}`
  );

  return NextResponse.json({ success: true, reportDate, recipient, attachments: attachments.length });
}