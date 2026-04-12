import mongoose from 'mongoose';

const DeliveryLogSchema = new mongoose.Schema(
  {
    campaign: { type: mongoose.Schema.Types.ObjectId, ref: 'Campaign', required: true },
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
    email: { type: String, required: true },
    status: { type: String, enum: ['SENT', 'ACCEPTED', 'DELIVERED', 'IN_PROCESS', 'BLOCKED', 'FAILED', 'BOUNCED', 'OPENED', 'CLICKED'], default: 'SENT' },
    errorMessage: { type: String, default: null },
    provider: { type: String, default: null },
    messageId: { type: String, default: null },
    traceStatus: { type: String, default: null },
    traceRoute: { type: String, default: null },
    tracedAt: { type: Date, default: null },
    sentAt: { type: Date, default: Date.now },
    openedAt: { type: Date, default: null },
    clickedAt: { type: Date, default: null },
    metadata: { type: Object, default: {} },
  },
  { timestamps: true }
);

DeliveryLogSchema.index({ campaign: 1, status: 1 });
DeliveryLogSchema.index({ recipient: 1, sentAt: -1 });
DeliveryLogSchema.index({ sentAt: -1 });

export default mongoose.models.DeliveryLog || mongoose.model('DeliveryLog', DeliveryLogSchema);
