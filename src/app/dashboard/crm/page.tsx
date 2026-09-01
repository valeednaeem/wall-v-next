"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Target, Users, Mail, ArrowRight } from "lucide-react";

export default function CRMPage() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">CRM</h2>
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="hover:shadow-lg hover:border-primary/20 transition-all">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-blue-50 rounded-lg">
                <Target className="h-6 w-6 text-blue-500" />
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/dashboard/crm/leads">
                  View <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </div>
            <h3 className="text-lg font-semibold">Leads</h3>
            <p className="mt-2 text-sm text-muted-foreground">Manage your sales pipeline and track leads through conversion.</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg hover:border-primary/20 transition-all">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-purple-50 rounded-lg">
                <Users className="h-6 w-6 text-purple-500" />
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/dashboard/crm/clients">
                  View <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </div>
            <h3 className="text-lg font-semibold">Clients</h3>
            <p className="mt-2 text-sm text-muted-foreground">View and manage your client relationships.</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg hover:border-primary/20 transition-all">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-orange-50 rounded-lg">
                <Mail className="h-6 w-6 text-orange-500" />
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/dashboard/crm/inquiries">
                  View <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </div>
            <h3 className="text-lg font-semibold">Inquiries</h3>
            <p className="mt-2 text-sm text-muted-foreground">Handle customer inquiries and convert to projects.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
