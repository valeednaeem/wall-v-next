"use client";

import { useState, useEffect } from "react";
import { Download, FileText, FolderOpen } from "lucide-react";

interface DownloadItem {
  name: string;
  url: string;
  projectName: string;
  stageName?: string;
  milestoneName?: string;
  uploadedAt?: string;
  size?: number;
  type: "deliverable" | "file" | "update";
}

export default function ClientDownloadsPage() {
  const [downloads, setDownloads] = useState<DownloadItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/client/projects?limit=100", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        const items: DownloadItem[] = [];
        for (const project of data.projects || []) {
          if (project.files) {
            for (const file of project.files) {
              items.push({
                name: file.name,
                url: file.url,
                projectName: project.name,
                uploadedAt: file.uploadedAt,
                size: file.size,
                type: "file",
              });
            }
          }
          if (project.milestones?.list) {
            for (const ms of project.milestones.list) {
              if (ms.name) {
                items.push({
                  name: `${ms.name} - Milestone`,
                  url: "#",
                  projectName: project.name,
                  milestoneName: ms.name,
                  type: "deliverable",
                });
              }
            }
          }
          if (project.latestUpdate) {
            items.push({
              name: project.latestUpdate.title,
              url: "#",
              projectName: project.name,
              uploadedAt: project.latestUpdate.createdAt,
              type: "update",
            });
          }
        }
        setDownloads(items);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const groupedByProject = downloads.reduce<Record<string, DownloadItem[]>>((acc, item) => {
    if (!acc[item.projectName]) acc[item.projectName] = [];
    acc[item.projectName].push(item);
    return acc;
  }, {});

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Downloads</h1>
        <p className="text-muted-foreground">Access deliverables, files, and project updates.</p>
      </div>

      {Object.keys(groupedByProject).length === 0 ? (
        <div className="bg-white rounded-xl border p-12 text-center">
          <FolderOpen className="h-16 w-16 mx-auto mb-4 opacity-20" />
          <p className="text-muted-foreground">No downloads available yet.</p>
        </div>
      ) : (
        Object.entries(groupedByProject).map(([projectName, items]) => (
          <div key={projectName} className="bg-white rounded-xl border overflow-hidden">
            <div className="px-4 py-3 border-b bg-gray-50">
              <h3 className="font-semibold text-sm">{projectName}</h3>
            </div>
            <div className="divide-y">
              {items.map((item, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50">
                  <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.name}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="capitalize">{item.type}</span>
                      {item.uploadedAt && <span>• {new Date(item.uploadedAt).toLocaleDateString()}</span>}
                      {item.size && <span>• {(item.size / 1024).toFixed(1)} KB</span>}
                    </div>
                  </div>
                  {item.url !== "#" && (
                    <a href={item.url} target="_blank" rel="noopener noreferrer"
                      className="shrink-0 p-2 hover:bg-gray-100 rounded-lg">
                      <Download className="h-4 w-4 text-primary" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
