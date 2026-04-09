"use client";

import { FormEvent, useCallback, useEffect, useState } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  ArrowDownCircle,
  ArrowLeftRight,
  ArrowUpCircle,
  BarChart3,
  CheckSquare,
  CreditCard,
  Edit3,
  FileDown,
  Landmark,
  Plus,
  Receipt,
  RefreshCw,
  Search,
  ShoppingCart,
  Trash2,
  TrendingUp,
  Wallet,
  X,
} from 'lucide-react';
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
import LoadingSpinner from '@/components/LoadingSpinner';

const DEFAULT_USD_RATE = 590;

type SectionId = 'dashboard' | 'achats' | 'ventes' | 'depenses' | 'dettes' | 'depots' | 'comptes';

type TxFormState = {
  editId: string;
  type: AccountingTransactionType;
  date: string;
  description: string;
  quantite: string;
  prixUnitaire: string;
  montant: string;
  txCurrency: string;
  accountDebitId: string;
  accountCreditId: string;
  tiers: string;
  notes: string;
};

type DepotFormState = {
  editId: string;
  type: 'DEPOT' | 'RETRAIT';
  date: string;
  quantite: string;
  montantUnitaire: string;
  compteDebitId: string;
  compteCreditId: string;
  operateur: string;
  description: string;
  notes: string;
};

type CompteFormState = {
  editId: string;
  nom: string;
  type: string;
  devise: string;
  tauxFCFA: string;
  soldeInitialUnites: string;
  description: string;
};

const EMPTY_TX_FORM: TxFormState = {
  editId: '',
  type: 'ACHAT',
  date: new Date().toISOString().slice(0, 10),
  description: '',
  quantite: '1',
  prixUnitaire: '0',
  montant: '0',
  txCurrency: 'USD',
  accountDebitId: '',
  accountCreditId: '',
  tiers: '',
  notes: '',
};

const EMPTY_DEPOT_FORM: DepotFormState = {
  editId: '',
  type: 'DEPOT',
  date: new Date().toISOString().slice(0, 10),
  quantite: '1',
  montantUnitaire: '0',
  compteDebitId: '',
  compteCreditId: '',
  operateur: 'Flooz',
  description: '',
  notes: '',
};

const EMPTY_COMPTE_FORM: CompteFormState = {
  editId: '',
  nom: '',
  type: 'Autre',
  devise: 'FCFA',
  tauxFCFA: '1',
  soldeInitialUnites: '0',
  description: '',
};

const SECTION_META: Record<SectionId, { label: string; icon: any }> = {
  dashboard: { label: 'Dashboard Central', icon: BarChart3 },
  achats: { label: 'Gestion Achats', icon: ShoppingCart },
  ventes: { label: 'Gestion Ventes', icon: TrendingUp },
  depenses: { label: 'Gestion Dépenses', icon: Receipt },
  dettes: { label: 'Gestion Dettes', icon: CreditCard },
  depots: { label: 'Gestion dépôt/retrait', icon: ArrowLeftRight },
  comptes: { label: 'Gestion de compte', icon: Landmark },
};

const TX_TYPE_CONFIG: Record<AccountingTransactionType, { label: string; partyLabel: string; defaultCurrency: string }> = {
  ACHAT: { label: 'Achat', partyLabel: 'Fournisseur', defaultCurrency: 'USD' },
  VENTE: { label: 'Vente', partyLabel: 'Client', defaultCurrency: 'USD' },
  DEPENSE: { label: 'Dépense', partyLabel: 'Bénéficiaire', defaultCurrency: 'FCFA' },
  DETTE: { label: 'Dette', partyLabel: 'Créancier', defaultCurrency: 'FCFA' },
};

const DEFAULT_ACCOUNTS = [
  { nom: 'Caisse (FCFA)', type: 'Espèces', devise: 'FCFA', tauxFCFA: 1, soldeInitialUnites: 0 },
  { nom: 'Flooz', type: 'Mobile Money', devise: 'FCFA', tauxFCFA: 1, soldeInitialUnites: 0 },
  { nom: 'Tmoney', type: 'Mobile Money', devise: 'FCFA', tauxFCFA: 1, soldeInitialUnites: 0 },
  { nom: 'Dollar Cash', type: 'Autre', devise: 'USD', tauxFCFA: DEFAULT_USD_RATE, soldeInitialUnites: 0 },
  { nom: 'Dollar DG', type: 'Autre', devise: 'USD', tauxFCFA: DEFAULT_USD_RATE, soldeInitialUnites: 0 },
  { nom: 'Dette', type: 'Autre', devise: 'FCFA', tauxFCFA: 1, soldeInitialUnites: 0 },
];

function normalizeDate(value?: string | Date) {
  if (!value) return '';
  return new Date(value).toISOString().slice(0, 10);
}

function sanitizePdfText(value: unknown) {
  return String(value ?? '')
    .replace(/\u202F|\u00A0/g, ' ')
    .replace(/\r/g, ' ')
    .replace(/\n/g, ' ');
}

function formatPdfCurrency(value: number) {
  return sanitizePdfText(formatCurrencyFCFA(value));
}

function buildExportDateLabel() {
  const now = new Date();
  return `${now.toLocaleDateString('fr-FR')} ${now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
}

function buildExportFileDate() {
  return new Date().toISOString().slice(0, 10);
}

function createPdfReport(title: string, subtitle?: string) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 58, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(sanitizePdfText(title), 36, 34);

  doc.setTextColor(71, 85, 105);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Genere le ${buildExportDateLabel()}${subtitle ? ` • ${sanitizePdfText(subtitle)}` : ''}`, 36, 76);

  return doc;
}

function appendPageNumbers(doc: jsPDF) {
  const totalPages = doc.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  for (let i = 1; i <= totalPages; i += 1) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(`NBBC Comptabilite • Page ${i}/${totalPages}`, pageWidth - 180, pageHeight - 16);
  }
}

export default function ComptabilitePage() {
  const [activeSection, setActiveSection] = useState<SectionId>('dashboard');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [search, setSearch] = useState('');

  const [transactions, setTransactions] = useState<AccountingTransaction[]>([]);
  const [depots, setDepots] = useState<AccountingDepot[]>([]);
  const [comptes, setComptes] = useState<AccountingCompte[]>([]);

  const [selectedTransactionIds, setSelectedTransactionIds] = useState<string[]>([]);
  const [selectedDepotIds, setSelectedDepotIds] = useState<string[]>([]);

  const [showTxModal, setShowTxModal] = useState(false);
  const [showDepotModal, setShowDepotModal] = useState(false);
  const [showCompteModal, setShowCompteModal] = useState(false);

  const [txForm, setTxForm] = useState<TxFormState>(EMPTY_TX_FORM);
  const [depotForm, setDepotForm] = useState<DepotFormState>(EMPTY_DEPOT_FORM);
  const [compteForm, setCompteForm] = useState<CompteFormState>(EMPTY_COMPTE_FORM);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [transactionsRes, depotsRes, comptesRes] = await Promise.all([
        fetch('/api/comptabilite/transactions', { cache: 'no-store' }),
        fetch('/api/comptabilite/depots', { cache: 'no-store' }),
        fetch('/api/comptabilite/comptes', { cache: 'no-store' }),
      ]);

      const [transactionsJson, depotsJson, comptesJson] = await Promise.all([
        transactionsRes.json(),
        depotsRes.json(),
        comptesRes.json(),
      ]);

      if (!transactionsRes.ok || !transactionsJson.success) {
        throw new Error(transactionsJson.error || 'Impossible de charger les transactions.');
      }
      if (!depotsRes.ok || !depotsJson.success) {
        throw new Error(depotsJson.error || 'Impossible de charger les dépôts/retraits.');
      }
      if (!comptesRes.ok || !comptesJson.success) {
        throw new Error(comptesJson.error || 'Impossible de charger les comptes.');
      }

      setTransactions(transactionsJson.data || []);
      setDepots(depotsJson.data || []);
      setComptes(comptesJson.data || []);
    } catch (err: any) {
      setError(err.message || 'Chargement impossible.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const summary = computeComptabiliteSummary(comptes, transactions, depots);
  const displayAccounts = [...summary.comptes].sort((a, b) => Number(a.ordre || 0) - Number(b.ordre || 0) || String(a.nom).localeCompare(String(b.nom)));

  const transactionSearch = search.trim().toLowerCase();
  const filteredTransactions = summary.transactions.filter((tx) => {
    const sectionType = activeSection === 'achats' ? 'ACHAT' : activeSection === 'ventes' ? 'VENTE' : activeSection === 'depenses' ? 'DEPENSE' : activeSection === 'dettes' ? 'DETTE' : null;
    if (!sectionType) return false;
    if (tx.type !== sectionType) return false;
    if (!transactionSearch) return true;
    return [tx.description, tx.tiers, tx.date, tx.notes]
      .some((value) => String(value || '').toLowerCase().includes(transactionSearch));
  });

  const filteredDepots = summary.depots.filter((item) => {
    if (!transactionSearch) return true;
    return [item.operateur, item.description, item.date, item.notes]
      .some((value) => String(value || '').toLowerCase().includes(transactionSearch));
  });

  const accountById = (id: string) => displayAccounts.find((account) => account._id === id);

  const clearFlash = () => {
    setError('');
    setMessage('');
  };

  const initializeDefaultAccounts = async () => {
    clearFlash();
    setSaving(true);
    try {
      for (let index = 0; index < DEFAULT_ACCOUNTS.length; index += 1) {
        const account = DEFAULT_ACCOUNTS[index];
        const res = await fetch('/api/comptabilite/comptes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...account, ordre: index }),
        });
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.error || 'Impossible de créer les comptes par défaut.');
        }
      }
      setMessage('Comptes par défaut créés.');
      await fetchAll();
    } catch (err: any) {
      setError(err.message || 'Impossible de créer les comptes par défaut.');
    } finally {
      setSaving(false);
    }
  };

  const openNewTransactionModal = (type: AccountingTransactionType) => {
    clearFlash();
    setTxForm({
      ...EMPTY_TX_FORM,
      type,
      txCurrency: TX_TYPE_CONFIG[type].defaultCurrency,
      montant: '0',
    });
    setShowTxModal(true);
  };

  const openEditTransactionModal = (tx: AccountingTransaction) => {
    clearFlash();
    setTxForm({
      editId: tx._id,
      type: tx.type,
      date: normalizeDate(tx.date),
      description: tx.description || '',
      quantite: String(tx.quantite || ''),
      prixUnitaire: String(tx.prixUnitaire || ''),
      montant: String(tx.montant || ''),
      txCurrency: tx.txCurrency || 'FCFA',
      accountDebitId: getAccountId(tx.accountDebitId),
      accountCreditId: getAccountId(tx.accountCreditId),
      tiers: tx.tiers || '',
      notes: tx.notes || '',
    });
    setShowTxModal(true);
  };

  const saveTransaction = async (event: FormEvent) => {
    event.preventDefault();
    clearFlash();
    setSaving(true);
    try {
      const payload = {
        type: txForm.type,
        date: txForm.date,
        description: txForm.description,
        quantite: txForm.quantite ? Number(txForm.quantite) : undefined,
        prixUnitaire: txForm.prixUnitaire ? Number(txForm.prixUnitaire) : undefined,
        montant: txForm.montant ? Number(txForm.montant) : undefined,
        txCurrency: txForm.txCurrency,
        accountDebitId: txForm.accountDebitId || undefined,
        accountCreditId: txForm.accountCreditId || undefined,
        tiers: txForm.tiers,
        notes: txForm.notes,
      };

      const url = txForm.editId ? `/api/comptabilite/transactions/${txForm.editId}` : '/api/comptabilite/transactions';
      const method = txForm.editId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Impossible d\'enregistrer la transaction.');
      }

      setMessage(txForm.editId ? 'Transaction mise à jour.' : 'Transaction créée.');
      setShowTxModal(false);
      setTxForm(EMPTY_TX_FORM);
      await fetchAll();
    } catch (err: any) {
      setError(err.message || 'Impossible d\'enregistrer la transaction.');
    } finally {
      setSaving(false);
    }
  };

  const deleteTransaction = async (id: string) => {
    clearFlash();
    if (!confirm('Supprimer cette transaction ?')) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/comptabilite/transactions/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Suppression impossible.');
      }
      setMessage('Transaction supprimée.');
      setSelectedTransactionIds((prev) => prev.filter((item) => item !== id));
      await fetchAll();
    } catch (err: any) {
      setError(err.message || 'Suppression impossible.');
    } finally {
      setSaving(false);
    }
  };

  const deleteSelectedTransactions = async () => {
    if (selectedTransactionIds.length === 0) return;
    if (!confirm(`Supprimer ${selectedTransactionIds.length} transaction(s) sélectionnée(s) ?`)) return;
    clearFlash();
    setSaving(true);
    try {
      for (const id of selectedTransactionIds) {
        const res = await fetch(`/api/comptabilite/transactions/${id}`, { method: 'DELETE' });
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.error || 'Suppression groupée impossible.');
        }
      }
      setSelectedTransactionIds([]);
      setMessage('Transactions supprimées.');
      await fetchAll();
    } catch (err: any) {
      setError(err.message || 'Suppression groupée impossible.');
    } finally {
      setSaving(false);
    }
  };

  const openNewDepotModal = () => {
    clearFlash();
    setDepotForm(EMPTY_DEPOT_FORM);
    setShowDepotModal(true);
  };

  const openEditDepotModal = (depot: AccountingDepot) => {
    clearFlash();
    setDepotForm({
      editId: depot._id,
      type: depot.type,
      date: normalizeDate(depot.date),
      quantite: String(depot.quantite || 1),
      montantUnitaire: String(depot.montantUnitaire || depot.montant || 0),
      compteDebitId: getAccountId(depot.compteDebitId || depot.compteId),
      compteCreditId: getAccountId(depot.compteCreditId),
      operateur: depot.operateur || '',
      description: depot.description || '',
      notes: depot.notes || '',
    });
    setShowDepotModal(true);
  };

  const saveDepot = async (event: FormEvent) => {
    event.preventDefault();
    clearFlash();
    setSaving(true);
    try {
      const payload = {
        type: depotForm.type,
        date: depotForm.date,
        quantite: Number(depotForm.quantite || 1),
        montantUnitaire: Number(depotForm.montantUnitaire || 0),
        compteDebitId: depotForm.compteDebitId || undefined,
        compteCreditId: depotForm.compteCreditId || undefined,
        operateur: depotForm.operateur,
        description: depotForm.description,
        notes: depotForm.notes,
      };

      const url = depotForm.editId ? `/api/comptabilite/depots/${depotForm.editId}` : '/api/comptabilite/depots';
      const method = depotForm.editId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Impossible d\'enregistrer le dépôt/retrait.');
      }

      setMessage(depotForm.editId ? 'Opération mise à jour.' : 'Opération créée.');
      setShowDepotModal(false);
      setDepotForm(EMPTY_DEPOT_FORM);
      await fetchAll();
    } catch (err: any) {
      setError(err.message || 'Impossible d\'enregistrer le dépôt/retrait.');
    } finally {
      setSaving(false);
    }
  };

  const deleteDepot = async (id: string) => {
    clearFlash();
    if (!confirm('Supprimer cette opération ?')) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/comptabilite/depots/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Suppression impossible.');
      }
      setMessage('Opération supprimée.');
      setSelectedDepotIds((prev) => prev.filter((item) => item !== id));
      await fetchAll();
    } catch (err: any) {
      setError(err.message || 'Suppression impossible.');
    } finally {
      setSaving(false);
    }
  };

  const deleteSelectedDepots = async () => {
    if (selectedDepotIds.length === 0) return;
    if (!confirm(`Supprimer ${selectedDepotIds.length} opération(s) sélectionnée(s) ?`)) return;
    clearFlash();
    setSaving(true);
    try {
      for (const id of selectedDepotIds) {
        const res = await fetch(`/api/comptabilite/depots/${id}`, { method: 'DELETE' });
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.error || 'Suppression groupée impossible.');
        }
      }
      setSelectedDepotIds([]);
      setMessage('Opérations supprimées.');
      await fetchAll();
    } catch (err: any) {
      setError(err.message || 'Suppression groupée impossible.');
    } finally {
      setSaving(false);
    }
  };

  const openNewCompteModal = () => {
    clearFlash();
    setCompteForm(EMPTY_COMPTE_FORM);
    setShowCompteModal(true);
  };

  const openEditCompteModal = (compte: any) => {
    clearFlash();
    setCompteForm({
      editId: compte._id,
      nom: compte.nom || '',
      type: compte.type || 'Autre',
      devise: compte.devise || 'FCFA',
      tauxFCFA: String(compte.tauxFCFA || 1),
      soldeInitialUnites: String(compte.soldeInitialUnites ?? (compte.devise === 'FCFA' ? compte.solde || 0 : 0)),
      description: compte.description || '',
    });
    setShowCompteModal(true);
  };

  const saveCompte = async (event: FormEvent) => {
    event.preventDefault();
    clearFlash();
    setSaving(true);
    try {
      const payload = {
        nom: compteForm.nom,
        type: compteForm.type,
        devise: compteForm.devise,
        tauxFCFA: Number(compteForm.tauxFCFA || 1),
        soldeInitialUnites: Number(compteForm.soldeInitialUnites || 0),
        description: compteForm.description,
      };
      const url = compteForm.editId ? `/api/comptabilite/comptes/${compteForm.editId}` : '/api/comptabilite/comptes';
      const method = compteForm.editId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Impossible d\'enregistrer le compte.');
      }
      setMessage(compteForm.editId ? 'Compte mis à jour.' : 'Compte créé.');
      setShowCompteModal(false);
      setCompteForm(EMPTY_COMPTE_FORM);
      await fetchAll();
    } catch (err: any) {
      setError(err.message || 'Impossible d\'enregistrer le compte.');
    } finally {
      setSaving(false);
    }
  };

  const deleteCompte = async (id: string) => {
    clearFlash();
    if (!confirm('Supprimer ce libellé ?')) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/comptabilite/comptes/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Suppression impossible.');
      }
      setMessage('Compte supprimé.');
      await fetchAll();
    } catch (err: any) {
      setError(err.message || 'Suppression impossible.');
    } finally {
      setSaving(false);
    }
  };

  const resetOneCompte = async (compte: any) => {
    clearFlash();
    if (!confirm(`Réinitialiser le libellé ${compte.nom} à 0 ?`)) return;
    setSaving(true);
    try {
      const taux = Number(compte.tauxFCFA || 1);
      const resetUnits = taux > 0 ? -Number(compte.soldeCalculeFCFA || 0) / taux : 0;
      const res = await fetch(`/api/comptabilite/comptes/${compte._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nom: compte.nom,
          type: compte.type,
          devise: compte.devise,
          tauxFCFA: compte.tauxFCFA,
          soldeInitialUnites: Math.round(resetUnits * 100) / 100,
          description: compte.description,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Réinitialisation impossible.');
      }
      setMessage(`Solde de ${compte.nom} remis à 0.`);
      await fetchAll();
    } catch (err: any) {
      setError(err.message || 'Réinitialisation impossible.');
    } finally {
      setSaving(false);
    }
  };

  const resetAllComptes = async () => {
    clearFlash();
    if (!confirm('Réinitialiser tous les comptes à 0 ?')) return;
    setSaving(true);
    try {
      for (const compte of displayAccounts) {
        const taux = Number(compte.tauxFCFA || 1);
        const resetUnits = taux > 0 ? -Number(compte.soldeCalculeFCFA || 0) / taux : 0;
        const res = await fetch(`/api/comptabilite/comptes/${compte._id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nom: compte.nom,
            type: compte.type,
            devise: compte.devise,
            tauxFCFA: compte.tauxFCFA,
            soldeInitialUnites: Math.round(resetUnits * 100) / 100,
            description: compte.description,
            ordre: compte.ordre,
          }),
        });
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.error || 'Réinitialisation impossible.');
        }
      }
      setMessage('Tous les comptes ont été remis à 0.');
      await fetchAll();
    } catch (err: any) {
      setError(err.message || 'Réinitialisation impossible.');
    } finally {
      setSaving(false);
    }
  };

  const exportTransactionsPdf = (type: AccountingTransactionType) => {
    const list = summary.transactions.filter((item) => item.type === type);
    const doc = createPdfReport(`Rapport ${TX_TYPE_CONFIG[type].label}s`, `${list.length} ligne(s)`);

    autoTable(doc, {
      startY: 92,
      margin: { left: 24, right: 24, bottom: 34 },
      head: [[
        'Date',
        type === 'ACHAT' || type === 'VENTE' ? 'Article' : 'Description',
        'Qté',
        'PU',
        TX_TYPE_CONFIG[type].partyLabel,
        'Débit',
        'Crédit',
        'Total FCFA',
      ]],
      body: list.map((item) => {
        const debit = accountById(getAccountId(item.accountDebitId));
        const credit = accountById(getAccountId(item.accountCreditId));
        return [
          sanitizePdfText(normalizeDate(item.date)),
          sanitizePdfText(item.description),
          sanitizePdfText(item.quantite || ''),
          sanitizePdfText(`${formatNumber(item.prixUnitaire || 0)} ${item.txCurrency || 'FCFA'}`),
          sanitizePdfText(item.tiers || ''),
          sanitizePdfText(debit?.nom || ''),
          sanitizePdfText(credit?.nom || ''),
          formatPdfCurrency(item.amountFCFA || 0),
        ];
      }),
      styles: {
        fontSize: 9,
        cellPadding: 5,
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
        halign: 'left',
        valign: 'middle',
      },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: {
        0: { cellWidth: 66 },
        1: { cellWidth: 170 },
        2: { halign: 'right', cellWidth: 42 },
        3: { halign: 'right', cellWidth: 74 },
        4: { cellWidth: 96 },
        5: { cellWidth: 110 },
        6: { cellWidth: 110 },
        7: { halign: 'right', cellWidth: 86 },
      },
      theme: 'striped',
    });
    const finalY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || 120;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text(`Total: ${formatPdfCurrency(list.reduce((sum, item) => sum + Number(item.amountFCFA || 0), 0))}`, 24, finalY + 22);
    appendPageNumbers(doc);
    doc.save(`${type.toLowerCase()}_${buildExportFileDate()}.pdf`);
  };

  const exportDepotsPdf = () => {
    const doc = createPdfReport('Rapport Depots / Retraits', `${summary.depots.length} operation(s)`);

    autoTable(doc, {
      startY: 92,
      margin: { left: 24, right: 24, bottom: 34 },
      head: [['Date', 'Type', 'Qté', 'Montant unitaire', 'Débit', 'Crédit', 'Opérateur', 'Total FCFA']],
      body: summary.depots.map((item) => {
        const debit = accountById(getAccountId(item.compteDebitId || item.compteId));
        const credit = accountById(getAccountId(item.compteCreditId));
        return [
          sanitizePdfText(normalizeDate(item.date)),
          sanitizePdfText(item.type),
          sanitizePdfText(item.quantite || 1),
          sanitizePdfText(formatCurrencyFCFA(item.montantUnitaire || 0)),
          sanitizePdfText(debit?.nom || ''),
          sanitizePdfText(credit?.nom || ''),
          sanitizePdfText(item.operateur),
          formatPdfCurrency(item.montant || 0),
        ];
      }),
      styles: {
        fontSize: 9,
        cellPadding: 5,
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
        halign: 'left',
        valign: 'middle',
      },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: {
        0: { cellWidth: 72 },
        1: { cellWidth: 62 },
        2: { halign: 'right', cellWidth: 48 },
        3: { halign: 'right', cellWidth: 95 },
        4: { cellWidth: 135 },
        5: { cellWidth: 135 },
        6: { cellWidth: 100 },
        7: { halign: 'right', cellWidth: 95 },
      },
      theme: 'striped',
    });
    const finalY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || 120;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text(`Total: ${formatPdfCurrency(summary.totals.depots + summary.totals.retraits)}`, 24, finalY + 22);
    appendPageNumbers(doc);
    doc.save(`depots_${buildExportFileDate()}.pdf`);
  };

  const exportComptesPdf = () => {
    const doc = createPdfReport('Rapport Comptes', `${displayAccounts.length} compte(s)`);

    autoTable(doc, {
      startY: 92,
      margin: { left: 24, right: 24, bottom: 34 },
      head: [['Libellé', 'Devise', 'Taux (1 -> FCFA)', 'Solde FCFA', 'Equiv. unités']],
      body: displayAccounts.map((account) => [
        sanitizePdfText(account.nom),
        sanitizePdfText(account.devise || 'FCFA'),
        sanitizePdfText(formatNumber(account.tauxFCFA || 1)),
        formatPdfCurrency(account.soldeCalculeFCFA || 0),
        sanitizePdfText(`${formatNumber(account.equivalentUnits || 0)} ${account.devise || 'FCFA'}`),
      ]),
      styles: {
        fontSize: 9,
        cellPadding: 5,
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
        halign: 'left',
        valign: 'middle',
      },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: {
        0: { cellWidth: 240 },
        1: { cellWidth: 90 },
        2: { halign: 'right', cellWidth: 130 },
        3: { halign: 'right', cellWidth: 120 },
        4: { halign: 'right', cellWidth: 140 },
      },
      theme: 'striped',
    });
    let y = ((doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || 120) + 20;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text(`Total comptes: ${formatPdfCurrency(summary.totals.totalComptes)}`, 40, y);
    y += 16;
    doc.text(`Bénéfice: ${formatPdfCurrency(summary.totals.benefice)}`, 40, y);
    y += 16;
    doc.text(`Dépenses: ${formatPdfCurrency(summary.totals.depenses)}`, 40, y);
    y += 16;
    doc.text(`Dettes: ${formatPdfCurrency(summary.totals.dettes)}`, 40, y);
    y += 16;
    doc.text(`Total disponible: ${formatPdfCurrency(summary.totals.totalDisponible)}`, 40, y);
    appendPageNumbers(doc);
    doc.save(`comptes_${buildExportFileDate()}.pdf`);
  };

  const currentSectionType = activeSection === 'achats' ? 'ACHAT' : activeSection === 'ventes' ? 'VENTE' : activeSection === 'depenses' ? 'DEPENSE' : activeSection === 'dettes' ? 'DETTE' : null;

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-800">{SECTION_META[activeSection].label}</h1>
          <p className="text-slate-500 mt-1">Synchronisation des achats, ventes, dépenses, dettes, dépôts/retraits et libellés comptables.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {activeSection === 'achats' && <button onClick={() => openNewTransactionModal('ACHAT')} className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow-md">+ Nouvel Achat</button>}
          {activeSection === 'ventes' && <button onClick={() => openNewTransactionModal('VENTE')} className="rounded-xl bg-amber-400 px-4 py-2.5 text-sm font-black text-slate-900 shadow-md">+ Nouvelle Vente</button>}
          {activeSection === 'depenses' && <button onClick={() => openNewTransactionModal('DEPENSE')} className="rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-bold text-white shadow-md">+ Nouvelle Dépense</button>}
          {activeSection === 'dettes' && <button onClick={() => openNewTransactionModal('DETTE')} className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-bold text-white shadow-md">+ Nouvelle Dette</button>}
          {activeSection === 'depots' && <button onClick={openNewDepotModal} className="rounded-xl bg-amber-300 px-4 py-2.5 text-sm font-black text-slate-900 shadow-md">+ Nouveau dépôt/retrait</button>}
          {activeSection === 'comptes' && <button onClick={openNewCompteModal} className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow-md">+ Nouveau libellé</button>}
        </div>
      </header>

      {error && <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
      {message && <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div>}

      <div className="flex gap-1 overflow-x-auto rounded-2xl bg-slate-100 p-1">
        {(Object.keys(SECTION_META) as SectionId[]).map((section) => {
          const Icon = SECTION_META[section].icon;
          return (
            <button
              key={section}
              type="button"
              onClick={() => {
                setActiveSection(section);
                setSearch('');
                setSelectedTransactionIds([]);
                setSelectedDepotIds([]);
              }}
              className={`flex min-w-max items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition ${activeSection === section ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <Icon size={16} /> {SECTION_META[section].label}
            </button>
          );
        })}
      </div>

      {activeSection === 'dashboard' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[
              { label: "Chiffre d'affaires", value: summary.totals.ventes, icon: TrendingUp, color: 'bg-emerald-500', info: 'Basé sur les ventes enregistrées' },
              { label: 'Total Achats', value: summary.totals.achats, icon: ShoppingCart, color: 'bg-blue-500', info: 'Coûts cumulés' },
              { label: 'Bénéfice estimé', value: summary.totals.benefice, icon: Wallet, color: 'bg-indigo-500', info: `(${formatNumber(summary.totals.avgUnitVente)} - ${formatNumber(summary.totals.avgUnitAchat)}) × ${summary.totals.totalQtyVentes}` },
              { label: 'Total Dépenses', value: summary.totals.depenses, icon: Receipt, color: 'bg-rose-500', info: 'Dépenses cumulées' },
            ].map((card) => {
              const Icon = card.icon;
              return (
                <div key={card.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-slate-500">{card.label}</div>
                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${card.color} text-white`}><Icon size={18} /></div>
                  </div>
                  <div className="mt-4 text-2xl font-black text-slate-800">{formatCurrencyFCFA(card.value)}</div>
                  <div className="mt-2 text-xs text-slate-400">{card.info}</div>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <div className="text-xs font-bold uppercase tracking-wide text-amber-700">Dettes</div>
              <div className="mt-2 text-2xl font-black text-amber-900">{formatCurrencyFCFA(summary.totals.dettes)}</div>
            </div>
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <div className="text-xs font-bold uppercase tracking-wide text-emerald-700">Dépôts</div>
              <div className="mt-2 text-2xl font-black text-emerald-900">{formatCurrencyFCFA(summary.totals.depots)}</div>
            </div>
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
              <div className="text-xs font-bold uppercase tracking-wide text-rose-700">Retraits</div>
              <div className="mt-2 text-2xl font-black text-rose-900">{formatCurrencyFCFA(summary.totals.retraits)}</div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-6 text-lg font-bold text-slate-800">Évolution Mensuelle (Achats, Dépenses vs Ventes, Dettes)</h2>
            <div className="flex h-64 items-end gap-3 overflow-x-auto">
              {summary.monthly.map((item) => {
                const values = [item.ACHAT, item.VENTE, item.DEPENSE, item.DETTE];
                const max = Math.max(...summary.monthly.flatMap((entry) => [entry.ACHAT, entry.VENTE, entry.DEPENSE, entry.DETTE]), 1);
                return (
                  <div key={item.month} className="flex min-w-[90px] flex-1 flex-col items-center gap-2">
                    <div className="flex h-48 w-full items-end gap-1">
                      <div className="w-full rounded-t bg-blue-500/80" style={{ height: `${(values[0] / max) * 100}%` }} />
                      <div className="w-full rounded-t bg-rose-400/80" style={{ height: `${(values[2] / max) * 100}%` }} />
                      <div className="w-full rounded-t bg-amber-400/90" style={{ height: `${(values[1] / max) * 100}%` }} />
                      <div className="w-full rounded-t bg-violet-500/80" style={{ height: `${(values[3] / max) * 100}%` }} />
                    </div>
                    <div className="text-xs font-semibold text-slate-500">{item.month}</div>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 flex flex-wrap gap-4 text-xs font-semibold text-slate-500">
              <span className="flex items-center gap-2"><span className="h-3 w-3 rounded-sm bg-blue-500/80" /> Achats</span>
              <span className="flex items-center gap-2"><span className="h-3 w-3 rounded-sm bg-rose-400/80" /> Dépenses</span>
              <span className="flex items-center gap-2"><span className="h-3 w-3 rounded-sm bg-amber-400/90" /> Ventes</span>
              <span className="flex items-center gap-2"><span className="h-3 w-3 rounded-sm bg-violet-500/80" /> Dettes</span>
            </div>
          </div>
        </div>
      )}

      {currentSectionType && (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-100 bg-slate-50 px-5 py-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <div className="text-lg font-semibold text-slate-800">{SECTION_META[activeSection].label}</div>
              <span className="text-xs text-slate-400">{filteredTransactions.length} élément(s)</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
                <Search size={14} className="text-slate-400" />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher..." className="w-full sm:w-52 bg-transparent text-sm outline-none" />
              </div>
              <button onClick={deleteSelectedTransactions} disabled={selectedTransactionIds.length === 0 || saving} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 disabled:opacity-50">Supprimer sélection</button>
              <button onClick={() => exportTransactionsPdf(currentSectionType)} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700"><FileDown size={16} /> Exporter PDF</button>
            </div>
          </div>
          <div className="overflow-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-100 bg-white text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3"><CheckSquare size={14} /></th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Article / Description</th>
                  <th className="px-4 py-3">Qté</th>
                  <th className="px-4 py-3">Prix unitaire</th>
                  <th className="px-4 py-3">Débit</th>
                  <th className="px-4 py-3">Crédit</th>
                  <th className="px-4 py-3">{TX_TYPE_CONFIG[currentSectionType].partyLabel}</th>
                  <th className="px-4 py-3 text-right">Total (FCFA)</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-10 text-center text-slate-400">
                      <LoadingSpinner label="Chargement..." size="sm" />
                    </td>
                  </tr>
                ) : filteredTransactions.length === 0 ? (
                  <tr><td colSpan={10} className="px-4 py-10 text-center text-slate-400">Aucune ligne trouvée.</td></tr>
                ) : filteredTransactions.map((item, index) => {
                  const debit = accountById(getAccountId(item.accountDebitId));
                  const credit = accountById(getAccountId(item.accountCreditId));
                  const selected = selectedTransactionIds.includes(item._id);
                  return (
                    <tr key={item._id} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}>
                      <td className="px-4 py-3"><input type="checkbox" checked={selected} onChange={(e) => setSelectedTransactionIds((prev) => e.target.checked ? [...prev, item._id] : prev.filter((value) => value !== item._id))} /></td>
                      <td className="px-4 py-3 whitespace-nowrap">{normalizeDate(item.date)}</td>
                      <td className="px-4 py-3 font-medium text-slate-800">{item.description}</td>
                      <td className="px-4 py-3">{item.quantite || 0}</td>
                      <td className="px-4 py-3">{formatNumber(item.prixUnitaire || 0)} {item.txCurrency || 'FCFA'}</td>
                      <td className="px-4 py-3">{debit?.nom || '—'}</td>
                      <td className="px-4 py-3">{credit?.nom || '—'}</td>
                      <td className="px-4 py-3">{item.tiers || '—'}</td>
                      <td className="px-4 py-3 text-right font-semibold">{formatCurrencyFCFA(item.amountFCFA || 0)}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => openEditTransactionModal(item)} className="rounded-lg p-1.5 text-blue-600 hover:bg-blue-50"><Edit3 size={15} /></button>
                          <button onClick={() => deleteTransaction(item._id)} className="rounded-lg p-1.5 text-rose-600 hover:bg-rose-50"><Trash2 size={15} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-blue-50/70">
                  <td colSpan={8} className="px-4 py-3 text-right font-semibold">Total</td>
                  <td className="px-4 py-3 text-right font-black">{formatCurrencyFCFA(filteredTransactions.reduce((sum, item) => sum + Number(item.amountFCFA || 0), 0))}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {activeSection === 'depots' && (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-100 bg-slate-50 px-5 py-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <div className="text-lg font-semibold text-slate-800">Dépôts / Retraits</div>
              <span className="text-xs text-slate-400">{filteredDepots.length} opération(s)</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
                <Search size={14} className="text-slate-400" />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher..." className="w-full sm:w-52 bg-transparent text-sm outline-none" />
              </div>
              <button onClick={deleteSelectedDepots} disabled={selectedDepotIds.length === 0 || saving} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 disabled:opacity-50">Supprimer sélection</button>
              <button onClick={exportDepotsPdf} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700"><FileDown size={16} /> Exporter PDF</button>
            </div>
          </div>
          <div className="overflow-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-100 bg-white text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3"><CheckSquare size={14} /></th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Qté</th>
                  <th className="px-4 py-3">Montant</th>
                  <th className="px-4 py-3">Débit</th>
                  <th className="px-4 py-3">Crédit</th>
                  <th className="px-4 py-3">Opérateur</th>
                  <th className="px-4 py-3 text-right">Total (FCFA)</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-10 text-center text-slate-400">
                      <LoadingSpinner label="Chargement..." size="sm" />
                    </td>
                  </tr>
                ) : filteredDepots.length === 0 ? (
                  <tr><td colSpan={10} className="px-4 py-10 text-center text-slate-400">Aucune opération trouvée.</td></tr>
                ) : filteredDepots.map((item, index) => {
                  const debit = accountById(getAccountId(item.compteDebitId || item.compteId));
                  const credit = accountById(getAccountId(item.compteCreditId));
                  const selected = selectedDepotIds.includes(item._id);
                  return (
                    <tr key={item._id} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}>
                      <td className="px-4 py-3"><input type="checkbox" checked={selected} onChange={(e) => setSelectedDepotIds((prev) => e.target.checked ? [...prev, item._id] : prev.filter((value) => value !== item._id))} /></td>
                      <td className="px-4 py-3 whitespace-nowrap">{normalizeDate(item.date)}</td>
                      <td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${item.type === 'DEPOT' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>{item.type}</span></td>
                      <td className="px-4 py-3">{item.quantite || 1}</td>
                      <td className="px-4 py-3">{formatCurrencyFCFA(item.montantUnitaire || 0)}</td>
                      <td className="px-4 py-3">{debit?.nom || '—'}</td>
                      <td className="px-4 py-3">{credit?.nom || '—'}</td>
                      <td className="px-4 py-3">{item.operateur}</td>
                      <td className="px-4 py-3 text-right font-semibold">{formatCurrencyFCFA(item.montant || 0)}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => openEditDepotModal(item)} className="rounded-lg p-1.5 text-blue-600 hover:bg-blue-50"><Edit3 size={15} /></button>
                          <button onClick={() => deleteDepot(item._id)} className="rounded-lg p-1.5 text-rose-600 hover:bg-rose-50"><Trash2 size={15} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-blue-50/70">
                  <td colSpan={8} className="px-4 py-3 text-right font-semibold">Total</td>
                  <td className="px-4 py-3 text-right font-black">{formatCurrencyFCFA(filteredDepots.reduce((sum, item) => sum + Number(item.montant || 0), 0))}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {activeSection === 'comptes' && (
        <div className="space-y-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-4">
                <div>
                  <div className="text-2xl font-bold text-slate-800">Gestion des comptes (libellés)</div>
                </div>
                <div className="text-sm text-slate-400">{displayAccounts.length} libellé(s)</div>
              </div>
              <div className="flex flex-wrap gap-2">
                {displayAccounts.length === 0 && <button onClick={initializeDefaultAccounts} disabled={saving} className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 disabled:opacity-50">Créer comptes de base</button>}
                <button onClick={openNewCompteModal} className="rounded-2xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-md">+ Nouveau libellé</button>
                <button onClick={resetAllComptes} disabled={displayAccounts.length === 0 || saving} className="rounded-2xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 disabled:opacity-50">Réinitialiser tous à 0</button>
                <button onClick={exportComptesPdf} disabled={displayAccounts.length === 0} className="rounded-2xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 disabled:opacity-50">Exporter PDF Comptes</button>
              </div>
            </div>

            <div className="mt-6 overflow-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Libellé</th>
                    <th className="px-4 py-3">Devise</th>
                    <th className="px-4 py-3">Taux (1 unité → FCFA)</th>
                    <th className="px-4 py-3 text-right">Solde (FCFA)</th>
                    <th className="px-4 py-3 text-right">Equiv. (unités)</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {displayAccounts.map((account, index) => (
                    <tr key={account._id} className={`border-t border-slate-100 ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}>
                      <td className="px-4 py-4 text-[16px] font-medium text-slate-800">{account.nom}</td>
                      <td className="px-4 py-4">{account.devise}</td>
                      <td className="px-4 py-4">{formatNumber(account.tauxFCFA || 1)}</td>
                      <td className="px-4 py-4 text-right text-[16px] font-black text-slate-800">{formatCurrencyFCFA(account.soldeCalculeFCFA || 0)}</td>
                      <td className="px-4 py-4 text-right">{formatNumber(account.equivalentUnits || 0)} {account.devise}</td>
                      <td className="px-4 py-4 text-right">
                        <div className="flex justify-end gap-3">
                          <button onClick={() => openEditCompteModal(account)} className="text-blue-600 hover:text-blue-700"><Edit3 size={16} /></button>
                          <button onClick={() => resetOneCompte(account)} className="text-amber-500 hover:text-amber-600">0</button>
                          <button onClick={() => deleteCompte(account._id)} className="text-rose-400 hover:text-rose-600"><Trash2 size={16} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-blue-50/70 font-semibold text-slate-800">
                    <td colSpan={3} className="px-4 py-4 text-right">Total Disponible</td>
                    <td className="px-4 py-4 text-right text-xl font-black">{formatCurrencyFCFA(summary.totals.totalDisponible)}</td>
                    <td />
                    <td />
                  </tr>
                  <tr>
                    <td colSpan={6} className="px-4 py-3 text-xs text-slate-500">
                      <strong>Formule :</strong> TotalComptes + Bénéfice - Dépenses - Dettes
                      <br />
                      Bénéfice = ({formatNumber(summary.totals.avgUnitVente)} - {formatNumber(summary.totals.avgUnitAchat)}) × {summary.totals.totalQtyVentes} = {formatCurrencyFCFA(summary.totals.benefice)}
                      {' | '}Dépenses: {formatCurrencyFCFA(summary.totals.depenses)}
                      {' | '}Dettes: {formatCurrencyFCFA(summary.totals.dettes)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {showTxModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-6 py-4">
              <h2 className="text-lg font-bold text-slate-800">{txForm.editId ? 'Modifier la transaction' : `Nouvelle ${TX_TYPE_CONFIG[txForm.type].label.toLowerCase()}`}</h2>
              <button onClick={() => setShowTxModal(false)}><X size={20} className="text-slate-400" /></button>
            </div>
            <form onSubmit={saveTransaction} className="space-y-4 overflow-y-auto p-6">
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-slate-500">Type *</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:grid-cols-4">
                  {(Object.keys(TX_TYPE_CONFIG) as AccountingTransactionType[]).map((type) => (
                    <button key={type} type="button" onClick={() => setTxForm((prev) => ({ ...prev, type, txCurrency: TX_TYPE_CONFIG[type].defaultCurrency }))} className={`rounded-xl border px-3 py-2 text-xs font-bold ${txForm.type === type ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-500'}`}>{TX_TYPE_CONFIG[type].label}</button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div><label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-slate-500">Date *</label><input type="date" required value={txForm.date} onChange={(e) => setTxForm((prev) => ({ ...prev, date: e.target.value }))} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3" /></div>
                <div><label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-slate-500">Devise *</label><select value={txForm.txCurrency} onChange={(e) => setTxForm((prev) => ({ ...prev, txCurrency: e.target.value }))} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"><option value="FCFA">FCFA</option><option value="USD">USD</option><option value="EUR">EUR</option></select></div>
              </div>
              <div><label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-slate-500">Article / Description *</label><input type="text" required value={txForm.description} onChange={(e) => setTxForm((prev) => ({ ...prev, description: e.target.value }))} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3" /></div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div><label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-slate-500">Quantité</label><input type="number" min="0" value={txForm.quantite} onChange={(e) => setTxForm((prev) => ({ ...prev, quantite: e.target.value }))} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3" /></div>
                <div><label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-slate-500">Prix unitaire</label><input type="number" min="0" value={txForm.prixUnitaire} onChange={(e) => setTxForm((prev) => ({ ...prev, prixUnitaire: e.target.value }))} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3" /></div>
                <div><label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-slate-500">Montant total</label><input type="number" min="0" value={txForm.montant} onChange={(e) => setTxForm((prev) => ({ ...prev, montant: e.target.value }))} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3" /></div>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div><label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-slate-500">Compte débit *</label><select value={txForm.accountDebitId} onChange={(e) => setTxForm((prev) => ({ ...prev, accountDebitId: e.target.value }))} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"><option value="">-- Choisir débit --</option>{displayAccounts.map((account) => <option key={account._id} value={account._id}>{account.nom} ({account.devise})</option>)}</select></div>
                <div><label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-slate-500">Compte crédit *</label><select value={txForm.accountCreditId} onChange={(e) => setTxForm((prev) => ({ ...prev, accountCreditId: e.target.value }))} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"><option value="">-- Choisir crédit --</option>{displayAccounts.map((account) => <option key={account._id} value={account._id}>{account.nom} ({account.devise})</option>)}</select></div>
              </div>
              <div><label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-slate-500">{TX_TYPE_CONFIG[txForm.type].partyLabel}</label><input type="text" value={txForm.tiers} onChange={(e) => setTxForm((prev) => ({ ...prev, tiers: e.target.value }))} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3" /></div>
              <div><label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-slate-500">Note</label><textarea rows={3} value={txForm.notes} onChange={(e) => setTxForm((prev) => ({ ...prev, notes: e.target.value }))} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3" /></div>
              <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
                <button type="button" onClick={() => setShowTxModal(false)} className="rounded-xl border border-slate-200 px-4 py-2.5 font-semibold text-slate-600">Annuler</button>
                <button type="submit" disabled={saving} className="rounded-xl bg-blue-600 px-5 py-2.5 font-bold text-white disabled:opacity-60 inline-flex items-center gap-2">{saving ? <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Enregistrement...</> : 'Enregistrer'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDepotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-6 py-4">
              <h2 className="text-lg font-bold text-slate-800">{depotForm.editId ? 'Modifier le dépôt/retrait' : 'Nouveau dépôt / retrait'}</h2>
              <button onClick={() => setShowDepotModal(false)}><X size={20} className="text-slate-400" /></button>
            </div>
            <form onSubmit={saveDepot} className="space-y-4 overflow-y-auto p-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div><label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-slate-500">Type</label><select value={depotForm.type} onChange={(e) => setDepotForm((prev) => ({ ...prev, type: e.target.value as 'DEPOT' | 'RETRAIT' }))} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"><option value="DEPOT">DEPOT</option><option value="RETRAIT">RETRAIT</option></select></div>
                <div><label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-slate-500">Date</label><input type="date" value={depotForm.date} onChange={(e) => setDepotForm((prev) => ({ ...prev, date: e.target.value }))} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3" /></div>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div><label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-slate-500">Quantité</label><input type="number" min="1" value={depotForm.quantite} onChange={(e) => setDepotForm((prev) => ({ ...prev, quantite: e.target.value }))} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3" /></div>
                <div><label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-slate-500">Montant unitaire (FCFA)</label><input type="number" min="0" value={depotForm.montantUnitaire} onChange={(e) => setDepotForm((prev) => ({ ...prev, montantUnitaire: e.target.value }))} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3" /></div>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div><label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-slate-500">Compte débit</label><select value={depotForm.compteDebitId} onChange={(e) => setDepotForm((prev) => ({ ...prev, compteDebitId: e.target.value }))} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"><option value="">-- Choisir débit --</option>{displayAccounts.map((account) => <option key={account._id} value={account._id}>{account.nom} ({account.devise})</option>)}</select></div>
                <div><label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-slate-500">Compte crédit</label><select value={depotForm.compteCreditId} onChange={(e) => setDepotForm((prev) => ({ ...prev, compteCreditId: e.target.value }))} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"><option value="">-- Choisir crédit --</option>{displayAccounts.map((account) => <option key={account._id} value={account._id}>{account.nom} ({account.devise})</option>)}</select></div>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div><label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-slate-500">Opérateur</label><input type="text" value={depotForm.operateur} onChange={(e) => setDepotForm((prev) => ({ ...prev, operateur: e.target.value }))} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3" /></div>
                <div><label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-slate-500">Description</label><input type="text" value={depotForm.description} onChange={(e) => setDepotForm((prev) => ({ ...prev, description: e.target.value }))} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3" /></div>
              </div>
              <div><label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-slate-500">Note</label><textarea rows={3} value={depotForm.notes} onChange={(e) => setDepotForm((prev) => ({ ...prev, notes: e.target.value }))} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3" /></div>
              <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
                <button type="button" onClick={() => setShowDepotModal(false)} className="rounded-xl border border-slate-200 px-4 py-2.5 font-semibold text-slate-600">Annuler</button>
                <button type="submit" disabled={saving} className="rounded-xl bg-blue-600 px-5 py-2.5 font-bold text-white disabled:opacity-60 inline-flex items-center gap-2">{saving ? <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Enregistrement...</> : 'Enregistrer'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showCompteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-6 py-4">
              <h2 className="text-lg font-bold text-slate-800">{compteForm.editId ? 'Modifier le libellé' : 'Nouveau libellé'}</h2>
              <button onClick={() => setShowCompteModal(false)}><X size={20} className="text-slate-400" /></button>
            </div>
            <form onSubmit={saveCompte} className="space-y-4 overflow-y-auto p-6">
              <div><label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-slate-500">Libellé</label><input required type="text" value={compteForm.nom} onChange={(e) => setCompteForm((prev) => ({ ...prev, nom: e.target.value }))} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3" /></div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div><label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-slate-500">Devise</label><select value={compteForm.devise} onChange={(e) => setCompteForm((prev) => ({ ...prev, devise: e.target.value, tauxFCFA: e.target.value === 'FCFA' ? '1' : prev.tauxFCFA || String(DEFAULT_USD_RATE) }))} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"><option value="FCFA">FCFA</option><option value="USD">USD</option><option value="EUR">EUR</option><option value="AUTRE">AUTRE</option></select></div>
                <div><label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-slate-500">Type</label><select value={compteForm.type} onChange={(e) => setCompteForm((prev) => ({ ...prev, type: e.target.value }))} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"><option>Espèces</option><option>Banque</option><option>Mobile Money</option><option>Chèque</option><option>Autre</option></select></div>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div><label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-slate-500">Taux (1 unité → FCFA)</label><input required type="number" min="0" value={compteForm.tauxFCFA} onChange={(e) => setCompteForm((prev) => ({ ...prev, tauxFCFA: e.target.value }))} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3" /></div>
                <div><label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-slate-500">Solde initial (unités)</label><input type="number" value={compteForm.soldeInitialUnites} onChange={(e) => setCompteForm((prev) => ({ ...prev, soldeInitialUnites: e.target.value }))} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3" /></div>
              </div>
              <div><label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-slate-500">Description</label><textarea rows={3} value={compteForm.description} onChange={(e) => setCompteForm((prev) => ({ ...prev, description: e.target.value }))} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3" /></div>
              <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
                <button type="button" onClick={() => setShowCompteModal(false)} className="rounded-xl border border-slate-200 px-4 py-2.5 font-semibold text-slate-600">Annuler</button>
                <button type="submit" disabled={saving} className="rounded-xl bg-blue-600 px-5 py-2.5 font-bold text-white disabled:opacity-60 inline-flex items-center gap-2">{saving ? <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Enregistrement...</> : 'Enregistrer'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
