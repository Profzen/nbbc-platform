import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IGroupeClient extends Document {
  nom: string;
  description?: string;
  couleur: string;
  clientIds: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const GroupeClientSchema: Schema = new Schema(
  {
    nom: { type: String, required: true },
    description: { type: String },
    couleur: { type: String, default: '#6366f1' },
    clientIds: [{ type: Schema.Types.ObjectId, ref: 'Client' }],
  },
  { timestamps: true }
);

export default mongoose.models.GroupeClient ||
  mongoose.model<IGroupeClient>('GroupeClient', GroupeClientSchema);
