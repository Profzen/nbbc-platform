import mongoose, { Schema, Document } from 'mongoose';

export type DepotType = 'DEPOT' | 'RETRAIT';

export interface IDepotRetrait extends Document {
  type: DepotType;    // DEPOT ou RETRAIT
  date: Date;
  montant: number;    // En FCFA
  quantite?: number;
  montantUnitaire?: number;
  operateur: string;  // Ex: "Flooz", "Mux", "Virement", "Cash"
  compteId?: mongoose.Types.ObjectId;  // Compte concerné (optionnel)
  compteDebitId?: mongoose.Types.ObjectId;
  compteCreditId?: mongoose.Types.ObjectId;
  description?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const DepotRetraitSchema = new Schema<IDepotRetrait>({
  type: { type: String, enum: ['DEPOT', 'RETRAIT'], required: true },
  date: { type: Date, required: true, default: Date.now },
  montant: { type: Number, required: true },
  quantite: { type: Number, default: 1 },
  montantUnitaire: { type: Number },
  operateur: { type: String, required: true },
  compteId: { type: Schema.Types.ObjectId, ref: 'Compte' },
  compteDebitId: { type: Schema.Types.ObjectId, ref: 'Compte' },
  compteCreditId: { type: Schema.Types.ObjectId, ref: 'Compte' },
  description: { type: String },
  notes: { type: String },
}, {
  timestamps: true
});

export default mongoose.models.DepotRetrait || mongoose.model<IDepotRetrait>('DepotRetrait', DepotRetraitSchema);
