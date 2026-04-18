import mongoose, { Schema, Document, Types } from 'mongoose';

export type TontineCategorie = 'EPARGNE' | 'CLASSIQUE';
export type TontineFrequence = 'HEBDOMADAIRE' | 'BI_HEBDOMADAIRE' | 'MENSUELLE';
export type TontineOffreStatut = 'BROUILLON' | 'OUVERTE' | 'COMPLETE' | 'EN_COURS' | 'SUSPENDUE' | 'CLOTUREE';
export type TontineMoyenPaiement = 'CRYPTO' | 'MOBILE_MONEY' | 'CARTE' | 'BANQUE' | 'MANUEL';

export interface ITontineOffre extends Document {
  nom: string;
  categorie: TontineCategorie;
  description?: string;
  montantCotisation: number;
  frequence: TontineFrequence;
  nombreMembresCible: number;
  moyensPaiementAcceptes: TontineMoyenPaiement[];
  montantLot: number;
  nombreTours: number;
  dureeSemaines: number;
  dateDebutPrevue?: Date;
  statut: TontineOffreStatut;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const TontineOffreSchema = new Schema<ITontineOffre>(
  {
    nom: { type: String, required: true, trim: true },
    categorie: { type: String, enum: ['EPARGNE', 'CLASSIQUE'], required: true, index: true },
    description: { type: String, trim: true },
    montantCotisation: { type: Number, required: true, min: 1 },
    frequence: { type: String, enum: ['HEBDOMADAIRE', 'BI_HEBDOMADAIRE', 'MENSUELLE'], required: true },
    nombreMembresCible: { type: Number, required: true, min: 1 },
    moyensPaiementAcceptes: {
      type: [{ type: String, enum: ['CRYPTO', 'MOBILE_MONEY', 'CARTE', 'BANQUE', 'MANUEL'] }],
      default: ['MANUEL'],
    },
    montantLot: { type: Number, required: true, min: 0 },
    nombreTours: { type: Number, required: true, min: 1 },
    dureeSemaines: { type: Number, required: true, min: 1 },
    dateDebutPrevue: { type: Date },
    statut: {
      type: String,
      enum: ['BROUILLON', 'OUVERTE', 'COMPLETE', 'EN_COURS', 'SUSPENDUE', 'CLOTUREE'],
      default: 'OUVERTE',
      index: true,
    },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  },
  { timestamps: true }
);

export default mongoose.models.TontineOffre || mongoose.model<ITontineOffre>('TontineOffre', TontineOffreSchema);
