"use client";

import { useState, useEffect } from "react";

interface Inquiry {
  _id: string;
  name: string;
  email: string;
  subject: string;
  status: string;
  type: string;
  createdAt: string;
}

export default function InquiriesPage() {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/inquiries")
      .then((r) => r.json())
      .then((d) => { if (d.success) setInquiries(d.data); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Inquiries</h2>
      <div className="rounded-lg border">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="p-3 text-left text-sm font-medium">Name</th>
              <th className="p-3 text-left text-sm font-medium">Email</th>
              <th className="p-3 text-left text-sm font-medium">Subject</th>
              <th className="p-3 text-left text-sm font-medium">Type</th>
              <th className="p-3 text-left text-sm font-medium">Status</th>
              <th className="p-3 text-left text-sm font-medium">Date</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="p-8 text-center text-sm text-muted-foreground">Loading...</td></tr>
            ) : inquiries.length === 0 ? (
              <tr><td colSpan={6} className="p-8 text-center text-sm text-muted-foreground">No inquiries yet.</td></tr>
            ) : (
              inquiries.map((inquiry) => (
                <tr key={inquiry._id} className="border-b last:border-0">
                  <td className="p-3 font-medium text-sm">{inquiry.name}</td>
                  <td className="p-3 text-sm">{inquiry.email}</td>
                  <td className="p-3 text-sm">{inquiry.subject}</td>
                  <td className="p-3 text-sm capitalize">{inquiry.type}</td>
                  <td className="p-3">
                    <span className={`text-xs px-2 py-1 rounded-full ${inquiry.status === "new" ? "bg-blue-100 text-blue-800" : inquiry.status === "resolved" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}`}>
                      {inquiry.status}
                    </span>
                  </td>
                  <td className="p-3 text-sm text-muted-foreground">{new Date(inquiry.createdAt).toLocaleDateString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
