import mongoose, { Document, Schema } from 'mongoose';

export interface ICompanySite extends Document {
  name: string;
  publicUrl?: string;
  adminUrl?: string;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

const CompanySiteSchema = new Schema<ICompanySite>(
  {
    name: { type: String, required: true, trim: true },
    publicUrl: { type: String, default: '', trim: true },
    adminUrl: { type: String, default: '', trim: true },
    order: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.CompanySite || mongoose.model<ICompanySite>('CompanySite', CompanySiteSchema);
