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
  type: 'DEPOT' | 'RETRAIT';
  date: string;
  montant: number;
  quantite?: number;
  montantUnitaire?: number;
  operateur: string;
  compteId?: string | { _id?: string; nom?: string } | null;
  compteDebitId?: string | { _id?: string; nom?: string } | null;
  compteCreditId?: string | { _id?: string; nom?: string } | null;
  description?: string;
  notes?: string;
};

export function formatCurrencyFCFA(value: number) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XAF',
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
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
  if (normalizedCurrency === 'FCFA' || Number(rateUsed) === 1) return normalizedAmount;
  return Math.round(normalizedAmount * Number(rateUsed || 1) * 100) / 100;
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
    // Nouvelle correction stricte :
    // - Si la devise de la transaction est FCFA, montant FCFA = quantité × prix unitaire
    // - Sinon, montant FCFA = quantité × prix unitaire × taux du compte crédité (si disponible, sinon 1)
    let amountFCFA = amount;
    if (tx.txCurrency === 'FCFA') {
      amountFCFA = amount;
    } else {
      amountFCFA = amount * (creditAccountTaux || 1);
    }
    amountFCFA = Math.round(amountFCFA * 100) / 100;
    return {
      ...tx,
      montant: amount,
      amountFCFA,
    };
  });
}

export function enrichDepots(depots: AccountingDepot[]) {
  return depots.map((depot) => {
    const quantite = Number(depot.quantite || 1);
    const montantUnitaire = Number(depot.montantUnitaire || depot.montant || 0);
    const montant = Number(depot.montant || quantite * montantUnitaire);
    return {
      ...depot,
      quantite,
      montantUnitaire,
      montant,
    };
  });
}

export function computeAccountBalances(comptesRaw: AccountingCompte[], transactionsRaw: AccountingTransaction[], depotsRaw: AccountingDepot[]) {
  const comptes = comptesRaw.map(normalizeCompte);
  const accountMap = new Map(
    comptes.map((compte) => [
      compte._id,
      {
        ...compte,
        soldeInitialFCFA: Math.round(Number(compte.soldeInitialUnites || 0) * Number(compte.tauxFCFA || 1) * 100) / 100,
        soldeCalculeFCFA: Math.round(Number(compte.soldeInitialUnites || 0) * Number(compte.tauxFCFA || 1) * 100) / 100,
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
    ...depotsRaw.map((depot) => ({
      id: depot._id,
      date: String(depot.date || '').slice(0, 10),
      amountFCFA: Number(depot.montant || 0),
      debitId: getAccountId(depot.compteDebitId || depot.compteId),
      creditId: getAccountId(depot.compteCreditId),
    })),
  ].sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));

  for (const event of events) {
    if (event.debitId && accountMap.has(event.debitId)) {
      const compte = accountMap.get(event.debitId)!;
      compte.soldeCalculeFCFA = Math.round((compte.soldeCalculeFCFA - event.amountFCFA) * 100) / 100;
    }
    if (event.creditId && accountMap.has(event.creditId)) {
      const compte = accountMap.get(event.creditId)!;
      compte.soldeCalculeFCFA = Math.round((compte.soldeCalculeFCFA + event.amountFCFA) * 100) / 100;
    }
  }

  return comptes.map((compte) => {
    const current = accountMap.get(compte._id)!;
    return {
      ...current,
      equivalentUnits: Number(current.tauxFCFA || 1) > 0 ? Math.round((current.soldeCalculeFCFA / Number(current.tauxFCFA || 1)) * 100) / 100 : 0,
    };
  });
}

export function computeComptabiliteSummary(comptesRaw: AccountingCompte[], transactionsRaw: AccountingTransaction[], depotsRaw: AccountingDepot[]) {
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

  const totalQtyAchats = achats.reduce((sum, tx) => sum + Number(tx.quantite || 0), 0);
  const totalQtyVentes = ventes.reduce((sum, tx) => sum + Number(tx.quantite || 0), 0);
  const avgUnitAchat = totalQtyAchats > 0 ? totalAchats / totalQtyAchats : 0;
  const avgUnitVente = totalQtyVentes > 0 ? totalVentes / totalQtyVentes : 0;
  const benefice = Math.round(((avgUnitVente - avgUnitAchat) * totalQtyVentes) * 100) / 100;

  const totalComptes = comptes.reduce((sum, compte) => sum + Number(compte.soldeCalculeFCFA || 0), 0);
  const totalDisponible = Math.round((totalComptes + benefice - totalDepenses - totalDettes) * 100) / 100;

  const monthlyMap = new Map<string, { month: string; ACHAT: number; VENTE: number; DEPENSE: number; DETTE: number }>();
  const now = new Date();
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
      benefice,
      totalComptes,
      totalDisponible,
      avgUnitAchat,
      avgUnitVente,
      totalQtyVentes,
    },
    monthly: Array.from(monthlyMap.values()),
  };
}
