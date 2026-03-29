import mongoose, { Schema, Document } from 'mongoose';

export type CanalTemplate = 'EMAIL' | 'SMS';

export interface ICampaignTemplate extends Document {
  nom: string;
  description?: string;
  canal: CanalTemplate;
  sujet: string;         // Objet email (ou titre SMS)
  contenu: string;       // Corps HTML email ou texte SMS
  categorie: string;     // Ex: "Bienvenue", "Relance", "Promo", "Info"
  usageCount: number;    // Nombre de fois utilisé
  createdAt: Date;
  updatedAt: Date;
}

const CampaignTemplateSchema: Schema = new Schema(
  {
    nom: { type: String, required: true },
    description: { type: String, default: '' },
    canal: { type: String, enum: ['EMAIL', 'SMS'], default: 'EMAIL' },
    sujet: { type: String, required: true },
    contenu: { type: String, required: true },
    categorie: { type: String, default: 'Autre' },
    usageCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.models.CampaignTemplate ||
  mongoose.model<ICampaignTemplate>('CampaignTemplate', CampaignTemplateSchema);
