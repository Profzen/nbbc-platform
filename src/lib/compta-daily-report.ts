import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
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

function sanitizePdfText(value: unknown) {
  return safeText(value)
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2022]/g, '-')
    .replace(/[\u00A0]/g, ' ')
    .replace(/[\u2212]/g, '-');
}

function formatPdfCurrency(value: number) {
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(Number(value || 0));
}

function formatPdfNumber(value: number, maximumFractionDigits = 2) {
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits }).format(Number(value || 0));
}

function createPdfReport(title: string, subtitle: string) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 56, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(255, 255, 255);
  doc.text(title, 28, 34);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(71, 85, 105);
  doc.text(`Genere le ${new Date().toLocaleString('fr-FR')} • ${sanitizePdfText(subtitle)}`, 28, 76);

  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(1);
  doc.line(24, 86, pageWidth - 24, 86);

  const appendPageNumbers = () => {
    const totalPages = doc.getNumberOfPages();
    for (let page = 1; page <= totalPages; page += 1) {
      doc.setPage(page);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text(`Page ${page}/${totalPages}`, pageWidth - 72, pageHeight - 18);
    }
  };

  return { doc, appendPageNumbers };
}

function filterEmptyColumns(head: string[], body: string[][]) {
  const nonEmpty = head.map((_, i) => body.some((row) => (row[i] || '').trim() !== ''));
  const filteredHead = head.filter((_, i) => nonEmpty[i]);
  const filteredBody = body.map((row) => row.filter((_, i) => nonEmpty[i]));
  return { head: filteredHead, body: filteredBody };
}

function isNumericHeader(headerText: string) {
  return /^(Qté|PU|Montant|Total|Taux|Solde|Equiv\.|Nombre)$/i.test(headerText.trim());
}

function applyRichTable(doc: jsPDF, head: string[], body: string[][], options?: { startY?: number }) {
  const tableWidth = doc.internal.pageSize.getWidth() - 48;
  const numericHeaders = new Set(head.filter((header) => isNumericHeader(header)));

  autoTable(doc, {
    startY: options?.startY ?? 92,
    margin: { left: 24, right: 24, bottom: 34 },
    tableWidth,
    head: [head],
    body,
    styles: {
      fontSize: 8,
      cellPadding: { top: 3, right: 2, bottom: 3, left: 2 },
      overflow: 'linebreak',
      valign: 'middle',
      halign: 'left',
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
    },
    headStyles: {
      fillColor: [30, 64, 175],
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'left',
      valign: 'middle',
      lineWidth: 0.6,
      lineColor: [30, 64, 175],
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    didParseCell: (data) => {
      if (data.section === 'head') {
        const headerText = Array.isArray(data.cell.text) ? data.cell.text.join(' ') : String(data.cell.text || '');
        if (numericHeaders.has(headerText) || isNumericHeader(headerText)) {
          data.cell.styles.halign = 'center';
        }
      }
      if (data.section === 'body') {
        const h = head[data.column.index];
        if (h && (numericHeaders.has(h) || isNumericHeader(h))) {
          data.cell.styles.halign = 'center';
        }
      }
    },
    tableLineWidth: 0.35,
    tableLineColor: [203, 213, 225],
    theme: 'grid',
  });

  return (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || 120;
}

function buildOverviewRows(bundle: ReportBundle) {
  const day = bundle.summaryDay.totals;
  const upto = bundle.summaryUpToDay.totals;
  return {
    head: ['Indicateur', 'Valeur'],
    body: [
      ['Achats du jour', formatPdfCurrency(day.achats)],
      ['Ventes du jour', formatPdfCurrency(day.ventes)],
      ['Depenses du jour', formatPdfCurrency(day.depenses)],
      ['Dettes du jour', formatPdfCurrency(day.dettes)],
      ['Depots du jour', formatPdfCurrency(day.depots)],
      ['Retraits du jour', formatPdfCurrency(day.retraits)],
      ['Gains du jour', formatPdfCurrency(day.gains)],
      ['Épargne cumulée', formatPdfCurrency(upto.totalEpargne)],
      ['Total comptes (hors Dette & Dépense)', formatPdfCurrency(upto.totalComptes)],
      ['Benefice estime', formatPdfCurrency(upto.benefice)],
      ['Total disponible', formatPdfCurrency(upto.totalDisponible)],
    ],
  };
}

function buildGainRows(bundle: ReportBundle) {
  const gains = bundle.summaryDay.depots.filter((item) => item.type === 'GAIN');
  const accountNameById = new Map(bundle.summaryUpToDay.comptes.map((c) => [String(c._id), c.nom]));
  const head = ['Date', 'Description', 'Débit', 'Crédit', 'Montant FCFA', 'Note'];

  const body = gains.map((item) => [
    sanitizePdfText(String(item.date).slice(0, 10)),
    sanitizePdfText(item.description || 'Gain'),
    sanitizePdfText(accountNameById.get(getAccountId(item.compteDebitId || item.compteId)) || '-'),
    sanitizePdfText(accountNameById.get(getAccountId(item.compteCreditId)) || '-'),
    formatPdfCurrency(Number(item.montant || 0)),
    sanitizePdfText(item.notes || '-'),
  ]);

  return filterEmptyColumns(head, body);
}

function buildEpargneRows(bundle: ReportBundle) {
  const epargne = bundle.summaryUpToDay.depots.filter((item) => item.type === 'EPARGNE_DEPOT' || item.type === 'EPARGNE_RETRAIT');
  const accountNameById = new Map(bundle.summaryUpToDay.comptes.map((c) => [String(c._id), c.nom]));
  const head = ['Date', 'Type', 'Débit', 'Épargne', 'Frais', 'Montant net', 'Description'];

  const body = epargne.map((item) => [
    sanitizePdfText(String(item.date).slice(0, 10)),
    sanitizePdfText(item.type),
    sanitizePdfText(accountNameById.get(getAccountId(item.compteDebitId || item.compteId)) || '-'),
    sanitizePdfText(accountNameById.get(getAccountId(item.compteCreditId)) || '-'),
    formatPdfCurrency(Number(item.fraisMontant || 0)),
    formatPdfCurrency(Number(item.type === 'EPARGNE_DEPOT' ? (item.montantNet || item.montant || 0) : (item.montant || 0))),
    sanitizePdfText(item.description || '-'),
  ]);

  return filterEmptyColumns(head, body);
}

function buildTransactionRows(type: AccountingTransactionType, bundle: ReportBundle) {
  const list = bundle.txDay.filter((t) => t.type === type);
  const accountNameById = new Map(bundle.summaryUpToDay.comptes.map((c) => [String(c._id), c.nom]));

  const head = [
    'Date',
    type === 'ACHAT' || type === 'VENTE' ? 'Article' : 'Description',
    'Qté',
    'PU (FCFA)',
    'Tiers',
    'Débit',
    'Crédit',
    'Total FCFA',
  ];

  const body = list.map((tx) => {
    const debitName = accountNameById.get(getAccountId(tx.accountDebitId)) || '-';
    const creditName = accountNameById.get(getAccountId(tx.accountCreditId)) || '-';
    return [
      sanitizePdfText(String(tx.date).slice(0, 10)),
      sanitizePdfText(tx.description),
      formatPdfNumber(Number(tx.quantite || 0)),
      formatPdfNumber(Number(tx.prixUnitaire || 0)),
      sanitizePdfText(tx.tiers || '-'),
      sanitizePdfText(debitName),
      sanitizePdfText(creditName),
      formatPdfCurrency(Number(tx.amountFCFA || 0)),
    ];
  });

  return filterEmptyColumns(head, body);
}

function buildDepotRows(bundle: ReportBundle) {
  const accountNameById = new Map(bundle.summaryUpToDay.comptes.map((c) => [String(c._id), c.nom]));
  const head = ['Date', 'Type', 'Qté', 'Montant unitaire (FCFA)', 'Débit', 'Crédit', 'Total FCFA'];

  const body = bundle.depotsDay.map((item) => {
    const debitName = accountNameById.get(getAccountId(item.compteDebitId || item.compteId)) || '-';
    const creditName = accountNameById.get(getAccountId(item.compteCreditId)) || '-';
    return [
      sanitizePdfText(String(item.date).slice(0, 10)),
      sanitizePdfText(item.type),
      formatPdfNumber(Number(item.quantite || 1), 0),
      formatPdfNumber(Number(item.montantUnitaire || 0)),
      sanitizePdfText(debitName),
      sanitizePdfText(creditName),
      formatPdfCurrency(Number(item.montant || 0)),
    ];
  });

  return filterEmptyColumns(head, body);
}

function buildCompteRows(bundle: ReportBundle) {
  const comptes = [...bundle.summaryUpToDay.comptes].sort((a, b) => String(a.nom).localeCompare(String(b.nom)));
  const head = ['Libellé', 'Devise', 'Taux (1 -> FCFA)', 'Equiv. unités', 'Solde FCFA'];
  const body = comptes.map((c) => [
    sanitizePdfText(c.nom),
    sanitizePdfText(c.devise || 'FCFA'),
    formatPdfNumber(Number(c.tauxFCFA || 1)),
    formatPdfNumber(Number((c as any).equivalentUnits || 0)),
    formatPdfCurrency(Number((c as any).soldeCalculeFCFA || 0)),
  ]);
  return filterEmptyColumns(head, body);
}

function buildMaterielRows(bundle: ReportBundle) {
  const head = ['Catégorie', 'Nom appareil', 'IMEI', 'Nombre', 'Couleur', 'État', 'Description'];
  const body = (bundle.materielsEtat || []).map((item) => [
    sanitizePdfText(item.categorie),
    sanitizePdfText(item.nomAppareil || '-'),
    sanitizePdfText(item.imei || '-'),
    formatPdfNumber(Number(item.nombre || 0), 0),
    sanitizePdfText(item.couleur || '-'),
    sanitizePdfText(item.etat),
    sanitizePdfText(item.description || '-'),
  ]);
  return filterEmptyColumns(head, body);
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
}): Promise<{ attachments: Attachment[]; summaryDay: ReturnType<typeof computeComptabiliteSummary>; summaryUpToDay: ReturnType<typeof computeComptabiliteSummary> }> {
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

  const attachments: Attachment[] = [];

  {
    const { doc, appendPageNumbers } = createPdfReport('Etat journalier', `Date: ${reportDate}`);
    const { head, body } = buildOverviewRows(bundle);
    applyRichTable(doc, head, body, { startY: 96 });
    appendPageNumbers();
    attachments.push({ filename: `etat_${reportDate}.pdf`, content: Buffer.from(doc.output('arraybuffer')), contentType: 'application/pdf' });
  }

  for (const type of ['ACHAT', 'VENTE', 'DEPENSE', 'DETTE'] as AccountingTransactionType[]) {
    const label = type === 'ACHAT' ? 'Achats' : type === 'VENTE' ? 'Ventes' : type === 'DEPENSE' ? 'Depenses' : 'Dettes';
    const { doc, appendPageNumbers } = createPdfReport(`Rapport ${label}`, `${reportDate} • ${bundle.txDay.filter((t) => t.type === type).length} ligne(s)`);
    const { head, body } = buildTransactionRows(type, bundle);
    applyRichTable(doc, head, body, { startY: 96 });
    appendPageNumbers();
    attachments.push({ filename: `${type.toLowerCase()}s_${reportDate}.pdf`, content: Buffer.from(doc.output('arraybuffer')), contentType: 'application/pdf' });
  }

  {
    const dayGainDepots = bundle.summaryDay.depots.filter((item) => item.type === 'GAIN');
    const { doc, appendPageNumbers } = createPdfReport('Rapport Gains du jour', `${bundle.reportDate} • ${dayGainDepots.length} gain(s) du jour`);
    const { head, body } = buildGainRows(bundle);
    const finalY = applyRichTable(doc, head, body, { startY: 96 });
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text(`Total gains du jour: ${formatPdfCurrency(dayGainDepots.reduce((sum, item) => sum + Number(item.montant || 0), 0))}`, 28, finalY + 22);
    appendPageNumbers();
    attachments.push({ filename: `gains_${bundle.reportDate}.pdf`, content: Buffer.from(doc.output('arraybuffer')), contentType: 'application/pdf' });
  }

  {
    const epargneCount = bundle.summaryUpToDay.depots.filter((item) => item.type === 'EPARGNE_DEPOT' || item.type === 'EPARGNE_RETRAIT').length;
    const { doc, appendPageNumbers } = createPdfReport('Rapport Épargne cumulée', `${bundle.reportDate} • ${epargneCount} opération(s) cumulée(s)`);
    const { head, body } = buildEpargneRows(bundle);
    const finalY = applyRichTable(doc, head, body, { startY: 96 });
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text(`Épargne cumulée nette: ${formatPdfCurrency(bundle.summaryUpToDay.totals.totalEpargne)}`, 28, finalY + 22);
    doc.text(`Frais cumulés: ${formatPdfCurrency(bundle.summaryUpToDay.totals.fraisEpargne)}`, 28, finalY + 40);
    appendPageNumbers();
    attachments.push({ filename: `epargne_cumulee_${bundle.reportDate}.pdf`, content: Buffer.from(doc.output('arraybuffer')), contentType: 'application/pdf' });
  }

  {
    const { doc, appendPageNumbers } = createPdfReport('Rapport Depots / Retraits', `${reportDate} • ${bundle.depotsDay.length} operation(s)`);
    const { head, body } = buildDepotRows(bundle);
    applyRichTable(doc, head, body, { startY: 96 });
    appendPageNumbers();
    attachments.push({ filename: `depots_retraits_${reportDate}.pdf`, content: Buffer.from(doc.output('arraybuffer')), contentType: 'application/pdf' });
  }

  {
    const { doc, appendPageNumbers } = createPdfReport('Rapport Comptes', `${bundle.summaryUpToDay.comptes.length} compte(s)`);
    const { head, body } = buildCompteRows(bundle);
    applyRichTable(doc, head, body, { startY: 96 });
    appendPageNumbers();
    attachments.push({ filename: `gestion_comptes_${reportDate}.pdf`, content: Buffer.from(doc.output('arraybuffer')), contentType: 'application/pdf' });
  }

  {
    const { doc, appendPageNumbers } = createPdfReport('Etat du materiel', `${reportDate} • ${materielsEtat.length} enregistrement(s)`);
    const { head, body } = buildMaterielRows(bundle);
    applyRichTable(doc, head, body, { startY: 96 });
    appendPageNumbers();
    attachments.push({ filename: `etat_materiel_${reportDate}.pdf`, content: Buffer.from(doc.output('arraybuffer')), contentType: 'application/pdf' });
  }

  return { attachments, summaryDay, summaryUpToDay };
}
