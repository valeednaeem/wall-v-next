"use client";

import { useState, useEffect } from "react";

interface Client {
  _id: string;
  name: string;
  email: string;
  company?: string;
  type: string;
  status: string;
  totalProjects: number;
  totalSpent: number;
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/clients")
      .then((r) => r.json())
      .then((d) => { if (d.success) setClients(d.data); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Clients</h2>
        <button className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">+ Add Client</button>
      </div>
      <div className="rounded-lg border">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="p-3 text-left text-sm font-medium">Client</th>
              <th className="p-3 text-left text-sm font-medium">Company</th>
              <th className="p-3 text-left text-sm font-medium">Type</th>
              <th className="p-3 text-left text-sm font-medium">Status</th>
              <th className="p-3 text-left text-sm font-medium">Projects</th>
              <th className="p-3 text-left text-sm font-medium">Total Spent</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="p-8 text-center text-sm text-muted-foreground">Loading...</td></tr>
            ) : clients.length === 0 ? (
              <tr><td colSpan={6} className="p-8 text-center text-sm text-muted-foreground">No clients yet.</td></tr>
            ) : (
              clients.map((client) => (
                <tr key={client._id} className="border-b last:border-0">
                  <td className="p-3">
                    <p className="font-medium text-sm">{client.name}</p>
                    <p className="text-xs text-muted-foreground">{client.email}</p>
                  </td>
                  <td className="p-3 text-sm">{client.company || "-"}</td>
                  <td className="p-3 text-sm capitalize">{client.type}</td>
                  <td className="p-3">
                    <span className={`text-xs px-2 py-1 rounded-full ${client.status === "active" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}`}>{client.status}</span>
                  </td>
                  <td className="p-3 text-sm">{client.totalProjects}</td>
                  <td className="p-3 text-sm">${client.totalSpent.toLocaleString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
