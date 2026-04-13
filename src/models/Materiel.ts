import mongoose, { Schema, Document } from 'mongoose';

export type CategorieMateriel = 'TELEPHONE' | 'CHARGEUR' | 'CABLE' | 'PC' | 'UC' | 'AUTRE';
export type EtatMateriel = 'FONCTIONNEL' | 'DYSFONCTIONNEL';

export type MaterielHistoryAction = 'CREATED' | 'UPDATED' | 'DELETED';

export interface IMaterielHistoryEntry {
  at: Date;
  action: MaterielHistoryAction;
  categorie: CategorieMateriel;
  categorieAutre?: string;
  nombre: number;
  couleur?: string;
  description?: string;
  etat: EtatMateriel;
  deleted?: boolean;
}

export interface IMateriel extends Document {
  categorie: CategorieMateriel;
  categorieAutre?: string;
  nombre: number;
  couleur?: string;
  description?: string;
  etat: EtatMateriel;
  actif: boolean;
  deletedAt?: Date | null;
  history: IMaterielHistoryEntry[];
  createdAt: Date;
  updatedAt: Date;
}

const MaterielSchema: Schema = new Schema(
  {
    categorie: {
      type: String,
      enum: ['TELEPHONE', 'CHARGEUR', 'CABLE', 'PC', 'UC', 'AUTRE'],
      required: true,
    },
    categorieAutre: { type: String },
    nombre: { type: Number, required: true, default: 1 },
    couleur: { type: String },
    description: { type: String },
    etat: {
      type: String,
      enum: ['FONCTIONNEL', 'DYSFONCTIONNEL'],
      default: 'FONCTIONNEL',
    },
    actif: { type: Boolean, default: true },
    deletedAt: { type: Date, default: null },
    history: [
      {
        at: { type: Date, default: Date.now },
        action: { type: String, enum: ['CREATED', 'UPDATED', 'DELETED'], required: true },
        categorie: { type: String, enum: ['TELEPHONE', 'CHARGEUR', 'CABLE', 'PC', 'UC', 'AUTRE'], required: true },
        categorieAutre: { type: String },
        nombre: { type: Number, required: true, default: 1 },
        couleur: { type: String },
        description: { type: String },
        etat: { type: String, enum: ['FONCTIONNEL', 'DYSFONCTIONNEL'], required: true },
        deleted: { type: Boolean, default: false },
      },
    ],
  },
  { timestamps: true }
);

export default mongoose.models.Materiel ||
  mongoose.model<IMateriel>('Materiel', MaterielSchema);
