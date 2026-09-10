"use client";

import { useState, useEffect } from "react";
import { Download, FileText, FolderOpen, Package, FileArchive } from "lucide-react";

interface DownloadItem {
  name: string;
  url: string;
  projectName: string;
  stageName?: string;
  milestoneName?: string;
  uploadedAt?: string;
  size?: number;
  type: "deliverable" | "file" | "update" | "product-download";
  mimeType?: string;
  productSlug?: string;
  fileId?: string;
  orderNumber?: string;
}

interface ProductFile {
  id: string;
  name: string;
  originalName: string;
  url: string;
  mimeType: string;
  size: number;
  description?: string;
  sortOrder: number;
  createdAt: string;
}

interface OrderItem {
  product: {
    _id: string;
    name: string;
    slug: string;
    type: string;
    files?: ProductFile[];
  } | null;
  name: string;
  slug: string;
  price: number;
  quantity: number;
}

function getFileIcon(mimeType?: string) {
  if (!mimeType) return FileText;
  if (mimeType.includes("zip") || mimeType.includes("rar") || mimeType.includes("7z") || mimeType.includes("tar") || mimeType.includes("gzip")) return FileArchive;
  return FileText;
}

function formatFileSize(bytes?: number): string {
  if (!bytes) return "";
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

export default function ClientDownloadsPage() {
  const [downloads, setDownloads] = useState<DownloadItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [projectsRes, ordersRes] = await Promise.all([
          fetch("/api/client/projects?limit=100", { credentials: "include" }),
          fetch("/api/client/orders?downloadable=true", { credentials: "include" }),
        ]);

        const items: DownloadItem[] = [];

        // Project deliverables
        const projectsData = await projectsRes.json();
        for (const project of projectsData.projects || []) {
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

        // Purchased product downloads
        const ordersData = await ordersRes.json();
        for (const order of ordersData.orders || []) {
          for (const item of order.items || []) {
            if (!item.product) continue;
            const product = item.product as OrderItem["product"] & { files?: ProductFile[] };
            if (!product.files || product.files.length === 0) continue;

            for (const file of product.files) {
              items.push({
                name: `${file.name || file.originalName}`,
                url: `/api/products/${product.slug}/download/${file.id}`,
                projectName: product.name,
                uploadedAt: file.createdAt,
                size: file.size,
                type: "product-download",
                mimeType: file.mimeType,
                productSlug: product.slug,
                fileId: file.id,
                orderNumber: order.orderNumber,
              });
            }
          }
        }

        setDownloads(items);
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, []);

  const productDownloads = downloads.filter((d) => d.type === "product-download");
  const projectDownloads = downloads.filter((d) => d.type !== "product-download");

  const groupedByProduct = productDownloads.reduce<Record<string, DownloadItem[]>>((acc, item) => {
    if (!acc[item.projectName]) acc[item.projectName] = [];
    acc[item.projectName].push(item);
    return acc;
  }, {});

  const groupedByProject = projectDownloads.reduce<Record<string, DownloadItem[]>>((acc, item) => {
    if (!acc[item.projectName]) acc[item.projectName] = [];
    acc[item.projectName].push(item);
    return acc;
  }, {});

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;
  }

  const hasDownloads = Object.keys(groupedByProduct).length > 0 || Object.keys(groupedByProject).length > 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Downloads</h1>
        <p className="text-muted-foreground">Access your purchased files and project deliverables.</p>
      </div>

      {!hasDownloads ? (
        <div className="bg-white rounded-xl border p-12 text-center">
          <FolderOpen className="h-16 w-16 mx-auto mb-4 opacity-20" />
          <p className="text-muted-foreground">No downloads available yet.</p>
        </div>
      ) : (
        <>
          {/* Purchased Product Downloads */}
          {Object.keys(groupedByProduct).length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Package className="h-5 w-5" />
                Purchased Products
              </h2>
              {Object.entries(groupedByProduct).map(([productName, items]) => (
                <div key={productName} className="bg-white rounded-xl border overflow-hidden">
                  <div className="px-4 py-3 border-b bg-gray-50">
                    <h3 className="font-semibold text-sm">{productName}</h3>
                  </div>
                  <div className="divide-y">
                    {items.map((item, i) => {
                      const Icon = getFileIcon(item.mimeType);
                      return (
                        <div key={i} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50">
                          <Icon className="h-5 w-5 text-muted-foreground shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{item.name}</p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              {item.mimeType && <span className="uppercase">{item.mimeType.split("/").pop()}</span>}
                              {item.size && <span>{formatFileSize(item.size)}</span>}
                              {item.orderNumber && <span>Order: {item.orderNumber}</span>}
                            </div>
                          </div>
                          <a href={item.url} download
                            className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
                            <Download className="h-3.5 w-3.5" />
                            Download
                          </a>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Project Deliverables */}
          {Object.keys(groupedByProject).length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <FolderOpen className="h-5 w-5" />
                Project Deliverables
              </h2>
              {Object.entries(groupedByProject).map(([projectName, items]) => (
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
                            {item.uploadedAt && <span>{new Date(item.uploadedAt).toLocaleDateString()}</span>}
                            {item.size && <span>{formatFileSize(item.size)}</span>}
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
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
