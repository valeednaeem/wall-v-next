"use client";

import { useState, useEffect } from "react";
import { CheckCircle, XCircle, Clock, AlertTriangle, User, Bot, Loader2 } from "lucide-react";

interface Approval {
  _id: string;
  agent: { name: string; slug: string };
  type: string;
  status: string;
  action: {
    type: string;
    description: string;
    parameters: Record<string, unknown>;
    risk: string;
  };
  requestedBy: { name: string; email: string };
  reviewedBy?: { name: string; email: string };
  createdAt: string;
  reviewedAt?: string;
}

const riskColors: Record<string, string> = {
  low: "bg-emerald-100 text-emerald-700",
  medium: "bg-amber-100 text-amber-700",
  high: "bg-orange-100 text-orange-700",
  critical: "bg-red-100 text-red-700",
};

export default function ApprovalsPage() {
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("pending");
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    fetchApprovals();
  }, [filterStatus]);

  const fetchApprovals = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/agents/approvals?status=${filterStatus}`);
      const data = await res.json();
      setApprovals(data.approvals || []);
    } catch {
      console.error("Failed to fetch approvals");
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (id: string, action: "approve" | "reject") => {
    setProcessing(id);
    try {
      await fetch("/api/agents/approvals", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action }),
      });
      fetchApprovals();
    } catch {
      console.error("Failed to process");
    } finally {
      setProcessing(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Agent Approvals</h1>
        <p className="text-sm text-gray-500">Review and approve agent actions requiring human oversight</p>
      </div>

      <div className="flex gap-2">
        {["pending", "approved", "rejected", "all"].map((s) => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`px-3 py-1.5 text-sm rounded-lg capitalize transition-colors ${
              filterStatus === s ? "bg-violet-100 text-violet-700" : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600" />
        </div>
      ) : approvals.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <CheckCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No {filterStatus} approvals</p>
        </div>
      ) : (
        <div className="space-y-3">
          {approvals.map((a) => (
            <div key={a._id} className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <Bot className="w-5 h-5 text-gray-600" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">{a.action.description}</h3>
                    <p className="text-sm text-gray-500">
                      Agent: {a.agent?.name} &middot; Type: {a.type}
                    </p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                      <span>Requested by {a.requestedBy?.name || "Unknown"}</span>
                      <span>{new Date(a.createdAt).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${riskColors[a.action.risk] || ""}`}>
                    {a.action.risk} risk
                  </span>
                  <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                    a.status === "pending" ? "bg-amber-100 text-amber-700" :
                    a.status === "approved" ? "bg-emerald-100 text-emerald-700" :
                    "bg-red-100 text-red-700"
                  }`}>
                    {a.status}
                  </span>
                </div>
              </div>
              {a.status === "pending" && (
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
                  <button
                    onClick={() => handleAction(a._id, "approve")}
                    disabled={processing === a._id}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {processing === a._id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                    Approve
                  </button>
                  <button
                    onClick={() => handleAction(a._id, "reject")}
                    disabled={processing === a._id}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm border border-red-200 text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-50"
                  >
                    <XCircle className="w-4 h-4" />
                    Reject
                  </button>
                </div>
              )}
              {a.reviewedBy && (
                <div className="mt-2 text-xs text-gray-400">
                  Reviewed by {a.reviewedBy.name} on {new Date(a.reviewedAt!).toLocaleString()}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
