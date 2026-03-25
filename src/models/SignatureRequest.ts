import mongoose, { Schema, Document } from 'mongoose';

export interface ISignatureRequest extends Document {
  token: string;
  clientId?: mongoose.Types.ObjectId;
  clientNomLibre?: string;
  titreDocument: string;
  typeSource: 'TEMPLATE' | 'UPLOAD';
  templateId?: mongoose.Types.ObjectId;
  fichierPdfUrl?: string; // Si upload Cloudinary
  contenuGele?: string;   // Si HTML issu d'un template, on "fige" les variables
  statut: 'EN_ATTENTE' | 'SIGNE' | 'ANNULE';
  signatureImagePublicId?: string; // Image finale stockée sur cloudinary
  signatureImageUrl?: string;
  dateEnvoi: Date;
  dateSignature?: Date;
  ipSignature?: string;
  createdAt: Date;
  updatedAt: Date;
}

const SignatureRequestSchema = new Schema<ISignatureRequest>({
  token: { type: String, required: true, unique: true },
  clientId: { type: Schema.Types.ObjectId, ref: 'Client' },
  clientNomLibre: { type: String },
  titreDocument: { type: String, required: true },
  typeSource: { type: String, enum: ['TEMPLATE', 'UPLOAD'], required: true },
  templateId: { type: Schema.Types.ObjectId, ref: 'TemplateContrat' },
  fichierPdfUrl: { type: String },
  contenuGele: { type: String },
  statut: { type: String, enum: ['EN_ATTENTE', 'SIGNE', 'ANNULE'], default: 'EN_ATTENTE' },
  signatureImagePublicId: { type: String },
  signatureImageUrl: { type: String },
  dateEnvoi: { type: Date, default: Date.now },
  dateSignature: { type: Date },
  ipSignature: { type: String },
}, { 
  timestamps: true 
});

export default mongoose.models.SignatureRequest || mongoose.model<ISignatureRequest>('SignatureRequest', SignatureRequestSchema);
