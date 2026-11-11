import mongoose, { Schema, Document } from "mongoose";

export interface IAIToolTag extends Document {
  name: string;
  slug: string;
  toolCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const AIToolTagSchema = new Schema<IAIToolTag>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    toolCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.models.AIToolTag ||
  mongoose.model<IAIToolTag>("AIToolTag", AIToolTagSchema);
