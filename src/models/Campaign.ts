import mongoose, { Schema, Document, Types } from 'mongoose';

// Comment cibler les destinataires
export type CibleType = 'TOUS' | 'TYPE_CLIENT' | 'GROUPES' | 'SELECTIONNES';
// Channel d'envoi (SMS pour usage futur)
export type Canal = 'EMAIL' | 'SMS';

export interface ICampaign extends Document {
  titre: string;
  sujet: string;
  contenu: string;
  canal: Canal;
  // Ancienne cible (type de client) — conservée pour compatibilité
  cible: 'TOUS' | 'PARTICULIER' | 'ENTREPRISE' | 'INVESTISSEUR' | 'PARTENAIRE';
  // Nouveau mode de ciblage
  cibleType: CibleType;
  groupeIds: Types.ObjectId[];        // si cibleType = GROUPES
  destinataireIds: Types.ObjectId[];  // si cibleType = SELECTIONNES
  statut: 'BROUILLON' | 'ENVOYE' | 'ECHEC';
  nombreDestinataires: number;
  nombreEnvoyes: number;
  nombreEchecs: number;
  smsStatusSummary?: {
    accepted: number;
    delivered: number;
    inProcess: number;
    blocked: number;
    failed: number;
    unknown: number;
  };
  dateEnvoi?: Date;
  // Envoi programmé
  isScheduled: boolean;
  scheduledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const CampaignSchema: Schema = new Schema(
  {
    titre: { type: String, required: true },
    sujet: { type: String, default: '' },
    contenu: { type: String, required: true },
    canal: { type: String, enum: ['EMAIL', 'SMS'], default: 'EMAIL' },
    cible: {
      type: String,
      enum: ['TOUS', 'PARTICULIER', 'ENTREPRISE', 'INVESTISSEUR', 'PARTENAIRE'],
      default: 'TOUS'
    },
    cibleType: {
      type: String,
      enum: ['TOUS', 'TYPE_CLIENT', 'GROUPES', 'SELECTIONNES'],
      default: 'TOUS'
    },
    groupeIds: [{ type: Schema.Types.ObjectId, ref: 'GroupeClient' }],
    destinataireIds: [{ type: Schema.Types.ObjectId, ref: 'Client' }],
    statut: {
      type: String,
      enum: ['BROUILLON', 'ENVOYE', 'ECHEC'],
      default: 'BROUILLON'
    },
    nombreDestinataires: { type: Number, default: 0 },
    nombreEnvoyes: { type: Number, default: 0 },
    nombreEchecs: { type: Number, default: 0 },
    smsStatusSummary: {
      accepted: { type: Number, default: 0 },
      delivered: { type: Number, default: 0 },
      inProcess: { type: Number, default: 0 },
      blocked: { type: Number, default: 0 },
      failed: { type: Number, default: 0 },
      unknown: { type: Number, default: 0 },
    },
    dateEnvoi: { type: Date },
    isScheduled: { type: Boolean, default: false },
    scheduledAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export default mongoose.models.Campaign || mongoose.model<ICampaign>('Campaign', CampaignSchema);
