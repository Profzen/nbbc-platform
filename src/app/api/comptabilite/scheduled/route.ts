import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Transaction from '@/models/Transaction';
import DepotRetrait from '@/models/DepotRetrait';
import Compte from '@/models/Compte';
import ComptaDailyReport from '@/models/ComptaDailyReport';
import { buildDailyComptaPdfBundle } from '@/lib/compta-daily-report';
import { sendMail } from '@/lib/mailer';
import { logActivity } from '@/lib/activity-logger';

export const dynamic = 'force-dynamic';

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

async function runDailyComptaReport(req: Request) {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  const url = new URL(req.url);
  const force = url.searchParams.get('force') === '1';
  const recipientFromQuery = (url.searchParams.get('recipient') || '').trim().toLowerCase();
  const scheduleLabel = (url.searchParams.get('scheduleLabel') || '').trim();

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ success: false, error: 'Non autorise' }, { status: 401 });
  }

  const defaultRecipient = process.env.COMPTA_DAILY_RECIPIENT || 'bowonoudoerazak@gmail.com';
  const recipient = recipientFromQuery || defaultRecipient;
  if (!emailPattern.test(recipient)) {
    await logActivity('Export comptable planifie invalide', `Destinataire invalide: ${recipient}`);
    return NextResponse.json({ success: false, error: 'Destinataire email invalide.' }, { status: 400 });
  }
  const timeZone = process.env.COMPTA_REPORT_TIMEZONE || 'Africa/Lome';
  const reportDate = getReportDate(timeZone);

  await dbConnect();

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

  const [comptesRaw, transactionsDayRaw, transactionsUpToRaw, depotsDayRaw, depotsUpToRaw] = await Promise.all([
    Compte.find({ actif: true }).lean(),
    Transaction.find({ date: { $gte: start, $lt: end } }).sort({ date: 1 }).lean(),
    Transaction.find({ date: { $lt: end } }).sort({ date: 1 }).lean(),
    DepotRetrait.find({ date: { $gte: start, $lt: end } }).sort({ date: 1 }).lean(),
    DepotRetrait.find({ date: { $lt: end } }).sort({ date: 1 }).lean(),
  ]);

  const comptes = comptesRaw.map((c: any) => ({ ...c, _id: String(c._id) }));
  const transactionsDay = transactionsDayRaw.map((t: any) => ({ ...t, _id: String(t._id), date: String(t.date), accountDebitId: t.accountDebitId ? String(t.accountDebitId) : null, accountCreditId: t.accountCreditId ? String(t.accountCreditId) : null }));
  const transactionsUpToDay = transactionsUpToRaw.map((t: any) => ({ ...t, _id: String(t._id), date: String(t.date), accountDebitId: t.accountDebitId ? String(t.accountDebitId) : null, accountCreditId: t.accountCreditId ? String(t.accountCreditId) : null }));
  const depotsDay = depotsDayRaw.map((d: any) => ({ ...d, _id: String(d._id), date: String(d.date), compteId: d.compteId ? String(d.compteId) : null, compteDebitId: d.compteDebitId ? String(d.compteDebitId) : null, compteCreditId: d.compteCreditId ? String(d.compteCreditId) : null }));
  const depotsUpToDay = depotsUpToRaw.map((d: any) => ({ ...d, _id: String(d._id), date: String(d.date), compteId: d.compteId ? String(d.compteId) : null, compteDebitId: d.compteDebitId ? String(d.compteDebitId) : null, compteCreditId: d.compteCreditId ? String(d.compteCreditId) : null }));

  const { attachments, summaryDay, summaryUpToDay } = await buildDailyComptaPdfBundle({
    reportDate,
    comptes,
    transactionsDay,
    transactionsUpToDay,
    depotsDay,
    depotsUpToDay,
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
        <li>Depots / Retraits</li>
        <li>Gestion de compte (etat fin de journee)</li>
      </ul>
      <p><strong>Totaux du jour:</strong></p>
      <ul>
        <li>Achats: ${summaryDay.totals.achats}</li>
        <li>Ventes: ${summaryDay.totals.ventes}</li>
        <li>Depenses: ${summaryDay.totals.depenses}</li>
        <li>Dettes: ${summaryDay.totals.dettes}</li>
      </ul>
      <p><strong>Total disponible (cumule fin de journee):</strong> ${summaryUpToDay.totals.totalDisponible}</p>
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

export async function GET(req: Request) {
  return runDailyComptaReport(req);
}

export async function POST(req: Request) {
  return runDailyComptaReport(req);
}
