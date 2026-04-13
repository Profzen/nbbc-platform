import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import {
  computeComptabiliteSummary,
  formatCurrencyFCFA,
  formatNumber,
  getAccountId,
  type AccountingCompte,
  type AccountingDepot,
  type AccountingTransaction,
  type AccountingTransactionType,
} from '@/lib/accounting';

type ReportBundle = {
  reportDate: string;
  summaryDay: ReturnType<typeof computeComptabiliteSummary>;
  summaryUpToDay: ReturnType<typeof computeComptabiliteSummary>;
  comptes: AccountingCompte[];
  txDay: AccountingTransaction[];
  depotsDay: AccountingDepot[];
  materielsEtat?: Array<{
    categorie: string;
    nomAppareil?: string;
    imei?: string;
    nombre: number;
    couleur?: string;
    etat: string;
    description?: string;
  }>;
};

type Attachment = {
  filename: string;
  content: Buffer;
  contentType: string;
};

function safeText(value: unknown) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

async function makePdf(title: string, subtitle: string, lines: string[]): Promise<Buffer> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  let page = pdf.addPage([842, 595]);
  const { width, height } = page.getSize();
  let y = height - 40;

  const drawHeader = () => {
    page.drawText('NBBC - Resume comptable', { x: 28, y, size: 12, font: fontBold, color: rgb(0.11, 0.15, 0.25) });
    y -= 20;
    page.drawText(title, { x: 28, y, size: 17, font: fontBold, color: rgb(0.06, 0.17, 0.42) });
    y -= 18;
    page.drawText(subtitle, { x: 28, y, size: 10, font, color: rgb(0.33, 0.38, 0.45) });
    y -= 24;
  };

  const ensureSpace = (need = 14) => {
    if (y < 26 + need) {
      page = pdf.addPage([842, 595]);
      y = page.getSize().height - 36;
    }
  };

  drawHeader();

  for (const line of lines) {
    const text = safeText(line);
    if (!text) {
      ensureSpace();
      y -= 8;
      continue;
    }

    const chunks = text.match(/.{1,110}/g) || [''];
    for (const chunk of chunks) {
      ensureSpace();
      page.drawText(chunk, { x: 28, y, size: 10, font, color: rgb(0.15, 0.18, 0.24) });
      y -= 13;
    }
  }

  const bytes = await pdf.save();
  return Buffer.from(bytes);
}

function buildTransactionLines(type: AccountingTransactionType, bundle: ReportBundle): string[] {
  const list = bundle.txDay.filter((t) => t.type === type);
  const accountNameById = new Map(bundle.summaryUpToDay.comptes.map((c) => [String(c._id), c.nom]));

  const lines: string[] = [];
  lines.push(`Nombre: ${list.length}`);
  lines.push('');

  if (list.length === 0) {
    lines.push('Aucune transaction pour cette section.');
    return lines;
  }

  for (const tx of list) {
    const debitName = accountNameById.get(getAccountId(tx.accountDebitId)) || '-';
    const creditName = accountNameById.get(getAccountId(tx.accountCreditId)) || '-';
    lines.push(`${String(tx.date).slice(0, 10)} | ${safeText(tx.description)} | Qte ${formatNumber(Number(tx.quantite || 0))} | PU ${formatNumber(Number(tx.prixUnitaire || 0))} ${tx.txCurrency || 'FCFA'} | Total ${formatCurrencyFCFA(Number(tx.amountFCFA || 0))}`);
    lines.push(`   Debit: ${safeText(debitName)} | Credit: ${safeText(creditName)} | Tiers: ${safeText(tx.tiers || '-')}`);
  }

  const total = list.reduce((sum, tx) => sum + Number(tx.amountFCFA || 0), 0);
  lines.push('');
  lines.push(`Total section: ${formatCurrencyFCFA(total)}`);
  return lines;
}

function buildDepotLines(bundle: ReportBundle): string[] {
  const list = bundle.depotsDay;
  const accountNameById = new Map(bundle.summaryUpToDay.comptes.map((c) => [String(c._id), c.nom]));

  const lines: string[] = [];
  lines.push(`Nombre: ${list.length}`);
  lines.push('');

  if (list.length === 0) {
    lines.push('Aucune operation depot/retrait pour cette journee.');
    return lines;
  }

  for (const item of list) {
    const debitName = accountNameById.get(getAccountId(item.compteDebitId || item.compteId)) || '-';
    const creditName = accountNameById.get(getAccountId(item.compteCreditId)) || '-';
    lines.push(`${String(item.date).slice(0, 10)} | ${item.type} | Operateur ${safeText(item.operateur)} | Montant ${formatCurrencyFCFA(Number(item.montant || 0))}`);
    lines.push(`   Debit: ${safeText(debitName)} | Credit: ${safeText(creditName)} | Description: ${safeText(item.description || '-')}`);
  }

  const total = list.reduce((sum, item) => sum + Number(item.montant || 0), 0);
  lines.push('');
  lines.push(`Total depot/retrait du jour: ${formatCurrencyFCFA(total)}`);
  return lines;
}

function buildComptesLines(bundle: ReportBundle): string[] {
  const lines: string[] = [];
  const comptes = [...bundle.summaryUpToDay.comptes].sort((a, b) => String(a.nom).localeCompare(String(b.nom)));

  lines.push(`Etat des comptes a la fin du ${bundle.reportDate}`);
  lines.push('');

  for (const c of comptes) {
    lines.push(`${safeText(c.nom)} | Devise ${safeText(c.devise || 'FCFA')} | Taux ${formatNumber(Number(c.tauxFCFA || 1))} | Solde ${formatCurrencyFCFA(Number((c as any).soldeCalculeFCFA || 0))}`);
  }

  lines.push('');
  lines.push(`Total comptes: ${formatCurrencyFCFA(bundle.summaryUpToDay.totals.totalComptes)}`);
  lines.push(`Benefice estime: ${formatCurrencyFCFA(bundle.summaryUpToDay.totals.benefice)}`);
  lines.push(`Total disponible: ${formatCurrencyFCFA(bundle.summaryUpToDay.totals.totalDisponible)}`);
  return lines;
}

function buildEtatLines(bundle: ReportBundle): string[] {
  const day = bundle.summaryDay.totals;
  const upto = bundle.summaryUpToDay.totals;
  return [
    `Resume du jour ${bundle.reportDate}`,
    '',
    `Achats du jour: ${formatCurrencyFCFA(day.achats)}`,
    `Ventes du jour: ${formatCurrencyFCFA(day.ventes)}`,
    `Depenses du jour: ${formatCurrencyFCFA(day.depenses)}`,
    `Dettes du jour: ${formatCurrencyFCFA(day.dettes)}`,
    `Depots du jour: ${formatCurrencyFCFA(day.depots)}`,
    `Retraits du jour: ${formatCurrencyFCFA(day.retraits)}`,
    '',
    `Etat cumule a fin de journee`,
    `Total comptes: ${formatCurrencyFCFA(upto.totalComptes)}`,
    `Benefice estime: ${formatCurrencyFCFA(upto.benefice)}`,
    `Total disponible: ${formatCurrencyFCFA(upto.totalDisponible)}`,
  ];
}

function buildMaterielLines(bundle: ReportBundle): string[] {
  const items = bundle.materielsEtat || [];
  const lines: string[] = [];
  lines.push(`Etat du materiel au ${bundle.reportDate}`);
  lines.push(`Nombre d'enregistrements: ${items.length}`);
  lines.push('');

  if (items.length === 0) {
    lines.push('Aucun materiel actif pour cette date.');
    return lines;
  }

  for (const item of items) {
    lines.push(`${safeText(item.categorie)} | Nombre ${formatNumber(Number(item.nombre || 0), 0)} | Etat ${safeText(item.etat)}`);
    lines.push(`   Appareil: ${safeText(item.nomAppareil || '-')} | IMEI: ${safeText(item.imei || '-')} | Couleur: ${safeText(item.couleur || '-')}`);
    lines.push(`   Description: ${safeText(item.description || '-')}`);
  }

  return lines;
}

export async function buildDailyComptaPdfBundle(input: {
  reportDate: string;
  comptes: AccountingCompte[];
  transactionsDay: AccountingTransaction[];
  transactionsUpToDay: AccountingTransaction[];
  depotsDay: AccountingDepot[];
  depotsUpToDay: AccountingDepot[];
  materielsEtat?: Array<{
    categorie: string;
    nomAppareil?: string;
    imei?: string;
    nombre: number;
    couleur?: string;
    etat: string;
    description?: string;
  }>;
}): Promise<{ attachments: Attachment[]; summaryDay: ReportBundle['summaryDay']; summaryUpToDay: ReportBundle['summaryUpToDay'] }> {
  const { reportDate, comptes, transactionsDay, transactionsUpToDay, depotsDay, depotsUpToDay, materielsEtat = [] } = input;
  const summaryDay = computeComptabiliteSummary(comptes, transactionsDay, depotsDay, reportDate);
  const summaryUpToDay = computeComptabiliteSummary(comptes, transactionsUpToDay, depotsUpToDay, reportDate);

  const bundle: ReportBundle = {
    reportDate,
    summaryDay,
    summaryUpToDay,
    comptes,
    txDay: summaryDay.transactions,
    depotsDay: summaryDay.depots,
    materielsEtat,
  };

  const dateSuffix = reportDate;
  const attachments: Attachment[] = [
    {
      filename: `etat_${dateSuffix}.pdf`,
      content: await makePdf('Etat journalier', `Date: ${reportDate}`, buildEtatLines(bundle)),
      contentType: 'application/pdf',
    },
    {
      filename: `achats_${dateSuffix}.pdf`,
      content: await makePdf('Achats du jour', `Date: ${reportDate}`, buildTransactionLines('ACHAT', bundle)),
      contentType: 'application/pdf',
    },
    {
      filename: `ventes_${dateSuffix}.pdf`,
      content: await makePdf('Ventes du jour', `Date: ${reportDate}`, buildTransactionLines('VENTE', bundle)),
      contentType: 'application/pdf',
    },
    {
      filename: `depenses_${dateSuffix}.pdf`,
      content: await makePdf('Depenses du jour', `Date: ${reportDate}`, buildTransactionLines('DEPENSE', bundle)),
      contentType: 'application/pdf',
    },
    {
      filename: `dettes_${dateSuffix}.pdf`,
      content: await makePdf('Dettes du jour', `Date: ${reportDate}`, buildTransactionLines('DETTE', bundle)),
      contentType: 'application/pdf',
    },
    {
      filename: `depots_retraits_${dateSuffix}.pdf`,
      content: await makePdf('Depots / Retraits du jour', `Date: ${reportDate}`, buildDepotLines(bundle)),
      contentType: 'application/pdf',
    },
    {
      filename: `gestion_comptes_${dateSuffix}.pdf`,
      content: await makePdf('Gestion de compte', `Etat de fin de journee ${reportDate}`, buildComptesLines(bundle)),
      contentType: 'application/pdf',
    },
    {
      filename: `etat_materiel_${dateSuffix}.pdf`,
      content: await makePdf('Etat du materiel', `Date: ${reportDate}`, buildMaterielLines(bundle)),
      contentType: 'application/pdf',
    },
  ];

  return { attachments, summaryDay, summaryUpToDay };
}
