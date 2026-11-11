import mongoose, { Schema, Document } from "mongoose";

export interface ILegalVersion extends Document {
  legalPage: mongoose.Types.ObjectId;
  version: string;
  content: string;
  title: string;
  changeNote?: string;
  snapshot: {
    seo?: Record<string, unknown>;
    type: string;
    slug: string;
  };
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
}

const LegalVersionSchema = new Schema<ILegalVersion>(
  {
    legalPage: { type: Schema.Types.ObjectId, ref: "LegalPage", required: true },
    version: { type: String, required: true },
    content: { type: String, required: true },
    title: { type: String, required: true },
    changeNote: String,
    snapshot: Schema.Types.Mixed,
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

LegalVersionSchema.index({ legalPage: 1, version: 1 });
LegalVersionSchema.index({ legalPage: 1, createdAt: -1 });

export default mongoose.models.LegalVersion ||
  mongoose.model<ILegalVersion>("LegalVersion", LegalVersionSchema);
