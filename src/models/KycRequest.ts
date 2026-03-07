import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IKycRequest extends Document {
  token: string;
  clientId?: Types.ObjectId;
  nom: string;
  prenom: string;
  email: string;
  telephone?: string;
  photoIdUrl?: string;
  photoIdPublicId?: string;
  selfieUrl?: string;
  selfiePublicId?: string;
  statutKyc: 'EN_ATTENTE' | 'VALIDE' | 'REJETE';
  politiqueAcceptee: boolean;
  notesAdmin?: string;
  dateSubmission?: Date;
  dateValidation?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const KycRequestSchema: Schema = new Schema(
  {
    token: { type: String, required: true, unique: true },
    clientId: { type: Schema.Types.ObjectId, ref: 'Client' },
    nom: { type: String, default: '' },
    prenom: { type: String, default: '' },
    email: { type: String, default: '' },
    telephone: { type: String },
    photoIdUrl: { type: String },
    photoIdPublicId: { type: String },
    selfieUrl: { type: String },
    selfiePublicId: { type: String },
    statutKyc: {
      type: String,
      enum: ['EN_ATTENTE', 'VALIDE', 'REJETE'],
      default: 'EN_ATTENTE'
    },
    politiqueAcceptee: { type: Boolean, default: false },
    notesAdmin: { type: String },
    dateSubmission: { type: Date },
    dateValidation: { type: Date },
  },
  { timestamps: true }
);

export default mongoose.models.KycRequest || mongoose.model<IKycRequest>('KycRequest', KycRequestSchema);
