"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import ToolForm, { ToolFormData } from "@/components/ai-tools/tool-form";

export default function EditToolPage() {
  const params = useParams<{ id: string }>();
  const [tool, setTool] = useState<ToolFormData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/ai-tools/${params.id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setTool(d.data as ToolFormData);
        else setError(d.error || "Failed to load tool");
      })
      .catch(() => setError("Failed to load tool"));
  }, [params.id]);

  if (error) {
    return <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>;
  }

  if (!tool) {
    return <div className="space-y-4"><div className="h-8 bg-muted rounded w-48 animate-pulse" /><div className="h-40 bg-muted rounded-xl animate-pulse" /><div className="h-64 bg-muted rounded-xl animate-pulse" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Edit Tool</h2>
        <p className="text-sm text-muted-foreground">/{tool.slug}</p>
      </div>
      <ToolForm tool={tool} />
    </div>
  );
}
