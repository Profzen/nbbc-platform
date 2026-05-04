import mongoose, { Schema, Document, Types } from 'mongoose';

export type TontineAdhesionEcheanceStatut = 'A_PREVOIR' | 'EN_ATTENTE' | 'EN_RETARD' | 'PAYEE' | 'ANNULEE';
export type TontineAdhesionEcheancePaymentStatus = 'NONE' | 'PENDING' | 'SUCCESS' | 'FAILED' | 'EXPIRED' | 'CANCELLED';
export type TontineAdhesionValidationStatus = 'NOT_REQUIRED' | 'PENDING' | 'APPROVED' | 'REJECTED';

export interface ITontineAdhesionEcheance extends Document {
  adhesionId: Types.ObjectId;
  offreId: Types.ObjectId;
  clientUserId: Types.ObjectId;
  numeroEcheance: number;
  dateEcheance: Date;
  montantPrevu: number;
  montantPaye: number;
  statut: TontineAdhesionEcheanceStatut;
  moyenPaiementChoisi: 'CRYPTO' | 'MOBILE_MONEY' | 'CARTE' | 'BANQUE' | 'MANUEL';
  paymentProvider?: 'PAYGATE';
  paymentStatus: TontineAdhesionEcheancePaymentStatus;
  paymentIdentifier?: string;
  paygateTxReference?: string;
  paygatePaymentReference?: string;
  paygatePaymentMethod?: string;
  paymentRawStatus?: string;
  validationStatus: TontineAdhesionValidationStatus;
  validationRequestedAt?: Date;
  validatedAt?: Date;
  validatedBy?: Types.ObjectId;
  validationNote?: string;
  preuveReference?: string;
  preuveNote?: string;
  paidAt?: Date;
  reminderOneDaySentAt?: Date;
  reminderTwoDaysSentAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const TontineAdhesionEcheanceSchema = new Schema<ITontineAdhesionEcheance>(
  {
    adhesionId: { type: Schema.Types.ObjectId, ref: 'TontineAdhesion', required: true, index: true },
    offreId: { type: Schema.Types.ObjectId, ref: 'TontineOffre', required: true, index: true },
    clientUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    numeroEcheance: { type: Number, required: true, min: 1 },
    dateEcheance: { type: Date, required: true, index: true },
    montantPrevu: { type: Number, required: true, min: 1 },
    montantPaye: { type: Number, default: 0 },
    statut: {
      type: String,
      enum: ['A_PREVOIR', 'EN_ATTENTE', 'EN_RETARD', 'PAYEE', 'ANNULEE'],
      default: 'A_PREVOIR',
      index: true,
    },
    moyenPaiementChoisi: {
      type: String,
      enum: ['CRYPTO', 'MOBILE_MONEY', 'CARTE', 'BANQUE', 'MANUEL'],
      required: true,
      default: 'MANUEL',
    },
    paymentProvider: {
      type: String,
      enum: ['PAYGATE'],
    },
    paymentStatus: {
      type: String,
      enum: ['NONE', 'PENDING', 'SUCCESS', 'FAILED', 'EXPIRED', 'CANCELLED'],
      default: 'NONE',
      index: true,
    },
    paymentIdentifier: { type: String, trim: true, index: true },
    paygateTxReference: { type: String, trim: true },
    paygatePaymentReference: { type: String, trim: true },
    paygatePaymentMethod: { type: String, trim: true },
    paymentRawStatus: { type: String, trim: true },
    validationStatus: {
      type: String,
      enum: ['NOT_REQUIRED', 'PENDING', 'APPROVED', 'REJECTED'],
      default: 'NOT_REQUIRED',
      index: true,
    },
    validationRequestedAt: { type: Date },
    validatedAt: { type: Date },
    validatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    validationNote: { type: String, trim: true },
    preuveReference: { type: String, trim: true },
    preuveNote: { type: String, trim: true },
    paidAt: { type: Date },
    reminderOneDaySentAt: { type: Date },
    reminderTwoDaysSentAt: { type: Date },
  },
  { timestamps: true }
);

TontineAdhesionEcheanceSchema.index({ adhesionId: 1, numeroEcheance: 1 }, { unique: true });
TontineAdhesionEcheanceSchema.index({ paymentIdentifier: 1 }, { unique: true, sparse: true });

export default mongoose.models.TontineAdhesionEcheance || mongoose.model<ITontineAdhesionEcheance>('TontineAdhesionEcheance', TontineAdhesionEcheanceSchema);