import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IClient extends Document {
  nom: string;
  prenom: string;
  dateNaissance?: Date;
  email: string;
  telephone?: string;
  adresse?: string;
  paysResidence: string;
  
  statutKyc: 'EN_ATTENTE' | 'VALIDE' | 'REJETE';
  niveauRisque: 'FAIBLE' | 'MOYEN' | 'ELEVE';
  typeClient: 'PARTICULIER' | 'ENTREPRISE' | 'INVESTISSEUR' | 'PARTENAIRE';
  
  servicesUtilises: string[];
  statutCompte: 'ACTIF' | 'SUSPENDU' | 'EN_ATTENTE';
  
  agentAssigne?: Types.ObjectId;
  documents?: {
    nom: string;
    url: string;
    format: string;
    publicId: string;
    dateRecep: Date;
    status: 'VALIDE' | 'EN_ATTENTE' | 'REJETE';
  }[];
  createdAt: Date;
  updatedAt: Date;
}

const ClientSchema: Schema = new Schema(
  {
    nom: { type: String, required: true },
    prenom: { type: String, required: true },
    dateNaissance: { type: Date },
    email: { type: String, required: true, unique: true },
    telephone: { type: String },
    adresse: { type: String },
    paysResidence: { type: String, required: true },
    
    statutKyc: { 
      type: String, 
      enum: ['EN_ATTENTE', 'VALIDE', 'REJETE'], 
      default: 'EN_ATTENTE' 
    },
    niveauRisque: { 
      type: String, 
      enum: ['FAIBLE', 'MOYEN', 'ELEVE'], 
      default: 'FAIBLE' 
    },
    typeClient: { 
      type: String, 
      enum: ['PARTICULIER', 'ENTREPRISE', 'INVESTISSEUR', 'PARTENAIRE'], 
      default: 'PARTICULIER' 
    },
    
    servicesUtilises: [{ 
      type: String,
      enum: ['ZELLE', 'CASH_APP', 'WIRE', 'PAYPAL', 'CRYPTO', 'EURO', 'WISE', 'AUTRE']
    }],
    
    statutCompte: { 
      type: String, 
      enum: ['ACTIF', 'SUSPENDU', 'EN_ATTENTE'], 
      default: 'EN_ATTENTE' 
    },
    
    agentAssigne: { type: Schema.Types.ObjectId, ref: 'User' },
    
    documents: [{
      nom: { type: String, required: true },
      url: { type: String, required: true },
      format: { type: String },
      publicId: { type: String, required: true }, // ID Cloudinary
      dateRecep: { type: Date, default: Date.now },
      status: { 
        type: String, 
        enum: ['VALIDE', 'EN_ATTENTE', 'REJETE'], 
        default: 'EN_ATTENTE' 
      }
    }]
  },
  { timestamps: true }
);

export default mongoose.models.Client || mongoose.model<IClient>('Client', ClientSchema);
