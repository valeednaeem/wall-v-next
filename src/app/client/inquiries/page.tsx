"use client";

import { useState, useEffect } from "react";
import { MessageSquare, Clock, CheckCircle, AlertCircle } from "lucide-react";

interface Inquiry {
  _id: string;
  name: string;
  email: string;
  subject: string;
  message?: string;
  status: string;
  type: string;
  priority?: string;
  source?: string;
  createdAt: string;
}

const statusColor: Record<string, string> = {
  new: "bg-blue-100 text-blue-700",
  contacted: "bg-yellow-100 text-yellow-700",
  "in-progress": "bg-purple-100 text-purple-700",
  resolved: "bg-green-100 text-green-700",
  closed: "bg-gray-100 text-gray-600",
};

const statusIcon: Record<string, typeof CheckCircle> = {
  new: AlertCircle,
  contacted: Clock,
  "in-progress": Clock,
  resolved: CheckCircle,
  closed: CheckCircle,
};

export default function ClientInquiriesPage() {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/client/inquiries", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => { setInquiries(data.inquiries || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Inquiries</h1>
        <p className="text-muted-foreground">View your submitted inquiries and their status.</p>
      </div>

      {inquiries.length === 0 ? (
        <div className="bg-white rounded-xl border p-12 text-center">
          <MessageSquare className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-30" />
          <p className="text-muted-foreground">No inquiries yet.</p>
          <p className="text-sm text-muted-foreground mt-1">Start a conversation with our AI assistant to submit an inquiry.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {inquiries.map((inquiry) => {
            const Icon = statusIcon[inquiry.status] || AlertCircle;
            const isExpanded = expandedId === inquiry._id;
            return (
              <div key={inquiry._id} className="bg-white rounded-xl border overflow-hidden">
                <button
                  onClick={() => setExpandedId(isExpanded ? null : inquiry._id)}
                  className="w-full flex items-center gap-4 p-4 text-left hover:bg-gray-50 transition-colors"
                >
                  <Icon className={`h-5 w-5 shrink-0 ${inquiry.status === "resolved" ? "text-green-500" : inquiry.status === "new" ? "text-blue-500" : "text-amber-500"}`} />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{inquiry.subject}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {inquiry.source === "chat" ? "Via Chat" : inquiry.source === "voice" ? "Via Voice" : "Via Contact Form"}
                      {" · "}
                      {new Date(inquiry.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full shrink-0 ${statusColor[inquiry.status] || "bg-gray-100 text-gray-600"}`}>
                    {inquiry.status}
                  </span>
                </button>
                {isExpanded && (
                  <div className="border-t p-4 space-y-3 bg-gray-50/50">
                    {inquiry.message && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">Your Message</p>
                        <p className="text-sm whitespace-pre-wrap">{inquiry.message}</p>
                      </div>
                    )}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>Type: <span className="capitalize">{inquiry.type}</span></span>
                      {inquiry.priority && <span>Priority: <span className="capitalize">{inquiry.priority}</span></span>}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
