import mongoose, { Schema, Document } from 'mongoose';

export type TransactionType = 'ACHAT' | 'VENTE' | 'DEPENSE' | 'DETTE';

export interface ITransaction extends Document {
  type: TransactionType;
  date: Date;
  description: string;
  quantite?: number;
  prixUnitaire?: number;
  montant: number;          // Total = quantite * prixUnitaire (ou montant direct)
  compte?: string;          // Ex: "Caisse", "Banque", "CB"
  tiers?: string;           // Fournisseur (achat), Client (vente), Créancier (dette)
  txCurrency?: string;
  amountFCFA?: number;
  rateUsed?: number;
  accountDebitId?: mongoose.Types.ObjectId;
  accountCreditId?: mongoose.Types.ObjectId;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const TransactionSchema = new Schema<ITransaction>({
  type: { type: String, enum: ['ACHAT', 'VENTE', 'DEPENSE', 'DETTE'], required: true },
  date: { type: Date, required: true, default: Date.now },
  description: { type: String, required: true },
  quantite: { type: Number },
  prixUnitaire: { type: Number },
  montant: { type: Number, required: true },
  compte: { type: String },
  tiers: { type: String },
  txCurrency: { type: String, default: 'FCFA' },
  amountFCFA: { type: Number },
  rateUsed: { type: Number },
  accountDebitId: { type: Schema.Types.ObjectId, ref: 'Compte' },
  accountCreditId: { type: Schema.Types.ObjectId, ref: 'Compte' },
  notes: { type: String },
}, {
  timestamps: true
});

export default mongoose.models.Transaction || mongoose.model<ITransaction>('Transaction', TransactionSchema);
