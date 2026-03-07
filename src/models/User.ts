import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  name: string;
  email: string;
  password?: string;
  role: 'SUPER_ADMIN' | 'AGENT' | 'ANALYSTE' | 'COMPLIANCE';
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema: Schema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String }, // Utilisé si authentification "credentials"
    role: { 
      type: String, 
      enum: ['SUPER_ADMIN', 'AGENT', 'ANALYSTE', 'COMPLIANCE'],
      default: 'AGENT' 
    },
  },
  { timestamps: true }
);

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
