import mongoose, { Schema, Document, Types } from 'mongoose';

export type TontineVersementRail = 'CRYPTO' | 'MOBILE_MONEY' | 'CARTE' | 'BANQUE' | 'MANUEL';
export type TontineVersementStatut = 'EN_ATTENTE' | 'SUCCES' | 'ECHEC' | 'REMBOURSE';

export interface ITontineVersement extends Document {
  contractId: Types.ObjectId;
  echeanceId?: Types.ObjectId;
  userId: Types.ObjectId;
  montant: number;
  devise: string;
  railPaiement: TontineVersementRail;
  referenceProvider?: string;
  idempotencyKey?: string;
  statut: TontineVersementStatut;
  transactionHash?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const TontineVersementSchema = new Schema(
  {
    contractId: { type: Schema.Types.ObjectId, ref: 'TontineContract', required: true, index: true },
    echeanceId: { type: Schema.Types.ObjectId, ref: 'TontineEcheance' },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    montant: { type: Number, required: true, min: 1 },
    devise: { type: String, default: 'XOF' },
    railPaiement: { type: String, enum: ['CRYPTO', 'MOBILE_MONEY', 'CARTE', 'BANQUE', 'MANUEL'], required: true },
    referenceProvider: { type: String },
    idempotencyKey: { type: String, index: true, unique: true, sparse: true },
    statut: { type: String, enum: ['EN_ATTENTE', 'SUCCES', 'ECHEC', 'REMBOURSE'], default: 'EN_ATTENTE' },
    transactionHash: { type: String },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

export default mongoose.models.TontineVersement || mongoose.model<ITontineVersement>('TontineVersement', TontineVersementSchema);