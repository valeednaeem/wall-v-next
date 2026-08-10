"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckCircle, Clock, Loader2, Eye, CreditCard, MessageSquare, ChevronRight } from "lucide-react";

interface Milestone {
  name: string;
  description?: string;
  amount?: number;
  status: string;
  deliverables?: string[];
  generatedAt?: Date;
  approvedAt?: Date;
  previewUrl?: string;
  version?: number;
  feedback?: {
    content: string;
    rating?: number;
    submittedAt: Date;
  };
}

interface Project {
  _id: string;
  name: string;
  status: string;
  budget: number;
  currency: string;
  progress: number;
  milestones: Milestone[];
  requirements?: {
    projectType?: string;
    features?: string[];
    budget?: string;
    objective?: string;
  };
  client: { name: string; email: string };
}

export default function MilestonesPage() {
  const params = useParams();
  const projectId = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [generatingIndex, setGeneratingIndex] = useState<number | null>(null);
  const [approvingIndex, setApprovingIndex] = useState<number | null>(null);
  const [feedbackIndex, setFeedbackIndex] = useState<number | null>(null);
  const [feedbackText, setFeedbackText] = useState("");
  const [error, setError] = useState("");

  const fetchProject = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}`);
      if (!res.ok) throw new Error("Failed to load project");
      const data = await res.json();
      setProject(data.project || data);
    } catch {
      setError("Failed to load project");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchProject();
  }, [fetchProject]);

  const handleGenerate = async (milestoneIndex: number) => {
    setGeneratingIndex(milestoneIndex);
    try {
      const res = await fetch(`/api/projects/${projectId}/milestones/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ milestoneIndex }),
      });
      if (!res.ok) throw new Error("Failed to generate");
      await fetchProject();
    } catch {
      setError("Failed to generate milestone prototype");
    } finally {
      setGeneratingIndex(null);
    }
  };

  const handleApprove = async (milestoneIndex: number) => {
    setApprovingIndex(milestoneIndex);
    try {
      const res = await fetch(`/api/projects/${projectId}/milestones/${milestoneIndex}/approve`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to approve");
      await fetchProject();
    } catch {
      setError("Failed to approve milestone");
    } finally {
      setApprovingIndex(null);
    }
  };

  const handleFeedback = async (milestoneIndex: number) => {
    if (!feedbackText.trim()) return;
    setFeedbackIndex(milestoneIndex);
    try {
      const res = await fetch(`/api/projects/${projectId}/milestones/${milestoneIndex}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: feedbackText }),
      });
      if (!res.ok) throw new Error("Failed to submit feedback");
      setFeedbackText("");
      await fetchProject();
    } catch {
      setError("Failed to submit feedback");
    } finally {
      setFeedbackIndex(null);
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "completed":
      case "approved":
        return "bg-green-50 text-green-700 border-green-200";
      case "in-progress":
      case "generated":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "review":
        return "bg-yellow-50 text-yellow-700 border-yellow-200";
      case "changes-requested":
        return "bg-orange-50 text-orange-700 border-orange-200";
      default:
        return "bg-gray-50 text-gray-500 border-gray-200";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
      case "approved":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "in-progress":
      case "generated":
        return <Eye className="h-4 w-4 text-blue-500" />;
      case "changes-requested":
        return <MessageSquare className="h-4 w-4 text-orange-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">{error || "Project not found"}</p>
        <Link href="/" className="text-primary hover:underline">Go Home</Link>
      </div>
    );
  }

  const completedCount = project.milestones.filter(
    (m) => m.status === "completed" || m.status === "approved"
  ).length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-5xl mx-auto px-6 py-6">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Dashboard
          </Link>
          <h1 className="text-2xl font-bold">{project.name}</h1>
          <p className="text-muted-foreground mt-1">
            {project.milestones.length} milestones — {completedCount} completed
          </p>

          {/* Progress Bar */}
          <div className="mt-4 max-w-md">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-muted-foreground">Project Progress</span>
              <span className="font-medium">{project.progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-primary rounded-full h-2 transition-all"
                style={{ width: `${project.progress}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Milestones */}
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="space-y-4">
          {project.milestones.map((milestone, index) => (
            <div
              key={index}
              className="bg-white rounded-xl border p-6 hover:shadow-sm transition-shadow"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4 flex-1">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold">{milestone.name}</h3>
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusStyle(milestone.status)}`}>
                        {getStatusIcon(milestone.status)}
                        {milestone.status.replace(/-/g, " ")}
                      </span>
                      {milestone.version && milestone.version > 1 && (
                        <span className="text-xs text-muted-foreground">v{milestone.version}</span>
                      )}
                    </div>
                    {milestone.description && (
                      <p className="text-sm text-muted-foreground mt-1">{milestone.description}</p>
                    )}

                    {/* Deliverables */}
                    {milestone.deliverables && milestone.deliverables.length > 0 && (
                      <div className="mt-3">
                        <p className="text-xs font-medium text-muted-foreground mb-1.5">Deliverables:</p>
                        <div className="flex flex-wrap gap-1.5">
                          {milestone.deliverables.map((d, i) => (
                            <span key={i} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                              {d}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Budget */}
                    {milestone.amount && (
                      <p className="text-sm font-medium mt-2">
                        ${milestone.amount.toLocaleString()}
                      </p>
                    )}

                    {/* Feedback */}
                    {milestone.feedback && (
                      <div className="mt-3 p-3 rounded-lg bg-orange-50 border border-orange-200">
                        <p className="text-xs font-medium text-orange-700 mb-1">Your Feedback:</p>
                        <p className="text-sm text-orange-800">{milestone.feedback.content}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {/* Generate button */}
                  {(milestone.status === "pending" || milestone.status === "in-progress" || milestone.status === "changes-requested") && (
                    <button
                      onClick={() => handleGenerate(index)}
                      disabled={generatingIndex === index}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                    >
                      {generatingIndex === index ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                      Generate
                    </button>
                  )}

                  {/* View button */}
                  {(milestone.status === "generated" || milestone.status === "review") && milestone.previewUrl && (
                    <Link
                      href={milestone.previewUrl}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
                    >
                      <Eye className="h-4 w-4" />
                      View
                    </Link>
                  )}

                  {/* Approve button */}
                  {(milestone.status === "generated" || milestone.status === "review") && (
                    <button
                      onClick={() => handleApprove(index)}
                      disabled={approvingIndex === index}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-green-500 text-white text-sm font-medium hover:bg-green-600 transition-colors disabled:opacity-50"
                    >
                      {approvingIndex === index ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle className="h-4 w-4" />
                      )}
                      Approve
                    </button>
                  )}

                  {/* Checkout button */}
                  {(milestone.status === "completed" || milestone.status === "approved") && (
                    <Link
                      href={`/checkout/${project._id}`}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-green-500 text-white text-sm font-medium hover:bg-green-600 transition-colors"
                    >
                      <CreditCard className="h-4 w-4" />
                      Checkout
                    </Link>
                  )}
                </div>
              </div>

              {/* Feedback Form */}
              {(milestone.status === "generated" || milestone.status === "review") && (
                <div className="mt-4 pt-4 border-t">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={feedbackIndex === index ? feedbackText : ""}
                      onChange={(e) => {
                        setFeedbackIndex(index);
                        setFeedbackText(e.target.value);
                      }}
                      onFocus={() => setFeedbackIndex(index)}
                      placeholder="Request changes or leave feedback..."
                      className="flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                    <button
                      onClick={() => handleFeedback(index)}
                      disabled={!feedbackText.trim() || feedbackIndex === index}
                      className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
                    >
                      Send
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Budget Summary */}
        <div className="mt-8 bg-white rounded-xl border p-6">
          <h2 className="text-lg font-semibold mb-4">Budget Summary</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Total Budget</p>
              <p className="text-lg font-bold">${project.budget.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Milestones</p>
              <p className="text-lg font-bold">{project.milestones.length}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Completed</p>
              <p className="text-lg font-bold text-green-600">{completedCount}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Remaining</p>
              <p className="text-lg font-bold">{project.milestones.length - completedCount}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
