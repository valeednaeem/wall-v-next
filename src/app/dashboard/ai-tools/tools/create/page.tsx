"use client";

import ToolForm from "@/components/ai-tools/tool-form";

export default function CreateToolPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">New Tool</h2>
        <p className="text-sm text-muted-foreground">Add a tool to the Wall-V AI catalogue</p>
      </div>
      <ToolForm />
    </div>
  );
}
