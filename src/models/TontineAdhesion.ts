import mongoose, { Schema, Document, Types } from 'mongoose';

export type TontineAdhesionStatut = 'EN_ATTENTE' | 'VALIDEE' | 'REFUSEE' | 'RETIREE';

export interface ITontineAdhesion extends Document {
  offreId: Types.ObjectId;
  clientUserId: Types.ObjectId;
  statut: TontineAdhesionStatut;
  moyenPaiementChoisi: 'CRYPTO' | 'MOBILE_MONEY' | 'CARTE' | 'BANQUE' | 'MANUEL';
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
    ordrePassage: { type: Number, min: 1 },
    lotTotalRecu: { type: Number, default: 0 },
  },
  { timestamps: true }
);

TontineAdhesionSchema.index({ offreId: 1, clientUserId: 1 }, { unique: true });

export default mongoose.models.TontineAdhesion || mongoose.model<ITontineAdhesion>('TontineAdhesion', TontineAdhesionSchema);
