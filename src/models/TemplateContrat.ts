import mongoose, { Schema, Document } from 'mongoose';

export interface ITemplateContrat extends Document {
  nom: string;
  contenuHtml: string;
  actif: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const TemplateContratSchema = new Schema<ITemplateContrat>({
  nom: { type: String, required: true },
  contenuHtml: { type: String, required: true },
  actif: { type: Boolean, default: true },
}, { 
  timestamps: true 
});

export default mongoose.models.TemplateContrat || mongoose.model<ITemplateContrat>('TemplateContrat', TemplateContratSchema);
