import mongoose, { Schema, Document, Types } from 'mongoose';

export type TypeCompte = 'ZELLE' | 'CASH_APP' | 'WIRE' | 'PAYPAL' | 'CRYPTO' | 'EURO' | 'WISE' | 'AUTRE';
export type StatutCompte = 'ACTIF' | 'SUSPENDU' | 'FERME';

export interface ICarte extends Document {
  clientId: Types.ObjectId;
  type: TypeCompte;
  // Identifiant du compte (numéro de carte, email Zelle, $cashtag, adresse crypto, IBAN, etc.)
  identifiant: string;
  titulaire?: string;       // Nom du titulaire (peut différer du client)
  banque?: string;          // Banque ou plateforme (ex: Bank of America, Coinbase, ...)
  devise?: string;          // USD, EUR, BTC, ETH, ...
  solde?: number;           // Solde (optionnel, peut être sensible)
  notes?: string;
  statut: StatutCompte;
  createdAt: Date;
  updatedAt: Date;
}

const CarteSchema: Schema = new Schema(
  {
    clientId: { type: Schema.Types.ObjectId, ref: 'Client', required: true },
    type: {
      type: String,
      enum: ['ZELLE', 'CASH_APP', 'WIRE', 'PAYPAL', 'CRYPTO', 'EURO', 'WISE', 'AUTRE'],
      required: true
    },
    identifiant: { type: String, required: true },
    titulaire: { type: String },
    banque: { type: String },
    devise: { type: String, default: 'USD' },
    solde: { type: Number },
    notes: { type: String },
    statut: {
      type: String,
      enum: ['ACTIF', 'SUSPENDU', 'FERME'],
      default: 'ACTIF'
    }
  },
  { timestamps: true }
);

export default mongoose.models.Carte || mongoose.model<ICarte>('Carte', CarteSchema);
