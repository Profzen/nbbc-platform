import mongoose, { Schema, Document } from 'mongoose';

export interface ICompte extends Document {
  nom: string;       // Ex: "Caisse", "Compte Bancaire BNI", "Orange Money"
  type: string;      // Ex: "Espèces", "Banque", "Mobile Money"
  solde: number;     // Compat legacy
  devise?: string;
  tauxFCFA?: number;
  soldeInitialUnites?: number;
  ordre?: number;
  description?: string;
  couleur?: string;  // Pour l'affichage UI
  actif: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CompteSchema = new Schema<ICompte>({
  nom: { type: String, required: true },
  type: { type: String, enum: ['Espèces', 'Banque', 'Mobile Money', 'Chèque', 'Autre'], default: 'Espèces' },
  solde: { type: Number, default: 0 },
  devise: { type: String, enum: ['FCFA', 'USD', 'EUR', 'AUTRE'], default: 'FCFA' },
  tauxFCFA: { type: Number, default: 1 },
  soldeInitialUnites: { type: Number, default: 0 },
  ordre: { type: Number, default: 0 },
  description: { type: String },
  couleur: { type: String, default: '#6366f1' },
  actif: { type: Boolean, default: true },
}, {
  timestamps: true
});

export default mongoose.models.Compte || mongoose.model<ICompte>('Compte', CompteSchema);
