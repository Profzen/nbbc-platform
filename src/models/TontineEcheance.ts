import mongoose, { Schema, Document, Types } from 'mongoose';

export type TontineEcheanceStatut = 'A_PREVOIR' | 'EN_ATTENTE' | 'EN_RETARD' | 'PAYEE' | 'ANNULEE';

export interface ITontineEcheance extends Document {
  contractId: Types.ObjectId;
  userId: Types.ObjectId;
  indexEcheance: number;
  dateEcheance: Date;
  montantAttendu: number;
  montantRecu: number;
  statut: TontineEcheanceStatut;
  datePaiement?: Date;
  penaliteMontant: number;
  createdAt: Date;
  updatedAt: Date;
}

const TontineEcheanceSchema = new Schema(
  {
    contractId: { type: Schema.Types.ObjectId, ref: 'TontineContract', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    indexEcheance: { type: Number, required: true, min: 1 },
    dateEcheance: { type: Date, required: true },
    montantAttendu: { type: Number, required: true, min: 1 },
    montantRecu: { type: Number, default: 0 },
    statut: { type: String, enum: ['A_PREVOIR', 'EN_ATTENTE', 'EN_RETARD', 'PAYEE', 'ANNULEE'], default: 'EN_ATTENTE' },
    datePaiement: { type: Date },
    penaliteMontant: { type: Number, default: 0 },
  },
  { timestamps: true }
);

TontineEcheanceSchema.index({ contractId: 1, indexEcheance: 1 }, { unique: true });

export default mongoose.models.TontineEcheance || mongoose.model<ITontineEcheance>('TontineEcheance', TontineEcheanceSchema);