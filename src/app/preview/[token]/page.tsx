"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, CreditCard, Loader2, Clock, Shield,
  AlertTriangle, CheckCircle, Eye, EyeOff
} from "lucide-react";

interface PreviewData {
  previewId: string;
  projectId: string;
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
  expiresAt: string;
  accessCount: number;
  maxAccesses: number;
  paymentRequired: boolean;
}

function formatTimeLeft(ms: number): string {
  if (ms <= 0) return "00:00";
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export default function PreviewPage() {
  const params = useParams();
  const router = useRouter();
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [errorType, setErrorType] = useState<string>("");
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [expired, setExpired] = useState(false);
  const [showContent, setShowContent] = useState(true);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Countdown timer
  useEffect(() => {
    if (!preview?.expiresAt) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const expires = new Date(preview.expiresAt).getTime();
      const remaining = expires - now;

      if (remaining <= 0) {
        setExpired(true);
        setTimeLeft(0);
        clearInterval(interval);
      } else {
        setTimeLeft(remaining);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [preview?.expiresAt]);

  // Fetch preview data
  useEffect(() => {
    const token = params.token as string;
    if (!token) {
      setError("Invalid preview link");
      setLoading(false);
      return;
    }

    fetch(`/api/previews/${token}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setPreview(d.data);
          // Calculate initial time left
          const expires = new Date(d.data.expiresAt).getTime();
          const remaining = expires - Date.now();
          if (remaining <= 0) {
            setExpired(true);
          } else {
            setTimeLeft(remaining);
          }
        } else {
          setError(d.message || d.error || "Preview not found");
          setErrorType(d.error || "not_found");
          if (d.projectId) {
            // Store projectId for checkout link
            setPreview({ projectId: d.projectId } as PreviewData);
          }
        }
      })
      .catch(() => setError("Failed to load preview"))
      .finally(() => setLoading(false));
  }, [params.token]);

  // Security: Disable right-click
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      return false;
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Disable common download/copy shortcuts
      if (
        (e.ctrlKey && e.key === "s") ||
        (e.ctrlKey && e.key === "u") ||
        (e.ctrlKey && e.shiftKey && e.key === "I") ||
        (e.ctrlKey && e.shiftKey && e.key === "J") ||
        (e.ctrlKey && e.key === "p")
      ) {
        e.preventDefault();
        return false;
      }
    };

    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // Security: Blur content when window loses focus
  useEffect(() => {
    const handleBlur = () => setShowContent(false);
    const handleFocus = () => setShowContent(true);

    window.addEventListener("blur", handleBlur);
    window.addEventListener("focus", handleFocus);

    return () => {
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("focus", handleFocus);
    };
  }, []);

  const getCheckoutUrl = useCallback(() => {
    if (preview?.projectId) {
      return `/checkout/${preview.projectId}`;
    }
    return "/";
  }, [preview?.projectId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading secure preview...</p>
        </div>
      </div>
    );
  }

  if (expired) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md mx-auto text-center p-8">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Clock className="h-8 w-8 text-amber-600" />
          </div>
          <h1 className="text-2xl font-bold mb-3">Preview Expired</h1>
          <p className="text-muted-foreground mb-6">
            This preview has expired. Your project preview was provided for temporary evaluation.
            Proceed to checkout to continue with your project.
          </p>
          <Link
            href={getCheckoutUrl()}
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors"
          >
            <CreditCard className="h-4 w-4" />
            Proceed to Checkout
          </Link>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md mx-auto text-center p-8">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertTriangle className="h-8 w-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold mb-3">
            {errorType === "revoked" ? "Preview Revoked" :
             errorType === "paid" ? "Project Paid" :
             errorType === "max_accesses" ? "Access Limit Reached" :
             "Preview Not Found"}
          </h1>
          <p className="text-muted-foreground mb-6">{error}</p>
          {preview?.projectId ? (
            <Link
              href={getCheckoutUrl()}
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors"
            >
              <CreditCard className="h-4 w-4" />
              Proceed to Checkout
            </Link>
          ) : (
            <Link
              href="/"
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors"
            >
              Go to Homepage
            </Link>
          )}
        </div>
      </div>
    );
  }

  if (!preview) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-lg font-semibold mb-2">Preview Not Found</p>
          <Link href="/" className="text-primary hover:underline">Go back home</Link>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-gray-50"
      style={{
        userSelect: "none",
        WebkitUserSelect: "none",
        MozUserSelect: "none",
        msUserSelect: "none",
      }}
    >
      {/* Print Protection Styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          .preview-content, .preview-content * {
            visibility: hidden !important;
          }
          .print-blocker {
            display: block !important;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: white;
            z-index: 99999;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
            font-weight: bold;
            color: #333;
          }
        }
        .preview-content {
          -webkit-touch-callout: none;
        }
        img {
          -webkit-user-drag: none;
          user-drag: none;
          pointer-events: none;
        }
      `}</style>

      {/* Print Blocker */}
      <div className="print-blocker hidden" />

      {/* Top Bar */}
      <div className="bg-white border-b sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
            <div className="h-6 w-px bg-border" />
            <div>
              <h1 className="text-sm font-semibold">{preview.name}</h1>
              <p className="text-xs text-muted-foreground">Secure Demo Preview</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Expiration Timer */}
            <div className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium ${
              timeLeft < 60000
                ? "bg-red-50 text-red-700 animate-pulse"
                : timeLeft < 180000
                  ? "bg-amber-50 text-amber-700"
                  : "bg-green-50 text-green-700"
            }`}>
              <Clock className="h-3 w-3" />
              {formatTimeLeft(timeLeft)}
            </div>
            {/* Access Count */}
            <div className="flex items-center gap-1.5 text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full font-medium">
              <Eye className="h-3 w-3" />
              {preview.accessCount}/{preview.maxAccesses}
            </div>
            {/* Security Badge */}
            <div className="flex items-center gap-1.5 text-xs bg-purple-50 text-purple-700 px-2.5 py-1 rounded-full font-medium">
              <Shield className="h-3 w-3" />
              Secured
            </div>
            <Link
              href={getCheckoutUrl()}
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2 rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors"
            >
              <CreditCard className="h-4 w-4" />
              Proceed to Checkout
            </Link>
          </div>
        </div>
      </div>

      {/* Watermark Overlay */}
      <div className="fixed inset-0 pointer-events-none z-50" aria-hidden="true">
        <div className="absolute top-4 left-4 text-black/5 text-6xl font-black rotate-[-15deg] select-none">
          WALL-V DEMO
        </div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-black/5 text-8xl font-black select-none">
          PREVIEW
        </div>
        <div className="absolute bottom-4 right-4 text-black/5 text-4xl font-black rotate-[15deg] select-none">
          CONFIDENTIAL
        </div>
        <div className="absolute top-1/4 right-1/4 text-black/3 text-5xl font-black rotate-[-45deg] select-none">
          NOT FOR DISTRIBUTION
        </div>
        <div className="absolute bottom-1/4 left-1/4 text-black/3 text-5xl font-black rotate-[45deg] select-none">
          TEMPORARY ACCESS
        </div>
      </div>

      {/* Demo iframe */}
      <div className="max-w-7xl mx-auto p-4 preview-content">
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <div className="bg-gray-100 px-4 py-2 flex items-center gap-2 border-b">
            <div className="flex gap-1.5">
              <div className="h-3 w-3 rounded-full bg-red-400" />
              <div className="h-3 w-3 rounded-full bg-yellow-400" />
              <div className="h-3 w-3 rounded-full bg-green-400" />
            </div>
            <div className="flex-1 text-center">
              <span className="text-xs text-muted-foreground bg-white px-3 py-1 rounded-md border">
                wall-v.com/preview/{preview.previewId}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-amber-600 font-medium">
                Expires in {formatTimeLeft(timeLeft)}
              </span>
            </div>
          </div>
          {showContent && preview.demoHTML ? (
            <iframe
              ref={iframeRef}
              srcDoc={preview.demoHTML}
              className="w-full border-0"
              style={{ height: "calc(100vh - 200px)", minHeight: "600px" }}
              title="Demo Preview"
              sandbox="allow-scripts allow-same-origin"
            />
          ) : (
            <div className="w-full flex items-center justify-center bg-gray-50" style={{ height: "calc(100vh - 200px)", minHeight: "600px" }}>
              <div className="text-center">
                <EyeOff className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-muted-foreground">Preview content paused (window not focused)</p>
                <p className="text-xs text-muted-foreground mt-1">Click anywhere to resume</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Project Details */}
      <div className="max-w-7xl mx-auto p-4 mt-4 preview-content">
        <div className="grid md:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border p-5">
            <h3 className="font-semibold text-sm mb-3">Project Details</h3>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Type</dt>
                <dd className="font-medium capitalize">{preview.requirements?.projectType?.replace(/-/g, " ") || "N/A"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Timeline</dt>
                <dd className="font-medium">{preview.requirements?.timeline || "Flexible"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Client</dt>
                <dd className="font-medium">{preview.client?.name}</dd>
              </div>
            </dl>
          </div>
          <div className="bg-white rounded-xl border p-5">
            <h3 className="font-semibold text-sm mb-3">Features Included</h3>
            <div className="flex flex-wrap gap-1.5">
              {preview.requirements?.features?.map((f) => (
                <span key={f} className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">{f}</span>
              )) || <span className="text-xs text-muted-foreground">No features specified</span>}
            </div>
          </div>
          <div className="bg-white rounded-xl border p-5">
            <h3 className="font-semibold text-sm mb-3">Estimated Quote</h3>
            <div className="text-center py-2">
              <p className="text-3xl font-bold text-primary">
                ${preview.quote?.min?.toLocaleString()} - ${preview.quote?.max?.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground mt-1">USD estimated range</p>
            </div>
            <Link
              href={getCheckoutUrl()}
              className="mt-3 w-full inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground py-2.5 rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors"
            >
              <CreditCard className="h-4 w-4" />
              Pay Now
            </Link>
          </div>
        </div>
      </div>

      {/* Footer Notice */}
      <div className="max-w-7xl mx-auto p-4 mt-4 mb-8">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
          <p className="text-sm text-amber-800">
            <Shield className="h-4 w-4 inline-block mr-1" />
            This is a temporary secure preview. Access expires in {formatTimeLeft(timeLeft)}.
            Production deliverables will be provided after payment verification.
          </p>
        </div>
      </div>
    </div>
  );
}
