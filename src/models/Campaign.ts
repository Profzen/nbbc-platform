import mongoose, { Schema, Document } from 'mongoose';

export interface ICampaign extends Document {
  titre: string;
  sujet: string;         // Objet de l'email
  contenu: string;       // Corps HTML de l'email
  cible: 'TOUS' | 'PARTICULIER' | 'ENTREPRISE' | 'INVESTISSEUR' | 'PARTENAIRE';
  statut: 'BROUILLON' | 'ENVOYE' | 'ECHEC';
  nombreDestinataires: number;
  nombreEnvoyes: number;
  nombreEchecs: number;
  dateEnvoi?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const CampaignSchema: Schema = new Schema(
  {
    titre: { type: String, required: true },
    sujet: { type: String, required: true },
    contenu: { type: String, required: true },
    cible: {
      type: String,
      enum: ['TOUS', 'PARTICULIER', 'ENTREPRISE', 'INVESTISSEUR', 'PARTENAIRE'],
      default: 'TOUS'
    },
    statut: {
      type: String,
      enum: ['BROUILLON', 'ENVOYE', 'ECHEC'],
      default: 'BROUILLON'
    },
    nombreDestinataires: { type: Number, default: 0 },
    nombreEnvoyes: { type: Number, default: 0 },
    nombreEchecs: { type: Number, default: 0 },
    dateEnvoi: { type: Date }
  },
  { timestamps: true }
);

export default mongoose.models.Campaign || mongoose.model<ICampaign>('Campaign', CampaignSchema);
