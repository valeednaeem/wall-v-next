"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckCircle, Loader2, MessageSquare, ExternalLink } from "lucide-react";

interface Project {
  _id: string;
  name: string;
  status: string;
  demoHTML?: string;
  demoId?: string;
  milestones: {
    name: string;
    description?: string;
    status: string;
    previewUrl?: string;
    version?: number;
  }[];
}

export default function MilestonePreviewPage() {
  const params = useParams();
  const projectId = params.id as string;
  const milestoneIndex = parseInt(params.milestoneIndex as string, 10);

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(false);
  const [approved, setApproved] = useState(false);

  const fetchProject = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}`);
      if (!res.ok) throw new Error("Failed to load project");
      const data = await res.json();
      setProject(data.project || data);
    } catch {
      // error
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchProject();
  }, [fetchProject]);

  const handleApprove = async () => {
    setApproving(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/milestones/${milestoneIndex}/approve`, {
        method: "POST",
      });
      if (res.ok) {
        setApproved(true);
        await fetchProject();
      }
    } catch {
      // error
    } finally {
      setApproving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!project || isNaN(milestoneIndex) || milestoneIndex >= project.milestones.length) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Milestone not found</p>
        <Link href="/" className="text-primary hover:underline">Go Home</Link>
      </div>
    );
  }

  const milestone = project.milestones[milestoneIndex];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Bar */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href={`/projects/${projectId}/milestones`}
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Milestones
            </Link>
            <div className="h-4 w-px bg-gray-200" />
            <div>
              <h1 className="text-sm font-semibold">{milestone.name}</h1>
              <p className="text-xs text-muted-foreground">
                Milestone {milestoneIndex + 1} of {project.milestones.length}
                {milestone.version && ` — Version ${milestone.version}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {(milestone.status === "generated" || milestone.status === "review") && !approved && (
              <button
                onClick={handleApprove}
                disabled={approving}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-green-500 text-white text-sm font-medium hover:bg-green-600 transition-colors disabled:opacity-50"
              >
                {approving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4" />
                )}
                Approve Milestone
              </button>
            )}
            {approved && (
              <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-green-50 text-green-700 text-sm font-medium border border-green-200">
                <CheckCircle className="h-4 w-4" />
                Approved
              </span>
            )}
            <Link
              href={`/projects/${projectId}/milestones`}
              className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              All Milestones
            </Link>
          </div>
        </div>
      </div>

      {/* Preview Frame */}
      {project.demoHTML ? (
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="bg-white rounded-xl border overflow-hidden shadow-sm">
            <iframe
              srcDoc={project.demoHTML}
              className="w-full border-0"
              style={{ height: "calc(100vh - 140px)", minHeight: "600px" }}
              title={`${milestone.name} Preview`}
            />
          </div>
        </div>
      ) : (
        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="bg-white rounded-xl border p-12 text-center">
            <p className="text-muted-foreground mb-4">No preview available for this milestone yet.</p>
            <Link
              href={`/projects/${projectId}/milestones`}
              className="text-primary hover:underline text-sm"
            >
              Go back to milestones
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
