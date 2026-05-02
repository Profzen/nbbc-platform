import mongoose, { Schema, Document, Types } from 'mongoose';

export type TontineAdhesionStatut = 'EN_ATTENTE' | 'VALIDEE' | 'REFUSEE' | 'RETIREE';

export interface ITontineAdhesion extends Document {
  offreId: Types.ObjectId;
  clientUserId: Types.ObjectId;
  statut: TontineAdhesionStatut;
  moyenPaiementChoisi: 'CRYPTO' | 'MOBILE_MONEY' | 'CARTE' | 'BANQUE' | 'MANUEL';
  paymentProvider?: 'PAYGATE';
  paymentStatus: 'NONE' | 'PENDING' | 'SUCCESS' | 'FAILED' | 'EXPIRED' | 'CANCELLED';
  paymentIdentifier?: string;
  paygateTxReference?: string;
  paygatePaymentReference?: string;
  paygatePaymentMethod?: string;
  paymentRawStatus?: string;
  ordrePassage?: number;
  lotTotalRecu: number;
  createdAt: Date;
  updatedAt: Date;
}

const TontineAdhesionSchema = new Schema<ITontineAdhesion>(
  {
    offreId: { type: Schema.Types.ObjectId, ref: 'TontineOffre', required: true, index: true },
    clientUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    statut: {
      type: String,
      enum: ['EN_ATTENTE', 'VALIDEE', 'REFUSEE', 'RETIREE'],
      default: 'VALIDEE',
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
    ordrePassage: { type: Number, min: 1 },
    lotTotalRecu: { type: Number, default: 0 },
  },
  { timestamps: true }
);

TontineAdhesionSchema.index({ offreId: 1, clientUserId: 1 }, { unique: true });
TontineAdhesionSchema.index({ paymentIdentifier: 1 }, { unique: true, sparse: true });

export default mongoose.models.TontineAdhesion || mongoose.model<ITontineAdhesion>('TontineAdhesion', TontineAdhesionSchema);
