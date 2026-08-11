import mongoose, { Schema, Document } from "mongoose";

export interface IUser extends Document {
  name: string;
  email: string;
  password?: string;
  slug: string;
  avatar?: string;
  phone?: string;
  role: string;
  emailVerified?: Date;
  isEmailVerified: boolean;
  isActive: boolean;
  lastLogin?: Date;
  loginCount: number;
  loginHistory: {
    ip?: string;
    userAgent?: string;
    location?: string;
    timestamp: Date;
    success: boolean;
  }[];
  activeSessions: {
    id: string;
    ip?: string;
    userAgent?: string;
    lastActive: Date;
    createdAt: Date;
  }[];
  provider: string;
  providerAccountId?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    zip?: string;
  };
  preferences?: {
    language?: string;
    currency?: string;
    timezone?: string;
    emailNotifications?: boolean;
    smsNotifications?: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, select: false },
    slug: { type: String, unique: true, lowercase: true, sparse: true },
    avatar: String,
    phone: String,
    role: { type: String, default: "customer", enum: ["super-admin", "admin", "manager", "staff", "customer"] },
    emailVerified: Date,
    isEmailVerified: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    lastLogin: Date,
    loginCount: { type: Number, default: 0 },
    loginHistory: [{
      ip: String,
      userAgent: String,
      location: String,
      timestamp: { type: Date, default: Date.now },
      success: { type: Boolean, default: true },
    }],
    activeSessions: [{
      id: String,
      ip: String,
      userAgent: String,
      lastActive: { type: Date, default: Date.now },
      createdAt: { type: Date, default: Date.now },
    }],
    provider: { type: String, default: "credentials" },
    providerAccountId: String,
    address: {
      street: String,
      city: String,
      state: String,
      country: String,
      zip: String,
    },
    preferences: {
      language: { type: String, default: "en" },
      currency: { type: String, default: "USD" },
      timezone: String,
      emailNotifications: { type: Boolean, default: true },
      smsNotifications: { type: Boolean, default: false },
    },
  },
  { timestamps: true }
);

UserSchema.index({ role: 1 });

export default mongoose.models.User || mongoose.model<IUser>("User", UserSchema);
