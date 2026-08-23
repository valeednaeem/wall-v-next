import mongoose, { Schema, Document } from "mongoose";

export interface ITask extends Document {
  title: string;
  description?: string;
  project: mongoose.Types.ObjectId;
  stage?: mongoose.Types.ObjectId;
  assignee?: mongoose.Types.ObjectId;
  reporter: mongoose.Types.ObjectId;
  status: "todo" | "in-progress" | "review" | "done" | "cancelled";
  priority: "low" | "medium" | "high" | "urgent";
  dueDate?: Date;
  estimatedHours?: number;
  loggedHours: number;
  dependencies: mongoose.Types.ObjectId[];
  tags: string[];
  attachments: {
    name: string;
    url: string;
  }[];
  comments: {
    user: mongoose.Types.ObjectId;
    content: string;
    createdAt: Date;
  }[];
  subtasks: {
    title: string;
    completed: boolean;
  }[];
  acceptanceCriteria: string[];
  deliverables: {
    name: string;
    url: string;
    type: string;
  }[];
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

const TaskSchema = new Schema<ITask>(
  {
    title: { type: String, required: true, trim: true },
    description: String,
    project: { type: Schema.Types.ObjectId, ref: "Project", required: true },
    stage: { type: Schema.Types.ObjectId, ref: "ProjectStage" },
    assignee: { type: Schema.Types.ObjectId, ref: "User" },
    reporter: { type: Schema.Types.ObjectId, ref: "User", required: true },
    status: {
      type: String,
      enum: ["todo", "in-progress", "review", "done", "cancelled"],
      default: "todo",
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
    },
    dueDate: Date,
    estimatedHours: Number,
    loggedHours: { type: Number, default: 0 },
    dependencies: [{ type: Schema.Types.ObjectId, ref: "Task" }],
    tags: [String],
    attachments: [
      {
        name: String,
        url: String,
      },
    ],
    comments: [
      {
        user: { type: Schema.Types.ObjectId, ref: "User" },
        content: String,
        createdAt: { type: Date, default: Date.now },
      },
    ],
    subtasks: [
      {
        title: String,
        completed: { type: Boolean, default: false },
      },
    ],
    acceptanceCriteria: [String],
    deliverables: [
      {
        name: String,
        url: String,
        type: String,
      },
    ],
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

TaskSchema.index({ project: 1 });
TaskSchema.index({ stage: 1 });
TaskSchema.index({ assignee: 1 });
TaskSchema.index({ status: 1 });

export default mongoose.models.Task ||
  mongoose.model<ITask>("Task", TaskSchema);
