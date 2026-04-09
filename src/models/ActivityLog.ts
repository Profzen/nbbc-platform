import mongoose, { Schema, Document } from 'mongoose';

export interface IActivityLog extends Document {
  action: string;
  detail?: string;
  userId?: string;
  userName?: string;
  userRole?: string;
  ip?: string;
  createdAt: Date;
}

const ActivityLogSchema: Schema = new Schema(
  {
    action: { type: String, required: true },
    detail: { type: String },
    userId: { type: String },
    userName: { type: String },
    userRole: { type: String },
    ip: { type: String },
  },
  { timestamps: true }
);

ActivityLogSchema.index({ createdAt: -1 });

export default mongoose.models.ActivityLog ||
  mongoose.model<IActivityLog>('ActivityLog', ActivityLogSchema);
