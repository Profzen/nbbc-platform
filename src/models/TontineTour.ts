import mongoose, { Schema, Document, Types } from 'mongoose';

export type TontineTourStatut = 'PLANIFIE' | 'PAYE' | 'REPORTE' | 'ANNULE';

export interface ITontineTour extends Document {
  offreId: Types.ObjectId;
  numeroTour: number;
  beneficiaireUserId: Types.ObjectId;
  montantLot: number;
  datePrevue: Date;
  datePaiement?: Date;
  statut: TontineTourStatut;
  createdAt: Date;
  updatedAt: Date;
}

const TontineTourSchema = new Schema<ITontineTour>(
  {
    offreId: { type: Schema.Types.ObjectId, ref: 'TontineOffre', required: true, index: true },
    numeroTour: { type: Number, required: true, min: 1 },
    beneficiaireUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    montantLot: { type: Number, required: true, min: 1 },
    datePrevue: { type: Date, required: true },
    datePaiement: { type: Date },
    statut: { type: String, enum: ['PLANIFIE', 'PAYE', 'REPORTE', 'ANNULE'], default: 'PLANIFIE', index: true },
  },
  { timestamps: true }
);

TontineTourSchema.index({ offreId: 1, numeroTour: 1 }, { unique: true });

export default mongoose.models.TontineTour || mongoose.model<ITontineTour>('TontineTour', TontineTourSchema);
