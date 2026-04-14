import mongoose, { Schema, Document, Types } from 'mongoose';

export type TontinePeriodicite = 'JOURNALIERE' | 'HEBDOMADAIRE';
export type TontineStatut = 'DRAFT' | 'ACTIVE' | 'LATE' | 'AT_RISK' | 'EVICTED' | 'WITHDRAWN' | 'MATURED' | 'PAID_OUT' | 'FAILED_PAYOUT';
export type DestinationRail = 'CRYPTO' | 'MOBILE_MONEY' | 'CARTE' | 'BANQUE';

export interface ITontineContract extends Document {
  userId: Types.ObjectId;
  periodicite: TontinePeriodicite;
  dureeMois: 3 | 6;
  montantVersement: number;
  devise: string;
  compteDestinationType: DestinationRail;
  compteDestinationLibelle: string;
  compteDestinationReference?: string;
  statut: TontineStatut;
  dateSouscription: Date;
  dateDebut: Date;
  dateFinPrevue: Date;
  fraisPlateformePercent: number;
  penaliteSortiePercent: number;
  penaliteDefautPercent: number;
  nombreVersementsManques: number;
  acceptationConditionsAt?: Date;
  hashPreuve?: string;
  createdAt: Date;
  updatedAt: Date;
}

const TontineContractSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    periodicite: { type: String, enum: ['JOURNALIERE', 'HEBDOMADAIRE'], required: true },
    dureeMois: { type: Number, enum: [3, 6], required: true },
    montantVersement: { type: Number, required: true, min: 1 },
    devise: { type: String, default: 'XOF' },
    compteDestinationType: { type: String, enum: ['CRYPTO', 'MOBILE_MONEY', 'CARTE', 'BANQUE'], required: true },
    compteDestinationLibelle: { type: String, required: true },
    compteDestinationReference: { type: String },
    statut: {
      type: String,
      enum: ['DRAFT', 'ACTIVE', 'LATE', 'AT_RISK', 'EVICTED', 'WITHDRAWN', 'MATURED', 'PAID_OUT', 'FAILED_PAYOUT'],
      default: 'DRAFT',
    },
    dateSouscription: { type: Date, default: Date.now },
    dateDebut: { type: Date, default: Date.now },
    dateFinPrevue: { type: Date, required: true },
    fraisPlateformePercent: { type: Number, default: 10 },
    penaliteSortiePercent: { type: Number, default: 10 },
    penaliteDefautPercent: { type: Number, default: 10 },
    nombreVersementsManques: { type: Number, default: 0 },
    acceptationConditionsAt: { type: Date },
    hashPreuve: { type: String },
  },
  { timestamps: true }
);

export default mongoose.models.TontineContract || mongoose.model<ITontineContract>('TontineContract', TontineContractSchema);