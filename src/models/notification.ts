import mongoose, { Schema, Document } from "mongoose";

export interface INotification extends Document {
  user: mongoose.Types.ObjectId;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
  link?: string;
  read: boolean;
  createdAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: { type: String, enum: ["info", "success", "warning", "error"], default: "info" },
    link: String,
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

NotificationSchema.index({ user: 1 });
NotificationSchema.index({ read: 1 });

export default mongoose.models.Notification ||
  mongoose.model<INotification>("Notification", NotificationSchema);
