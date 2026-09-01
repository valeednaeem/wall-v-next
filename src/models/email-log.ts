import mongoose, { Schema, Document } from "mongoose";

export interface IEmailLog extends Document {
  to: string;
  subject: string;
  template: string;
  status: "sent" | "failed";
  error?: string;
  sentAt: Date;
}

const EmailLogSchema = new Schema<IEmailLog>(
  {
    to: { type: String, required: true, lowercase: true, trim: true },
    subject: { type: String, required: true },
    template: { type: String, default: "general" },
    status: { type: String, enum: ["sent", "failed"], default: "sent" },
    error: { type: String },
    sentAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

EmailLogSchema.index({ to: 1 });
EmailLogSchema.index({ sentAt: -1 });
EmailLogSchema.index({ template: 1 });

const EmailLog =
  mongoose.models.EmailLog || mongoose.model<IEmailLog>("EmailLog", EmailLogSchema);

export default EmailLog;
