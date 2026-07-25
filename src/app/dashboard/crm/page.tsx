"use client";

import Link from "next/link";

export default function CRMPage() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">CRM</h2>
      <div className="grid gap-4 md:grid-cols-3">
        <Link href="/dashboard/crm/leads" className="rounded-xl border p-6 hover:shadow-lg hover:border-primary/20 transition-all">
          <div className="text-3xl mb-3">🎯</div>
          <h3 className="text-lg font-semibold">Leads</h3>
          <p className="mt-2 text-sm text-muted-foreground">Manage your sales pipeline and track leads through conversion.</p>
        </Link>
        <Link href="/dashboard/crm/clients" className="rounded-xl border p-6 hover:shadow-lg hover:border-primary/20 transition-all">
          <div className="text-3xl mb-3">👥</div>
          <h3 className="text-lg font-semibold">Clients</h3>
          <p className="mt-2 text-sm text-muted-foreground">View and manage your client relationships.</p>
        </Link>
        <Link href="/dashboard/crm/inquiries" className="rounded-xl border p-6 hover:shadow-lg hover:border-primary/20 transition-all">
          <div className="text-3xl mb-3">📩</div>
          <h3 className="text-lg font-semibold">Inquiries</h3>
          <p className="mt-2 text-sm text-muted-foreground">Handle customer inquiries and convert to projects.</p>
        </Link>
      </div>
    </div>
  );
}
