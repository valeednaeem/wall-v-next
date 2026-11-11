import mongoose, { Schema, Document } from "mongoose";

export interface ICommunication extends Document {
  type: "email" | "whatsapp" | "sms" | "internal";
  from: mongoose.Types.ObjectId;
  to: mongoose.Types.ObjectId;
  subject?: string;
  content: string;
  status: "sent" | "delivered" | "read" | "failed";
  relatedTo?: {
    model: string;
    id: mongoose.Types.ObjectId;
  };
  attachments: string[];
  createdAt: Date;
}

const CommunicationSchema = new Schema<ICommunication>(
  {
    type: { type: String, enum: ["email", "whatsapp", "sms", "internal"], required: true },
    from: { type: Schema.Types.ObjectId, ref: "User", required: true },
    to: { type: Schema.Types.ObjectId, ref: "User", required: true },
    subject: String,
    content: { type: String, required: true },
    status: {
      type: String,
      enum: ["sent", "delivered", "read", "failed"],
      default: "sent",
    },
    relatedTo: {
      model: String,
      id: { type: Schema.Types.ObjectId },
    },
    attachments: [String],
  },
  { timestamps: true }
);

CommunicationSchema.index({ from: 1 });
CommunicationSchema.index({ to: 1 });
CommunicationSchema.index({ createdAt: -1 });

export default mongoose.models.Communication ||
  mongoose.model<ICommunication>("Communication", CommunicationSchema);
