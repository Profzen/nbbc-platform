export type AccountingTransactionType = 'ACHAT' | 'VENTE' | 'DEPENSE' | 'DETTE';

export type AccountingCompte = {
  _id: string;
  nom: string;
  type?: string;
  devise?: string;
  tauxFCFA?: number;
  solde?: number;
  soldeInitialUnites?: number;
  ordre?: number;
  description?: string;
  couleur?: string;
  actif?: boolean;
};

export type AccountingTransaction = {
  _id: string;
  type: AccountingTransactionType;
  date: string;
  description: string;
  quantite?: number;
  prixUnitaire?: number;
  montant: number;
  compte?: string;
  tiers?: string;
  txCurrency?: string;
  amountFCFA?: number;
  rateUsed?: number;
  accountDebitId?: string | { _id?: string; nom?: string } | null;
  accountCreditId?: string | { _id?: string; nom?: string } | null;
  notes?: string;
};

export type AccountingDepot = {
  _id: string;
  type: 'DEPOT' | 'RETRAIT' | 'GAIN' | 'EPARGNE_DEPOT' | 'EPARGNE_RETRAIT';
  date: string;
  montant: number;
  quantite?: number;
  montantUnitaire?: number;
  montantNet?: number;
  fraisPourcentage?: number;
  fraisMontant?: number;
  operateur: string;
  compteId?: string | { _id?: string; nom?: string } | null;
  compteDebitId?: string | { _id?: string; nom?: string } | null;
  compteCreditId?: string | { _id?: string; nom?: string } | null;
  compteFraisCreditId?: string | { _id?: string; nom?: string } | null;
  description?: string;
  notes?: string;
};

export function round2(value: number) {
  return Math.round(Number(value || 0) * 100) / 100;
}

export function formatCurrencyFCFA(value: number) {
  const amount = new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
  return `${amount} FCFA`;
}

export function formatNumber(value: number, maximumFractionDigits = 2) {
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 0,
    maximumFractionDigits,
  }).format(Number(value || 0));
}

export function normalizeCompte(compte: AccountingCompte) {
  const devise = compte.devise || 'FCFA';
  const tauxFCFA = Number(compte.tauxFCFA || (devise === 'FCFA' ? 1 : 590) || 1);
  const soldeInitialUnites = Number(
    typeof compte.soldeInitialUnites === 'number'
      ? compte.soldeInitialUnites
      : devise === 'FCFA'
        ? compte.solde || 0
        : 0
  );

  return {
    ...compte,
    devise,
    tauxFCFA,
    soldeInitialUnites,
  };
}

export function getAccountId(value: unknown) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value !== null && '_id' in (value as Record<string, unknown>)) {
    return String((value as { _id?: string })._id || '');
  }
  return '';
}

export function computeAmountFCFA(amount: number, currency: string | undefined, rateUsed?: number) {
  const normalizedAmount = Number(amount || 0);
  const normalizedCurrency = currency || 'FCFA';
  // Si la devise est FCFA ou si le taux est 1 (devise identique), ne pas appliquer de conversion
  if (normalizedCurrency === 'FCFA' || Number(rateUsed) === 1) return round2(normalizedAmount);
  return round2(normalizedAmount * Number(rateUsed || 1));
}

export function getPreferredRate(currency: string | undefined, date: string | undefined, comptes: AccountingCompte[], transactions: AccountingTransaction[]) {
  const normalizedCurrency = currency || 'FCFA';
  if (normalizedCurrency === 'FCFA') return 1;

  const sameDaySales = transactions.filter((tx) => {
    const txDate = String(tx.date || '').slice(0, 10);
    return tx.type === 'VENTE' && (tx.txCurrency || 'FCFA') === normalizedCurrency && txDate === String(date || '').slice(0, 10);
  });

  const totalAmountFcfa = sameDaySales.reduce((sum, tx) => sum + Number(tx.amountFCFA || 0), 0);
  const totalQuantity = sameDaySales.reduce((sum, tx) => sum + Number(tx.quantite || 0), 0);
  if (totalQuantity > 0 && totalAmountFcfa > 0) {
    return totalAmountFcfa / totalQuantity;
  }

  const matchingAccount = comptes.map(normalizeCompte).find((compte) => compte.devise === normalizedCurrency);
  if (matchingAccount) return Number(matchingAccount.tauxFCFA || 1);

  return normalizedCurrency === 'USD' ? 590 : 1;
}

export function enrichTransactions(transactions: AccountingTransaction[], comptes: AccountingCompte[]) {
  return transactions.map((tx) => {
    const amount = tx.quantite && tx.prixUnitaire ? Number(tx.quantite) * Number(tx.prixUnitaire) : Number(tx.montant || 0);
    // Trouver la devise du compte crédité si possible
    let creditAccountDevise = undefined;
    let creditAccountTaux = 1;
    if (tx.accountCreditId) {
      const creditAccount = comptes.find((c) => getAccountId(c._id) === getAccountId(tx.accountCreditId));
      if (creditAccount) {
        creditAccountDevise = creditAccount.devise;
        creditAccountTaux = Number(creditAccount.tauxFCFA || 1);
      }
    }
    // Si amountFCFA est déjà présent (persisté en base), on l'utilise tel quel
    let amountFCFA = typeof tx.amountFCFA === 'number' ? tx.amountFCFA : undefined;
    if (amountFCFA === undefined) {
      // Sinon, on recalcule (fallback)
      if (tx.txCurrency === 'FCFA') {
        amountFCFA = amount;
      } else {
        amountFCFA = amount * (creditAccountTaux || 1);
      }
      amountFCFA = round2(amountFCFA);
    }
    return {
      ...tx,
      montant: round2(amount),
      amountFCFA: round2(amountFCFA),
    };
  });
}

export function enrichDepots(depots: AccountingDepot[]) {
  return depots.map((depot) => {
    const quantite = Number(depot.quantite || 1);
    const montantUnitaire = Number(depot.montantUnitaire || depot.montant || 0);
    const montant = round2(Number(depot.montant || quantite * montantUnitaire));
    const fraisPourcentage = typeof depot.fraisPourcentage === 'number' ? round2(depot.fraisPourcentage) : undefined;
    const fraisMontant = typeof depot.fraisMontant === 'number'
      ? round2(depot.fraisMontant)
      : depot.type === 'EPARGNE_DEPOT' && fraisPourcentage !== undefined
        ? round2((montant * fraisPourcentage) / 100)
        : undefined;
    const montantNet = typeof depot.montantNet === 'number'
      ? round2(depot.montantNet)
      : depot.type === 'EPARGNE_DEPOT'
        ? round2(montant - Number(fraisMontant || 0))
        : montant;
    return {
      ...depot,
      quantite,
      montantUnitaire,
      montant,
      montantNet,
      fraisPourcentage,
      fraisMontant,
    };
  });
}

function getDepotEvents(depot: AccountingDepot) {
  const debitId = getAccountId(depot.compteDebitId || depot.compteId);
  const creditId = getAccountId(depot.compteCreditId);
  const feeCreditId = getAccountId(depot.compteFraisCreditId);
  const baseAmount = round2(Number(depot.montant || 0));
  const netAmount = round2(Number(depot.montantNet || baseAmount));
  const feeAmount = round2(Number(depot.fraisMontant || 0));

  if (depot.type === 'GAIN') {
    return [{ amountFCFA: baseAmount, debitId: '', creditId }];
  }

  if (depot.type === 'EPARGNE_DEPOT') {
    const events = [] as Array<{ amountFCFA: number; debitId: string; creditId: string }>;
    if (debitId) {
      events.push({ amountFCFA: baseAmount, debitId, creditId: '' });
    }
    if (creditId) {
      events.push({ amountFCFA: netAmount, debitId: '', creditId });
    }
    if (feeCreditId && feeAmount > 0) {
      events.push({ amountFCFA: feeAmount, debitId: '', creditId: feeCreditId });
    }
    return events;
  }

  if (depot.type === 'EPARGNE_RETRAIT') {
    return [{ amountFCFA: baseAmount, debitId, creditId }];
  }

  return [{ amountFCFA: baseAmount, debitId, creditId }];
}

export function computeAccountBalances(comptesRaw: AccountingCompte[], transactionsRaw: AccountingTransaction[], depotsRaw: AccountingDepot[]) {
  const comptes = comptesRaw.map(normalizeCompte);
  const accountMap = new Map(
    comptes.map((compte) => [
      compte._id,
      {
        ...compte,
        soldeInitialFCFA: round2(Number(compte.soldeInitialUnites || 0) * Number(compte.tauxFCFA || 1)),
        soldeCalculeFCFA: round2(Number(compte.soldeInitialUnites || 0) * Number(compte.tauxFCFA || 1)),
      },
    ])
  );

  const events = [
    ...transactionsRaw.map((tx) => ({
      id: tx._id,
      date: String(tx.date || '').slice(0, 10),
      amountFCFA: Number(tx.amountFCFA || 0),
      debitId: getAccountId(tx.accountDebitId),
      creditId: getAccountId(tx.accountCreditId),
    })),
    ...depotsRaw.flatMap((depot) => getDepotEvents(depot).map((event, index) => ({
      id: `${depot._id}:${index}`,
      date: String(depot.date || '').slice(0, 10),
      amountFCFA: round2(event.amountFCFA),
      debitId: event.debitId,
      creditId: event.creditId,
    }))),
  ].sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));

  for (const event of events) {
    if (event.debitId && accountMap.has(event.debitId)) {
      const compte = accountMap.get(event.debitId)!;
      compte.soldeCalculeFCFA = round2(compte.soldeCalculeFCFA - event.amountFCFA);
    }
    if (event.creditId && accountMap.has(event.creditId)) {
      const compte = accountMap.get(event.creditId)!;
      compte.soldeCalculeFCFA = round2(compte.soldeCalculeFCFA + event.amountFCFA);
    }
  }

  return comptes.map((compte) => {
    const current = accountMap.get(compte._id)!;
    return {
      ...current,
      equivalentUnits: Number(current.tauxFCFA || 1) > 0 ? round2(current.soldeCalculeFCFA / Number(current.tauxFCFA || 1)) : 0,
    };
  });
}

export function computeComptabiliteSummary(comptesRaw: AccountingCompte[], transactionsRaw: AccountingTransaction[], depotsRaw: AccountingDepot[], referenceDate?: string | Date) {
  const transactions = enrichTransactions(transactionsRaw, comptesRaw);
  const depots = enrichDepots(depotsRaw);
  const comptes = computeAccountBalances(comptesRaw, transactions, depots);

  const achats = transactions.filter((tx) => tx.type === 'ACHAT');
  const ventes = transactions.filter((tx) => tx.type === 'VENTE');
  const depenses = transactions.filter((tx) => tx.type === 'DEPENSE');
  const dettes = transactions.filter((tx) => tx.type === 'DETTE');

  const totalAchats = achats.reduce((sum, tx) => sum + Number(tx.amountFCFA || 0), 0);
  const totalVentes = ventes.reduce((sum, tx) => sum + Number(tx.amountFCFA || 0), 0);
  const totalDepenses = depenses.reduce((sum, tx) => sum + Number(tx.amountFCFA || 0), 0);
  const totalDettes = dettes.reduce((sum, tx) => sum + Number(tx.amountFCFA || 0), 0);
  const totalDepots = depots.filter((item) => item.type === 'DEPOT').reduce((sum, item) => sum + Number(item.montant || 0), 0);
  const totalRetraits = depots.filter((item) => item.type === 'RETRAIT').reduce((sum, item) => sum + Number(item.montant || 0), 0);
  const totalGains = depots.filter((item) => item.type === 'GAIN').reduce((sum, item) => sum + Number(item.montant || 0), 0);
  const totalEpargneDepots = depots.filter((item) => item.type === 'EPARGNE_DEPOT').reduce((sum, item) => sum + Number(item.montantNet || 0), 0);
  const totalEpargneRetraits = depots.filter((item) => item.type === 'EPARGNE_RETRAIT').reduce((sum, item) => sum + Number(item.montant || 0), 0);
  const totalEpargne = round2(comptes.find((compte) => String(compte.nom || '').trim().toLowerCase() === 'epargne')?.soldeCalculeFCFA || 0);
  const totalFraisEpargne = depots.filter((item) => item.type === 'EPARGNE_DEPOT').reduce((sum, item) => sum + Number(item.fraisMontant || 0), 0);

  const totalQtyAchats = achats.reduce((sum, tx) => sum + Number(tx.quantite || 0), 0);
  const totalQtyVentes = ventes.reduce((sum, tx) => sum + Number(tx.quantite || 0), 0);
  const avgUnitAchat = totalQtyAchats > 0 ? totalAchats / totalQtyAchats : 0;
  const avgUnitVente = totalQtyVentes > 0 ? totalVentes / totalQtyVentes : 0;
  const benefice = Math.round(((avgUnitVente - avgUnitAchat) * totalQtyVentes) * 100) / 100;

  const refDateStr = referenceDate
    ? (typeof referenceDate === 'string' ? referenceDate : new Date(referenceDate).toISOString()).slice(0, 10)
    : new Date().toISOString().slice(0, 10);

  const dayDepenseTxs = depenses.filter((tx) => String(tx.date || '').slice(0, 10) === refDateStr);
  const dayAchatTxs = achats.filter((tx) => String(tx.date || '').slice(0, 10) === refDateStr);
  const dayVenteTxs = ventes.filter((tx) => String(tx.date || '').slice(0, 10) === refDateStr);

  const totalDayDepenses = round2(dayDepenseTxs.reduce((sum, tx) => sum + Number(tx.amountFCFA || 0), 0));
  const dayQtyAchats = dayAchatTxs.reduce((sum, tx) => sum + Number(tx.quantite || 0), 0);
  const dayQtyVentes = dayVenteTxs.reduce((sum, tx) => sum + Number(tx.quantite || 0), 0);
  const dayTotalAchats = dayAchatTxs.reduce((sum, tx) => sum + Number(tx.amountFCFA || 0), 0);
  const dayTotalVentes = dayVenteTxs.reduce((sum, tx) => sum + Number(tx.amountFCFA || 0), 0);
  const dayAvgUnitAchat = dayQtyAchats > 0 ? dayTotalAchats / dayQtyAchats : 0;
  const dayAvgUnitVente = dayQtyVentes > 0 ? dayTotalVentes / dayQtyVentes : 0;
  const dayBenefice = round2((dayAvgUnitVente - dayAvgUnitAchat) * dayQtyVentes);

  const totalComptes = comptes
    .filter((compte) => String(compte.nom || '').trim().toLowerCase() !== 'dette')
    .reduce((sum, compte) => sum + Number(compte.soldeCalculeFCFA || 0), 0);
  const totalDisponible = round2(totalComptes - totalDettes + dayBenefice - totalDayDepenses);

  const monthlyMap = new Map<string, { month: string; ACHAT: number; VENTE: number; DEPENSE: number; DETTE: number }>();
  const now = referenceDate ? new Date(referenceDate) : new Date();
  for (let index = 5; index >= 0; index -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - index, 1);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    monthlyMap.set(key, { month: key.slice(5), ACHAT: 0, VENTE: 0, DEPENSE: 0, DETTE: 0 });
  }

  for (const tx of transactions) {
    const key = String(tx.date || '').slice(0, 7);
    if (monthlyMap.has(key)) {
      monthlyMap.get(key)![tx.type] += Number(tx.amountFCFA || 0);
    }
  }

  return {
    comptes,
    transactions,
    depots,
    totals: {
      achats: totalAchats,
      ventes: totalVentes,
      depenses: totalDepenses,
      dettes: totalDettes,
      depots: totalDepots,
      retraits: totalRetraits,
      gains: totalGains,
      epargneDepots: totalEpargneDepots,
      epargneRetraits: totalEpargneRetraits,
      totalEpargne,
      fraisEpargne: totalFraisEpargne,
      benefice,
      totalComptes,
      totalDisponible,
      dayBenefice,
      dayDepenses: totalDayDepenses,
      avgUnitAchat,
      avgUnitVente,
      totalQtyVentes,
    },
    monthly: Array.from(monthlyMap.values()),
  };
}
