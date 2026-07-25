"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ExternalLink, CreditCard, Loader2, CheckCircle } from "lucide-react";

interface ProjectData {
  id: string;
  name: string;
  description: string;
  status: string;
  demoHTML: string;
  demoId: string;
  requirements: {
    projectType?: string;
    features?: string[];
    budget?: string;
    timeline?: string;
  };
  quote: {
    min: number;
    max: number;
    currency: string;
  };
  client: {
    name: string;
    email: string;
  };
  language: string;
}

export default function PreviewPage() {
  const params = useParams();
  const router = useRouter();
  const [project, setProject] = useState<ProjectData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/projects/preview/${params.id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setProject(d.data);
        else setError(d.error || "Project not found");
      })
      .catch(() => setError("Failed to load preview"))
      .finally(() => setLoading(false));
  }, [params.id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading your demo...</p>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-lg font-semibold mb-2">Demo Not Found</p>
          <p className="text-muted-foreground mb-4">{error || "This demo may have expired."}</p>
          <Link href="/" className="text-primary hover:underline">Go back home</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Bar */}
      <div className="bg-white border-b sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => router.back()} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
            <div className="h-6 w-px bg-border" />
            <div>
              <h1 className="text-sm font-semibold">{project.name}</h1>
              <p className="text-xs text-muted-foreground">Demo Preview</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 text-xs bg-green-50 text-green-700 px-2.5 py-1 rounded-full font-medium">
              <CheckCircle className="h-3 w-3" />
              Demo Ready
            </span>
            <Link
              href={`/checkout/${project.id}`}
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2 rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors"
            >
              <CreditCard className="h-4 w-4" />
              Proceed to Checkout
            </Link>
          </div>
        </div>
      </div>

      {/* Demo iframe */}
      <div className="max-w-7xl mx-auto p-4">
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <div className="bg-gray-100 px-4 py-2 flex items-center gap-2 border-b">
            <div className="flex gap-1.5">
              <div className="h-3 w-3 rounded-full bg-red-400" />
              <div className="h-3 w-3 rounded-full bg-yellow-400" />
              <div className="h-3 w-3 rounded-full bg-green-400" />
            </div>
            <div className="flex-1 text-center">
              <span className="text-xs text-muted-foreground bg-white px-3 py-1 rounded-md border">
                wall-v.com/preview/{project.demoId}
              </span>
            </div>
            <a href={`/checkout/${project.id}`} className="text-xs text-primary hover:underline flex items-center gap-1">
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
          <iframe
            srcDoc={project.demoHTML}
            className="w-full border-0"
            style={{ height: "calc(100vh - 200px)", minHeight: "600px" }}
            title="Demo Preview"
          />
        </div>
      </div>

      {/* Project Details */}
      <div className="max-w-7xl mx-auto p-4 mt-4">
        <div className="grid md:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border p-5">
            <h3 className="font-semibold text-sm mb-3">Project Details</h3>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Type</dt>
                <dd className="font-medium capitalize">{project.requirements?.projectType?.replace(/-/g, " ") || "N/A"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Timeline</dt>
                <dd className="font-medium">{project.requirements?.timeline || "Flexible"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Client</dt>
                <dd className="font-medium">{project.client?.name}</dd>
              </div>
            </dl>
          </div>
          <div className="bg-white rounded-xl border p-5">
            <h3 className="font-semibold text-sm mb-3">Features Included</h3>
            <div className="flex flex-wrap gap-1.5">
              {project.requirements?.features?.map((f) => (
                <span key={f} className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">{f}</span>
              )) || <span className="text-xs text-muted-foreground">No features specified</span>}
            </div>
          </div>
          <div className="bg-white rounded-xl border p-5">
            <h3 className="font-semibold text-sm mb-3">Estimated Quote</h3>
            <div className="text-center py-2">
              <p className="text-3xl font-bold text-primary">
                ${project.quote?.min?.toLocaleString()} - ${project.quote?.max?.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground mt-1">USD estimated range</p>
            </div>
            <Link
              href={`/checkout/${project.id}`}
              className="mt-3 w-full inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground py-2.5 rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors"
            >
              <CreditCard className="h-4 w-4" />
              Pay Now
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
