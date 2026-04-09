import mongoose, { Schema, Document } from 'mongoose';

export type CategorieMateriel = 'TELEPHONE' | 'CHARGEUR' | 'CABLE' | 'PC' | 'UC' | 'AUTRE';
export type EtatMateriel = 'FONCTIONNEL' | 'DYSFONCTIONNEL';

export interface IMateriel extends Document {
  categorie: CategorieMateriel;
  categorieAutre?: string;
  nombre: number;
  couleur?: string;
  description?: string;
  etat: EtatMateriel;
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
  },
  { timestamps: true }
);

export default mongoose.models.Materiel ||
  mongoose.model<IMateriel>('Materiel', MaterielSchema);
