import mongoose, { Schema, Document } from 'mongoose';

export interface IComptaDailyReport extends Document {
  reportDate: string;
  recipient: string;
  sentAt: Date;
  attachmentsCount: number;
  status: 'SENT' | 'FAILED';
  errorMessage?: string;
}

const ComptaDailyReportSchema = new Schema<IComptaDailyReport>(
  {
    reportDate: { type: String, required: true, unique: true },
    recipient: { type: String, required: true },
    sentAt: { type: Date, default: Date.now },
    attachmentsCount: { type: Number, default: 0 },
    status: { type: String, enum: ['SENT', 'FAILED'], default: 'SENT' },
    errorMessage: { type: String, default: null },
  },
  { timestamps: true }
);

ComptaDailyReportSchema.index({ reportDate: 1 }, { unique: true });

export default mongoose.models.ComptaDailyReport || mongoose.model<IComptaDailyReport>('ComptaDailyReport', ComptaDailyReportSchema);
